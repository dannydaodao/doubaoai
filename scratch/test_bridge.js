const puppeteer = require('puppeteer-core');

async function testBridge() {
  console.log('=== Testing WeixinJSBridge mock in Puppeteer ===');
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

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.WeixinJSBridge = {
      invoke: function(name, opt, cb) {
        console.log('WeixinJSBridge invoke:', name);
        if (cb) cb({ err_msg: name + ':ok', netType: 'wifi' });
      },
      on: function(name, cb) {
        console.log('WeixinJSBridge on:', name);
      },
      call: function(name) {
        console.log('WeixinJSBridge call:', name);
      }
    };
  });

  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38 NetType/WIFI Language/zh_CN';
  await page.setUserAgent(ua);
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  const capturedUrls = [];
  page.on('request', req => {
    const u = req.url();
    if (u.includes('finder.video.qq.com')) {
      capturedUrls.push(u);
      console.log('🔥 Captured Media URL:', u);
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  await new Promise(r => setTimeout(r, 4000));

  console.log('Total media URLs captured:', capturedUrls.length);
  await browser.close();
}

testBridge();
