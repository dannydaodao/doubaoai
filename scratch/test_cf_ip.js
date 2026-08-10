const https = require('https');

function testCfIp(ip) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ url: 'https://weixin.qq.com/sph/AGaTOmmYbe' });
    const req = https.request({
      hostname: ip,
      port: 443,
      path: '/api/fetch_video_profile',
      method: 'POST',
      headers: {
        'Host': 'sph.litao.workers.dev',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      servername: 'sph.litao.workers.dev',
      timeout: 4000
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ ip, statusCode: res.statusCode, data: JSON.parse(b) }); }
        catch (e) { resolve({ ip, statusCode: res.statusCode, raw: b.slice(0, 100) }); }
      });
    });
    req.on('error', err => resolve({ ip, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ip, error: 'ETIMEDOUT' }); });
    req.write(postData);
    req.end();
  });
}

async function testAllIps() {
  // Common Cloudflare clean IPs
  const ips = ['104.21.55.1', '172.67.182.1', '162.159.136.1', '104.16.132.229', '188.114.96.1', '104.28.1.1'];
  console.log('Testing Cloudflare IP routing for sph.litao.workers.dev...');
  for (const ip of ips) {
    const res = await testCfIp(ip);
    console.log(`IP ${ip}:`, res.statusCode ? `Status ${res.statusCode} (SUCCESS)` : `Error ${res.error}`);
    if (res.data && res.data.errCode === 0) {
      console.log('Successfully fetched feed via IP:', ip);
      console.log('Video Title:', res.data.data?.feedInfo?.description?.slice(0, 40));
    }
  }
}

testAllIps();
