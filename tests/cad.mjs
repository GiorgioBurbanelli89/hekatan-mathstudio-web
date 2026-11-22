// Pestaña CAD (AutoLISP) de Math Studio Web: botones → entidades → SVG → .lsp / DXF → guardar y abrir .hmath.   node tests/cad.mjs [url] [carpeta_png]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = createRequire(import.meta.url)(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const SAL = path.resolve(process.argv[3] || path.join(AQUI, 'tests', 'salida')); fs.mkdirSync(SAL, { recursive: true });
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1100, height: 900 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await pg.goto(process.argv[2] || 'http://127.0.0.1:8000/index.html'); await pg.waitForFunction(() => HK.motor.listo, { timeout: 60000 });
let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
const clic = async (txt) => { await pg.evaluate((t) => { const b = [...document.querySelectorAll('#cinta .bt')].find((x) => x.textContent.trim().endsWith(t)); if (!b) throw new Error('no hay botón ' + t); b.click(); }, txt); await esp(120); };

console.log('1. La pestaña CAD ya no está vacía');
await pg.evaluate(() => [...document.querySelectorAll('#pestanas button')].find((x) => x.textContent === 'CAD').click());
const botones = await pg.evaluate(() => [...document.querySelectorAll('#cinta .bt')].map((b) => b.textContent.trim()));
ok(botones.length >= 12, 'botones de la pestaña CAD: ' + botones.join(' · '));

console.log('2. Cada botón agrega una entidad al bloque y se dibuja');
await pg.evaluate(() => HK.app.nuevo());
await clic('Dibujo nuevo');
for (const b of ['Línea', 'Rectángulo', 'Círculo', 'Arco', 'Polilínea', 'Curva', 'Achurado', 'Texto', 'Cota']) await clic(b);
await clic('Capa'); await esp(300);
const est = await pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'cad'); const q = r[0]; return { bloques: r.length, ents: q.ents.map((e) => e.find((g) => g.c === 0).v[0]), msg: q.el.querySelector('.cad-msg').textContent, svg: q.el.querySelector('svg') ? q.el.querySelector('svg').innerHTML.length : 0 }; });
ok(est.bloques === 1, 'un solo bloque CAD (los botones agregan al mismo): ' + est.bloques);
ok(JSON.stringify(est.ents) === JSON.stringify(['LINE', 'LWPOLYLINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'LWPOLYLINE', 'HATCH', 'TEXT', 'DIMENSION']), 'entidades: ' + est.ents.join(', '));
ok(!/⚠/.test(est.msg), 'sin error en el bloque: «' + est.msg + '»');
ok(est.svg > 1500, 'el SVG se dibujó (' + est.svg + ' caracteres)');
await pg.screenshot({ path: path.join(SAL, 'cad_1_botones.png') });

console.log('3. Exportar AutoLISP (.lsp) y volver a leerlo con el mismo motor');
const lsp = await pg.evaluate(() => HK.cad.aLsp(HK.hoja.reg.filter((x) => x.t === 'cad')[0].ents, 'dibujo'));
ok(/\(defun c:HKDIBUJO/.test(lsp) && (lsp.match(/\(entmake '/g) || []).length === 9, 'defun c:HKDIBUJO con 9 entmake');
ok(lsp.split('(').length === lsp.split(')').length, 'paréntesis balanceados');
const vuelta = await pg.evaluate((t) => {
  const f = t.split('\n').filter((l) => /^\s*\(entmake '/.test(l)).join('\n'); const o = HK.cad.ejecuta(f); return o.error || o.ents.map((e) => e.find((g) => g.c === 0).v[0]).join(',');
}, lsp);
ok(vuelta === 'LINE,LWPOLYLINE,CIRCLE,ARC,LWPOLYLINE,LWPOLYLINE,HATCH,TEXT,DIMENSION', 'los entmake del .lsp rehacen el mismo dibujo: ' + vuelta);
fs.writeFileSync(path.join(SAL, 'dibujo_prueba.lsp'), lsp);

console.log('4. Exportar DXF');
const dxf = await pg.evaluate(() => HK.cad.aDxf(HK.hoja.reg.filter((x) => x.t === 'cad')[0].ents));
const lin = dxf.split('\n');
ok(lin[0] === '0' && lin[1] === 'SECTION' && /\nEOF\n$/.test(dxf), 'estructura SECTION … EOF');
ok((dxf.match(/\nLWPOLYLINE\n/g) || []).length === 3 && /\nCIRCLE\n/.test(dxf) && /\nDIMENSION\n/.test(dxf) && /\nHATCH\n/.test(dxf), 'entidades LWPOLYLINE×3, CIRCLE, DIMENSION y HATCH presentes');
ok(/\n10\n0\.0\n20\n0\.0\n30\n0\.0\n/.test(dxf), 'punto 3D como 10/20/30');
fs.writeFileSync(path.join(SAL, 'dibujo_prueba.dxf'), dxf);

console.log('5. Editar el código a mano, errores y guardar/abrir .hmath');
await pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'cad')[0]; r.ta.value = ';; solo una viga\n(rect \'(0 0) 6 0.5)\n(cota \'(0 -0.5) \'(6 -0.5) :sep -0.4)'; r.ta.dispatchEvent(new Event('input')); });
await esp(500);
let m2 = await pg.evaluate(() => HK.hoja.reg.filter((x) => x.t === 'cad')[0].el.querySelector('.cad-msg').textContent); ok(/2 entidades/.test(m2), 'tras editar: ' + m2);
await pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'cad')[0]; r.ta.value = "(linea '(0 0))"; r.ta.dispatchEvent(new Event('input')); }); await esp(500);
m2 = await pg.evaluate(() => { const q = HK.hoja.reg.filter((x) => x.t === 'cad')[0]; return q.el.querySelector('.cad-msg').textContent + ' | svg se conserva: ' + !!q.el.querySelector('svg'); }); ok(/⚠/.test(m2) && /conserva: true/.test(m2), 'código con error avisa y no borra el dibujo: ' + m2);
await pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'cad')[0]; r.ta.value = "(rect '(0 0) 6 0.5)\n(texto '(1 1) \"Viga V1\" :altura 0.3)"; r.ta.dispatchEvent(new Event('input')); }); await esp(500);
const json = await pg.evaluate(() => HK.hoja.guarda());
ok(JSON.parse(json).items.some((i) => i.t === 'cad' && /Viga V1/.test(i.codigo)), 'guarda() incluye el bloque CAD');
await pg.evaluate((j) => HK.hoja.abre(j), json); await esp(500);
const re = await pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'cad'); return { n: r.length, ents: r[0] && r[0].ents.length, svg: !!(r[0] && r[0].el.querySelector('svg')) }; });
ok(re.n === 1 && re.ents === 2 && re.svg, 'abre() lo reconstruye y lo dibuja: ' + JSON.stringify(re));

console.log('6. Escribir en el código no dispara las teclas de la hoja');
await pg.evaluate(() => { const t = document.querySelector('.cad textarea'); if (t && t.style.display === 'none') document.querySelector('.cad [data-a="cod"]').click(); }); await pg.click('.cad textarea'); await pg.evaluate(() => { const t = document.querySelector('.cad textarea'); t.setSelectionRange(t.value.length, t.value.length); }); await pg.keyboard.type('^/_'); await esp(200);
const intacto = await pg.evaluate(() => ({ eqs: HK.hoja.reg.filter((x) => x.t === 'eq').length, cod: HK.hoja.reg.filter((x) => x.t === 'cad')[0].ta.value.slice(-3) }));
ok(intacto.cod === '^/_', 'el textarea recibe las teclas tal cual: ' + intacto.cod);
await pg.evaluate(() => { HK.hoja.reg.filter((x) => x.t === 'cad')[0].ta.value = "(rect '(0 0) 6 0.5)\n(texto '(1 1) \"Viga V1\" :altura 0.3)"; HK.hoja.reg.filter((x) => x.t === 'cad')[0].dibuja(); });
ok(errs.length === 0, 'sin errores de página' + (errs.length ? ': ' + errs.join(' | ') : ''));
await pg.evaluate(() => window.scrollTo(0, 0)); await pg.screenshot({ path: path.join(SAL, 'cad_2_viga.png') });
console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\nTodo bien. PNG en ' + SAL); await nav.close(); process.exit(fallos ? 1 : 0);
