const puppeteer = require('puppeteer-core');

async function inspectDomElements() {
  console.log('=== Inspecting DOM elements inside #app with delay ===');
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

  await page.goto('https://weixin.qq.com/sph/ABt3nrUqTd', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));

  const elements = await page.evaluate(() => {
    const app = document.getElementById('app');
    if (!app) return 'No #app';
    
    function dumpTree(node, depth = 0) {
      if (depth > 6) return '';
      let info = '  '.repeat(depth) + node.tagName + (node.className ? '.' + String(node.className).split(' ').join('.') : '');
      if (node.tagName === 'IMG') info += ` [src=${node.src.slice(0, 60)}]`;
      if (node.tagName === 'VIDEO') info += ` [src=${node.src.slice(0, 60)}]`;
      let res = [info];
      for (let child of node.children) {
        res.push(dumpTree(child, depth + 1));
      }
      return res.join('\n');
    }
    return dumpTree(app);
  });

  console.log('DOM Tree inside #app after 4s:\n', elements);
  await browser.close();
}

inspectDomElements();
