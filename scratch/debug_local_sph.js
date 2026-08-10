const puppeteer = require('puppeteer-core');

async function debugParse() {
  console.log('=== Starting Local Puppeteer Debug ===');
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

  page.on('request', req => {
    const u = req.url();
    if (u.includes('finder') || u.includes('video') || u.includes('stodownload') || u.includes('qq.com')) {
      console.log('REQ:', u);
    }
  });

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        console.log('API get_feed_info Response:', text.slice(0, 300));
      } catch(e) {}
    }
  });

  console.log('Navigating to https://weixin.qq.com/sph/ABt3nrUqTd...');
  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.error('Goto err:', e));

  console.log('Waiting for video element...');
  await page.waitForSelector('video, [class*="video"], [class*="play"]', { timeout: 5000 }).catch(e => console.error('Wait err:', e));

  console.log('Evaluating simulated click play...');
  await page.evaluate(() => {
    const v = document.querySelector('video');
    console.log('Found video el:', !!v);
    if (v) { v.muted = true; v.play().catch(() => {}); }
  }).catch(() => {});

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
  console.log('Debug complete.');
}

debugParse();
