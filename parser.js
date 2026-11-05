// Hekatan Math Studio Web — parser y evaluador de las ecuaciones (texto ⇄ árbol ⇄ nodos)
(function (G) {
  function tokens(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      let m = /^\d+(\.\d+)?([eE][+-]?\d+)?|^\.\d+/.exec(s.slice(i));
      if (m) { t.push({ k: 'num', s: m[0] }); i += m[0].length; continue; }
      m = /^'([A-Za-zµμΩ°%Å]+)/.exec(s.slice(i));          // unidad: SIEMPRE con apóstrofo ('kN, 'm^2, 10'kN)
      if (m) { t.push({ k: 'unit', s: m[1].replace('μ', 'µ') }); i += m[0].length; continue; }
      m = /^[A-Za-zͰ-Ͽ℀-⅏][A-Za-zͰ-Ͽ0-9]*(_\{[^{}]+\}|_[A-Za-z0-9Ͱ-Ͽ]+)?/.exec(s.slice(i));
      if (m) { t.push({ k: 'id', s: m[0].replace(/[{}]/g, '') }); i += m[0].length; continue; }          // M_{i,j}: subíndice con coma (elemento de matriz)
      if (s.startsWith('==', i)) { t.push({ k: 'op', s: '==' }); i += 2; continue; }
      if (s.startsWith('<=', i)) { t.push({ k: 'op', s: '≤' }); i += 2; continue; }
      if (s.startsWith('>=', i)) { t.push({ k: 'op', s: '≥' }); i += 2; continue; }
      if (s.startsWith('!=', i)) { t.push({ k: 'op', s: '≠' }); i += 2; continue; }
      t.push({ k: 'op', s: c }); i++;
    }
    return t;
  }
  // gramática: suma → producto (con multiplicación implícita) → potencia → unario → átomo
  function parse(src) {
    const T = tokens(src); let p = 0;
    const pk = () => T[p], nx = () => T[p++];
    const isOp = (s) => T[p] && T[p].k === 'op' && T[p].s === s;
    const esId = (w) => T[p] && T[p].k === 'id' && T[p].s === w;
    function expr() {          // o → y → no → comparación encadenada → suma
      let a = yE();
      while (esId('or')) { nx(); a = { t: 'log', op: 'or', a, b: yE() }; }
      return a;
    }
    function yE() { let a = noE(); while (esId('and')) { nx(); a = { t: 'log', op: 'and', a, b: noE() }; } return a; }
    function noE() { if (esId('not')) { nx(); return { t: 'not', a: noE() }; } return cmpE(); }
    function cmpE() {          // a < b ≤ c: pares consecutivos (como «chain» del WPF); un solo «==» conserva su nodo binario
      const terms = [suma()], ops = [];
      while (T[p] && T[p].k === 'op' && ['<', '>', '≤', '≥', '≠', '=='].includes(T[p].s)) { ops.push(nx().s); terms.push(suma()); }
      if (!ops.length) return terms[0];
      if (ops.length === 1 && ops[0] === '==') return { t: 'bin', op: '==', a: terms[0], b: terms[1] };
      return { t: 'cmp', ops, terms };
    }
    function suma() {
      let a = term();
      while (T[p] && T[p].k === 'op' && (T[p].s === '+' || T[p].s === '-')) { const o = nx().s; a = { t: 'bin', op: o, a, b: term() }; }
      return a;
    }
    function term() {
      let a = unary();
      for (;;) {
        const q = pk();
        if (!q) break;
        if (q.k === 'op' && (q.s === '*' || q.s === '/' || q.s === '·')) { nx(); a = { t: 'bin', op: q.s === '/' ? '/' : '*', a, b: unary() }; }
        else if (q.k === 'num' || q.k === 'unit' || (q.k === 'id' && q.s !== 'and' && q.s !== 'or') || (q.k === 'op' && q.s === '(')) a = { t: 'bin', op: 'imp', a, b: power() };
        else break;
      }
      return a;
    }
    function unary() {
      if (isOp('-')) { nx(); return { t: 'neg', a: unary() }; }
      if (isOp('+')) { nx(); return unary(); }
      return power();
    }
    function expUnit() {          // exponente de una unidad: 'm^2, 'm^-1, 'm^(1/2)
      if (isOp('-')) { nx(); return { t: 'neg', a: expUnit() }; }
      if (isOp('+')) { nx(); return expUnit(); }
      if (T[p] && T[p].k === 'num') { const q = nx(); return { t: 'num', s: q.s, v: parseFloat(q.s) }; }
      if (isOp('(')) { nx(); const e = expr(); if (!isOp(')')) throw new Error('falta )'); nx(); return { t: 'paren', a: e }; }
      throw new Error('falta el exponente de la unidad');
    }
    function unitPow(b) { if (isOp('^')) { nx(); return { t: 'bin', op: '^', a: b, b: expUnit() }; } return b; }
    function power() {
      const b = atom();
      if (b.t === 'unit') return unitPow(b);
      if (b.t === 'num' && T[p] && T[p].k === 'unit') return { t: 'bin', op: 'imp', a: b, b: unitPow({ t: 'unit', n: nx().s }) };          // 10'kN, 4'm^2: UN solo átomo (12'kN/3'm = (12 kN)/(3 m))
      if (isOp('^')) { nx(); return { t: 'bin', op: '^', a: b, b: unary() }; }
      return b;
    }
    function argExpr() {          // argumento de llamada o elemento de vector: «:» solo, rango «a:b» o «a:paso:b» (como MATLAB)
      if (isOp(':')) { const q2 = T[p + 1]; if (!q2 || (q2.k === 'op' && (q2.s === ',' || q2.s === ')' || q2.s === ']' || q2.s === ';'))) { nx(); return { t: 'colon' }; } }
      const a = expr();
      if (isOp(':')) { nx(); const b = expr(); if (isOp(':')) { nx(); const c = expr(); return { t: 'range', a, st: b, b: c }; } return { t: 'range', a, b }; }
      return a;
    }
    function atom() {
      const q = nx();
      if (!q) throw new Error('expresión incompleta');
      if (q.k === 'num') return { t: 'num', s: q.s, v: parseFloat(q.s) };
      if (q.k === 'unit') return { t: 'unit', n: q.s };
      if (q.k === 'id') {
        if (isOp('(')) {
          nx(); const args = [];
          if (!isOp(')')) { args.push(argExpr()); while (isOp(',')) { nx(); args.push(argExpr()); } }
          if (!isOp(')')) throw new Error('falta )');
          nx();
          return (q.s === 'pdiff' || q.s === 'partial') ? { t: 'call', f: 'diff', p: true, args } : { t: 'call', f: q.s, args };   // pdiff = ∂ (derivada parcial, se evalúa como diff)
        }
        return { t: 'id', n: q.s };
      }
      if (q.k === 'op' && q.s === '[') {
        const filas = [[]];
        if (!isOp(']')) { filas[0].push(argExpr()); while (isOp(',') || isOp(';')) { if (nx().s === ';') filas.push([]); filas[filas.length - 1].push(argExpr()); } }
        if (!isOp(']')) throw new Error('falta ]'); nx();
        return filas.length === 1 ? { t: 'vec', items: filas[0] } : { t: 'mat', rows: filas };
      }
      if (q.k === 'op' && q.s === '|') { const e = suma(); if (!isOp('|')) throw new Error('falta | de cierre'); nx(); return { t: 'call', f: 'abs', args: [e], bars: true }; }          // |x| = abs(x)
      if (q.k === 'op' && q.s === '(') { const e = expr(); if (!isOp(')')) throw new Error('falta )'); nx(); return { t: 'paren', a: e }; }
      throw new Error('símbolo inesperado: ' + q.s);
    }
    const e = expr();
    if (p < T.length) throw new Error('sobra: ' + T[p].s);
    return e;
  }
  // una línea: «a = expr» (definición), «expr =» (mostrar), «expr» (nada)
  const esAsig = (s, i) => s[i + 1] !== '=' && !'=<>!'.includes(s[i - 1] || ' ');          // «=» que define (no el de ==, <=, >=, !=)
  function igualTop(s) {
    let d = 0;
    for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; else if (c === '=' && d === 0 && esAsig(s, i)) return i; }
    return -1;
  }
  const esExpU = (a) => a.t === 'num' || (a.t === 'neg' && esExpU(a.a)) || (a.t === 'paren' && esExpU(a.a));
  const soloUnidades = (a) => a.t === 'unit' || (a.t === 'paren' && soloUnidades(a.a)) || (a.t === 'bin' && (a.op === '*' || a.op === '/' || a.op === 'imp') && soloUnidades(a.a) && soloUnidades(a.b)) || (a.t === 'bin' && a.op === '^' && soloUnidades(a.a) && esExpU(a.b));          // «='kN/'m»: todo el lado derecho son unidades → conversión
  function sentencia(txt) {
    const s = txt.trim();
    if (!s) return { k: 'vacia' };
    if (s.endsWith('→')) {          // «expr →» evaluación simbólica; «K = expr →» la guarda como fórmula viva
      const l = s.slice(0, -1).trim(), i = igualTop(l);
      if (i > 0 && l.slice(i + 1).trim()) return { k: 'simbdef', n: parse(l.slice(0, i)), e: parse(l.slice(i + 1)) };
      return { k: 'simb', e: parse(l) };
    }
    if (s.endsWith('=') && !s.endsWith('==')) {
      const l = s.slice(0, -1).trim(), i = igualTop(l);
      if (i > 0 && l.slice(i + 1).trim() && !/[<>!=≠≤≥]$/.test(l.slice(0, i))) { const Rr = parse(l.slice(i + 1)), Ll = parse(l.slice(0, i)); return soloUnidades(Rr) ? { k: 'conv', e: Ll, u: Rr } : { k: 'def', l: Ll, r: Rr, muestra: true }; }          // «Vm = (w·L)/2 =»: define Y muestra el resultado (como Calcpad/WPF)
      return { k: 'muestra', e: parse(s.slice(0, -1)) };
    }
    let d = 0, ix = -1;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') d++; else if (c === ')') d--;
      else if (c === '=' && d === 0 && esAsig(s, i)) { ix = i; break; }
    }
    if (ix > 0) {
      const l = s.slice(0, ix), r = s.slice(ix + 1).trim();
      if (!r) return { k: 'muestra', e: parse(l) };
      { const Ll = parse(l), Rr = parse(r); return soloUnidades(Rr) ? { k: 'conv', e: Ll, u: Rr } : { k: 'def', l: Ll, r: Rr }; }
    }
    return { k: 'expr', e: parse(s) };
  }
  const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, exp: Math.exp, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sign: Math.sign, min: Math.min, max: Math.max, atan2: Math.atan2 };
  function gammaFn(x) {          // Lanczos, igual que SolverSmath.GammaFn
    if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x));
    x -= 1; const g = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    let a = g[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += g[i] / (x + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
  }
  const acoth = (x) => 0.5 * Math.log((x + 1) / (x - 1)), cot = (x) => 1 / Math.tan(x), acot = (x) => Math.atan(1 / x), asec = (x) => Math.acos(1 / x), acsc = (x) => Math.asin(1 / x);
  const EXTRA = {
    sh: Math.sinh, ch: Math.cosh, th: Math.tanh, coth: (x) => 1 / Math.tanh(x), cth: (x) => 1 / Math.tanh(x), sech: (x) => 1 / Math.cosh(x), csch: (x) => 1 / Math.sinh(x), cosech: (x) => 1 / Math.sinh(x),
    asinh: Math.asinh, arsh: Math.asinh, argsinh: Math.asinh, acosh: Math.acosh, arch: Math.acosh, argcosh: Math.acosh, atanh: Math.atanh, arth: Math.atanh, argtanh: Math.atanh, acoth, arcth: acoth,
    arcsin: Math.asin, arccos: Math.acos, arctg: Math.atan, arctan: Math.atan, tg: Math.tan, cot, ctg: cot, acot, arcctg: acot, arccot: acot, sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cosec: (x) => 1 / Math.sin(x),
    asec, arcsec: asec, acsc, arccsc: acsc, arccosec: acsc, log10: Math.log10, lg: Math.log10, trunc: Math.trunc, Re: (x) => x, Im: () => 0, Gamma: gammaFn, 'Γ': gammaFn,
    nthroot: (x, n) => (x < 0 && Math.abs(n % 2) === 1) ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n),
  };
  Object.assign(FN, EXTRA);
  const SIMBOLICAS = new Set(['solve', 'diff', 'integral', 'limit', 'dsolve', 'expand', 'simplify', 'factor', 'taylor']);
  function elemSub(n, env) {          // «M_i,j» → { m: M, k: posición }; null si M no es una matriz
    const u = n.indexOf('_'); if (u < 1) return null;
    const m = env.v[n.slice(0, u)]; if (!(HK.M && HK.M.esM(m))) return null;
    const ix = n.slice(u + 1).split(',').map((p) => { p = p.trim(); const v = /^\d+$/.test(p) ? +p : p in env.v ? env.v[p] : NaN; return Math.round(v) - 1; });
    if (ix.some((v) => !isFinite(v))) return null;
    if (ix.length === 1) { if (ix[0] < 0 || ix[0] >= m.a.length) throw new Error('índice fuera de la matriz: ' + n); return { m, k: ix[0] }; }
    if (ix[0] < 0 || ix[0] >= m.r || ix[1] < 0 || ix[1] >= m.c) throw new Error('índice fuera de la matriz: ' + n);
    return { m, k: ix[0] * m.c + ix[1] };
  }
  const esQ = (x) => typeof x === 'object' && x !== null && !!HK.U && HK.U.esQ(x);
  const N = (x) => typeof x === 'number' ? x : esQ(x) ? HK.U.num(x) : x;          // número sin unidades (error limpio si las tiene)
  const verdad = (x) => HK.M && HK.M.esM(x) ? x.a.every((v) => N(v) !== 0) : N(x) !== 0 && x !== false;
  function convierte(x, d) {          // conv(x, 'kN) y «x ='kN»: cambia la unidad en que se MUESTRA (error si las dimensiones no coinciden)
    if (HK.M && HK.M.esM(x)) return new HK.M.Mat(x.r, x.c, x.a.map((v) => HK.U.aUnidad(v, d)));
    return HK.U.aUnidad(x, d);
  }
  function igual(x, y) {          // Igual del WPF: tolerancia relativa 1e-9
    if (esQ(x) || esQ(y)) return HK.U.igual(x, y);
    if (HK.M && HK.M.esM(x) && HK.M.esM(y)) return x.r === y.r && x.c === y.c && x.a.every((v, i) => igual(v, y.a[i]));
    if (typeof x === 'number' && typeof y === 'number') return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.max(Math.abs(x), Math.abs(y)));
    return false;
  }
  function cmp1(op, x, y) {
    if (op === '==') return igual(x, y); if (op === '≠') return !igual(x, y);
    if (esQ(x) || esQ(y)) { const c = HK.U.cmp(x, y); return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '≤' ? c <= 0 : c >= 0; }
    if (typeof x !== 'number' || typeof y !== 'number') throw new Error('solo se comparan números');
    return op === '<' ? x < y : op === '>' ? x > y : op === '≤' ? x <= y : x >= y;
  }
  function llama(u, vals, env, nom) {          // función del usuario: f(x,y) = … o con cuerpo de varias líneas
    if (u.p.length !== vals.length) throw new Error(nom + ' espera ' + u.p.length + ' argumento(s)');
    const v2 = Object.assign({}, env.v); u.p.forEach((n, i) => { v2[n] = vals[i]; });
    if (u.lines) { const r = HK.M.programa(u.lines, { v: v2, f: env.f, l: env.l }); if (!r) throw new Error(nom + ' no devuelve nada (falta return)'); return r.v; }
    return evalua(u.b, { v: v2, f: env.f, l: env.l });
  }
  function evalua(a, env) {
    switch (a.t) {
      case 'num': return a.v;
      case 'unit': return HK.U.de(a.n);
      case 'paren': return evalua(a.a, env);
      case 'neg': return HK.M ? HK.M.neg(evalua(a.a, env)) : -evalua(a.a, env);
      case 'not': return verdad(evalua(a.a, env)) ? 0 : 1;
      case 'log': { const x = evalua(a.a, env); if (a.op === 'and') return verdad(x) && verdad(evalua(a.b, env)) ? 1 : 0; return verdad(x) || verdad(evalua(a.b, env)) ? 1 : 0; }
      case 'cmp': { let x = evalua(a.terms[0], env); for (let i = 0; i < a.ops.length; i++) { const y = evalua(a.terms[i + 1], env); if (!cmp1(a.ops[i], x, y)) return 0; x = y; } return 1; }
      case 'vec': case 'mat': return HK.M.literal(a, (x) => evalua(x, env));
      case 'colon': return HK.M.COLON;
      case 'range': {
        const a0 = evalua(a.a, env), b0 = evalua(a.b, env), st = a.st ? evalua(a.st, env) : 1, out = [];
        if (st > 0) for (let v = a0; v <= b0 + 1e-9; v += st) out.push(v); else if (st < 0) for (let v = a0; v >= b0 - 1e-9; v += st) out.push(v);
        return new HK.M.Mat(1, out.length, out);
      }
      case 'id': {
        if (a.n in env.v) return env.v[a.n];
        if (env.l && a.n in env.l) return evalua(env.l[a.n], env);
        { const el = elemSub(a.n, env); if (el) return el.m.a[el.k]; }          // M_j, M_i,j: elemento de la matriz M (como el subíndice del WPF)
        if (a.n === 'pi' || a.n === 'π') return Math.PI;
        if (a.n === 'e') return Math.E;
        throw new Error('indef:' + a.n);
      }
      case 'bin': {
        const x = evalua(a.a, env);
        if (a.op === '^' && HK.M && HK.M.esM(x)) { const e = a.b.t === 'paren' ? a.b.a : a.b; if (e.t === 'id' && e.n === 'T' && !('T' in env.v)) return HK.M.FM.transpose(x); }          // A^T: la transpuesta
        const y = evalua(a.b, env);
        switch (a.op) {
          case '+': case '-': case '*': case 'imp': case '/': case '^': return HK.M.arit(a.op, x, y);
          case '==': return igual(x, y) ? 1 : 0;          // (p==2) vale 1 o 0, como en el WPF
        }
        break;
      }
      case 'call': {
        if ((a.f === 'sum' || a.f === 'prod') && a.args.length === 4 && a.args[1].t === 'id') {
          const v = a.args[1].n, lo = Math.round(evalua(a.args[2], env)), hi = Math.round(evalua(a.args[3], env)); let r = null;
          if (!(hi - lo <= 1e6)) throw new Error(a.f + ': demasiados terminos (maximo 1 000 000)'); HK.M.paso(hi - lo + 1);
          for (let k = lo; k <= hi; k++) { const e2 = { v: Object.assign({}, env.v, { [v]: k }), f: env.f, l: env.l }; const t = evalua(a.args[0], e2); r = r === null ? t : HK.M.arit(a.f === 'sum' ? '+' : '*', r, t); }
          return r === null ? (a.f === 'sum' ? 0 : 1) : r;
        }
        if (SIMBOLICAS.has(a.f) && !(a.f === 'integral' && env.numInt)) throw new Error('simb:' + a.f);
        if (a.f === 'conv' && a.args.length === 2 && !env.f.conv) return convierte(evalua(a.args[0], env), evalua(a.args[1], env));          // conv(x, 'kN)
        const mt = env.v[a.f];
        if (mt && HK.M.esM(mt)) return HK.M.indice(mt, a.args.map((x) => evalua(x, env)));
        if (a.f === 'if' && a.args.length === 3 && !env.f['if']) { const c = N(evalua(a.args[0], env)); return (c !== 0 && c !== false) ? evalua(a.args[1], env) : evalua(a.args[2], env); }          // if(c, a, b): solo evalúa la rama elegida (como el WPF)
        const u = env.f[a.f];
        if (u) return llama(u, a.args.map((x) => evalua(x, env)), env, a.f);
        if ((a.f === 'matriz' && a.args.length === 3) || (a.f === 'grid' && a.args.length === 5) || (a.f === 'tab' && a.args.length === 4)) {          // matriz(nf, nc, f) · grid(f, na, nb, a, b) · tab(f, n, a, b): f es una función de la hoja (Solver.cs:740-760)
          const M = HK.M, fi = a.f === 'matriz' ? 2 : 0, fnode = a.args[fi], fn = fnode.t === 'id' ? env.f[fnode.n] : null;
          if (!fn) throw new Error(a.f + ': el argumento ' + (fi + 1) + ' debe ser una función definida en la hoja');
          const nv = a.args.map((x, i) => i === fi ? 0 : evalua(x, env)), R = (x) => Math.round(x);
          if (a.f === 'matriz') {
            if (fn.p.length !== 2) throw new Error('matriz(filas, columnas, f): f debe ser una función de (i, j)');
            const nr = R(nv[0]), nc = R(nv[1]); M.tam(nr, nc); M.paso(nr * nc); const o = new M.Mat(nr, nc);
            for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) o.s(i, j, llama(fn, [i + 1, j + 1], env, fnode.n)); return o;
          }
          if (a.f === 'grid') {
            if (fn.p.length !== 2) throw new Error('f debe tener dos parámetros (x, y)');
            const na = R(nv[1]), nb = R(nv[2]), a1 = nv[3], b1 = nv[4]; M.tam((na + 1) * (nb + 1), 1); M.paso((na + 1) * (nb + 1)); const o = new M.Mat((na + 1) * (nb + 1), 1);
            for (let i = 0; i <= na; i++) for (let j = 0; j <= nb; j++) o.a[i * (nb + 1) + j] = llama(fn, [a1 * i / na, b1 * j / nb], env, fnode.n); return o;
          }
          if (fn.p.length !== 1) throw new Error('f debe tener un parámetro');
          const n = R(nv[1]), a1 = nv[2], b1 = nv[3]; M.tam(n, 1); M.paso(n); const o = new M.Mat(n, 1);
          for (let i = 0; i < n; i++) o.a[i] = llama(fn, [n === 1 ? a1 : a1 + (b1 - a1) * i / (n - 1)], env, fnode.n); return o;
        }
        if (a.f === 'integral' && a.args.length === 4 && a.args[1].t === 'id' && HK.gaussLeg) {          // integral(f, v, a, b) numérica (Gauss–Legendre de 8 puntos); f puede dar una matriz: se integra elemento a elemento
          const v = a.args[1].n, lo = evalua(a.args[2], env), hi = evalua(a.args[3], env), g = HK.gaussLeg(8); let r = null;
          for (let q = 0; q < g.x.length; q++) {
            const x = (lo + hi) / 2 + (hi - lo) / 2 * g.x[q], y = evalua(a.args[0], { v: Object.assign({}, env.v, { [v]: x }), f: env.f, l: env.l, numInt: true }), t = HK.M.arit('*', (hi - lo) / 2 * g.w[q], y);
            r = r === null ? t : HK.M.arit('+', r, t);
          }
          return r;
        }
        if (HK.M && HK.M.FM[a.f]) return HK.M.FM[a.f](...a.args.map((x) => evalua(x, env)));
        if (FN[a.f]) {
          if (typeof env.v[a.f] === 'number' && a.args.length === 1) return env.v[a.f] * evalua(a.args[0], env);          // una variable con el nombre de la función manda: th(y+1) = th·(y+1)
          const av = a.args.map((x) => evalua(x, env));
          if (av.length === 1 && HK.M && HK.M.esM(av[0]) && a.f !== 'min' && a.f !== 'max') return new HK.M.Mat(av[0].r, av[0].c, av[0].a.map((v) => esQ(v) && HK.U[a.f] ? HK.U[a.f](v) : FN[a.f](N(v))));          // función escalar sobre una matriz: elemento a elemento
          if (av.some(esQ)) { if (a.f === 'abs' || a.f === 'sqrt' || a.f === 'min' || a.f === 'max') return HK.U[a.f](...av); return FN[a.f](...av.map(N)); }          // abs/sqrt/min/max conservan la unidad; las demás piden número sin unidades
          return FN[a.f](...av);
        }
        if (a.f in env.v && a.args.length === 1) return env.v[a.f] * evalua(a.args[0], env);          // x(y+1) = x·(y+1)
        throw new Error('indef:' + a.f);
      }
    }
    throw new Error('no sé evaluar');
  }
  function fmt(v) {
    if (esQ(v)) { HK.U.cifras = HK.cifras || 6; return HK.U.texto(v); }
    if (typeof v !== 'number' || !isFinite(v)) return String(v);
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-4 || a >= 1e9)) {
      const m = /^(-?[\d.]+?)0*e([+-])(\d+)$/.exec(v.toExponential(5));
      return m ? m[1].replace(/\.$/, '') + 'E' + m[2] + (m[3].length < 2 ? '0' : '') + m[3] : String(v);
    }
    const cf = HK.cifras || 6, dec = Math.min(12, Math.max(3, cf - 1 - Math.floor(Math.log10(a))));          // regla del WPF (FmtD): cifras significativas, mínimo 3 decimales, sin notación científica
    let t = v.toFixed(dec); if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, ''); return t === '-0' ? '0' : t;
  }
  // ---------------------------------------------------------------- árbol → nodos
  const ch = (s) => ({ t: 'c', s });
  const chars = (s) => Array.from(s).map(ch);
  function sinParen(a) { return a.t === 'paren' ? a.a : a; }
  let conservaParen = 0;          // >0 mientras se carga TEXTO del usuario: como el WPF, «x^2/(y+1)» y «x^(2+n)» conservan sus paréntesis (los resultados del motor simbólico no)
  const SP = (a) => (conservaParen && !(a.t === 'paren' && (a.a.t === 'num' || a.a.t === 'id'))) ? a : sinParen(a);          // x^(3) y x^(n) no necesitan paréntesis: x³, xⁿ
  const GRIEGO = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', varepsilon: 'ϵ', vartheta: 'ϑ', varphi: 'ϕ', varrho: 'ϱ', varsigma: 'ς',
    Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Epsilon: 'Ε', Zeta: 'Ζ', Eta: 'Η', Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ', Mu: 'Μ', Nu: 'Ν', Xi: 'Ξ', Omicron: 'Ο', Pi: 'Π', Rho: 'Ρ', Sigma: 'Σ', Tau: 'Τ', Upsilon: 'Υ', Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ', Omega: 'Ω' };
  function idRow(n) {
    if (n === 'pi') return chars('π');          // pi se dibuja π (símbolo)
    if (GRIEGO[n]) return chars(GRIEGO[n]);          // epsilon → ε, alpha → α… (nombre completo; como al teclearlo en el editor)
    const i = n.indexOf('_');
    if (i < 0) return chars(n);
    return chars(n.slice(0, i)).concat([{ t: 'sub', r: chars(n.slice(i + 1)) }]);
  }
  function aFilas(a) {
    switch (a.t) {
      case 'num': return chars(a.s);
      case 'id': return idRow(a.n);
      case 'unit': return [{ t: 'c', s: a.n, un: 1 }];          // unidad: un solo nodo (se dibuja en teal; en texto lleva apóstrofo)
      case 'paren': return [{ t: 'paren', r: aFilas(a.a) }];
      case 'colon': return chars(':');
      case 'range': return aFilas(a.a).concat([ch(':')], a.st ? aFilas(a.st).concat([ch(':')]) : [], aFilas(a.b));
      case 'neg': return [{ t: 'c', s: '−', u: true }].concat(aFilas(a.a));
      case 'not': return chars('not ').concat(aFilas(a.a));
      case 'log': return aFilas(a.a).concat(chars(' ' + a.op + ' '), aFilas(a.b));
      case 'cmp': { let o = aFilas(a.terms[0]); a.ops.forEach((op, i) => { o = o.concat([ch(op)], aFilas(a.terms[i + 1])); }); return o; }
      case 'mat': return [{ t: 'mat', corch: true, cells: a.rows.map((f) => f.map((x) => aFilas(sinParen(x)))) }];
      case 'vec': return [{ t: 'mat', corch: true, cells: [a.items.map((x) => aFilas(sinParen(x)))] }];
      case 'call': {
        if (a.bars) return chars('|').concat(aFilas(a.args[0]), chars('|'));
        if (a.f === 'sqrt' && a.args.length === 1) return [{ t: 'sqrt', r: aFilas(a.args[0]) }];
        if (a.f === 'integral' && (a.args.length === 2 || a.args.length === 4)) return [{ t: 'bigop', s: '∫', body: aFilas(sinParen(a.args[0])), v: aFilas(a.args[1]), lo: a.args.length === 4 ? aFilas(a.args[2]) : [], hi: a.args.length === 4 ? aFilas(a.args[3]) : [] }];
        if ((a.f === 'sum' || a.f === 'prod') && a.args.length === 4) return [{ t: 'bigop', s: a.f === 'sum' ? '∑' : '∏', body: aFilas(sinParen(a.args[0])), lo: aFilas(a.args[1]).concat([ch('=')], aFilas(a.args[2])), hi: aFilas(a.args[3]) }];
        if (a.f === 'limit' && a.args.length === 3 && a.args[1].t === 'id') return [{ t: 'lim', serie: false, v: aFilas(a.args[1]), p: aFilas(a.args[2]), n: [], body: aFilas(sinParen(a.args[0])) }];
        if (a.f === 'taylor' && a.args.length === 4 && a.args[1].t === 'id') return [{ t: 'lim', serie: true, v: aFilas(a.args[1]), p: aFilas(a.args[2]), n: aFilas(a.args[3]), body: aFilas(sinParen(a.args[0])) }];
        if (a.f === 'diff' && (a.args.length === 2 || a.args.length === 3) && a.args[1].t === 'id') return [{ t: 'deriv', p: !!a.p, o: a.args[2] ? (parseInt(a.args[2].s, 10) || 1) : 1, v: aFilas(a.args[1]), f: aFilas(sinParen(a.args[0])) }];
        let args = [];
        a.args.forEach((x, i) => { if (i) args.push(ch(',')); args = args.concat(aFilas(x)); });
        return idRow(a.f).concat([{ t: 'paren', r: args }]);
      }
      case 'bin':
        if (a.op === '/') return [{ t: 'frac', n: aFilas(SP(a.a)), d: aFilas(SP(a.b)) }];
        if (a.op === '^') return aFilas(a.a).concat([{ t: 'sup', r: aFilas(SP(a.b)) }]);
        if (a.op === 'imp') return aFilas(a.a).concat(aFilas(a.b));
        if (a.op === '==') return aFilas(a.a).concat([ch('==')], aFilas(a.b));
        return aFilas(a.a).concat([ch(a.op === '*' ? '·' : a.op === '-' ? '−' : '+')], aFilas(a.b));
    }
    return [];
  }
  // línea de código (con «=» o «=» final) → nodos; si no se puede interpretar, el texto tal cual
  function codigoAFilas(txt) { conservaParen++; try { return codigoAFilas0(txt); } finally { conservaParen--; } }
  function codigoAFilas0(txt) {
    const s = txt.trim(); let fin = '', cuerpo = s;
    const fm = /^for\s+(\w+)\s*=\s*(.+?):(.+)$/.exec(s);
    if (fm) { try { return chars('for ').concat(aFilas(parse(fm[1])), [ch('=')], aFilas(parse(fm[2])), [ch(':')], aFilas(parse(fm[3]))); } catch (e) { return chars(s); } }          // for j = 1:n_j con subíndices dibujados
    const km = /^(return|while|if)\s+(.*)$/.exec(s); if (km) return chars(km[1] + ' ').concat(codigoAFilas0(km[2]));          // la palabra y su espacio (sin él se leería «returnM»)
    if (s.endsWith('→')) { cuerpo = s.slice(0, -1).trim(); fin = '→'; }          // «a = expr →»: la flecha es el resultado simbólico, no parte de la expresión
    else if (s.endsWith('=') && !s.endsWith('==')) { cuerpo = s.slice(0, -1); fin = '='; }
    let d = 0, ix = -1;
    for (let i = 0; i < cuerpo.length; i++) {
      const c = cuerpo[i];
      if (c === '(') d++; else if (c === ')') d--;
      else if (c === '=' && d === 0 && esAsig(cuerpo, i)) { ix = i; break; }
    }
    try {
      if (ix > 0) return aFilas(parse(cuerpo.slice(0, ix))).concat([ch('=')], aFilas(parse(cuerpo.slice(ix + 1))), fin ? [ch(fin)] : []);          // «b = 2 + 3 =»: conserva el «=» final (pide el resultado)
      return aFilas(parse(cuerpo)).concat(fin ? [ch(fin)] : []);
    } catch (e) { return chars(s); }
  }
  // ---------------------------------------------------------------- nodos → texto
  function filasATexto(r) {
    let s = '';
    for (const it of r) {
      switch (it.t) {
        case 'c': if (it.un) { s += "'" + it.s; break; } s += it.s === '·' ? '*' : it.s === '−' ? '-' : it.s === '≔' ? '=' : it.s === '≤' ? '<=' : it.s === '≥' ? '>=' : it.s === '≠' ? '!=' : it.s === '′' ? "'" : it.s; break;
        case 'bigop': {
          const cu = filasATexto(it.body);
          if (it.s === '∫') { const lo = filasATexto(it.lo), hi = filasATexto(it.hi), v = filasATexto(it.v) || 'x'; s += 'integral(' + cu + ',' + v + (lo || hi ? ',' + lo + ',' + hi : '') + ')'; }
          else { const lo = filasATexto(it.lo), i = lo.indexOf('='), v = i >= 0 ? lo.slice(0, i) : 'i', l0 = i >= 0 ? lo.slice(i + 1) : lo; s += (it.s === '∑' ? 'sum(' : 'prod(') + cu + ',' + v + ',' + l0 + ',' + filasATexto(it.hi) + ')'; }
          break;
        }
        case 'lim': s += (it.serie ? 'taylor(' : 'limit(') + filasATexto(it.body) + ',' + (filasATexto(it.v) || 'x') + ',' + (filasATexto(it.p) || '0') + (it.serie ? ',' + (filasATexto(it.n) || '1') : '') + ')'; break;
        case 'deriv': s += (it.p ? 'pdiff(' : 'diff(') + filasATexto(it.f) + ',' + (filasATexto(it.v) || 'x') + (it.o > 1 ? ',' + it.o : '') + ')'; break;
        case 'mat': s += '[' + it.cells.map((r) => r.map((c) => filasATexto(c)).join(',')).join(';') + ']'; break;
        case 'frac': s += '(' + filasATexto(it.n) + ')/(' + filasATexto(it.d) + ')'; break;
        case 'sup': s += '^(' + filasATexto(it.r) + ')'; break;
        case 'sub': { const q = filasATexto(it.r); s += q.indexOf(',') >= 0 ? '_{' + q + '}' : '_' + q; break; }
        case 'sqrt': s += 'sqrt(' + filasATexto(it.r) + ')'; break;
        case 'paren': s += '(' + filasATexto(it.r) + ')'; break;
      }
    }
    return s;
  }
  G.HK = Object.assign(G.HK || {}, { parse, sentencia, evalua, elemSub, fmt, aFilas, codigoAFilas, filasATexto, FN, chars, ch, SIMBOLICAS, convierte });
})(window);
