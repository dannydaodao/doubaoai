const https = require('https');

const coverUrl = 'https://finder.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKC1aSURoAZqRGE7OrDld4ruzGvBa0uqW4YOLqPMspFVoEYIxXteYPG4aKEiaJSBK8XYEJICqUyvPA&token=Cvvj5Ix3eewIL2QHboXicE8FEOML7UPq58AWUzJRpedTSRjWXDeTDmkI0sg2mCpaG5Um7UIZkbFsPO9htxicY70ibeHTQZg3QmYvtU643syP9bXs7ve5jPysRGKvXNwNhVvUQGC3iapxp8icIawEHleIHgLDKb4UT7gGBib9OP157rAicnqARpOw2Y7stkibUeW8Yt2IeaK6XudCA2P8oavKSCcicxwkXvx6cjq4zMBfIL1rX8vE&hy=SH&idx=1&m=&scene=2&uzid=1&wxampicformat=503&picformat=200';

const videoUrlCandidate = coverUrl.replace('/20304/', '/20302/');
console.log('Candidate MP4 Video URL:', videoUrlCandidate);

https.get(videoUrlCandidate, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, (res) => {
  console.log('HTTP Status Code:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Length:', res.headers['content-length']);
});
