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
import Math from './components/Math';

export default function App() {
  const [items, setItems] = useLocal('items', [{ id: 1, body: '' }]);
  const [active, setActive] = useState(() => {
    const saved = window.localStorage.getItem('active');
    const savedId = saved ? JSON.parse(saved) : null;
    const initialItems = Array.isArray(items) ? items : [];
    if (savedId && initialItems.some(item => item.id === savedId)) return savedId;
    return initialItems[0]?.id ?? 1;
  });
  const [show, setShow] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const { cycleTheme } = useTheme();

  const safeItems = Array.isArray(items) ? items : [];
  const cur = safeItems.find(i => i.id === active) || safeItems[0] || { id: active, body: '' };
  const curve = 'cubic-bezier(0.16, 1, 0.3, 1)';

  useEffect(() => {
    window.localStorage.setItem('active', JSON.stringify(active));
  }, [active]);

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
    mathOpen,
    mathPos,
    mathResult,
    acceptMathResult,
    edit,
    handleBeforeInput,
    handleKeyDown,
    handleEditorClick,
    updateCursorPos,
    applySlashCommand
  } = useEditor(cur, active, setItems);

  const handleExport = (format) => {
    exportNote(cur.body, EMPTY_NOTE_HTML, format);
    setSaveOpen(false);
  };

  useShortcuts({
    onSave: () => setSaveOpen(true),
    onTheme: cycleTheme
  });

  return (
    <div className="fixed inset-0 bg-[var(--sidebar)] flex overflow-hidden">
      <div className="absolute top-10 left-10 z-50 pointer-events-none opacity-20">
        <div className="w-4 h-4 rounded-[4px] border border-[var(--fg)]" />
      </div>

      <Topbar
        wordCount={wordCount}
        isTyping={isTyping}
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
              onBeforeInput={handleBeforeInput}
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
              onSelect={applySlashCommand}
            />

            <Math
              open={mathOpen}
              pos={mathPos}
              result={mathResult}
              onAccept={acceptMathResult}
            />
          </div>
        </div>
      </main>

      <Save open={saveOpen} onClose={() => setSaveOpen(false)} onExport={handleExport} />
    </div>
  );
}