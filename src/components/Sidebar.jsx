import React, { useState, useRef, useEffect } from 'react';
import { IconPlus, IconX } from '@tabler/icons-react';
import { getCleanText } from '../lib/utils';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
const mod = isMac ? '⌘' : 'ctrl';

export default function Sidebar({ items, active, setActive, setItems, show, setShow }) {
    const [editingId, setEditingId] = useState(null);
    const [draftTitle, setDraftTitle] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (editingId !== null) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editingId]);

    const startEditing = (item) => {
        setEditingId(item.id);
        setDraftTitle(item.title ?? getCleanText(item.body).split('\n')[0] ?? '');
    };

    const commitTitle = () => {
        const trimmed = draftTitle.trim();
        setItems(items.map(item =>
            item.id === editingId ? { ...item, title: trimmed || undefined } : item
        ));
        setEditingId(null);
    };

    const cancelEditing = () => setEditingId(null);

    return (
        <>
            {!show && (
                <div onMouseEnter={() => setShow(true)} className="fixed inset-y-0 left-0 w-20 z-40" />
            )}

            <aside
                onMouseLeave={() => setShow(false)}
                className={`fixed inset-y-0 left-0 w-80 pt-[104px] flex flex-col bg-[var(--sidebar)] transition-all duration-500 z-30 ${show ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <div className="px-6 flex flex-col gap-1 w-full h-full">
                    <button onClick={() => {
                        const newId = Date.now();
                        setItems([...items, { id: newId, body: '' }]);
                        setActive(newId);
                    }} className="w-full flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm opacity-60 hover:opacity-100 group mb-1">
                        <IconPlus size={18} stroke={1.5} />
                        <span className="lowercase tracking-tight font-medium">new slate</span>
                    </button>

                    <nav className="flex flex-col w-full overflow-y-auto no-scrollbar pb-10 flex-1">
                        {(items || []).map((i) => (
                            <div key={i.id} className="group relative w-full">
                                {editingId === i.id ? (
                                    <input
                                        ref={inputRef}
                                        value={draftTitle}
                                        onChange={(e) => setDraftTitle(e.target.value)}
                                        onBlur={commitTitle}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitTitle();
                                            if (e.key === 'Escape') cancelEditing();
                                        }}
                                        style={{ outline: 'none', boxShadow: 'none' }}
                                        className="w-full text-left pl-4 pr-12 py-3 rounded-xl text-sm bg-white/5 border-0 outline-none focus:outline-none appearance-none lowercase tracking-tight font-medium text-[var(--fg)]"
                                    />
                                ) : (
                                    <button
                                        onClick={() => setActive(i.id)}
                                        onDoubleClick={() => startEditing(i)}
                                        className={`w-full text-left pl-4 pr-12 py-3 rounded-xl text-sm transition-all ${active === i.id ? 'bg-white/5 opacity-100 font-medium' : 'opacity-25 hover:opacity-60'}`}
                                    >
                                        <span className="truncate block lowercase tracking-tight">
                                            {i.title || getCleanText(i.body).split('\n')[0] || 'untitled'}
                                        </span>
                                    </button>
                                )}
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

                    <div className="pb-6 pt-3 flex flex-col gap-1.5 text-[11px] opacity-25 select-none">
                        <div className="flex items-center gap-2">
                            <span className="tracking-tight font-medium px-1.5 py-0.5 rounded-[4px] bg-white/5 border border-white/10 leading-none">
                                {mod} s
                            </span>
                            <span className="lowercase tracking-tight">save</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="tracking-tight font-medium px-1.5 py-0.5 rounded-[4px] bg-white/5 border border-white/10 leading-none">
                                {mod} j
                            </span>
                            <span className="lowercase tracking-tight">theme</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}