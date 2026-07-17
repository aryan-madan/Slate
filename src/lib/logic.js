import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BLOCK_HTML, SLASH_ITEMS, MARKDOWN_MAP, EMPTY_NOTE_HTML } from './constants';
import { getCleanText, matchMarkdownTrigger } from './utils';

export default function useEditor(cur, active, setItems) {
  const [isTyping, setIsTyping] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorHeight, setCursorHeight] = useState(24);

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 });

  const editorRef = useRef(null);
  const syncTimeout = useRef(null);
  const typingTimeout = useRef(null);
  const slashBlockRef = useRef(null);
  const loadedActiveRef = useRef(null);

  const filteredSlashItems = useMemo(() => {
    if (!slashQuery) return SLASH_ITEMS;
    const q = slashQuery.toLowerCase();
    return SLASH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) || item.keywords.some(k => k.includes(q))
    );
  }, [slashQuery]);

  const closeSlashMenu = useCallback(() => {
    setSlashOpen(false);
    setSlashQuery('');
    setSlashIndex(0);
    slashBlockRef.current = null;
  }, []);

  function getCurrentBlock(node, offset) {
    if (!node || !editorRef.current) return null;

    if (node === editorRef.current) {
      const children = editorRef.current.children;
      if (!children || children.length === 0) return null;
      const idx = typeof offset === 'number'
        ? Math.max(0, Math.min(offset, children.length - 1))
        : children.length - 1;
      return children[idx] || children[children.length - 1];
    }

    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!el) return null;
    if (el === editorRef.current) return null;

    while (el && el.parentElement !== editorRef.current) {
      el = el.parentElement;
    }
    return el;
  }

  function holderOf(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return node;
    const holder = node.querySelector('[class$="-text"], [class*="-text "]');
    return holder || node;
  }

  const getSelectionRect = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return null;

    const rawRange = selection.getRangeAt(0);
    if (!editorRef.current.contains(rawRange.startContainer) || !editorRef.current.contains(rawRange.endContainer)) {
      return null;
    }

    const range = rawRange.cloneRange();
    const rects = range.getClientRects();
    let rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();

    if (!rect || (rect.top === 0 && rect.left === 0 && rect.width === 0 && rect.height === 0)) {
      const block = getCurrentBlock(rawRange.startContainer, rawRange.startOffset);
      const holder = holderOf(block);
      if (!holder || !holder.getBoundingClientRect) return null;

      const holderRect = holder.getBoundingClientRect();
      const styles = window.getComputedStyle(holder);
      const lineHeight = Number.parseFloat(styles.lineHeight) || Number.parseFloat(styles.fontSize) || 24;
      rect = {
        left: holderRect.left,
        right: holderRect.left,
        top: holderRect.top,
        bottom: holderRect.top + lineHeight,
        width: 0,
        height: lineHeight
      };
    }

    return rect;
  }, []);

  const updateCursorPos = useCallback(() => {
    if (!editorRef.current) return;

    const rect = getSelectionRect();
    if (!rect) return;

    const editorRect = editorRef.current.getBoundingClientRect();

    setCursorPos({
      x: rect.left - editorRect.left,
      y: rect.top - editorRect.top
    });

    if (rect.height > 0) {
      setCursorHeight(rect.height);
    }

    setSlashPos({
      x: rect.left - editorRect.left,
      y: rect.top - editorRect.top + rect.height + 6
    });
  }, [getSelectionRect]);

  useEffect(() => {
    const resync = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(updateCursorPos);
      });
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    return () => {
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, [updateCursorPos]);

  const placeCursor = (el, atStart) => {
    if (!el) return;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(!!atStart);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const placeCursorAtTextOffset = (el, offset) => {
    if (!el) return;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let remaining = Math.max(0, offset);

    while (node) {
      if (remaining <= node.textContent.length) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(node, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }

      remaining -= node.textContent.length;
      node = walker.nextNode();
    }

    placeCursor(el, false);
  };

  const buildNodes = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return Array.from(temp.childNodes);
  };

  const readBlockText = (block) => getCleanText(holderOf(block).innerHTML).replace(/\u00A0/g, '');

  const writeBlockText = (holder, text) => {
    holder.textContent = text || '\u00A0';
  };

  const spawnBlock = (templateHtml, text) => {
    const nodes = buildNodes(templateHtml);
    const target = nodes[nodes.length - 1];
    const holder = holderOf(target);
    if (holder && holder.nodeType === Node.ELEMENT_NODE) {
      writeBlockText(holder, text);
    }
    return { nodes, target, holder };
  };

  const templateForClass = (cls) => {
    if (cls.includes('todo-item')) return BLOCK_HTML.todo;
    if (cls.includes('bullet-item')) return BLOCK_HTML.bullet;
    if (cls.includes('numbered-item')) return BLOCK_HTML.numbered;
    return BLOCK_HTML.text;
  };

  const isEditorBlock = (node) => (
    node.nodeType === Node.ELEMENT_NODE && (
      node.tagName === 'HR' ||
      node.classList.contains('text-block') ||
      node.classList.contains('todo-item') ||
      node.classList.contains('heading-1') ||
      node.classList.contains('heading-2') ||
      node.classList.contains('bullet-item') ||
      node.classList.contains('numbered-item') ||
      node.classList.contains('quote-block') ||
      node.classList.contains('code-block')
    )
  );

  const normalizeEditorRoot = () => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.childNodes.length === 0) {
      const seeded = spawnBlock(BLOCK_HTML.text, '');
      editor.append(...seeded.nodes);
      placeCursor(seeded.holder, false);
      return;
    }

    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const selectedNode = range && range.collapsed ? range.startContainer : null;
    const selectedOffset = range && range.collapsed ? range.startOffset : 0;
    let selectedWrapper = null;
    let selectedTextOffset = 0;
    let currentWrapper = null;

    Array.from(editor.childNodes).forEach((node) => {
      if (isEditorBlock(node)) {
        currentWrapper = null;
        return;
      }

      if (!currentWrapper) {
        currentWrapper = document.createElement('div');
        currentWrapper.className = 'text-block';
        editor.insertBefore(currentWrapper, node);
      }

      if (node === selectedNode) {
        selectedWrapper = currentWrapper;
        selectedTextOffset = selectedOffset;
      }

      currentWrapper.appendChild(node);
    });

    Array.from(editor.querySelectorAll('.text-block')).forEach((block) => {
      if (block.textContent.replace(/\u00A0/g, '') === '') {
        writeBlockText(block, '');
      }
    });

    if (selectedWrapper) {
      placeCursorAtTextOffset(selectedWrapper, selectedTextOffset);
    }
  };

  const resolveBlock = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    let block = getCurrentBlock(range.startContainer, range.startOffset);
    if (!block) block = editorRef.current.lastElementChild;
    if (!block) {
      const seeded = spawnBlock(BLOCK_HTML.text, '');
      editorRef.current.append(...seeded.nodes);
      block = seeded.nodes[0];
    }
    return block;
  };

  const getCaretContext = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return null;
    if (!editorRef.current || !editorRef.current.contains(range.startContainer)) return null;

    const block = getCurrentBlock(range.startContainer, range.startOffset);
    if (!block) return null;

    const holder = holderOf(block);
    if (!holder) return null;

    const node = range.startContainer;

    if (node === holder || holder.contains(node)) {
      const preRange = document.createRange();
      preRange.selectNodeContents(holder);
      preRange.setEnd(node, range.startOffset);

      const postRange = document.createRange();
      postRange.selectNodeContents(holder);
      postRange.setStart(node, range.startOffset);

      return {
        block,
        holder,
        range,
        textBefore: preRange.toString(),
        textAfter: postRange.toString()
      };
    }

    return { block, holder, range, textBefore: '', textAfter: '' };
  };

  useEffect(() => {
    if (!editorRef.current || loadedActiveRef.current === active) return;

    loadedActiveRef.current = active;

    const content = cur.body && cur.body.trim() !== '' ? cur.body : EMPTY_NOTE_HTML;
    if (editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }

    editorRef.current.focus();

    const lastChild = editorRef.current.lastElementChild;
    const target = lastChild ? holderOf(lastChild) : editorRef.current;
    placeCursor(target, false);

    requestAnimationFrame(() => {
      closeSlashMenu();
      updateCursorPos();
    });
  });

  const checkSlashCommand = () => {
    const ctx = getCaretContext();
    if (!ctx) {
      closeSlashMenu();
      return;
    }

    const match = ctx.textBefore.match(/\/([a-zA-Z0-9]*)$/);

    if (match) {
      const rect = getSelectionRect();
      if (rect && editorRef.current) {
        const editorRect = editorRef.current.getBoundingClientRect();
        setSlashPos({
          x: rect.left - editorRect.left,
          y: rect.top - editorRect.top + rect.height + 6
        });
      }
      slashBlockRef.current = ctx.block;
      setSlashQuery(match[1]);
      setSlashIndex(0);
      setSlashOpen(true);
    } else {
      closeSlashMenu();
    }
  };

  const cleanupPlaceholder = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent;
    if (!text.includes('\u00A0')) return;

    const withoutPlaceholder = text.replace(/\u00A0/g, '');
    if (withoutPlaceholder.length === 0) return;

    const offset = range.startOffset;
    const cleanedBefore = text.slice(0, offset).replace(/\u00A0/g, '');
    const cleanedAfter = text.slice(offset).replace(/\u00A0/g, '');

    node.textContent = cleanedBefore + cleanedAfter;

    const newOffset = cleanedBefore.length;
    const newRange = document.createRange();
    newRange.setStart(node, newOffset);
    newRange.setEnd(node, newOffset);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  const edit = () => {
    if (!editorRef.current) return;
    normalizeEditorRoot();
    cleanupPlaceholder();
    const val = editorRef.current.innerHTML;

    setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 800);

    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      setItems(prev => prev.map(i => i.id === active ? { ...i, body: val } : i));
    }, 1000);

    updateCursorPos();
    checkSlashCommand();
  };

  const applySlashCommand = (item) => {
    if (!item || !editorRef.current) return;

    let block = slashBlockRef.current;
    if (!block || !block.isConnected || !editorRef.current.contains(block)) {
      block = resolveBlock();
    }
    if (!block) return;

    const ctx = getCaretContext();
    let beforeSlash = '';
    let afterSlash = '';

    if (ctx && ctx.block === block) {
      beforeSlash = ctx.textBefore.replace(/\/[a-zA-Z0-9]*$/, '').replace(/\u00A0/g, '');
      afterSlash = ctx.textAfter.replace(/\u00A0/g, '');
    } else {
      const rawText = readBlockText(block);
      const slashIdx = rawText.lastIndexOf('/');
      beforeSlash = slashIdx !== -1 ? rawText.slice(0, slashIdx) : rawText;
    }

    const remainingText = beforeSlash + afterSlash;

    const { nodes, holder } = spawnBlock(item.html, remainingText);
    block.replaceWith(...nodes);

    closeSlashMenu();
    editorRef.current.focus();

    if (holder && holder.nodeType === Node.ELEMENT_NODE) {
      if (remainingText.length === 0) {
        placeCursor(holder, false);
      } else {
        placeCursorAtTextOffset(holder, beforeSlash.length);
      }
    }

    edit();
    requestAnimationFrame(updateCursorPos);
  };

  const checkMarkdownShortcut = (e) => {
    const ctx = getCaretContext();
    if (!ctx) return false;
    if (!ctx.block.classList.contains('text-block')) return false;

    const cleaned = ctx.textBefore.replace(/\u00A0/g, '').trim();
    const matchedType = matchMarkdownTrigger(cleaned);
    if (!matchedType) return false;

    e.preventDefault();

    const remaining = ctx.textAfter.replace(/\u00A0/g, '');

    const { nodes, holder } = spawnBlock(MARKDOWN_MAP[matchedType], remaining);
    ctx.block.replaceWith(...nodes);

    if (holder && holder.nodeType === Node.ELEMENT_NODE) {
      placeCursor(holder, remaining.length > 0);
    }

    edit();
    requestAnimationFrame(updateCursorPos);
    return true;
  };

  const handleEnterKey = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let block = getCurrentBlock(range.startContainer, range.startOffset);

    if (!block) block = editorRef.current.lastElementChild;

    if (!block) {
      const seeded = spawnBlock(BLOCK_HTML.text, '');
      editorRef.current.append(...seeded.nodes);
      placeCursor(seeded.holder, false);
      edit();
      requestAnimationFrame(updateCursorPos);
      return;
    }

    const cls = block.className || '';
    const currentHolder = holderOf(block);

    const preRange = document.createRange();
    preRange.selectNodeContents(currentHolder);
    preRange.setEnd(range.startContainer, range.startOffset);
    const beforeText = preRange.toString().replace(/\u00A0/g, '');

    const postRange = document.createRange();
    postRange.selectNodeContents(currentHolder);
    postRange.setStart(range.startContainer, range.startOffset);
    const afterText = postRange.toString().replace(/\u00A0/g, '');

    const isEmpty = beforeText.trim() === '' && afterText.trim() === '';

    if (/todo-item|bullet-item|numbered-item/.test(cls) && isEmpty) {
      const emptied = spawnBlock(BLOCK_HTML.text, '');
      block.replaceWith(...emptied.nodes);
      placeCursor(emptied.holder, false);
      edit();
      requestAnimationFrame(updateCursorPos);
      return;
    }

    const template = templateForClass(cls);
    const current = spawnBlock(template, beforeText);
    const next = spawnBlock(template, afterText);

    block.replaceWith(...current.nodes, ...next.nodes);
    placeCursor(next.holder, true);

    edit();
    requestAnimationFrame(updateCursorPos);
  };

  const handleBackspaceAtStart = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    const block = getCurrentBlock(range.startContainer, range.startOffset);
    if (!block) return false;

    const holder = holderOf(block);
    if (range.startContainer !== holder && !holder.contains(range.startContainer)) return false;

    const preRange = document.createRange();
    preRange.selectNodeContents(holder);
    preRange.setEnd(range.startContainer, range.startOffset);
    if (preRange.toString().replace(/\u00A0/g, '').length !== 0) return false;

    const cls = block.className || '';
    const currentText = readBlockText(block);
    const isSpecial = /todo-item|bullet-item|numbered-item|heading-1|heading-2|quote-block|code-block/.test(cls);

    if (isSpecial) {
      const converted = spawnBlock(BLOCK_HTML.text, currentText);
      block.replaceWith(...converted.nodes);
      placeCursor(converted.holder, true);
      edit();
      requestAnimationFrame(updateCursorPos);
      return true;
    }

    const prevBlock = block.previousElementSibling;
    if (!prevBlock) return false;

    if (prevBlock.tagName === 'HR') {
      prevBlock.remove();
      edit();
      requestAnimationFrame(updateCursorPos);
      return true;
    }

    const prevHolder = holderOf(prevBlock);
    const prevText = readBlockText(prevBlock);
    const mergedText = prevText + currentText;

    writeBlockText(prevHolder, mergedText);
    block.remove();

    const mergeRange = document.createRange();
    const targetNode = prevHolder.firstChild;
    if (targetNode) {
      mergeRange.setStart(targetNode, prevText.length);
      mergeRange.setEnd(targetNode, prevText.length);
    } else {
      mergeRange.selectNodeContents(prevHolder);
      mergeRange.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(mergeRange);

    edit();
    requestAnimationFrame(updateCursorPos);
    return true;
  };

  const handleEditorClick = (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('todo-checkbox')) {
      const checkbox = e.target;
      if (checkbox.checked) {
        checkbox.setAttribute('checked', '');
      } else {
        checkbox.removeAttribute('checked');
      }

      const textSpan = checkbox.parentElement ? checkbox.parentElement.querySelector('.todo-text') : null;
      if (textSpan) {
        placeCursor(textSpan, false);
      }
      edit();
      requestAnimationFrame(updateCursorPos);
    }
  };

  const handleKeyDown = (e) => {
    const isMod = e.metaKey || e.ctrlKey;

    if (e.key === ' ' && !slashOpen) {
      const handled = checkMarkdownShortcut(e);
      if (handled) return;
    }

    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(i => (i + 1) % Math.max(filteredSlashItems.length, 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(i => (i - 1 + Math.max(filteredSlashItems.length, 1)) % Math.max(filteredSlashItems.length, 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredSlashItems.length > 0) {
          applySlashCommand(filteredSlashItems[slashIndex] || filteredSlashItems[0]);
        } else {
          closeSlashMenu();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSlashMenu();
        return;
      }
      if (e.key === ' ') {
        closeSlashMenu();
      }
    }

    if (e.key === 'Enter' && !slashOpen) {
      e.preventDefault();
      handleEnterKey();
      return;
    }

    if (e.key === 'Backspace' && !slashOpen) {
      const handled = handleBackspaceAtStart();
      if (handled) {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;');
      edit();
      return;
    }

    if (isMod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      edit();
      return;
    }

    if (isMod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      document.execCommand('italic', false);
      edit();
      return;
    }

    setTimeout(updateCursorPos, 0);
  };

  const handleBeforeInput = (e) => {
    if (e.data === ' ' && !slashOpen) {
      checkMarkdownShortcut(e);
    }
  };

  return {
    editorRef,
    cursorPos,
    cursorHeight,
    isTyping,
    slashOpen,
    slashPos,
    slashIndex,
    setSlashIndex,
    filteredSlashItems,
    edit,
    handleBeforeInput,
    handleKeyDown,
    handleEditorClick,
    updateCursorPos,
    applySlashCommand
  };
}
