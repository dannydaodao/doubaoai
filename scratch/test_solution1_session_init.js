const puppeteer = require('puppeteer-core');

async function testSolution1() {
  console.log('=== 开始测试 方案1：Puppeteer 先访问主页初始化 Session 再跳转解析 ===');
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
        '--window-size=1280,800'
      ]
    });

    page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });

    const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
    await page.setUserAgent(desktopUa);
    await page.setViewport({ width: 1280, height: 800 });

    let capturedVideoUrl = '';
    let capturedCoverUrl = '';
    let capturedTitle = '';
    let capturedAuthor = '';

    // 1. 监听所有包含 finder.video.qq.com 的请求与 get_feed_info 响应
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('finder.video.qq.com') && (u.includes('/20302/') || u.includes('X-snsvideoflag') || u.includes('bizid='))) {
        capturedVideoUrl = u;
        console.log('🔥 [方案1成功抓获 MP4 直链]:', u.slice(0, 120));
      }
    });

    page.on('response', async (res) => {
      const u = res.url();
      if (u.includes('get_feed_info')) {
        try {
          const text = await res.text();
          const json = JSON.parse(text);
          if (json && json.data && json.data.feedInfo) {
            const fi = json.data.feedInfo;
            const ai = json.data.authorInfo || {};
            capturedTitle = fi.description || '';
            capturedAuthor = ai.nickname || '';
            capturedCoverUrl = fi.coverUrl || '';

            const directMp4 = fi.h264VideoInfo?.videoUrl || fi.videoUrl || '';
            if (directMp4) {
              capturedVideoUrl = directMp4;
              console.log('🔥 [从 get_feed_info 成功提纯 MP4 直链]:', directMp4.slice(0, 120));
            }
          }
        } catch(e) {}
      }
    });

    // 第一步：先访问视频号官方主页，完成完整的 Web Session 握手与基础 Cookie 初始化
    console.log('第一步：访问 https://channels.weixin.qq.com/ 初始化 Session...');
    await page.goto('https://channels.weixin.qq.com/', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // 第二步：带着主页生成的合法的 Cookie，跳转到目标短链接
    const targetUrl = 'https://weixin.qq.com/sph/ABt3nrUqTd';
    console.log(`第二步：带着 Session 跳转目标短链接 ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

    // 第三步：模拟悬停与手势触发播放
    console.log('第三步：模拟点击界面尝试触发视频流播放...');
    await page.mouse.click(640, 400);
    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) {
        v.muted = true;
        v.play().catch(() => {});
      }
      const el = document.querySelector('[class*="play"], [class*="video"]');
      if (el) el.click();
    }).catch(() => {});

    let waited = 0;
    while (!capturedVideoUrl && waited < 6000) {
      await new Promise(r => setTimeout(r, 300));
      waited += 300;
    }

    console.log('\n================ 方案1 实测结果汇总 ================');
    if (capturedVideoUrl) {
      console.log('✅ 方案1 实测【完全成功】！');
      console.log('作者:', capturedAuthor);
      console.log('标题:', capturedTitle.slice(0, 40));
      console.log('1080P MP4 视频直链 (20302 目录):', capturedVideoUrl);
      console.log('JPG 封面图直链 (20304 目录):', capturedCoverUrl.slice(0, 80));
      return true;
    } else {
      console.log('❌ 方案1 实测【失败】：未抓取到 MP4 视频直链');
      if (capturedTitle || capturedCoverUrl) {
        console.log('备注：拿到了标题 (', capturedTitle.slice(0, 20), ') 与 封面图，但未拿到原画 MP4 直链');
      }
      return false;
    }
  } catch (err) {
    console.error('方案1 运行异常:', err);
    return false;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

testSolution1();
