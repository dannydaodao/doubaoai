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
    wx.showLoading({ title: '获取下载通道...', mask: true });

    wx.cloud.callFunction({
      name: 'doubaoai',
      data: {
        action: 'proxy_download',
        url: url
      },
      success: (res: any) => {
        if (res.result && res.result.code === 200 && res.result.fileID) {
          const fileID = res.result.fileID;
          
          wx.showLoading({ title: '下载到手机...', mask: true });
          
          wx.cloud.downloadFile({
            fileID: fileID,
            success: (dlRes) => {
              if (dlRes.statusCode === 200) {
                wx.saveVideoToPhotosAlbum({
                  filePath: dlRes.tempFilePath,
                  success: () => {
                    wx.hideLoading();
                    wx.showToast({ title: '保存成功！', icon: 'success' });
                  },
                  fail: () => {
                    wx.hideLoading();
                    wx.showToast({ title: '保存失败或未授权', icon: 'none' });
                  }
                });
              } else {
                wx.hideLoading();
                wx.showToast({ title: '下载失败', icon: 'none' });
              }
              wx.cloud.callFunction({
                name: 'doubaoai',
                data: { action: 'delete_file', fileID: fileID }
              }).catch(console.error);
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '云端下载失败', icon: 'none' });
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({ title: '代理下载失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '请求代理失败', icon: 'none' });
      }
    });
  }
});
