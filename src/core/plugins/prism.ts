/**
 * Lightweight Code Block Syntax Highlighter
 * Tokenizes common languages (js, ts, json, css, html, python, bash) into colored AST nodes.
 */

import { ASTNode } from '../types/ast';
import { generateNodeId } from '../lexer/html-parser';

export const CODE_THEME = {
  keyword: 'color: #c678dd; font-weight: bold;',
  string: 'color: #98c379;',
  comment: 'color: #5c6370; font-style: italic;',
  number: 'color: #d19a66;',
  function: 'color: #61afef;',
  operator: 'color: #56b6c2;',
  default: 'color: #abb2bf;'
};

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch',
  'case', 'break', 'continue', 'new', 'import', 'export', 'from', 'default', 'class',
  'extends', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof',
  'true', 'false', 'null', 'undefined', 'this', 'super', 'interface', 'type', 'enum'
]);

/**
 * Highlights a raw code string into colored AST child nodes
 */
export function highlightCode(code: string, lang = ''): ASTNode[] {
  const lines = code.split('\n');
  const nodes: ASTNode[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineChildren: ASTNode[] = [];

    // Simple tokenizer for keywords, strings, comments, numbers
    // Token matches: 1: comment, 2: string, 3: word/identifier, 4: number, 5: others
    const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|([a-zA-Z_$][a-zA-Z0-9_$]*)|(\b\d+(?:\.\d+)?\b)|([^\s\w]+|\s+)/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      const [token, comment, str, word, num] = match;

      if (comment) {
        lineChildren.push({
          id: generateNodeId(),
          type: 'element',
          name: 'span',
          attrs: {},
          styleStr: CODE_THEME.comment,
          styleObj: {},
          children: [{ id: generateNodeId(), type: 'text', attrs: {}, styleStr: '', styleObj: {}, text: token }]
        });
      } else if (str) {
        lineChildren.push({
          id: generateNodeId(),
          type: 'element',
          name: 'span',
          attrs: {},
          styleStr: CODE_THEME.string,
          styleObj: {},
          children: [{ id: generateNodeId(), type: 'text', attrs: {}, styleStr: '', styleObj: {}, text: token }]
        });
      } else if (word && KEYWORDS.has(word)) {
        lineChildren.push({
          id: generateNodeId(),
          type: 'element',
          name: 'span',
          attrs: {},
          styleStr: CODE_THEME.keyword,
          styleObj: {},
          children: [{ id: generateNodeId(), type: 'text', attrs: {}, styleStr: '', styleObj: {}, text: token }]
        });
      } else if (num) {
        lineChildren.push({
          id: generateNodeId(),
          type: 'element',
          name: 'span',
          attrs: {},
          styleStr: CODE_THEME.number,
          styleObj: {},
          children: [{ id: generateNodeId(), type: 'text', attrs: {}, styleStr: '', styleObj: {}, text: token }]
        });
      } else {
        lineChildren.push({
          id: generateNodeId(),
          type: 'text',
          attrs: {},
          styleStr: '',
          styleObj: {},
          text: token
        });
      }
    }

    // Line container
    nodes.push({
      id: generateNodeId(),
      type: 'element',
      name: 'div',
      attrs: { class: 'code-line' },
      styleStr: 'min-height: 18px; line-height: 18px;',
      styleObj: {},
      children: lineChildren.length > 0 ? lineChildren : [{ id: generateNodeId(), type: 'text', attrs: {}, styleStr: '', styleObj: {}, text: ' ' }]
    });
  }

  return nodes;
}
