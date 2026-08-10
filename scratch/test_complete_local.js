const http = require('http');
const https = require('https');

// GitHub 开源标准二次换取函数
function fetchSphProfile(sphUrl) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ url: sphUrl });
    const req = https.request({
      hostname: 'sph.litao.workers.dev',
      port: 443,
      path: '/api/fetch_video_profile',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15'
      },
      timeout: 8000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && data.errCode === 0 && data.data) {
            resolve(data);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.write(postData);
    req.end();
  });
}

// 模拟自建微服务处理函数
async function parseSph(sphUrl) {
  const profile = await fetchSphProfile(sphUrl);
  if (profile && profile.data && profile.data.feedInfo) {
    const fi = profile.data.feedInfo;
    const ai = profile.data.authorInfo || {};

    const videoUrl = fi.h264VideoInfo?.videoUrl || fi.videoUrl || '';
    const coverUrl = fi.coverUrl || '';
    const title = fi.description || `${ai.nickname || '视频号'}的作品`;

    if (videoUrl) {
      return {
        platform: '视频号',
        title,
        videoUrl,
        coverUrl,
        transcript: title,
        author: ai.nickname || '视频号作者'
      };
    }
  }
  return null;
}

// 本地测试执行
async function runLocalTest() {
  console.log('=== 正在进行基于凭证二次换取的 GitHub 标准本地测试 ===');
  const urls = [
    'https://weixin.qq.com/sph/ABt3nrUqTd',
    'https://weixin.qq.com/sph/ARdjw9uJ0f'
  ];

  for (let url of urls) {
    console.log(`\n测试链接: ${url}`);
    const res = await parseSph(url);
    if (res && res.videoUrl) {
      console.log('✅ 测试成功！');
      console.log('视频作者:', res.author);
      console.log('作品标题:', res.title.slice(0, 40));
      console.log('原画 MP4 视频直链 (20302 目录):', res.videoUrl.slice(0, 90));
      console.log('JPG 封面图片直链 (20304 目录):', res.coverUrl.slice(0, 90));
      console.log('视频与封面是否分离:', res.videoUrl !== res.coverUrl ? '✅ 完美分离' : '❌ 重复');
    } else {
      console.log('❌ 测试失败');
    }
  }
}

runLocalTest();
