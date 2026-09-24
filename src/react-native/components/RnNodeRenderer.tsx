import * as React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Animated,
  StyleSheet
} from 'react-native';
import { ASTNode, MediaEventPayload, serializeSvgToXml, INLINE_TAGS, isAllInline } from '../../core';
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

  const dataRatio = node.extra?.dataRatio;
  const aspectRatio = node.extra?.aspectRatio || (dataRatio ? 1 / dataRatio : undefined);
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

  return (
    <Pressable onPress={handlePress}>
      <View
        style={[
          styles.imageWrap,
          imageSkeleton && !loaded && !hasError ? { backgroundColor: imageSkeletonColor } : undefined,
          aspectRatio ? { aspectRatio } : undefined,
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
            style={[styles.image, { opacity }]}
            resizeMode="contain"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </View>
    </Pressable>
  );
};

// ─── RnNodeRenderer ───────────────────────────────────────────────────────────

export interface RnNodeRendererProps {
  node: ASTNode;
  onLinkTap: (href: string, node: ASTNode) => void;
  onImageTap: (src: string, node: ASTNode) => void;
  onLongPressText?: (text: string, node: ASTNode) => void;
  onMediaEvent?: (payload: MediaEventPayload) => void;
  customRender?: (node: ASTNode) => React.ReactNode | null;
  theme?: ThemeConfig;
  imageSkeleton?: boolean;
  imageLinkAction?: 'link' | 'preview' | 'both';
  /** 0-based position of this node within its parent list (ul/ol) */
  indexInList?: number;
  /** Tag name of the direct parent node (used for li bullet logic) */
  parentTag?: string;
  /** Enclosing anchor link href if inside <a> */
  parentLinkHref?: string;
}

/**
 * Recursive React Native node renderer for a single AST node.
 *
 * Rendering priority:
 *   0. Skip WeChat-specific ignored tags
 *   1. customRender hook (user override wins)
 *   2. Text leaf
 *   3. SVG → data URI <Image>
 *   4. Inline formatting tags → nested <Text>
 *   5. <a> → <Pressable> + Linking.openURL
 *   6. <img> → OmniImage (fade-in skeleton)
 *   7. <video> → customRender fallback or placeholder
 *   8. <audio> → customRender fallback or placeholder
 *   9. <hr> → 1 px View divider
 *  10. <pre> → horizontal <ScrollView> with monospace <Text>
 *  11. <blockquote> → left-border <View>
 *  12. <br> → newline <Text>
 *  13. <table> → horizontal ScrollView + flex rows
 *  14. <tr> → flex row <View>
 *  15. <th> / <td> → bordered <View>
 *  16. <li> → bullet + flex <View>
 *  17. everything else → generic block <View>
 */
export const RnNodeRenderer: React.FC<RnNodeRendererProps> = React.memo(({
  node,
  onLinkTap,
  onImageTap,
  onLongPressText,
  onMediaEvent,
  customRender,
  theme,
  imageSkeleton = true,
  imageLinkAction = 'link',
  indexInList,
  parentTag,
  parentLinkHref
}) => {
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
      parentLinkHref={node.name === 'a' ? (node.attrs.href || '') : linkHref}
      imageLinkAction={imageLinkAction}
      theme={theme}
      imageSkeleton={imageSkeleton}
      onLinkTap={onLinkTap}
      onImageTap={onImageTap}
      onLongPressText={onLongPressText}
      onMediaEvent={onMediaEvent}
      customRender={customRender}
    />
  );

  // ── 0. WeChat-specific tags that must not be rendered ────────────────────
  if (node.extra?.wxIgnored) return null;

  // ── 1. Custom render hook ────────────────────────────────────────────────
  if (customRender) {
    const result = customRender(node);
    if (result !== null && result !== undefined) return <>{result}</>;
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

  // ── 3. SVG → data URI ────────────────────────────────────────────────────
  if (node.name === 'svg') {
    const svgXml = serializeSvgToXml(node);
    const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svgXml)}`;

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
        style={{ width: w, height: h }}
        resizeMode="contain"
      />
    );
  }

  // ── 4. Inline formatting tags → nested <Text> tree ───────────────────────
  if (INLINE_TAGS.has(node.name || '') && isAllInline(node)) {
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
  // Wrapped in a horizontal ScrollView so long lines can be scrolled without
  // wrapping, matching the visual behaviour of web code blocks.
  if (node.name === 'pre') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.preScroll,
          theme?.codeBgColor ? { backgroundColor: theme.codeBgColor } : undefined,
          cssToRn(node.styleObj) as any
        ]}
        contentContainerStyle={styles.preContent}
      >
        <Text
          style={[
            styles.preText,
            theme?.codeTextColor ? { color: theme.codeTextColor } : undefined
          ]}
        >
          {node.children?.map((child) => renderChild(child, undefined, 'pre'))}
        </Text>
      </ScrollView>
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

  // ── 17. Generic block (div, p, section, ul, ol, h1-h6, figure, …) ───────
  const blockStyle = cssToRn(node.styleObj);
  return (
    <View style={[styles.block, blockStyle as any]}>
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

  preScroll: {
    width: '100%'
  },

  preContent: {},

  preText: {
    fontFamily: 'Courier New'
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
  }
});
