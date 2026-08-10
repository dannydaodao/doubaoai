const https = require('https');
const http = require('http');

function fetchContentFollowRedirect(url, headers = {}, depth = 0) {
  if (depth > 5) return Promise.resolve({ error: 'Too many redirects' });
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38',
        ...headers
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          const u = new URL(url);
          loc = `${u.protocol}//${u.host}${loc}`;
        }
        console.log(`Redirect [${res.statusCode}] ->`, loc.slice(0, 90));
        return resolve(fetchContentFollowRedirect(loc, headers, depth + 1));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, finalUrl: url, body, headers: res.headers }));
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function testRedirect() {
  console.log('Testing WeChat Channels link redirect chain...');
  const res = await fetchContentFollowRedirect('https://weixin.qq.com/sph/AGaTOmmYbe');
  console.log('\nFinal Status:', res.statusCode);
  console.log('Final URL:', res.finalUrl ? res.finalUrl.slice(0, 90) : 'None');
  console.log('Final Body Length:', res.body ? res.body.length : 0);

  if (res.body) {
    const titleMatch = res.body.match(/<title>([^<]+)<\/title>/i);
    console.log('Title:', titleMatch ? titleMatch[1] : 'None');
    console.log('Body snippet:', res.body.slice(0, 400));
  }
}

testRedirect();
