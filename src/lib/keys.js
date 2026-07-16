import { useEffect } from 'react';

export default function useShortcuts({ onSave, onTheme }) {
    useEffect(() => {
        const handler = (e) => {
            const isMod = e.metaKey || e.ctrlKey;
            if (!isMod) return;

            const key = e.key.toLowerCase();

            if (key === 's') {
                e.preventDefault();
                onSave();
                return;
            }

            if (key === 'j') {
                e.preventDefault();
                onTheme();
                return;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onSave, onTheme]);
}