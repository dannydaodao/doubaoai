// pages/history/history.ts
import { ParseResult } from '../../utils/parser';

const app = getApp<any>();

Page({
  data: {
    historyList: [] as ParseResult[]
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const list = app.getHistory();
    this.setData({
      historyList: list
    });
  },

  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有解析历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.historyList = [];
          wx.removeStorageSync('watermark_history');
          this.setData({ historyList: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  copyVideoLink(e: any) {
    const url = e.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
  },

  saveToAlbum(e: any) {
    const url = e.currentTarget.dataset.url;
    wx.showLoading({ title: '正在下载...', mask: true });

    wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '保存成功！', icon: 'success' });
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  }
});
