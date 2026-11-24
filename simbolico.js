// Hekatan Math Studio Web — motor simbólico EMBEBIDO: el motor de Hekatan LISP compilado a WASM (motor/hlisp.wasm) viaja con la página.
// Nada se instala: el usuario abre la web y las derivadas, integrales y despejes corren en su navegador.
(function (G) {
  const HK = G.HK;
  const M = HK.motor = { listo: false, run: null, error: null };
  (async function () {
    try {
      const hl = await G.HLisp({ print() {}, printErr() {} });
      M.run = hl.cwrap('hlisp_run', 'string', ['string']); M.listo = true;
      if (HK.hoja) HK.hoja.resolver();
    } catch (e) { M.error = e.message; }
  })();

  // ---------------------------------------------------------------- utilidades de árboles (texto prefijo del motor)
  function ratDe(s) {          // "0.15" → 3/20 ; "6" → 6 ; "1e-3" → 1/1000
    s = String(s).trim(); let m = /^(-?)(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(s);
    if (!m) throw new Error('número no válido: ' + s);
    let num = BigInt((m[2] || '0') + m[3]), den = 10n ** BigInt(m[3].length), ex = m[4] ? parseInt(m[4], 10) : 0;
    if (ex >= 0) num *= 10n ** BigInt(ex); else den *= 10n ** BigInt(-ex);
    const mcd = (a, b) => { while (b) { [a, b] = [b, a % b]; } return a; }; const g = mcd(num, den) || 1n; num /= g; den /= g;
    const sg = m[1] === '-' && num !== 0n ? '-' : '';
    return den === 1n ? sg + num : sg + num + '/' + den;
  }
  function leeArbol(t) {          // "(+ a (* 2 b))" → ['+','a',['*','2','b']]
    let i = 0;
    function elem() {
      while (t[i] === ' ') i++;
      if (t[i] === '(') { i++; const r = []; for (;;) { while (t[i] === ' ') i++; if (t[i] === ')') { i++; return r; } r.push(elem()); } }
      let j = i; if (t[i] === '|') { j = t.indexOf('|', i + 1) + 1; } else { while (j < t.length && t[j] !== ' ' && t[j] !== ')' && t[j] !== '(') j++; }
      const s = t.slice(i, j); i = j; return s;
    }
    return elem();
  }
  function ser(a) { return typeof a === 'string' ? a : '(' + a.map(ser).join(' ') + ')'; }
  function contiene(a, v) { return typeof a === 'string' ? a === v : a.slice(1).some((x) => contiene(x, v)); }
  function sustT(a, v, val) { return typeof a === 'string' ? (a === v ? val : a) : a.map((x, i) => i === 0 ? x : sustT(x, v, val)); }
  const CERO = new Set(['sin', 'tan', 'asin', 'atan', 'sinh', 'tanh']), UNO = new Set(['cos', 'cosh', 'exp']);
  function pliega(a) {          // sin(0)=0, cos(0)=1, exp(0)=1, ln(1)=0: el motor no los reduce al sustituir un punto
    if (typeof a === 'string') return a;
    const b = a.map((x, i) => i === 0 ? x : pliega(x));
    if (b.length === 2 && b[1] === '0' && CERO.has(b[0])) return '0';
    if (b.length === 2 && b[1] === '0' && UNO.has(b[0])) return '1';
    if (b.length === 2 && b[1] === '1' && (b[0] === 'ln' || b[0] === 'log')) return '0';
    if (b.length === 2 && b[0] === 'sqrt' && /^\d+$/.test(b[1])) { const r = Math.round(Math.sqrt(+b[1])); if (r * r === +b[1]) return String(r); }          // sqrt(16) = 4
    if (b.length === 2 && (b[0] === 'sin' || b[0] === 'cos' || b[0] === 'tan')) {          // múltiplos de π: sin(π)=0, cos(π)=−1, cos(2π)=1
      const k = b[1] === 'pi' ? 1 : (Array.isArray(b[1]) && b[1][0] === '*' && b[1].length === 3 && ((b[1][2] === 'pi' && /^-?\d+$/.test(b[1][1]) && +b[1][1]) || (b[1][1] === 'pi' && /^-?\d+$/.test(b[1][2]) && +b[1][2]))) || null;
      if (k) return b[0] === 'cos' ? (k % 2 ? '-1' : '1') : '0';
    }
    return b;
  }
  function divCero(a) {          // ¿hay algún «/ algo 0»?  (tras plegar sin(0) etc. el motor devolvería 0 en vez de avisar)
    return typeof a !== 'string' && ((a[0] === '/' && a[2] === '0') || a.slice(1).some(divCero));
  }
  // (expt base N) con N entero > 60 congela el navegador: se rechaza antes de llegar al motor
  function topeExpLisp(code) {
    if (code.length > 20000) throw new Error('expresion demasiado larga para el calculo simbolico');
    let i = -1; while ((i = code.indexOf('(expt ', i + 1)) >= 0) {
      let d = 0, j = i, ult = '', ini = -1;
      for (; j < code.length; j++) { const ch = code[j]; if (ch === '(') { d++; if (d === 2) ini = j; } else if (ch === ')') { d--; if (d === 1) ini = -1; if (d === 0) break; } else if (d === 1 && ch === ' ' ) { ult = ''; ini = j + 1; } else if (d === 1) ult += ch; }
      if (/^\d+$/.test(ult) && parseInt(ult, 10) > 60) throw new Error('exponente demasiado grande para el calculo simbolico (maximo 60)');
    }
  }
  function lisp(code) {
    if (!M.listo) throw new Error('motor:cargando'); topeExpLisp(code);
    const s = M.run('(prin1 ' + code + ')');
    if (s.startsWith(';')) throw new Error(s.replace(/^;\s*(error:\s*)?/, '').trim());
    return s.trim();
  }
  const simb = (n) => '|v_' + n + '|';

  // ---------------------------------------------------------------- AST de la hoja → árbol del motor
  function sust(a, m) {          // sustituye ids por árboles (para expandir funciones de la hoja)
    if (!a || typeof a !== 'object') return a;
    if (a.t === 'id') return Object.prototype.hasOwnProperty.call(m, a.n) ? m[a.n] : a;
    const o = Object.assign({}, a);
    for (const k of ['a', 'b']) if (a[k]) o[k] = sust(a[k], m);
    if (a.args) o.args = a.args.map((x) => sust(x, m));
    if (a.items) o.items = a.items.map((x) => sust(x, m));
    return o;
  }
  function derivaParam(a, ps) {
    if (!a || typeof a !== 'object') return false;
    if (a.t === 'call' && (a.f === 'diff') && a.args[1] && a.args[1].t === 'id' && ps.includes(a.args[1].n)) return true;
    return ['a', 'b'].some((k) => a[k] && derivaParam(a[k], ps)) || (a.args || []).some((x) => derivaParam(x, ps));
  }
  function T(a, c) {
    switch (a.t) {
      case 'num': return ratDe(a.s);
      case 'paren': return T(a.a, c);
      case 'neg': return '(* -1 ' + T(a.a, c) + ')';
      case 'id': return nombre(a.n, c);
      case 'bin': {
        if (a.op === '^') {
          const e = HK.evalua(a.b, { v: c.env.v, f: c.env.f, l: c.env.l });
          return '(expt ' + T(a.a, c) + ' ' + ratDe(String(e)) + ')';
        }
        const op = { '+': '+', '-': '-', '*': '*', imp: '*', '/': '/' }[a.op]; if (!op) throw new Error('operador sin forma simbólica: ' + a.op);
        if (esMatL(a.a, c, 0) || esMatL(a.b, c, 0)) {
          if (op === '*' && esMatL(a.a, c, 0) && esMatL(a.b, c, 0)) {          // dos vectores columna de igual largo (en Hekatan LISP [1, ξ] es un vector 1D): su producto es el producto punto
            const ca = matCod(a.a, c), cb = matCod(a.b, c), dim = (q) => lisp("(let ((x (meval '" + q + "))) (if (and (vectorp x) (> (length x) 0) (vectorp (aref x 0))) (list (length x) (length (aref x 0))) nil))");
            const da = dim(ca), db = dim(cb), ma = /^\((\d+) (\d+)\)$/.exec(da), mb = /^\((\d+) (\d+)\)$/.exec(db);
            if (ma && mb && ma[2] !== mb[1]) {
              if (ma[2] === '1' && mb[2] === '1' && ma[1] === mb[1]) return lisp("(let ((x (meval '(* (mtransp " + ca + ') ' + cb + ')))) (loop while (and (vectorp x) (= (length x) 1)) do (setf x (aref x 0))) x)');
              if (ma[2] === '1' && ma[1] === mb[1]) return lisp("(meval '(* (mtransp " + ca + ') ' + cb + '))').replace(/#\(/g, '(vec ');          // vector 1D · matriz ([1, ξ]·M) = fila · matriz, como Hekatan LISP
              throw new Error('producto de matrices: ' + ma[1] + '×' + ma[2] + ' por ' + mb[1] + '×' + mb[2]);
            }
          }
          return lisp("(meval '" + matCod(a, c) + ')').replace(/#\(/g, '(vec ');          // A·A⁻¹, adj(A)/det(A), A·X con letras: producto / cociente de matrices en el motor (meval), como Hekatan LISP
        }          // A·A⁻¹, adj(A)/det(A), A·X con letras: producto / cociente de matrices en el motor (meval), como Hekatan LISP
        return '(' + op + ' ' + T(a.a, c) + ' ' + T(a.b, c) + ')';
      }
      case 'call': return llamada(a, c);
      case 'mat': return '(vec ' + a.rows.map((r) => '(vec ' + r.map((x) => T(x, c)).join(' ') + ')').join(' ') + ')';          // [a,b;c,d] con letras: matriz simbólica (se dibuja como matriz)
    }
    throw new Error('sin forma simbólica: ' + a.t);
  }
  // matriz con letras → código del motor: (vector (vector 'a 'b) (vector 'c 'd)); un nombre se resuelve hasta su definición
  const MOTOR_MAT = { det: '(mdet ', adj: '(madjugate ', cof: '(mcofactors ', inv: '(minv-auto ', transpose: '(mtransp ' };
  function matrizMotor(a, c, rect) {          // rect: transpose acepta matrices no cuadradas
    for (let k = 0; a && a.t === 'id' && c.env.l && a.n in c.env.l && k < 20; k++) a = c.env.l[a.n];
    if (a && a.t === 'paren') a = a.a;
    { const mn = matNum(a, c, "'"); if (mn) return mn; }          // inv(K) con K numérica dentro de una expresión con letras
    if (a && a.t === 'call' && MOTOR_MAT[a.f] && a.f !== 'det' && a.args.length === 1) return MOTOR_MAT[a.f] + matrizMotor(a.args[0], c, a.f === 'transpose') + ')';          // cof(A)ᵀ, inv(adj(A))…: anidadas, todo en el motor
    if (a && (a.t === 'bin' || a.t === 'neg') && esMatL(a, c, 0)) return "'" + lisp("(meval '" + matCod(a, c) + ')');          // det(K − λ·M), (S_A·S_B)ᵀ: primero la operación de matrices (meval)
    if (!a || a.t !== 'mat') throw new Error('det, adj, inv y transpose simbólicos piden una matriz con letras, p. ej. A = [a, b; c, d]');
    if (a.rows.length > 6 || (!rect && a.rows.some((r) => r.length !== a.rows.length))) throw new Error('matriz simbólica: cuadrada, de hasta 6 × 6');
    return '(vector ' + a.rows.map((r) => '(vector ' + r.map((x) => "'" + T(x, c)).join(' ') + ')').join(' ') + ')';
  }
  // ¿es una MATRIZ de letras (literal, nombre que la guarda, inv/adj/cof/transpose de una, o una operación con ellas)? Para el camino meval de T
  function esMatL(a, c, prof) {
    if (!a || typeof a !== 'object' || prof > 30) return false;
    if (a.t === 'paren') return esMatL(a.a, c, prof + 1);
    if (a.t === 'mat') return true;
    if (a.t === 'call') return !!MOTOR_MAT[a.f] && a.f !== 'det';
    if (a.t === 'id') return !!matNum(a, c) || (!!(c.env.l && a.n in c.env.l) && esMatL(c.env.l[a.n], c, prof + 1));
    if (a.t === 'neg') return esMatL(a.a, c, prof + 1);
    if (a.t === 'bin' && a.op !== '^') return esMatL(a.a, c, prof + 1) || esMatL(a.b, c, prof + 1);
    return false;
  }
  // un nombre que guarda una matriz NUMÉRICA (env.v): (vector (vector …)) con racionales, para mezclarla con letras (c₁ = inv(M)·[1; 0] y luego [1; ξ]·c₁)
  function matNum(a, c, q) {
    const v = a && a.t === 'id' && !(c.env.l && a.n in c.env.l) && c.env.v ? c.env.v[a.n] : null;
    if (!v || !HK.M || !HK.M.esM(v) || v.a.some((x) => typeof x !== 'number' || !isFinite(x))) return null;
    const fl = []; for (let i = 0; i < v.r; i++) { const f = []; for (let j = 0; j < v.c; j++) f.push((q || '') + ratDe(String(v.g(i, j)))); fl.push('(vector ' + f.join(' ') + ')'); }
    return '(vector ' + fl.join(' ') + ')';
  }
  // código para meval: las matrices de letras como (vector (vector …)) y inv/adj/cof/transpose ya calculadas por el motor (#(#(…)))
  function matCod(a, c) {
    switch (a.t) {
      case 'paren': return matCod(a.a, c);
      case 'id': if (matNum(a, c)) return matNum(a, c); return c.env.l && a.n in c.env.l && esMatL(c.env.l[a.n], c, 0) ? matCod(c.env.l[a.n], c) : T(a, c);
      case 'mat': return '(vector ' + a.rows.map((r) => '(vector ' + r.map((x) => T(x, c)).join(' ') + ')').join(' ') + ')';
      case 'neg': return '(* -1 ' + matCod(a.a, c) + ')';
      case 'bin': { const op = { '+': '+', '-': '-', '*': '*', imp: '*', '/': '/' }[a.op]; return op ? '(' + op + ' ' + matCod(a.a, c) + ' ' + matCod(a.b, c) + ')' : T(a, c); }
      case 'call': if (MOTOR_MAT[a.f] && a.f !== 'det' && a.args.length === 1) return lisp(MOTOR_MAT[a.f] + matrizMotor(a.args[0], c, a.f === 'transpose') + ')'); return T(a, c);
    }
    return T(a, c);
  }
  // ¿la expresión lleva matrices (literal [..] o transpose) aunque sea a través de nombres definidos en la hoja?
  function conMatriz(a, c, prof) {
    if (!a || typeof a !== 'object' || prof > 30) return false;
    if (a.t === 'mat' || (a.t === 'call' && a.f === 'transpose')) return true;
    if (a.t === 'id') return !!(c.env.l && a.n in c.env.l) && conMatriz(c.env.l[a.n], c, prof + 1);
    return ['a', 'b'].some((k) => a[k] && conMatriz(a[k], c, prof + 1)) || (a.args || []).some((x) => conMatriz(x, c, prof + 1));
  }
  // la misma expresión en la forma que entiende meval del motor: (vector (vector …)), mtransp, area-under (integral de matrices)
  function TM(a, c) {
    switch (a.t) {
      case 'paren': return TM(a.a, c);
      case 'id': return c.env.l && a.n in c.env.l && conMatriz(c.env.l[a.n], c, 0) ? TM(c.env.l[a.n], c) : T(a, c);
      case 'mat': return '(vector ' + a.rows.map((r) => '(vector ' + r.map((x) => T(x, c)).join(' ') + ')').join(' ') + ')';
      case 'neg': return '(* -1 ' + TM(a.a, c) + ')';
      case 'bin': { const op = { '+': '+', '-': '-', '*': '*', imp: '*' }[a.op]; return op ? '(' + op + ' ' + TM(a.a, c) + ' ' + TM(a.b, c) + ')' : T(a, c); }
      case 'call':
        if (a.f === 'transpose' && a.args.length === 1) return '(mtransp ' + TM(a.args[0], c) + ')';
        if (a.f === 'integral' && a.args.length === 4) return "(area-under '" + TM(a.args[0], c) + " '" + simb(a.args[1].n) + ' ' + T(a.args[2], c) + ' ' + T(a.args[3], c) + ')';
        return T(a, c);
    }
    return T(a, c);
  }
  function nombre(n, c) {
    const e = c.env;
    if (e.l && n in e.l) return T(e.l[n], c);
    if (n in e.v) return ratDe(String(e.v[n]));
    if (n === 'pi' || n === 'π') return 'pi';
    c.libres.add(n); return simb(n);
  }
  function llamada(a, c) {
    const f = a.f, e = c.env;
    if (e.f[f]) {
      const u = e.f[f]; if (u.p.length !== a.args.length) throw new Error(f + ' espera ' + u.p.length + ' argumento(s)');
      if (u.lines) throw new Error('función sin forma simbólica: ' + f);          // «function R = f(…) … end»: se calcula con números, no tiene fórmula de una línea
      let cuerpo = u.b;
      if (derivaParam(cuerpo, u.p)) cuerpo = aAst(lisp("(simplify '" + T(cuerpo, c) + ')'));          // s(x) = diff(u(x), x): primero se deriva, DESPUÉS se reemplaza x
      const m = {}; u.p.forEach((p, i) => { m[p] = a.args[i]; });
      return T(sust(cuerpo, m), c);
    }
    if (['sin', 'cos', 'exp', 'ln', 'sqrt'].includes(f)) return '(' + f + ' ' + T(a.args[0], c) + ')';
    if (f === 'log') return '(ln ' + T(a.args[0], c) + ')';
    if (MOTOR_MAT[f] && a.args.length === 1) {          // determinante, adjunta, inversa y traspuesta con letras (motor de Hekatan LISP: mdet, madjugate, minv-auto, mtransp)
      const m = matrizMotor(a.args[0], c, f === 'transpose'), r = lisp(MOTOR_MAT[f] + m + ')');
      return f === 'det' ? r : r.replace(/#\(/g, '(vec ');          // la matriz vuelve como #(#(..) #(..)) → (vec (vec ..) (vec ..)) para dibujarla
    }
    if (f === 'simplify' || f === 'expand') { const x = T(a.args[0], c); return x.startsWith('(vec ') ? x : lisp("(simplify '" + x + ')'); }
    if (f === 'factor') { c.crudo = true; return lisp("(factor '" + T(a.args[0], c) + ')'); }          // factorizar (motor): el resultado NO se vuelve a simplificar (se desharía)
    if ((f === 'sum' || f === 'suma' || f === 'product' || f === 'prod') && a.args.length === 4) {          // Σ y Π con fórmula cerrada (b puede ser una letra: Σi = n²/2 + n/2)
      const op = (f === 'sum' || f === 'suma') ? 'suma' : 'producto-op', q = (i) => "'" + T(a.args[i], c);
      return lisp('(' + op + ' ' + q(0) + " '" + simb(a.args[1].n) + ' ' + q(2) + ' ' + q(3) + ')');
    }
    if (f === 'slope' && a.args.length === 3) return lisp("(slope-at '" + T(a.args[0], c) + " '" + simb(a.args[1].n) + " '" + T(a.args[2], c) + ')');          // pendiente: f'(a)
    if (f === 'diff' || f === 'partial' || f === 'pdiff') {
      const v = a.args[1].n, n = a.args[2] ? parseInt(a.args[2].s, 10) : 1; let t = T(a.args[0], c);
      for (let i = 0; i < n; i++) t = lisp("(simplify (deriv '" + t + " '" + simb(v) + '))');
      return t;
    }
    if (f === 'limit') {
      const sv = simb(a.args[1].n), crudo = T(a.args[0], c), pt = leeArbol(T(a.args[2], c));
      const valor = (t) => { const q = pliega(sustT(t, sv, pt)); if (divCero(q)) throw new Error('división por cero'); return lisp("(simplify '" + ser(q) + ')'); };
      try { return valor(leeArbol(lisp("(simplify '" + crudo + ')'))); }
      catch (e) {          // 0/0: regla de L'Hôpital (se deriva numerador y denominador hasta que el denominador deje de ser 0)
        const q = leeArbol(crudo); if (typeof q === 'string' || q[0] !== '/') throw e;
        let N = q[1], D = q[2];
        for (let i = 0; i < 8; i++) {
          let d0; try { d0 = valor(D); } catch (e2) { throw e; }
          if (d0 !== '0') return lisp("(simplify '(/ " + valor(N) + ' ' + d0 + '))');
          if (valor(N) !== '0') throw new Error('el límite no existe (tiende a infinito)');
          N = leeArbol(lisp("(simplify (deriv '" + ser(N) + " '" + sv + '))')); D = leeArbol(lisp("(simplify (deriv '" + ser(D) + " '" + sv + '))'));
        }
        throw e;
      }
    }
    if (f === 'taylor') {          // serie de Taylor: Σ f⁽ᵏ⁾(a)/k!·(x−a)ᵏ, k = 0…n
      const sv = simb(a.args[1].n), pt = T(a.args[2], c), n = parseInt(a.args[3].s, 10);
      if (!(n >= 0 && n <= 12)) throw new Error('orden de la serie: entero de 0 a 12');
      if (pt === '0') { const r = lisp("(taylor-op '" + T(a.args[0], c) + " '" + sv + ' 0 ' + n + ')'); if (!r.startsWith('(taylor-op')) { c.crudo = true; return r; } }          // motor de Hekatan LISP: sumandos ya ordenados (x − x³/6 + x⁵/120)
      let d = T(a.args[0], c), fact = 1; const ts = [];
      for (let k = 0; k <= n; k++) {
        if (k > 0) { d = lisp("(simplify (deriv '" + d + " '" + sv + '))'); fact *= k; }
        const ck = lisp("(simplify '" + ser(pliega(sustT(leeArbol(d), sv, leeArbol(pt)))) + ')');
        if (ck !== '0') ts.push('(* (/ ' + ck + ' ' + fact + ') (expt (- ' + sv + ' ' + pt + ') ' + k + '))');
      }
      return lisp("(simplify '" + (ts.reduce((s, t) => s === null ? t : '(+ ' + s + ' ' + t + ')', null) || '0') + ')');          // sumas de dos en dos: el simplify del motor pierde sumandos en (+ a b c)
    }
    if (f === 'integral' && a.args.length === 4 && conMatriz(a.args[0], c, 0)) {          // ∫∫ Bᵀ·D·B·detJ con matrices de letras: lo hace el motor entero (meval + area-under + mtransp), como Hekatan LISP
      const r = lisp("(let ((x (meval '" + TM(a, c) + "))) (loop while (and (vectorp x) (= (length x) 1)) do (setf x (aref x 0))) x)");
      return r.replace(/#\(/g, '(vec ');
    }
    if (f === 'integral') {
      const v = a.args[1].n, sv = simb(v), crudo = lisp("(simplify '" + T(a.args[0], c) + ')'), cuerpo = leeArbol(crudo);
      let prim; const m = lisp("(integ-var '" + crudo + " '" + sv + ')');          // primitiva del motor de Hekatan LISP (1/x → ln x, polinomios, sin, cos, exp…)
      if (!m.includes('no-elem') && !m.startsWith('(integ')) prim = leeArbol(m); else prim = primitiva(cuerpo, sv);          // si el motor no puede, queda mi integrador sencillo
      if (a.args.length === 2) return ser(['+', prim, 'C']);
      return ser(pliega(['-', sustT(prim, sv, leeArbol(T(a.args[3], c))), sustT(prim, sv, leeArbol(T(a.args[2], c)))]));
    }
    if (f === 'solve' || f === 'despejar') return despeja(a, c);
    throw new Error('función sin forma simbólica: ' + f);
  }
  function primitiva(t, v) {
    if (!contiene(t, v)) return ['*', t, v];
    if (typeof t === 'string') return ['/', ['expt', v, '2'], '2'];
    const op = t[0];
    switch (op) {
      case '+': case '-': return [op].concat(t.slice(1).map((x) => primitiva(x, v)));
      case '*': {
        const con = t.slice(1).filter((x) => contiene(x, v)); if (con.length !== 1) throw new Error('no sé integrar ese producto (no es un polinomio)');
        return ['*'].concat(t.slice(1).map((x) => x === con[0] ? primitiva(x, v) : x));
      }
      case '/': if (contiene(t[2], v)) throw new Error('no sé integrar una fracción con la variable abajo'); return ['/', primitiva(t[1], v), t[2]];
      case 'expt': if (t[1] === v && /^-?\d+$/.test(t[2]) && parseInt(t[2], 10) !== -1) { const n = parseInt(t[2], 10) + 1; return ['/', ['expt', v, String(n)], String(n)]; } throw new Error('no sé integrar esa potencia');
      case 'sin': if (t[1] === v) return ['-', ['cos', v]]; break;
      case 'cos': if (t[1] === v) return ['sin', v]; break;
      case 'exp': if (t[1] === v) return ['exp', v]; break;
    }
    throw new Error('no sé integrar ' + op);
  }
  function despeja(a, c) {          // ecuación lineal o de segundo grado en la variable: x − F/F'  (o las dos raíces)
    const vd = a.args[1].n, sd = simb(vd); let e0 = a.args[0];
    if (e0.t === 'bin' && e0.op === '==') e0 = { t: 'bin', op: '-', a: e0.a, b: e0.b };
    const tF = T(e0, c), dF = lisp("(simplify (deriv '" + tF + " '" + sd + '))'), d2 = lisp("(simplify (deriv '" + dF + " '" + sd + '))');
    if (d2 !== '0' && !d2.includes(sd)) {
      const ta = lisp("(simplify '(/ " + d2 + ' 2))'), tb = lisp("(simplify '" + ser(sustT(leeArbol(dF), sd, '0')) + ')'), tc = lisp("(simplify '" + ser(sustT(leeArbol(tF), sd, '0')) + ')');
      const disc = lisp("(simplify '(- (* " + tb + ' ' + tb + ') (* 4 (* ' + ta + ' ' + tc + '))))');
      const R = (sg) => { const r = lisp("(simplify '(/ (" + sg + ' (- ' + tb + ') (sqrt ' + disc + ')) (* 2 ' + ta + ')))'); return lisp("(simplify '" + ser(pliega(leeArbol(r))) + ')'); };          // √16/2 → 2
      return '(vec ' + R('+') + ' ' + R('-') + ')';
    }
    const rs = lisp("(simplify '(- " + sd + ' (/ ' + tF + ' ' + dF + ')))');
    if (new RegExp('(?<![A-Za-z0-9_])' + sd.replace(/[|]/g, '\\|') + '(?![A-Za-z0-9_])').test(rs)) throw new Error('despejar: no es lineal en ' + vd);
    return rs;
  }

  // ---------------------------------------------------------------- árbol del motor → AST de la hoja (para dibujarlo como nodos)
  const NUM = (s) => ({ t: 'num', s: String(s), v: parseFloat(s) });
  function par(a) { return a.t === 'bin' && (a.op === '+' || a.op === '-') || a.t === 'neg' ? { t: 'paren', a } : a; }
  function aAst(txt) { return deArbol(leeArbol(txt)); }
  function deArbol(t) {
    if (typeof t === 'string') {
      let m = /^\|v_(.*)\|$/.exec(t); if (m) return { t: 'id', n: m[1] };
      if (/^-?\d+(\.\d+)?$/.test(t)) return t[0] === '-' ? { t: 'neg', a: NUM(t.slice(1)) } : NUM(t);
      m = /^(-?)(\d+)\/(\d+)$/.exec(t); if (m) { const f = { t: 'bin', op: '/', a: NUM(m[2]), b: NUM(m[3]) }; return m[1] ? { t: 'neg', a: f } : f; }
      return { t: 'id', n: t === 'pi' ? 'π' : t };
    }
    const op = t[0], k = t.slice(1).map(deArbol);
    switch (op) {
      case '+': { let r = k[0]; for (let i = 1; i < k.length; i++) { const x = k[i]; r = x.t === 'neg' ? { t: 'bin', op: '-', a: r, b: par2(x.a) } : { t: 'bin', op: '+', a: r, b: x }; } return r; }
      case '-': if (k.length === 1) return { t: 'neg', a: par(k[0]) }; { let r = k[0]; for (let i = 1; i < k.length; i++) r = { t: 'bin', op: '-', a: r, b: par2(k[i]) }; return r; }
      case '*': {
        let neg = false, xs = k.slice();
        if (xs[0].t === 'num' && xs[0].s === '1' && xs.length > 1) xs.shift();
        if (xs[0].t === 'neg' && xs[0].a.t === 'num' && xs[0].a.s === '1' && xs.length > 1) { neg = true; xs.shift(); }
        else if (xs[0].t === 'neg') { neg = true; xs[0] = xs[0].a; }
        let r = par(xs[0]); for (let i = 1; i < xs.length; i++) { const y = par(xs[i]); r = { t: 'bin', op: y.t === 'num' || (y.t === 'bin' && y.op === '/') || conPunto() ? '*' : 'imp', a: r, b: y }; }          // hoja de Hekatan LISP: a·d − b·c (con punto, como LISP); si no, ad − bc
        return neg ? { t: 'neg', a: r.t === 'bin' && (r.op === '+' || r.op === '-') ? { t: 'paren', a: r } : r } : r;
      }
      case '/': return { t: 'bin', op: '/', a: k[0], b: k[1] };
      case 'expt': return { t: 'bin', op: '^', a: par(k[0].t === 'bin' || k[0].t === 'neg' ? { t: 'paren', a: k[0] } : k[0]), b: k[1] };
      case 'vec': return k.length && k.every((x) => x.t === 'vec') ? { t: 'mat', corch: true, rows: k.map((x) => x.items) } : { t: 'vec', items: k };          // vector de vectores = matriz
      default: return { t: 'call', f: op, args: k };
    }
  }
  const conPunto = () => typeof document !== 'undefined' && document.body && document.body.classList.contains('lisp');
  function par2(a) { return a.t === 'bin' && (a.op === '+' || a.op === '-') ? { t: 'paren', a } : a; }

  // ---------------------------------------------------------------- API
  const SIMBOLICAS = new Set(['diff', 'partial', 'pdiff', 'integral', 'limit', 'taylor', 'solve', 'despejar', 'simplify', 'expand', 'factor', 'slope']);
  function tieneSimb(a) {
    if (!a || typeof a !== 'object') return false;
    if (a.t === 'call' && SIMBOLICAS.has(a.f)) return true;
    return ['a', 'b'].some((k) => a[k] && tieneSimb(a[k])) || (a.args || []).some(tieneSimb);
  }
  // un archivo ajeno no puede congelar el navegador pidiendo (x+1)^100000: exponente simbólico máximo 60
  function topeExp(n, k) { if (!n || typeof n !== 'object' || (k || 0) > 400) return; if (n.t === 'bin' && n.op === '^' && n.b && n.b.t === 'num' && n.b.v > 60) throw new Error('exponente demasiado grande para el cálculo simbólico (máximo 60)'); for (const q in n) { const h = n[q]; if (Array.isArray(h)) h.forEach((z) => topeExp(z, (k || 0) + 1)); else if (h && typeof h === 'object') topeExp(h, (k || 0) + 1); } }
  function resuelve(ast, env) { topeExp(ast);          // AST de la hoja → AST simplificado por el motor
    const c = { env, libres: new Set() }, t = T(ast, c);
    return t.startsWith('(vec ') || c.crudo ? aAst(t) : aAst(lisp("(simplify '" + t + ')'));
  }
  HK.simb = { resuelve, tieneSimb, T, aAst, ratDe };
})(window);
