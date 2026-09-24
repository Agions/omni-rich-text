import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseRichContent,
  clearASTCache,
  getASTCacheSize,
  LRUCache,
  calculateImageDimensions
} from '../index';

describe('AST LRU Cache & Performance', () => {
  beforeEach(() => {
    clearASTCache();
  });

  it('LRUCache class should set, get, update, and evict least recently used items', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size).toBe(3);
    expect(cache.get('a')).toBe(1);

    // Now 'b' is least recently used. Adding 'd' should evict 'b'
    cache.set('d', 4);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
    expect(cache.size).toBe(3);
  });

  it('parseRichContent should cache results and return identical AST on subsequent calls', () => {
    const html = '<div class="content"><p>缓存性能测试段落</p></div>';

    expect(getASTCacheSize()).toBe(0);

    const res1 = parseRichContent(html);
    expect(getASTCacheSize()).toBe(1);

    const res2 = parseRichContent(html);
    // Identity check (same reference returned from cache)
    expect(res1).toBe(res2);
    expect(getASTCacheSize()).toBe(1);
  });

  it('parseRichContent should differentiate cache keys when parse options change', () => {
    const html = '<div style="font-size: 22px;">选项缓存测试</div>';

    const res1 = parseRichContent(html, { baseFontSize: 15 });
    const res2 = parseRichContent(html, { baseFontSize: 18 });

    expect(getASTCacheSize()).toBe(2);
    expect(res1).not.toBe(res2);
    expect(res1.ast[0].styleObj['font-size']).not.toBe(res2.ast[0].styleObj['font-size']);
  });

  it('options.cache = false should bypass cache and not write to cache', () => {
    const html = '<p>禁用缓存测试</p>';

    const res1 = parseRichContent(html, { cache: false });
    expect(getASTCacheSize()).toBe(0);

    const res2 = parseRichContent(html, { cache: false });
    expect(getASTCacheSize()).toBe(0);
    expect(res1).not.toBe(res2); // New instance each time
  });
});

describe('Image Aspect Ratio & CLS Dimensions', () => {
  it('should calculate aspect ratio and placeholder height from data-ratio', () => {
    const dims = calculateImageDimensions({ 'data-ratio': '0.5625' });
    expect(dims.dataRatio).toBe(0.5625);
    expect(dims.placeholderHeight).toBe('56.25%');
    expect(dims.aspectRatio).toBe(1.7778);
  });

  it('should calculate aspect ratio from data-w and data-h', () => {
    const dims = calculateImageDimensions({ 'data-w': '1080', 'data-h': '720' });
    expect(dims.dataRatio).toBeCloseTo(0.6667, 3);
    expect(dims.aspectRatio).toBe(1.5);
    expect(dims.placeholderHeight).toBe('66.67%');
  });

  it('should calculate aspect ratio from width and height attributes or style', () => {
    const dims1 = calculateImageDimensions({ width: '400', height: '300' });
    expect(dims1.aspectRatio).toBeCloseTo(1.3333, 3);

    const dims2 = calculateImageDimensions({}, { width: '800px', height: '400px' });
    expect(dims2.aspectRatio).toBe(2);
  });

  it('parseRichContent should automatically attach aspectRatio to img nodes', () => {
    const html = '<img src="https://example.com/pic.jpg" data-w="1200" data-h="600" />';
    const res = parseRichContent(html);
    const imgNode = res.ast[0];
    expect(imgNode.extra?.aspectRatio).toBe(2);
    expect(imgNode.extra?.placeholderHeight).toBe('50.00%');
  });
});
