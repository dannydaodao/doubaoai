const https = require('https');
const http = require('http');
const fs = require('fs');
const url = require('url');

const options = {
  key: fs.readFileSync('./doubaobao.xyz.key'),
  cert: fs.readFileSync('./doubaobao.xyz.pem')
};

function getReferer(videoUrl) {
    if (videoUrl.includes('xiaohongshu') || videoUrl.includes('xhs')) return 'https://www.xiaohongshu.com/';
    if (videoUrl.includes('douyin')) return 'https://www.douyin.com/';
    if (videoUrl.includes('bilibili') || videoUrl.includes('hdslb')) return 'https://www.bilibili.com/';
    if (videoUrl.includes('kuaishou') || videoUrl.includes('yximgs')) return 'https://www.kuaishou.com/';
    return '';
}

https.createServer(options, (req, res) => {
  const reqUrl = url.parse(req.url, true);
  
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  
  if (reqUrl.pathname === '/proxy') {
    const targetUrl = reqUrl.query.url;
    if (!targetUrl) {
      res.writeHead(400);
      return res.end('Missing url');
    }

    const headers = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' };
    const referer = getReferer(targetUrl);
    if (referer) headers['Referer'] = referer;

    const lib = targetUrl.startsWith('https') ? https : http;
    
    lib.get(targetUrl, { headers }, (targetRes) => {
      // Handle redirects natively if necessary
      if (targetRes.statusCode >= 300 && targetRes.statusCode < 400 && targetRes.headers.location) {
        let loc = targetRes.headers.location;
        if (!loc.startsWith('http')) loc = new URL(loc, targetUrl).toString();
        
        const redirectLib = loc.startsWith('https') ? https : http;
        redirectLib.get(loc, { headers }, (finalRes) => {
           res.writeHead(finalRes.statusCode, {
             'Content-Type': finalRes.headers['content-type'] || 'video/mp4',
             'Content-Length': finalRes.headers['content-length'] || ''
           });
           finalRes.pipe(res);
        }).on('error', (err) => {
           console.error(err);
           res.writeHead(500);
           res.end('Proxy Redirect Error');
        });
        return;
      }

      res.writeHead(targetRes.statusCode, {
        'Content-Type': targetRes.headers['content-type'] || 'video/mp4',
        'Content-Length': targetRes.headers['content-length'] || ''
      });
      
      targetRes.pipe(res);
      
    }).on('error', (err) => {
      console.error(err);
      res.writeHead(500);
      res.end('Proxy Error');
    });
  } else {
    res.writeHead(200);
    res.end('HTTPS Streaming Proxy is Running on doubaobao.xyz!');
  }
}).listen(443, () => {
  console.log('✅ 极速流媒体 HTTPS 代理已启动，运行在 443 端口');
});
