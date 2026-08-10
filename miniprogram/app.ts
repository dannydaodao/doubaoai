// app.ts
import { ParseResult } from './utils/parser';

export interface IAppOption {
  globalData: {
    historyList: ParseResult[];
    autoRecognizeLink: boolean;
    currentParseItem: ParseResult | null;
  };
  addHistory: (item: ParseResult) => void;
  getHistory: () => ParseResult[];
}

App<IAppOption>({
  globalData: {
    historyList: [],
    autoRecognizeLink: true,
    currentParseItem: null
  },
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      });
    }

    const history = wx.getStorageSync('watermark_history') || [];
    this.globalData.historyList = history;

    const autoRec = wx.getStorageSync('auto_recognize_link');
    if (autoRec !== '') {
      this.globalData.autoRecognizeLink = !!autoRec;
    }
  },
  addHistory(item: ParseResult) {
    const list = this.globalData.historyList;
    // 过滤重复链接
    const filtered = list.filter(h => h.url !== item.url);
    filtered.unshift(item);
    // 只保留最新 30 条记录
    const updated = filtered.slice(0, 30);
    this.globalData.historyList = updated;
    wx.setStorageSync('watermark_history', updated);
  },
  getHistory() {
    return this.globalData.historyList;
  }
});