import React from 'react';
import { IconDownload, IconSun, IconMoon } from '@tabler/icons-react';

export default function Topbar({ onExport, wordCount, isTyping, theme, onToggleTheme }) {
    return (
        <div className="fixed top-12 right-12 z-50 flex items-center gap-4">
            <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 text-[13px] font-light tracking-tight text-[var(--fg)] opacity-30 hover:opacity-80 transition-opacity lowercase"
            >
                {theme === 'dark' ? <IconSun size={14} stroke={1.5} /> : <IconMoon size={14} stroke={1.5} />}
            </button>
            <button
                onClick={() => onExport('md')}
                className="flex items-center gap-1.5 text-[13px] font-light tracking-tight text-[var(--fg)] opacity-30 hover:opacity-80 transition-opacity lowercase"
            >
                <IconDownload size={13} stroke={1.5} />
                md
            </button>
            <button
                onClick={() => onExport('txt')}
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
    );
}