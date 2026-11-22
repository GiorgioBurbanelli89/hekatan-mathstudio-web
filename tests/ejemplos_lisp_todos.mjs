// Abre los 110 ejemplos de Hekatan LISP en Math Studio web (ejemplos/hlisp/lista.json): cada uno debe cargar con regiones > 0 y sin errores de JS.
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1100, height: 900 }); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
const sleep = (ms) => new Promise((o) => setTimeout(o, ms));
const abre = async (h) => { await pg.evaluate((t) => { HK.hoja.abre(t); }, fs.readFileSync(path.resolve(AQUI, h), 'utf8')); await sleep(3500); };
const L = JSON.parse(fs.readFileSync(path.resolve(AQUI, 'ejemplos/hlisp/lista.json'), 'utf8')); console.log('ejemplos:', L.length);
await sleep(1500); console.log('botones en el menú:', await pg.evaluate(() => document.querySelectorAll('#grp-lisp ~ button').length));
const malos = [];
for (const n of L) {
  const antes = err.length; let reg = -1;
  try { await pg.evaluate((f) => HK.app.abreEjemplo(f), 'ejemplos/hlisp/' + n); await sleep(900); reg = await pg.evaluate(() => HK.hoja.reg.length); } catch (e) { err.push('EXC ' + n + ' ' + e.message); }
  if (reg < 1 || err.length > antes) malos.push(n + ' · regiones ' + reg + (err.length > antes ? ' · ' + err.slice(antes).join('|').slice(0, 150) : ''));
}
ok(!malos.length, (L.length - malos.length) + ' de ' + L.length + ' cargan bien'); malos.forEach((m) => console.log('     ✗ ' + m));
console.log('errores totales:', err.length); await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
