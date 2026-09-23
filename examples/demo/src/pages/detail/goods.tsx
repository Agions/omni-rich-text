import { View, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

export default function GoodsDetail() {
  const router = useRouter()

  return (
    <View style={{ padding: 24, textAlign: 'center' }}>
      <View style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        🛍️ 商品详情页
      </View>
      <View style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
        成功从小程序富文本中的超链接通过 <code>navigateTo</code> 路由跳转至本页面！
      </View>
      <View style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        接收到的路由参数: {JSON.stringify(router.params)}
      </View>
      <Button
        type="primary"
        onClick={() => Taro.navigateBack()}
      >
        返回上一页
      </Button>
    </View>
  )
}
