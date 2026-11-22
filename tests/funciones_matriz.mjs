// Funciones de matriz, potencia A^n, escalares extra, ayudantes de FEM, comparaciones/lógicos y griego completo.
// Valores esperados: calculados a mano / con la definición matemática (y con el código de Solver.cs / SolverSmath.cs del WPF leído línea a línea).
//   node tests/funciones_matriz.mjs        (usa el servidor http en 127.0.0.1:8000; sale con código ≠ 0 si algo falla)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const URL = process.env.HK_URL || 'http://127.0.0.1:8000/index.html';

let fallos = 0;
const navegador = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const pg = await navegador.newPage();
const consola = [];
pg.on('console', (m) => { if (m.type() === 'error') consola.push(m.text()); });
pg.on('pageerror', (e) => consola.push('pageerror: ' + e.message));

// evalúa líneas (separadas por \n) con el mismo motor de la hoja; devuelve número, {r,c,a} o {error}
const ev = (src) => pg.evaluate((s) => {
  try {
    HK.M.reinicia();
    const r = HK.M.programa(s.split('\n'), { v: {}, f: {}, l: {} });
    if (!r) return { error: 'sin resultado' };
    return HK.M.esM(r.v) ? { r: r.v.r, c: r.v.c, a: r.v.a } : r.v;
  } catch (e) { return { error: e.message }; }
}, src);
const cerca = (x, y) => Math.abs(x - y) <= 1e-12 * Math.max(1, Math.abs(y));
function igual(got, esp) {
  if (typeof esp === 'number') return typeof got === 'number' && cerca(got, esp);
  if (got && typeof got === 'object' && Array.isArray(got.a)) return got.a.length === esp.length && esp.every((v, i) => cerca(got.a[i], v));
  return false;
}
async function caso(src, esp, tit) {
  const got = await ev(src); const bien = igual(got, esp);
  console.log((bien ? '  ✅ ' : '  ❌ ') + (tit || src.replace(/\n/g, ' ; ')) + (bien ? '' : '   → ' + JSON.stringify(got) + '  (esperado ' + JSON.stringify(esp) + ')'));
  if (!bien) fallos++;
}
async function falla(src, tit) {
  const got = await ev(src); const bien = got && typeof got === 'object' && 'error' in got;
  console.log((bien ? '  ✅ ' : '  ❌ ') + tit + (bien ? '   (' + got.error + ')' : '   → no falló: ' + JSON.stringify(got)));
  if (!bien) fallos++;
}
const A = 'A = [1,2;3,4]';
const PI = Math.PI;

try {
  await pg.goto(URL + '?vacia', { waitUntil: 'load' });
  await pg.waitForFunction('window.HK && HK.M && HK.parse', { timeout: 60000 });

  console.log('1. Funciones de matriz');
  await caso('norm([3,4])', 5); await caso(A + '\nnorm(A)', Math.sqrt(30), 'norm(A) = √30 (Frobenius)');
  await caso(A + '\ntr(A)', 5); await caso(A + '\ntrace(A)', 5);
  await caso('cross([1,0,0],[0,1,0])', [0, 0, 1]); await caso('cross([1,2,3],[4,5,6])', [-3, 6, -3]);
  await caso('identity(3)', [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  await caso('diag([1,2])', [1, 0, 0, 2], 'diag(vector) = matriz diagonal'); await caso(A + '\ndiag(A)', [1, 4], 'diag(matriz) = diagonal');
  await caso('stack([1,2],[3,4])', [1, 2, 3, 4]); await caso(A + '\naugment(A,[5;6])', [1, 2, 5, 3, 4, 6]);
  await caso('M = [1,2,3;4,5,6;7,8,9]\nsubmatrix(M,2,3,1,2)', [4, 5, 7, 8]);
  await caso('rank([1,2;2,4])', 1); await caso(A + '\nrank(A)', 2); await caso('rank([1,2,3;4,5,6;7,8,9])', 2);
  await caso('sort([3,1,2])', [1, 2, 3]); await caso('rsort([3,1,2])', [3, 2, 1]); await caso('reverse([1,2,3])', [3, 2, 1]);
  await caso('csort([3,1;1,2;2,0],1)', [1, 2, 2, 0, 3, 1]);
  await caso(A + '\nrow(A,2)', [3, 4]); await caso('minor([1,2,3;4,5,6;7,8,10],1,1)', 5 * 10 - 6 * 8, 'minor(M,1,1) = det de la submatriz 2×2');
  await caso(A + '\ninvert(A)', [-2, 1, 1.5, -0.5]);
  await caso(A + '\nnorm1(A)', 6); await caso(A + '\nnormi(A)', 7); await caso(A + '\nnorme(A)', Math.sqrt(30)); await caso('norm1([1,-2,3])', 6);

  console.log('2. Potencia de matriz');
  await caso(A + '\nA^2', [7, 10, 15, 22]); await caso(A + '\nA^3', [37, 54, 81, 118]); await caso(A + '\nA^0', [1, 0, 0, 1]);
  await caso(A + '\nA^-1', [-2, 1, 1.5, -0.5]); await caso(A + '\nA^(-1)', [-2, 1, 1.5, -0.5]); await caso(A + '\nA^T', [1, 3, 2, 4], 'A^T sigue siendo la transpuesta');
  await caso('v = [1,2,2]\nv^2', 9, 'v^2 de un vector = v·v');
  await falla(A + '\nA^0.5', 'A^0.5 → error (como el WPF)'); await falla(A + '\nA^1000000000', 'A^1e9 → tope de seguridad');

  console.log('3. Escalares sobre matrices, elemento a elemento');
  const E = Math.E;
  await caso('ln([1,2.718281828459045])', [0, 1]); await caso('log([10,1000])', [1, 3]); await caso('tan([0,0.7853981633974483])', [0, Math.tan(PI / 4)]);
  await caso('asin([0,1])', [0, PI / 2]); await caso('acos([1,0])', [0, PI / 2]); await caso('atan([0,1])', [0, PI / 4]);
  await caso('sinh([0,1])', [0, Math.sinh(1)]); await caso('cosh([0,1])', [1, Math.cosh(1)]); await caso('tanh([0,1])', [0, Math.tanh(1)]); await caso('sign([-3,0,5])', [-1, 0, 1]);

  console.log('4. Escalares extra');
  await caso('sec(0)', 1); await caso('csc(pi/2)', 1); await caso('cot(pi/4)', 1 / Math.tan(PI / 4));
  await caso('asinh(0)', 0); await caso('acosh(1)', 0); await caso('atanh(0.5)', 0.5 * Math.log(3)); await caso('acoth(2)', 0.5 * Math.log(3)); await caso('coth(1)', 1 / Math.tanh(1));
  await caso('Gamma(5)', 24); await caso('Gamma(0.5)', Math.sqrt(PI)); await caso('trunc(-2.7)', -2); await caso('trunc([2.7,-1.2])', [2, -1]);
  await caso('nthroot(27,3)', 3); await caso('nthroot(-8,3)', -2); await caso('log10(1000)', 3); await caso('sec([0,0])', [1, 1], 'sec sobre matriz');

  console.log('5. Ayudantes de FEM');
  await caso('f(i,j) = i*10+j\nmatriz(2,2,f)', [11, 12, 21, 22]); await caso('g(x,y) = x+y\ngrid(g,1,1,2,4)', [0, 4, 2, 6]);
  await caso('h(x) = x^2\ntab(h,3,0,2)', [0, 1, 4]);
  await caso('lin(0,1,3)', [0, 0.5, 1]); await caso(A + '\nfila(A,2)', [3, 4]); await caso('range(2,5)', [2, 3, 4, 5]);
  await caso(A + '\nlength(A)', 4); await caso('rows([1,2,3])', 1); await caso('cols([1,2,3])', 3); await caso('linterp([0,1,2],[0,10,40],1.5)', 25);
  await caso('cada([1,2,3,4,5,6],2,1)', [1, 3, 5]); await caso('el([1,2;3,4],2,1)', 3);
  await falla('zeros(5000,5000)', 'zeros(5000,5000) → tope de tamaño');

  console.log('6. Comparaciones y lógicos');
  await caso('1<2', 1); await caso('3>=4', 0); await caso('3≥3', 1); await caso('2<=2', 1); await caso('1≠2', 1); await caso('2!=2', 0);
  await caso('1<2<3', 1, 'cadena 1<2<3'); await caso('1<3<2', 0, 'cadena 1<3<2'); await caso('1<=1<2', 1);
  await caso('1<2 and 2<3', 1); await caso('1>2 or 2>3', 0); await caso('1>2 or 2<3', 1); await caso('not 0', 1); await caso('not (1<2)', 0);
  await caso('a = 3\nb = a<=3\nb', 1, 'b = a<=3 define b (el «=» de <= no es asignación)');
  await caso('a = 3\nif a>=3\nr = 10\nelse\nr = 20\nend\nr', 10, 'if con >=');
  await caso('x = 0\nwhile x<3 and x!=2\nx = x+1\nend\nx', 2, 'while con and y !=');
  await caso('|-3|', 3); await caso('|2-5|+1', 4); await caso('|[-1,2]|', [1, 2]);

  console.log('7. Griego completo');
  const gr = await pg.evaluate(() => HK.filasATexto(HK.aFilas(HK.parse('gamma+eta+iota+omicron+upsilon+Omega+Phi+Gamma+Pi+Psi'))));
  const grEsp = 'γ+η+ι+ο+υ+Ω+Φ+Γ+Π+Ψ'; console.log((gr === grEsp ? '  ✅ ' : '  ❌ ') + 'gamma eta iota omicron upsilon Omega Phi Gamma Pi Psi → ' + gr); if (gr !== grEsp) fallos++;
  await caso('Γ(5)', 24, 'Γ(5) = 24');
} catch (e) {
  console.log('  ❌ excepción: ' + e.message); fallos++;
}
const graves = consola.filter((m) => !/prlimit|favicon/.test(m));
console.log((graves.length ? '  ❌ ' : '  ✅ ') + 'sin errores en la consola' + (graves.length ? ' → ' + graves.slice(0, 3).join(' | ') : ''));
if (graves.length) fallos++;
await navegador.close();
console.log(fallos ? '\n' + fallos + ' fallo(s)' : '\nTodo bien');
process.exit(fallos ? 1 : 0);
