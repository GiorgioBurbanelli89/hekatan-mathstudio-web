// Franja azul de mover visible al pasar el cursor.  node tests/franja_mover.mjs captura.png
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1000, height: 700 });
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
await pg.evaluate(() => { HK.hoja.nuevaEq('a = 2'); HK.hoja.nuevaEq('b = a*3'); }); await new Promise((o) => setTimeout(o, 400));
const b = await pg.evaluate(() => { const u = [...document.querySelectorAll('#hoja .fila > .eq')].pop(); const r = u.getBoundingClientRect(); return { x: r.left, y: r.top, h: r.height }; });
await pg.mouse.move(b.x + 4, b.y + b.h / 2); await new Promise((o) => setTimeout(o, 200));
const cls = await pg.evaluate(() => [...document.querySelectorAll('.mv-asa,.mv-agarre')].map((e) => e.className));
console.log('clases con el cursor sobre la franja:', JSON.stringify(cls));
await pg.screenshot({ path: process.argv[2] || 'franja.png', clip: { x: b.x - 20, y: b.y - 30, width: 260, height: 100 } });   // la captura quita el hover real: se re-aplican las clases
await nav.close(); srv.close();
