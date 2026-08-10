const puppeteer = require('puppeteer-core');

async function testCgiFeed() {
  console.log('=== Testing CGI mmfinder-bin/get_feed_info with dynamicExportId ===');
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

  let exportId = '';
  let h5FeedInfo = null;

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json && json.data && json.data.sceneInfo && json.data.sceneInfo.dynamicExportId) {
          exportId = json.data.sceneInfo.dynamicExportId;
          h5FeedInfo = json.data.feedInfo;
          console.log('Captured dynamicExportId:', exportId);
        }
      } catch(e) {}
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  if (exportId) {
    console.log('Posting to cgi-bin/mmfinder-bin/get_feed_info with export_id...');
    const cgiResult = await page.evaluate(async (exportId) => {
      try {
        const res = await fetch('/cgi-bin/mmfinder-bin/get_feed_info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ export_id: exportId, scene: 51 })
        });
        return await res.json();
      } catch(e) {
        return { error: e.message };
      }
    }, exportId);

    console.log('CGI Result:', JSON.stringify(cgiResult, null, 2).slice(0, 800));
  } else {
    console.log('Failed to capture dynamicExportId');
  }

  await browser.close();
}

testCgiFeed();
