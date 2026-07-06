import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE:', m.text()); });
await page.goto('file:///home/user/the-Hindu-timeline/media/winning-of-draupadi/dist/index.html');
await page.waitForTimeout(900);
await page.screenshot({ path: process.argv[2] + '/player-poster.png' });
await page.click('#poster');           // start playback
await page.waitForTimeout(4000);
const state = await page.evaluate(() => ({
  t: document.querySelector('#clock').textContent,
  playing: !document.querySelector('#poster').classList.contains('hide') ? 'poster-visible' : 'playing',
}));
console.log('after 4s:', JSON.stringify(state));
await page.evaluate(() => { seekTo(87); });   // garland scene
await page.waitForTimeout(800);
await page.screenshot({ path: process.argv[2] + '/player-garland.png' });
await browser.close();
console.log('player test done');
