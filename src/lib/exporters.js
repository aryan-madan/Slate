import { getCleanText, sanitizeFilename, downloadFile } from './utils';

export const blocksToMarkdown = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const children = Array.from(doc.body.children);
    const lines = [];
    let numberedCounter = 0;

    children.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const cls = el.className || '';

        if (tag === 'hr') {
            lines.push('---');
            numberedCounter = 0;
            return;
        }
        if (cls.includes('heading-1')) {
            lines.push('# ' + getCleanText(el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('heading-2')) {
            lines.push('## ' + getCleanText(el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('bullet-item')) {
            const span = el.querySelector('.bullet-text');
            lines.push('- ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('numbered-item')) {
            numberedCounter += 1;
            const span = el.querySelector('.numbered-text');
            lines.push(numberedCounter + '. ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
        } else if (cls.includes('todo-item')) {
            const checkbox = el.querySelector('.todo-checkbox');
            const checked = checkbox && checkbox.hasAttribute('checked');
            const span = el.querySelector('.todo-text');
            lines.push('- [' + (checked ? 'x' : ' ') + '] ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('quote-block')) {
            lines.push('> ' + getCleanText(el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('code-block')) {
            lines.push('```\n' + getCleanText(el.innerHTML).trim() + '\n```');
            numberedCounter = 0;
        } else {
            lines.push(getCleanText(el.innerHTML).trim());
            numberedCounter = 0;
        }
    });

    return lines.join('\n\n');
};

export const blocksToPlainText = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const children = Array.from(doc.body.children);
    const lines = [];
    let numberedCounter = 0;

    children.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const cls = el.className || '';

        if (tag === 'hr') {
            lines.push('----------');
            numberedCounter = 0;
            return;
        }
        if (cls.includes('heading-1') || cls.includes('heading-2')) {
            lines.push(getCleanText(el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('bullet-item')) {
            const span = el.querySelector('.bullet-text');
            lines.push('• ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('numbered-item')) {
            numberedCounter += 1;
            const span = el.querySelector('.numbered-text');
            lines.push(numberedCounter + '. ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
        } else if (cls.includes('todo-item')) {
            const checkbox = el.querySelector('.todo-checkbox');
            const checked = checkbox && checkbox.hasAttribute('checked');
            const span = el.querySelector('.todo-text');
            lines.push('[' + (checked ? 'x' : ' ') + '] ' + getCleanText(span ? span.innerHTML : el.innerHTML).trim());
            numberedCounter = 0;
        } else if (cls.includes('quote-block') || cls.includes('code-block')) {
            lines.push(getCleanText(el.innerHTML).trim());
            numberedCounter = 0;
        } else {
            lines.push(getCleanText(el.innerHTML).trim());
            numberedCounter = 0;
        }
    });

    return lines.join('\n\n');
};

export const exportNote = (bodyHtml, emptyHtml, format) => {
    const html = bodyHtml && bodyHtml.trim() !== '' ? bodyHtml : emptyHtml;
    const title = getCleanText(html).split('\n')[0].trim() || 'untitled';
    const filename = sanitizeFilename(title);

    if (format === 'md') {
        downloadFile(filename + '.md', blocksToMarkdown(html), 'text/markdown');
    } else {
        downloadFile(filename + '.txt', blocksToPlainText(html), 'text/plain');
    }
};