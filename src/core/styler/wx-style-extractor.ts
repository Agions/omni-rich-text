/**
 * WeChat Article Style Extractor & CSS Parser
 * Extracts <style> tags from HTML and parses class, tag, and ID rules into style maps.
 */

import { parseStyleString } from './css-inliner';

export interface ExtractedStyleSheet {
  /** Class selector styles, e.g. .article-title -> { 'font-size': '20px' } */
  classStyles: Map<string, Record<string, string>>;
  /** Tag selector styles, e.g. section -> { 'box-sizing': 'border-box' } */
  tagStyles: Map<string, Record<string, string>>;
  /** ID selector styles, e.g. #js_content -> { 'color': '#333' } */
  idStyles: Map<string, Record<string, string>>;
}

/**
 * Extracts and parses CSS rules inside <style> blocks from HTML.
 * Returns the parsed style maps and the HTML with <style> blocks removed.
 */
export function extractStyleRules(html: string): {
  cleanHtml: string;
  styleSheet: ExtractedStyleSheet;
} {
  const classStyles = new Map<string, Record<string, string>>();
  const tagStyles = new Map<string, Record<string, string>>();
  const idStyles = new Map<string, Record<string, string>>();

  if (!html || typeof html !== 'string') {
    return {
      cleanHtml: '',
      styleSheet: { classStyles, tagStyles, idStyles }
    };
  }

  const styleTagRegex = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
  let cleanHtml = html;

  // Find all <style> blocks
  let match: RegExpExecArray | null;
  while ((match = styleTagRegex.exec(html)) !== null) {
    const fullStyleBlock = match[0];
    const cssContent = fullStyleBlock.replace(/<\/?style[^>]*>/gi, '').trim();
    if (cssContent) {
      parseCssRules(cssContent, classStyles, tagStyles, idStyles);
    }
  }

  // Remove <style> blocks from HTML
  cleanHtml = cleanHtml.replace(styleTagRegex, '');

  return {
    cleanHtml,
    styleSheet: { classStyles, tagStyles, idStyles }
  };
}

/**
 * Parses raw CSS text into class, tag, and ID rule maps
 */
export function parseCssRules(
  cssText: string,
  classStyles: Map<string, Record<string, string>>,
  tagStyles: Map<string, Record<string, string>>,
  idStyles: Map<string, Record<string, string>>
): void {
  // Strip CSS comments /* ... */
  const cleanedCss = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

  // Match selector { decls }
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let ruleMatch: RegExpExecArray | null;

  while ((ruleMatch = ruleRegex.exec(cleanedCss)) !== null) {
    const rawSelectors = ruleMatch[1].trim();
    const rawDecls = ruleMatch[2].trim();
    const styleObj = parseStyleString(rawDecls);

    if (Object.keys(styleObj).length === 0) continue;

    // Split multiple comma-separated selectors: .c1, .c2, div
    const selectors = rawSelectors.split(',').map((s) => s.trim());

    for (const selector of selectors) {
      if (!selector) continue;

      if (selector.startsWith('.')) {
        // Class selector, e.g. .article-title (handle compound classes by taking base class)
        const className = selector.slice(1).split(/[\s:>+~[]/)[0];
        if (className) {
          const existing = classStyles.get(className) || {};
          classStyles.set(className, { ...existing, ...styleObj });
        }
      } else if (selector.startsWith('#')) {
        // ID selector, e.g. #js_content
        const idName = selector.slice(1).split(/[\s:>+~[]/)[0];
        if (idName) {
          const existing = idStyles.get(idName) || {};
          idStyles.set(idName, { ...existing, ...styleObj });
        }
      } else {
        // Tag selector, e.g. p, section, img
        const tagName = selector.toLowerCase().split(/[\s:>+~[]/)[0];
        if (tagName) {
          const existing = tagStyles.get(tagName) || {};
          tagStyles.set(tagName, { ...existing, ...styleObj });
        }
      }
    }
  }
}

/**
 * Merges extracted CSS rules into a node's style based on its tag, class, and id attributes
 */
export function resolveExtractedStyles(
  tagName: string,
  attrs: Record<string, string>,
  styleSheet?: ExtractedStyleSheet
): Record<string, string> {
  if (!styleSheet) return {};

  const merged: Record<string, string> = {};

  // 1. Tag styles
  const lowerTag = tagName.toLowerCase();
  const tagStyle = styleSheet.tagStyles.get(lowerTag);
  if (tagStyle) {
    Object.assign(merged, tagStyle);
  }

  // 2. Class styles (class may contain multiple space-separated class names)
  if (attrs.class) {
    const classNames = attrs.class.trim().split(/\s+/);
    for (const cls of classNames) {
      const clsStyle = styleSheet.classStyles.get(cls);
      if (clsStyle) {
        Object.assign(merged, clsStyle);
      }
    }
  }

  // 3. ID styles
  if (attrs.id) {
    const idStyle = styleSheet.idStyles.get(attrs.id.trim());
    if (idStyle) {
      Object.assign(merged, idStyle);
    }
  }

  return merged;
}
