// Recorre la hoja con scroll en pasos pequenos y mide, por grafica (canvas), cuantos pixeles NO blancos tiene: detecta lienzos vacios (solo leyenda/ejes).
// Uso: node _graficas_scroll.mjs <hoja.hmath> [paso_px]
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.hmath': 'application/json; charset=utf-8', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ru = fs.existsSync(f) && fs.statSync(f).isFile() ? f : path.join(AQUI, 'index.html'); r.writeHead(200, { 'Content-Type': T[path.extname(ru)] || 'application/octet-stream' }); fs.createReadStream(ru).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await b.newPage(); await pg.setViewport({ width: 1100, height: 700 });
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html?vacia', { waitUntil: 'load' });
await pg.waitForFunction('window.HK && HK.motor && (HK.motor.listo || HK.motor.error)', { timeout: 60000 });
await pg.evaluate((t) => HK.hoja.abre(t), fs.readFileSync(path.resolve(process.argv[2]), 'utf8')); await new Promise((r) => setTimeout(r, 2500));
const paso = +(process.argv[3] || 40);
const medida = () => pg.evaluate(() => { const a = document.getElementById('area'), ar = a.getBoundingClientRect(); return [...document.querySelectorAll('#hoja canvas')].map((c, i) => { const r = c.getBoundingClientRect(); const vis = r.bottom > ar.top && r.top < ar.bottom && r.width > 0; let col = 0; try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let k = 0; k < d.length; k += 16) { const R = d[k], G = d[k + 1], B = d[k + 2], A = d[k + 3]; if (A > 0 && Math.max(R, G, B) - Math.min(R, G, B) > 40) col++; } } catch (e) { col = -1; } return { i, vis, w: c.width, h: c.height, col }; }); });
const tot = await pg.evaluate(() => { const a = document.getElementById('area'); return a.scrollHeight - a.clientHeight; });
const malos = new Map(); let n = 0;
for (let y = 0; y <= tot + paso; y += paso) { await pg.evaluate((v) => { document.getElementById('area').scrollTop = v; }, y); await new Promise((r) => setTimeout(r, 30)); n++;
  for (const g of await medida()) if (g.vis && g.col < 30) { const k = g.i; if (!malos.has(k)) malos.set(k, []); malos.get(k).push(y); } }
const fin = await medida(); console.log('cuadros', n, 'lienzos', fin.length); fin.forEach((g) => console.log(' lienzo', g.i, g.w + 'x' + g.h, 'pixeles coloreados', g.col));
console.log('vacios estando a la vista:', malos.size ? [...malos].map(([k, v]) => 'lienzo ' + k + ' en ' + v.length + ' cuadros (y=' + v[0] + '..' + v[v.length - 1] + ')').join('; ') : 'ninguno');
await b.close(); srv.close();
