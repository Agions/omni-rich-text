import * as React from 'react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  parseRichContent,
  parseStreamContent,
  chunkAST,
  SmartLinkDispatcher,
  createPlatformBridge,
  toRemFontSize,
  WECHAT_REM_BASE,
  DEFAULT_REM_SCALE,
  DEFAULT_BASE_FONT_SIZE,
  DEFAULT_CONTENT_BASE_FONT_SIZE,
  ASTNode
} from '../../core';
import { OmniRichTextProps, UniversalRichTextProps } from '../types';
import { NodeRenderer } from './NodeRenderer';
import { H5Lightbox } from './H5Lightbox';

export const OmniRichText: React.FC<OmniRichTextProps> = ({
  content,
  format = 'html',
  mode = 'default',
  maxDepth,
  extractStyles,
  chunked = true,
  chunkSize = 15,
  appendMode = 'stream',
  cache = true,
  selectable = false,
  webviewPath,
  tabBarList = [],
  className = '',
  style,
  fontSize,
  fontSizeResolver,
  baseFontSize,
  contentBaseFontSize,
  rootFontSize,
  remScale,
  fontScale,
  components,
  imageSkeleton = true,
  showImageError = false,
  imageLinkAction = 'link',
  theme,
  truncate,
  truncateLength,
  clampMaxHeight,
  expandText = '展开全文',
  collapseText = '收起',
  showCollapse = true,
  onExpandChange,
  imageCropMode,
  imageCropRatio,
  streaming = false,
  showCursor = true,
  cursorChar = '▍',
  onLinkTap,
  onImageTap,
  onLongPressText,
  onMediaEvent,
  onNodeEvent,
  customRender
}) => {
  const effectiveRemScale = remScale ?? theme?.remScale ?? DEFAULT_REM_SCALE;
  const effectiveFontScale = fontScale ?? theme?.fontScale ?? 1;
  const effectiveRootFontSize = rootFontSize ?? theme?.rootFontSize ?? WECHAT_REM_BASE;
  const effectiveBaseFontSize = Number(baseFontSize ?? theme?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE);
  const effectiveContentBaseFontSize = Number(contentBaseFontSize ?? theme?.contentBaseFontSize ?? DEFAULT_CONTENT_BASE_FONT_SIZE);

  const effectiveTruncate = useMemo(() => {
    if (truncate) return truncate;
    if (truncateLength !== undefined) return { maxLength: truncateLength };
    return undefined;
  }, [truncate, truncateLength]);

  // Extract custom tag names for sanitizer whitelist
  const customTags = useMemo(() => {
    return components ? Object.keys(components).map((k) => k.toLowerCase()) : undefined;
  }, [components]);

  // 1. Parse and optimize rich content to AST & Gallery (with LRU Cache or Stream Parser)
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

  // 2. Chunking calculation for progressive setData rendering (bypassed in streaming mode)
  const effectiveChunked = streaming ? false : chunked;
  const chunkedData = useMemo(() => {
    if (!effectiveChunked) return null;
    return chunkAST(ast, { chunkSize });
  }, [ast, effectiveChunked, chunkSize]);

  const [streamedNodes, setStreamedNodes] = useState<ASTNode[]>([]);
  const [loadedChunkCount, setLoadedChunkCount] = useState(0);
  const sentinelId = useMemo(() => `omni_sentinel_${Math.random().toString(36).substring(2, 8)}`, []);

  // 3. Progressive chunk streaming / Scroll-driven append
  useEffect(() => {
    if (!chunked || !chunkedData || chunkedData.remaining.length === 0) {
      setStreamedNodes([]);
      setLoadedChunkCount(0);
      return;
    }

    setStreamedNodes([]);
    setLoadedChunkCount(0);
    const totalRemaining = chunkedData.remaining.length;

    if (appendMode === 'scroll') {
      let observer: any = null;
      let currentIdx = 0;

      const setupObserver = () => {
        try {
          if (typeof (Taro as any).createIntersectionObserver === 'function') {
            observer = (Taro as any).createIntersectionObserver(undefined, { thresholds: [0] });
            observer.relativeToViewport({ bottom: 350 }).observe(`#${sentinelId}`, (res: any) => {
              if (res.intersectionRatio > 0 && currentIdx < totalRemaining) {
                const nextBatch = chunkedData.remaining[currentIdx];
                currentIdx++;
                setStreamedNodes((prev) => [...prev, ...nextBatch]);
                setLoadedChunkCount(currentIdx);
                if (currentIdx >= totalRemaining && observer) {
                  observer.disconnect();
                }
              }
            });
          }
        } catch {
          // Fallback if observer is unsupported
        }
      };

      const timer = setTimeout(setupObserver, 150);

      return () => {
        clearTimeout(timer);
        if (observer && observer.disconnect) observer.disconnect();
      };
    } else {
      // Stream mode: schedule batch renders using requestIdleCallback / setTimeout
      let chunkIdx = 0;
      let timer: any = null;

      const schedule = (cb: () => void) => {
        if (typeof (globalThis as any).requestIdleCallback === 'function') {
          return (globalThis as any).requestIdleCallback(cb, { timeout: 100 });
        }
        return setTimeout(cb, 60);
      };

      const cancelSchedule = (id: any) => {
        if (typeof (globalThis as any).cancelIdleCallback === 'function') {
          (globalThis as any).cancelIdleCallback(id);
        } else {
          clearTimeout(id);
        }
      };

      const streamNextBatch = () => {
        if (chunkIdx < totalRemaining) {
          const batch = chunkedData.remaining[chunkIdx];
          chunkIdx++;
          setStreamedNodes((prev) => [...prev, ...batch]);
          setLoadedChunkCount(chunkIdx);
          if (chunkIdx < totalRemaining) {
            timer = schedule(streamNextBatch);
          }
        }
      };

      timer = setTimeout(streamNextBatch, 50);

      return () => {
        cancelSchedule(timer);
      };
    }
  }, [chunked, chunkedData, appendMode, sentinelId]);

  // Display nodes list
  const displayNodes = useMemo(() => {
    if (!chunked || !chunkedData) return ast;
    return [...chunkedData.initial, ...streamedNodes];
  }, [chunked, chunkedData, ast, streamedNodes]);

  // 4. Initialize cross-platform bridge & smart router dispatcher
  const bridge = useMemo(() => createPlatformBridge('taro', Taro), []);
  const linkDispatcher = useMemo(() => {
    return new SmartLinkDispatcher(bridge, {
      webviewPath,
      tabBarList,
      onLinkTap
    });
  }, [bridge, webviewPath, tabBarList, onLinkTap]);

  // 5. State for H5 image preview lightbox
  const [h5LightboxVisible, setH5LightboxVisible] = useState(false);
  const [h5LightboxIndex, setH5LightboxIndex] = useState(0);

  // 6. Handle Link Click
  const handleLinkClick = useCallback(
    (href: string, node: ASTNode) => {
      linkDispatcher.dispatch({ href, node });
    },
    [linkDispatcher]
  );

  // 7. Handle Image Click
  const handleImageClick = useCallback(
    (src: string, node: ASTNode) => {
      const index = node.extra?.galleryIndex ?? 0;
      onImageTap?.({ src, index });

      // Detect H5 vs Mini-program
      const env = Taro.getEnv ? Taro.getEnv() : '';
      const isH5 = env === Taro.ENV_TYPE?.WEB;
      if (isH5) {
        setH5LightboxIndex(index);
        setH5LightboxVisible(true);
      } else {
        const previewUrls = galleryList && galleryList.length > 0 ? galleryList : (src ? [src] : []);
        if (previewUrls.length > 0) {
          bridge.previewImage({ current: src, urls: previewUrls, index });
        }
      }
    },
    [bridge, galleryList, onImageTap]
  );

  // 8. Handle Long Press on Text (no automatic clipboard copy)
  const handleLongPressText = useCallback(
    (text: string, node: ASTNode) => {
      onLongPressText?.(text, node);
    },
    [onLongPressText]
  );

  const numericClampMaxHeight = useMemo(() => {
    if (clampMaxHeight === undefined || clampMaxHeight === null || clampMaxHeight === '') return null;
    const num = typeof clampMaxHeight === 'number' ? clampMaxHeight : parseFloat(String(clampMaxHeight));
    return isNaN(num) || num <= 0 ? null : num;
  }, [clampMaxHeight]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [canClamp, setCanClamp] = useState(false);
  const contentInnerId = useMemo(() => `omni_inner_${Math.random().toString(36).substring(2, 8)}`, []);

  // Measure content height when clampMaxHeight is enabled
  useEffect(() => {
    if (!numericClampMaxHeight) {
      setCanClamp(false);
      return;
    }

    const checkHeight = () => {
      try {
        const query = Taro.createSelectorQuery();
        query.select(`#${contentInnerId}`).boundingClientRect((res: any) => {
          const rect = Array.isArray(res) ? res[0] : res;
          if (rect && rect.height) {
            setCanClamp(rect.height > numericClampMaxHeight);
          }
        }).exec();
      } catch (e) {
        setCanClamp(true);
      }
    };

    const timer = setTimeout(checkHeight, 120);
    return () => clearTimeout(timer);
  }, [content, numericClampMaxHeight, contentInnerId, displayNodes]);

  const handleToggleExpand = useCallback(() => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    onExpandChange?.(nextState);
  }, [isExpanded, onExpandChange]);

  const resolvedFontSize = toRemFontSize(
    fontSize ?? theme?.fontSize,
    effectiveRootFontSize,
    effectiveRemScale,
    effectiveBaseFontSize
  );

  const isClamped = Boolean(numericClampMaxHeight && canClamp && !isExpanded);
  const effectiveBgColor = (style as any)?.backgroundColor || themeBgColor || '#ffffff';
  const fadeGradient = `linear-gradient(to bottom, rgba(255,255,255,0) 0%, ${effectiveBgColor} 85%)`;

  const clampedWrapperStyle: React.CSSProperties = isClamped
    ? {
        maxHeight: `${numericClampMaxHeight}px`,
        overflow: 'hidden',
        position: 'relative'
      }
    : {
        position: 'relative'
      };

  // Container style purely driven by user style prop with basic layout constraints
  const containerStyle: React.CSSProperties = {
    maxWidth: '100%',
    wordBreak: 'break-word',
    fontSize: resolvedFontSize,
    userSelect: selectable ? 'text' : 'none',
    WebkitUserSelect: selectable ? 'text' : 'none',
    backgroundColor: (style as any)?.backgroundColor,
    position: 'relative',
    ...style
  };

  return (
    <View
      className={`omni-rich-text-container ${mode === 'wechat' ? 'omni-wechat-article' : ''} ${className}`}
      style={containerStyle}
    >
      <View id={contentInnerId} className="omni-content-inner" style={clampedWrapperStyle}>
        {displayNodes.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            components={components}
            imageSkeleton={imageSkeleton}
            showImageError={showImageError}
            imageLinkAction={imageLinkAction}
            theme={theme}
            imageCropMode={imageCropMode}
            imageCropRatio={imageCropRatio}
            onLinkClick={handleLinkClick}
            onImageClick={handleImageClick}
            onLongPressText={handleLongPressText}
            onMediaEvent={onMediaEvent}
            onNodeEvent={onNodeEvent}
            customRender={customRender}
            selectable={selectable}
          />
        ))}

        {/* Gradient Mask when clamped */}
        {isClamped && (
          <View
            className="omni-clamp-mask"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '90px',
              background: fadeGradient,
              pointerEvents: 'none'
            }}
          />
        )}
      </View>

      {/* Expand / Collapse Action Button */}
      {numericClampMaxHeight && canClamp && (isClamped || showCollapse) && (
        <View
          className="omni-clamp-action-wrap"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: isClamped ? '-16px' : '12px',
            position: 'relative',
            zIndex: 5
          }}
        >
          <View
            className="omni-clamp-btn"
            onClick={handleToggleExpand}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 18px',
              fontSize: '13px',
              color: theme?.linkColor || '#07c160',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <Text>{isClamped ? expandText : collapseText}</Text>
            <Text style={{ marginLeft: '4px', fontSize: '11px' }}>{isClamped ? '▼' : '▲'}</Text>
          </View>
        </View>
      )}

      {/* Scroll-driven append sentinel */}
      {appendMode === 'scroll' && chunkedData && loadedChunkCount < chunkedData.remaining.length && (
        <View
          id={sentinelId}
          className="omni-scroll-sentinel"
          style={{ width: '100%', height: '1px', opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* H5 Preview Lightbox */}
      <H5Lightbox
        visible={h5LightboxVisible}
        images={galleryList}
        initialIndex={h5LightboxIndex}
        onClose={() => setH5LightboxVisible(false)}
      />
    </View>
  );
};

export const UniversalRichText = OmniRichText;
