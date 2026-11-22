// Utilidades comunes de las pruebas del editor Hekatan CAD web (servidor estatico + puppeteer + raton real en coordenadas del dibujo).
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
export async function inicia(codigo) {
  const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
  await new Promise((o) => srv.listen(0, '127.0.0.1', o));
  const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1100, height: 760 }); const err = []; pg.on('pageerror', (e) => { err.push(e.message); console.log('[pageerror]', e.message); });
  await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
  const sleep = (ms) => new Promise((o) => setTimeout(o, ms));
  pg.on("console", (m) => console.log("[consola]", m.text())); await pg.evaluate((c) => { window.__S = HK.cadEditor.abre(c ? { ta: { value: c }, dibuja() {} } : undefined); }, codigo || null); await pg.waitForSelector('.hcad-lienzo svg'); await sleep(300);
  const L = await pg.evaluate(() => { const r = document.querySelector('.hcad-lienzo').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
  // la vista del editor puede cambiar con «fit»: se lee de S en cada clic
  const P = async (x, y) => { const v = await pg.evaluate(() => ({ x0: __S.x0, y0: __S.y0, s: __S.s })); return [L.x + (x - v.x0) * v.s, L.y + L.h - (y - v.y0) * v.s]; };
  const herr = (t) => pg.click('.hcad-bar [data-t="' + t + '"]');
  const mueve = async (x, y, dx = 0, dy = 0) => { const [cx, cy] = await P(x, y); await pg.mouse.move(cx + dx, cy + dy); await sleep(40); };
  const clic = async (x, y, dx = 0, dy = 0) => { const [cx, cy] = await P(x, y); await pg.mouse.move(cx + dx, cy + dy); await pg.mouse.click(cx + dx, cy + dy); await sleep(60); };
  const ents = () => pg.evaluate(() => JSON.parse(JSON.stringify(__S.ents)));
  const cerca = (a, b, tol = 0.03) => Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol;
  const fin = async () => { ok(!err.length, 'sin errores de JS ' + err.join(' | ').slice(0, 300)); console.log(fallos ? '\nHay fallos (' + fallos + ')' : '\nTodo bien'); await nav.close(); srv.close(); process.exitCode = fallos ? 1 : 0; };
  return { pg, nav, ok, sleep, herr, mueve, clic, ents, cerca, fin, P, L, err };
}
