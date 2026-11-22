// Desplazar tablas: bloque «Tabla» (celdas editables) y la tabla de resultados tabla(a, b).  node tests/mover_tabla.mjs
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1200, height: 900 }); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; }; const sleep = (ms) => new Promise((o) => setTimeout(o, ms));
async function mueve(sel, dx, nombre, minDx) {
  const info = () => pg.evaluate((s) => { const g = [...document.querySelectorAll('#hoja .fila > *')].find((e) => e.matches(s) && e.getBoundingClientRect().height > 10); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, ml: g.style.marginLeft, l: g.style.left, mt: g.style.marginTop, n: g.parentElement.children.length }; }, sel);
  const a = await info(); ok(!!a, 'hay ' + nombre); if (!a) return;
  const fin = await pg.evaluate(() => [...document.querySelectorAll('#hoja > .fila')].pop().getBoundingClientRect().bottom);
  await pg.mouse.move(a.x + 4, a.y + a.h / 2); await sleep(80); await pg.mouse.down(); await pg.mouse.move(a.x + 30, a.y + a.h / 2 + 30, { steps: 6 }); await pg.mouse.move(a.x + dx, fin + 70, { steps: 12 }); await sleep(80); await pg.mouse.up(); await sleep(700);
  const b = await info(); console.log(nombre, JSON.stringify(a), '->', JSON.stringify(b));
  ok(b && b.y - a.y > 40 && b.x - a.x > (minDx == null ? dx - 14 : minDx), nombre + ' se movió en x (+' + (b && (b.x - a.x).toFixed(0)) + ') e y (+' + (b && (b.y - a.y).toFixed(0)) + ')');
}
await pg.evaluate(() => { HK.hoja.nuevaEq('v = 3'); HK.hoja.nuevaTabla(3, 3); HK.hoja.nuevaEq('w = 4'); }); await sleep(800);
await mueve('.txt:has(table)', 120, 'la tabla (bloque propio)');
const js = await pg.evaluate(() => HK.hoja.guarda()); const it = JSON.parse(js).items.find((i) => i.html && /<table/.test(i.html));
ok(it && it.dx > 80 && it.dy > 0, 'se guarda en el .hmath con su tabla: dx=' + (it && it.dx) + ' dy=' + (it && it.dy));
await pg.evaluate(async () => { HK.hoja.abre(await (await fetch('ejemplos/Placa_Kirchhoff_BFS_losa_rectangular.hmath')).text()); }); await sleep(2500);
const nT = await pg.evaluate(() => { const r = HK.hoja.reg.find((x) => x.t === 'eq' && x.graf && x.graf.tipo === 'tabla'); if (!r) return 0; r.el.classList.add('es-tabla'); r.el.scrollIntoView({ block: 'center' }); return 1; }); await sleep(400);
await mueve('.es-tabla', 120, 'la tabla de resultados tabla(...) (ya casi de ancho completo: solo cabe un poco a la derecha)', 10);
ok(!err.length, 'sin errores de JS ' + err.join(' | ').slice(0, 200)); console.log(fallos ? '\nHay fallos' : '\nTodo bien');
await nav.close(); srv.close();
