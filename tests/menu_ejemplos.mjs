// Menú Ejemplos: abre cada hoja de la lista y comprueba que cargó (regiones > 0, sin errores).
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
const lista = await pg.evaluate(() => [...document.querySelectorAll('#menu button[data-ej]')].map((b) => b.dataset.ej));
const uni = [...new Set(lista)]; console.log('entradas:', uni.length);
for (const f of uni) {
  const antes = err.length;
  await pg.evaluate((f) => HK.app.abreEjemplo(f), f); await sleep(2500);
  const n = await pg.evaluate(() => HK.hoja.reg.length);
  ok(n > 0 && err.length === antes, f.split('/').pop().slice(0, 60) + ' · ' + n + ' regiones' + (err.length > antes ? ' · ERR ' + err.slice(antes).join('|') : ''));
}
await pg.evaluate(() => document.querySelector('#menu .mi:nth-child(2)').classList.add('abierto')); await pg.screenshot({ path: path.resolve(AQUI, 'tests/salida/menu_ejemplos.png') });
console.log('fallos', fallos); await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
