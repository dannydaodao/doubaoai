const puppeteer = require('puppeteer-core');

async function parseSphPureLocal(sphUrl) {
  console.log('=== Starting 100% Pure Self-Hosted Puppeteer Local Test ===');
  console.log('Target URL:', sphUrl);

  let browser = null;
  let page = null;
  try {
    browser = await puppeteer.launch({
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

    page = await browser.newPage();

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

    let title = '';
    let author = '';
    let coverUrl = '';
    let videoUrl = '';

    page.on('response', async (res) => {
      const u = res.url();
      if (u.includes('get_feed_info')) {
        try {
          const text = await res.text();
          const json = JSON.parse(text);
          if (json && json.data && json.data.feedInfo) {
            const fi = json.data.feedInfo;
            const ai = json.data.authorInfo || {};
            title = fi.description || `${ai.nickname || '视频号'}的作品`;
            author = ai.nickname || '视频号作者';
            coverUrl = fi.coverUrl || '';
            console.log('Intercepted API get_feed_info for author:', author);
          }
        } catch (e) {}
      }
    });

    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('finder.video.qq.com') && (u.includes('/20302/') || u.includes('X-snsvideoflag') || u.includes('bizid='))) {
        videoUrl = u;
        console.log('🔥 Intercepted Pure MP4 Video URL:', u.slice(0, 100));
      }
    });

    console.log('Navigating to target URL...');
    await page.goto(sphUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});

    console.log('Simulating touch tap and video play...');
    await page.touchscreen.tap(187, 300).catch(() => {});
    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) {
        v.muted = true;
        v.play().catch(() => {});
      }
    }).catch(() => {});

    let waited = 0;
    while (!videoUrl && waited < 6000) {
      await new Promise(r => setTimeout(r, 300));
      waited += 300;
    }

    if (videoUrl) {
      console.log('\n=== Local Pure Test Result SUCCESS ===');
      console.log('Author:', author);
      console.log('Title:', title);
      console.log('VideoUrl:', videoUrl.slice(0, 120));
      console.log('CoverUrl:', coverUrl.slice(0, 120));
      return { author, title, videoUrl, coverUrl };
    } else {
      console.log('\n=== Local Pure Test Result FAILED (videoUrl is empty) ===');
    }
  } catch (err) {
    console.error('Puppeteer parse error:', err);
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
  return null;
}

parseSphPureLocal('https://weixin.qq.com/sph/ABt3nrUqTd');
