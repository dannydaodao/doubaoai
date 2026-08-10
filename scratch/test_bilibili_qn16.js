const https = require('https');

function testFetchTime(url) {
  const start = Date.now();
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://www.bilibili.com/'
      }
    }, (res) => {
      let len = 0;
      res.on('data', c => len += c.length);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          byteLength: len,
          timeMs: Date.now() - start
        });
      });
    });
    req.on('error', err => resolve({ error: err.message, timeMs: Date.now() - start }));
    req.end();
  });
}

async function runQn16Test() {
  const videoUrl = 'https://upos-sz-estgcos.bilivideo.com/upgcxcode/55/26/39875382655/39875382655_qe1-1-16.mp4?e=ig8euxZM2rNcNbRVhwdVhwdlhWdVhwdVhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&mid=0&deadline=1786123864&nbs=1&platform=pc&gen=playurlv3&trid=e36551cd08ee4a569c3cf30bc9cd13au&uipk=5&oi=1877427782&os=estgcos&og=cos&upsig=ff89bd67bccaa6f85f68259935bc7911&uparams=e,mid,deadline,nbs,platform,gen,trid,uipk,oi,os,og&bvc=vod&nettype=0&bw=300408&lrs=0&qn_dyeid=0d5ba30cc417ee1000f956086a75fa38&agrr=0&buvid=&build=0&dl=0&f=u_0_0&orderid=0,3';

  // Fetch fresh link for 《丧钟为谁而鸣》
  const viewRes = await new Promise(r => https.get('https://api.bilibili.com/x/web-interface/view?bvid=BV1phGV6kEKF', res => {
    let b = ''; res.on('data', c => b += c); res.on('end', () => r(JSON.parse(b)));
  }));
  const cid = viewRes.data?.cid;
  const playRes = await new Promise(r => https.get(`https://api.bilibili.com/x/player/playurl?bvid=BV1phGV6kEKF&cid=${cid}&qn=16&type=mp4&platform=h5&high_quality=1`, { headers: { 'Referer': 'https://www.bilibili.com/' } }, res => {
    let b = ''; res.on('data', c => b += c); res.on('end', () => r(JSON.parse(b)));
  }));

  const freshUrl = playRes.data?.durl?.[0]?.url;
  console.log('Fresh qn=16 URL:', freshUrl.slice(0, 90));

  const result = await testFetchTime(freshUrl);
  console.log('--- qn=16 Stream Fetch Result ---');
  console.log('Status Code:', result.statusCode);
  console.log('Byte Length:', result.byteLength);
  console.log('Elapsed Time (ms):', result.timeMs);
}

runQn16Test();
