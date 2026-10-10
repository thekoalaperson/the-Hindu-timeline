import fs from 'node:fs';
import zlib from 'node:zlib';
const dir = process.argv[2] || 'dist/pagefind/fragment';
const want = process.argv[3] || '';
let n = 0;
const bad = [];
for (const f of fs.readdirSync(dir)) {
  const b = fs.readFileSync(dir + '/' + f);
  const s = zlib.gunzipSync(b).toString();
  const j = JSON.parse(s.slice(s.indexOf('{')));
  if (want && !j.url.includes(want)) continue;
  if (n < 4) console.log(JSON.stringify({ url: j.url, meta: j.meta, filters: j.filters }));
  const sec = j.meta?.section || '';
  if (sec.includes(':') || sec.includes(', ')) bad.push(j.url + ' -> ' + sec);
  n++;
}
console.log('checked', n, 'fragments; dirty meta.section:', bad.length);
if (bad.length) console.log(bad.slice(0, 3).join('\n'));
