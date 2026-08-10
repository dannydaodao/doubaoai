const http = require('http');
const puppeteer = require('puppeteer-core');

async function parseSphWithPuppeteer(sphUrl) {
  let browser = null;
  let page = null;
  try {
    browser = await puppeteer.launch({
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

    page = await browser.newPage();

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

    let title = '';
    let author = '';
    let coverUrl = '';
    let videoUrl = '';

    page.on('response', async (res) => {
      const u = res.url();
      if (u.includes('get_feed_info')) {
        try {
          const text = await res.text();
          const json = JSON.parse(text);
          if (json && json.data && json.data.feedInfo) {
            const fi = json.data.feedInfo;
            const ai = json.data.authorInfo || {};
            title = fi.description || `${ai.nickname || '视频号'}的作品`;
            author = ai.nickname || '视频号作者';
            coverUrl = fi.coverUrl || '';
          }
        } catch (e) {}
      }
    });

    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('finder.video.qq.com') && (u.includes('/20302/') || u.includes('X-snsvideoflag') || u.includes('bizid='))) {
        videoUrl = u;
      }
    });

    await page.goto(sphUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});

    await page.waitForSelector('video, [class*="video"], [class*="play"]', { timeout: 5000 }).catch(() => {});

    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) {
        v.muted = true;
        v.play().catch(() => {});
      }
      const btn = document.querySelector('video') || document.querySelector('[class*="play"]') || document.body;
      if (btn) btn.click();
    }).catch(() => {});

    let waited = 0;
    while (!videoUrl && waited < 6000) {
      await new Promise(r => setTimeout(r, 300));
      waited += 300;
    }

    if (videoUrl) {
      return {
        platform: '视频号',
        title: title || '视频号作品',
        videoUrl,
        coverUrl,
        transcript: title || '视频号作品',
        author: author || '视频号作者'
      };
    }
  } catch (err) {
    console.error('Puppeteer parse error:', err);
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'POST' && req.url === '/api/parse-sph') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const url = payload.url || '';
        console.log('Received parse request for:', url);
        const result = await parseSphWithPuppeteer(url);

        if (result && result.videoUrl) {
          res.writeHead(200);
          res.end(JSON.stringify({ code: 200, data: result }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ code: 400, msg: '视频号解析失败，请检查链接' }));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ code: 500, msg: err.message || '内部错误' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ code: 404, msg: 'Not Found' }));
});

server.listen(9876, '127.0.0.1', () => {
  console.log('Local test sph server listening on http://127.0.0.1:9876...');
});
