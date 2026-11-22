// Unidades en la hoja web (como el WPF: HekatanVisualNodes/Units.cs, Solver.cs, Codigo.cs): la unidad lleva SIEMPRE apóstrofo ('kN, 'm^2, 10'kN).
//   node tests/unidades.mjs [carpeta_png]      (usa el servidor http en 127.0.0.1:8000; sale con código ≠ 0 si algo falla)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = createRequire(import.meta.url)(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const URL = process.env.HK_URL || 'http://127.0.0.1:8000/index.html';
const SAL = path.resolve(process.argv[2] || path.join(AQUI, 'tests', 'salida')); fs.mkdirSync(SAL, { recursive: true });
const esp = (ms) => new Promise((r) => setTimeout(r, ms));

let fallos = 0;
const ok = (c, msg) => { console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fallos++; };
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const pg = await nav.newPage();
await pg.setViewport({ width: 1000, height: 1100, deviceScaleFactor: 1.5 });
const consola = [];
pg.on('console', (m) => { if (m.type() === 'error') consola.push(m.text()); });
pg.on('pageerror', (e) => consola.push('pageerror: ' + e.message));

// crea las ecuaciones (texto) en la hoja y devuelve el resultado de cada una: texto, 'mat:…' o null
const hoja = (lineas) => pg.evaluate((ls) => {
  HK.hoja.limpia && HK.hoja.limpia();
  ls.forEach((l) => HK.hoja.nuevaEq(l));
  return HK.hoja.reg.filter((x) => x.t === 'eq').map((x) => { const r = x.ed.resultado; return r ? (r.texto || (r.mat ? 'mat:' + r.mat.a.map((v) => HK.fmt(v)).join(' | ') : r.fila ? 'fila' : r.kind)) : null; });
}, lineas);

try {
  await pg.goto(URL + '?vacia', { waitUntil: 'load' });
  await pg.waitForFunction('window.HK && HK.U && HK.M && HK.parse && HK.hoja', { timeout: 60000 });

  console.log('1. Casos del WPF (cada línea es una ecuación de la hoja)');
  const C = [
    ["F=10'kN", null], ['F=', '10 kN'],
    ["L=2'm", null], ['M=F*L', null], ['M=', '20 kN·m'],
    ["F ='N", '10000 N'],
    ['w=F/L', null], ['w=', '5 kN/m'], ["w ='N/'m", '5000 N/m'],
    ["x=3'm+2'mm", null], ['x=', '3.002 m'], ["x ='mm", '3002 mm'],
    ["3'm+2'kg =", 'unidades incompatibles: m + kg'], ["3'm-2'kg =", 'unidades incompatibles: m + kg'],
    ['F+1 =', 'unidades incompatibles: kN + 1'],
    ["A=4'm^2", null], ['r=sqrt(A)', null], ['r=', '2 m'],
    ["P=30'tonf", null], ["P ='kN", '294.2 kN'],
    ['s=P/A', null], ["s ='kPa", '73.5499 kPa'],
    ["c=30'deg", null], ['sin(c) =', '0.5'],
    ['F/F =', '1'], ["(6'm)/(3'mm) =", '2000'], ["(2'm)*(3'mm) =", '0.006 m²'], ["(10'kN)^2 =", '100 kN²'], ["2/'m =", '2 1/m'],
    ["F ='m", 'unidades incompatibles: kN → m'], ["F ='xyz", 'unidad desconocida: xyz'],
    ["max(3'm, 200'mm) =", '3 m'], ["max(3'm, 4'kN) =", 'max: unidades incompatibles'], ["min(3'm, 4'kN) =", 'min: unidades incompatibles'],
    ["5'kN>3'm =", 'unidades incompatibles al comparar'],
    ['sin(F) =', 'tiene unidades (10 kN); quítalas dividiendo por la unidad'],
    // extras
    ["12'kN/3'm =", '4 kN/m'], ["-5'kN =", '-5 kN'], ["conv(F,'N) =", '10000 N'], ["abs(-3'm) =", '3 m'], ["min(3'm, 200'mm) =", '200 mm'],
    ["3'm>200'mm =", '1'], ["3'm<200'mm =", '0'], ["3'm==3000'mm =", '1'], ["3'm*2 =", '6 m'], ["2*3'm =", '6 m'], ["6'm/2 =", '3 m'],
    ["sqrt(9'm^2) =", '3 m'], ["10'kN*2'm ='N*'m", '20000 N·m'], ["F ='kN/'m", 'unidades incompatibles: kN → kN/m'],
    ["v=[1'm, 200'mm, 3'm]", null], ['v =', 'mat:1 m | 200 mm | 3 m'],
    ['2*v =', 'mat:2 m | 400 mm | 6 m'], ['v+v =', 'mat:2 m | 400 mm | 6 m'], ['-v =', 'mat:-1 m | -200 mm | -3 m'], ['sum(v) =', '4.2 m'],
    ["max(v) =", '3 m'], ["abs(-v) =", 'mat:1 m | 200 mm | 3 m'],
    ["K=[2'kN/'m, 0; 0, 4'kN/'m]", null], ["u=[1'm; 2'm]", null], ['K*u =', 'mat:2 kN | 8 kN'],
    ['det(K) =', 'tiene unidades (2 kN/m); quítalas dividiendo por la unidad'],
    ["inv(K) =", 'tiene unidades (2 kN/m); quítalas dividiendo por la unidad'],
    ['lsolve(K,K*u) =', 'tiene unidades (2 kN/m); quítalas dividiendo por la unidad'],
    ["sum(k*'m, k, 1, 3) =", '6 m'], ["yy=if(3'm>2'm, 1, 0)", null], ['yy =', '1'],
    ["q=7", null], ["q ='m", 'unidades incompatibles: 1 → m'], ["t=2", null], ["t*'s =", '2 s'], ["2'ft ='m", '0.6096 m'],
  ];
  const ls = C.map((c) => c[0]);
  const res = await hoja(ls);
  C.forEach((c, i) => {
    if (c[1] === undefined) return;
    const bien = res[i] === c[1] || (c[1] === null && res[i] === null);
    ok(bien, c[0] + '  →  ' + (res[i] === null ? '(sin resultado)' : res[i]) + (bien ? '' : '    (esperado ' + c[1] + ')'));
  });

  console.log('2. Teclado real: «\'» abre una unidad, las letras se acumulan, «/» hace fracción de unidades');
  await pg.evaluate(() => { HK.hoja.limpia && HK.hoja.limpia(); HK.hoja.nuevaEq(''); });
  const teclea = async (t) => { for (const c of t) { await pg.keyboard.type(c); await esp(12); } await esp(50); };
  const texto = () => pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'eq'); const e = r[r.length - 1]; return { t: e.ed.texto(), un: e.ed.fila.filter((x) => x.t === 'c' && x.un).map((x) => x.s) }; });
  await teclea("F=10'kN");
  let d = await texto(); ok(d.t === "F=10'kN" && d.un.join() === 'kN', "F=10'kN tecleado → un nodo de unidad «kN»: " + JSON.stringify(d));
  await pg.keyboard.press('Enter'); await esp(80); await teclea("F=");
  d = await texto(); const r1 = await pg.evaluate(() => HK.hoja.reg.filter((x) => x.t === 'eq').pop().ed.resultado); ok(r1 && r1.texto === '10 kN', 'F= → 10 kN (el valor lo calcula el motor): ' + (r1 && r1.texto));
  await pg.keyboard.press('Enter'); await esp(80); await teclea("w=5'kN/'m");
  d = await texto(); ok(d.t === "w=(5'kN)/('m)", "5'kN/'m tecleado → fracción de unidades: " + d.t);
  await pg.keyboard.press('Enter'); await esp(80); await teclea("w ='N");
  await pg.keyboard.press('Enter'); await esp(80); await teclea("F='N");
  d = await texto(); const r2 = await pg.evaluate(() => HK.hoja.reg.filter((x) => x.t === 'eq').pop().ed.resultado); ok(r2 && r2.texto === '10000 N', "F='N → 10000 N: " + (r2 && r2.texto));
  await pg.keyboard.press('Enter'); await esp(80); await teclea("A=4'm");
  await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowRight'); await teclea('^2');
  await pg.keyboard.press('Enter'); await esp(80);
  await teclea('A=');
  const r3 = await pg.evaluate(() => HK.hoja.reg.filter((x) => x.t === 'eq').pop().ed.resultado); ok(r3 && r3.texto === '4 m²', "4'm^2 tecleado: A = " + (r3 && r3.texto));
  // retroceso dentro de una unidad abierta
  await pg.keyboard.press('Enter'); await esp(80); await teclea("z=1'kNx");
  await pg.keyboard.press('Backspace'); await esp(40); d = await texto(); ok(d.t === "z=1'kN", 'Retroceso quita una letra de la unidad abierta: ' + d.t);

  console.log('3. Ida y vuelta texto ⇄ nodos');
  const rt = await pg.evaluate(() => ["F=10'kN", "w=12'kN/3'm", "A=4'm^2", "F ='N/'m", "x=3'm+2'mm", "-5'kN", "k=2/'m"].map((t) => { const f = HK.codigoAFilas(t); return [t, HK.filasATexto(f), f.some((x) => x.t === 'c' && x.un) || f.some((x) => x.t === 'frac')]; }));
  rt.forEach(([a, b]) => { const re = (s) => s.replace(/[()\s]/g, ''); ok(re(a) === re(b) || a.replace(/\s/g, '') === b.replace(/\s/g, ''), a + '  →  ' + b); });

  console.log('4. Autocompletar de unidades tras «\'»');
  await pg.evaluate(() => { HK.hoja.limpia && HK.hoja.limpia(); HK.hoja.nuevaEq(''); });
  await teclea("F=3'k");
  const sug = await pg.evaluate(() => [...document.querySelectorAll('.sug li .p')].map((x) => x.textContent));
  ok(sug.includes('kN') && sug.includes('kg'), 'tras «\'k» sugiere unidades: ' + sug.join(' · '));
  await pg.keyboard.press('Tab'); await esp(80);
  const sug2 = await texto(); ok(/^F=3'k\w+$/.test(sug2.t), 'Tab inserta la unidad elegida: ' + sug2.t);

  console.log('5. Captura de una hoja con unidades');
  await pg.evaluate(() => { HK.hoja.limpia && HK.hoja.limpia(); });
  const hojaCap = ["F=10'kN", 'F =', "L=2'm", 'M=F*L', 'M =', "F ='N", 'w=F/L', "w ='N/'m", "x=3'm+2'mm", "x ='mm", "A=4'm^2", 'r=sqrt(A)', 'r =', "P=30'tonf", "P ='kN", "3'm+2'kg =", "sin(F) =", "v=[1'm, 200'mm, 3'm]", 'v ='];
  await hoja(hojaCap); await esp(150);
  await pg.evaluate(() => { HK.hoja.desactiva && HK.hoja.desactiva(); });
  await esp(100);
  const el = await pg.$('#hoja'); const caja = el && await el.boundingBox();
  if (caja) await pg.screenshot({ path: path.join(SAL, 'unidades_hoja.png'), clip: { x: caja.x, y: caja.y, width: Math.min(caja.width, 700), height: Math.min(caja.height, 1000) } });
  else await pg.screenshot({ path: path.join(SAL, 'unidades_hoja.png') });
  ok(true, 'captura: ' + path.join(SAL, 'unidades_hoja.png'));

  ok(consola.length === 0, 'sin errores en la consola' + (consola.length ? ': ' + consola.slice(0, 3).join(' || ') : ''));
} catch (e) {
  console.log('  ❌ excepción: ' + e.message); fallos++;
}
await nav.close();
console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ todo bien');
process.exit(fallos ? 1 : 0);
