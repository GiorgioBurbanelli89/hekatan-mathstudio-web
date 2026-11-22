// Hekatan CAD web: achurado (hatch) de un contorno cerrado.   node tests/hekatan_cad_achurado.mjs [editor.png] [hoja.png]
import { inicia } from './_cad_comun.mjs';
const t = await inicia(); const { pg, ok, sleep, herr, clic, ents } = t;
await pg.click('.hcad-bar .snap'); await pg.click('.hcad-bar .iman');
// contornos: rectangulo 4 x 2, circulo R=1 DENTRO del rectangulo, triangulo cerrado (polilinea) y una polilinea ABIERTA
await pg.evaluate(() => { __S.ents.push(
  { t: 'rect', a: [0, 0], b: [4, 2], peso: 'media', capa: '0' }, { t: 'circulo', c: [7, 1], R: 1, peso: 'media', capa: '0' },
  { t: 'poli', pts: [[0, 3], [3, 3], [1.5, 5], [0, 3]], peso: 'media', capa: '0' }, { t: 'poli', pts: [[5, 3], [7, 3], [7, 5]], peso: 'media', capa: '0' }); });
await pg.click('.hcad-bar [data-a="fit"]'); await sleep(100);
// 1) rectangulo: clic dentro
await herr('achurar'); await clic(2, 1); let e = await ents(); let h = e[e.length - 1];
ok(h.t === 'achurado' && h.pts.length === 4 && h.patron === 'ANSI31', 'achurar el rectangulo: 4 vertices, patron ANSI31');
const area = (p) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
ok(Math.abs(area(h.pts) - 8) < 1e-9, 'el contorno achurado tiene el area del rectangulo (8)');
// 2) circulo con patron cuadricula
await pg.select('.hcad-bar .patron', 'ANSI37'); await herr('achurar'); await clic(7, 1); e = await ents(); h = e[e.length - 1];
ok(h.t === 'achurado' && h.pts.length === 48 && h.patron === 'ANSI37' && Math.abs(area(h.pts) - Math.PI) < 0.05, 'achurar el circulo: 48 lados, ANSI37, area ~ pi (' + area(h.pts).toFixed(3) + ')');
// 3) triangulo cerrado, solido
await pg.select('.hcad-bar .patron', 'SOLID'); await herr('achurar'); await clic(1.5, 3.6); e = await ents(); h = e[e.length - 1];
ok(h.t === 'achurado' && h.pts.length === 3 && h.patron === 'SOLID' && Math.abs(area(h.pts) - 3) < 1e-9, 'achurar la polilinea cerrada (triangulo): 3 vertices, area 3, solido');
// 4) polilinea abierta: no hay contorno
const n0 = (await ents()).length; await herr('achurar'); await clic(6.8, 3.2); const n1 = (await ents()).length;
ok(n1 === n0, 'una polilinea abierta no se achura (no se crea nada)');
// 5) contorno anidado: un clic dentro del circulo que esta dentro de otro contorno elige el MENOR; aqui el circulo no esta en el rectangulo, asi que se prueba con un rect interior
await pg.evaluate(() => { __S.ents.push({ t: 'rect', a: [0.5, 0.5], b: [1.5, 1.5], peso: 'media', capa: '0' }); }); await pg.click('.hcad-bar [data-a="fit"]');
await pg.select('.hcad-bar .patron', 'ANSI31'); await herr('achurar'); await clic(1, 1, 0, 0); e = await ents(); h = e[e.length - 1];
ok(h.t === 'achurado' && Math.abs(area(h.pts) - 1) < 1e-9, 'contornos anidados: gana el menor (area 1, no 8)');
// 6) seleccionar el achurado (clic dentro) y cambiar su patron con el selector
await herr('sel'); await clic(3.5, 0.3); const s = await pg.evaluate(() => ({ sel: __S.sel, t: __S.ents[__S.sel] && __S.ents[__S.sel].t }));
ok(s.t === 'achurado', 'clic en el interior elige el achurado (indice ' + s.sel + ')');
await pg.select('.hcad-bar .patron', 'ANSI37'); await sleep(60); ok((await ents())[s.sel].patron === 'ANSI37', 'cambiar el patron del achurado elegido');
// 7) mover el achurado
await herr('mover'); await clic(3.5, 0.3); await sleep(30);
const png = process.argv[2]; if (png) { await herr('sel'); await pg.screenshot({ path: png }); }
// 8) guardar, motor, hoja
const cod = await pg.evaluate(() => HK.cadEditor.escribe(__S.ents, __S.extra, __S.capas));
ok((cod.match(/\(achurado /g) || []).length === 4, 'el codigo escribe 4 achurados (achurado \'(...) :patron "...")');
const o = await pg.evaluate((c) => { const r = HK.cad.ejecuta(c); return r.error ? { error: r.error } : { h: r.ents.filter((x) => x.some((g) => g.c === 0 && g.v[0] === 'HATCH')).length, n: r.ents.length }; }, cod);
ok(!o.error && o.h === 4, 'el motor ejecuta el codigo y deja 4 HATCH (' + JSON.stringify(o) + ')');
const rl = await pg.evaluate((c) => { const l = HK.cadEditor.lee(c); return { h: l.ents.filter((x) => x.t === 'achurado').map((x) => x.patron + ':' + x.pts.length), extra: l.extra.length }; }, cod);
ok(rl.h.length === 4 && rl.extra === 0 && rl.h.includes('SOLID:3') && rl.h.includes('ANSI37:48') && rl.h.includes('ANSI37:4'), 'lee(escribe()) recupera los 4 achurados sin perder nada (' + rl.h.join(' ') + ')');
await pg.click('.hcad-bar [data-a="ok"]'); await sleep(1500);
const hoja = await pg.evaluate(() => { const r = HK.hoja.reg.find((x) => x.t === 'cad'); const d = document.createElement('div'); d.innerHTML = HK.cad.aSvg(r.ents, 440); const hs = [...d.querySelectorAll('svg > polygon')].filter((p) => p.getAttribute('fill') !== 'none'); return { poly: hs.length, pat: hs.map((p) => p.getAttribute('fill')).join(' ') }; });
ok(hoja.poly === 4 && /hkh37/.test(hoja.pat) && /url\(#hkh\)/.test(hoja.pat), 'la hoja dibuja 4 achurados, con patron diagonal y cuadricula (' + hoja.pat.replace(/rgb|#[0-9a-f]{6,8}/g, 'c') + ')');
const png2 = process.argv[3]; if (png2) { await pg.evaluate(() => { const c = document.querySelector('.cad-vista svg, .cad svg'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(300); await pg.screenshot({ path: png2 }); }
await t.fin();
