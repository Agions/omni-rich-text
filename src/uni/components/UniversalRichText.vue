<template>
  <view
    :class="['omni-rich-text-container', className]"
    :style="containerStyle"
  >
    <uni-node-renderer
      v-for="node in displayNodes"
      :key="node.id"
      :node="node"
      :theme="theme"
      :selectable="selectable"
      :image-skeleton="imageSkeleton"
      @link-tap="handleLinkTap"
      @image-tap="handleImageTap"
      @long-press-text="handleLongPressText"
      @media-event="handleMediaEvent"
      @node-event="(t, n) => emit('nodeEvent', t, n)"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
  type ASTNode,
  type LinkTapContext,
  type MediaEventPayload
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
    chunkSize?: number;
    selectable?: boolean;
    webviewPath?: string;
    tabBarList?: string[];
    className?: string;
    style?: Record<string, any>;
    baseFontSize?: number | string;
    contentBaseFontSize?: number | string;
    fontSize?: number | string;
    rootFontSize?: number;
    remScale?: number;
    fontScale?: number;
    theme?: ThemeConfig;
    imageSkeleton?: boolean;
  }>(),
  {
    format: 'html',
    mode: 'default',
    chunked: true,
    chunkSize: 15,
    selectable: false,
    tabBarList: () => [],
    className: '',
    style: () => ({}),
    theme: () => ({}),
    imageSkeleton: true
  }
);

const emit = defineEmits<{
  (e: 'linkTap', payload: { href: string; node: ASTNode }): void;
  (e: 'imageTap', payload: { src: string; index: number }): void;
  (e: 'longPressText', text: string, node: ASTNode): void;
  (e: 'mediaEvent', payload: { type: string; src?: string; node: ASTNode }): void;
  (e: 'nodeEvent', eventType: string, node: ASTNode): void;
}>();

// ─── 1. Parse AST ────────────────────────────────────────────────────────────

const effectiveRemScale = computed(() => props.remScale ?? props.theme?.remScale ?? DEFAULT_REM_SCALE);
const effectiveFontScale = computed(() => props.fontScale ?? props.theme?.fontScale ?? 1);
const effectiveRootFontSize = computed(() => props.rootFontSize ?? props.theme?.rootFontSize ?? WECHAT_REM_BASE);
const effectiveBaseFontSize = computed(() => Number(props.baseFontSize ?? props.theme?.baseFontSize ?? DEFAULT_BASE_FONT_SIZE));
const effectiveContentBaseFontSize = computed(() => Number(props.contentBaseFontSize ?? props.theme?.contentBaseFontSize ?? DEFAULT_CONTENT_BASE_FONT_SIZE));

const parsedData = computed(() => {
  return parseRichContent(props.content, {
    format: props.format,
    mode: props.mode,
    maxDepth: props.maxDepth,
    extractStyles: props.extractStyles ?? (props.mode === 'wechat'),
    remScale: effectiveRemScale.value,
    fontScale: effectiveFontScale.value,
    rootFontSize: effectiveRootFontSize.value,
    baseFontSize: effectiveBaseFontSize.value,
    contentBaseFontSize: effectiveContentBaseFontSize.value,
    fontSize: props.fontSize
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

    if (!props.chunked) return;

    const chunked = chunkAST(newAst, { chunkSize: props.chunkSize });
    if (chunked.remaining.length > 0) {
      startStreaming(chunked.remaining);
    }
  },
  { immediate: true }
);

const displayNodes = computed(() => {
  if (!props.chunked) return ast.value;
  const chunked = chunkAST(ast.value, { chunkSize: props.chunkSize });
  return [...chunked.initial, ...streamedNodes.value];
});

// ─── 3. Platform bridge & link dispatcher ────────────────────────────────────

const bridge = createPlatformBridge('uni');
const linkDispatcher = new SmartLinkDispatcher(bridge, {
  webviewPath: props.webviewPath,
  tabBarList: props.tabBarList,
  onLinkTap: (ctx: LinkTapContext) => {
    emit('linkTap', { href: ctx.href, node: ctx.node });
    return false; // let dispatcher handle routing
  }
});

// ─── 4. Event handlers ───────────────────────────────────────────────────────

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

// ─── 5. Container styles ──────────────────────────────────────────────────────

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
    WebkitUserSelect: props.selectable ? 'text' : 'none'
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
</style>
