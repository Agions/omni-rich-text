<template>
  <view
    :class="['omni-rich-text-container', mode === 'wechat' ? 'omni-wechat-article' : '', className]"
    :style="containerStyle"
  >
    <view :id="contentInnerId" class="omni-content-inner" :style="clampedWrapperStyle">
      <uni-node-renderer
        v-for="node in displayNodes"
        :key="node.id"
        :node="node"
        :theme="theme"
        :selectable="selectable"
        :image-skeleton="imageSkeleton"
        :show-image-error="showImageError"
        :image-link-action="imageLinkAction"
        :components="components"
        :custom-render="customRender"
        :image-crop-mode="imageCropMode"
        :image-crop-ratio="imageCropRatio"
        @link-tap="handleLinkTap"
        @image-tap="handleImageTap"
        @long-press-text="handleLongPressText"
        @media-event="handleMediaEvent"
        @node-event="handleNodeEvent"
      />

      <!-- Gradient Mask when clamped -->
      <view
        v-if="isClamped"
        class="omni-clamp-mask"
        :style="{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '90px',
          background: fadeGradient,
          pointerEvents: 'none'
        }"
      />
    </view>

    <!-- Expand / Collapse Action Button -->
    <view
      v-if="numericClampMaxHeight && canClamp && (isClamped || showCollapse)"
      class="omni-clamp-action-wrap"
      :style="{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: isClamped ? '-16px' : '12px',
        position: 'relative',
        zIndex: 5
      }"
    >
      <view
        class="omni-clamp-btn"
        :style="{
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
          fontWeight: '500'
        }"
        @tap="handleToggleExpand"
      >
        <text>{{ isClamped ? (expandText || '展开全文') : (collapseText || '收起') }}</text>
        <text style="margin-left: 4px; font-size: 11px;">{{ isClamped ? '▼' : '▲' }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
export default {
  name: 'UniversalRichText',
  options: {
    virtualHost: true
  }
};
</script>

<script setup lang="ts">
import { computed, ref, watch, getCurrentInstance } from 'vue';
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
  type ASTNode,
  type LinkTapContext,
  type MediaEventPayload,
  type TruncateOptions
} from '../../core';
import UniNodeRenderer from './UniNodeRenderer.vue';
import type { UniRichTextProps, ThemeConfig } from '../types';

const props = withDefaults(
  defineProps<{
    content: string;
    format?: 'html' | 'markdown';
    mode?: 'default' | 'wechat';
    maxDepth?: number;
    extractStyles?: boolean;
    chunked?: boolean;
    cache?: boolean;
    chunkSize?: number;
    selectable?: boolean;
    webviewPath?: string;
    tabBarList?: string[];
    className?: string;
    style?: Record<string, any>;
    baseFontSize?: number | string;
    contentBaseFontSize?: number | string;
    fontSize?: number | string;
    fontSizeResolver?: (sourcePx: number, rawValue: string) => string | number;
    rootFontSize?: number;
    remScale?: number;
    fontScale?: number;
    theme?: ThemeConfig;
    imageSkeleton?: boolean;
    showImageError?: boolean;
    imageLinkAction?: 'link' | 'preview' | 'both';
    truncate?: TruncateOptions;
    truncateLength?: number;
    clampMaxHeight?: number | string;
    expandText?: string;
    collapseText?: string;
    showCollapse?: boolean;
    onExpandChange?: (expanded: boolean) => void;
    imageCropMode?: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto';
    imageCropRatio?: number;
    customRender?: (node: ASTNode) => any;
    components?: Record<string, any>;
    streaming?: boolean;
    showCursor?: boolean;
    cursorChar?: string;
  }>(),
  {
    format: 'html',
    mode: 'default',
    chunked: true,
    cache: true,
    chunkSize: 15,
    selectable: false,
    tabBarList: () => [],
    className: '',
    style: () => ({}),
    theme: () => ({}),
    imageSkeleton: true,
    showImageError: false,
    imageLinkAction: 'link',
    expandText: '展开全文',
    collapseText: '收起',
    showCollapse: true,
    clampMaxHeight: undefined,
    truncate: undefined,
    truncateLength: undefined,
    imageCropMode: undefined,
    imageCropRatio: undefined,
    customRender: undefined,
    components: undefined,
    streaming: false,
    showCursor: true,
    cursorChar: '▍'
  }
);

const emit = defineEmits<{
  (e: 'linkTap', payload: { href: string; node: ASTNode }): void;
  (e: 'imageTap', payload: { src: string; index: number }): void;
  (e: 'longPressText', text: string, node: ASTNode): void;
  (e: 'mediaEvent', payload: { type: string; src?: string; node: ASTNode }): void;
  (e: 'nodeEvent', eventType: string, node: ASTNode, rawEvent?: any): void;
  (e: 'expandChange', expanded: boolean): void;
}>();

// ─── 1. Parse AST ────────────────────────────────────────────────────────────

const effectiveRemScale = computed(() => props.remScale ?? props.theme?.remScale ?? DEFAULT_REM_SCALE);
const effectiveFontScale = computed(() => props.fontScale ?? props.theme?.fontScale ?? 1);
const effectiveRootFontSize = computed(() => props.rootFontSize ?? props.theme?.rootFontSize ?? WECHAT_REM_BASE);
const effectiveBaseFontSize = computed(() => Number(props.baseFontSize ?? props.theme?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE));
const effectiveContentBaseFontSize = computed(() => Number(props.contentBaseFontSize ?? props.theme?.contentBaseFontSize ?? DEFAULT_CONTENT_BASE_FONT_SIZE));

const customTags = computed(() => {
  return props.components ? Object.keys(props.components).map((k) => k.toLowerCase()) : undefined;
});

const effectiveTruncate = computed(() => {
  if (props.truncate) return props.truncate;
  if (props.truncateLength !== undefined) return { maxLength: props.truncateLength };
  return undefined;
});

const parsedData = computed(() => {
  if (props.streaming) {
    return parseStreamContent(props.content, {
      format: props.format,
      mode: props.mode,
      maxDepth: props.maxDepth,
      extractStyles: props.extractStyles ?? (props.mode === 'wechat'),
      customTags: customTags.value,
      truncate: effectiveTruncate.value,
      remScale: effectiveRemScale.value,
      fontScale: effectiveFontScale.value,
      rootFontSize: effectiveRootFontSize.value,
      baseFontSize: effectiveBaseFontSize.value,
      contentBaseFontSize: effectiveContentBaseFontSize.value,
      fontSize: props.fontSize,
      fontSizeResolver: props.fontSizeResolver,
      showCursor: props.showCursor,
      cursorChar: props.cursorChar
    });
  }

  return parseRichContent(props.content, {
    format: props.format,
    mode: props.mode,
    maxDepth: props.maxDepth,
    extractStyles: props.extractStyles ?? (props.mode === 'wechat'),
    customTags: customTags.value,
    truncate: effectiveTruncate.value,
    remScale: effectiveRemScale.value,
    fontScale: effectiveFontScale.value,
    rootFontSize: effectiveRootFontSize.value,
    baseFontSize: effectiveBaseFontSize.value,
    contentBaseFontSize: effectiveContentBaseFontSize.value,
    fontSize: props.fontSize,
    fontSizeResolver: props.fontSizeResolver,
    cache: props.cache
  });
});

const ast = computed(() => parsedData.value.ast);
const galleryList = computed(() => parsedData.value.galleryList);

// ─── 2. Progressive chunked rendering ────────────────────────────────────────

const streamedNodes = ref<ASTNode[]>([]);
let chunkTimer: ReturnType<typeof setTimeout> | null = null;

function startStreaming(remaining: ASTNode[][]) {
  let idx = 0;
  const next = () => {
    if (idx >= remaining.length) return;
    const batch = remaining[idx++];
    streamedNodes.value = [...streamedNodes.value, ...batch];
    chunkTimer = setTimeout(next, 80);
  };
  chunkTimer = setTimeout(next, 60);
}

watch(
  ast,
  (newAst) => {
    if (chunkTimer) { clearTimeout(chunkTimer); chunkTimer = null; }
    streamedNodes.value = [];

    if (!props.chunked || props.streaming) return;

    const chunked = chunkAST(newAst, { chunkSize: props.chunkSize });
    if (chunked.remaining.length > 0) {
      startStreaming(chunked.remaining);
    }
  },
  { immediate: true }
);

const displayNodes = computed(() => {
  if (!props.chunked || props.streaming) return ast.value;
  const chunked = chunkAST(ast.value, { chunkSize: props.chunkSize });
  return [...chunked.initial, ...streamedNodes.value];
});

// ─── 3. Visual Clamping (Expand / Collapse) ──────────────────────────────────

const numericClampMaxHeight = computed(() => {
  if (props.clampMaxHeight === undefined || props.clampMaxHeight === null || props.clampMaxHeight === '') return null;
  const num = typeof props.clampMaxHeight === 'number' ? props.clampMaxHeight : parseFloat(String(props.clampMaxHeight));
  return isNaN(num) || num <= 0 ? null : num;
});

const isExpanded = ref(false);
const canClamp = ref(false);
const contentInnerId = `omni_inner_${Math.random().toString(36).substring(2, 8)}`;
const instance = getCurrentInstance();

watch(
  [() => props.content, numericClampMaxHeight, displayNodes],
  () => {
    if (!numericClampMaxHeight.value) {
      canClamp.value = false;
      return;
    }
    const checkHeight = () => {
      try {
        if (typeof uni !== 'undefined' && uni.createSelectorQuery) {
          const query = instance ? uni.createSelectorQuery().in(instance.proxy) : uni.createSelectorQuery();
          query.select(`#${contentInnerId}`).boundingClientRect((res: any) => {
            const rect = Array.isArray(res) ? res[0] : res;
            if (rect && rect.height) {
              canClamp.value = rect.height > (numericClampMaxHeight.value || 0);
            }
          }).exec();
        } else {
          canClamp.value = true;
        }
      } catch (e) {
        canClamp.value = true;
      }
    };
    setTimeout(checkHeight, 120);
  },
  { immediate: true }
);

function handleToggleExpand() {
  const next = !isExpanded.value;
  isExpanded.value = next;
  emit('expandChange', next);
  props.onExpandChange?.(next);
}

const isClamped = computed(() => Boolean(numericClampMaxHeight.value && canClamp.value && !isExpanded.value));

const effectiveBgColor = computed(() => {
  return (props.style?.backgroundColor as string) || parsedData.value.themeBgColor || '#ffffff';
});

const fadeGradient = computed(() => {
  return `linear-gradient(to bottom, rgba(255,255,255,0) 0%, ${effectiveBgColor.value} 85%)`;
});

const clampedWrapperStyle = computed(() => {
  if (isClamped.value && numericClampMaxHeight.value) {
    return {
      maxHeight: `${numericClampMaxHeight.value}px`,
      overflow: 'hidden',
      position: 'relative'
    };
  }
  return {
    position: 'relative'
  };
});

// ─── 4. Platform bridge & link dispatcher ────────────────────────────────────

const bridge = createPlatformBridge('uni');
const linkDispatcher = new SmartLinkDispatcher(bridge, {
  webviewPath: props.webviewPath,
  tabBarList: props.tabBarList,
  onLinkTap: (ctx: LinkTapContext) => {
    emit('linkTap', { href: ctx.href, node: ctx.node });
    return false; // let dispatcher handle routing
  }
});

// ─── 5. Event handlers ───────────────────────────────────────────────────────

function handleLinkTap(href: string, node: ASTNode) {
  linkDispatcher.dispatch({ href, node });
}

function handleImageTap(src: string, index: number, node: ASTNode) {
  emit('imageTap', { src, index });

  const urls = galleryList.value && galleryList.value.length > 0
    ? galleryList.value
    : src ? [src] : [];

  if (urls.length > 0) {
    bridge.previewImage({ current: src, urls, index });
  }
}

function handleLongPressText(text: string, node: ASTNode) {
  emit('longPressText', text, node);
}

function handleMediaEvent(payload: { type: string; src?: string; node: ASTNode }) {
  emit('mediaEvent', payload);
}

function handleNodeEvent(eventType: string, node: ASTNode, rawEvent?: any) {
  emit('nodeEvent', eventType, node, rawEvent);
}

// ─── 6. Container styles ──────────────────────────────────────────────────────

const containerStyle = computed(() => {
  const resolvedFontSize = toRemFontSize(
    props.fontSize ?? props.theme?.fontSize,
    effectiveRootFontSize.value,
    effectiveRemScale.value,
    effectiveBaseFontSize.value
  );

  const base: Record<string, any> = {
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '100%',
    wordBreak: 'break-word',
    fontSize: resolvedFontSize,
    userSelect: props.selectable ? 'text' : 'none',
    WebkitUserSelect: props.selectable ? 'text' : 'none',
    backgroundColor: props.style?.backgroundColor,
    position: 'relative'
  };
  return { ...base, ...props.style };
});
</script>

<style>
.omni-rich-text-container {
  box-sizing: border-box;
  word-break: break-word;
  user-select: none;
  -webkit-user-select: none;
}
/* ─── Typography & Structure ─── */
.omni-link { display: inline; }
.omni-image { width: 100%; display: block; }
.omni-image-wrap { width: 100%; overflow: hidden; }
.omni-video { width: 100%; }
.omni-hr { height: 1px; }
.omni-pre-scroll { width: 100%; box-sizing: border-box; overflow: scroll; }
.omni-pre { box-sizing: border-box; }
.omni-table-scroll { width: 100%; box-sizing: border-box; overflow: scroll; }
.omni-table { border-collapse: collapse; }
.omni-tr { display: table-row; }
.omni-th, .omni-td { display: table-cell; }
.omni-li { display: flex; flex-direction: row; align-items: flex-start; }
.omni-li-bullet { flex-shrink: 0; }
.omni-li-content { flex: 1; }
.omni-element { box-sizing: border-box; max-width: 100%; }

/* ─── SVG Carousel & Layout ─── */
.omni-svg-carousel-container {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}
.omni-svg-swiper {
  width: 100%;
}
.omni-svg-layout-wrap {
  position: relative;
  max-width: 100%;
  box-sizing: border-box;
}

/* ─── Code Block ─── */
.omni-pre-container {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.omni-pre-header {
  box-sizing: border-box;
}

/* ─── Visual Clamp ─── */
.omni-content-inner {
  position: relative;
}
.omni-clamp-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}
.omni-clamp-action-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

/* ─── AI Streaming Blinking Cursor ─── */
@keyframes omniBlink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
:deep(.omni-stream-cursor) {
  display: inline-block;
  margin-left: 2px;
  animation: omniBlink 0.9s infinite step-start;
  vertical-align: baseline;
  font-weight: bold;
}
</style>
