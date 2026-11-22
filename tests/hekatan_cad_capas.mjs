// Hekatan CAD web: capas (crear, activar, ocultar, color).   node tests/hekatan_cad_capas.mjs [editor.png] [hoja.png]
import { inicia } from './_cad_comun.mjs';
const t = await inicia(); const { pg, ok, sleep, herr, clic, ents } = t;
const trazos = () => pg.evaluate(() => [...document.querySelectorAll('.hcad-svg svg > line, .hcad-svg svg > rect, .hcad-svg svg > circle[r]')].filter((n) => n.getAttribute('stroke-width')).map((n) => ({ tag: n.tagName, stroke: n.getAttribute('stroke') })));
await pg.click('.hcad-bar .snap'); await pg.click('.hcad-bar .iman');
// 1) crear capas desde el panel
await pg.click('.hcad-bar [data-a="capas"]'); await sleep(100);
ok(await pg.evaluate(() => !document.querySelector('.hcad-capas').hidden), 'el panel de capas se abre');
const crea = async (n, c) => { await pg.type('.hcad-capas .cp-nn', n); await pg.select('.hcad-capas .cp-nc', String(c)); await pg.click('.hcad-capas .cp-crear'); await sleep(80); };
await crea('CARGAS', 1);
ok(await pg.evaluate(() => __S.capa) === 'CARGAS' && await pg.evaluate(() => __S.capas.find((x) => x.n === 'CARGAS').c) === 1, 'crear: CARGAS (rojo) queda creada y activa');
ok(await pg.evaluate(() => document.querySelector('.hcad-bar .capa').value) === 'CARGAS', 'el selector de la barra muestra la capa activa');
// 2) dibujar en CARGAS (gruesa) y en APOYOS (verde, media)
await pg.select('.hcad-bar .peso', 'gruesa'); await herr('linea'); await clic(0, 0); await clic(3, 0);
await crea('APOYOS', 3); await pg.select('.hcad-bar .peso', 'media'); await herr('rect'); await clic(0, 1); await clic(2, 2);
// 3) volver a la capa 0 desde el panel (boton ○ de su fila) y dibujar
await pg.click('.hcad-capas .cp-f[data-n="0"] .cp-act'); await sleep(80); await herr('circulo'); await clic(5, 1); await clic(6, 1);
let e = await ents();
ok(e.length === 3 && e[0].capa === 'CARGAS' && e[1].capa === 'APOYOS' && e[2].capa === '0', 'activar: cada entidad nace en la capa activa (' + e.map((x) => x.capa).join(', ') + ')');
let tr = await trazos(); const col = (tag) => (tr.find((q) => q.tag === tag) || {}).stroke;
ok(tr.some((q) => q.tag === 'line' && q.stroke === '#d32f2f') && tr.some((q) => q.tag === 'rect' && q.stroke === '#2e9e4f'), 'color: linea roja (capa CARGAS) y rectangulo verde (APOYOS)');
const png = process.argv[2]; if (png) { await herr('sel'); await pg.screenshot({ path: png }); }
// 4) cambiar color de APOYOS a azul
await pg.select('.hcad-capas .cp-f[data-n="APOYOS"] .cp-col', '5'); await sleep(80); tr = await trazos();
ok(tr.some((q) => q.tag === 'rect' && q.stroke === '#1a4fa3'), 'cambiar el color de la capa recolorea sus entidades (azul)');
// 5) ocultar CARGAS: la linea desaparece y ya no se puede elegir con el raton
await pg.click('.hcad-capas .cp-f[data-n="CARGAS"] .cp-ojo'); await sleep(80); tr = await trazos();
ok(!tr.some((q) => q.tag === 'line' && q.stroke === '#d32f2f'), 'ocultar: la linea de CARGAS ya no se dibuja');
await herr('sel'); await clic(1.5, 0); ok(await pg.evaluate(() => __S.sel) === -1, 'una entidad oculta no se puede elegir');
// 6) guardar: el codigo lleva (capa "..." :color n) y la capa oculta con color negativo; la hoja no dibuja lo oculto
const cod = await pg.evaluate(() => HK.cadEditor.escribe(__S.ents, __S.extra, __S.capas));
ok(/\(capa "CARGAS" :color -1\)/.test(cod) && /\(capa "APOYOS" :color 5\)/.test(cod), 'el codigo escribe CARGAS (-1 = apagada) y APOYOS (5)');
await pg.click('.hcad-bar [data-a="ok"]'); await sleep(1500);
const hoja = await pg.evaluate(() => { const r = HK.hoja.reg.find((x) => x.t === 'cad'); const s = r.vista ? r.vista.querySelector('svg') : document.querySelector('.cad svg'); return { ents: r.ents.length, capas: r.ents.capas, lineas: s ? s.querySelectorAll('line').length : -1, peso: r.ents.map((x) => x.peso || null) }; });
ok(hoja.ents === 3 && hoja.capas.CARGAS.off === true && hoja.capas.APOYOS.c === 5, 'el motor devuelve 3 entidades y la tabla de capas (CARGAS apagada, APOYOS = 5): ' + JSON.stringify(hoja.capas));
ok(hoja.peso[0] === 'gruesa' && hoja.peso[1] === 'media', 'la capa y el grosor conviven (peso ' + hoja.peso.join(', ') + ')');
const hs = await pg.evaluate(() => { const r = HK.hoja.reg.find((x) => x.t === 'cad'); const d = document.createElement('div'); d.innerHTML = HK.cad.aSvg(r.ents, 440); return { lineas: d.querySelectorAll('svg > line').length, rect: d.querySelectorAll('svg > polygon, svg > polyline').length, circ: d.querySelectorAll('svg > circle').length }; });
ok(hs.lineas === 0 && hs.rect === 1 && hs.circ === 1, 'SVG de la hoja: sin la linea oculta, con el rectangulo y el circulo (' + JSON.stringify(hs) + ')');
const dxf = await pg.evaluate(() => { const r = HK.hoja.reg.find((x) => x.t === 'cad'); return HK.cad.aDxf(r.ents); });
ok(/LAYER\n70\n0\n62\n-1\n/.test(dxf.replace(/\r/g, '').replace(/2\nCARGAS\n/, '')) || /CARGAS\n70\n0\n62\n-1/.test(dxf), 'el DXF lleva la capa CARGAS con color -1 (apagada, como AutoCAD)');
const png2 = process.argv[3]; if (png2) { await sleep(200); await pg.screenshot({ path: png2 }); }
// 7) reabrir en el editor: las capas vuelven como estaban
await pg.evaluate(() => { window.__S = HK.cadEditor.abre(HK.hoja.reg.find((x) => x.t === 'cad')); }); await sleep(400);
const r2 = await pg.evaluate(() => ({ capas: __S.capas, ents: __S.ents.map((x) => x.t + ':' + x.capa + ':' + x.peso), extra: __S.extra.length }));
ok(r2.capas.length === 3 && r2.capas.find((x) => x.n === 'CARGAS').c === -1 && r2.capas.find((x) => x.n === 'APOYOS').c === 5 && r2.extra === 0, 'reabrir: capas, colores y estado oculto recuperados (' + JSON.stringify(r2.capas) + ' | ' + r2.ents.join(' ') + ')');
await t.fin();
