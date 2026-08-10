const https = require('https');

function fetchJs(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(b));
    });
  });
}

async function run() {
  console.log('Fetching feed.js from WeChat CDN...');
  const jsCode = await fetchJs('https://res.wx.qq.com/t/wx_fed/finder/web/finder-preview/res/assets/feed.9c135e64.js');
  console.log('JS Code Length:', jsCode.length);

  // Search for API endpoint strings or header strings in JS code
  const apiMatches = jsCode.match(/\/cgi-bin\/[a-zA-Z0-9_\-\/]+/g) || jsCode.match(/https?:\/\/[^"'\s]+/g) || [];
  console.log('\nFound API matches in JS:', apiMatches.slice(0, 15));
}

run();
