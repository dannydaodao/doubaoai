const puppeteer = require('puppeteer-core');

async function testUnheadless() {
  console.log('=== Testing Headless Evasion Flags ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--window-size=375,812'
    ]
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
    window.WeixinJSBridge = {
      invoke: function(name, opt, cb) { if (cb) cb({ err_msg: name + ':ok' }); },
      on: function() {},
      call: function() {}
    };
  });

  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38 NetType/WIFI Language/zh_CN';
  await page.setUserAgent(ua);
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        console.log('🔥 Intercepted get_feed_info response! Length:', text.length);
        console.log('Content:', text.slice(0, 500));
      } catch(e) {}
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();
}

testUnheadless();
