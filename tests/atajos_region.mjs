// Atajos de región como el WPF: Tab (ecuación nueva en la misma línea), Retroceso al inicio (une con la anterior), Ctrl+D (duplica), Ctrl+J / Ctrl+Mayús+J (junta / separa).  node tests/atajos_region.mjs
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1285, height: 800 });
const err = []; pg.on('pageerror', (e) => err.push(e.message));
const esp = (ms) => new Promise((r) => setTimeout(r, ms)); let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
const carga = async (items) => { await pg.evaluate((it) => HK.hoja.abre(JSON.stringify({ formato: 'hmath 1', eq: 14, txt: 16, gap: 6, fmt: 0, items: it })), items); await esp(300); };
const eqs = () => pg.evaluate(() => HK.hoja.reg.filter((r) => r.t === 'eq').map((r) => ({ t: r.ed.texto(), fila: [...document.querySelectorAll('#hoja .fila')].indexOf(r.el.closest('.fila')), act: HK.hoja.activa() === r.ed, cur: r.ed.cur.i })));
const clicEq = async (k) => { const b = await pg.evaluate((k) => { const r = HK.hoja.reg.filter((x) => x.t === 'eq')[k].el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, k); await pg.mouse.click(b.x, b.y); await esp(80); };
const ctrl = async (k, shift) => { await pg.keyboard.down('Control'); if (shift) await pg.keyboard.down('Shift'); await pg.keyboard.press(k); if (shift) await pg.keyboard.up('Shift'); await pg.keyboard.up('Control'); await esp(120); };
const selec = (idx) => pg.evaluate((idx) => { HK.mover.limpiaSel(); const us = HK.mover.unidades(); idx.forEach((i) => { HK.mover.sel.add(us[i]); us[i].classList.add('mv-sel'); }); }, idx);
// 1) Tab: ecuación nueva en la MISMA línea, con el cursor en ella
await carga([{ t: 'eq', codigo: 'a = 1' }, { t: 'eq', codigo: 'b = 2' }]); await clicEq(0); await pg.keyboard.press('Tab'); await esp(120);
let l = await eqs(); ok(l.length === 3 && l[1].t === '' && l[1].fila === l[0].fila && l[1].act && l[2].fila !== l[0].fila, 'Tab: ecuación nueva en la misma línea, activa y entre a y b ' + JSON.stringify(l.map((x) => x.t + '@' + x.fila)));
await pg.keyboard.type('c'); await esp(60); l = await eqs(); ok(l[1].t === 'c', 'se puede teclear en la nueva');
// 2) Retroceso al inicio: une con la anterior, cursor en la unión
await carga([{ t: 'eq', codigo: 'a = 1' }, { t: 'eq', codigo: 'b = 2' }]); await clicEq(1);
await pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'eq')[1]; r.ed.cur = { fila: r.ed.fila, i: 0 }; r.ed.dibuja(); }); await pg.keyboard.press('Backspace'); await esp(120); l = await eqs();
ok(l.length === 1 && l[0].t.replace(/\s/g, '') === 'a=1b=2' && l[0].act && l[0].cur === 3, 'Retroceso al inicio: une con la de arriba, cursor en la unión ' + JSON.stringify(l));
// 3) Ctrl+D: duplica la activa debajo; y la selección
await carga([{ t: 'eq', codigo: 'a = 1' }, { t: 'eq', codigo: 'b = 2' }]); await clicEq(0); await ctrl('d'); l = await eqs();
ok(l.length === 3 && l[1].t === 'a=1' && l[1].fila === l[0].fila + 1 && l[2].t === 'b=2', 'Ctrl+D: duplica la región activa justo debajo ' + JSON.stringify(l.map((x) => x.t + '@' + x.fila)));
await carga([{ t: 'eq', codigo: 'a = 1' }, { t: 'eq', codigo: 'b = 2' }, { t: 'eq', codigo: 'c = 3' }]); await selec([0, 1]); await pg.mouse.move(5, 5); await ctrl('d'); l = await eqs();
ok(l.length === 5 && l.map((x) => x.t).join() === 'a=1,b=2,a=1,b=2,c=3', 'Ctrl+D con 2 seleccionadas: las duplica debajo, en orden ' + l.map((x) => x.t).join());
// 4) Ctrl+J junta en una línea; Ctrl+Mayús+J separa
await carga([{ t: 'eq', codigo: 'a = 1' }, { t: 'eq', codigo: 'b = 2' }, { t: 'eq', codigo: 'c = 3' }]); await selec([0, 1, 2]); await ctrl('j'); l = await eqs();
ok(l.length === 3 && new Set(l.map((x) => x.fila)).size === 1 && l.map((x) => x.t).join() === 'a=1,b=2,c=3', 'Ctrl+J: las tres quedan en una sola línea, en orden');
await ctrl('j', true); l = await eqs(); ok(l.length === 3 && new Set(l.map((x) => x.fila)).size === 3 && l.map((x) => x.t).join() === 'a=1,b=2,c=3', 'Ctrl+Mayús+J: cada una en su línea, mismo orden ' + JSON.stringify(l.map((x) => x.fila)));
ok(!err.length, err.length ? 'errores JS: ' + err.join(' | ') : 'sin errores de JS'); await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
