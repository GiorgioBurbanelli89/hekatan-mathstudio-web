// Hekatan CAD web: cotas angular, de radio y de diametro.   node tests/hekatan_cad_cotas.mjs [editor.png] [hoja.png]
import { inicia } from './_cad_comun.mjs';
const t = await inicia(); const { pg, ok, sleep, herr, clic, ents, cerca } = t;
// geometria: dos lineas perpendiculares en (0,0) y un circulo R=1 en (6,2)
await pg.click('.hcad-bar .snap');                                  // sin rejilla
await pg.evaluate(() => { __S.ents.push({ t: 'linea', a: [0, 0], b: [4, 0], peso: 'media', capa: '0' }, { t: 'linea', a: [0, 0], b: [0, 3], peso: 'media', capa: '0' }, { t: 'circulo', c: [6, 2], R: 1, peso: 'media', capa: '0' }); });
await pg.click('.hcad-bar [data-a="fit"]'); await sleep(100);
await pg.click('.hcad-bar .iman');                                  // imanes fuera para elegir LINEA y no el extremo
// 1) ANGULAR con dos lineas: clic en cada una (lejos de extremos) y el arco en el sector (1,1)
await herr('cotaang'); await clic(1.3, 0); await clic(0, 1.1); await clic(1, 1); let e = await ents(); let a = e[e.length - 1];
ok(a.t === 'cotaang' && cerca(a.v, [0, 0], 1e-6), 'cota angular de 2 lineas: vertice en la esquina (' + a.v + ')');
const ang = (v, p) => Math.atan2(p[1] - v[1], p[0] - v[0]) * 180 / Math.PI;
ok(Math.abs(Math.abs(ang(a.v, a.p2) - ang(a.v, a.p1)) - 90) < 1e-6, 'el sector medido es de 90 grados (' + ang(a.v, a.p1).toFixed(1) + ' y ' + ang(a.v, a.p2).toFixed(1) + ')');
// 2) ANGULAR por vertice y dos puntos (con imanes apagados y sin rejilla, puntos exactos)
await pg.click('.hcad-bar .iman');                                  // con imanes, el clic en la esquina pega al extremo: modo vertice
await herr('cotaang'); await clic(0, 0); await clic(3, 0); await clic(2, 2); await clic(2.2, 0.8); e = await ents(); a = e[e.length - 1];
ok(a.t === 'cotaang' && cerca(a.p1, [3, 0]) && cerca(a.p2, [2, 2]), 'cota angular por vertice + 2 puntos (' + e.length + ' entidades)');
// 3) RADIO y DIAMETRO sobre el circulo
await herr('cotarad'); await clic(6, 3);  await clic(6.8, 2.6); e = await ents(); const r = e[e.length - 1];
ok(r.t === 'cotarad' && cerca(r.c, [6, 2]), 'cota de radio: centro (6,2), punto en el circulo (' + r.p.map((v) => +v.toFixed(2)) + ')');
ok(Math.abs(Math.hypot(r.p[0] - r.c[0], r.p[1] - r.c[1]) - 1) < 1e-6, 'el punto de la cota esta en la circunferencia (R = 1)');
await herr('cotadia'); await clic(6, 3); await clic(5.2, 1.4); e = await ents(); const d = e[e.length - 1];
ok(d.t === 'cotadia' && Math.abs(Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) - 2) < 1e-6, 'cota de diametro: mide 2');
const png = process.argv[2]; if (png) { await herr('sel'); await pg.screenshot({ path: png }); }
// 4) GUARDAR: el codigo se escribe como entmake DIMENSION y el motor lo entiende
const cod = await pg.evaluate(() => HK.cadEditor.escribe(__S.ents, __S.extra, __S.capas));
ok(/\(70 \. 37\)/.test(cod) && /\(70 \. 36\)/.test(cod) && /\(70 \. 35\)/.test(cod), 'el codigo tiene las DIMENSION 37 (angular), 36 (radio) y 35 (diametro)');
const o = await pg.evaluate((c) => { const r = HK.cad.ejecuta(c); return r.error ? { error: r.error } : { n: r.ents.length, dims: r.ents.filter((x) => x.some((g) => g.c === 0 && g.v[0] === 'DIMENSION')).map((x) => ({ k: x.find((g) => g.c === 70).v[0], m: x.find((g) => g.c === 42).v[0] })) }; }, cod);
ok(!o.error && o.dims.length === 4, 'el motor ejecuta el codigo: 4 cotas (' + JSON.stringify(o.dims || o.error) + ')');
ok(o.dims && Math.abs(o.dims[0].m - Math.PI / 2) < 1e-6, 'medida angular del motor = pi/2 (90 grados)');
// 5) releer: lee(escribe(x)) devuelve las mismas cotas
const rl = await pg.evaluate((c) => { const l = HK.cadEditor.lee(c); return { ts: l.ents.map((x) => x.t), extra: l.extra.length }; }, cod);
ok(rl.ts.filter((x) => x.startsWith('cota')).length === 4 && rl.extra === 0, 'lee(escribe()) recupera las 4 cotas sin dejar nada en extra (' + rl.ts.join(',') + ')');
// 6) en la hoja: el bloque CAD dibuja las cotas
await pg.click('.hcad-bar [data-a="ok"]'); await sleep(1500);
const n = await pg.evaluate(() => document.querySelectorAll('.hk-cota-esp').length);
ok(n === 4, 'la hoja dibuja 4 cotas especiales en el SVG (' + n + ')');
const png2 = process.argv[3]; if (png2) { await pg.evaluate(() => { const c = document.querySelector('.hk-cota-esp'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(300); await pg.screenshot({ path: png2 }); }
await t.fin();
