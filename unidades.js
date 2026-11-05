// Núcleo de unidades (puerto de HekatanVisualNodes/Units.cs: Qty + Unidades).
// Q = {v: valor en SI, d: [m,kg,s,A,K,mol,cd], disp: [[nombre,exp],…] (cómo se MUESTRA)}.
// Las funciones aceptan también números JS (cantidad sin unidades). Los resultados se simplifican a número si d = 0 (salvo deg/rad).
(function (root) {
  'use strict';
  const HK = root.HK || (root.HK = {});
  const V = (m = 0, kg = 0, s = 0, A = 0, K = 0, mol = 0, cd = 0) => [m, kg, s, A, K, mol, cd];
  const T = new Map();
  const PREF = { Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, G: 1e9, M: 1e6, k: 1e3, h: 1e2, d: 1e-1, c: 1e-2, m: 1e-3, 'µ': 1e-6, u: 1e-6, n: 1e-9, p: 1e-12 };
  const PREFIJABLES = new Set(['g', 'm', 's', 'A', 'K', 'mol', 'cd', 'N', 'Pa', 'J', 'W', 'Hz', 'V', 'C', 'Ω', 'L', 'bar', 'Wh', 'cal', 'eV', 'rad', 'Gal', 'dyn', 'erg', 'Torr', 'mmHg']);
  const P = (n, f, d) => T.set(n, { f, d });
  const N = V(1, 1, -2), Pa = V(-1, 1, -2), J = V(2, 1, -2), W = V(2, 1, -3);
  P('m', 1, V(1)); P('g', 1e-3, V(0, 1)); P('s', 1, V(0, 0, 1)); P('A', 1, V(0, 0, 0, 1)); P('K', 1, V(0, 0, 0, 0, 1)); P('mol', 1, V(0, 0, 0, 0, 0, 1)); P('cd', 1, V(0, 0, 0, 0, 0, 0, 1));
  P('N', 1, N); P('Pa', 1, Pa); P('J', 1, J); P('W', 1, W); P('Hz', 1, V(0, 0, -1)); P('V', 1, V(2, 1, -3, -1)); P('C', 1, V(0, 0, 1, 1)); P('Ω', 1, V(2, 1, -3, -2));
  P('L', 1e-3, V(3)); P('bar', 1e5, Pa); P('Wh', 3600, J);
  P('in', 0.0254, V(1)); P('ft', 0.3048, V(1)); P('yd', 0.9144, V(1)); P('mi', 1609.344, V(1));
  P('min', 60, V(0, 0, 1)); P('h', 3600, V(0, 0, 1)); P('day', 86400, V(0, 0, 1));
  P('t', 1000, V(0, 1)); P('lb', 0.45359237, V(0, 1)); P('ha', 1e4, V(2));
  P('kgf', 9.80665, N); P('tonf', 9806.65, N); P('tonnef', 9806.65, N); P('lbf', 4.4482216152605, N); P('kip', 4448.2216152605, N);
  P('psi', 6894.757293168, Pa); P('ksi', 6894757.293168, Pa); P('atm', 101325, Pa);
  P('mil', 2.54e-5, V(1)); P('thou', 2.54e-5, V(1)); P('Å', 1e-10, V(1)); P('nmi', 1852, V(1)); P('au', 149597870700, V(1)); P('ly', 9460730472580800, V(1));
  P('acre', 4046.8564224, V(2)); P('gal', 3.785411784e-3, V(3)); P('qt', 9.46352946e-4, V(3)); P('pt', 4.73176473e-4, V(3)); P('floz', 2.95735295625e-5, V(3));
  P('oz', 0.028349523125, V(0, 1)); P('slug', 14.59390293720637, V(0, 1)); P('ton', 907.18474, V(0, 1)); P('tonne', 1000, V(0, 1)); P('grain', 6.479891e-5, V(0, 1));
  P('dyn', 1e-5, N); P('ozf', 0.2780138509537812, N); P('pdl', 0.138254954376, N); P('kipf', 4448.2216152605, N); P('tonfus', 8896.443230521, N);
  P('Torr', 133.322368421, Pa); P('mmHg', 133.322387415, Pa); P('inHg', 3386.389, Pa); P('ksf', 47880.2589803, Pa); P('psf', 47.8802589803, Pa);
  P('erg', 1e-7, J); P('cal', 4.184, J); P('BTU', 1055.05585262, J); P('hp', 745.699871582, W); P('hpm', 735.49875, W); P('eV', 1.602176634e-19, J); P('Btu', 1055.05585262, J);
  P('mph', 0.44704, V(1, 0, -1)); P('kn', 0.514444444444, V(1, 0, -1)); P('fps', 0.3048, V(1, 0, -1));
  P('Gal', 0.01, V(1, 0, -2)); P('gn', 9.80665, V(1, 0, -2));
  P('rpm', 1 / 60, V(0, 0, -1)); P('rev', 2 * Math.PI, V()); P('grad', Math.PI / 200, V()); P('arcmin', Math.PI / 10800, V()); P('arcsec', Math.PI / 648000, V());
  P('ppm', 1e-6, V()); P('ppb', 1e-9, V());
  P('deg', Math.PI / 180, V()); P('rad', 1, V()); P('%', 0.01, V());
  const BASE = new Map(T); // solo las unidades base (sin prefijadas cacheadas), para el autocompletado

  function buscar(n) {
    if (T.has(n)) return T.get(n);
    for (const len of [1, 2]) {
      const p = n.slice(0, len);
      if (n.length > len && Object.prototype.hasOwnProperty.call(PREF, p)) {
        const r = n.slice(len);
        if (PREFIJABLES.has(r) && T.has(r)) { const b = T.get(r); const u = { f: b.f * PREF[p], d: b.d }; T.set(n, u); return u; }
      }
    }
    throw new Error('unidad desconocida: ' + n);
  }
  const existe = n => { try { buscar(n); return true; } catch (e) { return false; } };

  // ---- formato (Solver.FmtD)
  const U = { cifras: 6 };
  function gFmt(d, prec) { // C# "G<prec>"
    const ex = d.toExponential(prec - 1); const [m, e] = ex.split('e'); const x = parseInt(e, 10);
    if (x < -5 || x >= prec) {
      const mm = m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m;
      return mm + 'E' + (x < 0 ? '-' : '+') + String(Math.abs(x)).padStart(2, '0');
    }
    let t = d.toFixed(Math.max(0, prec - 1 - x)); if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, ''); return t;
  }
  function fmtD(d) {
    if (Number.isNaN(d)) return 'NaN'; if (!Number.isFinite(d)) return d > 0 ? '∞' : '-∞';
    if (d === 0) return '0';
    if (Math.abs(d - Math.round(d)) < 1e-9 * Math.max(1, Math.abs(d)) && Math.abs(d) < 1e15) { const r = Math.round(d); return r === 0 ? '0' : String(r); }
    const ad = Math.abs(d);
    if (ad >= 1e-4 && ad < 1e15) {
      const dec = Math.min(12, Math.max(3, U.cifras - 1 - Math.floor(Math.log10(ad))));
      let t = d.toFixed(dec); if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, ''); return t === '-0' ? '0' : t;
    }
    return gFmt(d, U.cifras);
  }

  // ---- Q
  const esQ = x => x !== null && typeof x === 'object' && typeof x.v === 'number' && Array.isArray(x.d);
  const numero = v => ({ v, d: [0, 0, 0, 0, 0, 0, 0], disp: [] });
  const Q = x => esQ(x) ? x : (typeof x === 'number' ? numero(x) : (() => { throw new Error('unidades solo en números (no en matrices)'); })());
  const copia = q => ({ v: q.v, d: q.d.slice(), disp: q.disp.map(x => [x[0], x[1]]) });
  const sinDim = q => q.d.every(x => Math.abs(x) < 1e-12);
  const mismaDim = (a, b) => a.d.every((x, i) => Math.abs(x - b.d[i]) <= 1e-9);
  const factor = q => q.disp.reduce((f, [n, e]) => f * Math.pow(buscar(n).f, e), 1);
  const enPantalla = q => q.v / factor(q);
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = e => (Number.isInteger(e) && e >= 0 && e <= 9) ? SUP[e] : '^' + String(Number(e.toPrecision(3)));
  function unidadTexto(q) {
    const un = ([n, e]) => { e = Math.abs(e); return e === 1 ? n : n + sup(e); };
    const num = q.disp.filter(x => x[1] > 0).map(un), den = q.disp.filter(x => x[1] < 0).map(un);
    const a = num.length === 0 ? (den.length > 0 ? '1' : '') : num.join('·');
    if (den.length === 0) return a;
    return a + '/' + (den.length === 1 ? den[0] : '(' + den.join('·') + ')');
  }
  const texto = q => { q = Q(q); return fmtD(enPantalla(q)) + (q.disp.length > 0 ? ' ' + unidadTexto(q) : ''); };
  function etiqueta(q) {
    const b = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd'], l = [];
    q.d.forEach((x, i) => { if (Math.abs(x) > 1e-12) l.push(Math.abs(x - 1) < 1e-12 ? b[i] : b[i] + sup(x)); });
    return q.disp.length > 0 ? unidadTexto(q) : l.length > 0 ? l.join('·') : '1';
  }
  function sumaDisp(a, n, e) {
    const i = a.findIndex(x => x[0] === n);
    if (i < 0) a.push([n, e]); else a[i] = [n, a[i][1] + e];
    for (let k = a.length - 1; k >= 0; k--) if (Math.abs(a[k][1]) < 1e-12) a.splice(k, 1);
  }
  function normaliza(r) { // longitud / área / volumen puros → una sola unidad
    if (sinDim(r) || r.disp.length === 0 || (r.disp.length === 1 && r.disp[0][1] > 0)) return;
    let largo = Math.abs(r.d[0] - Math.round(r.d[0])) < 1e-9 && r.d[0] >= 1 && r.d[0] <= 3;
    for (let i = 1; i < 7; i++) if (Math.abs(r.d[i]) > 1e-12) largo = false;
    if (!largo) return;
    const e = Math.round(r.d[0]); let un = 'm';
    for (const [n, ex] of r.disp) { const u = buscar(n); if (u.d[0] === 1 && [1, 2, 3, 4, 5, 6].every(k => u.d[k] === 0) && ex > 0) { un = n; break; } }
    r.disp = [[un, e]];
  }
  const simplifica = q => (esQ(q) && sinDim(q) && q.disp.every(x => x[0] !== 'deg' && x[0] !== 'rad')) ? q.v : q;

  function por(a, b, dividir) {
    a = Q(a); b = Q(b); const s = dividir ? -1 : 1;
    const r = { v: dividir ? a.v / b.v : a.v * b.v, d: a.d.map((x, i) => x + s * b.d[i]), disp: a.disp.map(x => [x[0], x[1]]) };
    for (const [n, e] of b.disp) sumaDisp(r.disp, n, s * e);
    normaliza(r); return simplifica(r);
  }
  function mas(a, b, signo) {
    a = Q(a); b = Q(b);
    if (!mismaDim(a, b)) throw new Error(`unidades incompatibles: ${etiqueta(a)} ${signo > 0 ? '+' : '−'} ${etiqueta(b)}`);
    const r = copia(a); r.v = a.v + signo * b.v; return simplifica(r);
  }
  // resta = a + (−1)·b, como el WPF: el mensaje de error lleva «+»
  const sub = (a, b) => mas(a, por(-1, b, false), 1);
  function num(x) {
    if (typeof x === 'number') return x;
    if (esQ(x)) { if (sinDim(x)) return x.v; throw new Error('tiene unidades (' + texto(x) + '); quítalas dividiendo por la unidad'); }
    throw new Error('se esperaba un número');
  }
  function pow(a, n) {
    n = num(n);
    if (!esQ(a)) return Math.pow(a, n);
    return simplifica({ v: Math.pow(a.v, n), d: a.d.map(x => x * n), disp: a.disp.map(([u, e]) => [u, e * n]) });
  }
  function deTexto(t) { // «mm»  «kN/m^2»  «kN·m»
    const r = numero(1); let s = 1;
    const re = /([*·\/])?([^*·\/^]+)(\^(-?\d+(\.\d+)?))?/g; let m;
    const src = String(t).replace(/'/g, '').replace(/ /g, '');
    while ((m = re.exec(src)) !== null) {
      if (m[1] === '/') s = -1;
      const n = m[2], e = (m[4] !== undefined ? parseFloat(m[4]) : 1) * s;
      const u = buscar(n);
      for (let i = 0; i < 7; i++) r.d[i] += u.d[i] * e;
      r.disp.push([n, e]);
    }
    return r;
  }
  function aUnidad(q, dest) {
    q = Q(q); dest = typeof dest === 'string' ? deTexto(dest) : Q(dest);
    if (!mismaDim(q, dest)) throw new Error(`unidades incompatibles: ${etiqueta(q)} → ${etiqueta(dest)}`);
    const r = copia(q); r.disp = dest.disp.map(x => [x[0], x[1]]); return r;
  }
  function cmp(a, b) {
    if (esQ(a) && esQ(b)) { if (!mismaDim(a, b)) throw new Error('unidades incompatibles al comparar'); a = a.v; b = b.v; }
    const x = num(a), y = num(b); return x < y ? -1 : x > y ? 1 : 0;
  }
  function igual(a, b) {
    if (esQ(a) && esQ(b)) return mismaDim(a, b) && Math.abs(a.v - b.v) <= 1e-9 * Math.max(1e-300, Math.max(Math.abs(a.v), Math.abs(b.v)));
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.max(Math.abs(a), Math.abs(b)));
    return false;
  }
  function absQ(a) { if (!esQ(a)) return Math.abs(num(a)); return { v: Math.abs(a.v), d: a.d, disp: a.disp }; }
  function minmax(args, signo, nombre) {
    if (args.length > 1 && args.every(esQ)) {
      return args.reduce((x, y) => { if (!mismaDim(x, y)) throw new Error(nombre + ': unidades incompatibles'); return signo * (y.v - x.v) > 0 ? y : x; });
    }
    const v = args.map(num); return signo > 0 ? Math.max(...v) : Math.min(...v);
  }

  Object.assign(U, {
    de(n) { const u = buscar(n); return { v: u.f, d: u.d.slice(), disp: [[n, 1]] }; },
    existe, buscar, esQ, numero, sinDim, mismaDim, enPantalla, unidadTexto, texto, fmt: fmtD, deTexto, aUnidad,
    add: (a, b) => mas(a, b, 1), sub, mul: (a, b) => por(a, b, false), div: (a, b) => por(a, b, true), pow,
    neg: a => por(-1, a, false), num, cmp, igual, abs: absQ, sqrt: a => esQ(a) ? pow(a, 0.5) : Math.sqrt(num(a)),
    min: (...a) => minmax(a, -1, 'min'), max: (...a) => minmax(a, 1, 'max'), simplifica,
    UNIDADES: Object.fromEntries([...BASE].map(([n, u]) => [n, { f: u.f, d: u.d, prefijable: PREFIJABLES.has(n) }])),
    PREFIJOS: PREF, PREFIJABLES: [...PREFIJABLES],
  });
  HK.U = U;
  if (typeof module !== 'undefined' && module.exports) module.exports = U;
})(typeof window !== 'undefined' ? window : globalThis);
