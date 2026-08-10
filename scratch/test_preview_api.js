const puppeteer = require('puppeteer-core');

async function testPreviewApi() {
  console.log('=== Testing Tencent Finder Preview API with dynamicExportId ===');
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

  let dynamicExportId = '';

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json && json.data && json.data.sceneInfo && json.data.sceneInfo.dynamicExportId) {
          dynamicExportId = json.data.sceneInfo.dynamicExportId;
        }
      } catch(e) {}
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  console.log('Captured dynamicExportId:', dynamicExportId);

  if (dynamicExportId) {
    const apiResponse = await page.evaluate(async (exportId) => {
      try {
        const res = await fetch('/finder-preview/api/feed/get_feed_info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dynamicExportId: exportId,
            scene: 51
          })
        });
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, dynamicExportId);

    console.log('Finder Preview API Direct Response:', JSON.stringify(apiResponse, null, 2).slice(0, 1000));
  }

  await browser.close();
}

testPreviewApi();
