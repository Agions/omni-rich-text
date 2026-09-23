import React, { useState, useCallback, useMemo } from 'react';
import { UniversalRichText } from 'omni-rich-text/taro';
import { parseRichContent } from 'omni-rich-text/core';
import { HTML_DEMO, MARKDOWN_DEMO, XSS_DEMO } from './mock-data';

interface LogItem {
  id: string;
  time: string;
  type: 'LINK' | 'IMAGE' | 'ROUTER' | 'CLIPBOARD' | 'XSS';
  title: string;
  detail: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'html' | 'markdown' | 'xss' | 'custom'>('html');
  const [customContent, setCustomContent] = useState('<h3>自定义测试</h3><p>可随意输入 HTML 或 Markdown 进行渲染验证。</p>');
  const [simulatedPlatform, setSimulatedPlatform] = useState<'wechat' | 'alipay' | 'h5'>('wechat');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [activeModal, setActiveModal] = useState<{ title: string; content: string; onConfirm: () => void } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const addLog = useCallback((type: LogItem['type'], title: string, detail: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Math.random().toString(), time, type, title, detail }, ...prev.slice(0, 20)]);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Current content string
  const currentContent = useMemo(() => {
    if (activeTab === 'html') return HTML_DEMO;
    if (activeTab === 'markdown') return MARKDOWN_DEMO;
    if (activeTab === 'xss') return XSS_DEMO;
    return customContent;
  }, [activeTab, customContent]);

  const currentFormat = activeTab === 'markdown' ? 'markdown' : 'html';

  // Real-time AST calculation for inspector
  const parsedAST = useMemo(() => {
    return parseRichContent(currentContent, { format: currentFormat });
  }, [currentContent, currentFormat]);

  // Handle Link Tap
  const handleLinkTap = useCallback((ctx: any) => {
    const { href } = ctx;
    addLog('LINK', `触发 onLinkTap 拦截`, `目标地址: ${href}`);

    // Simulate smart routing feedback in device simulator
    if (href.startsWith('/pages/home')) {
      addLog('ROUTER', '识别为 TabBar 路由', '调用 switchTab() 切换至首页');
      showToast('已切换 TabBar 首页 (/pages/home/index)');
      return false; // prevent default to simulate in-place
    }

    if (href.startsWith('/pages/')) {
      addLog('ROUTER', '识别为小程序内部页面', `调用 navigateTo({ url: "${href}" })`);
      showToast(`已推入新页面: ${href}`);
      return false;
    }

    if (/^https?:\/\//i.test(href)) {
      if (simulatedPlatform === 'h5') {
        addLog('ROUTER', 'H5 外链直跳', `在新窗口打开: ${href}`);
        showToast(`H5 已打开外链: ${href}`);
      } else {
        addLog('CLIPBOARD', '小程序外链降级触发', `弹窗提示复制链接`);
        setActiveModal({
          title: '外部链接提示',
          content: `当前运行在【${simulatedPlatform === 'wechat' ? '微信小程序' : '支付宝小程序'}】环境中。\n\n小程序无法直接打开外部域名，是否复制该链接到系统剪贴板？\n\n${href}`,
          onConfirm: () => {
            navigator.clipboard?.writeText(href);
            addLog('CLIPBOARD', '复制成功', `链接已写入剪贴板: ${href}`);
            showToast('✅ 链接已成功复制到剪贴板！');
            setActiveModal(null);
          }
        });
      }
      return false;
    }
  }, [addLog, showToast, simulatedPlatform]);

  // Handle Image Tap
  const handleImageTap = useCallback((payload: { src: string; index: number }) => {
    addLog(
      'IMAGE',
      `触发 onImageTap (第 ${payload.index + 1} 张)`,
      `平台驱动: ${simulatedPlatform.toUpperCase()} | 预览参数: current=${payload.src}`
    );
    showToast(`调起图片预览: 图 ${payload.index + 1} / ${parsedAST.galleryList.length}`);
  }, [addLog, showToast, simulatedPlatform, parsedAST.galleryList.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f0f2f5' }}>
      {/* Top Header */}
      <header style={{ height: 60, backgroundColor: '#001529', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 'bold' }}>🚀 Universal Rich Text</span>
          <span style={{ fontSize: 12, backgroundColor: '#1890ff', padding: '2px 8px', borderRadius: 10 }}>UniApp + Taro 双兼容实测</span>
        </div>

        {/* Platform Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: '#aaa' }}>当前模拟运行端：</span>
          <button
            onClick={() => { setSimulatedPlatform('wechat'); addLog('ROUTER', '切换环境', '当前模拟: 微信小程序 (MP-WEIXIN)'); }}
            style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: simulatedPlatform === 'wechat' ? '#07c160' : '#223246', color: '#fff' }}
          >
            🟢 微信小程序
          </button>
          <button
            onClick={() => { setSimulatedPlatform('alipay'); addLog('ROUTER', '切换环境', '当前模拟: 支付宝小程序 (MP-ALIPAY)'); }}
            style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: simulatedPlatform === 'alipay' ? '#1677ff' : '#223246', color: '#fff' }}
          >
            🔵 支付宝小程序
          </button>
          <button
            onClick={() => { setSimulatedPlatform('h5'); addLog('ROUTER', '切换环境', '当前模拟: 移动端 H5 视口'); }}
            style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: simulatedPlatform === 'h5' ? '#722ed1' : '#223246', color: '#fff' }}
          >
            🟣 移动端 H5
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 20, gap: 20 }}>
        {/* Left: Device Simulator */}
        <div style={{ width: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 }}>
            📱 真机效果模拟预览 ({simulatedPlatform === 'wechat' ? '微信小程序' : simulatedPlatform === 'alipay' ? '支付宝' : 'H5'})
          </div>

          {/* Phone Shell */}
          <div
            style={{
              width: 375,
              height: 680,
              backgroundColor: '#fff',
              borderRadius: 36,
              boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
              border: '10px solid #1f1f1f',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Phone Notch */}
            <div style={{ height: 28, backgroundColor: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ width: 120, height: 16, backgroundColor: '#1f1f1f', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }} />
            </div>

            {/* Navigation Bar */}
            <div style={{ height: 44, backgroundColor: '#fcfcfc', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, position: 'relative' }}>
              <span>文章详情</span>
              <div style={{ position: 'absolute', right: 12, fontSize: 12, color: '#999' }}>•••</div>
            </div>

            {/* Scrollable Rich Text Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', position: 'relative' }}>
              <UniversalRichText
                content={currentContent}
                format={currentFormat}
                tabBarList={['/pages/home/index']}
                onLinkTap={handleLinkTap}
                onImageTap={handleImageTap}
              />
            </div>

            {/* Device Toast Notification */}
            {toastMessage && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 50,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  zIndex: 1000,
                  maxWidth: '80%',
                  textAlign: 'center'
                }}
              >
                {toastMessage}
              </div>
            )}

            {/* Device Simulated Modal Dialog */}
            {activeModal && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  zIndex: 2000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24
                }}
              >
                <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>{activeModal.title}</div>
                  <div style={{ fontSize: 13, color: '#666', whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 20, wordBreak: 'break-all' }}>
                    {activeModal.content}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setActiveModal(null)}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d9d9d9', backgroundColor: '#fff', cursor: 'pointer' }}
                    >
                      取消
                    </button>
                    <button
                      onClick={activeModal.onConfirm}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', backgroundColor: '#07c160', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      复制并继续
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controller, AST Inspector & Event Console */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          {/* Controls Tab */}
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>测试场景：</span>
            <button
              onClick={() => setActiveTab('html')}
              style={{ padding: '6px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'html' ? '#1890ff' : '#f5f5f5', color: activeTab === 'html' ? '#fff' : '#333' }}
            >
              📄 综合产品图文 (HTML)
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              style={{ padding: '6px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'markdown' ? '#1890ff' : '#f5f5f5', color: activeTab === 'markdown' ? '#fff' : '#333' }}
            >
              📝 技术文档 (Markdown)
            </button>
            <button
              onClick={() => setActiveTab('xss')}
              style={{ padding: '6px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'xss' ? '#ff4d4f' : '#f5f5f5', color: activeTab === 'xss' ? '#fff' : '#333' }}
            >
              🛡️ XSS 防御与容错测试
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              style={{ padding: '6px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'custom' ? '#1890ff' : '#f5f5f5', color: activeTab === 'custom' ? '#fff' : '#333' }}
            >
              ✏️ 自定义输入测试
            </button>
          </div>

          {/* Custom Editor (if active) */}
          {activeTab === 'custom' && (
            <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#666' }}>实时输入富文本或 Markdown：</div>
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                style={{ height: 100, padding: 8, fontFamily: 'monospace', borderRadius: 4, border: '1px solid #d9d9d9' }}
              />
            </div>
          )}

          {/* Lower Split: Event Console & AST Summary */}
          <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden' }}>
            {/* Event Console */}
            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 'bold', fontSize: 14, color: '#333' }}>⚡ 实时事件监听面板 (Event Console)</span>
                <button onClick={() => setLogs([])} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer' }}>清空日志</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#999', textAlign: 'center', marginTop: 40 }}>在真机屏幕中点击链接或图片，实时事件将在此捕获</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} style={{ padding: '8px 10px', backgroundColor: '#fafafa', borderRadius: 6, borderLeft: `4px solid ${log.type === 'LINK' ? '#1890ff' : log.type === 'IMAGE' ? '#52c41a' : log.type === 'ROUTER' ? '#722ed1' : '#fa8c16'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 2 }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>[{log.type}] {log.title}</span>
                        <span>{log.time}</span>
                      </div>
                      <div style={{ color: '#555', wordBreak: 'break-all' }}>{log.detail}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AST Inspector */}
            <div style={{ width: 340, backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: 12, fontFamily: 'monospace' }}>
              <div style={{ color: '#4ec9b0', fontWeight: 'bold', marginBottom: 8 }}>
                🌳 Core AST 统计与结构
              </div>
              <div style={{ color: '#9cdcfe', marginBottom: 8, borderBottom: '1px solid #333', paddingBottom: 6 }}>
                <div>根节点数: {parsedAST.ast.length}</div>
                <div>提取图片画廊数: {parsedAST.galleryList.length} 张</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(parsedAST.ast.slice(0, 3), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
