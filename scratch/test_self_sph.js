const https = require('https');

function extractSphExportId(text) {
  if (!text) return '';
  const m = text.match(/weixin\.qq\.com\/sph\/([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  const m2 = text.match(/finder-preview\/pages\/sph\?id=([a-zA-Z0-9_-]+)/i);
  if (m2) return m2[1];
  return '';
}

function getPageCookies(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38'
      }
    }, (res) => {
      const setCookies = res.headers['set-cookie'] || [];
      const cookies = setCookies.map(c => c.split(';')[0]).join('; ');
      resolve({ cookies, location: res.headers.location || url });
    }).on('error', () => resolve({ cookies: '' }));
  });
}

function fetchCgiWithCookies(exportId, cookies) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      exportId: exportId,
      rawFullUrl: `https://weixin.qq.com/sph/${exportId}`
    });

    const req = https.request('https://channels.weixin.qq.com/cgi-bin/mmfinder-bin/get_feed_info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 MicroMessenger/8.0.38',
        'Referer': `https://channels.weixin.qq.com/finder-preview/pages/sph?id=${exportId}`,
        'Origin': 'https://channels.weixin.qq.com'
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, data: JSON.parse(b) }); }
        catch (e) { resolve({ statusCode: res.statusCode, raw: b }); }
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  const exportId = 'AGaTOmmYbe';
  const pageRes = await getPageCookies(`https://weixin.qq.com/sph/${exportId}`);
  console.log('Page Cookies:', pageRes.cookies || 'None');

  const previewRes = await getPageCookies(`https://channels.weixin.qq.com/finder-preview/pages/sph?id=${exportId}`);
  console.log('Preview Cookies:', previewRes.cookies || 'None');

  const fullCookies = [pageRes.cookies, previewRes.cookies].filter(Boolean).join('; ');

  const cgiRes = await fetchCgiWithCookies(exportId, fullCookies);
  console.log('CGI Response Status:', cgiRes.statusCode);
  if (cgiRes.data) {
    console.log('CGI Data:', JSON.stringify(cgiRes.data, null, 2).slice(0, 500));
  } else {
    console.log('CGI Raw:', (cgiRes.raw || cgiRes.error || '').slice(0, 300));
  }
}

run();
