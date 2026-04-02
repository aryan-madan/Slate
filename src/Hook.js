import { useState, useEffect } from 'react';

export function useLocal(key, init) {
    const [val, setVal] = useState(() => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : init;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(val));
    }, [key, val]);

    return [val, setVal];
}