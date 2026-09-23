import { ViewStyle, TextStyle, ImageStyle } from 'react-native';

type RNStyle = ViewStyle & TextStyle & ImageStyle;

/** List of CSS properties that React Native does NOT support */
const UNSUPPORTED = new Set([
  'boxSizing', 'boxShadow', 'cursor', 'transition', 'animation',
  'display', 'float', 'clear', 'visibility', 'content',
  'textIndent', 'wordBreak', 'wordWrap', 'whiteSpace', 'userSelect',
  'borderCollapse', 'borderSpacing', 'tableLayout', 'verticalAlign',
  'listStyle', 'listStyleType', 'listStylePosition',
  'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'backgroundSize',
  'textShadow', 'filter', 'outline', 'resize', 'appearance'
]);

/** Convert a px string or number to a RN number (or percentage string) */
function toPx(val: any): number | string | undefined {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return undefined;
  if (val.endsWith('px')) {
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  }
  if (val.endsWith('%')) return val; // RN supports percentage strings for layout props
  if (val.endsWith('em') || val.endsWith('rem')) {
    // Approximate: 1em ≈ 16px; imprecise but better than dropping the value
    const n = parseFloat(val) * 16;
    return isNaN(n) ? undefined : n;
  }
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

/**
 * Parse CSS shorthand margin/padding into individual sides.
 * '8px 16px' → { top:8, right:16, bottom:8, left:16 }
 */
function parseShorthand(
  val: any
): { top: number; right: number; bottom: number; left: number } | null {
  if (typeof val === 'number') {
    return { top: val, right: val, bottom: val, left: val };
  }
  if (typeof val !== 'string') return null;

  const parts = val.trim().split(/\s+/).map((v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  });

  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  if (parts.length === 4) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  return null;
}

/**
 * Parse CSS border shorthand: '1px solid #e7e7e7' → { width:1, style:'solid', color:'#e7e7e7' }
 */
function parseBorder(val: string): { width?: number; style?: string; color?: string } {
  const parts = val.trim().split(/\s+/);
  const result: { width?: number; style?: string; color?: string } = {};

  for (const p of parts) {
    if (/^\d/.test(p)) {
      result.width = parseFloat(p);
    } else if (['solid', 'dashed', 'dotted', 'none'].includes(p)) {
      result.style = p;
    } else if (p.startsWith('#') || p.startsWith('rgb') || p.startsWith('rgba') || p.startsWith('hsl')) {
      result.color = p;
    }
  }
  return result;
}

/**
 * Converts a CSS style object from the AST node's `styleObj` field into a
 * React Native compatible style object (ViewStyle & TextStyle & ImageStyle).
 *
 * Key transformations:
 * - Drops all unsupported CSS properties (display, boxShadow, transition, etc.)
 * - Expands margin/padding shorthand into individual side values
 * - Expands border shorthand into borderWidth / borderStyle / borderColor
 * - Converts 'NNpx' strings to bare numbers; keeps percentage strings intact
 * - Maps `textDecoration` → `textDecorationLine`
 * - Maps semantic font tags are handled by the renderer, not here
 */
export function cssToRn(styleObj?: Record<string, any>): RNStyle {
  if (!styleObj) return {};
  const rn: Record<string, any> = {};

  for (const [rawKey, rawVal] of Object.entries(styleObj)) {
    if (!rawKey || rawVal === undefined || rawVal === null || rawVal === '') continue;
    if (UNSUPPORTED.has(rawKey)) continue;

    // Convert kebab-case to camelCase (e.g. font-size → fontSize)
    const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

    // Skip vendor-prefixed properties React Native doesn't understand
    if (key.startsWith('webkit') || key.startsWith('moz') || key.startsWith('ms')) continue;

    // ─── Shorthand spacing ───────────────────────────────────────────────────

    if (key === 'margin') {
      const s = parseShorthand(rawVal);
      if (s) {
        rn.marginTop = s.top;
        rn.marginRight = s.right;
        rn.marginBottom = s.bottom;
        rn.marginLeft = s.left;
      }
      continue;
    }

    if (key === 'padding') {
      const s = parseShorthand(rawVal);
      if (s) {
        rn.paddingTop = s.top;
        rn.paddingRight = s.right;
        rn.paddingBottom = s.bottom;
        rn.paddingLeft = s.left;
      }
      continue;
    }

    // Individual margin/padding sides plus RN-specific horizontal/vertical shorthands
    if (
      key === 'marginTop' || key === 'marginRight' || key === 'marginBottom' || key === 'marginLeft' ||
      key === 'paddingTop' || key === 'paddingRight' || key === 'paddingBottom' || key === 'paddingLeft' ||
      key === 'marginHorizontal' || key === 'marginVertical' ||
      key === 'paddingHorizontal' || key === 'paddingVertical'
    ) {
      const v = toPx(rawVal);
      if (v !== undefined) rn[key] = v;
      continue;
    }

    // ─── Border shorthand expansion ─────────────────────────────────────────

    if (key === 'border') {
      const b = parseBorder(String(rawVal));
      if (b.width !== undefined) rn.borderWidth = b.width;
      if (b.style) rn.borderStyle = b.style as any;
      if (b.color) rn.borderColor = b.color;
      continue;
    }

    if (key === 'borderLeft') {
      const b = parseBorder(String(rawVal));
      if (b.width !== undefined) rn.borderLeftWidth = b.width;
      if (b.style) rn.borderStyle = b.style as any;
      if (b.color) rn.borderLeftColor = b.color;
      continue;
    }

    if (key === 'borderTop') {
      const b = parseBorder(String(rawVal));
      if (b.width !== undefined) rn.borderTopWidth = b.width;
      if (b.style) rn.borderStyle = b.style as any;
      if (b.color) rn.borderTopColor = b.color;
      continue;
    }

    if (key === 'borderBottom') {
      const b = parseBorder(String(rawVal));
      if (b.width !== undefined) rn.borderBottomWidth = b.width;
      if (b.style) rn.borderStyle = b.style as any;
      if (b.color) rn.borderBottomColor = b.color;
      continue;
    }

    if (key === 'borderRight') {
      const b = parseBorder(String(rawVal));
      if (b.width !== undefined) rn.borderRightWidth = b.width;
      if (b.style) rn.borderStyle = b.style as any;
      if (b.color) rn.borderRightColor = b.color;
      continue;
    }

    // Direct border sub-properties
    if (
      key === 'borderWidth' || key === 'borderTopWidth' || key === 'borderBottomWidth' ||
      key === 'borderLeftWidth' || key === 'borderRightWidth'
    ) {
      const v = toPx(rawVal);
      if (v !== undefined) rn[key] = v;
      continue;
    }

    if (key === 'borderStyle') {
      if (rawVal === 'solid' || rawVal === 'dashed' || rawVal === 'dotted') rn.borderStyle = rawVal;
      continue;
    }

    if (key === 'borderRadius') {
      const v = toPx(rawVal);
      if (v !== undefined) rn.borderRadius = v;
      continue;
    }

    if (
      key === 'borderTopLeftRadius' || key === 'borderTopRightRadius' ||
      key === 'borderBottomLeftRadius' || key === 'borderBottomRightRadius'
    ) {
      const v = toPx(rawVal);
      if (v !== undefined) rn[key] = v;
      continue;
    }

    // ─── Border colors ───────────────────────────────────────────────────────

    if (
      key === 'borderColor' || key === 'borderTopColor' || key === 'borderBottomColor' ||
      key === 'borderLeftColor' || key === 'borderRightColor'
    ) {
      rn[key] = rawVal;
      continue;
    }

    // ─── Dimensions ─────────────────────────────────────────────────────────

    if (
      key === 'width' || key === 'height' ||
      key === 'minWidth' || key === 'maxWidth' ||
      key === 'minHeight' || key === 'maxHeight' ||
      key === 'top' || key === 'right' || key === 'bottom' || key === 'left' ||
      key === 'flexBasis'
    ) {
      const v = toPx(rawVal);
      if (v !== undefined) rn[key] = v;
      continue;
    }

    // ─── Font & Text ─────────────────────────────────────────────────────────

    if (key === 'fontSize') {
      const v = toPx(rawVal);
      if (v !== undefined) rn.fontSize = v as number;
      continue;
    }

    if (key === 'fontWeight') {
      rn.fontWeight = String(rawVal) as any;
      continue;
    }

    if (key === 'fontStyle') {
      if (rawVal === 'italic' || rawVal === 'normal') rn.fontStyle = rawVal;
      continue;
    }

    if (key === 'fontFamily') {
      rn.fontFamily = rawVal;
      continue;
    }

    if (key === 'lineHeight') {
      // RN lineHeight is an absolute pixel value, not a CSS multiplier.
      // If the value is a plain number (e.g. CSS `line-height: 1.6`), we convert it
      // using a reasonable base font size so the rendering is legible.
      const str = String(rawVal);
      if (str.endsWith('px')) {
        const n = parseFloat(str);
        if (!isNaN(n)) rn.lineHeight = n;
      } else {
        const n = parseFloat(str);
        if (!isNaN(n)) {
          // Values < 4 are treated as multipliers; >= 4 as pixel values
          rn.lineHeight = n < 4 ? Math.round(n * 16) : n;
        }
      }
      continue;
    }

    if (key === 'letterSpacing') {
      const v = toPx(rawVal);
      if (v !== undefined) rn.letterSpacing = v as number;
      continue;
    }

    if (key === 'textAlign') {
      if (
        rawVal === 'auto' || rawVal === 'left' || rawVal === 'right' ||
        rawVal === 'center' || rawVal === 'justify'
      ) {
        rn.textAlign = rawVal;
      }
      continue;
    }

    if (key === 'textDecorationLine') {
      rn.textDecorationLine = rawVal;
      continue;
    }

    // CSS `text-decoration` shorthand → RN `textDecorationLine`
    if (key === 'textDecoration') {
      const s = String(rawVal);
      if (s.includes('underline') && s.includes('line-through')) {
        rn.textDecorationLine = 'underline line-through';
      } else if (s.includes('underline')) {
        rn.textDecorationLine = 'underline';
      } else if (s.includes('line-through')) {
        rn.textDecorationLine = 'line-through';
      } else {
        rn.textDecorationLine = 'none';
      }
      continue;
    }

    // ─── Colors ──────────────────────────────────────────────────────────────

    if (key === 'color' || key === 'backgroundColor') {
      rn[key] = rawVal;
      continue;
    }

    // ─── Flex layout ─────────────────────────────────────────────────────────

    if (key === 'flex') {
      const n = parseFloat(String(rawVal));
      if (!isNaN(n)) rn.flex = n;
      continue;
    }

    if (key === 'flexDirection') {
      if (['row', 'column', 'row-reverse', 'column-reverse'].includes(rawVal)) {
        rn.flexDirection = rawVal as any;
      }
      continue;
    }

    if (key === 'flexWrap') {
      if (rawVal === 'wrap' || rawVal === 'nowrap' || rawVal === 'wrap-reverse') {
        rn.flexWrap = rawVal as any;
      }
      continue;
    }

    if (key === 'flexShrink') {
      const n = parseFloat(String(rawVal));
      if (!isNaN(n)) rn.flexShrink = n;
      continue;
    }

    if (key === 'flexGrow') {
      const n = parseFloat(String(rawVal));
      if (!isNaN(n)) rn.flexGrow = n;
      continue;
    }

    if (key === 'alignItems') {
      rn.alignItems = rawVal;
      continue;
    }

    if (key === 'alignSelf') {
      rn.alignSelf = rawVal;
      continue;
    }

    if (key === 'alignContent') {
      rn.alignContent = rawVal;
      continue;
    }

    if (key === 'justifyContent') {
      rn.justifyContent = rawVal;
      continue;
    }

    // ─── Misc ────────────────────────────────────────────────────────────────

    if (key === 'opacity') {
      const n = parseFloat(String(rawVal));
      if (!isNaN(n)) rn.opacity = n;
      continue;
    }

    if (key === 'overflow') {
      if (rawVal === 'hidden' || rawVal === 'scroll' || rawVal === 'visible') {
        rn.overflow = rawVal;
      }
      continue;
    }

    if (key === 'position') {
      if (rawVal === 'absolute' || rawVal === 'relative') rn.position = rawVal;
      continue;
    }

    if (key === 'zIndex') {
      const n = parseInt(String(rawVal), 10);
      if (!isNaN(n)) rn.zIndex = n;
      continue;
    }

    if (key === 'aspectRatio') {
      const n = parseFloat(String(rawVal));
      if (!isNaN(n)) rn.aspectRatio = n;
      continue;
    }

    if (key === 'resizeMode') {
      rn.resizeMode = rawVal;
      continue;
    }

    // All remaining properties are silently dropped; this prevents RN from
    // throwing on unknown style keys while keeping the converter future-proof.
  }

  return rn as RNStyle;
}
