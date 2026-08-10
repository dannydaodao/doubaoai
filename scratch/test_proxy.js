const https = require('https');

function fetchJson(url, headers = {}) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://www.bilibili.com/',
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
  });
}

function getBilibiliBuffer(videoUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(videoUrl);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.bilibili.com/'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          buffer: Buffer.concat(chunks),
          headers: res.headers
        });
      });
    });
    req.on('error', err => reject(err));
    req.end();
  });
}

async function testFreshProxy() {
  const bvid = 'BV1phGV6kEKF';
  const viewRes = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
  const cid = viewRes.data?.cid;
  
  const playUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=16&type=mp4&platform=h5&high_quality=1`;
  const playRes = await fetchJson(playUrl);
  const freshVideoUrl = playRes.data?.durl?.[0]?.url;

  console.log('Fresh Video URL:', freshVideoUrl.slice(0, 100));

  const result = await getBilibiliBuffer(freshVideoUrl);
  console.log('--- Buffer Proxy Result ---');
  console.log('Status Code:', result.statusCode);
  console.log('Buffer Byte Size:', result.buffer.length);
  console.log('Content-Type:', result.headers['content-type']);
}

testFreshProxy();
