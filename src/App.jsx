import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocal } from './Hook';
import {
  IconPlus,
  IconX,
  IconH1,
  IconH2,
  IconList,
  IconListNumbers,
  IconSquareCheck,
  IconQuote,
  IconCode,
  IconMinus,
  IconAlignLeft,
  IconDownload
} from '@tabler/icons-react';

const BLOCK_HTML = {
  text: '<div class="text-block">&nbsp;</div>',
  todo: '<div class="todo-item"><input type="checkbox" class="todo-checkbox" contenteditable="false"><span class="todo-text">&nbsp;</span></div>',
  h1: '<div class="heading-1">&nbsp;</div>',
  h2: '<div class="heading-2">&nbsp;</div>',
  bullet: '<div class="bullet-item"><span class="bullet-dot">•</span><span class="bullet-text">&nbsp;</span></div>',
  numbered: '<div class="numbered-item"><span class="numbered-marker"></span><span class="numbered-text">&nbsp;</span></div>',
  quote: '<div class="quote-block">&nbsp;</div>',
  code: '<div class="code-block">&nbsp;</div>',
  divider: '<hr class="divider"><div class="text-block">&nbsp;</div>'
};

const SLASH_ITEMS = [
  { id: 'text', label: 'text', keywords: ['text', 'paragraph', 'p'], icon: IconAlignLeft, html: BLOCK_HTML.text },
  { id: 'todo', label: 'to-do', keywords: ['todo', 'checkbox', 'check', 'task'], icon: IconSquareCheck, html: BLOCK_HTML.todo },
  { id: 'h1', label: 'heading 1', keywords: ['h1', 'heading', 'title'], icon: IconH1, html: BLOCK_HTML.h1 },
  { id: 'h2', label: 'heading 2', keywords: ['h2', 'heading', 'subtitle'], icon: IconH2, html: BLOCK_HTML.h2 },
  { id: 'bullet', label: 'bulleted list', keywords: ['bullet', 'list', 'ul'], icon: IconList, html: BLOCK_HTML.bullet },
  { id: 'numbered', label: 'numbered list', keywords: ['number', 'numbered', 'ol', 'list'], icon: IconListNumbers, html: BLOCK_HTML.numbered },
  { id: 'quote', label: 'quote', keywords: ['quote', 'blockquote'], icon: IconQuote, html: BLOCK_HTML.quote },
  { id: 'code', label: 'code', keywords: ['code', 'snippet'], icon: IconCode, html: BLOCK_HTML.code },
  { id: 'divider', label: 'divider', keywords: ['divider', 'line', 'hr'], icon: IconMinus, html: BLOCK_HTML.divider }
];

const EMPTY_NOTE_HTML = BLOCK_HTML.text;

const MARKDOWN_MAP = {
  h1: BLOCK_HTML.h1,
  h2: BLOCK_HTML.h2,
  bullet: BLOCK_HTML.bullet,
  numbered: BLOCK_HTML.numbered,
  todo: BLOCK_HTML.todo,
  quote: BLOCK_HTML.quote,
  code: BLOCK_HTML.code
};

const matchMarkdownTrigger = (cleaned) => {
  if (/^#$/.test(cleaned)) return 'h1';
  if (/^##$/.test(cleaned)) return 'h2';
  if (/^[-*]$/.test(cleaned)) return 'bullet';
  if (/^\d+\.$/.test(cleaned)) return 'numbered';
  if (/^\[\]$/.test(cleaned)) return 'todo';
  if (/^>$/.test(cleaned)) return 'quote';
  if (/^```$/.test(cleaned)) return 'code';
  return null;
};

const sanitizeFilename = (str) => {
  const cleaned = (str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  return cleaned || 'untitled';
};

const downloadFile = (filename, content, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function App() {
  const [items, setItems] = useLocal('items', [{ id: 1, body: '' }]);
  const [active, setActive] = useState(() => {
    const saved = window.localStorage.getItem('active');
    return saved ? JSON.parse(saved) : 1;
  });

  const [show, setShow] = useState(false);
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

  const cur = items.find(i => i.id === active) || items[0];
  const curve = 'cubic-bezier(0.16, 1, 0.3, 1)';

  useEffect(() => {
    window.localStorage.setItem('active', JSON.stringify(active));
  }, [active]);

  useEffect(() => {
    if (!items.find(i => i.id === active) && items.length > 0) {
      setActive(items[0].id);
    }
  }, [items, active]);

  const getCleanText = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const wordCount = getCleanText(cur.body).trim() ? getCleanText(cur.body).trim().split(/\s+/).length : 0;

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

  const edit = () => {
    if (!editorRef.current) return;
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

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const cursorOffset = range.startOffset;
      const beforeCursor = text.slice(0, cursorOffset);
      const slashIdx = beforeCursor.lastIndexOf('/');
      if (slashIdx !== -1) {
        node.textContent = text.slice(0, slashIdx) + text.slice(cursorOffset);
      }
    }

    const block = getCurrentBlock(node, range.startOffset);
    const remainingText = block ? getCleanText(block.innerHTML).trim() : '';
    const newNodes = buildNodes(item.html);

    if (block && block.parentElement === editorRef.current) {
      block.replaceWith(...newNodes);
    } else {
      editorRef.current.append(...newNodes);
    }

    const target = newNodes[newNodes.length - 1];
    const textHolder = target.querySelector
      ? (target.querySelector('.todo-text, .bullet-text, .numbered-text') || target)
      : target;

    if (textHolder && textHolder.nodeType === Node.ELEMENT_NODE) {
      textHolder.textContent = remainingText || '\u00A0';
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

    const firstChild = block.firstChild;
    if (firstChild !== node) return false;

    const textBefore = node.textContent.slice(0, range.startOffset);
    const cleaned = textBefore.replace(/\u00A0/g, '').trim();
    const matchedType = matchMarkdownTrigger(cleaned);
    if (!matchedType) return false;

    e.preventDefault();

    const remaining = node.textContent.slice(range.startOffset);
    const newNodes = buildNodes(MARKDOWN_MAP[matchedType]);
    block.replaceWith(...newNodes);

    const target = newNodes[newNodes.length - 1];
    const textHolder = target.querySelector
      ? (target.querySelector('.todo-text, .bullet-text, .numbered-text') || target)
      : target;

    if (textHolder && textHolder.nodeType === Node.ELEMENT_NODE) {
      textHolder.textContent = remaining || '\u00A0';
      placeCursor(textHolder, false);
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

    if (!block) {
      block = editorRef.current.lastElementChild;
    }
    if (!block) return;

    const cls = block.className || '';
    const textSpan = block.querySelector ? block.querySelector('.todo-text, .bullet-text, .numbered-text') : null;
    const isEmpty = textSpan
      ? getCleanText(textSpan.innerHTML).trim() === ''
      : getCleanText(block.innerHTML).trim() === '';

    let newNodes;

    if (/todo-item|bullet-item|numbered-item/.test(cls) && isEmpty) {
      newNodes = buildNodes(BLOCK_HTML.text);
      block.replaceWith(...newNodes);
      newNodes[0].textContent = '\u00A0';
      placeCursor(newNodes[0], false);
    } else if (cls.includes('todo-item')) {
      newNodes = buildNodes(BLOCK_HTML.todo);
      block.after(...newNodes);
      placeCursor(newNodes[0].querySelector('.todo-text'), false);
    } else if (cls.includes('bullet-item')) {
      newNodes = buildNodes(BLOCK_HTML.bullet);
      block.after(...newNodes);
      placeCursor(newNodes[0].querySelector('.bullet-text'), false);
    } else if (cls.includes('numbered-item')) {
      newNodes = buildNodes(BLOCK_HTML.numbered);
      block.after(...newNodes);
      placeCursor(newNodes[0].querySelector('.numbered-text'), false);
    } else {
      newNodes = buildNodes(BLOCK_HTML.text);
      block.after(...newNodes);
      placeCursor(newNodes[0], false);
    }

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

    const cls = block.className || '';
    const isSpecial = /todo-item|bullet-item|numbered-item|heading-1|heading-2|quote-block|code-block/.test(cls);
    if (!isSpecial) return false;
    if (block === editorRef.current.firstElementChild && editorRef.current.children.length === 1) {
      const textSpan = block.querySelector('.todo-text, .bullet-text, .numbered-text');
      if (textSpan && getCleanText(textSpan.innerHTML).trim() !== '') return false;
      if (!textSpan && getCleanText(block.innerHTML).trim() !== '') return false;
    }

    const textSpan = block.querySelector('.todo-text, .bullet-text, .numbered-text');
    const content = textSpan ? textSpan.innerHTML : block.innerHTML;
    const newNodes = buildNodes(BLOCK_HTML.text);
    newNodes[0].innerHTML = content && content.trim() !== '' ? content : '&nbsp;';
    block.replaceWith(...newNodes);
    placeCursor(newNodes[0], true);
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
          applySlashCommand(filteredSlashItems[slashIndex]);
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

  const blocksToMarkdown = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const children = Array.from(doc.body.children);
    const lines = [];
    let numberedCounter = 0;

    children.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const cls = el.className || '';

      if (tag === 'hr') {
        lines.push('---');
        numberedCounter = 0;
        return;
      }
      if (cls.includes('heading-1')) {
        lines.push('# ' + getCleanText(el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('heading-2')) {
        lines.push('## ' + getCleanText(el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('bullet-item')) {
        const span = el.querySelector('.bullet-text');
        lines.push('- ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('numbered-item')) {
        numberedCounter += 1;
        const span = el.querySelector('.numbered-text');
        lines.push(numberedCounter + '. ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
      } else if (cls.includes('todo-item')) {
        const checkbox = el.querySelector('.todo-checkbox');
        const checked = checkbox && checkbox.hasAttribute('checked');
        const span = el.querySelector('.todo-text');
        lines.push('- [' + (checked ? 'x' : ' ') + '] ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('quote-block')) {
        lines.push('> ' + getCleanText(el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('code-block')) {
        lines.push('```\n' + getCleanText(el.innerHTML).trim() + '\n```');
        numberedCounter = 0;
      } else {
        lines.push(getCleanText(el.innerHTML).trim());
        numberedCounter = 0;
      }
    });

    return lines.join('\n\n');
  };

  const blocksToPlainText = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const children = Array.from(doc.body.children);
    const lines = [];
    let numberedCounter = 0;

    children.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const cls = el.className || '';

      if (tag === 'hr') {
        lines.push('----------');
        numberedCounter = 0;
        return;
      }
      if (cls.includes('heading-1') || cls.includes('heading-2')) {
        lines.push(getCleanText(el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('bullet-item')) {
        const span = el.querySelector('.bullet-text');
        lines.push('• ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('numbered-item')) {
        numberedCounter += 1;
        const span = el.querySelector('.numbered-text');
        lines.push(numberedCounter + '. ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
      } else if (cls.includes('todo-item')) {
        const checkbox = el.querySelector('.todo-checkbox');
        const checked = checkbox && checkbox.hasAttribute('checked');
        const span = el.querySelector('.todo-text');
        lines.push('[' + (checked ? 'x' : ' ') + '] ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
        numberedCounter = 0;
      } else if (cls.includes('quote-block') || cls.includes('code-block')) {
        lines.push(getCleanText(el.innerHTML).trim());
        numberedCounter = 0;
      } else {
        lines.push(getCleanText(el.innerHTML).trim());
        numberedCounter = 0;
      }
    });

    return lines.join('\n\n');
  };

  const exportNote = (format) => {
    const html = cur.body && cur.body.trim() !== '' ? cur.body : EMPTY_NOTE_HTML;
    const title = getCleanText(html).split('\n')[0].trim() || 'untitled';
    const filename = sanitizeFilename(title);

    if (format === 'md') {
      downloadFile(filename + '.md', blocksToMarkdown(html), 'text/markdown');
    } else {
      downloadFile(filename + '.txt', blocksToPlainText(html), 'text/plain');
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--sidebar)] flex overflow-hidden">
      <div className="absolute top-10 left-10 z-50 pointer-events-none opacity-20">
        <div className="w-4 h-4 rounded-[4px] border border-[var(--fg)]" />
      </div>

      <div className="fixed top-12 right-12 z-50 flex items-center gap-4">
        <button
          onClick={() => exportNote('md')}
          className="flex items-center gap-1.5 text-[13px] font-light tracking-tight text-[var(--fg)] opacity-30 hover:opacity-80 transition-opacity lowercase"
        >
          <IconDownload size={13} stroke={1.5} />
          md
        </button>
        <button
          onClick={() => exportNote('txt')}
          className="flex items-center gap-1.5 text-[13px] font-light tracking-tight text-[var(--fg)] opacity-30 hover:opacity-80 transition-opacity lowercase"
        >
          <IconDownload size={13} stroke={1.5} />
          txt
        </button>
        <div className={`status-bar ${isTyping ? 'status-hidden' : 'status-visible'}`}>
          <div className="text-[13px] font-light tracking-tight text-[var(--fg)] opacity-40 lowercase">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>
        </div>
      </div>

      <div onMouseEnter={() => setShow(true)} className="fixed inset-y-0 left-0 w-20 z-40" />

      <aside
        onMouseLeave={() => setShow(false)}
        className={`fixed inset-y-0 left-0 w-80 pt-[104px] flex flex-col bg-[var(--sidebar)] transition-all duration-500 z-30 ${show ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
        style={{ transitionTimingFunction: curve }}
      >
        <div className="px-6 flex flex-col gap-1 w-full">
          <button onClick={() => {
            const newId = Date.now();
            setItems([...items, { id: newId, body: '' }]);
            setActive(newId);
          }} className="w-full flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm opacity-60 hover:opacity-100 group mb-1">
            <IconPlus size={18} stroke={1.5} />
            <span className="lowercase tracking-tight font-medium">new slate</span>
          </button>

          <nav className="flex flex-col w-full overflow-y-auto no-scrollbar pb-10">
            {items.map((i) => (
              <div key={i.id} className="group relative w-full">
                <button onClick={() => setActive(i.id)} className={`w-full text-left pl-4 pr-12 py-3 rounded-xl text-sm transition-all ${active === i.id ? 'bg-white/5 opacity-100 font-medium' : 'opacity-25 hover:opacity-60'}`}>
                  <span className="truncate block lowercase tracking-tight">
                    {getCleanText(i.body).split('\n')[0] || 'untitled'}
                  </span>
                </button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  if (items.length > 1) {
                    const filtered = items.filter(item => item.id !== i.id);
                    if (active === i.id) setActive(filtered[0].id);
                    setItems(filtered);
                  }
                }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all">
                  <IconX size={14} stroke={2} />
                </button>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <main className={`relative flex-1 bg-[var(--bg)] transition-all duration-500 h-full ${show ? 'translate-x-80 rounded-l-[24px]' : 'translate-x-0 rounded-l-0'}`} style={{ transitionTimingFunction: curve }}>
        <div className="h-full w-full flex justify-center pt-32 px-12 pb-40 overflow-y-auto no-scrollbar scroll-smooth">
          <div className="w-full max-w-2xl relative">
            <div
              className="custom-cursor absolute w-[1.5px] bg-[var(--fg)] opacity-40 pointer-events-none z-10"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                height: cursorHeight,
                transform: 'translateY(15%)',
                transition: `left 80ms ${curve}, top 80ms ${curve}, height 80ms ${curve}`
              }}
            />
            <div
              ref={editorRef}
              contentEditable
              onInput={edit}
              onKeyDown={handleKeyDown}
              onMouseUp={updateCursorPos}
              onKeyUp={updateCursorPos}
              onClick={handleEditorClick}
              className="text-base-style w-full min-h-[60vh] outline-none text-[var(--fg)] caret-transparent select-text"
              spellCheck="false"
              data-placeholder="start writing, or type / for commands..."
            />

            {slashOpen && (
              <div
                className="slash-menu"
                style={{ left: slashPos.x, top: slashPos.y }}
              >
                {filteredSlashItems.length === 0 && (
                  <div className="slash-menu-empty">no matches</div>
                )}
                {filteredSlashItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={`slash-menu-item ${idx === slashIndex ? 'active' : ''}`}
                      onMouseEnter={() => setSlashIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applySlashCommandRef.current(item);
                      }}
                    >
                      <Icon size={16} stroke={1.5} />
                      <span className="lowercase tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}