const puppeteer = require('puppeteer-core');
const path = require('path');

const homeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <path d="M32 10 L52 26 L52 50 A4 4 0 0 1 48 54 L16 54 A4 4 0 0 1 12 50 L12 26 Z" fill="none" stroke="#8A8A8A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 54 L26 36 A2 2 0 0 1 28 34 L36 34 A2 2 0 0 1 38 36 L38 54" fill="none" stroke="#8A8A8A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const homeActiveSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <path d="M32 9 L53 25 A2 2 0 0 1 54 27 L54 50 A4 4 0 0 1 50 54 L14 54 A4 4 0 0 1 10 50 L10 27 A2 2 0 0 1 11 25 Z" fill="#6C5CE7"/>
  <path d="M26 54 L26 36 A2 2 0 0 1 28 34 L36 34 A2 2 0 0 1 38 36 L38 54 Z" fill="#FFFFFF"/>
</svg>`;

const userSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="22" r="11" fill="none" stroke="#8A8A8A" stroke-width="4"/>
  <path d="M12 52 C12 40 21 37 32 37 C43 37 52 40 52 52" fill="none" stroke="#8A8A8A" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const userActiveSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="21" r="11" fill="#6C5CE7"/>
  <path d="M12 52 C12 39 21 36 32 36 C43 36 52 39 52 52 Z" fill="#6C5CE7"/>
</svg>`;

async function generateIcons() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const icons = [
    { svg: homeSvg, name: 'home.png' },
    { svg: homeActiveSvg, name: 'home_active.png' },
    { svg: userSvg, name: 'user.png' },
    { svg: userActiveSvg, name: 'user_active.png' }
  ];

  for (const item of icons) {
    const page = await browser.newPage();
    await page.setViewport({ width: 64, height: 64, deviceScaleFactor: 2 });
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;">${item.svg}</body></html>`;
    await page.setContent(html);
    const outPath = path.join(__dirname, '../miniprogram/images', item.name);
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Generated ${item.name} -> ${outPath}`);
    await page.close();
  }

  await browser.close();
}

generateIcons();
