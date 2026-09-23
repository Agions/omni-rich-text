import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseRichContent,
  parseHtml,
  isAllowedTag,
  isAllowedAttr,
  sanitizeUrl,
  optimizeAST,
  extractGallery,
  chunkAST,
  SmartLinkDispatcher,
  markdownToHtml
} from '../index';
import { PlatformBridge } from '../bridge/platform';

describe('Universal Rich Text Core Engine', () => {
  describe('HTML Parser & Lexer', () => {
    it('parses nested elements into structured AST', () => {
      const html = '<div class="article"><p>Hello <strong>World</strong>!</p></div>';
      const nodes = parseHtml(html);
      expect(nodes.length).toBe(1);
      expect(nodes[0].name).toBe('div');
      expect(nodes[0].attrs.class).toBe('article');
      expect(nodes[0].children?.[0].name).toBe('p');
    });

    it('handles self-closing and void tags gracefully', () => {
      const html = '<p>Line 1<br>Line 2<img src="https://example.com/pic.jpg" alt="test" /></p>';
      const nodes = parseHtml(html);
      const p = nodes[0];
      expect(p.children?.some(c => c.name === 'img')).toBe(true);
      const img = p.children?.find(c => c.name === 'img');
      expect(img?.attrs.src).toBe('https://example.com/pic.jpg');
      expect(img?.attrs.alt).toBe('test');
    });

    it('decodes HTML entities', () => {
      const html = '<p>&lt;div&gt; &amp; &quot;test&quot; &copy;</p>';
      const nodes = parseHtml(html);
      expect(nodes[0].children?.[0].text).toContain('<div> & "test"');
    });

    it('normalizes formatting whitespace while preserving preformatted code', () => {
      const html = `
        <section>
          <section>
            01
          </section>
          <h2>Title</h2>
        </section>
      `;
      const nodes = parseHtml(html);
      expect(nodes.length).toBe(1);
      const outerSection = nodes[0];
      // Should NOT have phantom whitespace text nodes as flex children
      expect(outerSection.children?.length).toBe(2);
      expect(outerSection.children?.[0].children?.[0].text).toBe('01');
      expect(outerSection.children?.[1].children?.[0].text).toBe('Title');

      // Preformatted blocks should preserve indentation and newlines
      const preHtml = '<pre><code>  const x = 1;\n  return x;</code></pre>';
      const preNodes = parseHtml(preHtml);
      const codeNode = preNodes[0].children?.[0];
      expect(codeNode?.children?.[0].text).toBe('  const x = 1;\n  return x;');
    });
  });

  describe('XSS Sanitizer & Whitelist', () => {
    it('strips malicious script tags and inline events', () => {
      const dirtyHtml = '<p>Safe</p><script>alert(1)</script><img src="x" onerror="stealCookie()" />';
      const { ast } = parseRichContent(dirtyHtml);
      expect(ast.some(node => node.name === 'script')).toBe(false);
      const img = ast.find(n => n.name === 'img');
      expect(img?.attrs.onerror).toBeUndefined();
    });

    it('filters out javascript: pseudo-protocol in links and images', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');

      const html = '<a href="javascript:alert(1)">Click me</a>';
      const { ast } = parseRichContent(html);
      expect(ast[0].attrs.href).toBe('');
    });
  });

  describe('CSS Inliner & Responsive Layout', () => {
    it('sets default 100% width for images while preserving other content styles', () => {
      const html = '<img src="https://example.com/demo.png" style="opacity: 0.8" />';
      const { ast } = parseRichContent(html);
      const img = ast[0];
      expect(img.styleStr).toContain('width: 100%');
      expect(img.styleStr).toContain('opacity: 0.8');
    });

    it('allows content inline width to override default width', () => {
      const html = '<img src="https://example.com/demo.png" style="width: 250px" />';
      const { ast } = parseRichContent(html);
      const img = ast[0];
      // 250px converted to rem under WeChat Mini Program rule: (250 * 0.5) / 18.75 = 6.6667rem
      expect(img.styleObj['width']).toBe('6.6667rem');
    });
  });

  describe('AST Flattener & Bounded Depth Optimizer', () => {
    it('flattens nested single inline formatting wrappers and merges inline styles', () => {
      const html = '<p><span style="font-weight: bold;"><em style="font-style: italic;">Bold Italic</em></span></p>';
      const { ast } = parseRichContent(html);
      const p = ast[0];
      expect(p.children?.length).toBe(1);
      // The nested tags are merged into an optimized node
      const target = p.children![0];
      expect(target.styleStr).toContain('font-weight: bold');
      expect(target.styleStr).toContain('font-style: italic');
    });

    it('guards against excessive recursion depth', () => {
      // Create 15-level deeply nested html
      let deepHtml = 'deep text';
      for (let i = 0; i < 15; i++) {
        deepHtml = `<div>${deepHtml}</div>`;
      }
      const nodes = parseHtml(deepHtml);
      const optimized = optimizeAST(nodes, 8);
      // Maximum depth in tree should not exceed 8
      let maxSeenDepth = 0;
      function checkDepth(node: any, depth = 1) {
        if (depth > maxSeenDepth) maxSeenDepth = depth;
        if (node.children) {
          for (const c of node.children) checkDepth(c, depth + 1);
        }
      }
      optimized.forEach(n => checkDepth(n));
      expect(maxSeenDepth).toBeLessThanOrEqual(8);
    });
  });

  describe('Gallery & Image Context Extractor', () => {
    it('extracts all images sequentially with 0-based indices', () => {
      const html = `
        <div>
          <img src="https://a.com/1.jpg" />
          <p>Text</p>
          <img src="https://a.com/2.jpg" />
        </div>
      `;
      const { galleryList, rawImages } = parseRichContent(html);
      expect(galleryList).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
      expect(rawImages.length).toBe(2);
      expect(rawImages[0].index).toBe(0);
      expect(rawImages[1].index).toBe(1);
    });
  });

  describe('Smart Link Dispatcher', () => {
    const mockBridge: PlatformBridge = {
      previewImage: vi.fn(),
      navigateTo: vi.fn(),
      switchTab: vi.fn(),
      setClipboardData: vi.fn(),
      showToast: vi.fn(),
      showModal: vi.fn().mockResolvedValue(true)
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('routes internal pages to navigateTo or switchTab', async () => {
      const dispatcher = new SmartLinkDispatcher(mockBridge, {
        tabBarList: ['/pages/home/index']
      });

      // Regular internal route
      await dispatcher.dispatch({ href: '/pages/detail/index?id=123', node: {} as any });
      expect(mockBridge.navigateTo).toHaveBeenCalledWith({ url: '/pages/detail/index?id=123' });

      // TabBar route
      await dispatcher.dispatch({ href: '/pages/home/index', node: {} as any });
      expect(mockBridge.switchTab).toHaveBeenCalledWith({ url: '/pages/home/index' });
    });

    it('handles external links with clipboard modal fallback in mini program', async () => {
      const dispatcher = new SmartLinkDispatcher(mockBridge);
      await dispatcher.dispatch({ href: 'https://google.com', node: {} as any });

      expect(mockBridge.showModal).toHaveBeenCalled();
      expect(mockBridge.setClipboardData).toHaveBeenCalledWith('https://google.com');
      expect(mockBridge.showToast).toHaveBeenCalledWith('链接已复制到剪贴板');
    });

    it('supports custom onLinkTap interceptor with cancel', async () => {
      const customHook = vi.fn().mockReturnValue(false); // Cancel default
      const dispatcher = new SmartLinkDispatcher(mockBridge, { onLinkTap: customHook });

      await dispatcher.dispatch({ href: 'https://example.com', node: {} as any });
      expect(customHook).toHaveBeenCalled();
      expect(mockBridge.navigateTo).not.toHaveBeenCalled();
      expect(mockBridge.showModal).not.toHaveBeenCalled();
    });
  });

  describe('Markdown & Code Highlighting', () => {
    it('compiles Markdown headings, lists, images and links', () => {
      const md = '# Hello Title\n\n- Item 1\n- Item 2\n\n[Google](https://google.com)';
      const { ast } = parseRichContent(md, { format: 'markdown' });
      expect(ast.some(n => n.name === 'h1')).toBe(true);
      expect(ast.some(n => n.name === 'ul')).toBe(true);
      // Link is inside <p><a>Google</a></p>
      const hasLink = ast.some(n => n.name === 'a' || n.children?.some(c => c.name === 'a'));
      expect(hasLink).toBe(true);
    });

    it('applies syntax highlighting to code blocks', () => {
      const codeBlock = '<pre><code class="language-js">const a = 123; // comment</code></pre>';
      const { ast } = parseRichContent(codeBlock);
      const codeNode = ast[0]?.children?.[0];
      expect(codeNode?.extra?.isCodeBlock).toBe(true);
      expect(codeNode?.children?.length).toBeGreaterThan(0);
    });
  });

  describe('Document Chunker', () => {
    it('chunks large node lists into initial and remaining batches', () => {
      const fakeNodes: any[] = Array.from({ length: 35 }, (_, i) => ({ id: `n_${i}` }));
      const chunked = chunkAST(fakeNodes, { chunkSize: 10 });
      expect(chunked.initial.length).toBe(10);
      expect(chunked.remaining.length).toBe(3); // 10 + 10 + 5
      expect(chunked.totalNodes).toBe(35);
    });
  });

  describe('Custom Component Whitelist & Attributes', () => {
    it('automatically permits custom tags and preserves custom attributes', () => {
      const html = '<product-card title="特惠商品" price="99.00" original-price="199.00" tag="限时抢购" onclick="bad()"></product-card>';
      const { ast } = parseRichContent(html, {
        customTags: ['product-card']
      });

      expect(ast.length).toBe(1);
      const productNode = ast[0];
      expect(productNode.name).toBe('product-card');
      expect(productNode.attrs.title).toBe('特惠商品');
      expect(productNode.attrs.price).toBe('99.00');
      expect(productNode.attrs['original-price']).toBe('199.00');
      expect(productNode.attrs.tag).toBe('限时抢购');
      // Inline onclick event must be stripped
      expect(productNode.attrs.onclick).toBeUndefined();
      expect(productNode.extra?.isCustom).toBe(true);
    });
  });
});
