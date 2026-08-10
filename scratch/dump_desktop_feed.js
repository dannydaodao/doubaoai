const puppeteer = require('puppeteer-core');

async function dumpDesktopFeedInfo() {
  console.log('=== Inspecting full feedInfo returned by Desktop Chrome UA ===');
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

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('get_feed_info')) {
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json && json.data && json.data.feedInfo) {
          console.log('=== feedInfo Keys ===', Object.keys(json.data.feedInfo));
          console.log('=== feedInfo Full Content ===\n', JSON.stringify(json.data.feedInfo, null, 2));
        }
      } catch(e) {}
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
}

dumpDesktopFeedInfo();
