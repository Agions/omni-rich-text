import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  parseRichContent,
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
import { UniversalRichTextProps } from '../types';
import { NodeRenderer } from './NodeRenderer';
import { H5Lightbox } from './H5Lightbox';

export const UniversalRichText: React.FC<UniversalRichTextProps> = ({
  content,
  format = 'html',
  mode = 'default',
  maxDepth,
  extractStyles,
  chunked = true,
  chunkSize = 15,
  selectable = false,
  webviewPath,
  tabBarList = [],
  className = '',
  style,
  fontSize,
  baseFontSize,
  contentBaseFontSize,
  rootFontSize,
  remScale,
  fontScale,
  components,
  imageSkeleton = true,
  theme,
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

  // Extract custom tag names for sanitizer whitelist
  const customTags = useMemo(() => {
    return components ? Object.keys(components).map((k) => k.toLowerCase()) : undefined;
  }, [components]);

  // 1. Parse and optimize rich content to AST & Gallery
  const { ast, galleryList } = useMemo(() => {
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
      fontSize
    });
  }, [content, format, mode, maxDepth, extractStyles, customTags, effectiveRemScale, effectiveFontScale, effectiveRootFontSize, effectiveBaseFontSize, effectiveContentBaseFontSize, fontSize]);

  // 2. Chunking calculation for progressive setData rendering
  const chunkedData = useMemo(() => {
    if (!chunked) return null;
    return chunkAST(ast, { chunkSize });
  }, [ast, chunked, chunkSize]);

  const [streamedNodes, setStreamedNodes] = useState<ASTNode[]>([]);

  // 3. Progressive chunk streaming
  useEffect(() => {
    if (!chunked || !chunkedData || chunkedData.remaining.length === 0) {
      setStreamedNodes([]);
      return;
    }

    setStreamedNodes([]);
    let chunkIdx = 0;
    let timer: any = null;

    const streamNextBatch = () => {
      if (chunkIdx < chunkedData.remaining.length) {
        const batch = chunkedData.remaining[chunkIdx];
        chunkIdx++;
        setStreamedNodes((prev) => [...prev, ...batch]);
        timer = setTimeout(streamNextBatch, 80);
      }
    };

    timer = setTimeout(streamNextBatch, 60);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [chunked, chunkedData]);

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

  const resolvedFontSize = toRemFontSize(
    fontSize ?? theme?.fontSize,
    effectiveRootFontSize,
    effectiveRemScale,
    effectiveBaseFontSize
  );

  // Container style purely driven by user style prop with basic layout constraints
  const containerStyle: React.CSSProperties = {
    maxWidth: '100%',
    wordBreak: 'break-word',
    fontSize: resolvedFontSize,
    userSelect: selectable ? 'text' : 'none',
    WebkitUserSelect: selectable ? 'text' : 'none',
    ...style
  };

  return (
    <View
      className={`omni-rich-text-container ${mode === 'wechat' ? 'omni-wechat-article' : ''} ${className}`}
      style={containerStyle}
    >
      {displayNodes.map((node) => (
        <NodeRenderer
          key={node.id}
          node={node}
          components={components}
          imageSkeleton={imageSkeleton}
          theme={theme}
          onLinkClick={handleLinkClick}
          onImageClick={handleImageClick}
          onLongPressText={handleLongPressText}
          onMediaEvent={onMediaEvent}
          onNodeEvent={onNodeEvent}
          customRender={customRender}
          selectable={selectable}
        />
      ))}

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
