const puppeteer = require('puppeteer-core');

async function testWebviewUA() {
  console.log('=== Testing Android WeChat Webview User-Agent ===');
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
      invoke: function(name, opt, cb) {
        if (cb) cb({ err_msg: name + ':ok', netType: 'wifi' });
      },
      on: function(name, cb) {},
      call: function(name) {}
    };
  });

  // Android 微信原生 Webview User-Agent 仿真
  const androidUa = 'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160065 MMWEBSDK/20230701 MMWEBID/1234 MicroMessenger/8.0.40.2420(0x28002837) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';
  await page.setUserAgent(androidUa);
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  const capturedUrls = [];

  page.on('request', req => {
    const u = req.url();
    if (u.includes('finder.video.qq.com')) {
      capturedUrls.push(u);
      console.log('🔥 Captured Media URL:', u);
    }
  });

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        console.log('get_feed_info Keys:', Object.keys(JSON.parse(text).data || {}));
      } catch(e) {}
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  await new Promise(r => setTimeout(r, 4000));

  console.log('Total media URLs captured under Android Webview UA:', capturedUrls.length);
  capturedUrls.forEach((u, i) => console.log(`#${i+1}:`, u));

  await browser.close();
}

testWebviewUA();
