import {
  IconH1,
  IconH2,
  IconList,
  IconListNumbers,
  IconSquareCheck,
  IconQuote,
  IconCode,
  IconMinus,
  IconAlignLeft
} from '@tabler/icons-react';

export const BLOCK_HTML = {
  text: '<div class="text-block">&nbsp;</div>',
  todo: '<div class="todo-item"><input type="checkbox" class="todo-checkbox" contenteditable="false"><span class="todo-text">&nbsp;</span></div>',
  h1: '<div class="heading-1">&nbsp;</div>',
  h2: '<div class="heading-2">&nbsp;</div>',
  bullet: '<div class="bullet-item"><span class="bullet-dot">•</span><span class="bullet-text">&nbsp;</span></div>',
  numbered: '<div class="numbered-item"><span class="numbered-marker"></span><span class="numbered-text">&nbsp;</span></div>',
  quote: '<div class="quote-block">&nbsp;</div>',
  code: '<div class="code-block">&nbsp;</div>',
  divider: '<hr class="divider"><div class="text-block">&nbsp;</div>'
};

export const SLASH_ITEMS = [
  { id: 'text', label: 'text', keywords: ['text', 'paragraph', 'p'], icon: IconAlignLeft, html: BLOCK_HTML.text },
  { id: 'todo', label: 'to-do', keywords: ['todo', 'checkbox', 'check', 'task'], icon: IconSquareCheck, html: BLOCK_HTML.todo },
  { id: 'h1', label: 'heading 1', keywords: ['h1', 'heading', 'title'], icon: IconH1, html: BLOCK_HTML.h1 },
  { id: 'h2', label: 'heading 2', keywords: ['h2', 'heading', 'subtitle'], icon: IconH2, html: BLOCK_HTML.h2 },
  { id: 'bullet', label: 'bulleted list', keywords: ['bullet', 'list', 'ul'], icon: IconList, html: BLOCK_HTML.bullet },
  { id: 'numbered', label: 'numbered list', keywords: ['number', 'numbered', 'ol', 'list'], icon: IconListNumbers, html: BLOCK_HTML.numbered },
  { id: 'quote', label: 'quote', keywords: ['quote', 'blockquote'], icon: IconQuote, html: BLOCK_HTML.quote },
  { id: 'code', label: 'code', keywords: ['code', 'snippet'], icon: IconCode, html: BLOCK_HTML.code },
  { id: 'divider', label: 'divider', keywords: ['divider', 'line', 'hr'], icon: IconMinus, html: BLOCK_HTML.divider }
];

export const EMPTY_NOTE_HTML = BLOCK_HTML.text;

export const MARKDOWN_MAP = {
  h1: BLOCK_HTML.h1,
  h2: BLOCK_HTML.h2,
  bullet: BLOCK_HTML.bullet,
  numbered: BLOCK_HTML.numbered,
  todo: BLOCK_HTML.todo,
  quote: BLOCK_HTML.quote,
  code: BLOCK_HTML.code
};