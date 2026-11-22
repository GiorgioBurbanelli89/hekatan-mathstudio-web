// Hover de las gráficas como el WPF: curvas (línea vertical + un punto por serie + globo), mapas (cruz + valor interpolado) y superficies 3D (nudo más cercano ≤ 14 px).
//   node tests/hover_graficas.mjs [captura_prefijo]
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
const regs = () => pg.evaluate(() => HK.hoja.reg.map((r, i) => ({ i, tipo: r.graf ? (r.graf.tipo || 'curvas') : null, hv: r.hv ? r.hv.k : null })).filter((x) => x.tipo));
const compone = async (i, archivo) => {          // gráfica + capa del hover juntas (page.screenshot dispara mouseleave y borraría el globo)
  const r = await pg.evaluate((i) => { const g = HK.hoja.reg[i], c = document.createElement('canvas'); c.width = g.gel.width; c.height = g.gel.height; const x = c.getContext('2d'); x.drawImage(g.gel, 0, 0); let n = 0;
    if (g.hov) { const d = g.hov.getContext('2d').getImageData(0, 0, g.hov.width, g.hov.height).data; for (let k = 3; k < d.length; k += 4) if (d[k]) n++; x.drawImage(g.hov, 0, 0, g.hov.width, g.hov.height, 0, 0, c.width, c.height); } return { url: c.toDataURL('image/png'), n }; }, i);
  if (archivo) fs.writeFileSync(archivo, Buffer.from(r.url.split(',')[1], 'base64')); return r.n;
};
const hoverEn = async (i, fx, fy) => {          // mueve el ratón real al punto (fx, fy) (fracciones del lienzo) de la gráfica de la región i y devuelve el texto del globo
  await pg.evaluate((i) => { HK.hoja.reg[i].gel.scrollIntoView({ block: 'center' }); }, i); await sleep(250);
  const b = await pg.evaluate((i) => { const r = HK.hoja.reg[i].gel.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, i);
  await pg.mouse.move(b.x + b.w * fx, b.y + b.h * fy, { steps: 3 }); await sleep(120);
  return pg.evaluate((i) => HK.hoja.reg[i].hoverTxt || null, i);
};
await abre('ejemplos/Funciones_de_forma_1D_hipotesis_graficas.hmath');
let R = await regs(); const cur = R.find((x) => x.tipo === 'curvas');
ok(!!cur && cur.hv === 'curvas', 'hay una gráfica de curvas con datos de hover');
let t = await hoverEn(cur.i, 0.5, 0.5); console.log('     ', t);
ok(/^x = /.test(t || '') && /f1 = /.test(t || ''), 'curvas: el globo trae x y el valor de cada serie');
const png = process.argv[2]; const nc = await compone(cur.i, png && png + '_curvas.png'); ok(nc > 500, 'curvas: la capa del hover pinta línea, puntos y globo (' + nc + ' px)');
await pg.mouse.move(2, 2); await sleep(100);
await pg.evaluate((i) => { const o = HK.hoja.reg[i].hov; return o; }, cur.i);
const afuera = await hoverEn(cur.i, 0.02, 0.5); ok(afuera === null, 'fuera del área de trazado no hay globo');
await abre('ejemplos/Funciones_de_forma_2D_deduccion.hmath');
R = await regs(); const mapa = R.find((x) => x.tipo === 'mapa'), sup = R.find((x) => x.tipo === 'sup');
ok(!!mapa && !!sup, 'la hoja 2D tiene mapa y superficie 3D (' + R.map((x) => x.tipo).filter((v, i, a) => a.indexOf(v) === i) + ')');
t = await hoverEn(mapa.i, 0.45, 0.45); console.log('     ', t);
ok(/^x = .*y = .* \| valor = /.test(t || ''), 'mapa: cruz y globo con x, y y el valor interpolado');
const nm = await compone(mapa.i, png && png + '_mapa.png'); ok(nm > 500, 'mapa: la capa del hover pinta cruz y globo (' + nm + ' px)');
let ts = null; for (const fy of [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65]) for (const fx of [0.3, 0.4, 0.5, 0.6]) { ts = await hoverEn(sup.i, fx, fy); if (ts) { const ns = await compone(sup.i, png && png + '_sup.png'); ok(ns > 300, 'superficie: la capa del hover pinta el aro y el globo (' + ns + ' px)'); break; } } console.log('     ', ts);
ok(/^x = .*y = .* \| valor = /.test(ts || ''), 'superficie 3D: el nudo más cercano da x, y y el valor');
await pg.mouse.move(2, 2); await sleep(150);
ok(!err.length, 'sin errores de JS ' + err.join(' | ').slice(0, 300)); console.log(fallos ? '\nHay fallos' : '\nTodo bien');
await nav.close(); srv.close();
