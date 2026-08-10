const puppeteer = require('puppeteer-core');

async function testPrintJson() {
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

  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38 NetType/WIFI Language/zh_CN';
  await page.setUserAgent(ua);
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        console.log('=== Complete JSON returned by get_feed_info ===');
        console.log(JSON.stringify(json, null, 2));
      } catch(e) {}
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
}

testPrintJson();
