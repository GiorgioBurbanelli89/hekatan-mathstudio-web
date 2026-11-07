// Hekatan Math Studio Web — el lienzo de NODOS: fracción, exponente, subíndice, raíz y paréntesis; cursor dentro de cada hueco.
// Modelo: una fila es un arreglo de elementos {t:'c',s} | {t:'frac',n,d} | {t:'sup',r} | {t:'sub',r} | {t:'sqrt',r} | {t:'paren',r}
(function (G) {
  const HK = G.HK = G.HK || {};
  const FUENTE = '"Cambria Math","STIX Two Math","Times New Roman",serif';
  const COL = { unidad: '#0B6E6A', define: '#2563eb', evalua: '#15803d', ecuacion: '#c2410c', tinta: '#1b1b1b', variable: '#1a4fa3', numero: '#12335f', cursor: '#d22e2e', hueco: '#9db2cf', igual: '#1d8a3a', aviso: '#8a8a8a', error: '#b3202a' };
  HK.fuentes = HK.fuentes || { v: 'Georgia', n: 'Cambria' };          // como TextNode del WPF: variables y signos en Georgia, cifras en Cambria (pestaña «Formato matemático»)
  const famDe = (s) => /^[0-9.]/.test(s) ? '"' + HK.fuentes.n + '","Cambria Math","Times New Roman",serif' : '"' + HK.fuentes.v + '","Cambria Math","Times New Roman",serif';
  const FUENTE_SIGNO = 'Georgia,"Cambria Math","Times New Roman",serif';          // ∫ ∑ ∏: serif claro, como BigOpNode del WPF
  const mc = document.createElement('canvas').getContext('2d');
  const LETRA = /[A-Za-zͰ-Ͽ℀-⅏]/;
  const esNum = (s) => /^[0-9.]/.test(s), espNum = (tam) => (-0.043 * tam) + 'px';          // cifras algo más juntas, como Cambria en el WPF (mide 0.6 px menos por cifra a 14 px)
  function ancho(s, tam, cur) { mc.font = (cur ? 'italic ' : '') + tam + 'px ' + famDe(s); mc.letterSpacing = esNum(s) ? espNum(tam) : '0px'; return mc.measureText(s).width; }
  const OPS_ANCHOS = { '+': .241, '−': .241, '=': .14, '==': .14, '≔': .14, '⇒': .241, '→': .241, '⇔': .241, '≠': .241, '<': .241, '>': .241, '≤': .241, '≥': .241, '·': .1, ',': 0 };          // el WPF dibuja los signos como « + »: un espacio de Georgia (0.241 em) a cada lado; «·» sin espacios

  const GRIEGAS = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω' };
  const glifo = (it) => it._vis || (it.s === '==' ? '⩵' : it.s === '≔' ? '=' : it.s);          // «≔» (definir, tecla «:») se dibuja «=» en azul, como el WPF (TextNode: "≔" → " = ")          // «==» se dibuja ⩵ (naranja); el «=» de una región simbólica se dibuja →
  function hijosDe(it) {          // las filas (huecos) de un elemento, en el orden en que se recorren con →, Espacio y Tab
    switch (it.t) {
      case 'frac': return [it.n, it.d];
      case 'bigop': return it.s === '∫' ? [it.lo, it.hi, it.body, it.v] : [it.lo, it.hi, it.body];
      case 'deriv': return [it.v, it.f];
      case 'lim': return it.serie ? [it.v, it.p, it.n, it.body] : [it.v, it.p, it.body];
      case 'mat': return [].concat(...it.cells);
      default: return it.r ? [it.r] : [];
    }
  }
  // ---------------------------------------------------------------- medir
  function medirFila(fila, tam) {
    // nombres de función (sin cursiva): letras seguidas de un paréntesis
    for (let i = 0; i < fila.length; i++) fila[i]._fn = false;
    for (let i = 0; i < fila.length; i++) {
      if (fila[i].t === 'c' && !fila[i].un && LETRA.test(fila[i].s)) {
        let j = i, nom = '';
        while (j < fila.length && fila[j].t === 'c' && !fila[j].un && LETRA.test(fila[j].s)) { nom += fila[j].s; j++; }
        if (fila[j] && fila[j].t === 'sub') j++;
        if (fila[j] && fila[j].t === 'paren' && HK.FN && (HK.FN[nom] || nom === 'sqrt')) for (let k = i; k < j; k++) fila[k]._fn = true;
        i = j - 1;
      }
    }
    let w = 0, a = 0, d = 0;
    if (fila.length === 0) { fila._b = { w: tam * .5, a: tam * .72, d: tam * .22 }; return fila._b; }
    for (const it of fila) { const b = medirItem(it, tam, fila); it._b = b; w += b.w; a = Math.max(a, b.a); d = Math.max(d, b.d); }
    fila._b = { w, a, d }; return fila._b;
  }
  function medirItem(it, tam, fila) {
    switch (it.t) {
      case 'c': {
        if (it.un) { const pu = tam * .2; return { w: ancho(it.s || "'", tam, false) + pu, a: tam * .72, d: tam * .22, pad: pu }; }          // unidad: un espacio delante (Nodes.cs:143,154) y el texto en teal
        const pad = it.u ? 0 : (OPS_ANCHOS[it.s] || 0) * tam;
        const cur = LETRA.test(it.s) && !it._fn;
        const w = ancho(glifo(it), tam, cur) + (it.s === ',' ? tam * .22 : it.s === '=' && it._ig ? 0 : 2 * pad);
        return { w, a: tam * .72, d: tam * .22, pad: it.s === ',' ? 0 : pad };
      }
      case 'frac': {
        if (it.diag) { const q = tam * .92, n = medirFila(it.n, q), d = medirFila(it.d, q); return { w: n.w + d.w + tam * .34, a: Math.max(tam * .72, n.a + tam * .3), d: Math.max(tam * .22, d.d + tam * .14), eje: 0, gap: 0, diag: true, q }; }          // «Var. fracción»: numerador arriba, barra inclinada, denominador abajo
        const n = medirFila(it.n, tam), d = medirFila(it.d, tam), eje = tam * .3, gap = tam * .14;
        return { w: Math.max(n.w, d.w) + tam * .3, a: eje + gap + n.d + n.a, d: d.a + d.d + gap - eje, eje, gap };
      }
      case 'sup': { const r = medirFila(it.r, tam * .7), up = tam * .45; return { w: r.w + 1, a: r.a + up, d: Math.max(0, r.d - up), up }; }
      case 'sub': { const r = medirFila(it.r, tam * .7), dn = tam * .2; return { w: r.w + 1, a: Math.max(0, r.a - dn), d: r.d + dn, dn }; }
      case 'sqrt': {          // como SqrtNode del WPF: radical de 0.6·fs, barra a 0.1·fs sobre la tinta, el signo llega al menos a la línea base
        const r = medirFila(it.r, tam), t = Math.max(1, tam / 14), c = tam * .1, rad = tam * .6;
        const simple = it.r.every((q) => q.t === 'c' && !/[gjpqyµ,;()\[\]|]/.test(q.s));          // sin descendentes: la tinta no baja de la línea base
        const A = c + t + Math.max(r.a - tam * .04, tam * .5), D = (simple ? 0 : r.d) + tam * .04;
        return { w: rad + 2 + r.w + 2, a: A, d: D, rad };
      }
      case 'bigop': {
        // Igual que BigOpNode del WPF (HekatanVisualNodes/Nodes2.cs): ∫ ∑ ∏ del mismo tamaño, la TINTA centrada en el eje matemático,
        // límite superior APILADO arriba y el inferior abajo (nunca al costado), el ∫ ×0.7 en X y recostado 7°.
        const big = it.s === '∫', hi = medirFila(it.hi, tam * .7), lo = medirFila(it.lo, tam * .7), bd = medirFila(it.body, tam), vv = big ? medirFila(it.v, tam) : null;
        const symH = Math.max(bd.a + bd.d, tam * 1.2) * (big ? 1.15 : 1), size = Math.max(tam * 2, symH * .95);
        mc.font = '300 ' + size + 'px ' + FUENTE_SIGNO; const mm = mc.measureText(it.s);
        const w0 = mm.width, asc = mm.actualBoundingBoxAscent || size * .8, des = mm.actualBoundingBoxDescent || size * .2;
        const sw = w0 * (big ? .7 : 1), axis = -tam * .28, base = axis - (des - asc) / 2, iTop = base - asc, iBot = base + des;
        const col = Math.max(sw, hi.w, lo.w), symX = (col - sw) / 2, upX = (col - hi.w) / 2, loX = (col - lo.w) / 2;
        const upTop = iTop - (hi.a + hi.d) - tam * .05, loTop = iBot + tam * .05, upBase = upTop + hi.a, loBase = loTop + lo.a, symW = col + 3;
        let tot = symW + bd.w + tam * .12, A = Math.max(bd.a, -iTop, -upTop), D = Math.max(bd.d, iBot, loTop + lo.a + lo.d);
        if (big) { tot += tam * .15 + ancho('d', tam, true) + tam * .08 + vv.w; A = Math.max(A, vv.a); D = Math.max(D, vv.d); }
        return { w: tot, a: A, d: D, sw, symW, size, w0, base, axis, symX, upX, loX, upBase, loBase };
      }
      case 'lim': {          // lim_{x→a} f   ·   serie_{x=a}^{n} f   (como LimiteNode del WPF)
        const sm = tam * .7, v = medirFila(it.v, sm), p = medirFila(it.p, sm), bd = medirFila(it.body, tam), n = it.serie ? medirFila(it.n, sm) : null;
        const pal = it.serie ? 'serie' : 'lim', ww = ancho(pal, tam), gl = ancho(it.serie ? '=' : '→', sm) + sm * .3, low = v.w + gl + p.w;
        const col = Math.max(ww, low, n ? n.w : 0), baja = tam * .24 + Math.max(v.a, p.a), alto = n ? n.a + n.d + tam * .1 : 0;
        return { w: col + tam * .14 + bd.w, a: Math.max(bd.a, tam * .72 + alto), d: Math.max(bd.d, baja + Math.max(v.d, p.d) + tam * .05), col, low, gl, baja, ww, sm };
      }
      case 'deriv': {
        const v = medirFila(it.v, tam), f = medirFila(it.f, tam), g = it.p ? '∂' : 'd', eje = tam * .3, gap = tam * .12, ord = it.o > 1 ? ancho(String(it.o), tam * .6) : 0;
        const num = ancho(g, tam, true) + ord, den = ancho(g, tam, true) + v.w + ord, fw = Math.max(num, den) + tam * .25;
        return { w: fw + tam * .15 + f.w, a: Math.max(eje + gap + tam * .22 + tam * .72, f.a), d: Math.max(Math.max(tam * .72, v.a) + Math.max(tam * .22, v.d) + gap - eje, f.d), fw, eje, gap, g, num, den };
      }
      case 'mat': {
        const R = it.cells.length, C = it.cells[0].length, gx = tam * .8, gy = tam * .25, cw = new Array(C).fill(0), ra = [], rd = [];
        for (let i = 0; i < R; i++) { ra.push(tam * .72); rd.push(tam * .22); for (let j = 0; j < C; j++) { const cb = medirFila(it.cells[i][j], tam); cw[j] = Math.max(cw[j], cb.w); ra[i] = Math.max(ra[i], cb.a); rd[i] = Math.max(rd[i], cb.d); } }
        const H = ra.reduce((p, q, i) => p + q + rd[i], 0) + gy * (R - 1), W = cw.reduce((p, q) => p + q, 0) + gx * (C - 1) + tam * .7, eje = tam * .3;
        return { w: W, a: Math.max(H / 2 + eje, tam * .72), d: Math.max(H / 2 - eje, tam * .22), cw, ra, rd, H, gx, gy, eje };
      }
      case 'paren': { const r = medirFila(it.r, tam); return { w: r.w + tam * .62, a: Math.max(r.a, tam * .72) + tam * .06, d: Math.max(r.d, tam * .22) + tam * .06 }; }
    }
    return { w: 0, a: 0, d: 0 };
  }

  // ---------------------------------------------------------------- dibujar (y registrar los lugares del cursor)
  function dibujarFila(ctx, fila, x, y, tam, reg, padre) {
    fila._p = padre || null;
    if (fila.length === 0) {
      reg.push({ fila, i: 0, x: x + tam * .1, y, a: tam * .72, d: tam * .22 });
      ctx.save(); ctx.strokeStyle = COL.hueco; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, y - tam * .6, tam * .42, tam * .78); ctx.restore();
      return;
    }
    let cx = x;
    for (let i = 0; i < fila.length; i++) {
      const it = fila[i], b = it._b;
      reg.push({ fila, i, x: cx, y, a: b.a, d: b.d });
      dibujarItem(ctx, it, cx, y, tam, reg, fila);
      cx += b.w;
    }
    reg.push({ fila, i: fila.length, x: cx, y, a: fila._b.a, d: fila._b.d });
  }
  function dibujarItem(ctx, it, x, y, tam, reg, fila) {
    const b = it._b; ctx.textBaseline = 'alphabetic';
    switch (it.t) {
      case 'c': {
        const cur = LETRA.test(it.s) && !it._fn;
        ctx.font = (cur ? 'italic ' : '') + tam + 'px ' + famDe(it.s); ctx.letterSpacing = esNum(it.s) ? espNum(tam) : '0px';
        ctx.fillStyle = cur ? COL.variable : /[0-9.]/.test(it.s) ? COL.numero : COL.tinta;
        if (it.s === '==') ctx.fillStyle = COL.ecuacion; else if (it.s === '≔') ctx.fillStyle = COL.define; else if (it._tint === 'evalua') ctx.fillStyle = COL.evalua; else if (it._tint === 'define') ctx.fillStyle = COL.define;
        ctx.fillText(glifo(it), x + (b.pad || 0), y);
        break;
      }
      case 'frac': {
        if (it.diag) {
          const q = b.q, nn = it.n._b, dd = it.d._b; ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 18);
          dibujarFila(ctx, it.n, x, y - tam * .3, q, reg, { fila, it });
          ctx.beginPath(); ctx.moveTo(x + nn.w + tam * .04, y + tam * .2); ctx.lineTo(x + nn.w + tam * .28, y - tam * .66); ctx.stroke();
          dibujarFila(ctx, it.d, x + nn.w + tam * .3, y + tam * .14, q, reg, { fila, it }); break;
        }
        const lw = b.w - tam * .3, linea = y - b.eje;
        const n = it.n._b, d = it.d._b;
        dibujarFila(ctx, it.n, x + (b.w - n.w) / 2, linea - b.gap - n.d, tam, reg, { fila, it });
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 18);
        ctx.beginPath(); ctx.moveTo(x + tam * .15, linea); ctx.lineTo(x + tam * .15 + lw, linea); ctx.stroke();
        dibujarFila(ctx, it.d, x + (b.w - d.w) / 2, linea + b.gap + d.a, tam, reg, { fila, it });
        break;
      }
      case 'sup': dibujarFila(ctx, it.r, x, y - b.up, tam * .7, reg, { fila, it }); break;
      case 'sub': dibujarFila(ctx, it.r, x, y + b.dn, tam * .7, reg, { fila, it }); break;
      case 'sqrt': {
        const h = b.a + b.d, top = y - b.a, x0 = x;
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 14); ctx.lineJoin = 'miter';
        ctx.beginPath(); ctx.moveTo(x0, top + h * .60); ctx.lineTo(x0 + b.rad * .35, top + h * .55); ctx.lineTo(x0 + b.rad * .70, top + h - 1); ctx.lineTo(x0 + b.rad, top + 1); ctx.lineTo(x0 + b.w, top + 1); ctx.stroke();
        dibujarFila(ctx, it.r, x + b.rad + 2, y, tam, reg, { fila, it });
        break;
      }
      case 'bigop': {
        // Igual que BigOpNode del WPF (HekatanVisualNodes/Nodes2.cs): ∫ ∑ ∏ del mismo tamaño, la TINTA centrada en el eje matemático,
        // límite superior APILADO arriba y el inferior abajo (nunca al costado), el ∫ ×0.7 en X y recostado 7°.
        const big = it.s === '∫', hi = medirFila(it.hi, tam * .7), lo = medirFila(it.lo, tam * .7), bd = medirFila(it.body, tam), vv = big ? medirFila(it.v, tam) : null;
        const symH = Math.max(bd.a + bd.d, tam * 1.2) * (big ? 1.15 : 1), size = Math.max(tam * 2, symH * .95);
        mc.font = '300 ' + size + 'px ' + FUENTE_SIGNO; const mm = mc.measureText(it.s);
        const w0 = mm.width, asc = mm.actualBoundingBoxAscent || size * .8, des = mm.actualBoundingBoxDescent || size * .2;
        const sw = w0 * (big ? .7 : 1), axis = -tam * .28, base = axis - (des - asc) / 2, iTop = base - asc, iBot = base + des;
        const col = Math.max(sw, hi.w, lo.w), symX = (col - sw) / 2, upX = (col - hi.w) / 2, loX = (col - lo.w) / 2;
        const upTop = iTop - (hi.a + hi.d) - tam * .05, loTop = iBot + tam * .05, upBase = upTop + hi.a, loBase = loTop + lo.a, symW = col + 3;
        let tot = symW + bd.w + tam * .12, A = Math.max(bd.a, -iTop, -upTop), D = Math.max(bd.d, iBot, loTop + lo.a + lo.d);
        if (big) { tot += tam * .15 + ancho('d', tam, true) + tam * .08 + vv.w; A = Math.max(A, vv.a); D = Math.max(D, vv.d); }
        return { w: tot, a: A, d: D, sw, symW, size, w0, base, axis, symX, upX, loX, upBase, loBase };
      }
      case 'lim': {          // lim_{x→a} f   ·   serie_{x=a}^{n} f   (como LimiteNode del WPF)
        const sm = tam * .7, v = medirFila(it.v, sm), p = medirFila(it.p, sm), bd = medirFila(it.body, tam), n = it.serie ? medirFila(it.n, sm) : null;
        const pal = it.serie ? 'serie' : 'lim', ww = ancho(pal, tam), gl = ancho(it.serie ? '=' : '→', sm) + sm * .3, low = v.w + gl + p.w;
        const col = Math.max(ww, low, n ? n.w : 0), baja = tam * .24 + Math.max(v.a, p.a), alto = n ? n.a + n.d + tam * .1 : 0;
        return { w: col + tam * .14 + bd.w, a: Math.max(bd.a, tam * .72 + alto), d: Math.max(bd.d, baja + Math.max(v.d, p.d) + tam * .05), col, low, gl, baja, ww, sm };
      }
      case 'deriv': {
        const v = medirFila(it.v, tam), f = medirFila(it.f, tam), g = it.p ? '∂' : 'd', eje = tam * .3, gap = tam * .12, ord = it.o > 1 ? ancho(String(it.o), tam * .6) : 0;
        const num = ancho(g, tam, true) + ord, den = ancho(g, tam, true) + v.w + ord, fw = Math.max(num, den) + tam * .25;
        return { w: fw + tam * .15 + f.w, a: Math.max(eje + gap + tam * .22 + tam * .72, f.a), d: Math.max(Math.max(tam * .72, v.a) + Math.max(tam * .22, v.d) + gap - eje, f.d), fw, eje, gap, g, num, den };
      }
      case 'mat': {
        const R = it.cells.length, C = it.cells[0].length, gx = tam * .8, gy = tam * .25, cw = new Array(C).fill(0), ra = [], rd = [];
        for (let i = 0; i < R; i++) { ra.push(tam * .72); rd.push(tam * .22); for (let j = 0; j < C; j++) { const cb = medirFila(it.cells[i][j], tam); cw[j] = Math.max(cw[j], cb.w); ra[i] = Math.max(ra[i], cb.a); rd[i] = Math.max(rd[i], cb.d); } }
        const H = ra.reduce((p, q, i) => p + q + rd[i], 0) + gy * (R - 1), W = cw.reduce((p, q) => p + q, 0) + gx * (C - 1) + tam * .7, eje = tam * .3;
        return { w: W, a: Math.max(H / 2 + eje, tam * .72), d: Math.max(H / 2 - eje, tam * .22), cw, ra, rd, H, gx, gy, eje };
      }
      case 'paren': { const r = medirFila(it.r, tam); return { w: r.w + tam * .62, a: Math.max(r.a, tam * .72) + tam * .06, d: Math.max(r.d, tam * .22) + tam * .06 }; }
    }
    return { w: 0, a: 0, d: 0 };
  }

  // ---------------------------------------------------------------- dibujar (y registrar los lugares del cursor)
  function dibujarFila(ctx, fila, x, y, tam, reg, padre) {
    fila._p = padre || null;
    if (fila.length === 0) {
      reg.push({ fila, i: 0, x: x + tam * .1, y, a: tam * .72, d: tam * .22 });
      ctx.save(); ctx.strokeStyle = COL.hueco; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, y - tam * .6, tam * .42, tam * .78); ctx.restore();
      return;
    }
    let cx = x;
    for (let i = 0; i < fila.length; i++) {
      const it = fila[i], b = it._b;
      reg.push({ fila, i, x: cx, y, a: b.a, d: b.d });
      dibujarItem(ctx, it, cx, y, tam, reg, fila);
      cx += b.w;
    }
    reg.push({ fila, i: fila.length, x: cx, y, a: fila._b.a, d: fila._b.d });
  }
  function dibujarItem(ctx, it, x, y, tam, reg, fila) {
    const b = it._b; ctx.textBaseline = 'alphabetic';
    switch (it.t) {
      case 'c': {
        if (it.un) { ctx.font = tam + 'px ' + FUENTE; ctx.letterSpacing = '0px'; ctx.fillStyle = COL.unidad; ctx.fillText(it.s || "'", x + (b.pad || 0), y); break; }
        const cur = LETRA.test(it.s) && !it._fn;
        ctx.font = (cur ? 'italic ' : '') + tam + 'px ' + famDe(it.s); ctx.letterSpacing = esNum(it.s) ? espNum(tam) : '0px';
        ctx.fillStyle = cur ? COL.variable : /[0-9.]/.test(it.s) ? COL.numero : COL.tinta;
        if (it.s === '==') ctx.fillStyle = COL.ecuacion; else if (it.s === '≔') ctx.fillStyle = COL.define; else if (it._tint === 'evalua') ctx.fillStyle = COL.evalua; else if (it._tint === 'define') ctx.fillStyle = COL.define;
        ctx.fillText(glifo(it), x + (b.pad || 0), y);
        break;
      }
      case 'frac': {
        if (it.diag) {
          const q = b.q, nn = it.n._b, dd = it.d._b; ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 18);
          dibujarFila(ctx, it.n, x, y - tam * .3, q, reg, { fila, it });
          ctx.beginPath(); ctx.moveTo(x + nn.w + tam * .04, y + tam * .2); ctx.lineTo(x + nn.w + tam * .28, y - tam * .66); ctx.stroke();
          dibujarFila(ctx, it.d, x + nn.w + tam * .3, y + tam * .14, q, reg, { fila, it }); break;
        }
        const lw = b.w - tam * .3, linea = y - b.eje;
        const n = it.n._b, d = it.d._b;
        dibujarFila(ctx, it.n, x + (b.w - n.w) / 2, linea - b.gap - n.d, tam, reg, { fila, it });
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 18);
        ctx.beginPath(); ctx.moveTo(x + tam * .15, linea); ctx.lineTo(x + tam * .15 + lw, linea); ctx.stroke();
        dibujarFila(ctx, it.d, x + (b.w - d.w) / 2, linea + b.gap + d.a, tam, reg, { fila, it });
        break;
      }
      case 'sup': dibujarFila(ctx, it.r, x, y - b.up, tam * .7, reg, { fila, it }); break;
      case 'sub': dibujarFila(ctx, it.r, x, y + b.dn, tam * .7, reg, { fila, it }); break;
      case 'sqrt': {
        const r = it.r._b, top = y - b.a + tam * .05, h = b.a + b.d;
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 16); ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(x + tam * .04, y - h * .38); ctx.lineTo(x + tam * .16, y - h * .42); ctx.lineTo(x + tam * .3, y + b.d);
        ctx.lineTo(x + tam * .46, top); ctx.lineTo(x + b.w, top); ctx.stroke();
        dibujarFila(ctx, it.r, x + tam * .55, y, tam, reg, { fila, it });
        break;
      }
      case 'bigop': {
        const big = it.s === '∫', hi = it.hi._b, lo = it.lo._b, bd = it.body._b;
        ctx.fillStyle = COL.tinta; ctx.textBaseline = 'alphabetic';
        {          // signo centrado en el eje (∫: ×0.7 en X y recostado 7°, como el WPF) con los límites apilados arriba y abajo
          ctx.save(); ctx.translate(x + b.symX + b.sw / 2, y + b.axis);
          if (big) { ctx.rotate(7 * Math.PI / 180); ctx.scale(.7, 1); }
          ctx.font = '300 ' + b.size + 'px ' + FUENTE_SIGNO; ctx.textAlign = 'left'; ctx.fillText(it.s, -b.w0 / 2, b.base - b.axis); ctx.restore();
          dibujarFila(ctx, it.lo, x + b.loX, y + b.loBase, tam * .7, reg, { fila, it });
          dibujarFila(ctx, it.hi, x + b.upX, y + b.upBase, tam * .7, reg, { fila, it });
        }
        let cx = x + b.symW;
        dibujarFila(ctx, it.body, cx + tam * .06, y, tam, reg, { fila, it }); cx += bd.w + tam * .12;
        if (big) { ctx.font = 'italic ' + tam + 'px ' + FUENTE; ctx.fillStyle = COL.variable; ctx.fillText('d', cx + tam * .15, y); dibujarFila(ctx, it.v, cx + tam * .15 + ancho('d', tam, true) + tam * .08, y, tam, reg, { fila, it }); }
        break;
      }
      case 'lim': {
        const v = it.v._b, p = it.p._b;
        ctx.fillStyle = COL.tinta; ctx.font = tam + 'px ' + FUENTE; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        ctx.fillText(it.serie ? 'serie' : 'lim', x + (b.col - b.ww) / 2, y);
        const ly = y + b.baja, lx = x + (b.col - b.low) / 2;
        dibujarFila(ctx, it.v, lx, ly, b.sm, reg, { fila, it });
        ctx.fillStyle = COL.tinta; ctx.font = b.sm + 'px ' + FUENTE; ctx.fillText(it.serie ? '=' : '→', lx + v.w + b.sm * .15, ly);
        dibujarFila(ctx, it.p, lx + v.w + b.gl, ly, b.sm, reg, { fila, it });
        if (it.serie) dibujarFila(ctx, it.n, x + (b.col - it.n._b.w) / 2, y - tam * .72 - it.n._b.d - tam * .08, b.sm, reg, { fila, it });
        dibujarFila(ctx, it.body, x + b.col + tam * .14, y, tam, reg, { fila, it });
        break;
      }
      case 'deriv': {
        const g = b.g, linea = y - b.eje, v = it.v._b;
        ctx.fillStyle = COL.tinta; ctx.font = 'italic ' + tam + 'px ' + FUENTE; ctx.textAlign = 'left';
        ctx.fillText(g, x + (b.fw - b.num) / 2, linea - b.gap - tam * .22);
        if (it.o > 1) { ctx.font = (tam * .6) + 'px ' + FUENTE; ctx.fillText(String(it.o), x + (b.fw - b.num) / 2 + ancho(g, tam, true), linea - b.gap - tam * .62); }
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 18); ctx.beginPath(); ctx.moveTo(x + tam * .06, linea); ctx.lineTo(x + b.fw - tam * .06, linea); ctx.stroke();
        const dx = x + (b.fw - b.den) / 2, by = linea + b.gap + Math.max(tam * .72, v.a);
        ctx.font = 'italic ' + tam + 'px ' + FUENTE; ctx.fillStyle = COL.tinta; ctx.fillText(g, dx, by);
        dibujarFila(ctx, it.v, dx + ancho(g, tam, true), by, tam, reg, { fila, it });
        if (it.o > 1) { ctx.font = (tam * .6) + 'px ' + FUENTE; ctx.fillStyle = COL.tinta; ctx.fillText(String(it.o), dx + ancho(g, tam, true) + v.w, by - tam * .4); }
        dibujarFila(ctx, it.f, x + b.fw + tam * .15, y, tam, reg, { fila, it });
        break;
      }
      case 'mat': {
        const R = it.cells.length, C = it.cells[0].length, bt = y - b.a + tam * .05, bb = y + b.d - tam * .05, bw = tam * .2;
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = Math.max(1, tam / 16);
        ctx.beginPath(); ctx.moveTo(x + bw, bt); ctx.lineTo(x + 2, bt); ctx.lineTo(x + 2, bb); ctx.lineTo(x + bw, bb);
        ctx.moveTo(x + b.w - bw, bt); ctx.lineTo(x + b.w - 2, bt); ctx.lineTo(x + b.w - 2, bb); ctx.lineTo(x + b.w - bw, bb); ctx.stroke();
        let cy = y - b.eje - b.H / 2;
        for (let i = 0; i < R; i++) {
          cy += b.ra[i]; let cx = x + tam * .35;
          for (let j = 0; j < C; j++) { const cb = it.cells[i][j]._b; dibujarFila(ctx, it.cells[i][j], cx + (b.cw[j] - cb.w) / 2, cy, tam, reg, { fila, it }); cx += b.cw[j] + b.gx; }
          cy += b.rd[i] + b.gy;
        }
        break;
      }
      case 'paren': {
        const r = it.r._b, top = y - b.a, bot = y + b.d, lw = Math.max(1, tam / 16), e = tam * .16;
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x + tam * .27, top); ctx.quadraticCurveTo(x + tam * .02, (top + bot) / 2, x + tam * .27, bot); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + b.w - tam * .27, top); ctx.quadraticCurveTo(x + b.w - tam * .02, (top + bot) / 2, x + b.w - tam * .27, bot); ctx.stroke();
        dibujarFila(ctx, it.r, x + tam * .31, y, tam, reg, { fila, it });
        break;
      }
    }
  }

  // ---------------------------------------------------------------- el editor de una ecuación
  class Editor {
    constructor(canvas, opciones) {
      this.canvas = canvas; this.tam = (opciones && opciones.tam) || 20; this.fila = [];
      this.cur = { fila: this.fila, i: 0 }; this.reg = []; this.foco = false; this.resultado = null; this.alCambiar = null;
      this.nota = ''; this.dpr = window.devicePixelRatio || 1;
      this.deshacer = []; this.rehacer = []; this.ancla = null; this.sel = null; this.alSalir = null; this.alVaciar = null;
    }
    cargar(fila) { this.fila = fila; this.cur = { fila, i: fila.length }; this.dibuja(); }
    texto() { return HK.filasATexto(this.fila); }
    cambio() { if (this.alCambiar) this.alCambiar(this); else this.dibuja(); }
    dibuja() {          // como el WPF (EscalaPagina): una ecuación más ancha que el área entre márgenes SE REDUCE hasta caber (mínimo 30 %); nada queda fuera
      this._exceso = 0; this.dibujaCon(this.tam, false);
      if (this._exceso > 0) { const sc = Math.max(0.3, this._exceso); this._exceso = 0; this.dibujaCon(this.tam * sc, true); }
    }
    dibujaCon(tam, reducida) {
      const cv = this.canvas, dpr = this.dpr;
      const b = medirFila(this.fila, tam);
      let extra = 0, res = this.resultado; if (res && res.fila) { const rb0 = medirFila(res.fila, tam); b.a = Math.max(b.a, rb0.a); b.d = Math.max(b.d, rb0.d); }
      let mTxt = null, mColw = null, mFt = tam * .78, mFilas = 0, mAlt = 0;
      if (res && res.mat) {          // matriz: rejilla de números entre corchetes
        const m = res.mat; mFilas = Math.min(m.r, 14); mTxt = m.a.map((v) => HK.fmt(v)); mColw = [];
        mc.font = mFt + 'px ' + FUENTE;
        for (let j = 0; j < Math.min(m.c, 12); j++) { let w = 0; for (let i = 0; i < mFilas; i++) w = Math.max(w, mc.measureText(mTxt[i * m.c + j]).width); mColw.push(w + mFt * .6); }
        mAlt = mFilas * mFt * 1.3; b.a = Math.max(b.a, mAlt / 2 + mFt * .5 + tam * .3); b.d = Math.max(b.d, mAlt / 2 + mFt * .5 - tam * .3);
      }
      const resT = res ? res.texto : '';
      mc.font = tam + 'px ' + FUENTE; const wRes = res ? mc.measureText('  ' + resT).width + tam : 0;
      let resW = 0;
      if (res && res.fila) { const u9 = this.fila[this.fila.length - 1]; resW = ((u9 && u9.t === 'c' && (u9.s === '=' || u9.s === '→')) ? tam * .3 : tam * .85 + ancho(res.sim, tam)) + medirFila(res.fila, tam).w; }          // si la fórmula ya termina en «=», no se reserva otra flecha
      else if (res && res.mat) resW = tam * 1.2 + (mColw ? mColw.reduce((p, q) => p + q, 0) : 0) + 20;
      else if (res && res.texto) resW = res.kind === 'val' ? ((u) => (u && u.t === 'c' && u.s === '=') ? ancho(res.texto, tam) + tam * .35 : ancho('= ' + res.texto, tam) + tam * .9)(this.fila[this.fila.length - 1]) : ancho('  ' + res.texto, tam * .75) + tam;
      const tx0 = cv.closest('.txt'), fl0 = cv.closest('.fila'), pw = tx0 ? Math.max(120, tx0.clientWidth - 8) : fl0 ? fl0.clientWidth : cv.parentElement && cv.parentElement.parentElement ? cv.parentElement.parentElement.clientWidth : 700;          // ancho de la FILA (no del grupo de líneas, que es angosto)
      const Wn = Math.max(Math.min(pw || 700, Math.ceil(4 + b.w + resW + (this.foco ? 20 : (tx0 ? 2 : 8)) + (this.modo && this.foco ? 52 : 0))), (this.modo && this.foco) ? Math.ceil(4 + b.w + 8 + 46) : 24);          // con modo (simbólica/notación) cabe además la etiqueta de arriba a la derecha sin tapar la ecuación
      const W = this.fila.length ? Wn : 16;          // ecuación vacía (el indicador): menos que una celda de 20 px, para no tapar la siguiente
      if (!reducida && pw > 60) { const nat = 4 + b.w + resW + 8; if (nat > pw) this._exceso = (pw - 2) / nat; }          // no cabe: se vuelve a dibujar más pequeña
      const H = Math.ceil(b.a + b.d + tam * .9);
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const y = Math.ceil(b.a + tam * .35), x0 = 4;
      this.reg = []; dibujarFila(ctx, this.fila, x0, y, tam, this.reg, null);
      this.x0 = x0; this.y0 = y; this._H = H; this._yInk = y + b.d;          // _yInk: distancia del borde superior del lienzo al punto más bajo de lo DIBUJADO (para apoyar la ecuación en una línea de la cuadrícula)
      { const sp = cv.closest('.ifx'); if (sp) sp.style.verticalAlign = (-(H - y)) + 'px'; }          // dentro de un párrafo: la línea base de la fórmula coincide con la del texto
      cv.dataset.y0 = y; { const fl = cv.closest('.fila'); if (fl) { const cs = [...fl.querySelectorAll('canvas[data-y0]')]; const mx = Math.max(...cs.map((q) => +q.dataset.y0)); cs.forEach((q) => { q.style.marginTop = (mx - q.dataset.y0) + 'px'; }); } }          // en una misma línea las ecuaciones se alinean por la línea base (como el WPF)
      if (this.sel) {          // selección: un recuadro azul sobre los elementos elegidos
        const s = this.sel, p0 = this.reg.find((q) => q.fila === s.fila && q.i === s.i0), p1 = this.reg.find((q) => q.fila === s.fila && q.i === s.i1);
        if (p0 && p1) {
          let aa = tam * .72, dd = tam * .22; for (let k = s.i0; k < s.i1; k++) { const bb = s.fila[k]._b; if (bb) { aa = Math.max(aa, bb.a); dd = Math.max(dd, bb.d); } }
          ctx.fillStyle = 'rgba(26,79,163,.26)'; ctx.fillRect(p0.x, p0.y - aa - 2, Math.max(2, p1.x - p0.x), aa + dd + 4);
        }
      }
      if (res && res.mat) {
        const m = res.mat; let x = x0 + b.w + tam * .35; const ult = this.fila[this.fila.length - 1];
        ctx.textBaseline = 'alphabetic'; ctx.font = tam + 'px ' + FUENTE;
        if (!(ult && ult.t === 'c' && ult.s === '=')) { ctx.fillStyle = COL.igual; ctx.fillText('=', x, y); x += ancho('=', tam) + tam * .35; }
        const wT = mColw.reduce((p, q) => p + q, 0) + 12, top = y - tam * .3 - mAlt / 2 + mFt * .15, bot = y - tam * .3 + mAlt / 2 + mFt * .1;          // el centro de los corchetes va en el eje del «=» (0,3·tam sobre la línea base)
        ctx.strokeStyle = COL.tinta; ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.moveTo(x + 5, top); ctx.lineTo(x + 1, top); ctx.lineTo(x + 1, bot); ctx.lineTo(x + 5, bot);
        ctx.moveTo(x + wT - 5, top); ctx.lineTo(x + wT - 1, top); ctx.lineTo(x + wT - 1, bot); ctx.lineTo(x + wT - 5, bot); ctx.stroke();
        ctx.font = mFt + 'px ' + FUENTE; ctx.fillStyle = COL.numero; ctx.textAlign = 'right';
        for (let i = 0; i < mFilas; i++) { let cx = x + 6; for (let j = 0; j < mColw.length; j++) { cx += mColw[j]; ctx.fillText(mTxt[i * m.c + j], cx - mFt * .45, top + (i + 1) * mFt * 1.3 - mFt * .3); } }
        ctx.textAlign = 'left';
      } else if (res && res.fila) {          // resultado simbólico: flecha o igual + el árbol dibujado como nodos
        const rb = medirFila(res.fila, tam); let x = x0 + b.w + tam * .45;
        const ult2 = this.fila[this.fila.length - 1], yaIgual = ult2 && ult2.t === 'c' && (ult2.s === '=' || ult2.s === '→');          // si ya tecleaste «=», no se repite
        ctx.font = tam + 'px ' + FUENTE; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = res.sim === '→' ? COL.variable : COL.igual; if (!yaIgual) { ctx.fillText(res.sim, x, y); x += ancho(res.sim, tam) + tam * .4; } else x -= tam * .15;
        dibujarFila(ctx, res.fila, x, y, tam, [], null);
      } else if (res && res.texto) {
        let x = x0 + b.w + tam * .35;
        ctx.textBaseline = 'alphabetic';
        if (res.kind === 'val') { ctx.font = tam + 'px ' + FUENTE; const ult = this.fila[this.fila.length - 1]; if (!(ult && ult.t === 'c' && ult.s === '=')) { ctx.fillStyle = COL.igual; ctx.fillText('=', x, y); x += ancho('=', tam) + tam * .35; } else x -= tam * .1; ctx.fillStyle = COL.numero; if (res.cu > 0) { const n0 = res.texto.slice(0, res.cu); ctx.fillText(n0, x, y); ctx.fillStyle = COL.unidad; ctx.fillText(res.texto.slice(res.cu), x + ctx.measureText(n0).width, y); } else ctx.fillText(res.texto, x, y); }          // la unidad del resultado en teal
        else if (res.kind === 'flecha') { ctx.font = tam + 'px ' + FUENTE; ctx.fillStyle = COL.aviso; ctx.fillText('→ ' + res.texto, x, y); }
        else { ctx.font = (tam * .75) + 'px ' + FUENTE; ctx.fillStyle = res.kind === 'err' ? COL.error : COL.aviso; ctx.fillText(res.texto, x, y); }
      }
      if (this.foco && (this.modo === 1 || this.modo === 2)) { ctx.font = '10.5px "Segoe UI", sans-serif'; ctx.fillStyle = this.modo === 1 ? '#7c3aed' : '#6b7280'; ctx.textAlign = 'right'; ctx.fillText(this.modo === 1 ? 'simbólica' : 'notación', W - 3, 11); ctx.textAlign = 'left'; }
      if (this.foco) this.dibujaCursor(ctx);
    }
    lugar() { return this.reg.find((s) => s.fila === this.cur.fila && s.i === this.cur.i) || this.reg[this.reg.length - 1]; }
    dibujaCursor(ctx) {
      const s = this.lugar(); if (!s) return;
      ctx.strokeStyle = COL.cursor; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(s.x + .5, s.y - s.a - 1); ctx.lineTo(s.x + .5, s.y + s.d + 1); ctx.stroke();
    }
    // ----- edición
    // ================================================================ edición: cursor, selección, portapapeles, deshacer
    // ----- utilidades de rutas y copias
    limpiaNodo(it) {
      const o = { t: it.t };
      if (it.t === 'c') { o.s = it.s; if (it.u) o.u = 1; if (it.un) o.un = 1; return o; }
      for (const k of ['s', 'p', 'o', 'corch']) if (it[k] !== undefined) o[k] = it[k];
      if (it.t === 'mat') { o.cells = it.cells.map((f) => f.map((c) => c.map((x) => this.limpiaNodo(x)))); return o; }
      for (const k of ['n', 'd', 'r', 'lo', 'hi', 'body', 'v', 'f']) if (it[k]) o[k] = it[k].map((x) => this.limpiaNodo(x));
      return o;
    }
    clona(items) { return items.map((x) => this.limpiaNodo(x)); }
    ruta(cur) {
      const pasos = []; let f = cur.fila;
      while (f._p) { const p = f._p; pasos.unshift({ i: p.fila.indexOf(p.it), k: hijosDe(p.it).indexOf(f) }); f = p.fila; }
      return { pasos, i: cur.i };
    }
    desdeRuta(rt) {
      let f = this.fila; for (const p of rt.pasos) { const it = f[p.i], hs = it ? hijosDe(it) : []; if (!hs[p.k]) break; f = hs[p.k]; }
      return { fila: f, i: Math.min(rt.i, f.length) };
    }
    // ----- deshacer / rehacer
    snap(tipo) {
      const ahora = Date.now();
      if (tipo === 'tec' && this._ultTipo === 'tec' && ahora - this._ultT < 1200) { this._ultT = ahora; return; }          // las teclas seguidas se deshacen juntas
      this._ultTipo = tipo; this._ultT = ahora;
      this.deshacer.push({ f: JSON.stringify(this.clona(this.fila)), rt: this.ruta(this.cur) }); if (this.deshacer.length > 300) this.deshacer.shift(); this.rehacer.length = 0;
    }
    restaura(s) {
      this.fila = JSON.parse(s.f); this.fila._p = null; this.ancla = null; this.sel = null; this._ultTipo = null;
      this.cur = { fila: this.fila, i: 0 }; this.cur = this.desdeRuta(s.rt); this.cambio();
    }
    undo() { if (!this.deshacer.length) return; this.rehacer.push({ f: JSON.stringify(this.clona(this.fila)), rt: this.ruta(this.cur) }); this.restaura(this.deshacer.pop()); }
    redo() { if (!this.rehacer.length) return; this.deshacer.push({ f: JSON.stringify(this.clona(this.fila)), rt: this.ruta(this.cur) }); this.restaura(this.rehacer.pop()); }
    // ----- selección: un rango de elementos dentro de UNA fila (si ancla y cursor están en filas distintas, sube a la fila común)
    cadena(fila) { const c = []; while (fila && fila._p) { c.push(fila._p); fila = fila._p.fila; } return c; }
    rango(A, B) {
      if (A.fila === B.fila) return { fila: A.fila, i0: Math.min(A.i, B.i), i1: Math.max(A.i, B.i) };
      const ca = this.cadena(A.fila), cb = this.cadena(B.fila), fa = [A.fila].concat(ca.map((p) => p.fila)), fb = [B.fila].concat(cb.map((p) => p.fila));
      const comun = fa.find((f) => fb.includes(f)) || this.fila;
      const lim = (P, fs, cd) => { if (P.fila === comun) return [P.i, P.i]; const k = fs.indexOf(comun), idx = comun.indexOf(cd[k - 1].it); return [idx, idx + 1]; };
      const pa = lim(A, fa, ca), pb = lim(B, fb, cb);
      return { fila: comun, i0: Math.min(pa[0], pb[0]), i1: Math.max(pa[1], pb[1]) };
    }
    actualizaSel() {
      if (this.ancla && !(this.ancla.fila === this.cur.fila && this.ancla.i === this.cur.i)) { const r = this.rango(this.ancla, this.cur); this.sel = r.i1 > r.i0 ? r : null; } else this.sel = null;
    }
    quitaSel() { this.ancla = null; this.sel = null; }
    borraSel() {
      if (!this.sel) return false; this.snap('sel'); const s = this.sel; s.fila.splice(s.i0, s.i1 - s.i0); this.cur = { fila: s.fila, i: s.i0 }; this.quitaSel(); return true;
    }
    seleccionaTodo() { this.ancla = { fila: this.fila, i: 0 }; this.cur = { fila: this.fila, i: this.fila.length }; this.actualizaSel(); this.dibuja(); }
    copiaSel() { if (!this.sel) return null; const it = this.sel.fila.slice(this.sel.i0, this.sel.i1); return { json: JSON.stringify(this.clona(it)), texto: HK.filasATexto(it) }; }
    pega(items) {
      if (!items || !items.length) return; this.borraSel(); this.snap('pega');
      const f = this.cur.fila; f.splice(this.cur.i, 0, ...items); this.cur.i += items.length; this.cambio();
    }
    // ----- teclas
    // texto de lo que hay a la izquierda del cursor en la fila de arriba (solo letras, dígitos y signos simples)
    palabraNodo() {          // «lim␣», «limite␣», «serie␣», «taylor␣»: la palabra suelta se vuelve el nodo (variable → punto → [orden] → cuerpo)
      const f = this.cur.fila; let fin = this.cur.i; if (fin !== f.length) return false;
      let ini = fin; while (ini > 0 && f[ini - 1].t === 'c' && !f[ini - 1].un && /^[a-z]$/.test(f[ini - 1].s)) ini--;
      const w = f.slice(ini, fin).map((x) => x.s).join('');
      if (!/^(lim|limite|serie|taylor)$/.test(w)) return false;
      if (ini > 0 && !(f[ini - 1].t === 'c' && '+−·=≔,<>≤≥⇒→⇔;:(|'.includes(f[ini - 1].s))) return false;
      this.snap('nodo'); this.quitaSel(); f.splice(ini, fin - ini); this.cur = { fila: f, i: ini };
      const it = { t: 'lim', serie: /^(serie|taylor)$/.test(w), v: [], p: [], n: [], body: [] }; this.inserta(it); this.entra(it.v); this.cambio(); return true;
    }
    enProgramaPrev(re) {
      if (this.cur.fila !== this.fila) return false;
      let t = ''; for (let j = 0; j < this.cur.i; j++) { const x = this.cur.fila[j]; if (x.t !== 'c') return false; t += x.s; }
      return re.test(t);
    }
    inserta(it) { this.cur.fila.splice(this.cur.i, 0, it); this.cur.i++; }
    entra(fila) { this.cur = { fila, i: fila.length }; }
    operando() {          // elementos antes del cursor que forman el operando de «/»
      const f = this.cur.fila; let j = this.cur.i;
      while (j > 0) {
        const it = f[j - 1];
        if (it.t === 'c') { if (/[A-Za-z0-9.Ͱ-Ͽ℀-⅏'∞]/.test(it.s)) j--; else break; }
        else j--;
      }
      return j;
    }
    tecla(e) {
      const k = e.key, sh = !!e.shiftKey;
      const altgr = e.altKey || (e.getModifierState && e.getModifierState('AltGraph'));          // AltGr = Ctrl+Alt en Windows: produce \ [ ] @ … en teclados latinos
      if ((e.ctrlKey || e.metaKey) && !altgr) {
        const kk = k.toLowerCase();
        if (kk === 'a') { this.seleccionaTodo(); return true; }
        if (kk === 'z' && !sh) { this.undo(); return true; }
        if (kk === 'y' || (kk === 'z' && sh)) { this.redo(); return true; }
        if (kk === 'c' || kk === 'x' || kk === 'v') return false;          // lo hacen los eventos copy / cut / paste del navegador
        if (k === 'ArrowUp') { this.snap('nodo'); const it = { t: 'sup', r: [] }; this.inserta(it); this.entra(it.r); this.cambio(); return true; }
        if (k === 'ArrowDown') { this.snap('nodo'); const it = { t: 'sub', r: [] }; this.inserta(it); this.entra(it.r); this.cambio(); return true; }
        if (k === 'ArrowLeft') { this.mueve(-1, sh, true); return true; }
        if (k === 'ArrowRight') { this.mueve(1, sh, true); return true; }
        if (kk === 'r') { this.snap('nodo'); const it = { t: 'sqrt', r: [] }; this.borraSel(); this.inserta(it); this.entra(it.r); this.cambio(); return true; }
        if (k === 'Backspace') { this.borraPalabra(-1); return true; }
        if (k === 'Delete') { this.borraPalabra(1); return true; }
        if (k === 'Home') { this.vaA(this.fila, 0, sh); return true; }
        if (k === 'End') { this.vaA(this.fila, this.fila.length, sh); return true; }
        return false;
      }
      { const pu = this.cur.fila[this.cur.i - 1];          // unidad abierta (tras «'»): las letras se acumulan en ella; cualquier otra tecla la cierra
        if (pu && pu.un && pu.ab) {
          if (k.length === 1 && /[A-Za-zµμΩ°%Å]/.test(k) && !this.sel) { this.snap('tec'); pu.s += (k === 'μ' ? 'µ' : k); this.cambio(); return true; }
          if (k === 'Backspace' && pu.s.length > 0 && !this.sel) { this.snap('tec'); pu.s = pu.s.slice(0, -1); this.cambio(); return true; }
          pu.ab = false;
        } }
      { const kc = k.length === 1 ? k : (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Tab'].includes(k) ? ' ' : null); if (kc !== null) this.cierraPalabra(kc); }          // cierra la palabra: u1 → u₁, alpha → α
      if (k === 'Escape') { this.quitaSel(); this.dibuja(); return true; }
      if (k === 'ArrowLeft') { this.mueve(-1, sh); return true; }
      if (k === 'ArrowRight') { this.mueve(1, sh); return true; }
      if (k === 'ArrowUp') { this.vertical(-1, sh); return true; }
      if (k === 'ArrowDown') { this.vertical(1, sh); return true; }
      if (k === 'Home') { this.vaA(this.fila, 0, sh); return true; }
      if (k === 'End') { this.vaA(this.fila, this.fila.length, sh); return true; }
      if (k === 'Backspace') { this.borra(-1); return true; }
      if (k === 'Delete') { this.borra(1); return true; }
      if (k === 'Enter' || k === 'Tab') return false;
      if (k === ' ' && this.enProgramaPrev(/^(for|while|if)$/)) { this.quitaSel(); this.inserta({ t: 'c', s: ' ' }); this.cambio(); return true; }          // «for j», «while x», «if a»: el espacio es un espacio
      if (k === ' ' && this.palabraNodo()) return true;
      if (k === ' ') { this.quitaSel(); this.sale(); return true; }
      if (k.length !== 1) return false;
      if (k === '=') {          // «∫ x² dx =»: el «=» no es parte de la variable de integración; sale de la integral y ejecuta (operador de resultado)
        const pv = this.cur.fila._p;
        if (pv && pv.it.t === 'bigop' && pv.it.s === '∫' && pv.it.v === this.cur.fila) { this.quitaSel(); this.sale(); }
      }
      if (k.length === 1 && !/[A-Za-z0-9_.]/.test(k)) {          // «pi» seguido de un separador se convierte en π (símbolo, como el WPF)
        const g0 = this.cur.fila, i0 = this.cur.i, a1 = g0[i0 - 1], a2 = g0[i0 - 2], a3 = g0[i0 - 3];
        if (a1 && a2 && a1.t === 'c' && a1.s === 'i' && a2.t === 'c' && a2.s === 'p' && !(a3 && a3.t === 'c' && /[A-Za-z0-9_]/.test(a3.s))) { g0.splice(i0 - 2, 2, { t: 'c', s: 'π' }); this.cur = { fila: g0, i: i0 - 1 }; }
      }
      const f = this.cur.fila;
      // con una selección: «(» «\» «/» la envuelven; cualquier otra tecla la reemplaza
      if (this.sel && (k === '(' || k === '\\' || k === '/')) {
        this.snap('nodo'); const s = this.sel, items = s.fila.splice(s.i0, s.i1 - s.i0); this.quitaSel(); const fl = s.fila;
        const it = k === '(' ? { t: 'paren', r: items } : k === '\\' ? { t: 'sqrt', r: items } : { t: 'frac', n: items, d: [] };
        fl.splice(s.i0, 0, it); this.cur = { fila: fl, i: s.i0 + 1 }; if (k === '/') this.entra(it.d); else this.cur = { fila: fl, i: s.i0 + 1 };
        this.cambio(); return true;
      }
      if (this.sel) this.borraSel();
      this.snap(/[0-9A-Za-z.,+\-=<>]/.test(k) ? 'tec' : 'nodo');
      const g = this.cur.fila, pa = g._p, enMat = pa && pa.it.t === 'mat' ? pa.it : null;
      const prevIt = g[this.cur.i - 1];
      const unario = !prevIt || (prevIt.t === 'c' && '+−·=≔,<>≤≥⇒→⇔;:(|'.includes(prevIt.s) && !(prevIt.s === ')'));
      const celda = () => { for (let i = 0; i < enMat.cells.length; i++) { const j = enMat.cells[i].indexOf(g); if (j >= 0) return [i, j]; } return [0, 0]; };
      switch (k) {
        case '/': {
          const j = this.operando(), num = g.splice(j, this.cur.i - j);
          const it = { t: 'frac', n: num, d: [] }; g.splice(j, 0, it); this.cur = { fila: g, i: j + 1 };
          this.entra(num.length ? it.d : it.n); break;
        }
        case '^': { const it = { t: 'sup', r: [] }; this.inserta(it); this.entra(it.r); break; }
        case '_': { const it = { t: 'sub', r: [] }; this.inserta(it); this.entra(it.r); break; }
        case '\\': { const it = { t: 'sqrt', r: [] }; this.inserta(it); this.entra(it.r); break; }
        case '(': { const it = { t: 'paren', r: [] }; this.inserta(it); this.entra(it.r); break; }
        case ')': { if (this.saleDe('paren')) break; const ant = this.cur.fila[this.cur.i - 1];
          if (!(ant && ant.t === 'paren')) this.inserta({ t: 'c', s: ')' }); break; }          // sin paréntesis abierto y justo después de uno ya cerrado (Espacio): el «)» de más no agrega otro suelto
        case '$': { const it = { t: 'bigop', s: '∫', lo: [], hi: [], body: [], v: [] }; this.inserta(it); this.entra(it.lo); break; }          // integral: límite inf. → sup. → cuerpo → variable
        case '#': { const it = { t: 'bigop', s: '∑', lo: [], hi: [], body: [] }; this.inserta(it); this.entra(it.lo); break; }          // sumatoria
        case '%': { const it = { t: 'bigop', s: '∏', lo: [], hi: [], body: [] }; this.inserta(it); this.entra(it.lo); break; }          // productoria
        case '?': case '!': {          // d/dx   ∂/∂x   (otra vez la tecla en la variable: sube el orden)
          if (pa && pa.it.t === 'deriv' && g === pa.it.v && g.length === 0) { pa.it.o++; break; }
          const it = { t: 'deriv', p: k === '!', o: 1, v: [], f: [] }; this.inserta(it); this.entra(it.v); break;
        }
        case '@': { const it = { t: 'mat', cells: [[[], []], [[], []]] }; this.inserta(it); this.entra(it.cells[0][0]); break; }          // matriz 2×2; «;» fila nueva, «|» columna nueva
        case '[': { if (unario) { const it = { t: 'mat', corch: true, cells: [[[]]] }; this.inserta(it); this.entra(it.cells[0][0]); } else this.inserta({ t: 'c', s: '[' }); break; }          // [a,b;c,d]: «,» columna, «;» fila, «]» cierra
        case ';': {
          if (!enMat) { this.inserta({ t: 'c', s: ';' }); break; }
          const [i, j] = celda(); if (i === enMat.cells.length - 1) enMat.cells.push(enMat.cells[0].map(() => [])); this.cur = { fila: enMat.cells[i + 1][enMat.corch ? 0 : j], i: 0 }; break;
        }
        case '|': {
          if (!enMat) { this.inserta({ t: 'c', s: '|' }); break; }
          const [i, j] = celda(); if (j === enMat.cells[0].length - 1) enMat.cells.forEach((r) => r.push([])); this.cur = { fila: enMat.cells[i][j + 1], i: 0 }; break;
        }
        case ',': {
          if (!(enMat && enMat.corch)) { this.inserta({ t: 'c', s: ',' }); break; }
          const [i, j] = celda(); if (j === enMat.cells[0].length - 1) enMat.cells.forEach((r) => r.push([])); this.cur = { fila: enMat.cells[i][j + 1], i: 0 }; break;
        }
        case ']': { if (enMat) { const p = pa; this.cur = { fila: p.fila, i: p.fila.indexOf(p.it) + 1 }; } else this.inserta({ t: 'c', s: ']' }); break; }
        case ':': this.inserta({ t: 'c', s: this.enProgramaPrev(/^(for|while)\b.*=/) ? ':' : '≔' }); break;          // en «for j=1:n» es el rango, no la definición          // definición (como Mathcad)
        case '=': {
          if (pa && pa.it.t === 'deriv' && pa.it.p && pa.it.o === 1 && g === pa.it.v && !g.length && !pa.it.f.length) {          // «!=» : la «!» recién escrita (∂ vacía) pasa a ser ≠
            const j = pa.fila.indexOf(pa.it); pa.fila.splice(j, 1, { t: 'c', s: '≠' }); this.cur = { fila: pa.fila, i: j + 1 }; break;
          }
          const pv =prevIt && prevIt.t === 'c' && !prevIt.u ? prevIt : null;
          if (pv && pv.s === '=') { pv.s = '=='; break; } if (pv && pv.s === '<') { pv.s = '≤'; break; } if (pv && pv.s === '>') { pv.s = '≥'; break; } if (pv && pv.s === '!') { pv.s = '≠'; break; }
          this.inserta({ t: 'c', s: '=' }); break;
        }
        case '>': {
          const pv = prevIt && prevIt.t === 'c' ? prevIt : null;
          if (pv && pv.s === '=') { pv.s = '⇒'; break; } if (pv && pv.s === '≤') { pv.s = '⇔'; break; } if (pv && pv.s === '−' && !pv.u) { pv.s = '→'; break; }          // =>  ⇒    <=>  ⇔    ->  →
          this.inserta({ t: 'c', s: '>' }); break;
        }
        case '*': this.inserta({ t: 'c', s: '·' }); break;
        case "'": this.inserta({ t: 'c', s: '', un: 1, ab: 1 }); break;          // «'» abre una unidad: 'kN · 'm · 'kN/'m
        case '-': this.inserta(unario ? { t: 'c', s: '−', u: true } : { t: 'c', s: '−' }); break;          // −1 (signo) sin espacios; a − b con espacios
        case '+': this.inserta(unario ? { t: 'c', s: '+', u: true } : { t: 'c', s: '+' }); break;
        default: this.inserta({ t: 'c', s: k });
      }
      this.cambio(); return true;
    }
    // «u1» → u₁ · «xprime» → x′ · «xsup2» → x² · «alpha» → α   (al cerrar la palabra, como en WPF)
    palabraAntes() {          // las letras justo antes del cursor (la palabra que se está escribiendo); «2x» no cuenta como palabra
      const f = this.cur.fila; let j = this.cur.i; while (j > 0 && f[j - 1].t === 'c' && !f[j - 1].un && /^[A-Za-z]$/.test(f[j - 1].s)) j--;
      if (j === this.cur.i) return null; const pv = f[j - 1]; if (pv && pv.t === 'c' && /[0-9.]/.test(pv.s)) return null;
      return { j, texto: f.slice(j, this.cur.i).map((x) => x.s).join('') };
    }
    aplicaSug(sg) {          // cambia la palabra escrita por la sugerencia: estructura (la tecla que la crea), símbolo (α), función (nombre + paréntesis) o variable
      const w = this.palabraAntes(); if (!w) return false; this.quitaSel(); this.snap('nodo');
      this.cur.fila.splice(w.j, this.cur.i - w.j); this.cur.i = w.j;
      const teclea = (k) => this.tecla({ key: k, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false });
      if (sg.t === 'estructura') { for (const k of sg.tecla) teclea(k === '~' ? ' ' : k); }          // «lim~» = lim y Espacio (crea el nodo)
      else if (sg.t === 'simbolo') this.inserta({ t: 'c', s: sg.sim });
      else { for (const c of sg.p) this.inserta({ t: 'c', s: c }); if (sg.t === 'funcion') teclea('('); }
      this.cambio(); return true;
    }
    cierraPalabra(k) {
      if (k.length === 1 && /[A-Za-z0-9._^Ͱ-Ͽ℀-⅏]/.test(k)) return;
      const f = this.cur.fila, ok = (x) => x && x.t === 'c' && !x.un && /[A-Za-z0-9]/.test(x.s); let j = this.cur.i;
      while (j > 0 && ok(f[j - 1])) j--; if (j === this.cur.i) return;
      const palabra = f.slice(j, this.cur.i).map((x) => x.s).join(''); if (!/^[A-Za-z]/.test(palabra)) return;
      const antes = f[j - 1]; if (antes && antes.t === 'c' && /[0-9.]/.test(antes.s)) return;
      const ch = (s) => Array.from(s).map((c) => ({ t: 'c', s: c })); let nuevo = null, m;
      if (GRIEGAS[palabra]) nuevo = [{ t: 'c', s: GRIEGAS[palabra] }];
      else if ((m = /^([A-Za-z])(\d+)([A-Za-z]{0,2})$/.exec(palabra))) nuevo = [{ t: 'c', s: m[1] }, { t: 'sub', r: ch(m[2] + m[3]) }];
      else if ((m = /^([A-Za-z]+)prime$/.exec(palabra))) nuevo = ch(m[1]).concat([{ t: 'c', s: '′' }]);
      else if ((m = /^([A-Za-z]+?)sup(\d+)$/.exec(palabra))) nuevo = ch(m[1]).concat([{ t: 'sup', r: ch(m[2]) }]);
      if (!nuevo) return; f.splice(j, this.cur.i - j, ...nuevo); this.cur.i = j + nuevo.length;
    }
    saleDe(tipo) {          // sube hasta el elemento de ese tipo y se pone después de él
      let fila = this.cur.fila;
      while (fila._p) { const p = fila._p; if (p.it.t === tipo) { this.cur = { fila: p.fila, i: p.fila.indexOf(p.it) + 1 }; return true; } fila = p.fila; }
      return false;
    }
    sale() {          // Espacio: pasa al siguiente hueco del elemento (numerador → denominador, límite inf. → sup. → cuerpo…) y al final sale
      const fila = this.cur.fila, p = fila._p; if (!p) return;
      const hs = hijosDe(p.it), k = hs.indexOf(fila);
      if (k >= 0 && k < hs.length - 1) this.cur = { fila: hs[k + 1], i: 0 }; else this.cur = { fila: p.fila, i: p.fila.indexOf(p.it) + 1 };
      this.dibuja();
    }
    vaA(fila, i, sh) {
      if (sh) { if (!this.ancla) this.ancla = { fila: this.cur.fila, i: this.cur.i }; } else this.quitaSel();
      this.cur = { fila, i }; if (sh) this.actualizaSel(); this.dibuja();
    }
    mueve(d, sh, palabra) {
      if (!sh && this.sel) { const s = this.sel; this.cur = { fila: s.fila, i: d < 0 ? s.i0 : s.i1 }; this.quitaSel(); this.dibuja(); return; }
      if (sh) { if (!this.ancla) this.ancla = { fila: this.cur.fila, i: this.cur.i }; } else this.quitaSel();
      let i = this.reg.findIndex((s) => s.fila === this.cur.fila && s.i === this.cur.i); if (i < 0) i = 0;
      const esPal = (s, dir) => { const it = dir > 0 ? s.fila[s.i] : s.fila[s.i - 1]; return it && it.t === 'c' && /[A-Za-z0-9.Ͱ-Ͽ]/.test(it.s); };
      let j = Math.max(0, Math.min(this.reg.length - 1, i + d));
      if (palabra) { while (j + d >= 0 && j + d < this.reg.length && esPal(this.reg[d > 0 ? j : j], d)) j += d; }
      if (j === i && !sh && this.alSalir) { this.alSalir(d); return; }          // borde de la ecuación: pasa a la anterior / siguiente
      const s = this.reg[j]; this.cur = { fila: s.fila, i: s.i }; if (sh) this.actualizaSel(); this.dibuja();
    }
    vertical(dir, sh) {
      const a = this.lugar(); if (!a) return;
      if (!sh) {          // dentro de una fracción: ↑ del denominador va al numerador, ↓ del numerador al denominador (en vez de la línea base)
        for (let f = this.cur.fila; f; f = f._p ? f._p.fila : null) {
          const p = f._p; if (!p || p.it.t !== 'frac' || f !== (dir < 0 ? p.it.d : p.it.n)) continue;
          const dest = dir < 0 ? p.it.n : p.it.d; let m = null;
          for (const s of this.reg) if (s.fila === dest && (!m || Math.abs(s.x - a.x) < Math.abs(m.x - a.x))) m = s;
          if (m) { this.quitaSel(); this.cur = { fila: m.fila, i: m.i }; this.dibuja(); return; }
        }
      }
      let mejor = null, mp = 1e9;
      for (const s of this.reg) {
        if (s.fila === a.fila) continue;
        const dy = (s.y - (s.a - s.d) / 2) - (a.y - (a.a - a.d) / 2);
        if (dir * dy <= 2) continue;
        const sc = Math.abs(dy) * 3 + Math.abs(s.x - a.x);
        if (sc < mp) { mp = sc; mejor = s; }
      }
      if (!mejor) { if (!sh && this.alSalir) this.alSalir(dir * 2); return; }
      if (sh) { if (!this.ancla) this.ancla = { fila: this.cur.fila, i: this.cur.i }; } else this.quitaSel();
      this.cur = { fila: mejor.fila, i: mejor.i }; if (sh) this.actualizaSel(); this.dibuja();
    }
    borraPalabra(d) {
      if (this.sel) { this.borra(d); return; }
      const f = this.cur.fila, ok = (it) => it && it.t === 'c' && /[A-Za-z0-9.Ͱ-Ͽ]/.test(it.s); this.snap('palabra');
      if (d < 0) { let i = this.cur.i; while (i > 0 && ok(f[i - 1])) i--; if (i === this.cur.i && i > 0) i--; f.splice(i, this.cur.i - i); this.cur.i = i; }
      else { let i = this.cur.i; while (i < f.length && ok(f[i])) i++; if (i === this.cur.i && i < f.length) i++; f.splice(this.cur.i, i - this.cur.i); }
      this.cambio();
    }
    borra(d) {
      if (this.borraSel()) { this.cambio(); return; }
      const f = this.cur.fila;
      if (d < 0) {
        if (this.cur.i > 0) {
          const it = f[this.cur.i - 1];
          const hijos = hijosDe(it);
          if (hijos.length && hijos.some((h) => h.length)) { const ult = hijos[hijos.length - 1]; this.cur = { fila: ult, i: ult.length }; this.dibuja(); return; }
          this.snap('borra'); f.splice(this.cur.i - 1, 1); this.cur.i--;
        } else if (f._p) {
          const p = f._p, todos = hijosDe(p.it);
          if (todos.every((h) => h.length === 0)) { this.snap('borra'); const k = p.fila.indexOf(p.it); p.fila.splice(k, 1); this.cur = { fila: p.fila, i: k }; }
          else this.cur = { fila: p.fila, i: p.fila.indexOf(p.it) };
        } else if (this.fila.length === 0 && this.alVaciar) { this.alVaciar(); return; }          // Retroceso en una ecuación vacía: se quita la ecuación
          else if (this.alUne && this.alUne()) return;          // Retroceso al inicio de una ecuación con contenido: se une con la anterior (como el WPF)
      } else if (this.cur.i < f.length) {
        const it = f[this.cur.i], hijos = it.t === 'frac' ? [it.n, it.d] : it.r ? [it.r] : [];
        if (hijos.length && hijos.some((h) => h.length)) { this.cur = { fila: hijos[0], i: 0 }; this.dibuja(); return; }
        this.snap('borra'); f.splice(this.cur.i, 1);
      }
      this.cambio();
    }
    // ----- ratón: clic, arrastre para seleccionar, doble clic
    puntoMasCercano(px, py) {
      let mejor = null, md = 1e9;
      for (const s of this.reg) { const cy = s.y - (s.a - s.d) / 2, dd = Math.abs(s.x - px) + 2 * Math.abs(cy - py); if (dd < md) { md = dd; mejor = s; } }
      return mejor;
    }
    clic(px, py, sh) {
      const m = this.puntoMasCercano(px, py); if (!m) return;
      if (sh) { if (!this.ancla) this.ancla = { fila: this.cur.fila, i: this.cur.i }; this.cur = { fila: m.fila, i: m.i }; this.actualizaSel(); }
      else { this.cur = { fila: m.fila, i: m.i }; this.ancla = { fila: m.fila, i: m.i }; this.sel = null; }
    }
    arrastra(px, py) { const m = this.puntoMasCercano(px, py); if (!m || !this.ancla) return; this.cur = { fila: m.fila, i: m.i }; this.actualizaSel(); this.dibuja(); }
    dobleClic(px, py) {          // palabra bajo el cursor (o toda la fila si no hay)
      const m = this.puntoMasCercano(px, py); if (!m) return; const f = m.fila, ok = (it) => it && it.t === 'c' && /[A-Za-z0-9.Ͱ-Ͽ]/.test(it.s);
      let a = m.i, b = m.i; while (a > 0 && ok(f[a - 1])) a--; while (b < f.length && ok(f[b])) b++;
      if (a === b) { a = 0; b = f.length; }
      this.ancla = { fila: f, i: a }; this.cur = { fila: f, i: b }; this.actualizaSel(); this.dibuja();
    }
  }
  HK.hijosDe = hijosDe;
  HK.Editor = Editor; HK.COL = COL; HK.FUENTE = FUENTE;
})(window);
