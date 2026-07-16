import React, { useState, useEffect } from 'react';
import './App.css';
import { useLocal } from './Hook';
import useEditor from './lib/logic';
import useTheme from './lib/theme';
import useShortcuts from './lib/keys';
import { EMPTY_NOTE_HTML } from './lib/constants';
import { getCleanText } from './lib/utils';
import { exportNote } from './lib/exporters';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Slash from './components/Slash';
import Editor from './components/Editor';
import Save from './components/Save';

export default function App() {
  const [items, setItems] = useLocal('items', [{ id: 1, body: '' }]);
  const [active, setActive] = useState(() => {
    const saved = window.localStorage.getItem('active');
    return saved ? JSON.parse(saved) : 1;
  });
  const [show, setShow] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();

  const safeItems = Array.isArray(items) ? items : [];
  const cur = safeItems.find(i => i.id === active) || safeItems[0] || { id: active, body: '' };
  const curve = 'cubic-bezier(0.16, 1, 0.3, 1)';

  useEffect(() => {
    window.localStorage.setItem('active', JSON.stringify(active));
  }, [active]);

  useEffect(() => {
    if (Array.isArray(items) && !items.find(i => i.id === active) && items.length > 0) {
      setActive(items[0].id);
    }
  }, [items, active]);

  const wordCount = getCleanText(cur.body).trim() ? getCleanText(cur.body).trim().split(/\s+/).length : 0;

  const {
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
  } = useEditor(cur, active, setItems);

  const handleExport = (format) => {
    exportNote(cur.body, EMPTY_NOTE_HTML, format);
    setSaveOpen(false);
  };

  useShortcuts({
    onSave: () => setSaveOpen(true),
    onTheme: toggleTheme
  });

  return (
    <div className="fixed inset-0 bg-[var(--sidebar)] flex overflow-hidden">
      <div className="absolute top-10 left-10 z-50 pointer-events-none opacity-20">
        <div className="w-4 h-4 rounded-[4px] border border-[var(--fg)]" />
      </div>

      <Topbar
        onExport={handleExport}
        wordCount={wordCount}
        isTyping={isTyping}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <Sidebar
        items={safeItems}
        active={active}
        setActive={setActive}
        setItems={setItems}
        show={show}
        setShow={setShow}
      />

      <main className={`relative flex-1 bg-[var(--bg)] transition-all duration-500 h-full ${show ? 'translate-x-80 rounded-l-[24px]' : 'translate-x-0 rounded-l-0'}`} style={{ transitionTimingFunction: curve }}>
        <div className="h-full w-full flex justify-center pt-32 px-12 pb-40 overflow-y-auto no-scrollbar scroll-smooth">
          <div className="w-full max-w-2xl relative">
            <Editor
              editorRef={editorRef}
              cursorPos={cursorPos}
              cursorHeight={cursorHeight}
              curve={curve}
              onInput={edit}
              onKeyDown={handleKeyDown}
              onMouseUp={updateCursorPos}
              onKeyUp={updateCursorPos}
              onClick={handleEditorClick}
            />

            <Slash
              slashOpen={slashOpen}
              slashPos={slashPos}
              filteredSlashItems={filteredSlashItems}
              slashIndex={slashIndex}
              setSlashIndex={setSlashIndex}
              onSelect={(item) => applySlashCommandRef.current(item)}
            />
          </div>
        </div>
      </main>

      <Save open={saveOpen} onClose={() => setSaveOpen(false)} onExport={handleExport} />
    </div>
  );
}