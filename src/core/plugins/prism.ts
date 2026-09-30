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
 * Highlights an XML or SVG code line into colored AST child nodes
 */
function highlightXmlLine(line: string): ASTNode[] {
  const lineChildren: ASTNode[] = [];
  // Token matches: 1: XML comment, 2: Tag open/close name, 3: Attr name, 4: Attr value string, 5: other
  const xmlTokenRegex = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z0-9:-]+|\/?>)|([a-zA-Z0-9_:-]+(?==))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([^<>"'=]+|[=])/g;
  let match: RegExpExecArray | null;

  while ((match = xmlTokenRegex.exec(line)) !== null) {
    const [token, comment, tag, attrName, str] = match;

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
    } else if (tag) {
      lineChildren.push({
        id: generateNodeId(),
        type: 'element',
        name: 'span',
        attrs: {},
        styleStr: 'color: #e06c75; font-weight: bold;',
        styleObj: {},
        children: [{ id: generateNodeId(), type: 'text', attrs: {}, styleStr: '', styleObj: {}, text: token }]
      });
    } else if (attrName) {
      lineChildren.push({
        id: generateNodeId(),
        type: 'element',
        name: 'span',
        attrs: {},
        styleStr: 'color: #d19a66;',
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

  return lineChildren;
}

/**
 * Highlights a raw code string into colored AST child nodes
 */
export function highlightCode(code: string, lang = ''): ASTNode[] {
  const isXmlOrSvg =
    lang === 'xml' ||
    lang === 'svg' ||
    lang === 'html' ||
    (!lang && code.trim().startsWith('<') && code.includes('>'));

  const lines = code.split('\n');
  const nodes: ASTNode[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let lineChildren: ASTNode[] = [];

    if (isXmlOrSvg) {
      lineChildren = highlightXmlLine(line);
    } else {
      // Simple tokenizer for keywords, strings, comments, numbers
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
