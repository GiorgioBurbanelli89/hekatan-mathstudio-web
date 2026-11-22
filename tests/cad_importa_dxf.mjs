// Puente Hekatan CAD → hoja: importa un DXF (LINE, CIRCLE, ARC, LWPOLYLINE, TEXT) a un bloque CAD y comprueba que se dibuja.
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
const NL = String.fromCharCode(10);
const dxf = ['0','SECTION','2','ENTITIES','0','LINE','8','MUROS','10','0','20','0','30','0','11','6','21','0','31','0',
 '0','CIRCLE','8','0','10','3','20','2','30','0','40','1',
 '0','ARC','8','0','10','0','20','0','30','0','40','2','50','0','51','90',
 '0','LWPOLYLINE','8','0','70','1','10','1','20','1','10','4','20','1','10','4','20','3','10','1','20','3',
 '0','TEXT','8','0','10','1','20','4','30','0','40','0.3','1','Eje A',
 '0','SPLINE','8','0','0','ENDSEC','0','EOF'].join(NL);
await pg.evaluate(() => HK.hoja.abre(JSON.stringify({ formato: 'hmath 1', eq: 14, txt: 16, gap: 6, fmt: 0, items: [{ t: 'texto', text: 'Prueba', titulo: true, nivel: 1 }] }))); await sleep(1500);
const r = await pg.evaluate((d) => { const o = HK.cadImporta.aEntmake(d); const ok = HK.cadImporta.importaDxf(d, 'prueba.dxf'); return { n: o.lineas.length, om: o.omitidas, ok, primera: o.lineas[0] }; }, dxf); await sleep(1500);
console.log(JSON.stringify(r));
ok(r.n === 5 && r.om.SPLINE === 1, '5 entidades leídas y la SPLINE se avisa como no soportada');
const info = await pg.evaluate(() => { const c = HK.hoja.reg.filter((x) => x.t === 'cad').pop(); return c ? { ents: c.ents.length, msg: c.el.querySelector('.cad-msg').textContent, svg: !!c.el.querySelector('.cad-vista svg') } : null; });
console.log(JSON.stringify(info)); ok(info && info.ents === 5 && info.svg && !/⚠/.test(info.msg), 'el bloque CAD dibuja las 5 entidades (SVG sin error)');
await pg.evaluate(() => HK.hoja.reg.filter((x) => x.t === 'cad').pop().el.scrollIntoView()); await pg.screenshot({ path: path.resolve(AQUI, 'tests/salida/cad_importa_dxf.png') });
console.log('errores:', err.join(' | ') || 'ninguno'); await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
