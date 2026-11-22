// Desplazar una gráfica (junto a su ecuación).  node tests/mover_grafica.mjs
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1200, height: 900 }); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; }; const sleep = (ms) => new Promise((o) => setTimeout(o, ms));
await pg.evaluate(() => { HK.hoja.nuevaEq('u(x) = 2 + 0.5*x'); HK.hoja.nuevaEq('fplot(u(x), [0, 6])', true, 0); HK.hoja.nuevaEq('v = 3'); }); await sleep(800);
const info = () => pg.evaluate(() => { const g = [...document.querySelectorAll('#hoja .fila > .eq.conGraf')].pop(); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, left: g.style.left, mt: g.style.marginTop, fila: [...g.parentElement.children].length }; });
let g0 = await info(); console.log('antes', JSON.stringify(g0)); ok(!!g0, 'hay una gráfica junto a su ecuación');
const sy = g0.y + g0.h / 2;
await pg.mouse.move(g0.x + 4, sy); await sleep(100); await pg.mouse.down(); await pg.mouse.move(g0.x - 40, sy + 30, { steps: 6 }); const fin = await pg.evaluate(() => { const f = [...document.querySelectorAll('#hoja > .fila')].pop().getBoundingClientRect(); return f.bottom; }); await pg.mouse.move(g0.x - 100, fin + 60, { steps: 12 }); await sleep(100); await pg.mouse.up(); await sleep(700);
const g1 = await info(); console.log('después', JSON.stringify(g1));
ok(g1 && (Math.abs(g1.y - g0.y) > 60 && g1.fila === 1 && Math.abs(g1.x - (g0.x - 100)) < 8 || g1.left || g1.mt), 'la gráfica se movió (' + (g1 && (g1.y - g0.y).toFixed(0)) + ' px en y)');
ok(!err.length, 'sin errores de JS ' + err.join(' | ').slice(0, 200)); console.log(fallos ? '\nHay fallos' : '\nTodo bien');
await nav.close(); srv.close();
