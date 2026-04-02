import React, { useState, useRef, useLayoutEffect } from 'react';
import { useLocal } from './Hook';
import { IconPlus, IconX } from '@tabler/icons-react';

export default function App() {
  const [items, setItems] = useLocal('items', [{ id: 1, body: '' }]);
  const [active, setActive] = useLocal('active', 1);
  const [show, setShow] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const lastAddedId = useRef(null);

  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const cur = items.find(i => i.id === active) || items[0];
  const curve = 'cubic-bezier(0.16, 1, 0.3, 1)';

  const updateCursor = () => {
    if (!textareaRef.current || !mirrorRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const textBefore = el.value.substring(0, start);
    mirrorRef.current.textContent = textBefore;
    const span = document.createElement('span');
    span.textContent = '\u200b';
    mirrorRef.current.appendChild(span);
    setCursorPos({ x: span.offsetLeft, y: span.offsetTop });
  };

  useLayoutEffect(() => {
    updateCursor();
  }, [cur.body, active]);

  const edit = (val) => {
    setItems(items.map(i => i.id === active ? { ...i, body: val } : i));
  };

  const add = () => {
    const newId = Date.now();
    lastAddedId.current = newId;
    setItems([...items, { id: newId, body: '' }]);
  };

  const remove = (id) => {
    if (items.length <= 1 && items[0].body === '') return;
    setDeletingId(id);
    setTimeout(() => {
      const filtered = items.filter(i => i.id !== id);
      const nextItems = filtered.length ? filtered : [{ id: Date.now(), body: '' }];
      if (active === id) setActive(nextItems[0].id);
      setItems(nextItems);
      setDeletingId(null);
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-[var(--sidebar)] flex overflow-hidden select-none">
      <div className="absolute top-10 left-10 z-50 pointer-events-none">
        <div className="w-4 h-4 rounded-[4px] border border-[var(--fg)] opacity-20" />
      </div>

      <div onMouseEnter={() => setShow(true)} className="fixed inset-y-0 left-0 w-20 z-40" />

      <aside
        onMouseLeave={() => setShow(false)}
        className={`fixed inset-y-0 left-0 w-72 px-4 pt-24 flex flex-col bg-[var(--sidebar)] transition-all duration-500 z-30 ${show ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
        style={{ transitionTimingFunction: curve }}
      >
        <div className="px-2">
          <button onClick={add} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm opacity-60 hover:opacity-100 mb-6 group">
            <IconPlus size={18} stroke={1.5} className="transition-transform group-active:scale-90" />
            <span className="font-medium lowercase tracking-tight">new slate</span>
          </button>
          <nav className="flex flex-col overflow-y-auto custom-scrollbar">
            {items.map((i) => (
              <div
                key={i.id}
                className={`slate-item group relative ${deletingId === i.id ? 'exit' : ''} ${lastAddedId.current === i.id ? 'slate-item-new' : ''}`}
              >
                <button
                  onClick={() => setActive(i.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 truncate pr-10 ${active === i.id ? 'bg-white/5 opacity-100 font-medium' : 'opacity-25 hover:opacity-60'}`}
                >
                  {i.body.split('\n')[0].slice(0, 24) || 'untitled'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(i.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all"
                >
                  <IconX size={14} stroke={2} />
                </button>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <main
        className={`relative flex-1 bg-[var(--bg)] transition-all duration-500 overflow-hidden h-full ${show ? 'translate-x-72 rounded-l-[40px]' : 'translate-x-0 rounded-l-0'}`}
        style={{ transitionTimingFunction: curve }}
      >
        <div className="h-full w-full flex justify-center pt-32 px-12 pb-20 relative overflow-y-auto">
          <div className="w-full max-w-2xl relative">
            <div ref={mirrorRef} className="mirror-div text-base-style tracking-tight" />
            <div
              className="custom-cursor absolute w-[1.5px] h-[1.2em] bg-[var(--fg)] opacity-40 pointer-events-none translate-y-[0.22em]"
              style={{ left: cursorPos.x, top: cursorPos.y }}
            />
            <textarea
              ref={textareaRef}
              autoFocus
              key={active}
              value={cur.body}
              onChange={(e) => edit(e.target.value)}
              onSelect={updateCursor}
              onScroll={updateCursor}
              onKeyDown={(e) => {
                if (e.key === 'Tab') { e.preventDefault(); edit(cur.body + '  '); }
                requestAnimationFrame(updateCursor);
              }}
              placeholder="start writing..."
              className="text-fade-up text-base-style w-full bg-transparent border-none outline-none resize-none text-[var(--fg)] tracking-tight"
              spellCheck="false"
              rows={30}
            />
          </div>
        </div>
      </main>
    </div>
  );
}