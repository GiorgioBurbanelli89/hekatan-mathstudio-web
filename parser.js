// Hekatan Math Studio Web — parser y evaluador de las ecuaciones (texto ⇄ árbol ⇄ nodos)
(function (G) {
  function tokens(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      let m = /^\d+(\.\d+)?([eE][+-]?\d+)?|^\.\d+/.exec(s.slice(i));
      if (m) { t.push({ k: 'num', s: m[0] }); i += m[0].length; continue; }
      m = /^[A-Za-zͰ-Ͽ℀-⅏][A-Za-zͰ-Ͽ0-9]*(_\{[^{}]+\}|_[A-Za-z0-9Ͱ-Ͽ]+)?/.exec(s.slice(i));
      if (m) { t.push({ k: 'id', s: m[0].replace(/[{}]/g, '') }); i += m[0].length; continue; }          // M_{i,j}: subíndice con coma (elemento de matriz)
      if (s.startsWith('==', i)) { t.push({ k: 'op', s: '==' }); i += 2; continue; }
      t.push({ k: 'op', s: c }); i++;
    }
    return t;
  }
  // gramática: suma → producto (con multiplicación implícita) → potencia → unario → átomo
  function parse(src) {
    const T = tokens(src); let p = 0;
    const pk = () => T[p], nx = () => T[p++];
    const isOp = (s) => T[p] && T[p].k === 'op' && T[p].s === s;
    function expr() {
      let a = suma();
      if (T[p] && T[p].k === 'op' && T[p].s === '==') { nx(); a = { t: 'bin', op: '==', a, b: suma() }; }
      return a;
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
        else if (q.k === 'num' || q.k === 'id' || (q.k === 'op' && q.s === '(')) a = { t: 'bin', op: 'imp', a, b: power() };
        else break;
      }
      return a;
    }
    function unary() {
      if (isOp('-')) { nx(); return { t: 'neg', a: unary() }; }
      if (isOp('+')) { nx(); return unary(); }
      return power();
    }
    function power() {
      const b = atom();
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
      if (q.k === 'op' && q.s === '(') { const e = expr(); if (!isOp(')')) throw new Error('falta )'); nx(); return { t: 'paren', a: e }; }
      throw new Error('símbolo inesperado: ' + q.s);
    }
    const e = expr();
    if (p < T.length) throw new Error('sobra: ' + T[p].s);
    return e;
  }
  // una línea: «a = expr» (definición), «expr =» (mostrar), «expr» (nada)
  function igualTop(s) {
    let d = 0;
    for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; else if (c === '=' && d === 0 && s[i + 1] !== '=' && s[i - 1] !== '=') return i; }
    return -1;
  }
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
      if (i > 0 && l.slice(i + 1).trim() && !/[<>!=≠≤≥]$/.test(l.slice(0, i))) return { k: 'def', l: parse(l.slice(0, i)), r: parse(l.slice(i + 1)), muestra: true };          // «Vm = (w·L)/2 =»: define Y muestra el resultado (como Calcpad/WPF)
      return { k: 'muestra', e: parse(s.slice(0, -1)) };
    }
    let d = 0, ix = -1;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') d++; else if (c === ')') d--;
      else if (c === '=' && d === 0 && s[i + 1] !== '=' && s[i - 1] !== '=') { ix = i; break; }
    }
    if (ix > 0) {
      const l = s.slice(0, ix), r = s.slice(ix + 1).trim();
      if (!r) return { k: 'muestra', e: parse(l) };
      return { k: 'def', l: parse(l), r: parse(r) };
    }
    return { k: 'expr', e: parse(s) };
  }
  const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, exp: Math.exp, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sign: Math.sign, min: Math.min, max: Math.max, atan2: Math.atan2 };
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
  function evalua(a, env) {
    switch (a.t) {
      case 'num': return a.v;
      case 'paren': return evalua(a.a, env);
      case 'neg': return HK.M ? HK.M.neg(evalua(a.a, env)) : -evalua(a.a, env);
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
          case '==': if (typeof x === 'number' && typeof y === 'number') return Math.abs(x - y) < 1e-9 ? 1 : 0; break;          // (p==2) vale 1 o 0, como en el WPF
        }
        break;
      }
      case 'call': {
        if ((a.f === 'sum' || a.f === 'prod') && a.args.length === 4 && a.args[1].t === 'id') {
          const v = a.args[1].n, lo = Math.round(evalua(a.args[2], env)), hi = Math.round(evalua(a.args[3], env)); let r = a.f === 'sum' ? 0 : 1;
          for (let k = lo; k <= hi; k++) { const e2 = { v: Object.assign({}, env.v, { [v]: k }), f: env.f, l: env.l }; r = HK.M.arit(a.f === 'sum' ? '+' : '*', r, evalua(a.args[0], e2)); }
          return r;
        }
        if (SIMBOLICAS.has(a.f) && !(a.f === 'integral' && env.numInt)) throw new Error('simb:' + a.f);
        const mt = env.v[a.f];
        if (mt && HK.M.esM(mt)) return HK.M.indice(mt, a.args.map((x) => evalua(x, env)));
        if (a.f === 'if' && a.args.length === 3 && !env.f['if']) { const c = evalua(a.args[0], env); return (c !== 0 && c !== false) ? evalua(a.args[1], env) : evalua(a.args[2], env); }          // if(c, a, b): solo evalúa la rama elegida (como el WPF)
        const u = env.f[a.f];
        if (u) {
          if (u.p.length !== a.args.length) throw new Error(a.f + ' espera ' + u.p.length + ' argumento(s)');
          const v2 = Object.assign({}, env.v);
          u.p.forEach((n, i) => { v2[n] = evalua(a.args[i], env); });
          if (u.lines) { const r = HK.M.programa(u.lines, { v: v2, f: env.f, l: env.l }); if (!r) throw new Error(a.f + ' no devuelve nada (falta return)'); return r.v; }
          return evalua(u.b, { v: v2, f: env.f, l: env.l });
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
        if (FN[a.f]) return FN[a.f](...a.args.map((x) => evalua(x, env)));
        if (a.f in env.v && a.args.length === 1) return env.v[a.f] * evalua(a.args[0], env);          // x(y+1) = x·(y+1)
        throw new Error('indef:' + a.f);
      }
    }
    throw new Error('no sé evaluar');
  }
  function fmt(v) {
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
  const GRIEGO = { alpha: 'α', beta: 'β', delta: 'δ', epsilon: 'ε', zeta: 'ζ', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω' };
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
      case 'paren': return [{ t: 'paren', r: aFilas(a.a) }];
      case 'colon': return chars(':');
      case 'range': return aFilas(a.a).concat([ch(':')], a.st ? aFilas(a.st).concat([ch(':')]) : [], aFilas(a.b));
      case 'neg': return [{ t: 'c', s: '−', u: true }].concat(aFilas(a.a));
      case 'mat': return [{ t: 'mat', corch: true, cells: a.rows.map((f) => f.map((x) => aFilas(sinParen(x)))) }];
      case 'vec': return [{ t: 'mat', corch: true, cells: [a.items.map((x) => aFilas(sinParen(x)))] }];
      case 'call': {
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
      else if (c === '=' && d === 0 && cuerpo[i + 1] !== '=' && cuerpo[i - 1] !== '=') { ix = i; break; }
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
        case 'c': s += it.s === '·' ? '*' : it.s === '−' ? '-' : it.s === '≔' ? '=' : it.s === '≤' ? '<=' : it.s === '≥' ? '>=' : it.s === '≠' ? '!=' : it.s === '′' ? "'" : it.s; break;
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
  G.HK = Object.assign(G.HK || {}, { parse, sentencia, evalua, elemSub, fmt, aFilas, codigoAFilas, filasATexto, FN, chars, ch, SIMBOLICAS });
})(window);
