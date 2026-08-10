const puppeteer = require('puppeteer-core');

async function testDesktopCgi() {
  console.log('=== Testing Desktop CGI Resolution with dynamicExportId ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800'
    ]
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
  await page.setUserAgent(desktopUa);
  await page.setViewport({ width: 1280, height: 800 });

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
    const result = await page.evaluate(async (exportId) => {
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

    console.log('🔥 Second-step CGI Result:', JSON.stringify(result, null, 2).slice(0, 1000));
  }

  await browser.close();
}

testDesktopCgi();
