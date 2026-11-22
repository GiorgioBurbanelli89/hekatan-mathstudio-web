// Hekatan CAD REAL (LispCad.js de Hekatan LISP) dentro de Math Studio web: boton del bloque CAD → ventana .hkcad → orden L → Guardar → el bloque cambia.
//   node tests/hekatan_cad_real.mjs [captura_ventana.png] [captura_hoja.png]
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1280, height: 800 }); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
const sleep = (ms) => new Promise((o) => setTimeout(o, ms));
// hoja con un bloque CAD (una linea y un circulo en codigo AutoLISP)
await pg.evaluate(() => { HK.hoja.nuevoCad(";; Dibujo\n(linea '(0 0) '(4 0))\n(circulo '(2 2) 1)"); });
await sleep(800);
const antes = await pg.evaluate(() => HK.hoja.reg.find((x) => x.t === 'cad').ta.value);
await pg.click('.cad-bar [data-a="hcad"]'); await sleep(1200);
const fr = (await pg.$('iframe.hkcad-marco')); ok(!!fr, 'aparece el iframe del CAD');
const f = await fr.contentFrame();
ok(!!(await f.$('.hkcad')), 'ventana .hkcad abierta');
const botones = await f.$$eval('.hkcad-herr button', (b) => b.map((x) => x.textContent.replace(/\s+/g, '')));
for (const n of ['Línea', 'Polilínea', 'Rectángulo', 'Mover', 'Copiar', 'Girar', 'Escala', 'Simetría', 'Desfase', 'Recortar', 'Alargar', 'Empalme', 'Chaflán', '3DPol', '3DCara', 'SCP']) ok(botones.some((x) => x.startsWith(n)), 'barra: ' + n);
ok(await f.$eval('.hkcad-cab', (e) => /Dibujar/.test(e.textContent) && /Planta/.test(e.textContent) && /Guardar en la hoja/.test(e.textContent)), 'cabecera: Dibujar, Planta/Frente…, Guardar en la hoja');
ok(await f.$eval('.hkcad-ord', (e) => /Orden:/.test(e.textContent)), 'linea Orden:');
ok(await f.$$eval('.hkcad-est label', (l) => ['Final', 'Medio', 'Centro'].every((n) => l.some((x) => x.textContent.includes(n)))), 'refent Final/Medio/Centro');
const ne0 = await pg.frames().find((f) => f !== pg.mainFrame() && f.url() === 'about:srcdoc').evaluate(() => hkCad.estado().ents.filter((e) => e[0][1] === 'LINE').length);
ok(ne0 === 1, 'carga la LINE del bloque (' + ne0 + ')');
// dibuja una linea con la orden L y coordenadas
await f.click('.hkcad-inp'); await f.type('.hkcad-inp', 'L'); await pg.keyboard.press('Enter'); await sleep(150);
await f.type('.hkcad-inp', '0,0'); await pg.keyboard.press('Enter'); await sleep(150);
await f.type('.hkcad-inp', '6,3'); await pg.keyboard.press('Enter'); await sleep(150); await pg.keyboard.press('Enter'); await sleep(200);
const ne1 = await pg.frames().find((f) => f !== pg.mainFrame() && f.url() === 'about:srcdoc').evaluate(() => hkCad.estado().ents.filter((e) => e[0][1] === 'LINE').length);
ok(ne1 === 2, 'la orden L agrega una LINE (' + ne1 + ')');
if (process.argv[2]) await pg.screenshot({ path: process.argv[2] });
await f.click('.hkcad-guardar'); await sleep(800);
const desp = await pg.evaluate(() => HK.hoja.reg.find((x) => x.t === 'cad').ta.value);
ok(desp !== antes && /entmake/.test(desp) && /6(\.0+)?\s+3/.test(desp), 'el bloque cambió y guarda (entmake) la linea nueva');
console.log(desp.split('\n').map((l) => '   ' + l.slice(0, 150)).join('\n'));
const nEnts = await pg.evaluate(() => HK.hoja.reg.find((x) => x.t === 'cad').ents.filter((e) => e.some((g) => g.c === 0 && g.v[0] === 'LINE')).length);
ok(nEnts === 2, 'el bloque recalculó: 2 LINE (' + nEnts + ') (las cotas automaticas del CAD real se suman)');
await f.click('.hkcad-cerrar'); await sleep(300);
ok(!(await pg.$('iframe.hkcad-marco')), 'la ventana se cierra');
if (process.argv[3]) await pg.screenshot({ path: process.argv[3] });
// el boton de la barra superior abre la misma ventana; el respaldo sigue
await pg.evaluate(() => HK.cadReal.abre()); await sleep(1000); ok(!!(await pg.$('iframe.hkcad-marco')), 'boton de la barra: abre la ventana real'); await pg.evaluate(() => HK.cadReal.cierra());
await pg.evaluate(() => HK.cadEditor.abre()); await sleep(300); ok(!!(await pg.$('.hcad')), 'respaldo cadeditor.js sigue funcionando');
ok(!err.length, 'sin errores de JS ' + err.join(' | ').slice(0, 300));
console.log(fallos ? '\nHay fallos (' + fallos + ')' : '\nTodo bien'); await nav.close(); srv.close(); process.exitCode = fallos ? 1 : 0;
