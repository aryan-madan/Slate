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
  }, []);

  const updateCursorPos = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const rawRange = selection.getRangeAt(0);
    if (!editorRef.current.contains(rawRange.startContainer) || !editorRef.current.contains(rawRange.endContainer)) {
      return;
    }

    const range = rawRange.cloneRange();
    let rect;

    if (range.collapsed) {
      const dummy = document.createElement("span");
      dummy.textContent = "\u200b";
      range.insertNode(dummy);
      rect = dummy.getBoundingClientRect();
      const parent = dummy.parentNode;
      if (parent) {
        parent.removeChild(dummy);
        parent.normalize();
      }
    } else {
      rect = range.getBoundingClientRect();
    }

    if (rect && !(rect.top === 0 && rect.left === 0 && rect.width === 0 && rect.height === 0)) {
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
    }
  }, []);

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

  const getCurrentBlock = (node, offset) => {
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
  };

  const buildNodes = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return Array.from(temp.childNodes);
  };

  const resolveBlock = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    let block = getCurrentBlock(range.startContainer, range.startOffset);
    if (!block) block = editorRef.current.lastElementChild;
    if (!block) {
      const seedNodes = buildNodes(BLOCK_HTML.text);
      editorRef.current.append(...seedNodes);
      block = seedNodes[0];
    }
    return block;
  };

  useEffect(() => {
    if (editorRef.current) {
      const content = cur.body && cur.body.trim() !== '' ? cur.body : EMPTY_NOTE_HTML;
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content;
      }

      editorRef.current.focus();

      const lastChild = editorRef.current.lastElementChild;
      const target = lastChild ? (lastChild.querySelector('.todo-text, .bullet-text, .numbered-text') || lastChild) : editorRef.current;
      placeCursor(target, false);

      closeSlashMenu();
      requestAnimationFrame(updateCursorPos);
    }
  }, [active, updateCursorPos, closeSlashMenu]);

  const checkSlashCommand = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      closeSlashMenu();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      closeSlashMenu();
      return;
    }

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      closeSlashMenu();
      return;
    }

    const textBefore = node.textContent.slice(0, range.startOffset);
    const match = textBefore.match(/\/([a-zA-Z0-9]*)$/);

    if (match) {
      setSlashQuery(match[1]);
      setSlashIndex(0);
      setSlashOpen(true);
    } else {
      closeSlashMenu();
    }
  }, [closeSlashMenu]);

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

    const block = resolveBlock();
    if (!block) return;

    const rawText = getCleanText(block.innerHTML);
    const slashIdx = rawText.lastIndexOf('/');
    const remainingText = (slashIdx !== -1 ? rawText.slice(0, slashIdx) : rawText).trim();

    const newNodes = buildNodes(item.html);
    block.replaceWith(...newNodes);

    const target = newNodes[newNodes.length - 1];
    const textHolder = target.querySelector
      ? (target.querySelector('.todo-text, .bullet-text, .numbered-text') || target)
      : target;

    if (textHolder && textHolder.nodeType === Node.ELEMENT_NODE) {
      setHolderText(textHolder, remainingText);
      placeCursor(textHolder, false);
    }

    closeSlashMenu();
    edit();
    editorRef.current.focus();
    requestAnimationFrame(updateCursorPos);
  };

  const checkMarkdownShortcut = (e) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;

    const block = getCurrentBlock(node, range.startOffset);
    if (!block || !block.classList.contains('text-block')) return false;

    const preRange = document.createRange();
    preRange.selectNodeContents(block);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBefore = preRange.toString();

    const cleaned = textBefore.replace(/\u00A0/g, '').trim();
    const matchedType = matchMarkdownTrigger(cleaned);
    if (!matchedType) return false;

    e.preventDefault();

    const postRange = document.createRange();
    postRange.selectNodeContents(block);
    postRange.setStart(range.startContainer, range.startOffset);
    const remaining = postRange.toString().replace(/\u00A0/g, '');

    const newNodes = buildNodes(MARKDOWN_MAP[matchedType]);
    block.replaceWith(...newNodes);

    const target = newNodes[newNodes.length - 1];
    const textHolder = target.querySelector
      ? (target.querySelector('.todo-text, .bullet-text, .numbered-text') || target)
      : target;

    if (textHolder && textHolder.nodeType === Node.ELEMENT_NODE) {
      setHolderText(textHolder, remaining);
      placeCursor(textHolder, false);
    }

    edit();
    requestAnimationFrame(updateCursorPos);
    return true;
  };

  const templateForClass = (cls) => {
    if (cls.includes('todo-item')) return BLOCK_HTML.todo;
    if (cls.includes('bullet-item')) return BLOCK_HTML.bullet;
    if (cls.includes('numbered-item')) return BLOCK_HTML.numbered;
    return BLOCK_HTML.text;
  };

  const holderOf = (node) => (
    node.querySelector
      ? (node.querySelector('.todo-text, .bullet-text, .numbered-text') || node)
      : node
  );

  const setHolderText = (holder, text) => {
    if (text) {
      holder.textContent = text;
    } else {
      holder.innerHTML = '<br>';
    }
  };

  const handleEnterKey = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let block = getCurrentBlock(range.startContainer, range.startOffset);

    if (!block) block = editorRef.current.lastElementChild;

    if (!block) {
      const seedNodes = buildNodes(BLOCK_HTML.text);
      editorRef.current.append(...seedNodes);
      placeCursor(seedNodes[0], false);
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
      const emptyNodes = buildNodes(BLOCK_HTML.text);
      block.replaceWith(...emptyNodes);
      placeCursor(emptyNodes[0], false);
      edit();
      requestAnimationFrame(updateCursorPos);
      return;
    }

    const currentTemplate = templateForClass(cls);
    const currentNodes = buildNodes(currentTemplate);
    const currentTarget = currentNodes[currentNodes.length - 1];
    setHolderText(holderOf(currentTarget), beforeText);

    const nextTemplate = templateForClass(cls);
    const nextNodes = buildNodes(nextTemplate);
    const nextTarget = nextNodes[nextNodes.length - 1];
    const nextHolder = holderOf(nextTarget);
    setHolderText(nextHolder, afterText);

    block.replaceWith(...currentNodes, ...nextNodes);
    placeCursor(nextHolder, true);

    edit();
    requestAnimationFrame(updateCursorPos);
  };

  const handleBackspaceAtStart = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!range.collapsed || range.startOffset !== 0) return false;

    const block = getCurrentBlock(range.startContainer, range.startOffset);
    if (!block) return false;

    const holder = holderOf(block);
    if (range.startContainer !== holder && range.startContainer.parentElement !== holder) return false;

    const cls = block.className || '';
    const currentText = getCleanText(holder.innerHTML).replace(/\u00A0/g, '');
    const isSpecial = /todo-item|bullet-item|numbered-item|heading-1|heading-2|quote-block|code-block/.test(cls);

    if (isSpecial) {
      const newNodes = buildNodes(BLOCK_HTML.text);
      setHolderText(newNodes[0], currentText);
      block.replaceWith(...newNodes);
      placeCursor(newNodes[0], true);
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
    const prevText = getCleanText(prevHolder.innerHTML).replace(/\u00A0/g, '');
    const mergedText = prevText + currentText;

    setHolderText(prevHolder, mergedText);
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

  const applySlashCommandRef = useRef(applySlashCommand);
  applySlashCommandRef.current = applySlashCommand;

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
    handleKeyDown,
    handleEditorClick,
    updateCursorPos,
    applySlashCommandRef
  };
}