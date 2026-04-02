import React from 'react';
import { useLocal } from './Hook';

export default function App() {
  const [text, setText] = useLocal('text', '');

  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex flex-col items-center overflow-hidden">
      
      <div className="absolute top-8 left-8">
        <div className="w-4 h-4 rounded-[4px] border border-[var(--fg)] opacity-20" />
      </div>

      <main className="w-full max-w-2xl h-full flex flex-col pt-32 px-6">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing..."
          className="w-full h-full bg-transparent border-none outline-none resize-none text-[17px] font-normal leading-relaxed placeholder:opacity-10 text-[var(--fg)] tracking-tight"
          spellCheck="false"
        />
      </main>

    </div>
  );
}