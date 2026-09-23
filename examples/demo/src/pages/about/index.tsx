
import { View } from '@tarojs/components'
import { UniversalRichText } from 'omni-rich-text/taro'

const ABOUT_MD = `
# 🛠️ Universal Rich Text 架构特性

本组件库专为解决 UniApp 与 Taro 生态下富文本交互痛点设计：

- **完全自研 Virtual DOM 递归树**：抛弃原生 rich-text 的黑盒局限
- **全节点事件代理**：超链接、图片、视频、音频均可精准拦截
- **Smart Link 智能路由**：自动区分 TabBar、内部页与外部外链
- **有序图片画廊**：抹平多端 previewImage 参数差异，支持连续切图
- **AST 展平与防爆栈**：深度超过 8 层自动扁平化，杜绝小程序白屏
`

export default function AboutPage() {
  return (
    <View style={{ padding: 16, backgroundColor: '#f7f8fa', minHeight: '100vh', boxSizing: 'border-box' }}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          padding: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <UniversalRichText
          content={ABOUT_MD}
          format="markdown"
          onLinkTap={(ctx) => console.log('About link tapped:', ctx.href)}
        />
      </View>
    </View>
  )
}
