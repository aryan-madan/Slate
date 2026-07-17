import React from 'react';

export default function Slash({ slashOpen, slashPos, filteredSlashItems, slashIndex, setSlashIndex, onSelect }) {
    if (!slashOpen) return null;

    return (
        <div className="slash-menu" style={{ left: slashPos.x, top: slashPos.y, zIndex: 999 }}>
            {filteredSlashItems.length === 0 && (
                <div className="slash-menu-empty">no matches</div>
            )}
            {filteredSlashItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        className={`slash-menu-item ${idx === slashIndex ? 'active' : ''}`}
                        onMouseEnter={() => setSlashIndex(idx)}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onSelect(item);
                        }}
                    >
                        <Icon size={16} stroke={1.5} />
                        <span className="lowercase tracking-tight">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}