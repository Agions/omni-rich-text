
import { WebView } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

export default function WebViewPage() {
  const router = useRouter()
  const rawUrl = router.params.url ? decodeURIComponent(router.params.url) : 'https://github.com'

  return <WebView src={rawUrl} />
}
