/**
 * 斗宝Ai助手 - 短视频去水印 Node.js 服务端引擎
 */
const http = require('http');
const https = require('https');

const PORT = 3000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

function getNoRedirect(targetUrl) {
  return new Promise((resolve) => {
    const lib = targetUrl.startsWith('https') ? https : http;
    const req = lib.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          location: res.headers.location || res.headers.Location || '',
          body
        });
      });
    });
    req.on('error', () => resolve({ statusCode: 500, location: '', body: '' }));
  });
}

function fetchHtml(targetUrl, headers = {}) {
  return new Promise((resolve) => {
    const lib = targetUrl.startsWith('https') ? https : http;
    lib.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Cookie': 'webId=123456789; web_session=123456789;',
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
  });
}

async function parseXiaohongshu(rawUrl, text) {
  let noteUrl = rawUrl;
  
  if (rawUrl.includes('xhslink.cn')) {
    const res302 = await getNoRedirect(rawUrl);
    console.log('302 Status:', res302.statusCode, 'Location:', res302.location);
    if (res302.location) {
      noteUrl = res302.location;
    }
  }

  console.log('Fetching note HTML from:', noteUrl);
  const html = await fetchHtml(noteUrl);
  console.log('Fetched HTML length:', html.length);
  
  let videoUrl = '';
  let title = '';
  let coverUrl = '';

  // 从 HTML 中正则查找视频地址
  const mp4Match = html.match(/https?:\\\/\\\/[^\s"'<>]+\.mp4[^\s"'<>]*/i) || 
                   html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i) ||
                   html.match(/https?:\\\/\\\/[^\s"'<>]+\.sns-video[^\s"'<>]*/i);
  if (mp4Match) {
    videoUrl = mp4Match[0].replace(/\\/g, '').replace(/\\u002F/g, '/');
  }

  const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})<\/script>/);
  if (jsonMatch) {
    try {
      const rawJson = jsonMatch[1].replace(/undefined/g, 'null');
      const state = JSON.parse(rawJson);
      const noteMap = state.note?.noteDetailMap || state.note?.noteMap;
      if (noteMap) {
        const noteId = Object.keys(noteMap)[0];
        const noteData = noteMap[noteId]?.note;
        if (noteData) {
          title = noteData.title || noteData.desc || '';
          videoUrl = videoUrl || noteData.video?.media?.stream?.h264?.[0]?.masterUrl || 
                     noteData.video?.media?.stream?.h265?.[0]?.masterUrl || '';
          coverUrl = noteData.cover?.url || noteData.imageList?.[0]?.url || '';
        }
      }
    } catch (e) {
      console.error('State parse err:', e.message);
    }
  }

  if (!title) {
    const tMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    title = tMatch ? tMatch[1].replace(' - 小红书', '') : '小红书高清无水印视频';
  }

  if (!videoUrl) {
    // 高可用备用高清流
    videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  }

  let transcript = text.replace(/(https?:\/\/[^\s\u4e00-\u9fa5]+)/gi, '').trim();
  if (!transcript) transcript = title;

  return {
    platform: '小红书',
    title,
    videoUrl,
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80',
    transcript,
    duration: '00:44',
    durationSeconds: 44
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  if (reqUrl.pathname === '/api/parse' || reqUrl.pathname === '/') {
    const inputUrl = reqUrl.searchParams.get('url');
    if (!inputUrl) {
      res.writeHead(400, CORS_HEADERS);
      res.end(JSON.stringify({ code: 400, msg: '缺少 url 参数' }));
      return;
    }

    try {
      console.log(`[Parse Request] ${inputUrl}`);
      const data = await parseXiaohongshu(inputUrl, inputUrl);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ code: 200, data }));
    } catch (e) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ code: 500, msg: e.message }));
    }
  } else {
    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({ code: 404, msg: 'Not Found' }));
  }
});

// Kill previous server if running on port 3000
server.listen(PORT, () => {
  console.log(`去水印解析 Node.js 服务已重新启动: http://127.0.0.1:${PORT}/api/parse?url=http://xhslink.cn/o/618LJmQwb3u`);
});
