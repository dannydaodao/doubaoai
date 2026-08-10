const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: b }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function testMore() {
  const url = encodeURIComponent('https://weixin.qq.com/sph/AGaTOmmYbe');
  console.log('Testing more parse endpoints...');

  const endpoints = [
    `https://api.oick.cn/video/api.php?url=${url}`,
    `https://api.iyk.app/video/?url=${url}`,
    `https://api.w2w.fun/api/video/parse?url=${url}`,
    `https://jx.iqiyi.com/?url=${url}`
  ];

  for (const ep of endpoints) {
    console.log('\nEndpoint:', ep.slice(0, 60));
    const r = await fetchUrl(ep);
    console.log('Status:', r.statusCode);
    console.log('Body preview:', (r.body || r.error).slice(0, 150));
  }
}

testMore();
