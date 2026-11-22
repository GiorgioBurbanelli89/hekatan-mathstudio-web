// Saca la hoja de la web como imagen a tamaño real (#papel, 96 dpi) para compararla con la página del WPF.
//   node tests/pagina_png.mjs ejemplos/X.hmath salida.png
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1100, height: 5700 });
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
const hoja = process.argv[2], png = process.argv[3];
const txt = fs.readFileSync(path.resolve(AQUI, hoja), 'utf8');
await pg.evaluate((t) => { HK.hoja.abre(t); }, txt); await new Promise((o) => setTimeout(o, 2500));
const info = await pg.evaluate(() => { const p = document.getElementById('papel'); const r = p.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, pg: [...p.querySelectorAll('.pg')].map((e) => [e.textContent, Math.round(e.offsetTop)]), cortes: [...p.querySelectorAll('.corte')].map((e) => Math.round(e.offsetTop)), pad: getComputedStyle(p).padding }; });
console.log(JSON.stringify(info));
const el = await pg.$('#papel'); await el.screenshot({ path: png });
await nav.close(); srv.close();
