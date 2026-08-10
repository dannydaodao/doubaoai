const https = require('https');

function getWithRedirect(url, headers = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38 NetType/WIFI Language/zh_CN',
        ...headers
      },
      timeout: 8000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        const nextUrl = res.headers.location;
        console.log('Following 301 Redirect ->', nextUrl);
        return resolve(getWithRedirect(nextUrl, headers));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

(async () => {
  console.log('=== Testing Redirect Following from WeChat Official URL ===');
  const res = await getWithRedirect('https://weixin.qq.com/sph/ABt3nrUqTd');
  if (res) {
    console.log('Final Page Status:', res.status, 'HTML Length:', res.body.length);
    console.log('HTML Snippet:', res.body.slice(0, 500));
  }
})();
