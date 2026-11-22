// Abre una hoja .hmath y vuelca cada ecuacion con su resultado/error. Uso: node _dump_hoja.mjs <hoja.hmath> [captura.png]
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.hmath': 'application/json; charset=utf-8', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ru = fs.existsSync(f) && fs.statSync(f).isFile() ? f : path.join(AQUI, 'index.html'); r.writeHead(200, { 'Content-Type': T[path.extname(ru)] || 'application/octet-stream' }); fs.createReadStream(ru).pipe(r); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await b.newPage(); await pg.setViewport({ width: 1100, height: 1000 });
const cons = []; pg.on('console', (m) => { if (m.type() === 'error') cons.push(m.text()); }); pg.on('pageerror', (e) => cons.push('PAGEERR ' + e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html?vacia', { waitUntil: 'load' });
await pg.waitForFunction('window.HK && HK.motor && (HK.motor.listo || HK.motor.error)', { timeout: 60000 });
await pg.evaluate((t) => HK.hoja.abre(t), fs.readFileSync(path.resolve(process.argv[2]), 'utf8')); await new Promise((r) => setTimeout(r, 3000));
const filas = await pg.evaluate(() => HK.hoja.reg.filter((x) => x.t === 'eq').map((x) => { let t = ''; try { t = x.ed.texto(); } catch (e) {} const r = x.ed.resultado; return t.split(String.fromCharCode(10))[0].slice(0, 60) + '  ==>  ' + (r ? (r.sim ? 'SIM ' + (JSON.stringify(r.fila).match(/"s":"[^"]*"/g) || []).map((q) => q.slice(5, -1)).join(' ') : JSON.stringify(r).slice(0, 200)) : '-'); }));
console.log(filas.join('\n')); console.log('CONSOLA', cons.join(' | '));
if (process.argv[3]) { await pg.screenshot({ path: process.argv[3] }); }
await b.close(); srv.close();
