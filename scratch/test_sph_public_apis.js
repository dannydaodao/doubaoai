const https = require('https');
const http = require('http');

function fetchJson(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: body.slice(0, 200) });
        }
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    req.end();
  });
}

async function testPublicApis() {
  const testSphUrl = encodeURIComponent('https://weixin.qq.com/sph/AGaTOmmYbe');
  console.log('Testing Public APIs with WeChat Channels URL: https://weixin.qq.com/sph/AGaTOmmYbe\n');

  const apis = [
    { name: 'PearKC API', url: `https://api.pearkc.com/api/video/get.php?url=${testSphUrl}` },
    { name: 'QQSUU API', url: `https://api.qqsuu.cn/api/dm-video?url=${testSphUrl}` },
    { name: 'TenApi', url: `https://tenapi.cn/v2/video?url=${testSphUrl}` },
    { name: 'VVHan API', url: `https://api.vvhan.com/api/video?url=${testSphUrl}` }
  ];

  for (const api of apis) {
    console.log(`--- Testing ${api.name} ---`);
    const res = await fetchJson(api.url);
    console.log('Status Code:', res.statusCode);
    if (res.data) {
      console.log('Response JSON:', JSON.stringify(res.data, null, 2).slice(0, 300));
    } else {
      console.log('Raw Response:', res.raw || res.error);
    }
    console.log('\n');
  }
}

testPublicApis();
