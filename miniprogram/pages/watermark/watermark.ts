// pages/watermark/watermark.ts
import { parseVideoLink, extractUrl, ParseResult } from '../../utils/parser';

const app = getApp<any>();

Page({
  data: {
    linkText: '',
    parsing: false,
    autoRecognize: true,
    activeTab: 'video', // 'video' | 'transcript'
    parsedResult: null as ParseResult | null
  },

  onLoad() {
    this.setData({
      autoRecognize: app.globalData.autoRecognizeLink ?? true
    });
  },

  onShow() {
    // 如果开启了自动识别链接，自动检测剪贴板
    if (this.data.autoRecognize && !this.data.linkText) {
      this.checkClipboardData();
    }
  },

  /**
   * 自动检测剪贴板中的短链接
   */
  checkClipboardData() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data || '';
        const extracted = extractUrl(text);
        if (extracted && extracted !== this.data.linkText) {
          this.setData({
            linkText: text
          });
        }
      }
    });
  },

  /**
   * 输入框绑定
   */
  onInputLink(e: any) {
    this.setData({
      linkText: e.detail.value
    });
  },

  /**
   * 点击"粘贴链接"按钮
   */
  pasteClipboard() {
    wx.getClipboardData({
      success: (res) => {
        if (res.data) {
          this.setData({
            linkText: res.data
          });
          wx.showToast({
            title: '已粘贴',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '剪贴板为空',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 清除输入框
   */
  clearInput() {
    this.setData({
      linkText: '',
      parsedResult: null
    });
  },

  /**
   * 切换自动识别开关
   */
  toggleAutoRecognize() {
    const nextVal = !this.data.autoRecognize;
    this.setData({
      autoRecognize: nextVal
    });
    app.globalData.autoRecognizeLink = nextVal;
    wx.setStorageSync('auto_recognize_link', nextVal);
  },

  /**
   * 导航至历史记录
   */
  navToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  /**
   * 切换 Tab (视频/文案)
   */
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  /**
   * 点击核心"解析"按钮（纯粹调用微信原生云函数 doubaoai 进行真实去水印解析）
   */
  handleParse() {
    const { linkText } = this.data;
    if (!linkText.trim()) {
      wx.showToast({
        title: '请先输入或粘贴作品链接',
        icon: 'none'
      });
      return;
    }

    this.setData({ parsing: true });

    // 纯粹调用微信原生云函数 doubaoai (云函数内连自建阿里云服务器 118.31.126.20:8080)
    wx.cloud.callFunction({
      name: 'doubaoai',
      data: { url: linkText },
      success: (res: any) => {
        if (res.result && res.result.code === 200 && res.result.data) {
          const result = res.result.data;

          // 写入全局解析历史
          app.addHistory(result);

          // 极速秒级呈现解析结果 (0秒前置等待)
          this.setData({
            parsing: false,
            parsedResult: result,
            activeTab: 'video'
          });

          wx.showToast({
            title: '解析成功',
            icon: 'success'
          });

        } else {
          this.setData({ parsing: false });
          wx.showToast({
            title: res.result?.msg || '解析失败，请检查链接',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('云函数 doubaoai 调用失败:', err);
        this.setData({ parsing: false });
        wx.showToast({
          title: '云函数未就绪，请先右键部署',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 自动保存视频到手机相册
   */
  autoSaveToAlbum(videoUrl: string) {
    this.downloadAndSaveVideo(videoUrl);
  },

  /**
   * 核心功能：下载视频并保存到手机相册 (微信小程序 Save to Photos Album API)
   */
  saveVideoToAlbum() {
    if (!this.data.parsedResult || !this.data.parsedResult.videoUrl) {
      wx.showToast({
        title: '无可保存视频',
        icon: 'none'
      });
      return;
    }
    this.downloadAndSaveVideo(this.data.parsedResult.videoUrl);
  },

  downloadAndSaveVideo(url: string) {
    if (url.startsWith(wx.env.USER_DATA_PATH) || url.startsWith('wxfile://')) {
      this.saveVideoFileToAlbum(url);
      return;
    }

    wx.showLoading({
      title: '正在保存视频 0%',
      mask: true
    });

    const downloadTask = wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          this.saveVideoFileToAlbum(res.tempFilePath);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '视频下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('Download video fail:', err);
        wx.showToast({
          title: '网络下载错误',
          icon: 'none'
        });
      }
    });

    downloadTask.onProgressUpdate((progressRes) => {
      wx.showLoading({
        title: `正在保存视频 ${progressRes.progress}%`,
        mask: true
      });
    });
  },

  /**
   * 写入相册并处理系统权限授权 (自动修复无 .mp4 后缀问题)
   */
  saveVideoFileToAlbum(tempFilePath: string) {
    let savePath = tempFilePath;

    // 核心修补：微信相册要求保存路径必须以 .mp4 或 .mov 结尾
    if (!savePath.toLowerCase().endsWith('.mp4') && !savePath.toLowerCase().endsWith('.mov')) {
      try {
        const fs = wx.getFileSystemManager();
        const targetPath = `${wx.env.USER_DATA_PATH}/video_${Date.now()}.mp4`;
        fs.copyFileSync(tempFilePath, targetPath);
        savePath = targetPath;
      } catch (e) {
        console.error('File rename copy error:', e);
      }
    }

    wx.saveVideoToPhotosAlbum({
      filePath: savePath,
      success: () => {
        wx.hideLoading();
        wx.showToast({
          title: '已保存到手机相册！',
          icon: 'success',
          duration: 2500
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('Save video failed:', err);
        // 如果因为用户未授权相册权限失败，弹窗指引用户开启授权
        if (err.errMsg && (err.errMsg.includes('auth deny') || err.errMsg.includes('auth denied'))) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存视频需要开启相册写入权限，请在设置中勾选允许保存到相册',
            confirmText: '去设置',
            confirmColor: '#6C5CE7',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: '保存失败，请检查文件格式',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 复制无水印视频链接
   */
  copyVideoUrl() {
    if (!this.data.parsedResult) return;
    wx.setClipboardData({
      data: this.data.parsedResult.videoUrl,
      success: () => {
        wx.showToast({
          title: '无水印链接已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 提取/复制文案
   */
  extractTranscript() {
    this.setData({
      activeTab: 'transcript'
    });
    this.copyTranscript();
  },

  /**
   * 一键复制文案
   */
  copyTranscript() {
    if (!this.data.parsedResult) return;
    wx.setClipboardData({
      data: this.data.parsedResult.transcript,
      success: () => {
        wx.showToast({
          title: '文案已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  }
});
