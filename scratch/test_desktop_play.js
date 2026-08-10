const puppeteer = require('puppeteer-core');

async function testDesktopPlay() {
  console.log('=== Testing Desktop UA Play Click in Puppeteer ===');
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

  const capturedUrls = [];

  page.on('request', req => {
    const u = req.url();
    if (u.includes('finder.video.qq.com')) {
      capturedUrls.push(u);
      console.log('🔥 Captured Media Request:', u);
    }
  });

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  console.log('Clicking center of Desktop viewport...');
  await page.mouse.click(640, 400);
  await page.evaluate(() => {
    const el = document.querySelector('[class*="play"], [class*="video"], div, img');
    if (el) el.click();
  }).catch(() => {});

  await new Promise(r => setTimeout(r, 4000));

  console.log('Total captured media URLs in Desktop mode:', capturedUrls.length);
  capturedUrls.forEach((u, i) => console.log(`#${i+1}:`, u));

  await browser.close();
}

testDesktopPlay();
