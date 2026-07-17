import React from 'react';

export default function Editor({ editorRef, cursorPos, cursorHeight, curve, onInput, onBeforeInput, onKeyDown, onMouseUp, onKeyUp, onClick }) {
    return (
        <>
            <div
                className="custom-cursor absolute w-[1.5px] bg-[var(--fg)] opacity-40 pointer-events-none z-10"
                style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    height: cursorHeight,
                    transform: 'translateY(15%)',
                    transition: `left 80ms ${curve}, top 80ms ${curve}, height 80ms ${curve}`
                }}
            />
            <div
                ref={editorRef}
                contentEditable
                onInput={onInput}
                onBeforeInput={onBeforeInput}
                onKeyDown={onKeyDown}
                onMouseUp={onMouseUp}
                onKeyUp={onKeyUp}
                onClick={onClick}
                className="text-base-style w-full min-h-[60vh] outline-none text-[var(--fg)] caret-transparent select-text"
                spellCheck="false"
                data-placeholder="start writing, or type / for commands..."
            />
        </>
    );
}
