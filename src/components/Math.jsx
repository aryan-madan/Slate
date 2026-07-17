import React from 'react';

export default function Math({ open, pos, result, onAccept }) {
    if (!open) return null;

    return (
        <div
            onMouseDown={(e) => { e.preventDefault(); onAccept(); }}
            className="absolute z-20 flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-[var(--bg)]/90 backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)] text-sm text-[var(--fg)] cursor-pointer select-none hover:border-white/20 hover:shadow-[0_6px_24px_rgba(0,0,0,0.3)] transition-all duration-200 animate-math-pop"
            style={{ left: pos.x, top: pos.y }}
        >
            <span className="font-medium tabular-nums">= {result}</span>
            <span className="opacity-40 text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 leading-none">
                ↵
            </span>
        </div>
    );
}