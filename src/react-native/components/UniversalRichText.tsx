import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Linking, Alert } from 'react-native';
import {
  parseRichContent,
  chunkAST,
  WECHAT_REM_BASE,
  DEFAULT_REM_SCALE,
  DEFAULT_BASE_FONT_SIZE,
  DEFAULT_CONTENT_BASE_FONT_SIZE,
  ASTNode
} from '../../core';
import { UniversalRichTextProps } from '../types';
import { RnNodeRenderer } from './RnNodeRenderer';

/**
 * Top-level React Native rich-text component.
 *
 * Parses the `content` string into an AST via `@universal-rt/core`, then
 * progressively streams root-level blocks into the render tree using React
 * state (chunked rendering) to avoid blocking the JS thread on large articles.
 *
 * All link, image, text and media events bubble up through the corresponding
 * `on*` callback props. Video and audio playback require the caller to supply
 * a `customRender` prop that returns a native player component.
 */
export const UniversalRichText: React.FC<UniversalRichTextProps> = ({
  content,
  format = 'html',
  mode = 'default',
  maxDepth,
  extractStyles,
  chunked = true,
  chunkSize = 15,
  cache = true,
  theme,
  style,
  fontSize,
  baseFontSize,
  contentBaseFontSize,
  rootFontSize,
  remScale,
  fontScale,
  imageSkeleton = true,
  customRender,
  tabBarList = [],
  onLinkTap,
  onImageTap,
  onLongPressText,
  onMediaEvent
}) => {
  const effectiveRemScale = remScale ?? theme?.remScale ?? DEFAULT_REM_SCALE;
  const effectiveFontScale = fontScale ?? theme?.fontScale ?? 1;
  const effectiveRootFontSize = rootFontSize ?? theme?.rootFontSize ?? WECHAT_REM_BASE;
  const effectiveBaseFontSize = Number(baseFontSize ?? theme?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE);
  const effectiveContentBaseFontSize = Number(contentBaseFontSize ?? theme?.contentBaseFontSize ?? DEFAULT_CONTENT_BASE_FONT_SIZE);

  // ── 1. Parse & optimize content → AST ─────────────────────────────────────
  const { ast, galleryList } = useMemo(() => {
    return parseRichContent(content, {
      format,
      mode,
      maxDepth,
      extractStyles: extractStyles ?? (mode === 'wechat'),
      remScale: effectiveRemScale,
      fontScale: effectiveFontScale,
      rootFontSize: effectiveRootFontSize,
      baseFontSize: effectiveBaseFontSize,
      contentBaseFontSize: effectiveContentBaseFontSize,
      fontSize,
      cache
    });
  }, [content, format, mode, maxDepth, extractStyles, effectiveRemScale, effectiveFontScale, effectiveRootFontSize, effectiveBaseFontSize, effectiveContentBaseFontSize, fontSize, cache]);

  // ── 2. Chunk calculation ───────────────────────────────────────────────────
  const chunkedData = useMemo(() => {
    if (!chunked) return null;
    return chunkAST(ast, { chunkSize });
  }, [ast, chunked, chunkSize]);

  const [streamedNodes, setStreamedNodes] = useState<ASTNode[]>([]);

  // ── 3. Progressive chunk streaming effect ─────────────────────────────────
  // Renders the first chunk immediately (synchronously via useMemo), then
  // schedules subsequent chunks with 80 ms gaps so the UI stays responsive.
  useEffect(() => {
    if (!chunked || !chunkedData || chunkedData.remaining.length === 0) {
      setStreamedNodes([]);
      return;
    }

    setStreamedNodes([]);
    let idx = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const streamNext = () => {
      if (idx < chunkedData.remaining.length) {
        const batch = chunkedData.remaining[idx++];
        setStreamedNodes((prev) => [...prev, ...batch]);
        timer = setTimeout(streamNext, 80);
      }
    };

    // Small initial delay so the first paint can complete before we enqueue work
    timer = setTimeout(streamNext, 60);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [chunked, chunkedData]);

  // Merged display list = initial chunk (fast-path) + progressively added chunks
  const displayNodes = useMemo(() => {
    if (!chunked || !chunkedData) return ast;
    return [...chunkedData.initial, ...streamedNodes];
  }, [chunked, chunkedData, ast, streamedNodes]);

  // ── 4. Event handlers ─────────────────────────────────────────────────────

  const handleLinkTap = useCallback(
    (href: string, node: ASTNode) => {
      if (onLinkTap) {
        const result = onLinkTap({ href, node });
        // Returning false (or a Promise that resolves to false) prevents default navigation
        if (result === false) return;
        if (result instanceof Promise) {
          result.then((r) => {
            if (r !== false && href.startsWith('http')) {
              Linking.openURL(href).catch(() => Alert.alert('无法打开链接', href));
            }
          });
          return;
        }
      }
      if (!href) return;
      if (href.startsWith('http')) {
        Linking.openURL(href).catch(() => Alert.alert('无法打开链接', href));
      }
      // Non-http hrefs (tel:, mailto:, etc.) are also handled by Linking
      if (href.startsWith('tel:') || href.startsWith('mailto:')) {
        Linking.openURL(href).catch(() => {});
      }
    },
    [onLinkTap]
  );

  const handleImageTap = useCallback(
    (src: string, node: ASTNode) => {
      const index = node.extra?.galleryIndex ?? 0;
      onImageTap?.({ src, index });
      // Image preview (lightbox) is intentionally delegated to the caller via
      // onImageTap, since RN has no built-in image viewer. Libraries such as
      // react-native-image-viewing can be used in the callback.
    },
    [onImageTap]
  );

  const handleLongPressText = useCallback(
    (text: string, node: ASTNode) => {
      if (onLongPressText) {
        onLongPressText(text, node);
      }
      // Default: no-op. Clipboard access in newer RN requires a separate
      // @react-native-clipboard/clipboard package; callers can handle this
      // in the onLongPressText callback.
    },
    [onLongPressText]
  );

  const effectiveTheme = useMemo(() => {
    const resolvedFontSize = fontSize !== undefined
      ? fontSize
      : (theme?.fontSize !== undefined ? theme.fontSize : 14);
    return {
      ...theme,
      fontSize: resolvedFontSize,
      fontScale: effectiveFontScale
    };
  }, [theme, fontSize, effectiveFontScale]);

  // ── 5. Render ──────────────────────────────────────────────────────────────
  return (
    <View style={[{ maxWidth: '100%' }, style as any]}>
      {displayNodes.map((node) => (
        <RnNodeRenderer
          key={node.id}
          node={node}
          theme={effectiveTheme}
          imageSkeleton={imageSkeleton}
          onLinkTap={handleLinkTap}
          onImageTap={handleImageTap}
          onLongPressText={handleLongPressText}
          onMediaEvent={onMediaEvent}
          customRender={customRender}
        />
      ))}
    </View>
  );
};
