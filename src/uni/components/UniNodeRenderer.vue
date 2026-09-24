<template>
  <!-- 0. Skip WeChat-specific ignored tags -->
  <template v-if="node.extra && node.extra.wxIgnored" />

  <!-- 1. Text leaf node -->
  <text
    v-else-if="node.type === 'text'"
    class="omni-text"
    :style="node.styleObj"
    :user-select="selectable"
    @longpress="onLongPress"
  >{{ node.text }}</text>

  <!-- 2. SVG -> data URI image -->
  <image
    v-else-if="node.name === 'svg'"
    class="omni-svg"
    :src="node.extra && node.extra.svgDataUri"
    mode="widthFix"
    :style="node.styleObj"
  />

  <!-- 3. Inline formatting tags (span, strong, em, etc.) -->
  <text
    v-else-if="INLINE_TAGS.has(node.name) && isAllInline(node)"
    :class="['omni-inline', `omni-${node.name}`]"
    :style="node.styleObj"
    :user-select="selectable"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :theme="theme"
      :selectable="selectable"
      :image-skeleton="imageSkeleton"
      :parent-tag="node.name"
      v-bind="forwardEvents"
    />
  </text>

  <!-- 4. Anchor <a> -->
  <view
    v-else-if="node.name === 'a'"
    class="omni-link"
    :style="[{ display: 'inline', color: theme.linkColor }, node.styleObj]"
    @tap.stop="onLinkTap"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :theme="theme"
      :selectable="selectable"
      :image-skeleton="imageSkeleton"
      parent-tag="a"
      v-bind="forwardEvents"
    />
  </view>

  <!-- 5. Image <img> with skeleton & error fallback -->
  <view
    v-else-if="node.name === 'img'"
    class="omni-image-wrap"
    :style="imageWrapStyle(node)"
    @tap.stop="onImageTap"
  >
    <view
      v-if="errorImages.has(node.attrs.src || node.attrs['data-src'] || '')"
      class="omni-image-error"
      style="display: flex; align-items: center; justify-content: center; padding: 24px 12px; background-color: #f8fafc; color: #94a3b8; font-size: 12px; border-radius: 4px; border: 1px dashed #cbd5e1; min-height: 80px; text-align: center;"
    >
      <text>{{ node.attrs.alt ? `[图片加载失败: ${node.attrs.alt}]` : '🖼️ 图片加载失败' }}</text>
    </view>
    <image
      v-else
      class="omni-image"
      :src="node.attrs.src || node.attrs['data-src']"
      :mode="node.attrs.mode || 'widthFix'"
      :lazy-load="node.attrs['lazy-load'] !== 'false'"
      :style="imageStyle(node)"
      @load="onImageLoad(node)"
      @error="onImageError(node)"
    />
  </view>

  <!-- 6. Video <video> -->
  <video
    v-else-if="node.name === 'video'"
    class="omni-video"
    :src="node.attrs.src"
    :poster="node.attrs.poster"
    :controls="node.attrs.controls !== 'false'"
    :autoplay="node.attrs.autoplay === 'true'"
    :loop="node.attrs.loop === 'true'"
    :muted="node.attrs.muted === 'true'"
    :style="node.styleObj"
    @play="emit('mediaEvent', { type: 'play', src: node.attrs.src, node })"
    @pause="emit('mediaEvent', { type: 'pause', src: node.attrs.src, node })"
    @ended="emit('mediaEvent', { type: 'ended', src: node.attrs.src, node })"
    @error="emit('mediaEvent', { type: 'error', src: node.attrs.src, node })"
  />

  <!-- 7. Horizontal Rule <hr> -->
  <view
    v-else-if="node.name === 'hr'"
    class="omni-hr"
    :style="[{ backgroundColor: theme.hrColor }, node.styleObj]"
  />

  <!-- 8. Pre/Code block <pre> -->
  <scroll-view
    v-else-if="node.name === 'pre'"
    class="omni-pre-scroll"
    scroll-x
    :style="[{ backgroundColor: theme.codeBgColor }, node.styleObj]"
  >
    <view
      class="omni-pre"
      :style="[{ color: theme.codeTextColor, minWidth: '100%', boxSizing: 'border-box' }, node.styleObj]"
    >
      <uni-node-renderer
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :theme="theme"
        :selectable="selectable"
        :image-skeleton="imageSkeleton"
        parent-tag="pre"
        v-bind="forwardEvents"
      />
    </view>
  </scroll-view>

  <!-- 9. Blockquote -->
  <view
    v-else-if="node.name === 'blockquote'"
    class="omni-blockquote"
    :style="[{
      borderLeft: theme.blockquoteBorderColor ? `3px solid ${theme.blockquoteBorderColor}` : undefined,
      backgroundColor: theme.blockquoteBgColor,
      color: theme.blockquoteTextColor
    }, node.styleObj]"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :theme="theme"
      :selectable="selectable"
      :image-skeleton="imageSkeleton"
      parent-tag="blockquote"
      v-bind="forwardEvents"
    />
  </view>

  <!-- 10. Table with horizontal scroll -->
  <scroll-view
    v-else-if="node.name === 'table'"
    class="omni-table-scroll"
    scroll-x
    :style="node.styleObj"
  >
    <view class="omni-table" :style="[{ display: 'table', width: '100%' }, node.styleObj]">
      <uni-node-renderer
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :theme="theme"
        :selectable="selectable"
        :image-skeleton="imageSkeleton"
        parent-tag="table"
        v-bind="forwardEvents"
      />
    </view>
  </scroll-view>

  <!-- Table row <tr> -->
  <view
    v-else-if="node.name === 'tr'"
    class="omni-tr"
    :style="[{ display: 'table-row' }, node.styleObj]"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :theme="theme"
      :selectable="selectable"
      :image-skeleton="imageSkeleton"
      parent-tag="tr"
      v-bind="forwardEvents"
    />
  </view>

  <!-- Table header <th> / cell <td> -->
  <view
    v-else-if="node.name === 'th' || node.name === 'td'"
    :class="`omni-${node.name}`"
    :style="[{
      display: 'table-cell',
      border: theme.tableBorderColor ? `1px solid ${theme.tableBorderColor}` : undefined,
      backgroundColor: node.name === 'th' ? theme.tableHeaderBgColor : undefined
    }, node.styleObj]"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :theme="theme"
      :selectable="selectable"
      :image-skeleton="imageSkeleton"
      :parent-tag="node.name"
      v-bind="forwardEvents"
    />
  </view>

  <!-- List item <li> -->
  <view
    v-else-if="node.name === 'li'"
    class="omni-li"
    :style="[{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }, node.styleObj]"
  >
    <text class="omni-li-bullet" :style="{ marginRight: '6px', color: theme.bulletColor, fontWeight: isOrderedParent ? 'bold' : 'normal', flexShrink: '0' }">
      {{ bulletText }}
    </text>
    <view class="omni-li-content" :style="{ flex: 1 }">
      <uni-node-renderer
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :theme="theme"
        :selectable="selectable"
        :image-skeleton="imageSkeleton"
        parent-tag="li"
        v-bind="forwardEvents"
      />
    </view>
  </view>

  <!-- Line break <br> -->
  <text v-else-if="node.name === 'br'" class="omni-br">{{ '\n' }}</text>

  <!-- Generic block (div, p, section, ul, ol, h1-h6, figure, etc.) -->
  <view
    v-else
    :class="['omni-element', `omni-${node.name}`]"
    :style="[{ maxWidth: '100%' }, node.styleObj]"
    @tap="onNodeTap"
  >
    <uni-node-renderer
      v-for="(child, idx) in node.children"
      :key="child.id"
      :node="child"
      :index-in-list="idx"
      :parent-tag="node.name"
      :theme="theme"
      :selectable="selectable"
      :image-skeleton="imageSkeleton"
      v-bind="forwardEvents"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ASTNode, ThemeConfig, INLINE_TAGS, isAllInline } from '../../core';

defineOptions({ name: 'UniNodeRenderer' });

const props = withDefaults(
  defineProps<{
    node: ASTNode;
    theme?: ThemeConfig;
    selectable?: boolean;
    imageSkeleton?: boolean;
    indexInList?: number;
    parentTag?: string;
  }>(),
  {
    theme: () => ({}),
    selectable: false,
    imageSkeleton: true,
    indexInList: 0,
    parentTag: ''
  }
);

const emit = defineEmits<{
  (e: 'linkTap', href: string, node: ASTNode): void;
  (e: 'imageTap', src: string, index: number, node: ASTNode): void;
  (e: 'longPressText', text: string, node: ASTNode): void;
  (e: 'mediaEvent', payload: { type: string; src?: string; node: ASTNode }): void;
  (e: 'nodeEvent', eventType: string, node: ASTNode): void;
}>();

// Forward all events up the tree
const forwardEvents = computed(() => ({
  onLinkTap: (href: string, n: ASTNode) => emit('linkTap', href, n),
  onImageTap: (src: string, idx: number, n: ASTNode) => emit('imageTap', src, idx, n),
  onLongPressText: (text: string, n: ASTNode) => emit('longPressText', text, n),
  onMediaEvent: (payload: any) => emit('mediaEvent', payload),
  onNodeEvent: (t: string, n: ASTNode) => emit('nodeEvent', t, n)
}));

// ---- Image skeleton state ----
const loadedImages = ref<Set<string>>(new Set());
const errorImages = ref<Set<string>>(new Set());

function imageWrapStyle(node: ASTNode): Record<string, any> {
  const src = node.attrs?.src || node.attrs?.['data-src'] || '';
  const isLoaded = loadedImages.value.has(src);
  const isError = errorImages.value.has(src);
  const dataRatio = node.extra?.dataRatio;
  const placeholderHeight = node.extra?.placeholderHeight;
  const aspectRatio = node.extra?.aspectRatio;
  const style: Record<string, any> = {
    position: 'relative',
    width: node.styleObj?.width || '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: node.styleObj?.borderRadius,
    margin: node.styleObj?.margin,
    backgroundColor: (props.imageSkeleton && !isLoaded && !isError)
      ? (props.theme.imageSkeletonColor || '#f1f5f9')
      : 'transparent'
  };
  if (aspectRatio && !isLoaded) {
    style.aspectRatio = String(aspectRatio);
  } else if (placeholderHeight && !isLoaded) {
    style.paddingBottom = placeholderHeight;
    style.height = 0;
  } else if (dataRatio && !isLoaded) {
    style.paddingBottom = `${(dataRatio * 100).toFixed(2)}%`;
    style.height = 0;
  }
  return style;
}

function imageStyle(node: ASTNode): Record<string, any> {
  const src = node.attrs?.src || node.attrs?.['data-src'] || '';
  const isLoaded = loadedImages.value.has(src);
  return {
    width: '100%',
    maxWidth: '100%',
    display: 'block',
    boxSizing: 'border-box',
    opacity: (isLoaded || !props.imageSkeleton) ? 1 : 0,
    transition: 'opacity 0.25s ease-in-out',
    ...(node.styleObj || {})
  };
}

function onImageLoad(node: ASTNode) {
  const src = node.attrs?.src || node.attrs?.['data-src'] || '';
  if (src) loadedImages.value.add(src);
}

function onImageError(node: ASTNode) {
  const src = node.attrs?.src || node.attrs?.['data-src'] || '';
  if (src) {
    errorImages.value.add(src);
    loadedImages.value.add(src);
  }
}

// ---- List bullet ----
const isOrderedParent = computed(() => props.parentTag === 'ol');
const bulletText = computed(() =>
  isOrderedParent.value ? `${props.indexInList + 1}. ` : '• '
);

// ---- Event handlers ----
function onLinkTap() {
  emit('linkTap', props.node.attrs?.href || '', props.node);
}

function onImageTap() {
  const src = props.node.attrs?.src || props.node.attrs?.['data-src'] || '';
  const index = props.node.extra?.galleryIndex ?? 0;
  emit('imageTap', src, index, props.node);
}

function onLongPress() {
  const text = props.node.text || '';
  if (text) emit('longPressText', text, props.node);
}

function onNodeTap() {
  emit('nodeEvent', 'tap', props.node);
}
</script>
