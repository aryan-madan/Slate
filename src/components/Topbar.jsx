import React from 'react';

export default function Topbar({ wordCount, isTyping }) {
    return (
        <div className="fixed top-12 right-12 z-50 flex items-center gap-4">
            <div className={`status-bar ${isTyping ? 'status-hidden' : 'status-visible'}`}>
                <div className="counter">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </div>
            </div>
        </div>
    );
}