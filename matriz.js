// Hekatan Math Studio Web — matrices, vectores y programas (for / while / if) como en el solver de escritorio
(function (G) {
  const HK = G.HK;
  class Mat {
    constructor(r, c, a) { this.r = r; this.c = c; this.a = a || new Array(r * c).fill(0); }
    g(i, j) { return this.a[i * this.c + j]; }
    s(i, j, v) { this.a[i * this.c + j] = v; }
  }
  // tope de trabajo por recálculo: un archivo ajeno no puede congelar el navegador con bucles o productos gigantes
  let PASOS = 0; const paso = (n) => { if ((PASOS += n || 1) > 1e6) throw new Error('demasiado cálculo (límite de seguridad de 1 millón de pasos)'); };
  const tam = (n, m) => { if (!(n * (m === undefined ? n : m) <= 4e6)) throw new Error('matriz demasiado grande (maximo 4 millones de elementos)'); };
  const esM = (x) => x instanceof Mat;
  // unidades: una celda es un número o una cantidad {v,d,disp} (HK.U); con solo números todo va por el camino rápido de siempre
  const nn = (v) => typeof v === 'number';
  const sumaU = (a, b) => nn(a) && nn(b) ? a + b : HK.U.add(a, b), restaU = (a, b) => nn(a) && nn(b) ? a - b : HK.U.sub(a, b);
  const mulU = (a, b) => nn(a) && nn(b) ? a * b : HK.U.mul(a, b), divU = (a, b) => nn(a) && nn(b) ? a / b : HK.U.div(a, b);
  const negU = (v) => nn(v) ? -v : HK.U.neg(v), numU = (v) => nn(v) ? v : HK.U.num(v);
  const maxU = (a, b) => nn(a) && nn(b) ? Math.max(a, b) : HK.U.max(a, b), minU = (a, b) => nn(a) && nn(b) ? Math.min(a, b) : HK.U.min(a, b);
  // matrices con unidades: un cero estructural (número 0) no aporta nada ni exige unidad (K = [2'kN/'m, 0; 0, 4'kN/'m])
  const cero = (v) => nn(v) && v === 0;
  const sumaZ = (a, b) => cero(a) && !nn(b) ? b : cero(b) && !nn(a) ? a : sumaU(a, b), restaZ = (a, b) => cero(b) && !nn(a) ? a : cero(a) && !nn(b) ? negU(b) : restaU(a, b);
  const hayQ = (m) => esM(m) && m.a.some((v) => !nn(v));
  const SQ = (m) => hayQ(m) ? new Mat(m.r, m.c, m.a.map(numU)) : m;          // para lsolve / det / inv…: con unidades da el error limpio «tiene unidades (…)»
  function map2(x, y, f) {
    if (!esM(x) && !esM(y)) return f(x, y);
    if (esM(x) && esM(y)) { if (x.r !== y.r || x.c !== y.c) throw new Error('las matrices no tienen el mismo tamaño'); return new Mat(x.r, x.c, x.a.map((v, i) => f(v, y.a[i]))); }
    if (esM(x)) return new Mat(x.r, x.c, x.a.map((v) => f(v, y)));
    return new Mat(y.r, y.c, y.a.map((v) => f(x, v)));
  }
  function mmul(x, y) {
    if (x.c !== y.r) throw new Error('producto de matrices: ' + x.r + '×' + x.c + ' por ' + y.r + '×' + y.c);
    paso(x.r * y.c * x.c); const o = new Mat(x.r, y.c);
    if (hayQ(x) || hayQ(y)) { for (let i = 0; i < x.r; i++) for (let j = 0; j < y.c; j++) { let s = null; for (let k = 0; k < x.c; k++) { const a = x.g(i, k), b = y.g(k, j); if (cero(a) || cero(b)) continue; const t = mulU(a, b); s = s === null ? t : sumaU(s, t); } o.s(i, j, s === null ? 0 : s); } return o; }
    for (let i = 0; i < x.r; i++) for (let j = 0; j < y.c; j++) { let s = 0; for (let k = 0; k < x.c; k++) s += x.g(i, k) * y.g(k, j); o.s(i, j, s); }
    return o;
  }
  function mpow(m, n) {          // A^n como Solver.Pot: -1 → inversa · v^2 de un vector → v·v · n entero ≥ 0 → A·A·…·A (A^0 = I)
    if (n === -1) return inv(m);
    if (n === 2 && (m.c === 1 || m.r === 1) && m.a.length > 1) { paso(m.a.length); return hayQ(m) ? m.a.map((v) => mulU(v, v)).reduce(sumaU) : m.a.reduce((p, v) => p + v * v, 0); }
    if (n < 0 || n !== Math.floor(n)) throw new Error('potencia de matriz no válida');
    if (m.r !== m.c) throw new Error('la potencia pide una matriz cuadrada');
    let r = new Mat(m.r, m.r); for (let i = 0; i < m.r; i++) r.s(i, i, 1);
    for (let i = 0; i < n; i++) r = mmul(r, m);
    return r;
  }
  function arit(op, x, y) {
    switch (op) {
      case '+': return map2(x, y, esM(x) || esM(y) ? sumaZ : sumaU);
      case '-': return map2(x, y, esM(x) || esM(y) ? restaZ : restaU);
      case '*': case 'imp': return esM(x) && esM(y) ? mmul(x, y) : map2(x, y, mulU);
      case '/': if (esM(y)) throw new Error('no se divide entre una matriz'); return map2(x, y, divU);
      case '^': if (esM(y)) throw new Error('potencia de matrices: el exponente debe ser un número'); return esM(x) ? mpow(x, y) : nn(x) && nn(y) ? Math.pow(x, y) : HK.U.pow(x, y);
    }
    throw new Error('operador ' + op);
  }
  const neg = (x) => esM(x) ? new Mat(x.r, x.c, x.a.map(negU)) : negU(x);
  function transpose(m) { const o = new Mat(m.c, m.r); for (let i = 0; i < m.r; i++) for (let j = 0; j < m.c; j++) o.s(j, i, m.g(i, j)); return o; }
  function lsolve(K, F) {          // K·u = F (eliminación gaussiana con pivoteo)
    K = SQ(K); F = SQ(F); const n = K.r; if (K.c !== n || F.r !== n) throw new Error('lsolve: K debe ser cuadrada y F de igual altura');
    const A = []; for (let i = 0; i < n; i++) { A.push([]); for (let j = 0; j < n; j++) A[i].push(K.g(i, j)); for (let j = 0; j < F.c; j++) A[i].push(F.g(i, j)); }
    for (let c = 0; c < n; c++) {
      let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
      if (Math.abs(A[p][c]) < 1e-300) throw new Error('matriz singular'); [A[c], A[p]] = [A[p], A[c]];
      for (let i = c + 1; i < n; i++) { const f = A[i][c] / A[c][c]; for (let j = c; j < A[i].length; j++) A[i][j] -= f * A[c][j]; }
    }
    const u = new Mat(n, F.c);
    for (let k = 0; k < F.c; k++) for (let i = n - 1; i >= 0; i--) { let s = A[i][n + k]; for (let j = i + 1; j < n; j++) s -= A[i][j] * u.g(j, k); u.s(i, k, s / A[i][i]); }
    return u;
  }
  const elem = (f) => (x) => esM(x) ? new Mat(x.r, x.c, x.a.map(f)) : f(x);
  const elemN = (f) => elem((v) => f(numU(v)));          // función escalar: pide números sin unidades
  const absU = (v) => nn(v) ? Math.abs(v) : HK.U.abs(v), sqrtU = (v) => nn(v) ? Math.sqrt(v) : HK.U.sqrt(v);
  const FM = {
    mod: (a, b) => map2(a, b, (x, y) => x - y * Math.floor(x / y)), rem: (a, b) => map2(a, b, (x, y) => x - y * Math.trunc(x / y)),
    gausspts: (n) => { const g = HK.gaussLeg(n), o = new Mat(g.x.length, 2); g.x.forEach((v, i) => { o.a[2 * i] = v; o.a[2 * i + 1] = g.w[i]; }); return o; },          // [ξᵢ wᵢ] de Gauss–Legendre en [−1, 1]
    zeros: (n, m) => { tam(n, m); return new Mat(n, m === undefined ? n : m); }, ones: (n, m) => { tam(n, m); const o = new Mat(n, m === undefined ? n : m); o.a.fill(1); return o; },
    transpose, lsolve, abs: elem(absU), sqrt: elem(sqrtU), sin: elemN(Math.sin), cos: elemN(Math.cos), exp: elemN(Math.exp),
    max: (x, y) => y !== undefined ? map2(x, y, maxU) : esM(x) ? (hayQ(x) ? x.a.reduce(maxU) : Math.max(...x.a)) : x, min: (x, y) => y !== undefined ? map2(x, y, minU) : esM(x) ? (hayQ(x) ? x.a.reduce(minU) : Math.min(...x.a)) : x, sum: (x) => esM(x) ? (hayQ(x) ? x.a.reduce(sumaU) : x.a.reduce((p, q) => p + q, 0)) : x,
    col: (m, j) => { const o = new Mat(m.r, 1); for (let i = 0; i < m.r; i++) o.s(i, 0, m.g(i, j - 1)); return o; },
    size: (m) => new Mat(1, 2, [m.r, m.c]),
    inv, det, clsolve: lsolve, round: (x, d) => { const f = Math.pow(10, d === undefined ? 0 : d); return elem((v) => Math.round(numU(v) * f) / f)(x); }, floor: elemN(Math.floor), ceil: elemN(Math.ceil),
  };
  // ---- funciones de matriz de Solver.cs (norm, tr, cross, lin, fila, range…) y SolverSmath.cs (rank, diag, stack, sort…)
  const M1 = (x) => esM(x) ? x : new Mat(1, 1, [x]);
  const elementos = (m) => M1(m).a.slice();
  const vec = (v, fila) => fila ? new Mat(1, v.length, v) : new Mat(v.length, 1, v);
  const redond = (x) => Math.round(x);
  function menor(m, fi, cj) { const o = new Mat(m.r - 1, m.c - 1); let k = 0; for (let i = 0; i < m.r; i++) { if (i === fi) continue; let l = 0; for (let j = 0; j < m.c; j++) { if (j === cj) continue; o.s(k, l++, m.g(i, j)); } k++; } return o; }
  function rango(m) {          // eliminación gaussiana con pivoteo; tolerancia 1e-10·máx|a|
    const a = m.a.slice(), R = m.r, C = m.c; let r = 0; const tol = 1e-10 * Math.max(1, ...a.map(Math.abs)); paso(R * C * Math.min(R, C));
    for (let c = 0; c < C && r < R; c++) {
      let p = r; for (let i = r + 1; i < R; i++) if (Math.abs(a[i * C + c]) > Math.abs(a[p * C + c])) p = i;
      if (Math.abs(a[p * C + c]) < tol) continue;
      for (let j = 0; j < C; j++) { const t = a[r * C + j]; a[r * C + j] = a[p * C + j]; a[p * C + j] = t; }
      for (let i = r + 1; i < R; i++) { const f = a[i * C + c] / a[r * C + c]; for (let j = c; j < C; j++) a[i * C + j] -= f * a[r * C + j]; }
      r++;
    }
    return r;
  }
  function conForma(m, v) { return new Mat(m.r, m.c, v); }
  Object.assign(FM, {
    rank: (x) => rango(SQ(M1(x))),
    norm: (x) => esM(x) ? Math.sqrt(x.a.reduce((p, v) => p + v * v, 0)) : Math.abs(x),          // euclídea (Frobenius en matrices)
    norme: (x) => Math.sqrt(elementos(x).reduce((p, v) => p + v * v, 0)),
    norm1: (x) => { const m = M1(x); paso(m.a.length); if (m.r === 1 || m.c === 1) return m.a.reduce((p, v) => p + Math.abs(v), 0); let b = -Infinity; for (let j = 0; j < m.c; j++) { let t = 0; for (let i = 0; i < m.r; i++) t += Math.abs(m.g(i, j)); b = Math.max(b, t); } return b; },
    normi: (x) => { const m = M1(x); paso(m.a.length); if (m.r === 1 || m.c === 1) return Math.max(...m.a.map(Math.abs)); let b = -Infinity; for (let i = 0; i < m.r; i++) { let t = 0; for (let j = 0; j < m.c; j++) t += Math.abs(m.g(i, j)); b = Math.max(b, t); } return b; },
    tr: (x) => { const m = M1(x); let t = 0; for (let i = 0; i < Math.min(m.r, m.c); i++) t += m.g(i, i); return t; },
    cross: (a, b) => {
      const u = (m) => { m = M1(m); if (m.a.length < 3) throw new Error('cross: los vectores deben tener 3 componentes'); return m.a; }, p = u(a), q = u(b);
      return new Mat(3, 1, [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]);
    },
    identity: (n) => { n = redond(n); tam(n, n); const o = new Mat(n, n); for (let i = 0; i < n; i++) o.s(i, i, 1); return o; },
    diag: (x) => {          // matriz → columna con su diagonal · vector → matriz diagonal
      const m = M1(x); if (m.r !== 1 && m.c !== 1) { const n = Math.min(m.r, m.c); return vec(Array.from({ length: n }, (_, i) => m.g(i, i))); }
      const n = m.a.length; tam(n, n); const o = new Mat(n, n); for (let i = 0; i < n; i++) o.s(i, i, m.a[i]); return o;
    },
    stack: (a, b) => { a = M1(a); b = M1(b); if (a.c !== b.c) throw new Error('stack: las matrices necesitan el mismo número de columnas'); return vcat([a, b]); },
    augment: (a, b) => { a = M1(a); b = M1(b); if (a.r !== b.r) throw new Error('augment: las matrices necesitan el mismo número de filas'); return hcat([a, b]); },
    submatrix: (x, r0, r1, c0, c1) => {          // submatrix(M, f1, f2, c1, c2): filas f1..f2 y columnas c1..c2 (desde 1, incluidas)
      const m = M1(x); r0 = Math.trunc(r0) - 1; r1 = Math.trunc(r1) - 1; c0 = Math.trunc(c0) - 1; c1 = Math.trunc(c1) - 1;
      if (r0 < 0 || c0 < 0 || r1 >= m.r || c1 >= m.c || r1 < r0 || c1 < c0) throw new Error('submatrix: índices fuera de la matriz');
      const o = new Mat(r1 - r0 + 1, c1 - c0 + 1); for (let i = r0; i <= r1; i++) for (let j = c0; j <= c1; j++) o.s(i - r0, j - c0, m.g(i, j)); return o;
    },
    sort: (x) => { const m = M1(x); paso(m.a.length); return conForma(m, m.a.slice().sort((p, q) => p - q)); },
    rsort: (x) => { const m = M1(x); paso(m.a.length); return conForma(m, m.a.slice().sort((p, q) => q - p)); },
    csort: (x, c) => { const m = M1(x); c = Math.trunc(c) - 1; if (c < 0 || c >= m.c) throw new Error('csort: columna fuera de la matriz'); const ord = Array.from({ length: m.r }, (_, i) => i).sort((p, q) => m.g(p, c) - m.g(q, c) || p - q); const o = new Mat(m.r, m.c); ord.forEach((i0, i) => { for (let j = 0; j < m.c; j++) o.s(i, j, m.g(i0, j)); }); return o; },
    reverse: (x) => { const m = M1(x); return conForma(m, m.a.slice().reverse()); },
    row: (x, i) => { const m = M1(x); i = Math.trunc(i) - 1; if (i < 0 || i >= m.r) throw new Error('row: fila fuera de la matriz'); return new Mat(1, m.c, m.a.slice(i * m.c, (i + 1) * m.c)); },
    minor: (x, i, j) => { const m = M1(x); i = Math.trunc(i) - 1; j = Math.trunc(j) - 1; if (m.r !== m.c || i < 0 || j < 0 || i >= m.r || j >= m.c) throw new Error('minor: índices fuera de la matriz'); return m.r === 1 ? 1 : det(menor(m, i, j)); },
    invert: (x) => inv(M1(x)),
    product: (x) => elementos(x).reduce((p, v) => p * v, 1),
    // ayudantes de FEM (Solver.cs:740-806)
    lin: (a, b, n) => { n = redond(n); tam(n, 1); paso(n); return vec(Array.from({ length: n }, (_, q) => n === 1 ? a : a + (b - a) * q / (n - 1))); },          // n puntos de a a b (columna)
    fila: (x, r) => { const m = M1(x); r = redond(r) - 1; if (r < 0 || r >= m.r) throw new Error('fila: fuera de la matriz'); return vec(m.a.slice(r * m.c, (r + 1) * m.c)); },          // la fila r como columna
    range: (a, b) => { let n = Math.floor(b - a + 1e-9) + 1; if (n < 1) n = 1; tam(n, 1); paso(n); return vec(Array.from({ length: n }, (_, i) => a + i)); },
    length: (x) => M1(x).a.length, rows: (x) => M1(x).r, cols: (x) => M1(x).c,
    cada: (x, p, d) => { const m = M1(x); p = redond(p); const d0 = redond(d) - 1, n = Math.floor((m.a.length - d0 + p - 1) / p); tam(n, 1); return vec(Array.from({ length: n }, (_, i) => m.a[d0 + i * p])); },
    el: (x, i, j) => { const m = M1(x); i = redond(i) - 1; if (j === undefined) { const n = m.a.length; if (i < 0 || i >= n) throw new Error('el(): índice ' + (i + 1) + ' fuera de 1…' + n); return m.r === 1 ? m.a[i] : m.g(i % m.r, Math.floor(i / m.r)); } j = redond(j) - 1; if (i < 0 || j < 0 || i >= m.r || j >= m.c) throw new Error('el(): fuera de la matriz'); return m.g(i, j); },
    linterp: (xs, ys, x) => {          // interpolación lineal; fuera del rango da el valor del extremo
      const X = elementos(xs), Y = elementos(ys), n = X.length; if (n < 2) return Y[0]; paso(n);
      for (let k = 0; k < n - 1; k++) if ((x >= X[k] && x <= X[k + 1]) || (x <= X[k] && x >= X[k + 1])) return Y[k] + (Y[k + 1] - Y[k]) * (x - X[k]) / (X[k + 1] - X[k]);
      return x < X[0] ? Y[0] : Y[n - 1];
    },
  });
  FM.trace = FM.tr;
  const COLON = { colon: true };
  const lista = (v, n) => v === COLON ? Array.from({ length: n }, (_, i) => i) : esM(v) ? v.a.map((x) => Math.round(x) - 1) : [Math.round(v) - 1];
  const esc = (v) => !esM(v) && v !== COLON;
  function indice(m, args) {          // M(i), M(i,j), M(:,j), M(a:b, :), M(vector, vector): como MATLAB
    if (args.length === 1) {
      if (esc(args[0])) { const k = Math.round(args[0]) - 1; if (m.r === 1 || m.c === 1) { if (k < 0 || k >= m.a.length) throw new Error('índice fuera de la matriz'); return m.a[k]; } throw new Error('falta un índice'); }
      const idx = lista(args[0], m.a.length); idx.forEach((k) => { if (k < 0 || k >= m.a.length) throw new Error('índice fuera de la matriz'); });
      const vals = idx.map((k) => m.a[k]); return m.r === 1 ? new Mat(1, vals.length, vals) : new Mat(vals.length, 1, vals);
    }
    const ri = lista(args[0], m.r), ci = lista(args[1], m.c);
    if (ri.some((i) => i < 0 || i >= m.r) || ci.some((j) => j < 0 || j >= m.c)) throw new Error('índice fuera de la matriz');
    if (esc(args[0]) && esc(args[1])) return m.g(ri[0], ci[0]);
    const o = new Mat(ri.length, ci.length); ri.forEach((i, a) => ci.forEach((j, b) => o.s(a, b, m.g(i, j)))); return o;
  }
  function asigna(m, args, val) {          // M(i,j) = e, M(:,j) = v, M(a:b, :) = B, M(g,g) = B
    if (args.length === 1) { const idx = lista(args[0], m.a.length); idx.forEach((k, q) => { if (k < 0 || k >= m.a.length) throw new Error('índice fuera de la matriz'); m.a[k] = esM(val) ? val.a[q] : val; }); return; }
    const ri = lista(args[0], m.r), ci = lista(args[1], m.c);
    if (ri.some((i) => i < 0 || i >= m.r) || ci.some((j) => j < 0 || j >= m.c)) throw new Error('índice fuera de la matriz');
    if (esM(val) && val.a.length !== ri.length * ci.length) throw new Error('asignación: el bloque es de ' + val.r + '×' + val.c + ' y el destino de ' + ri.length + '×' + ci.length);
    ri.forEach((i, a) => ci.forEach((j, b) => m.s(i, j, esM(val) ? val.a[a * ci.length + b] : val)));
  }
  function hcat(ms) { const r = ms[0].r; if (ms.some((x) => x.r !== r)) throw new Error('filas de distinto largo'); const c = ms.reduce((s, x) => s + x.c, 0), o = new Mat(r, c); let j0 = 0; for (const x of ms) { for (let i = 0; i < r; i++) for (let j = 0; j < x.c; j++) o.s(i, j0 + j, x.g(i, j)); j0 += x.c; } return o; }
  function vcat(ms) { const c = ms[0].c; if (ms.some((x) => x.c !== c)) throw new Error('filas de distinto largo'); const r = ms.reduce((s, x) => s + x.r, 0), o = new Mat(r, c); let i0 = 0; for (const x of ms) { for (let i = 0; i < x.r; i++) for (let j = 0; j < c; j++) o.s(i0 + i, j, x.g(i, j)); i0 += x.r; } return o; }
  function inv(A) {          // inversa por Gauss-Jordan con pivoteo
    A = SQ(A); const n = A.r; if (A.c !== n) throw new Error('inv: la matriz debe ser cuadrada');
    const a = []; for (let i = 0; i < n; i++) { a.push([]); for (let j = 0; j < n; j++) a[i].push(A.g(i, j)); for (let j = 0; j < n; j++) a[i].push(i === j ? 1 : 0); }
    for (let c = 0; c < n; c++) {
      let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(a[i][c]) > Math.abs(a[p][c])) p = i;
      if (Math.abs(a[p][c]) < 1e-300) throw new Error('matriz singular'); [a[c], a[p]] = [a[p], a[c]];
      const d = a[c][c]; for (let j = 0; j < 2 * n; j++) a[c][j] /= d;
      for (let i = 0; i < n; i++) if (i !== c) { const f = a[i][c]; if (f) for (let j = 0; j < 2 * n; j++) a[i][j] -= f * a[c][j]; }
    }
    const o = new Mat(n, n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) o.s(i, j, a[i][n + j]); return o;
  }
  function det(A) {
    A = SQ(A); const n = A.r; if (A.c !== n) throw new Error('det: la matriz debe ser cuadrada'); const a = A.a.slice(); let d = 1;
    for (let c = 0; c < n; c++) {
      let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(a[i * n + c]) > Math.abs(a[p * n + c])) p = i;
      if (a[p * n + c] === 0) return 0; if (p !== c) { for (let j = 0; j < n; j++) [a[c * n + j], a[p * n + j]] = [a[p * n + j], a[c * n + j]]; d = -d; }
      d *= a[c * n + c]; for (let i = c + 1; i < n; i++) { const f = a[i * n + c] / a[c * n + c]; for (let j = c; j < n; j++) a[i * n + j] -= f * a[c * n + j]; }
    }
    return d;
  }
  // matriz literal  [a,b;c,d]  y vector  [a,b,c]; los elementos pueden ser bloques (rangos, filas…): se pegan como en MATLAB
  function literal(nodo, ev) {
    const filas = nodo.t === 'mat' ? nodo.rows : [nodo.items];
    const bl = filas.map((f) => hcat(f.map((x) => { const v = ev(x); return esM(v) ? v : new Mat(1, 1, [v]); })));
    return bl.length === 1 ? bl[0] : vcat(bl);
  }
  // ---------------------------------------------------------------- programa: líneas de texto con for / while / if
  function programa(lineas, env) {
    let i = 0, ultimo = null;
    const ev = (e) => HK.evalua(e, env);
    function bloque() {          // ejecuta hasta «end» / «else» (sin consumirlo)
      while (i < lineas.length) {
        const raw = lineas[i].trim(); if (!raw) { i++; continue; }
        if (/^(end|else)\b/.test(raw)) return;
        let m;
        if ((m = /^for\s+(\w+)\s*=\s*(.+?):(.+)$/.exec(raw))) {
          const a = ev(HK.parse(m[2])), b = ev(HK.parse(m[3])); const cuerpo = ++i; let fin = cuerpo;
          for (let k = a; k <= b; k++) { paso(); env.v[m[1]] = k; i = cuerpo; bloque(); fin = i; }
          if (a > b) { i = cuerpo; saltaBloque(); fin = i; }
          i = fin + 1; continue;
        }
        if ((m = /^(.+?)\s*=\s*prog\s*$/.exec(raw))) {          // «nombre = prog … return M … end» (el WPF: x_j ≔ programa) o «f(x,y) = prog …»: función con cuerpo de varias líneas
          const ini = ++i; saltaBloque(); const cuerpo = lineas.slice(ini, i); i++;
          const fm = /^(\w+)\s*\((.*)\)$/.exec(m[1].trim());
          if (fm) env.f[fm[1]] = { p: fm[2].split(',').map((x) => x.trim()), lines: cuerpo };
          else { const r = programa(cuerpo, { v: Object.assign({}, env.v), f: env.f, l: env.l }); env.v[m[1].trim()] = r ? r.v : 0; ultimo = null; }
          continue;
        }
        if (/^prog\b/.test(raw)) { i++; bloque(); i++; continue; }          // «prog … end»: varias líneas juntas
        if (/^return\b/.test(raw)) { const e = raw.replace(/^return\s*/, '').replace(/;\s*$/, ''); if (e) ultimo = { v: ev(HK.parse(e)) }; i = lineas.length; return; }          // «return e»: devuelve y termina
        if ((m = /^while\s+(.+)$/.exec(raw))) {
          const cond = m[1], cuerpo = ++i; let fin = cuerpo, n = 0;
          while (cumple(cond)) { if (++n > 1e6) throw new Error('demasiadas iteraciones'); paso(); i = cuerpo; bloque(); fin = i; }
          if (n === 0) { i = cuerpo; saltaBloque(); fin = i; }
          i = fin + 1; continue;
        }
        if ((m = /^if\s+(.+)$/.exec(raw))) {
          const ok = cumple(m[1]); i++;
          if (ok) { bloque(); if (/^else\b/.test((lineas[i] || '').trim())) { i++; saltaBloque(); } }
          else { saltaBloque(true); if (/^else\b/.test((lineas[i] || '').trim())) { i++; bloque(); } }
          i++; continue;
        }
        sentencia(raw); i++;
      }
    }
    function saltaBloque(hastaElse) {          // salta el cuerpo hasta su «end» (o «else»)
      let prof = 0;
      while (i < lineas.length) {
        const t = lineas[i].trim();
        if (/^(for|while|if|prog)\b/.test(t)) prof++;
        else if (/^end\b/.test(t)) { if (prof === 0) return; prof--; }
        else if (hastaElse && prof === 0 && /^else\b/.test(t)) return;
        i++;
      }
    }
    function cumple(txt) {
      const v = ev(HK.parse(txt.trim()));
      return esM(v) ? v.a.every((q) => numU(q) !== 0) : numU(v) !== 0 && v !== false;
    }
    function sentencia(raw) {
      const muestra = !raw.endsWith(';'); const t = raw.replace(/;\s*$/, '');
      const s = HK.sentencia(t);
      if (s.k === 'def') {
        if (s.l.t === 'call' && env.v[s.l.f] instanceof Mat) {          // M(i,j) = e · M(:,j) = v · M(a:b, :) = B · M(g,g) = B
          asigna(env.v[s.l.f], s.l.args.map((a) => ev(a)), ev(s.r)); ultimo = null; return;
        }
        if (s.l.t === 'id' && !(s.l.n in env.v) && HK.elemSub && HK.elemSub(s.l.n, env)) { const el = HK.elemSub(s.l.n, env); el.m.a[el.k] = ev(s.r); ultimo = null; return; }          // M_i,j = e
        if (s.l.t === 'id') { env.v[s.l.n] = ev(s.r); ultimo = muestra ? { nombre: s.l.n, v: env.v[s.l.n] } : null; return; }
        if (s.l.t === 'call') { env.f[s.l.f] = { p: s.l.args.map((a) => a.n), b: s.r }; return; }
      }
      if (s.k === 'expr' || s.k === 'muestra') { const v = ev(s.e); ultimo = muestra ? { v } : null; }
      if (s.k === 'conv') { const v = HK.convierte(ev(s.e), ev(s.u)); ultimo = muestra ? { v } : null; }
    }
    bloque();
    return ultimo;
  }
  HK.M = { reinicia: () => { PASOS = 0; }, paso, tam, Mat, esM, arit, neg, FM, indice, literal, programa, COLON, asigna };
})(window);
