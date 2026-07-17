import React, { useEffect, useRef } from 'react';
import { IconDownload, IconX } from '@tabler/icons-react';

export default function Save({ open, onClose, onExport }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ease-out ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div
        ref={menuRef}
        className={`bg-[var(--bg)] rounded-2xl shadow-2xl p-2 w-64 flex flex-col gap-1 transition-all duration-200 ease-out ${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-3'}`}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[13px] font-medium tracking-tight text-[var(--fg)] lowercase opacity-60">save as</span>
          <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
            <IconX size={14} stroke={2} />
          </button>
        </div>
        <button
          onClick={() => onExport('md')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-[var(--fg)] opacity-80 hover:opacity-100 transition-all lowercase"
        >
          <IconDownload size={15} stroke={1.5} />
          markdown (.md)
        </button>
        <button
          onClick={() => onExport('txt')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-[var(--fg)] opacity-80 hover:opacity-100 transition-all lowercase"
        >
          <IconDownload size={15} stroke={1.5} />
          plain text (.txt)
        </button>
      </div>
    </div>
  );
}