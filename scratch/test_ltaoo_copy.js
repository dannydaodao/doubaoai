const puppeteer = require('puppeteer-core');

async function testLtaooCopy() {
  console.log('=== 照搬 ltaoo/wx_channels_download 的底层逻辑测试 ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=375,812'
    ]
  });

  const page = await browser.newPage();

  // 1. 模拟 Chrome 112 / iOS 16 Safari 各种标头与 TLS 指纹
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38 NetType/WIFI Language/zh_CN';
  await page.setUserAgent(ua);
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  let resultData = null;

  // 2. 监听微信官方 get_feed_info 接口返回
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json && json.data && json.data.feedInfo) {
          const fi = json.data.feedInfo;
          const ai = json.data.authorInfo || {};
          // 精准读取 H264 1080P MP4 视频直链
          const videoUrl = fi.h264VideoInfo?.videoUrl || fi.videoUrl || '';
          const coverUrl = fi.coverUrl || '';
          const title = fi.description || `${ai.nickname || '视频号'}的作品`;
          resultData = {
            author: ai.nickname,
            title,
            videoUrl,
            coverUrl
          };
          console.log('🔥 成功抓取到 ltaoo/wx_channels_download 提取的核心数据！');
        }
      } catch(e) {}
    }
  });

  console.log('请求微信视频号 URL...');
  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  let waited = 0;
  while (!resultData && waited < 5000) {
    await new Promise(r => setTimeout(r, 200));
    waited += 200;
  }

  if (resultData) {
    console.log('\n=== 照搬 ltaoo 代码解包结果 ===');
    console.log('作者:', resultData.author);
    console.log('标题:', resultData.title);
    console.log('MP4 视频直链 (20302 目录):', resultData.videoUrl.slice(0, 100));
    console.log('JPG 封面直链 (20304 目录):', resultData.coverUrl.slice(0, 100));
  } else {
    console.log('❌ 解包失败');
  }

  await browser.close();
}

testLtaooCopy();
