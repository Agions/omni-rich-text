<template>
  <!-- 0. Skip WeChat-specific ignored tags -->
  <template v-if="node.extra && node.extra.wxIgnored" />

  <!-- 1. Custom Render Hook (customRender prop) -->
  <text
    v-else-if="customResult && (typeof customResult === 'string' || typeof customResult === 'number')"
    class="omni-text"
  >{{ customResult }}</text>
  <component
    :is="customResult"
    v-else-if="customResult"
    :node="node"
    v-bind="forwardProps"
    v-bind="forwardEvents"
  />

  <!-- 1.1 Custom Components Mapping (components prop) -->
  <component
    :is="components[node.name]"
    v-else-if="components && node.name && components[node.name]"
    :node="node"
    :attrs="node.attrs || {}"
    @node-event="(t, n, e) => emit('nodeEvent', t, n, e)"
    @link-tap="(href, n) => emit('linkTap', href, n)"
    @image-tap="(src, idx, n) => emit('imageTap', src, idx, n)"
  >
    <uni-node-renderer
      v-for="(child, idx) in node.children"
      :key="child.id"
      :node="child"
      :index-in-list="idx"
      :parent-tag="node.name"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </component>

  <!-- 2. Leaf text node -->
  <text
    v-else-if="node.type === 'text'"
    class="omni-text"
    :style="[
      { wordBreak: 'break-word' },
      node.styleObj
    ]"
    :user-select="selectable"
    @longpress="onLongPress"
  >{{ node.text }}</text>

  <!-- 3.0 SVG Carousel / Slider (Native Swiper mapping) -->
  <view
    v-else-if="node.extra?.isSvgCarousel && node.extra.carouselSlides && node.extra.carouselSlides.length > 0"
    class="omni-svg-carousel-container"
    :style="[
      {
        width: '100%',
        margin: '12px 0',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      },
      node.styleObj
    ]"
  >
    <swiper
      class="omni-svg-swiper"
      :indicator-dots="node.extra.carouselSlides.length > 1"
      indicator-color="rgba(255, 255, 255, 0.45)"
      indicator-active-color="#ffffff"
      :autoplay="false"
      :circular="node.extra.carouselSlides.length > 1"
      :style="{
        width: '100%',
        height: '240px',
        aspectRatio: String(node.extra.aspectRatio || extractSvgViewBoxRatio(node) || 16 / 9)
      }"
    >
      <swiper-item
        v-for="(slide, sIdx) in node.extra.carouselSlides"
        :key="sIdx"
        style="width: 100%; height: 100%;"
      >
        <view
          style="width: 100%; height: 100%; position: relative;"
          @tap.stop="handleSlideTap(slide, node)"
        >
          <image
            :src="slide.src"
            mode="aspectFill"
            style="width: 100%; height: 100%; display: block;"
          />
          <view
            v-if="slide.title"
            style="position: absolute; bottom: 0; left: 0; right: 0; padding: 6px 10px; background: linear-gradient(transparent, rgba(0,0,0,0.65)); color: #ffffff; font-size: 12px;"
          >
            <text>{{ slide.title }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>
  </view>

  <!-- 3.1 SVG with ForeignObject (Dual-layer decoupling) -->
  <view
    v-else-if="node.name === 'svg' && isSvgForeign && svgForeignData"
    class="omni-svg-layout-wrap"
    :style="[
      {
        position: 'relative',
        display: node.styleObj?.display || 'block',
        width: svgForeignData.rawW,
        maxWidth: '100%',
        boxSizing: 'border-box'
      },
      svgForeignData.rawH ? { height: svgForeignData.rawH } : {},
      (svgForeignData.vbRatio && !svgForeignData.rawH) ? { aspectRatio: String(svgForeignData.vbRatio) } : {},
      node.styleObj
    ]"
  >
    <image
      v-if="svgForeignData.bgDataUri"
      class="omni-svg-layout-bg"
      :src="svgForeignData.bgDataUri"
      :mode="svgForeignData.rawW && svgForeignData.rawH ? 'scaleToFill' : 'widthFix'"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"
    />
    <view
      class="omni-svg-layout-content"
      style="position: relative; z-index: 1; width: 100%; height: 100%; box-sizing: border-box;"
    >
      <template v-for="fo in svgForeignData.foreignObjectNodes" :key="fo.id">
        <uni-node-renderer
          v-for="(child, idx) in fo.children"
          :key="child.id"
          :node="child"
          :index-in-list="idx"
          parent-tag="foreignobject"
          v-bind="forwardProps"
          v-bind="forwardEvents"
        />
      </template>
    </view>
  </view>

  <!-- 3.2 Standard Vector SVG -->
  <image
    v-else-if="node.name === 'svg'"
    class="omni-svg"
    :src="standardSvgUri"
    :mode="standardSvgWidth && standardSvgHeight ? 'scaleToFill' : 'widthFix'"
    :style="[
      {
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        maxWidth: '100%'
      },
      standardSvgWidth ? { width: standardSvgWidth } : {},
      standardSvgHeight ? { height: standardSvgHeight } : {},
      (standardSvgVbRatio && !standardSvgHeight) ? { aspectRatio: String(standardSvgVbRatio) } : {},
      node.styleObj
    ]"
    @tap="emit('nodeEvent', 'tap', node)"
  />

  <!-- 4. Inline formatting tags (span, strong, em, etc.) -->
  <text
    v-else-if="!isParentFlex && INLINE_TAGS.has(node.name) && isAllInline(node)"
    :class="['omni-inline', `omni-${node.name}`]"
    :style="node.styleObj"
    :user-select="selectable"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :parent-tag="node.name"
      :parent-is-flex="false"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </text>

  <!-- 5. Anchor <a> -->
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
      :parent-link-href="node.attrs?.href || ''"
      parent-tag="a"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </view>

  <!-- 6. Image <img> (Icon vs Regular Image) -->
  <view
    v-else-if="node.name === 'img' && node.extra?.isIcon && (!errorImages.has(node.attrs?.src || node.attrs?.['data-src'] || '') || showImageError)"
    class="omni-image-icon-wrap"
    :style="{
      display: 'inline-block',
      verticalAlign: 'middle',
      width: node.styleObj?.width || node.attrs?.width || '20px',
      height: node.styleObj?.height || node.attrs?.height || '20px',
      margin: node.styleObj?.margin
    }"
    @tap.stop="handleImageTap(node)"
  >
    <image
      class="omni-image-icon"
      :src="node.attrs?.src || node.attrs?.['data-src']"
      mode="aspectFit"
      :style="{
        width: node.styleObj?.width || node.attrs?.width || '20px',
        height: node.styleObj?.height || node.attrs?.height || '20px',
        display: 'inline-block',
        verticalAlign: 'middle'
      }"
      @error="onImageError(node)"
    />
  </view>
  <view
    v-else-if="node.name === 'img' && (!errorImages.has(node.attrs?.src || node.attrs?.['data-src'] || '') || showImageError)"
    class="omni-image-wrap"
    :style="imageWrapStyle(node)"
    @tap.stop="handleImageTap(node)"
  >
    <view
      v-if="errorImages.has(node.attrs?.src || node.attrs?.['data-src'] || '') && showImageError"
      class="omni-image-error"
      style="display: flex; align-items: center; justify-content: center; padding: 24px 12px; background-color: #f8fafc; color: #94a3b8; font-size: 12px; border-radius: 4px; border: 1px dashed #cbd5e1; min-height: 80px; text-align: center;"
    >
      <text>{{ node.attrs?.alt ? `[图片加载失败: ${node.attrs.alt}]` : '🖼️ 图片加载失败' }}</text>
    </view>
    <image
      v-else-if="!errorImages.has(node.attrs?.src || node.attrs?.['data-src'] || '')"
      class="omni-image"
      :src="node.attrs?.src || node.attrs?.['data-src']"
      :mode="effectiveImgMode"
      :lazy-load="node.attrs?.['lazy-load'] !== 'false'"
      :style="imageStyle(node)"
      @load="onImageLoad(node)"
      @error="onImageError(node)"
    />
  </view>

  <!-- 7. Video <video> -->
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

  <!-- 8. Horizontal Rule <hr> -->
  <view
    v-else-if="node.name === 'hr'"
    class="omni-hr"
    :style="[{ backgroundColor: theme.hrColor }, node.styleObj]"
  />

  <!-- 9. Pre/Code block <pre> with Header Bar & SVG Dual-Mode -->
  <view
    v-else-if="node.name === 'pre'"
    class="omni-pre-container"
    :style="[
      {
        margin: '12px 0',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        backgroundColor: theme.codeBgColor || '#282c34'
      },
      node.styleObj
    ]"
  >
    <view
      class="omni-pre-header"
      style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 6px 12px; background-color: rgba(0, 0, 0, 0.25); border-bottom: 1px solid rgba(255, 255, 255, 0.06);"
    >
      <text style="font-size: 11px; color: #abb2bf; font-weight: bold;">
        {{ codeLangLabel }}
      </text>
      <view style="display: flex; flex-direction: row; align-items: center; gap: 6px;">
        <view
          v-if="isSvgCodeBlock && svgCodeDataUri"
          style="font-size: 11px; padding: 2px 8px; border-radius: 4px; color: #ffffff; cursor: pointer;"
          :style="{ backgroundColor: showSvgPreview ? '#07c160' : 'rgba(255, 255, 255, 0.15)' }"
          @tap.stop="showSvgPreview = !showSvgPreview"
        >
          <text>{{ showSvgPreview ? '💻 源码' : '👁️ 预览' }}</text>
        </view>
        <view
          style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background-color: rgba(255, 255, 255, 0.15); color: #ffffff; cursor: pointer;"
          @tap.stop="handleCopyCode"
        >
          <text>📋 复制</text>
        </view>
      </view>
    </view>

    <!-- Body: SVG Visual Preview or Code Scroll -->
    <view
      v-if="showSvgPreview && svgCodeDataUri"
      style="padding: 16px; background-color: #ffffff; display: flex; justify-content: center; align-items: center;"
    >
      <image
        :src="svgCodeDataUri"
        mode="widthFix"
        style="max-width: 100%; display: block;"
      />
    </view>
    <scroll-view
      v-else
      class="omni-pre-scroll"
      scroll-x
      style="width: 100%; box-sizing: border-box;"
      :style="{ backgroundColor: theme.codeBgColor || '#282c34' }"
    >
      <view
        class="omni-pre"
        :style="[
          {
            color: theme.codeTextColor || '#abb2bf',
            minWidth: '100%',
            padding: '12px 14px',
            boxSizing: 'border-box',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '13px'
          },
          node.styleObj
        ]"
      >
        <uni-node-renderer
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          parent-tag="pre"
          v-bind="forwardProps"
          v-bind="forwardEvents"
        />
      </view>
    </scroll-view>
  </view>

  <!-- 10. Blockquote -->
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
      parent-tag="blockquote"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </view>

  <!-- 11. Table with horizontal scroll -->
  <scroll-view
    v-else-if="node.name === 'table'"
    class="omni-table-scroll"
    scroll-x
    :style="{
      width: '100%',
      maxWidth: '100%',
      overflowX: 'auto',
      margin: node.styleObj?.margin
    }"
  >
    <view
      class="omni-table"
      :style="[{
        display: 'table',
        minWidth: '100%',
        borderCollapse: 'collapse',
        boxSizing: 'border-box'
      }, node.styleObj]"
    >
      <uni-node-renderer
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        parent-tag="table"
        v-bind="forwardProps"
        v-bind="forwardEvents"
      />
    </view>
  </scroll-view>

  <!-- Table Header Group / Body Group / Footer Group -->
  <view
    v-else-if="node.name === 'thead' || node.name === 'tbody' || node.name === 'tfoot'"
    :class="`omni-${node.name}`"
    :style="[{
      display: node.name === 'thead' ? 'table-header-group' : (node.name === 'tfoot' ? 'table-footer-group' : 'table-row-group')
    }, node.styleObj]"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :parent-tag="node.name"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </view>

  <!-- Table row <tr> -->
  <view
    v-else-if="node.name === 'tr'"
    class="omni-tr"
    :style="[{ display: 'table-row', verticalAlign: 'inherit' }, node.styleObj]"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      parent-tag="tr"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </view>

  <!-- Table header <th> / cell <td> -->
  <view
    v-else-if="node.name === 'th' || node.name === 'td'"
    :class="`omni-${node.name}`"
    :style="[{
      display: 'table-cell',
      verticalAlign: 'middle',
      border: theme.tableBorderColor ? `1px solid ${theme.tableBorderColor}` : undefined,
      backgroundColor: node.name === 'th' ? theme.tableHeaderBgColor : undefined
    }, node.styleObj]"
  >
    <uni-node-renderer
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :parent-tag="node.name"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </view>

  <!-- 12. List item <li> -->
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
        parent-tag="li"
        v-bind="forwardProps"
        v-bind="forwardEvents"
      />
    </view>
  </view>

  <!-- 13. Line break <br> -->
  <text v-else-if="node.name === 'br'" class="omni-br">{{ '\n' }}</text>

  <!-- 14. Generic block / inline element (div, p, section, span, ul, ol, h1-h6, figure, etc.) -->
  <view
    v-else
    :class="['omni-element', `omni-${node.name}`]"
    :style="[
      {
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: node.styleObj?.display || (isParentFlex ? 'block' : (INLINE_TAGS.has(node.name) ? 'inline-block' : 'block'))
      },
      (isCurrentFlex || isParentFlex) ? { minWidth: '0' } : {},
      node.styleObj
    ]"
    @tap="onNodeTap"
  >
    <uni-node-renderer
      v-for="(child, idx) in node.children"
      :key="child.id"
      :node="child"
      :index-in-list="idx"
      :parent-tag="node.name"
      :parent-is-flex="isCurrentFlex"
      :parent-link-href="parentLinkHref"
      v-bind="forwardProps"
      v-bind="forwardEvents"
    />
  </view>
</template>

<script lang="ts">
export default {
  name: 'UniNodeRenderer',
  options: {
    virtualHost: true
  }
};
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ASTNode,
  ThemeConfig,
  INLINE_TAGS,
  isAllInline,
  isFlexDisplay,
  hasForeignObject,
  splitSvgForeignObject,
  extractSvgViewBoxRatio,
  serializeSvgToXml
} from '../../core';

defineOptions({
  name: 'UniNodeRenderer',
  options: {
    virtualHost: true
  }
});

const props = withDefaults(
  defineProps<{
    node: ASTNode;
    theme?: ThemeConfig;
    selectable?: boolean;
    imageSkeleton?: boolean;
    showImageError?: boolean;
    imageLinkAction?: 'link' | 'preview' | 'both';
    indexInList?: number;
    parentTag?: string;
    parentIsFlex?: boolean;
    parentLinkHref?: string;
    customRender?: (node: ASTNode) => any;
    components?: Record<string, any>;
    imageCropMode?: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto';
    imageCropRatio?: number;
  }>(),
  {
    theme: () => ({}),
    selectable: false,
    imageSkeleton: true,
    showImageError: false,
    imageLinkAction: 'link',
    indexInList: 0,
    parentTag: '',
    parentIsFlex: false,
    parentLinkHref: '',
    components: undefined,
    customRender: undefined,
    imageCropMode: undefined,
    imageCropRatio: undefined
  }
);

const isParentFlex = computed(() => props.parentIsFlex || !!props.node.extra?.parentIsFlex);
const isCurrentFlex = computed(() => isFlexDisplay(props.node.styleObj?.display));

const emit = defineEmits<{
  (e: 'linkTap', href: string, node: ASTNode): void;
  (e: 'imageTap', src: string, index: number, node: ASTNode): void;
  (e: 'longPressText', text: string, node: ASTNode): void;
  (e: 'mediaEvent', payload: { type: string; src?: string; node: ASTNode }): void;
  (e: 'nodeEvent', eventType: string, node: ASTNode, rawEvent?: any): void;
}>();

// Forward all props down the recursive tree
const forwardProps = computed(() => ({
  theme: props.theme,
  selectable: props.selectable,
  imageSkeleton: props.imageSkeleton,
  showImageError: props.showImageError,
  imageLinkAction: props.imageLinkAction,
  customRender: props.customRender,
  components: props.components,
  imageCropMode: props.imageCropMode,
  imageCropRatio: props.imageCropRatio
}));

// Forward all events up the recursive tree
const forwardEvents = computed(() => ({
  onLinkTap: (href: string, n: ASTNode) => emit('linkTap', href, n),
  onImageTap: (src: string, idx: number, n: ASTNode) => emit('imageTap', src, idx, n),
  onLongPressText: (text: string, n: ASTNode) => emit('longPressText', text, n),
  onMediaEvent: (payload: any) => emit('mediaEvent', payload),
  onNodeEvent: (t: string, n: ASTNode, e?: any) => emit('nodeEvent', t, n, e)
}));

// ---- Custom Render Hook ----
const customResult = computed(() => {
  if (!props.customRender) return null;
  return props.customRender(props.node);
});

// ---- Image sizing & skeleton state ----
const loadedImages = ref<Set<string>>(new Set());
const errorImages = ref<Set<string>>(new Set());

const rawHeight = computed(() => {
  const sH = props.node.styleObj?.height;
  if (sH && sH !== 'auto') return sH;
  const aH = props.node.attrs?.height;
  if (aH && aH !== 'auto') {
    return isNaN(Number(aH)) ? aH : `${aH}px`;
  }
  return undefined;
});

const hasExplicitHeight = computed(() => !!rawHeight.value);

const attrWidth = computed(() => {
  const aW = props.node.attrs?.width;
  if (aW && aW !== 'auto') {
    return isNaN(Number(aW)) ? aW : `${aW}px`;
  }
  return undefined;
});

const hasExplicitWidth = computed(() => {
  return (!!props.node.styleObj?.width && props.node.styleObj.width !== '100%' && props.node.styleObj.width !== 'auto') || !!attrWidth.value;
});

const rawWidth = computed(() => {
  if (props.node.styleObj?.width && props.node.styleObj.width !== 'auto') {
    return props.node.styleObj.width;
  }
  return attrWidth.value;
});

const isFullWidth = computed(() => {
  return (rawWidth.value === '100%' || rawWidth.value?.startsWith('100%')) || (!hasExplicitWidth.value && !hasExplicitHeight.value);
});

const effectiveImgMode = computed(() => {
  return (props.node.attrs?.mode as any) ||
    (props.imageCropMode && props.imageCropMode !== 'auto' ? props.imageCropMode : null) ||
    (props.imageCropRatio ? 'aspectFill' : null) ||
    (hasExplicitWidth.value && hasExplicitHeight.value ? 'aspectFill' : null) ||
    (hasExplicitHeight.value && !hasExplicitWidth.value ? 'heightFix' : 'widthFix');
});

const effectiveImgHeight = computed(() => {
  if (props.imageCropRatio) return '100%';
  if (effectiveImgMode.value === 'widthFix') return undefined;
  return rawHeight.value;
});

const effectiveImgWidth = computed(() => {
  if (effectiveImgMode.value === 'heightFix') return 'auto';
  if (isFullWidth.value) return '100%';
  return rawWidth.value || 'auto';
});

function imageWrapStyle(node: ASTNode): Record<string, any> {
  const src = node.attrs?.src || node.attrs?.['data-src'] || '';
  const isLoaded = loadedImages.value.has(src);
  const isError = errorImages.value.has(src);
  const dataRatio = node.extra?.dataRatio;
  const placeholderHeight = node.extra?.placeholderHeight;
  const aspectRatio = node.extra?.aspectRatio;
  const effectiveHref = props.parentLinkHref || node.attrs?.href || node.attrs?.['data-href'];

  const style: Record<string, any> = {
    position: 'relative',
    display: node.styleObj?.display || (isFullWidth.value ? 'block' : 'inline-block'),
    verticalAlign: 'middle',
    width: effectiveImgMode.value === 'heightFix' ? 'auto' : (isFullWidth.value ? '100%' : (rawWidth.value || undefined)),
    height: effectiveImgMode.value === 'heightFix' ? effectiveImgHeight.value : (hasExplicitWidth.value && hasExplicitHeight.value ? effectiveImgHeight.value : undefined),
    maxWidth: node.styleObj?.maxWidth || node.styleObj?.['max-width'] || '100%',
    maxHeight: node.styleObj?.maxHeight || node.styleObj?.['max-height'] || undefined,
    minWidth: '0',
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: node.styleObj?.borderRadius,
    margin: node.styleObj?.margin,
    flex: node.styleObj?.flex,
    cursor: effectiveHref ? 'pointer' : undefined,
    backgroundColor: (props.imageSkeleton && !isLoaded && !isError)
      ? (props.theme.imageSkeletonColor || '#f1f5f9')
      : 'transparent'
  };

  if (props.imageCropRatio) {
    style.aspectRatio = String(props.imageCropRatio);
  } else if (aspectRatio && isFullWidth.value && effectiveImgMode.value === 'widthFix') {
    style.aspectRatio = String(aspectRatio);
  } else if (!isLoaded) {
    if (placeholderHeight) {
      style.paddingBottom = placeholderHeight;
      style.height = 0;
    } else if (dataRatio) {
      style.paddingBottom = `${(dataRatio * 100).toFixed(2)}%`;
      style.height = 0;
    }
  }
  return style;
}

function imageStyle(node: ASTNode): Record<string, any> {
  const src = node.attrs?.src || node.attrs?.['data-src'] || '';
  const isLoaded = loadedImages.value.has(src);
  const cleanStyle = { ...(node.styleObj || {}) };
  delete cleanStyle.height;
  delete cleanStyle.width;
  delete cleanStyle.display;

  return {
    ...cleanStyle,
    width: effectiveImgWidth.value,
    height: effectiveImgHeight.value,
    maxWidth: node.styleObj?.maxWidth || node.styleObj?.['max-width'] || '100%',
    maxHeight: node.styleObj?.maxHeight || node.styleObj?.['max-height'] || undefined,
    display: 'block',
    boxSizing: 'border-box',
    opacity: (isLoaded || !props.imageSkeleton) ? 1 : 0,
    transition: 'opacity 0.25s ease-in-out'
  };
}

function handleImageTap(node: ASTNode) {
  const src = node.attrs?.src || node.attrs?.['data-src'] || '';
  const effectiveHref = props.parentLinkHref || node.attrs?.href || node.attrs?.['data-href'];
  if (effectiveHref && props.imageLinkAction !== 'preview') {
    emit('linkTap', effectiveHref, node);
    if (props.imageLinkAction === 'both') {
      emit('imageTap', src, node.extra?.galleryIndex ?? 0, node);
    }
  } else {
    emit('imageTap', src, node.extra?.galleryIndex ?? 0, node);
  }
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

// ---- SVG ForeignObject & Standard SVG ----
const isSvgForeign = computed(() => props.node.name === 'svg' && hasForeignObject(props.node));

const svgForeignData = computed(() => {
  if (!isSvgForeign.value) return null;
  const { bgSvgXml, foreignObjectNodes } = splitSvgForeignObject(props.node);
  const vbRatio = extractSvgViewBoxRatio(props.node);
  const bgDataUri = bgSvgXml ? `data:image/svg+xml;utf8,${encodeURIComponent(bgSvgXml)}` : undefined;
  const rawW = props.node.styleObj?.width || (props.node.attrs?.width ? `${props.node.attrs.width}px` : '100%');
  const rawH = props.node.styleObj?.height || (props.node.attrs?.height ? `${props.node.attrs.height}px` : undefined);
  return { bgSvgXml, bgDataUri, foreignObjectNodes, vbRatio, rawW, rawH };
});

const standardSvgXml = computed(() => {
  if (props.node.name !== 'svg' || isSvgForeign.value) return '';
  return serializeSvgToXml(props.node);
});

const standardSvgUri = computed(() => {
  if (!standardSvgXml.value) return '';
  return `data:image/svg+xml;utf8,${encodeURIComponent(standardSvgXml.value)}`;
});

const standardSvgVbRatio = computed(() => {
  if (props.node.name !== 'svg') return undefined;
  return extractSvgViewBoxRatio(props.node);
});

const standardSvgWidth = computed(() => {
  if (props.node.name !== 'svg') return undefined;
  let attrW = props.node.attrs?.width
    ? (isNaN(Number(props.node.attrs.width)) ? props.node.attrs.width : `${props.node.attrs.width}px`)
    : undefined;
  const attrH = props.node.attrs?.height;
  if (!attrW && !attrH && props.node.attrs?.viewbox) {
    const parts = props.node.attrs.viewbox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
      if (parts[2] <= 64 && parts[3] <= 64) {
        attrW = `${parts[2]}px`;
      }
    }
  }
  return props.node.styleObj?.width || attrW;
});

const standardSvgHeight = computed(() => {
  if (props.node.name !== 'svg') return undefined;
  const attrW = props.node.attrs?.width;
  let attrH = props.node.attrs?.height
    ? (isNaN(Number(props.node.attrs.height)) ? props.node.attrs.height : `${props.node.attrs.height}px`)
    : undefined;
  if (!attrW && !attrH && props.node.attrs?.viewbox) {
    const parts = props.node.attrs.viewbox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
      if (parts[2] <= 64 && parts[3] <= 64) {
        attrH = `${parts[3]}px`;
      }
    }
  }
  return props.node.styleObj?.height || attrH;
});

// ---- SVG Carousel Slide Tap ----
function handleSlideTap(slide: { src: string; href?: string; title?: string }, node: ASTNode) {
  emit('nodeEvent', 'tap', node);
  if (slide.href) {
    emit('linkTap', slide.href, node);
  }
  emit('imageTap', slide.src, 0, node);
}

// ---- SVG Code Block & Dual Mode Preview ----
const isSvgCodeBlock = computed(() => !!props.node.extra?.isSvgCodeBlock);
const rawSvgCode = computed(() => props.node.extra?.rawSvgCode);
const codeLangLabel = computed(() => {
  return isSvgCodeBlock.value
    ? '🎨 XML / SVG'
    : (props.node.extra?.lang || 'CODE').toUpperCase();
});
const showSvgPreview = ref(false);
const svgCodeDataUri = computed(() => {
  return rawSvgCode.value
    ? `data:image/svg+xml;utf8,${encodeURIComponent(rawSvgCode.value)}`
    : undefined;
});

function extractRawText(node: ASTNode): string {
  if (node.type === 'text') return node.text || '';
  if (!node.children || node.children.length === 0) return '';
  return node.children.map(extractRawText).join('');
}

function handleCopyCode() {
  const textToCopy = rawSvgCode.value || extractRawText(props.node);
  if (textToCopy) {
    if (typeof uni !== 'undefined' && uni.setClipboardData) {
      uni.setClipboardData({
        data: textToCopy,
        success: () => {
          uni.showToast({ title: '代码已复制', icon: 'none' });
        }
      });
    }
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

function onLongPress() {
  const text = props.node.text || '';
  if (text) emit('longPressText', text, props.node);
}

function onNodeTap(e: any) {
  emit('nodeEvent', 'tap', props.node, e);
}
</script>
