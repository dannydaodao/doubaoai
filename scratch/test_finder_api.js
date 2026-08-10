const https = require('https');

function postJson(url, postData, headers = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const dataStr = JSON.stringify(postData);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr),
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38',
        'Referer': 'https://channels.weixin.qq.com/',
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, data: JSON.parse(body) }); } catch (e) { resolve({ statusCode: res.statusCode, raw: body }); }
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    req.write(dataStr);
    req.end();
  });
}

async function testFinderApi() {
  const exportId = 'AGaTOmmYbe';
  console.log('Testing WeChat Channels CGI Feed API for exportId:', exportId);

  const endpoints = [
    'https://channels.weixin.qq.com/cgi-bin/mmfinder-bin/get_feed_info',
    'https://channels.weixin.qq.com/finder-preview/api/feed/get_feed_info'
  ];

  for (const ep of endpoints) {
    console.log('\n--- Endpoint:', ep, '---');
    const res = await postJson(ep, { exportId: exportId, rawFullUrl: `https://weixin.qq.com/sph/${exportId}` });
    console.log('Status Code:', res.statusCode);
    if (res.data) {
      console.log('JSON Output:', JSON.stringify(res.data, null, 2).slice(0, 400));
    } else {
      console.log('Raw Output:', (res.raw || res.error).slice(0, 300));
    }
  }
}

testFinderApi();
