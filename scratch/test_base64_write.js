const fs = require('fs');
const https = require('https');

function fetchBilibiliBase64(videoUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(videoUrl);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://www.bilibili.com/'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          base64: buf.toString('base64'),
          byteLength: buf.length
        });
      });
    });
    req.on('error', err => reject(err));
    req.end();
  });
}

async function verifyBase64Write() {
  const bvid = 'BV1phGV6kEKF';
  const viewRes = await new Promise(r => https.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, res => {
    let b = ''; res.on('data', c => b += c); res.on('end', () => r(JSON.parse(b)));
  }));
  const cid = viewRes.data?.cid;
  const playRes = await new Promise(r => https.get(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=16&type=mp4&platform=h5&high_quality=1`, { headers: { 'Referer': 'https://www.bilibili.com/' } }, res => {
    let b = ''; res.on('data', c => b += c); res.on('end', () => r(JSON.parse(b)));
  }));

  const videoUrl = playRes.data?.durl?.[0]?.url;
  console.log('1. Fetching Bilibili stream as Base64...');
  const res = await fetchBilibiliBase64(videoUrl);
  console.log('Fetched status:', res.statusCode);
  console.log('Original Byte Length:', res.byteLength);
  console.log('Base64 String Length:', res.base64.length);

  // Simulate WeChat Mini Program fs.writeFileSync(path, base64, 'base64')
  console.log('2. Writing Base64 string to MP4 file...');
  const testFilePath = '/home/caijun/doubaoai/scratch/test_output.mp4';
  fs.writeFileSync(testFilePath, res.base64, 'base64');

  const fileStats = fs.statSync(testFilePath);
  console.log('Written File Size on Disk:', fileStats.size);

  if (fileStats.size === res.byteLength && fileStats.size > 1000000) {
    console.log('VERIFICATION SUCCESSFUL! File size matches original byte size 100%!');
  } else {
    console.error('VERIFICATION FAILED!');
  }
}

verifyBase64Write();
