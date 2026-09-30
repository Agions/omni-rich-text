import * as React from 'react';
import { View, Text, Image, Video, Audio, Button, ScrollView } from '@tarojs/components';
import {
  ASTNode,
  MediaEventPayload,
  ThemeConfig,
  serializeSvgToXml,
  INLINE_TAGS,
  isAllInline,
  isFlexDisplay,
  getDefaultDisplay,
  extractSvgViewBoxRatio,
  hasForeignObject,
  splitSvgForeignObject
} from '../../core';

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
  /** Whether to show fallback placeholder on image load failure. Default is false (hides failed images). */
  showImageError?: boolean;
  /** Semantic color theme overrides */
  theme?: ThemeConfig;
  /** Index in list if inside ul/ol */
  indexInList?: number;
  /** Parent tag name for context */
  parentTag?: string;
  /** Whether direct parent is a flexbox container */
  parentIsFlex?: boolean;
  /** Enclosing anchor link href if inside <a> */
  parentLinkHref?: string;
  /** Action when tapping an image that has a link. 'link': navigate (default), 'preview': open gallery, 'both': both */
  imageLinkAction?: 'link' | 'preview' | 'both';
  selectable?: boolean;
  /** Global image crop mode: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto' */
  imageCropMode?: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto';
  /** Global image crop aspect ratio (e.g. 16/9, 4/3, 1) */
  imageCropRatio?: number;
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
  linkHref?: string;
  imageLinkAction?: 'link' | 'preview' | 'both';
  imageSkeleton?: boolean;
  imageSkeletonColor?: string;
  showImageError?: boolean;
  imageCropMode?: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto';
  imageCropRatio?: number;
  onImageClick: (src: string, node: ASTNode) => void;
  onLinkClick: (href: string, node: ASTNode) => void;
  onNodeEvent?: (eventType: string, node: ASTNode, rawEvent: any) => void;
}> = ({
  node,
  src,
  linkHref,
  imageLinkAction = 'link',
  imageSkeleton = true,
  imageSkeletonColor = '#f1f5f9',
  showImageError = false,
  imageCropMode,
  imageCropRatio,
  onImageClick,
  onLinkClick,
  onNodeEvent
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const placeholderHeight = node.extra?.placeholderHeight;
  const aspectRatio = node.extra?.aspectRatio;

  const rawWidth = node.styleObj?.width;
  const isFullWidth = !rawWidth || rawWidth === '100%' || rawWidth.startsWith('100%');
  const displayStyle = node.styleObj?.display || (isFullWidth ? 'block' : 'inline-block');

  // Strip height, width, and display from node.styleObj so mode="widthFix" works without conflict
  const rawImgStyle = toTaroStyle(node.styleObj);
  const {
    height: _ignoreHeight,
    width: _ignoreWidth,
    maxWidth: _ignoreMaxWidth,
    display: _ignoreDisplay,
    ...cleanImgStyle
  } = rawImgStyle as any;

  const effectiveHref = linkHref || node.attrs.href || node.attrs['data-href'];

  const handleTap = (e: any) => {
    e.stopPropagation();
    onNodeEvent?.('click', node, e);

    if (effectiveHref && imageLinkAction !== 'preview') {
      onLinkClick(effectiveHref, node);
      if (imageLinkAction === 'both') {
        onImageClick(src, node);
      }
    } else {
      onImageClick(src, node);
    }
  };

  if (hasError) {
    return null;
  }

  if (node.extra?.isIcon) {
    const iconW = node.styleObj?.width || node.attrs.width || '20px';
    const iconH = node.styleObj?.height || node.attrs.height || '20px';
    return (
      <View
        className="omni-image-icon-wrap"
        style={toTaroStyle({
          display: 'inline-block',
          verticalAlign: 'middle',
          width: iconW,
          height: iconH,
          cursor: effectiveHref ? 'pointer' : undefined,
          margin: node.styleObj?.margin
        })}
        onClick={handleTap}
      >
        <Image
          className="omni-image-icon"
          src={src}
          mode="aspectFit"
          style={toTaroStyle({
            width: iconW,
            height: iconH,
            display: 'inline-block',
            verticalAlign: 'middle'
          })}
          onError={() => {
            setHasError(true);
            setLoaded(true);
          }}
        />
      </View>
    );
  }

  const effectiveImgMode =
    (node.attrs.mode as any) ||
    (imageCropMode && imageCropMode !== 'auto' ? imageCropMode : null) ||
    (imageCropRatio ? 'aspectFill' : null) ||
    (node.styleObj?.height && !isFullWidth ? 'aspectFit' : 'widthFix');

  return (
    <View
      className="omni-image-wrap"
      style={toTaroStyle({
        position: 'relative',
        display: displayStyle,
        verticalAlign: 'middle',
        width: node.styleObj?.width || (isFullWidth ? '100%' : undefined),
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: node.styleObj?.borderRadius,
        margin: node.styleObj?.margin,
        flex: node.styleObj?.flex,
        cursor: effectiveHref ? 'pointer' : undefined,
        backgroundColor: imageSkeleton && !loaded && !hasError ? imageSkeletonColor : 'transparent',
        ...(imageCropRatio
          ? { aspectRatio: String(imageCropRatio) }
          : aspectRatio && !loaded
          ? { aspectRatio: String(aspectRatio) }
          : placeholderHeight && !loaded
          ? { paddingBottom: placeholderHeight, height: 0 }
          : {})
      })}
      onClick={handleTap}
    >
      <Image
        className="omni-image"
        src={src}
        mode={effectiveImgMode}
        lazyLoad={node.attrs['lazy-load'] !== 'false'}
        style={toTaroStyle({
          ...cleanImgStyle,
          width: isFullWidth ? '100%' : (node.styleObj?.width || '100%'),
          height: imageCropRatio ? '100%' : node.styleObj?.height,
          objectFit: imageCropRatio ? 'cover' : undefined,
          maxWidth: '100%',
          display: displayStyle === 'inline-block' ? 'inline-block' : 'block',
          boxSizing: 'border-box',
          opacity: loaded || !imageSkeleton ? 1 : 0,
          transition: 'opacity 0.25s ease-in-out'
        })}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setHasError(true);
          setLoaded(true);
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
  showImageError = false,
  theme,
  indexInList,
  parentTag,
  parentIsFlex = false,
  parentLinkHref,
  imageLinkAction = 'link',
  selectable = false,
  imageCropMode,
  imageCropRatio
}) => {
  const isCurrentFlex = isFlexDisplay(node.styleObj?.display);
  const isParentFlex = parentIsFlex || !!node.extra?.parentIsFlex;

  // Helper to render child nodes with forwarded context
  const renderChild = (child: ASTNode, idx?: number, pTag = node.name, linkHref = parentLinkHref) => (
    <NodeRenderer
      key={child.id}
      node={child}
      indexInList={idx}
      parentTag={pTag}
      parentIsFlex={isCurrentFlex}
      parentLinkHref={node.name === 'a' ? (node.attrs.href || '') : linkHref}
      imageLinkAction={imageLinkAction}
      components={components}
      imageSkeleton={imageSkeleton}
      showImageError={showImageError}
      theme={theme}
      imageCropMode={imageCropMode}
      imageCropRatio={imageCropRatio}
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

  // 3. SVG Element <svg> -> Smart Layout Container or SVG Data URI
  if (node.name === 'svg') {
    // 3.1 Check if this SVG is an interactive layout container containing <foreignObject>
    if (hasForeignObject(node)) {
      const { bgSvgXml, foreignObjectNodes } = splitSvgForeignObject(node);
      const vbRatio = extractSvgViewBoxRatio(node);
      const bgDataUri = bgSvgXml ? `data:image/svg+xml;utf8,${encodeURIComponent(bgSvgXml)}` : undefined;

      const rawW = node.styleObj?.width || (node.attrs.width ? `${node.attrs.width}px` : '100%');
      const rawH = node.styleObj?.height || (node.attrs.height ? `${node.attrs.height}px` : undefined);

      return (
        <View
          className="omni-svg-layout-wrap"
          style={toTaroStyle({
            position: 'relative',
            display: node.styleObj?.display || 'block',
            width: rawW,
            maxWidth: '100%',
            boxSizing: 'border-box',
            ...(rawH ? { height: rawH } : {}),
            ...(vbRatio && !rawH ? { aspectRatio: String(vbRatio) } : {}),
            ...node.styleObj
          })}
        >
          {bgDataUri && (
            <Image
              className="omni-svg-layout-bg"
              src={bgDataUri}
              mode={rawW && rawH ? 'scaleToFill' : 'widthFix'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            />
          )}
          <View
            className="omni-svg-layout-content"
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}
          >
            {foreignObjectNodes.map((fo) =>
              fo.children?.map((child, idx) => renderChild(child, idx, 'foreignobject'))
            )}
          </View>
        </View>
      );
    }

    // 3.2 Standard Vector SVG -> Encoded as SVG Data URI
    const svgXml = serializeSvgToXml(node);
    const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgXml)}`;
    const vbRatio = extractSvgViewBoxRatio(node);

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
          ...(vbRatio && !height ? { aspectRatio: String(vbRatio) } : {}),
          maxWidth: '100%',
          ...node.styleObj
        })}
        onClick={(e) => onNodeEvent?.('click', node, e)}
      />
    );
  }

  // 4. Inline formatting tags (span, strong, em, etc.) when purely inline and parent is not flex
  if (!isParentFlex && INLINE_TAGS.has(node.name || '') && isAllInline(node)) {
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
        linkHref={parentLinkHref}
        imageLinkAction={imageLinkAction}
        imageSkeleton={imageSkeleton}
        imageSkeletonColor={theme?.imageSkeletonColor}
        showImageError={showImageError}
        onImageClick={onImageClick}
        onLinkClick={onLinkClick}
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

  // 16. Generic Block / Inline Elements (section, div, p, span, ul, ol, h1-h6, etc.)
  const isFlex = isCurrentFlex;
  const defaultDisplay = isParentFlex
    ? 'block'
    : (INLINE_TAGS.has(node.name || '') ? 'inline-block' : 'block');
  const finalDisplay = node.styleObj?.display || defaultDisplay;

  return (
    <View
      className={`omni-element omni-${node.name}`}
      style={toTaroStyle({
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...(isFlex || isParentFlex ? { minWidth: 0 } : {}),
        display: defaultDisplay,
        ...node.styleObj
      })}
      onClick={(e) => onNodeEvent?.('click', node, e)}
    >
      {node.children?.map((child, idx) => renderChild(child, idx, node.name))}
    </View>
  );
});
