import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Linking, Alert } from 'react-native';
import {
  parseRichContent,
  parseStreamContent,
  chunkAST,
  WECHAT_REM_BASE,
  DEFAULT_REM_SCALE,
  DEFAULT_BASE_FONT_SIZE,
  DEFAULT_CONTENT_BASE_FONT_SIZE,
  ASTNode
} from '../../core';
import { OmniRichTextProps, UniversalRichTextProps } from '../types';
import { RnNodeRenderer } from './RnNodeRenderer';

/**
 * Top-level React Native rich-text component.
 *
 * Parses the `content` string into an AST via `omni-rich-text/core`, then
 * progressively streams root-level blocks into the render tree using React
 * state (chunked rendering) to avoid blocking the JS thread on large articles.
 *
 * All link, image, text and media events bubble up through the corresponding
 * `on*` callback props. Video and audio playback require the caller to supply
 * a `customRender` prop that returns a native player component.
 */
export const OmniRichText: React.FC<OmniRichTextProps> = ({
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
  fontSizeResolver,
  imageLinkAction = 'link',
  imageSkeleton = true,
  showImageError = false,
  imageCropMode,
  imageCropRatio,
  streaming = false,
  showCursor = true,
  cursorChar = '▍',
  customRender,
  components,
  tabBarList = [],
  truncate,
  truncateLength,
  clampMaxHeight,
  expandText = '展开全文',
  collapseText = '收起',
  showCollapse = true,
  onExpandChange,
  onLinkTap,
  onImageTap,
  onLongPressText,
  onMediaEvent,
  onNodeEvent
}) => {
  const effectiveRemScale = remScale ?? theme?.remScale ?? DEFAULT_REM_SCALE;
  const effectiveFontScale = fontScale ?? theme?.fontScale ?? 1;
  const effectiveRootFontSize = rootFontSize ?? theme?.rootFontSize ?? WECHAT_REM_BASE;
  const effectiveBaseFontSize = Number(baseFontSize ?? theme?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE);
  const effectiveContentBaseFontSize = Number(contentBaseFontSize ?? theme?.contentBaseFontSize ?? DEFAULT_CONTENT_BASE_FONT_SIZE);

  const customTags = useMemo(() => {
    return components ? Object.keys(components).map((k) => k.toLowerCase()) : undefined;
  }, [components]);

  const effectiveTruncate = useMemo(() => {
    if (truncate) return truncate;
    if (truncateLength !== undefined) return { maxLength: truncateLength };
    return undefined;
  }, [truncate, truncateLength]);

  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
  }, [isExpanded, onExpandChange]);

  // ── 1. Parse & optimize content → AST (with LRU Cache or Stream Parser) ───────
  const { ast, galleryList, themeBgColor } = useMemo(() => {
    if (streaming) {
      return parseStreamContent(content, {
        format,
        mode,
        maxDepth,
        extractStyles: extractStyles ?? (mode === 'wechat'),
        customTags,
        remScale: effectiveRemScale,
        fontScale: effectiveFontScale,
        rootFontSize: effectiveRootFontSize,
        baseFontSize: effectiveBaseFontSize,
        contentBaseFontSize: effectiveContentBaseFontSize,
        fontSize,
        fontSizeResolver,
        truncate: effectiveTruncate,
        showCursor,
        cursorChar
      });
    }

    return parseRichContent(content, {
      format,
      mode,
      maxDepth,
      extractStyles: extractStyles ?? (mode === 'wechat'),
      customTags,
      remScale: effectiveRemScale,
      fontScale: effectiveFontScale,
      rootFontSize: effectiveRootFontSize,
      baseFontSize: effectiveBaseFontSize,
      contentBaseFontSize: effectiveContentBaseFontSize,
      fontSize,
      fontSizeResolver,
      truncate: effectiveTruncate,
      cache
    });
  }, [streaming, showCursor, cursorChar, content, format, mode, maxDepth, extractStyles, customTags, effectiveRemScale, effectiveFontScale, effectiveRootFontSize, effectiveBaseFontSize, effectiveContentBaseFontSize, fontSize, fontSizeResolver, effectiveTruncate, cache]);

  // ── 2. Chunk calculation (bypassed in streaming mode) ───────────────────────
  const effectiveChunked = streaming ? false : chunked;
  const chunkedData = useMemo(() => {
    if (!effectiveChunked) return null;
    return chunkAST(ast, { chunkSize });
  }, [ast, effectiveChunked, chunkSize]);

  const [streamedNodes, setStreamedNodes] = useState<ASTNode[]>([]);

  // ── 3. Progressive chunk streaming effect ─────────────────────────────────
  // Renders the first chunk immediately (synchronously via useMemo), then
  // schedules subsequent chunks with 80 ms gaps so the UI stays responsive.
  useEffect(() => {
    if (!effectiveChunked || !chunkedData || chunkedData.remaining.length === 0) {
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
  }, [effectiveChunked, chunkedData]);

  // Merged display list = initial chunk (fast-path) + progressively added chunks
  const displayNodes = useMemo(() => {
    if (!effectiveChunked || !chunkedData) return ast;
    return [...chunkedData.initial, ...streamedNodes];
  }, [effectiveChunked, chunkedData, ast, streamedNodes]);

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
  const isClamped = Boolean(clampMaxHeight && clampMaxHeight > 0 && !isExpanded);

  return (
    <View style={[{ maxWidth: '100%', backgroundColor: (style as any)?.backgroundColor }, style as any]}>
      <View style={isClamped ? { maxHeight: clampMaxHeight, overflow: 'hidden' } : undefined}>
        {displayNodes.map((node) => (
          <RnNodeRenderer
            key={node.id}
            node={node}
            theme={effectiveTheme}
            imageSkeleton={imageSkeleton}
            showImageError={showImageError}
            imageLinkAction={imageLinkAction}
            imageCropMode={imageCropMode}
            imageCropRatio={imageCropRatio}
            components={components}
            onLinkTap={handleLinkTap}
            onImageTap={handleImageTap}
            onLongPressText={handleLongPressText}
            onMediaEvent={onMediaEvent}
            onNodeEvent={onNodeEvent}
            customRender={customRender}
          />
        ))}
      </View>

      {clampMaxHeight && (isClamped || showCollapse) && (
        <View style={{ alignItems: 'center', marginTop: isClamped ? -12 : 12, zIndex: 10 }}>
          <Pressable
            onPress={handleToggleExpand}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2
            }}
          >
            <Text style={{ fontSize: 13, color: effectiveTheme.linkColor || '#07c160', fontWeight: '500' }}>
              {isClamped ? `${expandText} ▼` : `${collapseText} ▲`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export const UniversalRichText = OmniRichText;
