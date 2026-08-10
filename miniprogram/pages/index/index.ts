// pages/index/index.ts
Page({
  data: {},

  onLoad() {},

  /**
   * 点击"视频去水印"卡片直达去水印明细页
   */
  navToWatermark() {
    wx.navigateTo({
      url: '/pages/watermark/watermark'
    });
  },

  /**
   * 点击未开发工具提示"功能开发中，敬请期待"
   */
  onDevTool(e: any) {
    const name = e.currentTarget.dataset.name || '该功能';
    wx.showToast({
      title: `${name}开发中，敬请期待`,
      icon: 'none'
    });
  }
});
