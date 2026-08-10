const https = require('https');

function fetchFeedWebPage(exportId) {
  return new Promise((resolve) => {
    const url = `https://channels.weixin.qq.com/web/pages/feed?eid=${exportId}&entrance_id=1019`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38',
        'Referer': 'https://channels.weixin.qq.com/'
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: b }));
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function run() {
  const eid = 'ABt3nrUqTd';
  console.log('Testing feed web page URL:', eid);
  const res = await fetchFeedWebPage(eid);
  console.log('Status Code:', res.statusCode);
  console.log('Body Length:', res.body ? res.body.length : 0);
  if (res.body) {
    const mp4Match = res.body.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi);
    console.log('MP4 matches:', mp4Match ? mp4Match.slice(0, 3) : 'None');
    console.log('Body preview:', res.body.slice(0, 500));
  }
}

run();
