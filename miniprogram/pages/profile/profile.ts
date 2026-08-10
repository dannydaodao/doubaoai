// pages/profile/profile.ts
const app = getApp<any>();

Page({
  data: {
    historyCount: 0
  },

  onShow() {
    const list = app.getHistory();
    this.setData({
      historyCount: list.length
    });
  },

  navToWatermark() {
    wx.navigateTo({
      url: '/pages/watermark/watermark'
    });
  },

  navToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  clearStorage() {
    wx.showModal({
      title: '提示',
      content: '确定要清理本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '缓存已清理', icon: 'success' });
        }
      }
    });
  }
});
