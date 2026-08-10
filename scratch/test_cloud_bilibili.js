const index = require('/home/caijun/doubaoai/cloudfunctions/doubaoai/index.js');

async function runTest() {
  const link = '【“辛弃疾 ：看好了这一剑会很帅 ”-哔哩哔哩】 https://b23.tv/uUf0jCM';
  console.log('Testing Bilibili link in cloud function...');
  const res = await index.main({ url: link });
  console.log('Cloud Function Response Code:', res.code);
  console.log('Parsed Data:', JSON.stringify(res.data, null, 2));
}

runTest();
