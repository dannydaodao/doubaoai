const puppeteer = require('puppeteer');

async function testParse() {
  console.log('Testing Puppeteer WeChat Channels parse locally...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
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

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.WeixinJSBridge = {
      invoke: function(name, opt, cb) { if (cb) cb({ err_msg: name + ':ok' }); },
      on: function() {},
      call: function() {}
    };
  });

  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38 NetType/WIFI Language/zh_CN';
  await page.setUserAgent(ua);
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  let parsedResult = null;

  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json && json.data && json.data.feedInfo) {
          const fi = json.data.feedInfo;
          const ai = json.data.authorInfo || {};

          const str = JSON.stringify(fi);
          const allUrls = str.match(/https?:[\\/]+finder\.video\.qq\.com[\\/]+[^\s"']+/gi) || [];

          let videoUrl = allUrls.find(url => url.includes('token=')) || '';
          let coverUrl = fi.coverUrl || allUrls.find(url => !url.includes('token=')) || '';

          if (videoUrl) {
            videoUrl = videoUrl.replace(/\\/g, '');
            coverUrl = coverUrl.replace(/\\/g, '');
            const title = fi.description || `${ai.nickname || '视频号'}的作品`;

            parsedResult = {
              platform: '视频号',
              title,
              videoUrl,
              coverUrl,
              transcript: title,
              author: ai.nickname || '视频号作者'
            };
          }
        }
      } catch (e) {
        console.error('Error parsing response:', e);
      }
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});

  let waited = 0;
  while (!parsedResult && waited < 6000) {
    await new Promise(r => setTimeout(r, 300));
    waited += 300;
  }

  console.log('Result:', JSON.stringify(parsedResult, null, 2));
  await browser.close();
}

testParse();
