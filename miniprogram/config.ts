/**
 * 斗宝Ai助手 - 去水印小程序核心配置文件
 */
export const CONFIG = {
  // 小程序基础配置
  APP_NAME: '斗宝Ai助手',
  
  // 自定义后端 API 地址（已接入微信原生云函数 doubaoai，无需自建 HTTP 服务器）
  CUSTOM_API_SERVER: '',

  // 支持的平台列表
  SUPPORTED_PLATFORMS: [
    '抖音',
    '小红书',
    '快手',
    'B站',
    '微视',
    '西瓜视频',
    '皮皮虾'
  ]
};
