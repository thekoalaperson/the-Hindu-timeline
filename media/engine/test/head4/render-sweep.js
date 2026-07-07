#!/usr/bin/env node
// render-sweep.js — render a head4 candidate through harness.html and
// screenshot the sweep grid.
//
// Usage:  node render-sweep.js <candidateAbsPath> <outPng>
// (run with cwd /home/user/the-Hindu-timeline/media)

'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('/home/user/the-Hindu-timeline/media/node_modules/playwright-core');

const HARNESS = '/tmp/claude-0/-home-user-the-Hindu-timeline/b405e8a4-35cc-57c0-b0ec-fb2c5e3db8fe/scratchpad/head4/harness.html';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function main(){
  const [cand, outPng] = process.argv.slice(2);
  if (!cand || !outPng){
    console.error('usage: node render-sweep.js <candidateAbsPath> <outPng>');
    process.exit(2);
  }
  const candAbs = path.resolve(cand);
  if (!fs.existsSync(candAbs)){
    console.error('candidate not found: ' + candAbs);
    process.exit(2);
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 2450, height: 1420 },
      deviceScaleFactor: 1,
    });
    page.on('pageerror', e => console.error('[pageerror] ' + e.message));
    page.on('console', m => {
      if (m.type() === 'error') console.error('[console.error] ' + m.text());
    });

    const url = 'file://' + HARNESS + '?cand=' + encodeURIComponent(candAbs);
    await page.goto(url);
    await page.waitForFunction('window.__done === true', null, { timeout: 30000 });

    const errors = await page.evaluate('window.__errors');
    await page.locator('#cv').screenshot({ path: path.resolve(outPng) });

    console.log('wrote ' + path.resolve(outPng));
    if (errors && errors.length){
      console.log('__errors (' + errors.length + '):');
      for (const e of errors) console.log('  - ' + e);
      process.exitCode = 1;
    } else {
      console.log('__errors: none');
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
