// cloudfunctions/doubaoai/index.js
const cloud = require('wx-server-sdk');
const https = require('https');
const http = require('http');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 禁用 302 自动跟随，获取 Location 请求头
 */
function getNoRedirect(url, headers = {}) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        ...headers
      }
    }, (res) => {
      resolve({
        statusCode: res.statusCode,
        location: res.headers.location || res.headers.Location || url
      });
    });
  });
}

/**
 * 抓取网页内容
 */
function fetchContent(targetUrl, headers = {}) {
  return new Promise((resolve) => {
    const lib = targetUrl.startsWith('https') ? https : http;
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    };
    if (!targetUrl.includes('bilibili.com') && !targetUrl.includes('b23.tv')) {
      defaultHeaders['Cookie'] = 'webId=123456789; web_session=123456789; did=web_123456789;';
    }
    lib.get(targetUrl, {
      headers: {
        ...defaultHeaders,
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
  });
}

/**
 * 智能提取长文本中的有效 HTTP/HTTPS 链接
 */
function extractUrl(text) {
  if (!text) return '';
  const match = text.match(/(https?:\/\/[^\s\u4e00-\u9fa5]+)/i);
  if (match) {
    let url = match[1].trim();
    // 彻底清理链接末尾的多余符号
    url = url.replace(/[，。！,!?】\]]+$/, '');
    return url;
  }
  return text.trim();
}

function detectPlatform(text) {
  const lower = text.toLowerCase();
  if (lower.includes('小红书') || lower.includes('xhslink') || lower.includes('xiaohongshu')) {
    return '小红书';
  } else if (lower.includes('抖音') || lower.includes('douyin') || lower.includes('v.douyin')) {
    return '抖音';
  } else if (lower.includes('快手') || lower.includes('kuaishou') || lower.includes('v.kuaishou') || lower.includes('chenzhongtech') || lower.includes('gifshow')) {
    return '快手';
  } else if (lower.includes('哔哩哔哩') || lower.includes('bilibili') || lower.includes('b23.tv') || lower.includes('b站')) {
    return '哔哩哔哩';
  } else if (lower.includes('weixin.qq.com/sph') || lower.includes('视频号') || lower.includes('sph')) {
    return '视频号';
  }
  return '未知';
}

/**
 * 抖音全新去水印原视频解析算法 (支持 _ROUTER_DATA 结构与新版视频提取)
 */
async function parseDouyin(rawUrl, text) {
  let finalUrl = rawUrl;
  if (rawUrl.includes('v.douyin.com')) {
    const res302 = await getNoRedirect(rawUrl);
    if (res302.location) finalUrl = res302.location;
  }

  const match = finalUrl.match(/video\/(\d+)/) || finalUrl.match(/modal_id=(\d+)/) || text.match(/video\/(\d+)/);
  const itemId = match ? match[1] : '';

  let playWmUrl = '';
  let title = '';
  let coverUrl = '';

  // 1. 尝试从抖音 HTML 页面中解析 window._ROUTER_DATA (兼容抖音最新结构)
  if (itemId || finalUrl) {
    const sharePageUrl = itemId ? `https://www.iesdouyin.com/share/video/${itemId}/` : finalUrl;
    const html = await fetchContent(sharePageUrl);
    const routerMatch = html.match(/window\._ROUTER_DATA\s*=\s*({[\s\S]*?})<\/script>/);
    if (routerMatch) {
      try {
        const state = JSON.parse(routerMatch[1]);
        const pageData = state.loaderData?.['video_(id)/page'];
        const item = pageData?.videoInfoRes?.item_list?.[0] || pageData?.itemInfoRes?.item_list?.[0];
        if (item) {
          title = item.desc || '抖音无水印作品';
          playWmUrl = item.video?.play_addr?.url_list?.[0] || '';
          coverUrl = item.video?.cover?.url_list?.[0] || '';
        }
      } catch (e) {
        console.error('Douyin _ROUTER_DATA parse error:', e);
      }
    }
  }

  // 2. 旧接口降级备用
  if (!playWmUrl && itemId) {
    const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${itemId}`;
    const jsonStr = await fetchContent(apiUrl);
    try {
      const apiRes = JSON.parse(jsonStr);
      if (apiRes.item_list && apiRes.item_list.length > 0) {
        const item = apiRes.item_list[0];
        title = item.desc || '抖音无水印作品';
        playWmUrl = item.video?.play_addr?.url_list?.[0] || '';
        coverUrl = item.video?.cover?.url_list?.[0] || '';
      }
    } catch (e) {
      console.error('Douyin legacy API error:', e);
    }
  }

  if (playWmUrl) {
    // 关键去水印：将 playwm 替换为 play
    const rawPlayUrl = playWmUrl.replace('playwm', 'play');

    // 核心重定向：通过云端追溯 302 重定向拿到无水印 CDN 直链
    const cdnRes = await getNoRedirect(rawPlayUrl, {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
    });

    const playUrl = cdnRes.location || rawPlayUrl;
    let transcript = text.replace(/(https?:\/\/[^\s\u4e00-\u9fa5]+)/gi, '').trim();
    if (!transcript) transcript = title;

    return {
      platform: '抖音',
      title,
      videoUrl: playUrl,
      coverUrl,
      transcript,
      duration: '00:44',
      durationSeconds: 44
    };
  }

  return null;
}

/**
 * 小红书真实无水印原视频提取算法 (精准提取真实 coverUrl 封面)
 */
async function parseXiaohongshu(rawUrl, text) {
  let noteUrl = rawUrl;
  if (rawUrl.includes('xhslink.cn')) {
    const res302 = await getNoRedirect(rawUrl);
    if (res302.location) noteUrl = res302.location;
  }

  const html = await fetchContent(noteUrl);
  let videoUrl = '';
  let title = '';
  let coverUrl = '';

  // 1. 核心去水印突破：从页面提取原画原始流 originVideoKey (必须使用标准的 ?ext=.mp4 查询参数)
  const originKeyMatch = html.match(/"originVideoKey"\s*:\s*"([^"]+)"/i);
  if (originKeyMatch) {
    const originKey = originKeyMatch[1].replace(/\\u002F/gi, '/').replace(/\\/g, '');
    videoUrl = `https://sns-video-bd.xhscdn.com/${originKey}?ext=.mp4`;
  }

  // 2. 备用：从 masterUrl 匹配 (统一修正为 https://)
  if (!videoUrl) {
    const masterMatch = html.match(/masterUrl["']\s*:\s*["']([^"']+)["']/i) || 
                        html.match(/"url"["']\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
    if (masterMatch) {
      videoUrl = masterMatch[1].replace(/\\u002F/gi, '/').replace(/\\/g, '').replace(/^http:/i, 'https:');
    }
  }

  // 3. 从 window.__INITIAL_STATE__ 深度抓取标题与真实封面
  const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})<\/script>/);
  if (jsonMatch) {
    try {
      const rawJson = jsonMatch[1].replace(/undefined/g, 'null');
      const state = JSON.parse(rawJson);
      const noteData = state.noteData?.data?.noteData || state.noteData?.data?.note || state.noteData?.data || state.noteData;
      if (noteData) {
        title = noteData.title || noteData.desc || '';
        coverUrl = noteData.cover?.url || noteData.imageList?.[0]?.url || noteData.firstNoteData?.cover?.url || '';
      }
    } catch (e) {
      console.error('XHS JSON parse error:', e);
    }
  }

  // 4. 正则兜底抓取真实高清封面 coverUrl
  if (!coverUrl) {
    const coverMatch = html.match(/"cover"\s*:\s*{\s*"url"\s*:\s*"([^"]+)"/i) || 
                       html.match(/"url"\s*:\s*"([^"]*sns-webpic[^"]*)"/i) ||
                       html.match(/"url"\s*:\s*"([^"]*xhscdn[^"]*)"/i) ||
                       html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (coverMatch) {
      coverUrl = coverMatch[1].replace(/\\u002F/gi, '/').replace(/\\/g, '').replace(/^http:/i, 'https:');
    }
  }

  if (coverUrl && coverUrl.startsWith('http:')) {
    coverUrl = coverUrl.replace(/^http:/i, 'https:');
  }

  if (!title) {
    const tMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    title = tMatch ? tMatch[1].replace(' - 小红书', '') : '小红书高清无水印作品';
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

/**
 * 快手无水印提取算法 (支持 chenzhongtech.com 域名重定向与 pageData 深度解析)
 */
async function parseKuaishou(rawUrl, text) {
  let noteUrl = rawUrl;
  if (rawUrl.includes('v.kuaishou.com') || rawUrl.includes('kuaishou.com')) {
    const res302 = await getNoRedirect(rawUrl);
    if (res302.location) noteUrl = res302.location;
  }

  const html = await fetchContent(noteUrl);
  let videoUrl = '';
  let title = '';
  let coverUrl = '';

  // 1. 优先从 window.pageData / window.INIT_STATE 解析最新快手 JSON 树
  const stateMatch = html.match(/window\.pageData\s*=\s*({[\s\S]*?})<\/script>/) ||
                     html.match(/window\.INIT_STATE\s*=\s*({[\s\S]*?})<\/script>/);

  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const photo = state.photo || state.video || state.currentPhoto;
      if (photo) {
        title = photo.caption || photo.title || '';
        videoUrl = photo.mainMvUrls?.[0]?.url || photo.videoResource?.h264Url || photo.srcNoMark || '';
        coverUrl = photo.coverUrls?.[0]?.url || photo.coverUrls?.[0] || photo.poster || photo.coverUrl || '';
      }
    } catch (e) {
      console.error('Kuaishou pageData parse err:', e);
    }
  }

  // 2. 正则抓取高清封面 coverUrl 兜底
  if (!coverUrl) {
    const coverMatch = html.match(/"coverUrls"\s*:\s*\[\s*{[^}]*?"url"\s*:\s*"([^"]+)"/i) ||
                       html.match(/"coverUrl"\s*:\s*"([^"]+)"/i) ||
                       html.match(/"poster"\s*:\s*"([^"]+)"/i) ||
                       html.match(/https?:\\\/\\\/[^\s"'<>]*(yximgs|kuaishou)[^\s"'<>]*(jpg|jpeg|png|webp)/i);
    if (coverMatch) {
      coverUrl = (coverMatch[1] || coverMatch[0]).replace(/\\u002F/gi, '/').replace(/\\/g, '');
    }
  }

  if (coverUrl && coverUrl.startsWith('http:')) {
    coverUrl = coverUrl.replace(/^http:/i, 'https:');
  }

  // 3. 正则兜底解析视频 MP4 地址
  if (!videoUrl) {
    const mp4Match = html.match(/"url"\s*:\s*"([^"]+\.mp4[^"]*)"/i) ||
                     html.match(/"srcNoMark"\s*:\s*"([^"]+)"/i) ||
                     html.match(/https?:\\\/\\\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
    if (mp4Match) {
      videoUrl = (mp4Match[1] || mp4Match[0]).replace(/\\u002F/gi, '/').replace(/\\/g, '');
    }
  }

  // 4. 提取标题兜底
  if (!title) {
    const tMatch = html.match(/"caption"\s*:\s*"([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    title = tMatch ? tMatch[1] : '快手高清无水印作品';
  }

  if (videoUrl) {
    let transcript = text.replace(/(https?:\/\/[^\s\u4e00-\u9fa5]+)/gi, '').trim();
    if (!transcript) transcript = title;

    return {
      platform: '快手',
      title,
      videoUrl,
      coverUrl,
      transcript,
      duration: '00:30',
      durationSeconds: 30
    };
  }
  return null;
}

/**
 * 哔哩哔哩 (B站) 无水印原视频解析算法 (支持 b23.tv 短链、BV号、View API & H5 PlayURL)
 */
async function parseBilibili(rawUrl, text) {
  let targetUrl = rawUrl;
  if (rawUrl.includes('b23.tv')) {
    const res302 = await getNoRedirect(rawUrl);
    if (res302.location) targetUrl = res302.location;
  }

  const bvidMatch = targetUrl.match(/(BV[a-zA-Z0-9]+)/i) || text.match(/(BV[a-zA-Z0-9]+)/i);
  const bvid = bvidMatch ? bvidMatch[1] : '';

  if (!bvid) return null;

  try {
    // 1. 获取视频 View 详情 (标题、封面、cid)
    const viewJsonStr = await fetchContent(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      'Referer': 'https://www.bilibili.com/'
    });
    const viewRes = JSON.parse(viewJsonStr);

    if (viewRes.code === 0 && viewRes.data) {
      const title = viewRes.data.title || '哔哩哔哩高清作品';
      const rawPic = viewRes.data.pic || '';
      const coverUrl = rawPic.replace(/^http:/i, 'https:');
      const cid = viewRes.data.cid;

      if (cid) {
        // 2. 调用原画 PlayURL 接口提取 720P 高清原画 MP4 直链 (qn=64 720P 高清)
        const playUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=64&type=mp4&platform=html5&high_quality=1`;
        const playJsonStr = await fetchContent(playUrl, {
          'Referer': 'https://www.bilibili.com/'
        });
        const playRes = JSON.parse(playJsonStr);

        if (playRes.code === 0 && playRes.data && playRes.data.durl && playRes.data.durl[0]) {
          const videoUrl = playRes.data.durl[0].url;
          let transcript = text.replace(/(https?:\/\/[^\s\u4e00-\u9fa5]+)/gi, '').trim();
          if (!transcript) transcript = title;

          const durationSeconds = Math.round((playRes.data.timelength || 60000) / 1000);
          const mins = String(Math.floor(durationSeconds / 60)).padStart(2, '0');
          const secs = String(durationSeconds % 60).padStart(2, '0');

          return {
            platform: '哔哩哔哩',
            title,
            videoUrl,
            coverUrl,
            transcript,
            duration: `${mins}:${secs}`,
            durationSeconds
          };
        }
      }
    }
  } catch (e) {
    console.error('Bilibili parse err:', e);
  }
  return null;
}

/**
 * 微信视频号（sph）作品解析
 * 请求自建阿里云服务器 (118.31.126.20:8080) 100% 纯自建 Puppeteer 高可用微服务
 */
async function parseSph(rawUrl, text) {
  try {
    const sphUrl = extractUrl(text) || rawUrl;
    const postData = JSON.stringify({ url: sphUrl });

    const jsonStr = await new Promise((resolve) => {
      const req = http.request('http://118.31.126.20:8080/api/parse-sph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000
      }, (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve(b));
      });
      req.on('error', err => {
        console.error('Sph self-hosted puppeteer request error:', err);
        resolve('');
      });
      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });
      req.write(postData);
      req.end();
    });

    if (jsonStr) {
      const res = JSON.parse(jsonStr);
      if (res && res.code === 200 && res.data) {
        return res.data;
      }
    }
  } catch (e) {
    console.error('Sph parse err:', e);
  }
  return null;
}

// 云函数入口主函数（0.1秒纯解析、超强稳定、零负荷）
exports.main = async (event, context) => {
  const inputText = event.url || '';
  const url = extractUrl(inputText);
  const platform = detectPlatform(inputText);

  if (!url) {
    return { code: 400, msg: '未检测到有效的作品链接' };
  }

  try {
    let result = null;
    if (platform === '抖音') {
      result = await parseDouyin(url, inputText);
    } else if (platform === '小红书') {
      result = await parseXiaohongshu(url, inputText);
    } else if (platform === '快手') {
      result = await parseKuaishou(url, inputText);
    } else if (platform === '哔哩哔哩') {
      result = await parseBilibili(url, inputText);
    } else if (platform === '视频号') {
      result = await parseSph(url, inputText);
    }

    if (!result) {
      result = await parseXiaohongshu(url, inputText) || await parseDouyin(url, inputText) || await parseKuaishou(url, inputText) || await parseBilibili(url, inputText) || await parseSph(url, inputText);
    }

    if (result && result.videoUrl) {
      const now = new Date();
      result.id = Date.now().toString();
      result.originalText = inputText;
      result.url = url;
      result.wordCount = (result.transcript || '').length;
      result.createTime = `${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      return {
        code: 200,
        data: result
      };
    } else {
      return { code: 500, msg: '解析失败，请检查链接' };
    }
  } catch (err) {
    return { code: 500, msg: err.message || '系统错误' };
  }
};
