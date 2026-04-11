import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocal } from './Hook';
import { IconPlus, IconX } from '@tabler/icons-react';

export default function App() {
  const [items, setItems] = useLocal('items', [{ id: 1, body: '' }]);
  const [active, setActive] = window.localStorage.getItem('active') 
    ? useState(JSON.parse(window.localStorage.getItem('active'))) 
    : useState(1);
  
  const [show, setShow] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  
  const editorRef = useRef(null);
  const syncTimeout = useRef(null);
  const typingTimeout = useRef(null);

  const cur = items.find(i => i.id === active) || items[0];
  const curve = 'cubic-bezier(0.16, 1, 0.3, 1)';

  useEffect(() => {
    window.localStorage.setItem('active', JSON.stringify(active));
  }, [active]);

  const getCleanText = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const wordCount = getCleanText(cur.body).trim() ? getCleanText(cur.body).trim().split(/\s+/).length : 0;

  const updateCursorPos = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    
    const range = selection.getRangeAt(0).cloneRange();
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

    if (rect) {
      const editorRect = editorRef.current.getBoundingClientRect();

      setCursorPos({
        x: rect.left - editorRect.left,
        y: rect.top - editorRect.top
      });
    }
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== cur.body) {
        editorRef.current.innerHTML = cur.body;
      }
      editorRef.current.querySelectorAll('.char-fade').forEach(el => el.classList.add('stable'));
      
      editorRef.current.focus();
      
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      
      requestAnimationFrame(updateCursorPos);
    }
  }, [active, updateCursorPos]);

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
  };

  const handleKeyDown = (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    
    if (e.key === 'Enter') {
      editorRef.current.querySelectorAll('.char-fade:not(.stable)').forEach(el => el.classList.add('stable'));
      setTimeout(() => {
        edit();
        updateCursorPos();
      }, 10);
      return;
    }

    if (e.key.length === 1 && !isMod) {
      e.preventDefault();
      const char = e.key === ' ' ? '&nbsp;' : e.key;
      const html = `<span class="char-fade">${char}</span>`;
      document.execCommand('insertHTML', false, html);
      
      const lastChar = editorRef.current.querySelector('.char-fade:not(.stable)');
      if (lastChar) setTimeout(() => lastChar.classList.add('stable'), 400);
      
      edit();
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;');
      edit();
    }

    if (isMod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      edit();
    }

    if (isMod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      document.execCommand('italic', false);
      edit();
    }

    setTimeout(updateCursorPos, 0);
  };

  return (
    <div className="fixed inset-0 bg-[var(--sidebar)] flex overflow-hidden">
      <div className="absolute top-10 left-10 z-50 pointer-events-none opacity-20">
        <div className="w-4 h-4 rounded-[4px] border border-[var(--fg)]" />
      </div>

      <div className="fixed top-12 right-12 z-50">
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
                height: '1.2em',
                transform: 'translateY(15%)',
                transition: `left 80ms ${curve}, top 80ms ${curve}`
              }} 
            />
            <div
              ref={editorRef}
              contentEditable
              onInput={edit}
              onKeyDown={handleKeyDown}
              onMouseUp={updateCursorPos}
              onKeyUp={updateCursorPos}
              className="text-base-style w-full min-h-[60vh] outline-none text-[var(--fg)] caret-transparent select-text"
              spellCheck="false"
              data-placeholder="start writing..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}