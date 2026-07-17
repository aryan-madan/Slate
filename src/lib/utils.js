export const getCleanText = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

export const matchMarkdownTrigger = (cleaned) => {
    if (/^#$/.test(cleaned)) return 'h1';
    if (/^##$/.test(cleaned)) return 'h2';
    if (/^[-*]$/.test(cleaned)) return 'bullet';
    if (/^\d+\.$/.test(cleaned)) return 'numbered';
    if (/^\[\]$/.test(cleaned)) return 'todo';
    if (/^>$/.test(cleaned)) return 'quote';
    if (/^```$/.test(cleaned)) return 'code';
    return null;
};

export const sanitizeFilename = (str) => {
    const cleaned = (str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
    return cleaned || 'untitled';
};

export const downloadFile = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const evaluateMathExpression = (expr) => {
    const sanitized = expr.replace(/[^0-9+\-*/.() ]/g, '');
    if (!sanitized.trim()) return 0;
    try {
        const result = Function(`"use strict"; return (${sanitized});`)();
        return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch {
        return 0;
    }
};

export const computeCheckedHoursTotal = (html) => {
    if (!html) return 0;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const todos = doc.querySelectorAll('.todo-item');
    let total = 0;

    todos.forEach((todo) => {
        const checkbox = todo.querySelector('.todo-checkbox');
        if (!checkbox || !checkbox.hasAttribute('checked')) return;

        const text = (todo.querySelector('.todo-text') || todo).textContent || '';
        const match = text.match(/\(([^)]*)\)/);
        if (!match) return;

        const expr = match[1].replace(/hours?/gi, '').trim();
        total += evaluateMathExpression(expr);
    });

    return Math.round(total * 100) / 100;
};