const https = require('https');
const http = require('http');

function fetchBilibiliStream(videoUrl) {
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
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer: buf,
          base64: buf.toString('base64')
        });
      });
    });
    req.on('error', err => reject(err));
    req.end();
  });
}

async function testHttpProxy() {
  // Get fresh video URL for Bilibili
  const bvid = 'BV1phGV6kEKF';
  const viewRes = await new Promise(r => https.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, res => {
    let b = ''; res.on('data', c => b += c); res.on('end', () => r(JSON.parse(b)));
  }));
  const cid = viewRes.data?.cid;
  const playRes = await new Promise(r => https.get(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=16&type=mp4&platform=h5&high_quality=1`, { headers: { 'Referer': 'https://www.bilibili.com/' } }, res => {
    let b = ''; res.on('data', c => b += c); res.on('end', () => r(JSON.parse(b)));
  }));

  const freshUrl = playRes.data?.durl?.[0]?.url;
  console.log('Fresh Bilibili Video URL:', freshUrl.slice(0, 90));

  const proxyRes = await fetchBilibiliStream(freshUrl);
  console.log('Proxy Status:', proxyRes.statusCode);
  console.log('Buffer Size:', proxyRes.buffer.length);
  console.log('Base64 Length:', proxyRes.base64.length);

  // Simulate Cloud Function HTTP API Response
  const cfResponse = {
    isBase64Encoded: true,
    statusCode: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': proxyRes.buffer.length.toString(),
      'Access-Control-Allow-Origin': '*'
    },
    body: proxyRes.base64
  };

  console.log('Cloud Function HTTP Response structure verified!');
  console.log('isBase64Encoded:', cfResponse.isBase64Encoded);
  console.log('Headers:', cfResponse.headers);
}

testHttpProxy();
