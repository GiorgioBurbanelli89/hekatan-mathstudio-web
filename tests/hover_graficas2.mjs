// Hover de las gráficas de graficas2.js: Riemann, Gauss 1D/2D, esc3 (prismas, cubitos, sólido), tabla y malla.
//   node tests/hover_graficas2.mjs [captura_prefijo]
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

const sintetica = JSON.stringify({ formato: 'hmath 1', eq: 14, txt: 11, gap: 6, fmt: 0, items: [
  { t: 'eq', codigo: 'friemann(12 - x^3, 0, 2, 8, 1)', modo: 0 }, { t: 'eq', codigo: 'fgauss(12 - x^3, 0, 2, 3)', modo: 0 }, { t: 'eq', codigo: 'fgauss2d(3, 1)', modo: 0 } ] });
// busca con el ratón real un punto de la gráfica i que dé globo que cumpla re; guarda la captura compuesta
const busca = async (i, re, nombre, prefijo, mn = 300) => {
  for (const fy of [0.4, 0.5, 0.3, 0.6, 0.2, 0.7, 0.8, 0.1]) for (const fx of [0.5, 0.35, 0.65, 0.25, 0.75, 0.15, 0.85, 0.45, 0.55]) {
    const t = await hoverEn(i, fx, fy); if (t && re.test(t)) { const n = await compone(i, prefijo && prefijo + '_' + nombre + '.png'); console.log('     ', t); ok(n > mn, nombre + ': globo "' + t.slice(0, 50) + '…" y capa con ' + n + ' px'); return t; }
  }
  ok(false, nombre + ': no se halló un punto con globo'); return null;
};
const png = process.argv[2];
await pg.evaluate((t) => { HK.hoja.abre(t); }, sintetica); await sleep(3500);
let R = await regs(); console.log('   tipos:', R.map((x) => x.tipo + '/' + x.hv).join(' '));
const por = (t) => R.find((x) => x.tipo === t);
ok(!!por('riemann') && !!por('gauss1') && !!por('gauss2'), 'hay riemann, gauss1 y gauss2');
await busca(por('riemann').i, /^x = .*f\(x\) = .*\| rectángulo \d+: altura = .* área = /, 'riemann', png);
await busca(por('gauss1').i, /f\(x\) = /, 'gauss1_curva', png);
await busca(por('gauss1').i, /^punto de Gauss \d+: x = .*peso w = .*w·f\(x\) = /, 'gauss1_punto', png);
await busca(por('gauss2').i, /^punto de Gauss \(\d, \d\) \| ξ = .*η = .* \| x = .*y = .* \| peso/, 'gauss2', png);
await abre('ejemplos/Integrales_Riemann_doble_triple.hmath'); R = await regs();
const e3 = R.filter((x) => x.tipo === 'esc3'); ok(e3.length >= 2, 'la hoja de integrales tiene ' + e3.length + ' escenas 3D');
const vistos = new Set();
for (const g of e3) { const m = await pg.evaluate((i) => HK.hoja.reg[i].graf.d.modo, g.i); if (vistos.has(m)) continue; vistos.add(m);
  await busca(g.i, /(prisma|columna|z =)/, 'esc3_modo' + m, png); }
await abre('ejemplos/Placa_Kirchhoff_BFS_losa_rectangular.hmath'); R = await regs(); console.log('   tipos:', R.map((x) => x.tipo).join(' '));
if (por('tabla')) await busca(por('tabla').i, /fila \d+ \| valor = /, 'tabla', png, 200); else ok(false, 'sin tabla');
if (por('malla')) { await busca(por('malla').i, /^(nudo|elemento) \d+/, 'malla', png, 100); } else ok(false, 'sin malla');
await abre('ejemplos/Funciones_de_forma_2D_CSI.hmath'); R = await regs(); if (por('gauss2')) await busca(por('gauss2').i, /^punto de Gauss/, 'gauss2_csi', png);
await pg.mouse.move(2, 2); await sleep(150);
ok(!err.length, 'sin errores de JS ' + err.join(' | ').slice(0, 300)); console.log(fallos ? '\nHay fallos' : '\nTodo bien');
await nav.close(); srv.close();
