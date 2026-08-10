const https = require('https');

function fetchFollow(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) loc = 'https://channels.weixin.qq.com' + loc;
        return resolve(fetchFollow(loc));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, finalUrl: url, body }));
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function inspectHtml() {
  const url = 'https://weixin.qq.com/sph/ABt3nrUqTd';
  console.log('Inspecting raw HTML of:', url);
  const res = await fetchFollow(url);
  console.log('Final URL:', res.finalUrl);
  console.log('Body Length:', res.body ? res.body.length : 0);
  console.log('\n--- FULL HTML BODY ---');
  console.log(res.body);

  // Search for inline script tags or JSON objects
  if (res.body) {
    const scripts = res.body.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    console.log('\nFound <script> tags count:', scripts.length);
    scripts.forEach((s, idx) => {
      console.log(`\nScript #${idx + 1} (len ${s.length}):`, s.slice(0, 300));
    });
  }
}

inspectHtml();
