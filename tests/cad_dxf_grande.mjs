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
const cab = ['0','SECTION','2','ENTITIES'], pie = ['0','ENDSEC','0','EOF'];
const lines = (n, extra) => { const a = cab.slice(); for (let i = 0; i < n; i++) a.push('0','LINE','8','0','10',String(i),'20','0','11',String(i),'21','1'); if (extra) a.push(...extra); return a.concat(pie).join(NL); };
const nBloques = () => pg.evaluate(() => HK.hoja.reg.filter((x) => x.t === 'cad').length);
const ultimo = () => pg.evaluate(() => { const c = HK.hoja.reg.filter((x) => x.t === 'cad').pop(); return c ? { ents: c.ents.length, svg: c.el.querySelector('.cad-vista svg') ? c.el.querySelector('.cad-vista svg').outerHTML.length : 0, nan: /NaN|Infinity/.test(c.el.innerHTML), msg: c.el.querySelector('.cad-msg').textContent } : null; });
const estado = () => pg.evaluate(() => (document.querySelector('#estado, .estado') || {}).textContent || '');
await pg.evaluate(() => HK.hoja.abre(JSON.stringify({ formato: 'hmath 1', eq: 14, txt: 16, gap: 6, fmt: 0, items: [{ t: 'texto', text: 'Prueba', titulo: true, nivel: 1 }] }))); await sleep(1500);
const MAXE = await pg.evaluate(() => HK.cadImporta.MAX_ENT);
const imp = (d) => pg.evaluate((t) => HK.cadImporta.importaDxf(t, 'grande.dxf'), d);

// 1) 300 mil LINE (> 5 MB): se rechaza, no se crea bloque
let d = lines(300000); console.log('  300k LINE =', (d.length / 1048576).toFixed(1), 'MB');
let r = await imp(d); await sleep(800);
ok(r === false && (await nBloques()) === 0, '300 mil LINE (>5 MB): rechazado, sin bloque y sin error');
// 2) 30 mil LINE (< 5 MB): se importan las primeras 20000 y avisa
d = lines(MAXE + 3000); r = await imp(d); await sleep(3000); let u = await ultimo(); console.log(JSON.stringify(u));
ok(r === true && u && u.ents === MAXE && u.svg > 0 && !u.nan && !/⚠/.test(u.msg), 'LINE sobre el tope: bloque con el tope de ' + MAXE + ' entidades y SVG sin NaN');
// 3) LWPOLYLINE de 400 mil vértices (>5 MB) rechazada; de 100 mil (<5 MB) se corta a 2000 vértices
const poli = (n) => { const a = cab.concat(['0','LWPOLYLINE','8','0','70','0']); for (let i = 0; i < n; i++) a.push('10', String(i), '20', String(i % 7)); return a.concat(pie).join(NL); };
d = poli(400000); r = await imp(d); await sleep(500); ok(r === false, 'LWPOLYLINE de 400 mil vértices (>5 MB): rechazada');
const nb0 = await nBloques();
d = poli(100000); r = await imp(d); await sleep(2500); u = await ultimo();
const nv = await pg.evaluate(() => { const c = HK.hoja.reg.filter((x) => x.t === 'cad').pop(); const m = c && c.el.querySelector('.cad-vista svg polyline'); return m ? m.getAttribute('points').split(' ').length : -1; });
console.log(JSON.stringify(u), 'vértices en SVG:', nv);
ok(r === true && (await nBloques()) === nb0 + 1 && nv === 2000 && !u.nan, 'LWPOLYLINE de 100 mil vértices: se corta a 2000 y el SVG no tiene NaN');
// 4) línea de texto de 50 MB: rechazada
const nb1 = await nBloques(); d = '0' + NL + 'SECTION' + NL + '2' + NL + 'ENTITIES' + NL + 'x'.repeat(50 * 1048576);
r = await imp(d); await sleep(500); ok(r === false && (await nBloques()) === nb1, 'línea de texto de 50 MB: rechazada sin crear bloque');
// 5) coordenadas no finitas: la entidad se ignora
const nb2 = await nBloques();
d = lines(3, ['0','LINE','8','0','10','nan','20','0','11','1','21','1','0','LINE','8','0','10','1e999','20','0','11','1','21','1','0','CIRCLE','8','0','10','0','20','0','40','Infinity']);
r = await imp(d); await sleep(1500); u = await ultimo();
ok(r === true && u.ents === 3 && !u.nan && !/⚠/.test(u.msg), 'coordenadas NaN/Infinity en el DXF: entidades ignoradas (quedan 3, SVG sin NaN)');
// 6) cad.js directo: entidades con NaN/Infinity/1e13 no salen en el SVG
const svg = await pg.evaluate(() => { const L = (a, b, c, d) => [{ c: 0, v: ['LINE'], par: true }, { c: 8, v: ['0'], par: true }, { c: 10, v: [a, b, 0], par: false }, { c: 11, v: [c, d, 0], par: false }]; const e = [L(0, 0, 5, 5), L(NaN, 0, 1, 1), L(0, 0, Infinity, 1), L(0, 0, 1e13, 1)]; try { return HK.cad.aSvg(e, 400); } catch (x) { return 'ERR ' + x.message; } });
console.log('  svg directo:', svg.slice(0, 60).replace(/\n/g, ' '));
ok(!/NaN|Infinity/.test(svg) && !/^ERR/.test(svg), 'cad.aSvg descarta entidades con NaN/Infinity/>1e12');
console.log('errores:', err.join(' | ') || 'ninguno'); ok(err.length === 0, 'sin errores de consola/página');
await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
