import React, { useEffect, useRef } from 'react';
import { IconDownload, IconX, IconMarkdown, IconFileText } from '@tabler/icons-react';

const FORMATS = [
  { id: 'md', label: 'markdown (.md)', hint: 'best for editing later', Icon: IconMarkdown },
  { id: 'txt', label: 'plain text (.txt)', hint: 'no formatting, opens anywhere', Icon: IconFileText },
];

export default function Save({ open, onClose, onExport }) {
  const menuRef = useRef(null);
  const firstBtnRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      const id = requestAnimationFrame(() => firstBtnRef.current?.focus());
      return () => cancelAnimationFrame(id);
    } else {
      triggerRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(menuRef.current.querySelectorAll('[data-option]'));
        const idx = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
        items[(next + items.length) % items.length]?.focus();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  const handleExport = (format) => {
    onExport(format);
    onClose();
  };

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200 ease-out ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Save as"
        className={`bg-[var(--bg)] rounded-2xl shadow-2xl p-2 w-64 flex flex-col gap-1 transition-all duration-200 ease-out ${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-3'
          }`}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[13px] font-medium tracking-tight text-[var(--fg)] lowercase opacity-60">
            save as
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="opacity-40 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fg)]/30 rounded-md transition-opacity"
          >
            <IconX size={14} stroke={2} />
          </button>
        </div>

        {FORMATS.map(({ id, label, hint, Icon }, i) => (
          <button
            key={id}
            data-option
            ref={i === 0 ? firstBtnRef : null}
            onClick={() => handleExport(id)}
            className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none text-left transition-all"
          >
            <Icon size={15} stroke={1.5} className="shrink-0 opacity-60 group-hover:opacity-90 transition-opacity" />
            <span className="flex flex-col">
              <span className="text-sm text-[var(--fg)] opacity-80 group-hover:opacity-100 lowercase transition-opacity">
                {label}
              </span>
              <span className="text-[11px] text-[var(--fg)] opacity-40 lowercase">
                {hint}
              </span>
            </span>
            <IconDownload
              size={14}
              stroke={1.5}
              className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity"
            />
          </button>
        ))}
      </div>
    </div>
  );
}