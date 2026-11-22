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
const dir2 = process.argv[2]; const ficheros = fs.readdirSync(path.resolve(AQUI, 'ejemplos')).filter((f) => f.endsWith('.hmath'));
const salida = async (t) => { await pg.evaluate((t) => HK.hoja.abre(t), t); await sleep(3500); return pg.evaluate(() => HK.hoja.reg.filter((r) => r.t !== 'txt' && r.ed).map((r) => { const q = r.ed.resultado; return q ? (q.fila ? q.sim + HK.filasATexto(q.fila) : (q.texto || q.kind || JSON.stringify(q))) : ''; })); };
for (const f of ficheros) {
  const a = await salida(fs.readFileSync(path.resolve(AQUI, 'ejemplos', f), 'utf8')), b = await salida(fs.readFileSync(path.join(dir2, f), 'utf8'));
  const dif = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) dif.push(i + ': ' + (a[i] || '').slice(0, 70) + '  ≠  ' + (b[i] || '').slice(0, 70));
  ok(a.length === b.length && !dif.length, f + ' · ' + a.length + ' ecuaciones' + (dif.length ? ' · ' + dif.length + ' difieren:\n      ' + dif.slice(0, 6).join('\n      ') : ''));
}
await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
