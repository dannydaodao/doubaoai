const sample = {
  data: {
    authorInfo: { nickname: '宁波律所团队-娄主任' },
    feedInfo: {
      description: '承重墙被拆隐瞒不报...',
      coverUrl: 'https://finder.video.qq.com/251/20304/stodownload?encfilekey=111',
      spec: [{ url: 'https://finder.video.qq.com/251/20304/stodownload?encfilekey=KGDRibp2wkicKC1aSURoAZqRGE7OrDld4ruzGvBa0uqW4YOLqPMspFVoEYIxXteYPG4aKEiaJSBK8XYEJICqUyvPA&token=XYZ' }]
    }
  }
};

const str = JSON.stringify(sample.data.feedInfo);
console.log('JSON String:', str);

const matches = str.match(/https?:[\\/]+finder\.video\.qq\.com[\\/]+251[\\/]+20304[\\/]+stodownload[^\s"']+/gi) || str.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi);
console.log('Matches:', matches);
