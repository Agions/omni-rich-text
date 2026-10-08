import * as React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Animated,
  StyleSheet,
  Alert
} from 'react-native';
import {
  ASTNode,
  MediaEventPayload,
  serializeSvgToXml,
  INLINE_TAGS,
  isAllInline,
  isFlexDisplay,
  extractSvgViewBoxRatio,
  hasForeignObject,
  splitSvgForeignObject
} from '../../core';
import { ThemeConfig } from '../types';
import { cssToRn } from '../styles/cssToRn';

// ─── OmniImage ────────────────────────────────────────────────────────────────

interface OmniImageProps {
  node: ASTNode;
  src: string;
  linkHref?: string;
  imageLinkAction?: 'link' | 'preview' | 'both';
  imageSkeleton?: boolean;
  imageSkeletonColor?: string;
  showImageError?: boolean;
  imageCropMode?: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto';
  imageCropRatio?: number;
  onImageTap: (src: string, node: ASTNode) => void;
  onLinkTap?: (href: string, node: ASTNode) => void;
}

/**
 * Image component with animated skeleton placeholder.
 *
 * Uses `Animated.Image` so that a fade-in transition can be applied with
 * `useNativeDriver: true` — no JS-thread bridge overhead on each frame.
 */
const OmniImage: React.FC<OmniImageProps> = ({
  node,
  src,
  linkHref,
  imageLinkAction = 'link',
  imageSkeleton = true,
  imageSkeletonColor = '#f1f5f9',
  showImageError = false,
  imageCropMode,
  imageCropRatio,
  onImageTap,
  onLinkTap
}) => {
  const opacity = React.useRef(new Animated.Value(imageSkeleton ? 0 : 1)).current;
  const [loaded, setLoaded] = React.useState(!imageSkeleton);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true
    }).start();
  };

  const handleError = () => {
    setHasError(true);
    setLoaded(true);
  };

  const rawHeight = node.styleObj?.height || (node.attrs.height ? (isNaN(Number(node.attrs.height)) ? node.attrs.height : `${node.attrs.height}px`) : undefined);
  const hasExplicitHeight = !!rawHeight;
  const attrWidth = node.attrs.width ? (isNaN(Number(node.attrs.width)) ? node.attrs.width : `${node.attrs.width}px`) : undefined;
  const hasExplicitWidth = (!!node.styleObj?.width && node.styleObj.width !== '100%' && node.styleObj.width !== 'auto') || !!attrWidth;
  const rawWidth = (node.styleObj?.width && node.styleObj.width !== 'auto') ? node.styleObj.width : attrWidth;
  const isFullWidth = (rawWidth === '100%' || rawWidth?.startsWith('100%')) || (!hasExplicitWidth && !hasExplicitHeight);

  const effectiveImgMode =
    (node.attrs.mode as any) ||
    (imageCropMode && imageCropMode !== 'auto' ? imageCropMode : null) ||
    (imageCropRatio ? 'aspectFill' : null) ||
    (hasExplicitWidth && hasExplicitHeight ? 'aspectFill' : null) ||
    (hasExplicitHeight && !hasExplicitWidth ? 'heightFix' : 'widthFix');

  const resizeMode = (effectiveImgMode === 'aspectFill' || imageCropRatio) ? 'cover' : 'contain';

  const dataRatio = node.extra?.dataRatio;
  const aspectRatio = imageCropRatio || node.extra?.aspectRatio || (dataRatio ? 1 / dataRatio : undefined);
  const nodeStyle = cssToRn(node.styleObj);

  const effectiveHref = linkHref || node.attrs.href || node.attrs['data-href'];

  const handlePress = () => {
    if (effectiveHref && imageLinkAction !== 'preview') {
      onLinkTap?.(effectiveHref, node);
      if (imageLinkAction === 'both') {
        onImageTap(src, node);
      }
    } else {
      onImageTap(src, node);
    }
  };

  if (hasError && !showImageError) {
    return null;
  }

  if (node.extra?.isIcon) {
    const rawW = node.styleObj?.width || node.attrs.width;
    const rawH = node.styleObj?.height || node.attrs.height;
    const w = rawW ? parseInt(String(rawW), 10) || 20 : 20;
    const h = rawH ? parseInt(String(rawH), 10) || 20 : 20;
    return (
      <Pressable onPress={handlePress} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image
          source={{ uri: src }}
          style={{ width: w, height: h, resizeMode: 'contain' }}
          onError={handleError}
        />
      </Pressable>
    );
  }

  const explicitH = typeof rawHeight === 'string' && rawHeight.endsWith('px')
    ? parseFloat(rawHeight)
    : (typeof rawHeight === 'number' ? rawHeight : undefined);

  return (
    <Pressable onPress={handlePress}>
      <View
        style={[
          styles.imageWrap,
          imageSkeleton && !loaded && !hasError ? { backgroundColor: imageSkeletonColor } : undefined,
          aspectRatio && isFullWidth ? { aspectRatio } : undefined,
          explicitH && effectiveImgMode !== 'widthFix' ? { height: explicitH } : undefined,
          nodeStyle as any
        ]}
      >
        {hasError ? (
          <View
            style={{
              paddingVertical: 20,
              paddingHorizontal: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderStyle: 'dashed'
            }}
          >
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>
              {node.attrs.alt ? `[图片加载失败: ${node.attrs.alt}]` : '🖼️ 图片加载失败'}
            </Text>
          </View>
        ) : (
          <Animated.Image
            source={{ uri: src }}
            style={[
              styles.image,
              { opacity },
              explicitH && effectiveImgMode !== 'widthFix' ? { height: explicitH } : undefined,
              aspectRatio ? { aspectRatio } : undefined
            ]}
            resizeMode={resizeMode}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </View>
    </Pressable>
  );
};


const RnStreamCursor: React.FC<{ cursorChar?: string }> = ({ cursorChar = '▍' }) => {
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[{ opacity }, styles.cursor]}>
      {cursorChar}
    </Animated.Text>
  );
};

function extractRawText(node: ASTNode): string {
  if (node.type === 'text') return node.text || '';
  if (!node.children || node.children.length === 0) return '';
  return node.children.map(extractRawText).join('');
}

const RnCodeBlock: React.FC<{
  node: ASTNode;
  theme?: ThemeConfig;
  renderChild: (child: ASTNode, idx?: number, pTag?: string) => React.ReactNode;
}> = ({ node, theme, renderChild }) => {
  const [showPreview, setShowPreview] = React.useState(false);
  const isSvg = !!node.extra?.isSvgCodeBlock;
  const rawSvgCode = node.extra?.rawSvgCode;
  const lang = (node.extra?.lang || (isSvg ? 'xml' : 'code')).toUpperCase();
  const svgDataUri = rawSvgCode
    ? `data:image/svg+xml;utf8,${encodeURIComponent(rawSvgCode)}`
    : undefined;

  const handleCopy = () => {
    const textToCopy = rawSvgCode || extractRawText(node);
    if (textToCopy) {
      Alert.alert('已复制代码', textToCopy.slice(0, 100) + (textToCopy.length > 100 ? '...' : ''));
    }
  };

  return (
    <View
      style={[
        styles.preContainer,
        { backgroundColor: theme?.codeBgColor ?? '#282c34' },
        cssToRn(node.styleObj) as any
      ]}
    >
      <View style={styles.preHeader}>
        <Text style={styles.preHeaderLang}>{isSvg ? '🎨 XML / SVG' : lang}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isSvg && svgDataUri ? (
            <Pressable
              onPress={() => setShowPreview(!showPreview)}
              style={[styles.preBtn, showPreview ? { backgroundColor: '#07c160' } : undefined]}
            >
              <Text style={styles.preBtnText}>{showPreview ? '💻 源码' : '👁️ 预览'}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={handleCopy} style={[styles.preBtn, { marginLeft: 6 }]}>
            <Text style={styles.preBtnText}>📋 复制</Text>
          </Pressable>
        </View>
      </View>

      {showPreview && svgDataUri ? (
        <View style={styles.svgPreviewWrap}>
          <Image
            source={{ uri: svgDataUri }}
            style={{ width: '100%', height: 220 }}
            resizeMode="contain"
          />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.preScroll}
          contentContainerStyle={styles.preContent}
        >
          <Text
            style={[
              styles.preText,
              { color: theme?.codeTextColor ?? '#abb2bf' }
            ]}
          >
            {node.children?.map((child, idx) => renderChild(child, idx, 'pre'))}
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

// ─── RnNodeRenderer ───────────────────────────────────────────────────────────

export interface RnNodeRendererProps {
  node: ASTNode;
  onLinkTap: (href: string, node: ASTNode) => void;
  onImageTap: (src: string, node: ASTNode) => void;
  onLongPressText?: (text: string, node: ASTNode) => void;
  onMediaEvent?: (payload: MediaEventPayload) => void;
  onNodeEvent?: (eventType: string, node: ASTNode, rawEvent?: any) => void;
  customRender?: (node: ASTNode) => React.ReactNode | null;
  components?: Record<
    string,
    React.ComponentType<{
      node: ASTNode;
      attrs: Record<string, string>;
      children?: React.ReactNode;
      [key: string]: any;
    }>
  >;
  theme?: ThemeConfig;
  imageSkeleton?: boolean;
  showImageError?: boolean;
  imageLinkAction?: 'link' | 'preview' | 'both';
  imageCropMode?: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto';
  imageCropRatio?: number;
  /** 0-based position of this node within its parent list (ul/ol) */
  indexInList?: number;
  /** Tag name of the direct parent node (used for li bullet logic) */
  parentTag?: string;
  /** Whether direct parent is a flexbox container */
  parentIsFlex?: boolean;
  /** Enclosing anchor link href if inside <a> */
  parentLinkHref?: string;
}

/**
 * Recursive React Native node renderer for a single AST node.
 */
export const RnNodeRenderer: React.FC<RnNodeRendererProps> = React.memo(({
  node,
  onLinkTap,
  onImageTap,
  onLongPressText,
  onMediaEvent,
  onNodeEvent,
  customRender,
  components,
  theme,
  imageSkeleton = true,
  showImageError = false,
  imageLinkAction = 'link',
  imageCropMode,
  imageCropRatio,
  indexInList,
  parentTag,
  parentIsFlex = false,
  parentLinkHref
}) => {

  const isCurrentFlex = isFlexDisplay(node.styleObj?.display);
  const isParentFlex = parentIsFlex || !!node.extra?.parentIsFlex;

  /**
   * Convenience wrapper that renders a child node with all context forwarded.
   * `pTag` defaults to the current node's tag so list items know their parent.
   */
  const renderChild = (child: ASTNode, idx?: number, pTag = node.name, linkHref = parentLinkHref) => (
    <RnNodeRenderer
      key={child.id}
      node={child}
      indexInList={idx}
      parentTag={pTag}
      parentIsFlex={isCurrentFlex}
      parentLinkHref={node.name === 'a' ? (node.attrs.href || '') : linkHref}
      imageLinkAction={imageLinkAction}
      imageCropMode={imageCropMode}
      imageCropRatio={imageCropRatio}
      components={components}
      theme={theme}
      imageSkeleton={imageSkeleton}
      showImageError={showImageError}
      onLinkTap={onLinkTap}
      onImageTap={onImageTap}
      onLongPressText={onLongPressText}
      onMediaEvent={onMediaEvent}
      onNodeEvent={onNodeEvent}
      customRender={customRender}
    />
  );

  // ── 0. WeChat-specific tags that must not be rendered ────────────────────
  if (node.extra?.wxIgnored) return null;

  // ── 0.5. AI Streaming Blinking Cursor ──────────────────────────────────────
  if (node.extra?.isStreamCursor) {
    const cursorChar = node.children?.[0]?.text || '▍';
    return <RnStreamCursor cursorChar={cursorChar} />;
  }

  // ── 1. Custom render hook ────────────────────────────────────────────────
  if (customRender) {
    const result = customRender(node);
    if (result !== null && result !== undefined) return <>{result}</>;
  }

  // ── 1.1 Custom components mapping ────────────────────────────────────────
  if (components && node.name && components[node.name]) {
    const CustomComp = components[node.name];
    return (
      <CustomComp
        node={node}
        attrs={node.attrs || {}}
        onNodeEvent={onNodeEvent}
        onLinkClick={(href: string, n: ASTNode) => onLinkTap(href, n)}
        onImageClick={(src: string, n: ASTNode) => onImageTap(src, n)}
      >
        {node.children?.map((child, idx) => renderChild(child, idx, node.name))}
      </CustomComp>
    );
  }

  // ── 2. Leaf text node ────────────────────────────────────────────────────
  if (node.type === 'text') {
    return (
      <Text
        style={[styles.text, cssToRn(node.styleObj) as any]}
      >
        {node.text}
      </Text>
    );
  }

  // ── 2.5. SVG Carousel / Slider (Paging ScrollView) ──────────────────────
  if (node.extra?.isSvgCarousel && node.extra.carouselSlides && node.extra.carouselSlides.length > 0) {
    const slides = node.extra.carouselSlides;
    const vbRatio = node.extra.aspectRatio || extractSvgViewBoxRatio(node) || 16 / 9;

    return (
      <View style={[{ width: '100%', marginVertical: 10, borderRadius: 8, overflow: 'hidden' }, cssToRn(node.styleObj) as any]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', aspectRatio: vbRatio }}
        >
          {slides.map((slide, sIdx) => (
            <Pressable
              key={sIdx}
              onPress={() => {
                if (slide.href) onLinkTap(slide.href, node);
                onImageTap(slide.src, node);
              }}
              style={{ width: 360, height: '100%', position: 'relative' }}
            >
              <Image
                source={{ uri: slide.src }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              {slide.title ? (
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <Text style={{ color: '#ffffff', fontSize: 12 }}>{slide.title}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── 3. SVG → layout container or data URI ──────────────────────────────
  if (node.name === 'svg') {
    if (hasForeignObject(node)) {
      const { bgSvgXml, foreignObjectNodes } = splitSvgForeignObject(node);
      const vbRatio = extractSvgViewBoxRatio(node);
      const bgDataUri = bgSvgXml ? `data:image/svg+xml;utf8,${encodeURIComponent(bgSvgXml)}` : undefined;
      const rnStyle = cssToRn(node.styleObj);
      return (
        <View
          style={[
            { width: '100%', position: 'relative' },
            vbRatio ? { aspectRatio: vbRatio } : undefined,
            rnStyle as any
          ]}
        >
          {bgDataUri ? (
            <Image
              source={{ uri: bgDataUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
            {foreignObjectNodes.map((fo) =>
              fo.children?.map((child, idx) => renderChild(child, idx, 'foreignobject'))
            )}
          </View>
        </View>
      );
    }


    const svgXml = serializeSvgToXml(node);
    const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svgXml)}`;
    const vbRatio = extractSvgViewBoxRatio(node);

    // Prefer explicit attrs, then styleObj, then a safe fallback
    const rawW = node.styleObj?.width || node.attrs.width;
    const rawH = node.styleObj?.height || node.attrs.height;
    let w: number = 24;
    let h: number = 24;

    if (rawW) {
      const n = parseInt(String(rawW), 10);
      if (!isNaN(n)) w = n;
    }
    if (rawH) {
      const n = parseInt(String(rawH), 10);
      if (!isNaN(n)) h = n;
    }

    // Fallback to viewBox if width/height are absent
    if (w === 24 && h === 24 && node.attrs.viewbox) {
      const parts = node.attrs.viewbox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
        w = parts[2];
        h = parts[3];
      }
    }

    return (
      <Image
        source={{ uri }}
        style={[{ width: w, height: h }, vbRatio ? { aspectRatio: vbRatio } : undefined]}
        resizeMode="contain"
      />
    );
  }

  // ── 4. Inline formatting tags → nested <Text> tree ───────────────────────
  if (!isParentFlex && INLINE_TAGS.has(node.name || '') && isAllInline(node)) {
    // Map each semantic tag to its equivalent RN text style
    const tagStyle: Record<string, any> = {};
    if (node.name === 'strong' || node.name === 'b') tagStyle.fontWeight = 'bold';
    if (node.name === 'em' || node.name === 'i') tagStyle.fontStyle = 'italic';
    if (node.name === 'u') tagStyle.textDecorationLine = 'underline';
    if (node.name === 's' || node.name === 'del' || node.name === 'strike') {
      tagStyle.textDecorationLine = 'line-through';
    }
    if (node.name === 'mark') tagStyle.backgroundColor = '#fffb8f';
    if (node.name === 'sup') tagStyle.fontSize = 10;
    if (node.name === 'sub') tagStyle.fontSize = 10;

    return (
      <Text style={[tagStyle, cssToRn(node.styleObj) as any]}>
        {node.children?.map((child) => renderChild(child, undefined, node.name))}
      </Text>
    );
  }

  // ── 5. Anchor <a> ────────────────────────────────────────────────────────
  if (node.name === 'a') {
    const href = node.attrs.href || '';
    return (
      <Pressable
        onPress={() => onLinkTap(href, node)}
        style={styles.linkPressable}
      >
        <Text
          style={[
            styles.linkText,
            theme?.linkColor ? { color: theme.linkColor } : undefined,
            cssToRn(node.styleObj) as any
          ]}
        >
          {node.children?.map((child) => renderChild(child, undefined, 'a'))}
        </Text>
      </Pressable>
    );
  }

  // ── 6. Image <img> ───────────────────────────────────────────────────────
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
        imageCropMode={imageCropMode}
        imageCropRatio={imageCropRatio}
        onImageTap={onImageTap}
        onLinkTap={onLinkTap}
      />
    );
  }

  // ── 7. Video <video> ─────────────────────────────────────────────────────
  // React Native has no built-in video component. Users must supply a player
  // component (e.g. react-native-video) via the `customRender` prop.
  // The customRender hook is invoked again here so that it can be skipped
  // above for other nodes while still catching video specifically.
  if (node.name === 'video') {
    if (customRender) {
      const r = customRender(node);
      if (r) return <>{r}</>;
    }
    return (
      <View style={styles.videoPlaceholder}>
        <Text style={styles.videoPlaceholderText}>
          {'▶ 视频 (请通过 customRender 接入播放器)'}
        </Text>
      </View>
    );
  }

  // ── 8. Audio <audio> ─────────────────────────────────────────────────────
  if (node.name === 'audio') {
    if (customRender) {
      const r = customRender(node);
      if (r) return <>{r}</>;
    }
    return (
      <View style={styles.audioPlaceholder}>
        <Text style={styles.audioPlaceholderText}>
          {'🎵 ' + (node.attrs.title || node.attrs.name || '音频')}
        </Text>
      </View>
    );
  }

  // ── 9. Horizontal rule <hr> ──────────────────────────────────────────────
  if (node.name === 'hr') {
    return (
      <View
        style={[
          styles.hr,
          theme?.hrColor ? { backgroundColor: theme.hrColor } : undefined,
          cssToRn(node.styleObj) as any
        ]}
      />
    );
  }

  // ── 10. Preformatted code block <pre> ────────────────────────────────────
  if (node.name === 'pre') {
    return (
      <RnCodeBlock
        node={node}
        theme={theme}
        renderChild={renderChild}
      />
    );
  }


  // ── 11. Blockquote ───────────────────────────────────────────────────────
  if (node.name === 'blockquote') {
    return (
      <View
        style={[
          styles.blockquote,
          {
            borderLeftColor: theme?.blockquoteBorderColor,
            backgroundColor: theme?.blockquoteBgColor
          },
          cssToRn(node.styleObj) as any
        ]}
      >
        {node.children?.map((child) => renderChild(child, undefined, 'blockquote'))}
      </View>
    );
  }

  // ── 12. Line break <br> ──────────────────────────────────────────────────
  if (node.name === 'br') {
    return <Text>{'\n'}</Text>;
  }

  // ── 13. Table <table> ────────────────────────────────────────────────────
  // CSS `display: table` is not supported in RN; we simulate it with nested
  // flex Views: table → column, tr → row, th/td → flex:1 bordered Views.
  if (node.name === 'table') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tableScroll}
        contentContainerStyle={styles.tableContent}
      >
        <View style={styles.table}>
          {node.children?.map((child) => renderChild(child, undefined, 'table'))}
        </View>
      </ScrollView>
    );
  }

  // thead / tbody / tfoot are transparent wrappers; render children directly
  if (node.name === 'thead' || node.name === 'tbody' || node.name === 'tfoot') {
    return (
      <View>
        {node.children?.map((child) => renderChild(child, undefined, node.name))}
      </View>
    );
  }

  // ── 14. Table row <tr> ───────────────────────────────────────────────────
  if (node.name === 'tr') {
    return (
      <View style={styles.tr}>
        {node.children?.map((child) => renderChild(child, undefined, 'tr'))}
      </View>
    );
  }

  // ── 15. Table header <th> / cell <td> ───────────────────────────────────
  if (node.name === 'th' || node.name === 'td') {
    const isHeader = node.name === 'th';
    return (
      <View
        style={[
          styles.td,
          {
            borderColor: theme?.tableBorderColor,
            backgroundColor: isHeader
              ? theme?.tableHeaderBgColor
              : undefined
          },
          cssToRn(node.styleObj) as any
        ]}
      >
        {node.children?.map((child) => renderChild(child, undefined, node.name))}
      </View>
    );
  }

  // ── 16. List item <li> ───────────────────────────────────────────────────
  if (node.name === 'li') {
    const isOrdered = parentTag === 'ol';
    const bullet = isOrdered ? `${(indexInList ?? 0) + 1}. ` : '• ';

    return (
      <View style={[styles.li, cssToRn(node.styleObj) as any]}>
        <Text
          style={[
            styles.liBullet,
            {
              color: theme?.bulletColor,
              fontWeight: isOrdered ? 'bold' : 'normal'
            }
          ]}
        >
          {bullet}
        </Text>
        <View style={styles.liContent}>
          {node.children?.map((child) => renderChild(child, undefined, 'li'))}
        </View>
      </View>
    );
  }

  // ── 17. Generic block / inline element (div, p, section, span, ul, ol, h1-h6, figure, …) ───────
  const isInline = !isParentFlex && INLINE_TAGS.has(node.name || '');
  const blockStyle = cssToRn(node.styleObj);
  return (
    <View
      style={[
        styles.block,
        isInline ? { alignSelf: 'flex-start' } : {},
        (isCurrentFlex || isParentFlex) ? { minWidth: 0 } : {},
        blockStyle as any
      ]}
    >
      {node.children?.map((child, idx) => renderChild(child, idx, node.name))}
    </View>
  );
});

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  text: {},

  imageWrap: {
    width: '100%',
    overflow: 'hidden'
  },

  image: {
    width: '100%',
    aspectRatio: 16 / 9
  },

  linkPressable: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },

  linkText: {},

  videoPlaceholder: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 12,
    paddingRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80
  },

  videoPlaceholderText: {
    fontSize: 14
  },

  audioPlaceholder: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },

  audioPlaceholderText: {
    fontSize: 14
  },

  hr: {
    height: 1
  },

  preContainer: {
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },

  preHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },

  preHeaderLang: {
    fontSize: 11,
    color: '#abb2bf',
    fontWeight: 'bold'
  },

  preBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)'
  },

  preBtnText: {
    fontSize: 11,
    color: '#ffffff'
  },

  svgPreviewWrap: {
    padding: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },

  preScroll: {
    width: '100%'
  },

  preContent: {
    padding: 12
  },

  preText: {
    fontFamily: 'Courier New',
    fontSize: 13
  },

  blockquote: {},

  tableScroll: {
    width: '100%'
  },

  tableContent: {},

  table: {
    width: '100%',
    flexDirection: 'column'
  },

  tr: {
    flexDirection: 'row'
  },

  td: {
    flex: 1
  },

  li: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },

  liBullet: {
    marginRight: 6,
    flexShrink: 0
  },

  liContent: {
    flex: 1
  },

  block: {
    maxWidth: '100%'
  },

  cursor: {
    marginLeft: 2,
    fontSize: 14
  }
});
