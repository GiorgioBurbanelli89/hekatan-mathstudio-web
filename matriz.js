// Hekatan Math Studio Web — matrices, vectores y programas (for / while / if) como en el solver de escritorio
(function (G) {
  const HK = G.HK;
  class Mat {
    constructor(r, c, a) { this.r = r; this.c = c; this.a = a || new Array(r * c).fill(0); }
    g(i, j) { return this.a[i * this.c + j]; }
    s(i, j, v) { this.a[i * this.c + j] = v; }
  }
  const esM = (x) => x instanceof Mat;
  function map2(x, y, f) {
    if (!esM(x) && !esM(y)) return f(x, y);
    if (esM(x) && esM(y)) { if (x.r !== y.r || x.c !== y.c) throw new Error('las matrices no tienen el mismo tamaño'); return new Mat(x.r, x.c, x.a.map((v, i) => f(v, y.a[i]))); }
    if (esM(x)) return new Mat(x.r, x.c, x.a.map((v) => f(v, y)));
    return new Mat(y.r, y.c, y.a.map((v) => f(x, v)));
  }
  function mmul(x, y) {
    if (x.c !== y.r) throw new Error('producto de matrices: ' + x.r + '×' + x.c + ' por ' + y.r + '×' + y.c);
    const o = new Mat(x.r, y.c);
    for (let i = 0; i < x.r; i++) for (let j = 0; j < y.c; j++) { let s = 0; for (let k = 0; k < x.c; k++) s += x.g(i, k) * y.g(k, j); o.s(i, j, s); }
    return o;
  }
  function arit(op, x, y) {
    switch (op) {
      case '+': return map2(x, y, (a, b) => a + b);
      case '-': return map2(x, y, (a, b) => a - b);
      case '*': case 'imp': return esM(x) && esM(y) ? mmul(x, y) : map2(x, y, (a, b) => a * b);
      case '/': if (esM(y)) throw new Error('no se divide entre una matriz'); return map2(x, y, (a, b) => a / b);
      case '^': if (esM(x) || esM(y)) throw new Error('potencia de matrices: no soportada todavía'); return Math.pow(x, y);
    }
    throw new Error('operador ' + op);
  }
  const neg = (x) => esM(x) ? new Mat(x.r, x.c, x.a.map((v) => -v)) : -x;
  function transpose(m) { const o = new Mat(m.c, m.r); for (let i = 0; i < m.r; i++) for (let j = 0; j < m.c; j++) o.s(j, i, m.g(i, j)); return o; }
  function lsolve(K, F) {          // K·u = F (eliminación gaussiana con pivoteo)
    const n = K.r; if (K.c !== n || F.r !== n) throw new Error('lsolve: K debe ser cuadrada y F de igual altura');
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
  const FM = {
    mod: (a, b) => map2(a, b, (x, y) => x - y * Math.floor(x / y)), rem: (a, b) => map2(a, b, (x, y) => x - y * Math.trunc(x / y)),
    gausspts: (n) => { const g = HK.gaussLeg(n), o = new Mat(g.x.length, 2); g.x.forEach((v, i) => { o.a[2 * i] = v; o.a[2 * i + 1] = g.w[i]; }); return o; },          // [ξᵢ wᵢ] de Gauss–Legendre en [−1, 1]
    zeros: (n, m) => new Mat(n, m === undefined ? n : m), ones: (n, m) => { const o = new Mat(n, m === undefined ? n : m); o.a.fill(1); return o; },
    transpose, lsolve, abs: elem(Math.abs), sqrt: elem(Math.sqrt), sin: elem(Math.sin), cos: elem(Math.cos), exp: elem(Math.exp),
    max: (x, y) => y !== undefined ? map2(x, y, Math.max) : esM(x) ? Math.max(...x.a) : x, min: (x, y) => y !== undefined ? map2(x, y, Math.min) : esM(x) ? Math.min(...x.a) : x, sum: (x) => esM(x) ? x.a.reduce((p, q) => p + q, 0) : x,
    col: (m, j) => { const o = new Mat(m.r, 1); for (let i = 0; i < m.r; i++) o.s(i, 0, m.g(i, j - 1)); return o; },
    size: (m) => new Mat(1, 2, [m.r, m.c]),
    inv, det, clsolve: lsolve, round: (x, d) => { const f = Math.pow(10, d === undefined ? 0 : d); return elem((v) => Math.round(v * f) / f)(x); }, floor: elem(Math.floor), ceil: elem(Math.ceil),
  };
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
    const n = A.r; if (A.c !== n) throw new Error('inv: la matriz debe ser cuadrada');
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
    const n = A.r; if (A.c !== n) throw new Error('det: la matriz debe ser cuadrada'); const a = A.a.slice(); let d = 1;
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
          for (let k = a; k <= b; k++) { env.v[m[1]] = k; i = cuerpo; bloque(); fin = i; }
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
          while (cumple(cond)) { if (++n > 1e6) throw new Error('demasiadas iteraciones'); i = cuerpo; bloque(); fin = i; }
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
      const mm = /^(.+?)(<=|>=|==|<|>)(.+)$/.exec(txt.trim());
      if (!mm) return ev(HK.parse(txt)) !== 0;
      const x = ev(HK.parse(mm[1])), y = ev(HK.parse(mm[3]));
      return { '<': x < y, '>': x > y, '<=': x <= y, '>=': x >= y, '==': x === y }[mm[2]];
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
    }
    bloque();
    return ultimo;
  }
  HK.M = { Mat, esM, arit, neg, FM, indice, literal, programa, COLON, asigna };
})(window);
