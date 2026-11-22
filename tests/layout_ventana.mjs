// ¿La barra de estado y el desplazamiento de la hoja quedan DENTRO de la ventana? (pedido de Jorge: «no veo la flecha para bajar las hojas»)
//   node tests/layout_ventana.mjs [hoja.hmath]
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const hoja = process.argv[2] || 'ejemplos/Funciones_de_forma_2D_CSI.hmath', txt = fs.readFileSync(path.resolve(AQUI, hoja), 'utf8');
let fallos = 0;
for (const [w, h, dpr] of [[1707, 960, 1.25], [1560, 960, 1.25], [1285, 800, 1], [1100, 700, 1], [900, 600, 1]]) {
  const pg = await nav.newPage(); await pg.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
  await pg.evaluate((t) => { HK.hoja.abre(t); }, txt); await new Promise((o) => setTimeout(o, 2500));
  const m = await pg.evaluate(() => { const a = document.getElementById('area'), e = document.getElementById('estado'), ra = a.getBoundingClientRect(), re = e.getBoundingClientRect(), d = document.scrollingElement;
    return { vw: innerWidth, vh: innerHeight, docH: d.scrollHeight, docW: d.scrollWidth, area: [Math.round(ra.left), Math.round(ra.top), Math.round(ra.right), Math.round(ra.bottom)], areaCl: [a.clientWidth, a.clientHeight, a.scrollHeight], areaOv: getComputedStyle(a).overflowY, estado: [Math.round(re.top), Math.round(re.bottom)] }; });
  const dentro = m.estado[1] <= m.vh + 1 && m.area[3] <= m.vh + 1 && m.docH <= m.vh + 1 && m.docW <= m.vw + 1;
  console.log((dentro ? '  ✅ ' : '  ❌ ') + w + '×' + h + ' @' + dpr + ' ' + JSON.stringify(m)); if (!dentro) fallos++;
  await pg.close();
}
console.log(fallos ? '\nHay fallos' : '\nTodo bien'); await nav.close(); srv.close();
