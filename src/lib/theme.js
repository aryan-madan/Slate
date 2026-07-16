import { useEffect, useState } from 'react';
import { useLocal } from '../Hook';

const ORDER = ['dark', 'light', 'system'];

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function useTheme() {
    const [preference, setPreference] = useLocal('theme', 'dark');
    const [systemTheme, setSystemTheme] = useState(getSystemTheme);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const handler = () => setSystemTheme(getSystemTheme());
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const resolvedTheme = preference === 'system' ? systemTheme : preference;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);

    const cycleTheme = () => {
        setPreference(prev => ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]);
    };

    return { theme: preference, resolvedTheme, cycleTheme };
}