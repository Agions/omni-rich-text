export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/about/index',
    'pages/detail/goods',
    'pages/webview/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#001529',
    navigationBarTitleText: 'Universal Rich Text',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#8a8a8a',
    selectedColor: '#1890ff',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页'
      },
      {
        pagePath: 'pages/about/index',
        text: '关于'
      }
    ]
  }
})
