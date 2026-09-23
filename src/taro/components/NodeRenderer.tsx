import React from 'react';
import { View, Text, Image, Video, Audio, Button, ScrollView } from '@tarojs/components';
import { ASTNode, MediaEventPayload, ThemeConfig, serializeSvgToXml, INLINE_TAGS, isAllInline } from '../../core';

export interface NodeRendererProps {
  node: ASTNode;
  onLinkClick: (href: string, node: ASTNode) => void;
  onImageClick: (src: string, node: ASTNode) => void;
  onLongPressText?: (text: string, node: ASTNode) => void;
  onMediaEvent?: (payload: MediaEventPayload) => void;
  onNodeEvent?: (eventType: string, node: ASTNode, rawEvent: any) => void;
  customRender?: (node: ASTNode) => React.ReactNode | null;
  /** Custom components map: tag name -> React component */
  components?: Record<
    string,
    React.ComponentType<{
      node: ASTNode;
      attrs: Record<string, string>;
      children?: React.ReactNode;
      [key: string]: any;
    }>
  >;
  /** Enable skeleton placeholder and smooth fade-in for images. Default is true */
  imageSkeleton?: boolean;
  /** Semantic color theme overrides */
  theme?: ThemeConfig;
  /** Index in list if inside ul/ol */
  indexInList?: number;
  /** Parent tag name for context */
  parentTag?: string;
  selectable?: boolean;
}

/**
 * Converts kebab-case style dictionary into React / Taro camelCase style object.
 * Essential for Mini Programs: Taro's custom reconciler ignores kebab-case keys!
 */
export function toTaroStyle(styleObj?: Record<string, any>): React.CSSProperties {
  if (!styleObj) return {};
  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(styleObj)) {
    if (!key || val === undefined || val === null || val === '') continue;

    // CSS variables e.g. --my-color
    if (key.startsWith('--')) {
      result[key] = val;
      continue;
    }

    // Strip !important suffix so React inline style parser does not choke or drop the value
    const cleanVal = typeof val === 'string' ? val.replace(/\s*!important/gi, '').trim() : val;

    // Handle vendor prefix -webkit-
    const cleanKey = key.startsWith('-webkit-')
      ? `Webkit${key.slice(8).charAt(0).toUpperCase()}${key.slice(9)}`
      : key;

    // Convert kebab-case to camelCase: font-size -> fontSize
    const camelKey = cleanKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = cleanVal;
  }

  return result as React.CSSProperties;
}

/**
 * Image component with skeleton placeholder and smooth fade-in
 */
const OmniImage: React.FC<{
  node: ASTNode;
  src: string;
  imageSkeleton?: boolean;
  imageSkeletonColor?: string;
  onImageClick: (src: string, node: ASTNode) => void;
  onNodeEvent?: (eventType: string, node: ASTNode, rawEvent: any) => void;
}> = ({ node, src, imageSkeleton = true, imageSkeletonColor = '#f1f5f9', onImageClick, onNodeEvent }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const dataRatio = node.extra?.dataRatio;
  const placeholderHeight = node.extra?.placeholderHeight;

  return (
    <View
      className="omni-image-wrap"
      style={toTaroStyle({
        position: 'relative',
        width: node.styleObj?.width || '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: node.styleObj?.borderRadius,
        margin: node.styleObj?.margin,
        backgroundColor: imageSkeleton && !loaded && !hasError ? imageSkeletonColor : 'transparent',
        ...(dataRatio && !loaded
          ? { paddingBottom: placeholderHeight || `${(dataRatio * 100).toFixed(2)}%`, height: 0 }
          : {})
      })}
    >
      <Image
        className="omni-image"
        src={src}
        mode={(node.attrs.mode as any) || 'widthFix'}
        lazyLoad={node.attrs['lazy-load'] !== 'false'}
        style={toTaroStyle({
          width: '100%',
          display: 'block',
          boxSizing: 'border-box',
          opacity: loaded || !imageSkeleton ? 1 : 0,
          transition: 'opacity 0.25s ease-in-out',
          ...node.styleObj,
          maxWidth: '100%'
        })}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setHasError(true);
          setLoaded(true);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onImageClick(src, node);
          onNodeEvent?.('click', node, e);
        }}
      />
    </View>
  );
};

export const NodeRenderer: React.FC<NodeRendererProps> = React.memo(({
  node,
  onLinkClick,
  onImageClick,
  onLongPressText,
  onMediaEvent,
  onNodeEvent,
  customRender,
  components,
  imageSkeleton = true,
  theme,
  indexInList,
  parentTag,
  selectable = false
}) => {
  // Helper to render child nodes with forwarded context
  const renderChild = (child: ASTNode, idx?: number, pTag = node.name) => (
    <NodeRenderer
      key={child.id}
      node={child}
      indexInList={idx}
      parentTag={pTag}
      components={components}
      imageSkeleton={imageSkeleton}
      theme={theme}
      onLinkClick={onLinkClick}
      onImageClick={onImageClick}
      onLongPressText={onLongPressText}
      onMediaEvent={onMediaEvent}
      onNodeEvent={onNodeEvent}
      customRender={customRender}
      selectable={selectable}
    />
  );

  // 0. Skip WeChat ignored tags (mpvoice, mp-miniprogram, mp-vote, etc.)
  if (node.extra?.wxIgnored) {
    return null;
  }

  // 1. Custom Render Hook
  if (customRender) {
    const customResult = customRender(node);
    if (customResult !== null && customResult !== undefined) {
      return <>{customResult}</>;
    }
  }

  // 1.1 Declarative Custom Component Mapping
  if (components && node.name && components[node.name]) {
    const CustomComp = components[node.name];
    return (
      <CustomComp
        node={node}
        attrs={node.attrs || {}}
        onNodeEvent={onNodeEvent}
        onLinkClick={onLinkClick}
        onImageClick={onImageClick}
      >
        {node.children?.map((child, idx) => renderChild(child, idx, node.name))}
      </CustomComp>
    );
  }

  // 2. Leaf Text Node
  if (node.type === 'text') {
    return (
      <Text
        className="omni-text"
        style={toTaroStyle({
          wordBreak: 'break-word',
          ...node.styleObj
        })}
        selectable={selectable}
        userSelect={selectable}
        onLongPress={(e) => {
          if (node.text && onLongPressText) {
            onLongPressText(node.text, node);
          }
          onNodeEvent?.('longpress', node, e);
        }}
      >
        {node.text}
      </Text>
    );
  }

  // 3. SVG Element <svg> -> Encoded as SVG Data URI for cross-platform image rendering
  if (node.name === 'svg') {
    const svgXml = serializeSvgToXml(node);
    const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgXml)}`;

    // Read width and height from style or attrs
    let attrWidth = node.attrs.width
      ? isNaN(Number(node.attrs.width))
        ? node.attrs.width
        : `${node.attrs.width}px`
      : undefined;

    let attrHeight = node.attrs.height
      ? isNaN(Number(node.attrs.height))
        ? node.attrs.height
        : `${node.attrs.height}px`
      : undefined;

    // Smart viewBox fallback if neither width nor height is provided
    if (!attrWidth && !attrHeight && node.attrs.viewbox) {
      const parts = node.attrs.viewbox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
        const vbW = parts[2];
        const vbH = parts[3];
        if (vbW <= 64 && vbH <= 64) {
          attrWidth = `${vbW}px`;
          attrHeight = `${vbH}px`;
        }
      }
    }

    const width = node.styleObj?.width || attrWidth;
    const height = node.styleObj?.height || attrHeight;

    return (
      <Image
        className="omni-svg"
        src={svgDataUri}
        mode={width && height ? 'scaleToFill' : 'widthFix'}
        style={toTaroStyle({
          display: 'inline-block',
          verticalAlign: 'middle',
          flexShrink: 0,
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          maxWidth: '100%',
          ...node.styleObj
        })}
        onClick={(e) => onNodeEvent?.('click', node, e)}
      />
    );
  }

  // 4. Inline formatting tags (span, strong, em, etc.) when purely inline
  if (INLINE_TAGS.has(node.name || '') && isAllInline(node)) {
    return (
      <Text
        className={`omni-inline omni-${node.name}`}
        style={toTaroStyle({
          wordBreak: 'break-word',
          ...node.styleObj
        })}
        selectable={selectable}
        userSelect={selectable}
        onLongPress={(e) => onNodeEvent?.('longpress', node, e)}
      >
        {node.children?.map((child) => renderChild(child, undefined, node.name))}
      </Text>
    );
  }

  // 5. Anchor Link <a>
  if (node.name === 'a') {
    return (
      <View
        className="omni-link"
        style={toTaroStyle({
          display: 'inline',
          color: theme?.linkColor,
          ...node.styleObj
        })}
        onClick={(e) => {
          e.stopPropagation();
          onLinkClick(node.attrs.href || '', node);
          onNodeEvent?.('click', node, e);
        }}
      >
        {node.children?.map((child) => renderChild(child, undefined, 'a'))}
      </View>
    );
  }

  // 6. Image <img>
  if (node.name === 'img') {
    const src = node.attrs.src || node.attrs['data-src'] || '';
    return (
      <OmniImage
        node={node}
        src={src}
        imageSkeleton={imageSkeleton}
        imageSkeletonColor={theme?.imageSkeletonColor}
        onImageClick={onImageClick}
        onNodeEvent={onNodeEvent}
      />
    );
  }

  // 7. Video <video>
  if (node.name === 'video') {
    const src = node.attrs.src || '';
    return (
      <Video
        className="omni-video"
        src={src}
        poster={node.attrs.poster}
        controls={node.attrs.controls !== 'false'}
        autoplay={node.attrs.autoplay === 'true'}
        loop={node.attrs.loop === 'true'}
        muted={node.attrs.muted === 'true'}
        style={toTaroStyle(node.styleObj)}
        onPlay={(e) => onMediaEvent?.({ type: 'play', src, node, rawEvent: e })}
        onPause={(e) => onMediaEvent?.({ type: 'pause', src, node, rawEvent: e })}
        onEnded={(e) => onMediaEvent?.({ type: 'ended', src, node, rawEvent: e })}
        onError={(e) => onMediaEvent?.({ type: 'error', src, node, rawEvent: e })}
        onTimeUpdate={(e) =>
          onMediaEvent?.({
            type: 'timeupdate',
            src,
            node,
            currentTime: (e as any)?.detail?.currentTime,
            duration: (e as any)?.detail?.duration,
            rawEvent: e
          })
        }
      />
    );
  }

  // 8. Audio <audio>
  if (node.name === 'audio') {
    const src = node.attrs.src || '';
    return (
      <Audio
        className="omni-audio"
        src={src}
        poster={node.attrs.poster}
        name={node.attrs.title || node.attrs.name || '音频播放'}
        controls={node.attrs.controls !== 'false'}
        loop={node.attrs.loop === 'true'}
        style={toTaroStyle(node.styleObj)}
        onPlay={(e) => onMediaEvent?.({ type: 'play', src, node, rawEvent: e })}
        onPause={(e) => onMediaEvent?.({ type: 'pause', src, node, rawEvent: e })}
        onEnded={(e) => onMediaEvent?.({ type: 'ended', src, node, rawEvent: e })}
        onError={(e) => onMediaEvent?.({ type: 'error', src, node, rawEvent: e })}
      />
    );
  }

  // 9. Button <button>
  if (node.name === 'button') {
    return (
      <Button
        className="omni-button"
        style={toTaroStyle(node.styleObj)}
        onClick={(e) => {
          e.stopPropagation();
          if (node.attrs.href) {
            onLinkClick(node.attrs.href, node);
          }
          onNodeEvent?.('click', node, e);
        }}
      >
        {node.children?.map((child) => renderChild(child, undefined, 'button'))}
      </Button>
    );
  }

  // 10. Horizontal Rule <hr>
  if (node.name === 'hr') {
    return (
      <View
        className="omni-hr"
        style={toTaroStyle({
          backgroundColor: theme?.hrColor,
          ...node.styleObj
        })}
      />
    );
  }

  // 11. Preformatted Code <pre>
  if (node.name === 'pre') {
    return (
      <ScrollView
        scrollX
        className="omni-pre-scroll"
        style={toTaroStyle({
          backgroundColor: theme?.codeBgColor,
          ...node.styleObj
        })}
      >
        <View
          className="omni-pre"
          style={toTaroStyle({
            color: theme?.codeTextColor,
            minWidth: '100%',
            boxSizing: 'border-box',
            ...node.styleObj
          })}
        >
          {node.children?.map((child) => renderChild(child, undefined, 'pre'))}
        </View>
      </ScrollView>
    );
  }

  // 12. Table <table>
  if (node.name === 'table') {
    return (
      <ScrollView
        scrollX
        className="omni-table-scroll"
        style={toTaroStyle(node.styleObj)}
      >
        <View
          className="omni-table"
          style={toTaroStyle({
            display: 'table',
            width: '100%',
            ...node.styleObj
          })}
        >
          {node.children?.map((child) => renderChild(child, undefined, 'table'))}
        </View>
      </ScrollView>
    );
  }

  // Table Row <tr>
  if (node.name === 'tr') {
    return (
      <View
        className="omni-tr"
        style={toTaroStyle({
          display: 'table-row',
          ...node.styleObj
        })}
      >
        {node.children?.map((child) => renderChild(child, undefined, 'tr'))}
      </View>
    );
  }

  // Table Header <th> & Cell <td>
  if (node.name === 'th' || node.name === 'td') {
    const isHeader = node.name === 'th';
    return (
      <View
        className={`omni-${node.name}`}
        style={toTaroStyle({
          display: 'table-cell',
          border: theme?.tableBorderColor ? `1px solid ${theme.tableBorderColor}` : undefined,
          backgroundColor: isHeader ? theme?.tableHeaderBgColor : undefined,
          ...node.styleObj
        })}
      >
        {node.children?.map((child) => renderChild(child, undefined, node.name))}
      </View>
    );
  }

  // 13. List Item <li>
  if (node.name === 'li') {
    const isOrdered = parentTag === 'ol';
    const bulletText = isOrdered ? `${(indexInList ?? 0) + 1}. ` : '• ';

    return (
      <View
        className="omni-li"
        style={toTaroStyle({
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          ...node.styleObj
        })}
      >
        <Text
          className="omni-li-bullet"
          style={toTaroStyle({
            marginRight: 6,
            color: theme?.bulletColor,
            fontWeight: isOrdered ? 'bold' : 'normal',
            flexShrink: 0
          })}
          selectable={selectable}
        >
          {bulletText}
        </Text>
        <View className="omni-li-content" style={{ flex: 1 }}>
          {node.children?.map((child) => renderChild(child, undefined, 'li'))}
        </View>
      </View>
    );
  }

  // 14. Blockquote <blockquote>
  if (node.name === 'blockquote') {
    return (
      <View
        className="omni-blockquote"
        style={toTaroStyle({
          borderLeft: theme?.blockquoteBorderColor ? `3px solid ${theme.blockquoteBorderColor}` : undefined,
          backgroundColor: theme?.blockquoteBgColor,
          color: theme?.blockquoteTextColor,
          ...node.styleObj
        })}
      >
        {node.children?.map((child) => renderChild(child, undefined, 'blockquote'))}
      </View>
    );
  }

  // 15. Line Break <br>
  if (node.name === 'br') {
    return <Text className="omni-br">{'\n'}</Text>;
  }

  // 16. Generic Block Elements (section, div, p, ul, ol, h1-h6, etc.)
  return (
    <View
      className={`omni-element omni-${node.name}`}
      style={toTaroStyle({
        maxWidth: '100%',
        ...node.styleObj
      })}
      onClick={(e) => onNodeEvent?.('click', node, e)}
    >
      {node.children?.map((child, idx) => renderChild(child, idx, node.name))}
    </View>
  );
});
