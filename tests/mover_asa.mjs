// Agarrar CADA tipo de region por el centro vertical de la franja VISIBLE del asa (borde izquierdo de la region + 4 px, NO el rect del canvas),
// con deviceScaleFactor 1.5 y zoom 1 y 1.54. Comprueba asa, cursor move, que no empiece seleccion, y el orden con HK.hoja.guarda().
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1800, height: 1700, deviceScaleFactor: 1.5 }); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
const sleep = (ms) => new Promise((o) => setTimeout(o, ms)); let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
const lin = JSON.parse(fs.readFileSync(path.resolve(AQUI, 'ejemplos/Funciones_de_forma_1D_lineal.hmath'), 'utf8')), cadEj = JSON.parse(fs.readFileSync(path.resolve(AQUI, 'ejemplos/Funciones_de_forma_1D_hipotesis_graficas.hmath'), 'utf8')).items.find((i) => i.t === 'cad');
const hoja = { formato: 'hmath 1', items: [{ t: 'texto', text: 'Titulo', titulo: true }, { t: 'eq', codigo: 'a=2' }, { t: 'eq', codigo: 'b=a+3', mismaLinea: true }, { t: 'texto', text: 'un parrafo de texto' }, { t: 'eq', codigo: 'c=b*2' }, ...lin.items.filter((i) => i.t === 'slider'), { t: 'eq', codigo: 's=0:0.1:1' }, { t: 'eq', codigo: 'curvas(s, s, s, s, "a", "b", "c", "graf", "x", "y")' }, cadEj, { t: 'texto', text: 'fin' }].filter(Boolean) };
const items = () => pg.evaluate(() => JSON.parse(HK.hoja.guarda()).items.map((i) => i.t + (i.mismaLinea ? '*' : '') + ':' + String(i.codigo || i.text || i.nombre || '').replace(/\s+/g, ' ').slice(0, 20)));
const medir = () => pg.evaluate(() => HK.mover.unidades().map((u, i) => { const b = u.getBoundingClientRect(), c = u.querySelector('canvas'), cb = c && c.getBoundingClientRect(); return { i, cls: u.className, l: b.left, t: b.top, w: b.width, h: b.height, cl: cb ? cb.left : null }; }));
for (const z of [1, 1.54]) {
  console.log('--- zoom ' + z + ' ---');
  const carga = async () => { await pg.evaluate((h) => HK.hoja.abre(h), hoja); await sleep(1500); await pg.evaluate((z) => { HK.app.ponZoom(z); document.getElementById('area').scrollTop = 0; }, z); await sleep(700); };
  await carga(); let us = await medir(); const n0 = (await items()).length;
  ok(us.length === n0, 'unidades = items (' + us.length + '/' + n0 + ')'); console.log(us.map((u) => u.i + ' ' + u.cls + ' ' + Math.round(u.l) + ',' + Math.round(u.t) + ' ' + Math.round(u.w) + 'x' + Math.round(u.h)).join('\n'));
  for (let i = 0; i < us.length; i++) {
    await carga(); us = await medir(); const u = us[i]; if (u.h < 8 || u.w < 11) { console.log('  (salta region ' + i + ' ' + u.cls + ': sin tamano visible)'); continue; }
    const antes = await items(), x = u.l + 4, y = u.t + u.h / 2;
    await pg.mouse.move(x - 30, y); await pg.mouse.move(x, y); await sleep(120);
    const h = await pg.evaluate((x, y) => { const e = document.elementFromPoint(x, y); const ag = document.querySelector('.mv-agarre'); return { asa: !!document.querySelector('.mv-asa'), ag: !!ag, cur: getComputedStyle(ag || document.body).cursor, cursEl: getComputedStyle(e).cursor }; }, x, y);
    ok(h.asa && h.ag && h.cursEl === 'move', 'region ' + i + ' (' + u.cls.split(' ')[0] + ', canvas.left-region.left=' + (u.cl === null ? '-' : Math.round(u.cl - u.l)) + '): asa + cursor move ' + JSON.stringify(h));
    const dest = i === 0 ? us[us.length - 1] : us[0], yd = i === 0 ? dest.t + dest.h + 3 : dest.t + 2, xd = dest.l + Math.min(dest.w / 2, 120);
    await pg.mouse.down(); await pg.mouse.move(x + 25, y + (yd > y ? 20 : -20), { steps: 4 }); const sel = await pg.evaluate(() => String(getSelection()) + '|' + (document.querySelector('.mv-banda') ? 'banda' : '')); await pg.mouse.move(xd, yd, { steps: 10 }); await sleep(100); await pg.mouse.up(); await sleep(500);
    const desp = await items(), k = antes[i];
    const esp = i === 0 ? antes.slice(1).concat([k]) : [k].concat(antes.slice(0, i), antes.slice(i + 1));
    const norm = (l) => l.map((s) => s.replace('*', ''));          // la marca de misma linea puede cambiar al moverse
    ok(sel === '|' && JSON.stringify(norm(desp)) === JSON.stringify(norm(esp)), 'region ' + i + ' ' + k + ' movida al ' + (i === 0 ? 'final' : 'inicio') + (sel === '|' ? '' : ' (seleccion/banda: ' + sel + ')') + (JSON.stringify(norm(desp)) === JSON.stringify(norm(esp)) ? '' : '\n      esperado ' + esp.join(' | ') + '\n      obtenido ' + desp.join(' | ')));
  }
  // relleno a la izquierda de la region (fuera del rect, dentro de la linea): tambien agarra
  await carga(); us = await medir(); const u = us.find((q) => q.cls.startsWith('eq') && q.h > 8) || us[1]; const gx = u.l - 6 * z, gy = u.t + u.h / 2;
  await pg.mouse.move(gx - 20, gy); await pg.mouse.move(gx, gy); await sleep(120);
  const g = await pg.evaluate(() => ({ asa: !!document.querySelector('.mv-asa'), c: getComputedStyle(document.getElementById('papel')).cursor })); ok(g.asa && g.c === 'move', 'relleno a la izquierda (6 px fuera de la region): asa + cursor move ' + JSON.stringify(g));
  await pg.mouse.down(); await pg.mouse.move(gx + 50, gy + 40, { steps: 4 }); const banda = await pg.evaluate(() => !!document.querySelector('.mv-banda')); ok(!banda, 'ahi no empieza la banda de seleccion'); await pg.mouse.up();
}
console.log('errores:', err.join(' | ') || 'ninguno'); ok(!err.length, 'sin errores JS'); await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
