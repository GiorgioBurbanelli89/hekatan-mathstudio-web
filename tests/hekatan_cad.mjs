// Hekatan CAD en la web: dibuja con el ratón (línea, rectángulo, círculo, arco, cota, texto), guarda en la hoja y reabre el bloque.
//   node tests/hekatan_cad.mjs [captura.png]
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1100, height: 760 }); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
const sleep = (ms) => new Promise((o) => setTimeout(o, ms));
await pg.evaluate(() => HK.cadEditor.abre()); await pg.waitForSelector('.hcad-lienzo svg'); await sleep(300);
const L = await pg.evaluate(() => { const r = document.querySelector('.hcad-lienzo').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
// origen (0,0) está en (60px, alto-60px) con s = 60 px/m y x0=y0=-1
const P = (x, y) => [L.x + (x + 1) * 60, L.y + L.h - (y + 1) * 60];
const herr = (t) => pg.click('.hcad-bar [data-t="' + t + '"]');
const clic = async (x, y) => { const [cx, cy] = P(x, y); await pg.mouse.move(cx, cy); await pg.mouse.click(cx, cy); await sleep(60); };
await pg.select('.hcad-bar .peso', 'gruesa'); await herr('linea'); await clic(0, 0); await clic(6, 0);
await pg.select('.hcad-bar .peso', 'media'); await herr('rect'); await clic(1, 1); await clic(3, 2);
await herr('circulo'); await clic(5, 2); await clic(6, 2);
await herr('arco'); await clic(0, 0); await clic(1, 0); await clic(0, 1);
await herr('cota'); await clic(0, 0); await clic(6, 0); await clic(6, -0.5);
await herr('texto'); await clic(2, 3); await pg.keyboard.type(' viga'); await pg.keyboard.press('Enter'); await sleep(200);
ok(await pg.evaluate(() => document.querySelectorAll('.hcad-lienzo svg > *').length) > 30, 'el lienzo dibuja las entidades');
const png = process.argv[2]; if (png) await pg.screenshot({ path: png });
await pg.click('.hcad-bar [data-a="ok"]'); await sleep(900);
const cod = await pg.evaluate(() => (HK.hoja.reg.find((x) => x.t === 'cad') || {}).ta?.value || '');
console.log(cod.split('\n').map((l) => '   ' + l).join('\n'));
ok(!document_cerrado(await pg.$('.hcad')), 'la ventana se cierra al guardar');
function document_cerrado(h) { return h !== null; }
ok(/\(peso "gruesa"\)\n\(linea '\(0 0\) '\(6 0\)\)/.test(cod), 'línea gruesa (0,0)-(6,0)');
ok(/\(rect '\(1 1\) 2 1\)/.test(cod), 'rectángulo 2 × 1');
ok(/\(circulo '\(5 2\) 1\)/.test(cod), 'círculo R = 1');
ok(/\(arco '\(0 0\) 1 0 90\)/.test(cod), 'arco 0°→90°');
ok(/\(cota '\(0 0\) '\(6 0\) :sep -0.5 :texto "L = 6"\)/.test(cod), 'cota L = 6 con :sep -0.5');
ok(/\(texto '\(2 3\) "Texto viga"/.test(cod) || /\(texto '\(2 3\) "[^"]*viga"/.test(cod), 'texto');
ok(await pg.evaluate(() => HK.hoja.reg.find((x) => x.t === 'cad').ents.length) === 6, 'el bloque CAD tiene las 6 entidades (línea, rectángulo, círculo, arco, cota, texto)');
// reabrir el bloque desde su botón y conservar una línea que el editor no entiende
await pg.evaluate(() => { const r = HK.hoja.reg.find((x) => x.t === 'cad'); r.ta.value += '\n(curva (lambda (x) (* 0.1 x)) 0 4)'; r.dibuja(); });
await pg.click('.cad [data-a="hcad0"]'); await pg.waitForSelector('.hcad'); await sleep(300);
ok(await pg.evaluate(() => document.querySelectorAll('.hcad-lienzo svg line,.hcad-lienzo svg rect,.hcad-lienzo svg circle,.hcad-lienzo svg path').length) > 10, 'al reabrir, el editor trae el dibujo');
await pg.click('.hcad-bar [data-a="ok"]'); await sleep(600);
const cod2 = await pg.evaluate(() => HK.hoja.reg.find((x) => x.t === 'cad').ta.value);
ok(/\(curva \(lambda/.test(cod2), 'lo que el editor no entiende (curva) se conserva al guardar');
ok(!err.length, 'sin errores de JS ' + err.join(' | ').slice(0, 300)); console.log(fallos ? '\nHay fallos' : '\nTodo bien');
await nav.close(); srv.close();
