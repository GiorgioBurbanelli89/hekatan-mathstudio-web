// Hekatan Math Studio Web — la hoja: regiones de texto, ecuaciones (nodos) y deslizadores; abrir y guardar .hmath
(function (G) {
  const HK = G.HK;
  const hoja = document.getElementById('hoja');
  const reg = [];          // {t:'eq'|'txt'|'slider', ...}
  let activo = null, ultimaFila = null;

  function ptr(e, cv) { const b = cv.getBoundingClientRect(), k = b.width ? cv.offsetWidth / b.width : 1; return { x: (e.clientX - b.left) * k, y: (e.clientY - b.top) * k }; }
  function fila() { const d = document.createElement('div'); d.className = 'fila'; hoja.appendChild(d); return d; }
  function contenedor(mismaLinea) {
    if (mismaLinea && ultimaFila) return ultimaFila;
    ultimaFila = fila(); return ultimaFila;
  }
  function agregaTxt(texto, titulo, nivel, mismo) {
    const c = contenedor(!!mismo), d = document.createElement('div');
    d.className = 'txt' + (titulo ? ' titulo n' + (nivel || 1) : '') + (mismo ? ' lado' : ''); d.contentEditable = 'true'; d.textContent = texto; d.spellcheck = false;
    d.addEventListener('focus', () => { activo = null; redibuja(); });
    c.appendChild(d); const r = { t: 'txt', el: d, titulo: !!titulo, nivel: nivel || 1, mismo: !!mismo }; reg.push(r); return r;
  }
  // ---------------------------------------------------------------- ecuaciones DENTRO de un párrafo (como el WPF: texto + fórmulas en la misma línea, todo editable)
  let rangoTxt = null;          // último cursor dentro de un texto: { el, range }
  document.addEventListener('selectionchange', () => { const s = getSelection(); if (!s.rangeCount || !s.anchorNode) return; const n = s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode, el = n && n.closest ? n.closest('.txt') : null; if (el && el.isContentEditable) rangoTxt = { el, range: s.getRangeAt(0).cloneRange() }; });
  document.addEventListener('mousedown', (e) => { if (!e.target.closest || e.target.closest('.txt') || e.target.closest('#cinta') || e.target.closest('.menu')) return; rangoTxt = null; }, true);
  function agregaEqEnTexto(el, codigo, modo, rango) {
    const sp = document.createElement('span'); sp.className = 'ifx'; sp.contentEditable = 'false';
    if (rango && el.contains(rango.startContainer)) { rango.deleteContents(); rango.insertNode(sp); } else el.appendChild(sp);
    const r = agregaEq(codigo || '', { grupo: sp, modo: modo || 0 }); r.enTexto = true; r.spanTxt = sp; r.txtEl = el;
    r.ed.alSalir = (d) => { activo = null; redibuja(); el.focus(); const rg = document.createRange(); if (d > 0) rg.setStartAfter(sp); else rg.setStartBefore(sp); rg.collapse(true); const g = getSelection(); g.removeAllRanges(); g.addRange(rg); };          // flecha al borde de la fórmula: el cursor vuelve al texto
    r.ed.alVaciar = () => { sp.remove(); const i = reg.indexOf(r); if (i >= 0) reg.splice(i, 1); activo = null; el.focus(); resolver(); };
    return r;
  }
  function eqEnTexto(modo) {          // botones «Fórmula / Simbólica / Numérica en texto»: dentro del párrafo donde está el cursor; si no hay, una ecuación suelta
    if (rangoTxt && document.body.contains(rangoTxt.el)) {
      const r = agregaEqEnTexto(rangoTxt.el, '', modo, rangoTxt.range); rangoTxt = null; activo = r.ed; r.ed.cargar([]);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); resolver(); redibuja(); return r;
    }
    return nuevaEq('', false, modo);
  }
  let multi = null;          // selección que cruza varias ecuaciones de la misma fila: { eds: [...] } (cada una guarda su propia selección)
  function limpiaMulti() { if (multi) { multi.eds.forEach((e) => e.quitaSel()); multi = null; } }
  function edsDeFila(cv) { const f = cv.closest('.fila'); return reg.filter((r) => r.t === 'eq' && !r.enTexto && f && f.contains(r.el)).sort((a, b) => a.ed.canvas.getBoundingClientRect().left - b.ed.canvas.getBoundingClientRect().left).map((r) => r.ed); }
  function agregaEq(codigo, o) {
    o = o || {};
    const c = o.grupo || contenedor(o.mismaLinea), d = document.createElement('div'); d.className = 'eq' + (o.oculto ? ' oculto' : ''); const cv = document.createElement('canvas'); d.appendChild(cv); c.appendChild(d);
    const ed = new HK.Editor(cv, { tam: 14 }); ed.alCambiar = () => { r.editado = true; resolver(); };
    const r = { t: 'eq', ed, el: d, modo: o.modo || 0, codigo, editado: false, mismaLinea: !!o.mismaLinea, oculto: !!o.oculto };
    ed.cargar(codigo ? HK.codigoAFilas(codigo) : []);
    cv.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (HK.sug) HK.sug.oculta(); const q = ptr(e, cv); activo = ed; ed.clic(q.x, q.y, e.shiftKey); redibuja(); e.preventDefault();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      limpiaMulti(); let cur = ed; const ancEd = ed, ancla0 = ed.ancla ? { fila: ed.ancla.fila, i: ed.ancla.i } : null;          // arrastrar de una ecuación a la vecina de la MISMA línea selecciona de una a otra (como el WPF); el cursor sigue al ratón
      const mueve = (ev) => {
        const o = eqEnFila(cv, ev.clientX), dest = o ? o.ed : ancEd;
        if (dest === ancEd) { if (multi) { limpiaMulti(); ancEd.ancla = ancla0; } cur = ancEd; activo = ancEd; const q1 = ptr(ev, ancEd.canvas); ancEd.arrastra(q1.x, q1.y); return; }
        const lista = edsDeFila(cv), ia = lista.indexOf(ancEd), id = lista.indexOf(dest); if (ia < 0 || id < 0) return; const dir = id > ia ? 1 : -1;
        lista.forEach((e2, k) => {
          const dentro = k >= Math.min(ia, id) && k <= Math.max(ia, id);
          if (!dentro) { e2.quitaSel(); return; }
          if (e2 === ancEd) { e2.ancla = ancla0; e2.cur = { fila: e2.fila, i: dir > 0 ? e2.fila.length : 0 }; e2.actualizaSel(); }
          else if (e2 === dest) { e2.ancla = { fila: e2.fila, i: dir > 0 ? 0 : e2.fila.length }; const q2 = ptr(ev, e2.canvas); e2.arrastra(Math.max(0, Math.min(q2.x, e2.canvas.offsetWidth)), Math.max(0, Math.min(q2.y, e2.canvas.offsetHeight))); }
          else { e2.ancla = { fila: e2.fila, i: 0 }; e2.cur = { fila: e2.fila, i: e2.fila.length }; e2.actualizaSel(); }
        });
        multi = { eds: lista.slice(Math.min(ia, id), Math.max(ia, id) + 1) }; cur = dest; activo = dest; redibuja();
      };
      const suelta = () => { document.removeEventListener('mousemove', mueve); document.removeEventListener('mouseup', suelta); };
      document.addEventListener('mousemove', mueve); document.addEventListener('mouseup', suelta);
    });
    cv.addEventListener('dblclick', (e) => { const q = ptr(e, cv); activo = ed; ed.dobleClic(q.x, q.y); redibuja(); });
    ed.alSalir = (d) => salta(r, d);
    ed.alVaciar = () => quita(r);
    reg.push(r); return r;
  }
  function agregaSlider(nombre, min, max, valor, inc) {
    const c = contenedor(false), d = document.createElement('div'); d.className = 'slider';
    d.innerHTML = '<span class="nom"></span><button>▶</button><input type="range"><span class="val"></span>';
    const nom = d.children[0], bt = d.children[1], rg = d.children[2], vl = d.children[3];
    nom.textContent = nombre; rg.min = min; rg.max = max; rg.step = inc || (max - min) / 100; rg.value = valor; vl.textContent = valor;
    const r = { t: 'slider', nombre, min, max, valor, inc: inc || (max - min) / 100, el: d };
    rg.addEventListener('input', () => { r.valor = parseFloat(rg.value); vl.textContent = HK.fmt(r.valor); resolver(); });
    let tm = null;
    bt.addEventListener('click', () => {
      if (tm) { clearInterval(tm); tm = null; bt.textContent = '▶'; return; }
      bt.textContent = '⏸'; let dir = 1;
      tm = setInterval(() => {
        let v = parseFloat(rg.value) + dir * parseFloat(rg.step) * 2; if (v > max) { v = max; dir = -1; } if (v < min) { v = min; dir = 1; }
        rg.value = v; r.valor = parseFloat(rg.value); vl.textContent = HK.fmt(r.valor); resolver();
      }, 60);
    });
    c.appendChild(d); reg.push(r); return r;
  }
  // bloque CAD: código AutoLISP del motor (linea, rect, circulo…) arriba, el dibujo (SVG) abajo; se baja como .lsp (AutoCAD) o DXF
  function agregaRaw(texto, oculto) {          // bloque de Hekatan LISP guardado TAL CUAL (directivas que los nodos no dibujan): se edita como texto
    const c = contenedor(false), d = document.createElement('div'); d.className = 'raw' + (oculto ? ' oculto' : '');
    d.innerHTML = '<div class="raw-bar"><b>Bloque Hekatan LISP</b><span>se dibuja con el motor de Hekatan LISP (WPF o Hekatan LISP web); aquí se conserva y se guarda igual</span></div>';
    const ta = document.createElement('textarea'); ta.spellcheck = false; ta.value = texto; ta.rows = Math.min(14, Math.max(2, texto.split('\n').length)); d.appendChild(ta); c.appendChild(d);
    const r = { t: 'raw', el: d, ta, oculto: !!oculto }; reg.push(r); return r;
  }
  const CAD_CAB = ';; Dibujo AutoLISP (Hekatan Math Studio): cada línea agrega una entidad; abajo se dibuja.';
  function agregaCad(codigo, titulo) {
    const c = contenedor(false), d = document.createElement('div'); d.className = 'cad';
    d.innerHTML = '<div class="cad-bar"><b class="cad-tit"></b><span class="cad-msg"></span><button data-a="hcad" title="Editar este dibujo en Hekatan CAD (con el ratón)">✏ Hekatan CAD</button><button data-a="cod" title="Mostrar / ocultar el código">‹›</button><button data-a="lsp" title="Bajar como AutoLISP (.lsp) para AutoCAD">.lsp</button><button data-a="dxf" title="Bajar como DXF">DXF</button></div><textarea spellcheck="false"></textarea><div class="cad-vista"></div><div class="cad-pie">Guardar dibujo como <button data-a="dwg" title="Guardar como DWG (AutoCAD 2018), igual que el WPF">DWG</button></div>';
    d.querySelector('.cad-tit').textContent = titulo || 'CAD · AutoLISP';
    const ta = d.querySelector('textarea'), vista = d.querySelector('.cad-vista'), msg = d.querySelector('.cad-msg');
    const r = { t: 'cad', el: d, ta, ents: [], titulo: titulo || '' };
    ta.value = codigo; ta.style.display = 'none';          // como el WPF: se ve el dibujo; el código se muestra con el botón ‹›
    r.dibuja = () => {
      ta.rows = Math.max(3, Math.min(14, ta.value.split('\n').length + 1));
      const o = HK.cad.ejecuta(ta.value); if (!o.error) r.ents = o.ents;
      let esc = ''; if (!o.error) { let x0 = Infinity, x1 = -Infinity; for (const e of r.ents) for (const g of e) if ((g.c === 10 || g.c === 11) && g.r && isFinite(+g.r[0])) { x0 = Math.min(x0, +g.r[0]); x1 = Math.max(x1, +g.r[0]); } if (x1 > x0) { const N = [10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000].reduce((p, q) => Math.abs(q - (x1 - x0) * 1000 / (300 * 0.2646)) < Math.abs(p - (x1 - x0) * 1000 / (300 * 0.2646)) ? q : p); esc = ' · Esc. 1:' + N + ' · geometría en m'; } }
      msg.textContent = o.error ? '⚠ ' + o.error : r.ents.length + (r.ents.length === 1 ? ' entidad' : ' entidades') + esc; msg.classList.toggle('mal', !!o.error);
      if (!o.error) vista.innerHTML = HK.cad.aSvg(r.ents, 440);
      if (o.cargando) setTimeout(r.dibuja, 400);
    };
    // cotas editables como en Hekatan CAD: doble clic en el número = nueva medida; arrastrar las manijas azules = mover los puntos medidos o la línea de cota
    const aplica = (k, ch) => { const n = HK.cad.editaCota(ta.value, k, ch); if (n == null) { msg.textContent = '⚠ esa cota usa expresiones: edítala en el código ‹›'; return false; } ta.value = n; r.dibuja(); return true; };
    const num2 = (s) => s.split(',').map(Number);
    vista.addEventListener('dblclick', (e) => {
      const t = e.target.closest && e.target.closest('.cota-t'); if (!t) return;
      const g = t.closest('.hk-cota'), k = +g.dataset.k, A = num2(g.dataset.a), B = num2(g.dataset.b), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const rc = t.getBoundingClientRect(), vr = vista.getBoundingClientRect(), inp = document.createElement('input');
      inp.value = String(+L.toFixed(4)); inp.className = 'cota-inp'; inp.style.left = (rc.left - vr.left + rc.width / 2 - 34) + 'px'; inp.style.top = (rc.top - vr.top - 4) + 'px';
      vista.style.position = 'relative'; vista.appendChild(inp); inp.focus(); inp.select();
      let hecho = false; const fin = (ok) => { if (hecho) return; hecho = true; const v = parseFloat(inp.value.replace(',', '.')); inp.remove(); if (ok && isFinite(v) && v > 0) aplica(k, { medida: v }); };
      inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); });
      inp.addEventListener('blur', () => fin(true));
    });
    vista.addEventListener('mousedown', (e) => {
      const h = e.target.closest && e.target.closest('.h'); if (!h) return; e.preventDefault();
      const g = h.closest('.hk-cota'), k = +g.dataset.k, p = h.dataset.p, A = num2(g.dataset.a), B = num2(g.dataset.b), s0 = +g.dataset.s;
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L;
      const mundo = (ev) => {          // píxel → coordenada del dibujo (inversa de aSvg)
        const sv = vista.querySelector('svg'), [x0, y0, s, alto, M] = sv.dataset.g.split(',').map(Number), rc = sv.getBoundingClientRect(), f = rc.width / +sv.getAttribute('width');
        return [x0 + ((ev.clientX - rc.left) / f - M) / s, y0 + (alto - M - (ev.clientY - rc.top) / f) / s];
      };
      let sepCod = null;          // :sep del código al empezar el arrastre (relación fija con la distancia real)
      { const re = /\(cota\b/g; let m, n = 0; while ((m = re.exec(ta.value))) { if (n++ === k) { const mm = /:sep\s+(-?\d+(?:\.\d+)?)/.exec(ta.value.slice(m.index)); if (mm) sepCod = +mm[1]; break; } } }
      const q = (v) => Math.round(v * 100) / 100;          // se pega a 1 cm del dibujo
      const mueve = (ev) => {
        const w = mundo(ev);
        if (p === 's') { const sn = (w[0] - A[0]) * nx + (w[1] - A[1]) * ny; aplica(k, { sep: q(sepCod != null && Math.abs(s0) > 1e-9 ? sepCod * sn / s0 : sn) }); }
        else aplica(k, { [p]: [q(w[0]), q(w[1])] });
      };
      const suelta = () => { document.removeEventListener('mousemove', mueve); document.removeEventListener('mouseup', suelta); };
      document.addEventListener('mousemove', mueve); document.addEventListener('mouseup', suelta);
    });
    ta.addEventListener('input', () => { clearTimeout(r.tm); r.tm = setTimeout(r.dibuja, 200); if (HK.sug) HK.sug.enTextarea(ta); });
    ta.addEventListener('keydown', (e) => { if (HK.sug && HK.sug.tecla(e)) { e.preventDefault(); e.stopPropagation(); } });
    ta.addEventListener('blur', () => { if (HK.sug) setTimeout(HK.sug.oculta, 150); });
    ta.addEventListener('focus', () => { activo = null; redibuja(); });
    d.addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a; if (!a) return;
      if (a === 'hcad') HK.cadEditor.abre(r);
      else if (a === 'cod') ta.style.display = ta.style.display === 'none' ? '' : 'none';
      else if (a === 'lsp') HK.cad.baja('dibujo.lsp', HK.cad.aLsp(r.ents, 'dibujo'), 'text/plain');
      else if (a === 'dwg') HK.cad.bajaDwg(r.ents).then((n) => { const m = d.querySelector('.cad-msg'); if (m) m.textContent = 'DWG guardado (' + n + ' bytes)'; }).catch((x) => { const m = d.querySelector('.cad-msg'); if (m) m.textContent = 'DWG: ' + x.message; });
      else HK.cad.baja('dibujo.dxf', HK.cad.aDxf(r.ents), 'application/dxf');
    });
    c.appendChild(d); reg.push(r); r.dibuja(); return r;
  }
  function limpia() { hoja.innerHTML = ''; reg.length = 0; activo = null; ultimaFila = null; }

  // ---------------------------------------------------------------- gráficas: fplot(f1, f2, …, [a,b])  (la expresión escrita directamente, como en Hekatan LISP)
  const PAL = ['#3a62d9', '#f2792f', '#2e9e4f', '#c13c6b', '#7b57c9', '#1b9aaa'];
  function fplot(args, env) {
    let lo = -1, hi = 1; args = args.slice();
    const num = (a) => HK.evalua(a, env);
    const ult = args[args.length - 1];
    if (ult && ult.t === 'vec' && ult.items.length === 2) { lo = num(ult.items[0]); hi = num(ult.items[1]); args.pop(); }
    else if (args.length >= 3) { hi = num(args.pop()); lo = num(args.pop()); }
    const n = 200, xs = Array.from({ length: n + 1 }, (_, i) => lo + (hi - lo) * i / n), ys = [], nombres = [];
    args.forEach((a, k) => {
      let ex = a, nom = 'f' + (k + 1);
      if (a.t === 'bin' && a.op === '==') { ex = a.b; }
      ys.push(xs.map((x) => { try { return HK.evalua(ex, { v: Object.assign({}, env.v, { x }), f: env.f, l: env.l }); } catch (e) { if (/^indef:x?$/.test(e.message) === false && k === 0 && x === lo) throw e; return NaN; } }));
      nombres.push(nom);
    });
    return { xs, ys, nombres };
  }
  // fmapa(f(x,y), [x0,x1], [y0,y1])  y  fsuperficie(f(x,y), [x0,x1], [y0,y1], az, el)
  function malla2(args, env) {
    const num = (a) => HK.evalua(a, env); let rg = args.filter((a) => a.t === 'vec' && a.items.length === 2).map((a) => [num(a.items[0]), num(a.items[1])]), extra;
    if (rg.length >= 2) extra = args.slice(1).filter((a) => !(a.t === 'vec')).map(num);
    else if (args.length >= 5) { const v = args.slice(1).map(num); rg = [[v[0], v[1]], [v[2], v[3]]]; extra = v.slice(4); }          // fsuperficie(f, x0, x1, y0, y1, az, el)  como en WPF
    else throw new Error('fmapa(f(x,y), [x0,x1], [y0,y1])   o   fmapa(f(x,y), x0, x1, y0, y1)');
    const n = 32, f = args[0], z = [];
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i <= n; i++) { z.push([]); for (let j = 0; j <= n; j++) { const x = rg[0][0] + (rg[0][1] - rg[0][0]) * i / n, y = rg[1][0] + (rg[1][1] - rg[1][0]) * j / n; let v; try { v = num2(f, env, x, y); } catch (e) { v = NaN; } z[i].push(v); if (isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } } }
    if (!isFinite(mn)) throw new Error('la función no se pudo evaluar en el dominio'); if (mx - mn < 1e-12) mx = mn + 1;
    return { z, n, rg, mn, mx, az: extra.length ? extra[0] : -32, el: extra.length > 1 ? extra[1] : 38 };
  }
  function soloIntegral(e) {          // ¿las únicas funciones simbólicas del árbol son integral(f, v, a, b)?
    let ok = true;
    (function rec(n) { if (!ok || !n || typeof n !== 'object') return; if (n.t === 'call' && HK.SIMBOLICAS.has(n.f) && !(n.f === 'integral' && n.args.length === 4)) { ok = false; return; } for (const k in n) rec(n[k]); })(e);
    return ok;
  }
  function mapaMatriz(args, env) {
    const M = HK.evalua(args[0], env); if (!HK.M.esM(M) || M.r < 2 || M.c < 2) throw new Error('mapa(M [, a, b]): M debe ser una matriz de al menos 2×2');
    const a = args.length === 3 ? HK.evalua(args[1], env) : M.r - 1, b = args.length === 3 ? HK.evalua(args[2], env) : M.c - 1, n = 32, z = []; let mn = Infinity, mx = -Infinity;
    const g = (u, v) => { const i = Math.min(M.r - 2, Math.floor(u)), j = Math.min(M.c - 2, Math.floor(v)), p = u - i, q = v - j; return M.g(i, j) * (1 - p) * (1 - q) + M.g(i + 1, j) * p * (1 - q) + M.g(i, j + 1) * (1 - p) * q + M.g(i + 1, j + 1) * p * q; };
    for (let i = 0; i <= n; i++) { z.push([]); for (let j = 0; j <= n; j++) { const v = g((M.r - 1) * i / n, (M.c - 1) * j / n); z[i].push(v); if (isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } } }
    { let am = -Infinity, ai = 0, aj = 0; for (let i = 0; i < M.r; i++) for (let j = 0; j < M.c; j++) if (M.g(i, j) > am) { am = M.g(i, j); ai = i; aj = j; } mn = Math.min(mn, ...M.a); mx = Math.max(mx, am); var maxPos = [ai / (M.r - 1), aj / (M.c - 1)]; }
    if (mx - mn < 1e-12) mx = mn + 1; return { z, n, rg: [[0, a], [0, b]], mn, mx, az: -37, el: 30, maxPos };
  }
  function num2(f, env, x, y) { return HK.evalua(f, { v: Object.assign({}, env.v, { x, y }), f: env.f, l: env.l }); }
  function jet(t) { t = Math.max(0, Math.min(1, t)); const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 3))), g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 2))), b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 1))); return [r, g, b].map((q) => Math.round(255 * q)); }
  function paso(rango, n) { const b = rango / n, e = Math.pow(10, Math.floor(Math.log10(b))), f = b / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; }          // paso «redondo» 1·2·5 ×10ⁿ
  const marcaTxt = (v) => HK.fmt(parseFloat(v.toPrecision(6)));
  function dibujaMalla(r) {
    const g = r.graf, cv = r.gel, dpr = window.devicePixelRatio || 1, W = Math.min(r.el.clientWidth - 8, 460), H = 300;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.style.margin = '4px 0 6px 6px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    const d = g.d, n = d.n, col = (v) => { const q = jet(1 - (v - d.mn) / (d.mx - d.mn)); return 'rgb(' + q.join(',') + ')'; };
    if (g.tipo === 'mapa') {
      const Lm = 44, T = 12, lado = Math.min(W - Lm - 78, H - T - 30), w = lado, h = lado, N = 96; r.hv = { k: 'mapa', Lm, T, w, h, d, n };          // el mapa es cuadrado y se interpola (suave) como en el WPF
      const zz = (u, v) => { const x = u * n, y = v * n, i = Math.min(n - 1, Math.floor(x)), j = Math.min(n - 1, Math.floor(y)), p = x - i, q = y - j; return d.z[i][j] * (1 - p) * (1 - q) + d.z[i + 1][j] * p * (1 - q) + d.z[i][j + 1] * (1 - p) * q + d.z[i + 1][j + 1] * p * q; };
      const cw = w / N; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { c.fillStyle = col(zz((i + .5) / N, (j + .5) / N)); c.fillRect(Lm + i * cw, T + h - (j + 1) * cw, cw + .6, cw + .6); }
      const nivel = paso(d.mx - d.mn, 8); c.strokeStyle = '#0006'; c.lineWidth = .8;          // curvas de nivel
      for (let lv = Math.ceil(d.mn / nivel + 1e-9) * nivel; lv < d.mx - 1e-9; lv += nivel) { c.beginPath(); for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = zz(i / N, j / N), b = zz((i + 1) / N, j / N), e = zz(i / N, (j + 1) / N), X0 = Lm + i * cw, Y0 = T + h - j * cw; if ((a - lv) * (b - lv) < 0) { const t = (lv - a) / (b - a); c.moveTo(X0 + t * cw, Y0); c.lineTo(X0 + t * cw, Y0 - cw * .5); } if ((a - lv) * (e - lv) < 0) { const t = (lv - a) / (e - a); c.moveTo(X0, Y0 - t * cw); c.lineTo(X0 + cw * .5, Y0 - t * cw); } } c.stroke(); }
      let bi = 0, bj = 0, bm = -Infinity; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) if (d.z[i][j] > bm) { bm = d.z[i][j]; bi = i; bj = j; }
      { const mp = d.maxPos || [bi / n, bj / n], mx0 = Lm + mp[0] * w, my0 = T + h - mp[1] * h; if (d.maxPos) bm = d.mx; c.strokeStyle = '#000'; c.lineWidth = 1.2; c.beginPath(); c.arc(mx0, my0, 5, 0, 7); c.stroke(); c.beginPath(); c.arc(mx0, my0, 2, 0, 7); c.stroke(); c.fillStyle = '#fffd'; c.fillRect(mx0 + 8, my0 - 8, 44, 15); c.fillStyle = '#000'; c.font = '11px sans-serif'; c.textAlign = 'left'; c.fillText('máx ' + marcaTxt(bm), mx0 + 11, my0 + 3); }
      c.strokeStyle = '#222'; c.lineWidth = 1; c.strokeRect(Lm, T, w, h); c.fillStyle = '#444'; c.font = '11px sans-serif'; c.textAlign = 'center';
      for (let k = 0; k <= 2; k++) { c.fillText(marcaTxt(d.rg[0][0] + (d.rg[0][1] - d.rg[0][0]) * k / 2), Lm + w * k / 2, T + h + 14); c.textAlign = 'right'; c.fillText(marcaTxt(d.rg[1][0] + (d.rg[1][1] - d.rg[1][0]) * k / 2), Lm - 4, T + h - h * k / 2 + 4); c.textAlign = 'center'; }
      const bx = Lm + w + 22; for (let i = 0; i < 80; i++) { c.fillStyle = col(d.mn + (d.mx - d.mn) * (1 - i / 79)); c.fillRect(bx, T + i * h / 80, 14, h / 80 + 1); }
      c.strokeStyle = '#222'; c.strokeRect(bx, T, 14, h); const pc = paso(d.mx - d.mn, 5); c.fillStyle = '#444'; c.textAlign = 'left';
      for (let v = Math.ceil(d.mn / pc - 1e-9) * pc; v <= d.mx + 1e-9; v += pc) { const yy = T + h - (v - d.mn) / (d.mx - d.mn) * h; c.beginPath(); c.moveTo(bx + 14, yy); c.lineTo(bx + 18, yy); c.stroke(); c.fillText(marcaTxt(v), bx + 21, yy + 4); }
    } else {
      const ob = r.orb || (r.orb = { az: 0, el: 0, z: 1 }); const az = (d.az + ob.az) * Math.PI / 180, el = Math.max(-89, Math.min(89, d.el + ob.el)) * Math.PI / 180, pts = [], sx = W * .44, sy = H * .50, esc = Math.min(W, H) * .21 * ob.z;
      const P = (i, j) => { const x = (i / n - .5) * 2, y = (j / n - .5) * 2, z = ((d.z[i][j] - d.mn) / (d.mx - d.mn) - .5) * 1.1; const x1 = x * Math.cos(az) - y * Math.sin(az), y1 = x * Math.sin(az) + y * Math.cos(az); return { X: sx + x1 * esc, Y: sy - (y1 * Math.sin(el) + z * Math.cos(el) * 1.3) * esc, D: y1 * Math.cos(el) }; };
      r.hv = { k: 'sup', P, n, d }; const quads = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const a = P(i, j), b = P(i + 1, j), c2 = P(i + 1, j + 1), d2 = P(i, j + 1); quads.push({ p: [a, b, c2, d2], D: (a.D + b.D + c2.D + d2.D) / 4, v: (d.z[i][j] + d.z[i + 1][j] + d.z[i + 1][j + 1] + d.z[i][j + 1]) / 4 }); }
      quads.sort((p, q) => q.D - p.D); c.lineWidth = .4;
      quads.forEach((q) => { c.beginPath(); c.moveTo(q.p[0].X, q.p[0].Y); for (let k = 1; k < 4; k++) c.lineTo(q.p[k].X, q.p[k].Y); c.closePath(); c.fillStyle = col(q.v); c.fill(); c.strokeStyle = '#0003'; c.stroke(); });
      { const bx = W - 38, T0 = 20, hh = H * .55, pc = paso(d.mx - d.mn, 5); for (let i = 0; i < 70; i++) { c.fillStyle = col(d.mn + (d.mx - d.mn) * (1 - i / 69)); c.fillRect(bx, T0 + i * hh / 70, 12, hh / 70 + 1); }          // barra de color con marcas redondas
        c.strokeStyle = '#222'; c.lineWidth = 1; c.strokeRect(bx, T0, 12, hh); c.fillStyle = '#444'; c.font = '10px sans-serif'; c.textAlign = 'right';
        for (let v = Math.ceil(d.mn / pc - 1e-9) * pc; v <= d.mx + 1e-9; v += pc) { const yy = T0 + hh - (v - d.mn) / (d.mx - d.mn) * hh; c.beginPath(); c.moveTo(bx - 3, yy); c.lineTo(bx, yy); c.stroke(); c.fillText(marcaTxt(v), bx - 5, yy + 3); } }
      c.fillStyle = '#444'; c.font = '11px sans-serif'; c.textAlign = 'left'; c.fillText('x de ' + HK.fmt(d.rg[0][0]) + ' a ' + HK.fmt(d.rg[0][1]) + ', y de ' + HK.fmt(d.rg[1][0]) + ' a ' + HK.fmt(d.rg[1][1]) + ', z de ' + HK.fmt(d.mn) + ' a ' + HK.fmt(d.mx), 8, H - 8);
    }
  }

  // ---------------------------------------------------------------- hover de las gráficas (como el WPF): globo con los valores bajo el cursor
  const fv = (v) => marcaTxt(v);
  function globo(c, lineas, x, y, W, H) {
    c.font = '11px sans-serif'; const w = Math.max(...lineas.map((t) => c.measureText(t).width)) + 12, h = lineas.length * 15 + 8;
    let gx = x + 12, gy = y + 12; if (gx + w > W - 2) gx = x - 12 - w; if (gy + h > H - 2) gy = y - 12 - h; gx = Math.max(2, gx); gy = Math.max(2, gy);
    c.fillStyle = 'rgba(255,255,255,.92)'; c.strokeStyle = '#555'; c.lineWidth = 1; c.beginPath(); c.rect(gx, gy, w, h); c.fill(); c.stroke();
    c.fillStyle = '#111'; c.textAlign = 'left'; lineas.forEach((t, i) => c.fillText(t, gx + 6, gy + 15 + i * 15));
  }
  function limpiaHover(r) { if (r.hov) { const c = r.hov.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, r.hov.width, r.hov.height); } r.hoverTxt = null; }
  function hover(r, e) {
    const hv = r.hv, cv = r.gel; if (!hv || !cv) return;
    if (!r.hov) { r.hov = document.createElement('canvas'); r.hov.className = 'ghov'; r.el.appendChild(r.hov); }
    const b = cv.getBoundingClientRect(), k = b.width ? cv.offsetWidth / b.width : 1, px = (e.clientX - b.left) * k, py = (e.clientY - b.top) * k, W = cv.offsetWidth, H = cv.offsetHeight, dpr = window.devicePixelRatio || 1, o = r.hov;
    o.style.left = cv.offsetLeft + 'px'; o.style.top = cv.offsetTop + 'px'; o.style.width = W + 'px'; o.style.height = H + 'px';
    if (o.width !== Math.round(W * dpr) || o.height !== Math.round(H * dpr)) { o.width = Math.round(W * dpr); o.height = Math.round(H * dpr); }
    const c = o.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); r.hoverTxt = null;
    if (hv.k === 'curvas') {
      const { L, T, w, h, mn, mx, x0, x1, g } = hv; if (px < L || px > L + w || py < T || py > T + h) return;
      const xv = x0 + (px - L) / w * (x1 - x0); let ik = 0; for (let i = 1; i < g.xs.length; i++) if (Math.abs(g.xs[i] - xv) < Math.abs(g.xs[ik] - xv)) ik = i;
      const X = L + (g.xs[ik] - x0) / (x1 - x0) * w, lin = ['x = ' + fv(g.xs[ik])];
      c.strokeStyle = 'rgba(20,20,20,.65)'; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X, T); c.lineTo(X, T + h); c.stroke(); c.setLineDash([]);
      g.ys.forEach((ys, s) => { const v = ys[ik]; if (!isFinite(v)) return; lin.push((g.nombres[s] || 'serie ' + (s + 1)) + ' = ' + fv(v)); c.fillStyle = PAL[s % PAL.length]; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(X, T + h - (v - mn) / (mx - mn) * h, 4.5, 0, 7); c.fill(); c.stroke(); });
      globo(c, lin, X, py, W, H); r.hoverTxt = lin.join(' | ');
    } else if (hv.k === 'mapa') {
      const { Lm, T, w, h, d, n } = hv; if (px < Lm || px > Lm + w || py < T || py > T + h) return;
      const u = (px - Lm) / w, v = 1 - (py - T) / h, x = u * n, y = v * n, i = Math.min(n - 1, Math.floor(x)), j = Math.min(n - 1, Math.floor(y)), p = x - i, q = y - j;
      const z = d.z[i][j] * (1 - p) * (1 - q) + d.z[i + 1][j] * p * (1 - q) + d.z[i][j + 1] * (1 - p) * q + d.z[i + 1][j + 1] * p * q;
      c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(Lm, py); c.lineTo(Lm + w, py); c.moveTo(px, T); c.lineTo(px, T + h); c.stroke();
      const lin = ['x = ' + fv(d.rg[0][0] + u * (d.rg[0][1] - d.rg[0][0])) + '   y = ' + fv(d.rg[1][0] + v * (d.rg[1][1] - d.rg[1][0])), 'valor = ' + fv(z)];
      globo(c, lin, px, py, W, H); r.hoverTxt = lin.join(' | ');
    } else if (hv.k === 'sup') {
      const { P, n, d } = hv; let mi = 0, mj = 0, md = 1e18, mp = null;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const q = P(i, j), dd = (q.X - px) * (q.X - px) + (q.Y - py) * (q.Y - py); if (dd < md) { md = dd; mi = i; mj = j; mp = q; } }
      if (!mp || md > 14 * 14) return;
      c.lineWidth = 2.4; c.strokeStyle = '#000'; c.beginPath(); c.arc(mp.X, mp.Y, 5, 0, 7); c.stroke(); c.lineWidth = 1.1; c.strokeStyle = '#fff'; c.beginPath(); c.arc(mp.X, mp.Y, 5, 0, 7); c.stroke();
      const lin = ['x = ' + fv(d.rg[0][0] + mi / n * (d.rg[0][1] - d.rg[0][0])) + '   y = ' + fv(d.rg[1][0] + mj / n * (d.rg[1][1] - d.rg[1][0])), 'valor = ' + fv(d.z[mi][mj])];
      globo(c, lin, mp.X, mp.Y, W, H); r.hoverTxt = lin.join(' | ');
    }
  }
  function dibujaGraf(r) {
    if (!r.graf) { r.el.classList.remove('conGraf'); if (r.gel) { r.gel.remove(); r.gel = null; } if (r.hov) { r.hov.remove(); r.hov = null; } r.hv = null; return; }
    r.el.classList.add('conGraf'); r.hv = null; limpiaHover(r);          // con gráfica: en una fila con otras piezas se coloca AL LADO (estilo.css)
    if (!r.gel) {
      r.gel = document.createElement('canvas'); r.el.appendChild(r.gel);
      r.gel.title = 'Arrastra: girar · rueda: zoom · doble clic: restablecer la vista';
      let arr = null;          // órbita de las gráficas 3D, como OrbitControls de Three.js
      r.gel.addEventListener('mousedown', (e) => { if (!(r.graf && (r.graf.tipo === 'sup' || r.graf.tipo === 'esc3'))) return; arr = { x: e.clientX, y: e.clientY }; e.preventDefault(); });
      document.addEventListener('mousemove', (e) => { if (!arr) return; const ob = r.orb || (r.orb = { az: 0, el: 0, z: 1 }); ob.az += (e.clientX - arr.x) * 0.5; ob.el = Math.max(-89, Math.min(89, ob.el + (e.clientY - arr.y) * 0.5)); arr = { x: e.clientX, y: e.clientY }; dibujaGraf(r); });
      document.addEventListener('mouseup', () => { arr = null; });
      r.gel.addEventListener('wheel', (e) => { if (!(r.graf && (r.graf.tipo === 'sup' || r.graf.tipo === 'esc3')) || e.ctrlKey) return; e.preventDefault(); const ob = r.orb || (r.orb = { az: 0, el: 0, z: 1 }); ob.z = Math.max(0.3, Math.min(8, ob.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); dibujaGraf(r); }, { passive: false });
      r.gel.addEventListener('dblclick', () => { r.orb = null; dibujaGraf(r); });
      r.gel.addEventListener('mousemove', (e) => { if (!arr) hover(r, e); });          // hover como el WPF
      r.gel.addEventListener('mouseleave', () => limpiaHover(r));
    }
    if (r.graf.tipo && HK.graf2 && /^(riemann|gauss1|gauss2|esc3|tabla|malla)$/.test(r.graf.tipo)) { HK.graf2.dibuja(r); return; }
    if (r.graf.tipo) { dibujaMalla(r); return; }
    const g = r.graf, cv = r.gel, dpr = window.devicePixelRatio || 1, W = Math.min(r.el.clientWidth - 8, 460), H = 230;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.style.margin = '4px 0 6px 6px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = 46, T = 12, R = 12, B = 30, w = W - L - R, h = H - T - B;
    let mn = Infinity, mx = -Infinity; g.ys.forEach((y) => y.forEach((v) => { if (isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }));
    if (!isFinite(mn)) { mn = -1; mx = 1; } if (mx - mn < 1e-12) { mn -= 1; mx += 1; } const sy = paso(mx - mn, 5); mn = Math.floor((mn - (mx - mn) * .04) / sy) * sy; mx = Math.ceil((mx + (mx - mn) * .04) / sy) * sy;          // el eje y arranca y termina en una marca redonda (como el WPF)
    const x0 = g.xs[0], x1 = g.xs[g.xs.length - 1], X = (x) => L + (x - x0) / (x1 - x0) * w, Y = (y) => T + h - (y - mn) / (mx - mn) * h;
    c.fillStyle = '#fff'; c.fillRect(L, T, w, h); c.font = '11px sans-serif'; c.fillStyle = '#555'; c.strokeStyle = '#e3e3e3'; c.lineWidth = 1;
    { const sx = paso(x1 - x0, 5);
      for (let xv = Math.ceil(x0 / sx - 1e-9) * sx; xv <= x1 + 1e-9; xv += sx) { c.beginPath(); c.moveTo(X(xv), T); c.lineTo(X(xv), T + h); c.stroke(); c.textAlign = 'center'; c.fillText(marcaTxt(xv), X(xv), T + h + 14); }
      for (let yv = Math.ceil(mn / sy - 1e-9) * sy; yv <= mx + 1e-9; yv += sy) { c.beginPath(); c.moveTo(L, Y(yv)); c.lineTo(L + w, Y(yv)); c.stroke(); c.textAlign = 'right'; c.fillText(marcaTxt(yv), L - 4, Y(yv) + 4); } }
    if (mn < 0 && mx > 0) { c.strokeStyle = '#999'; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(L + w, Y(0)); c.stroke(); }
    c.save(); c.beginPath(); c.rect(L, T, w, h); c.clip();
    g.ys.forEach((ys, k) => { c.strokeStyle = PAL[k % PAL.length]; c.lineWidth = 1.8; c.beginPath(); let on = false; ys.forEach((v, i) => { if (!isFinite(v)) { on = false; return; } if (!on) { c.moveTo(X(g.xs[i]), Y(v)); on = true; } else c.lineTo(X(g.xs[i]), Y(v)); }); c.stroke(); });
    c.restore(); c.strokeStyle = '#222'; c.lineWidth = 1; c.strokeRect(L, T, w, h); r.hv = { k: 'curvas', L, T, w, h, mn, mx, x0, x1, g };
    g.nombres.forEach((nm, k) => { c.fillStyle = PAL[k % PAL.length]; c.fillRect(L + 8, T + 8 + k * 14, 16, 3); c.fillStyle = '#333'; c.textAlign = 'left'; c.fillText(nm, L + 30, T + 12 + k * 14); });
  }

  // ---------------------------------------------------------------- resolver toda la hoja, de arriba abajo
  function limpiaMarcas(fila) { for (const it of fila) { if (it.t === 'c') { it._tint = null; it._vis = null; } else for (const h of HK.hijosDe(it)) limpiaMarcas(h); } }
  function marcaIgual(ed, tipo, vis) {          // verde = evalúa · azul = define (como en WPF)
    const f = ed.fila;
    if (tipo === 'evalua') { for (let i = f.length - 1; i >= 0; i--) if (f[i].t === 'c' && f[i].s === '=') { f[i]._tint = 'evalua'; if (vis) f[i]._vis = vis; return; } }
    else for (let i = 0; i < f.length; i++) if (f[i].t === 'c' && (f[i].s === '=' || f[i].s === '≔')) { f[i]._tint = 'define'; return; }
  }
  function valorRes(v) { return HK.M.esM(v) ? (v.r === 1 && v.c === 1 ? { kind: 'val', texto: HK.fmt(v.a[0]) } : { kind: 'mat', mat: v }) : { kind: 'val', texto: HK.fmt(v) }; }
  // Filas tecleadas (no abiertas de un .hmath): de un for/while/if hasta su «end» forman un programa; la sangría sigue la profundidad
  function agrupaProgramas() {
    for (const r of reg) if (r.t === 'eq' && r.tecleado) { r.prog = null; }
    let prof = 0, grupo = null;
    for (const r of reg) {
      if (r.t !== 'eq' || r.original) continue;
      const t = r.ed.texto().trim();
      const abre = /^(for|while|if|prog)\b|=\s*prog\s*$/.test(t), cierra = /^end\b/.test(t), sino = /^else\b/.test(t);
      if (abre && prof === 0) grupo = { tecleado: true };
      if (grupo) { r.prog = grupo; r.tecleado = true; r.ed.sangria = (cierra || sino ? Math.max(prof - 1, 0) : prof) * 4; r.el.style.marginLeft = r.ed.sangria * 5 + 'px'; }
      else if (r.tecleado) { r.tecleado = false; r.ed.sangria = 0; r.el.style.marginLeft = ''; }
      if (abre) prof++; else if (cierra && prof > 0) { prof--; if (prof === 0) grupo = null; }
    }
  }
  let calcManual = false;
  function resolver(forzar) {
    if (calcManual && !forzar) return;          // «Celdas a mano»: solo se calcula al ejecutar
    reg.sort((a, b) => (a === b || !a.el || !b.el) ? 0 : (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);          // las fórmulas dentro de un párrafo van en el orden del documento
    const env = { v: {}, f: {}, l: {} }, S = HK.simb; HK.entorno = env;
    const sim = (e) => S.resuelve(e, env);
    const hechos = new Set();
    agrupaProgramas();          // for / while / if … end tecleados fila por fila en nodos
    for (const r of reg) {
      if (r.t === 'slider') { env.v[r.nombre] = r.valor; continue; }
      if (r.t !== 'eq') continue;
      if (!r.prog) r.ed.resultado = null; r.graf = null; r.ed.modo = r.modo; limpiaMarcas(r.ed.fila);
      { const u = r.ed.fila[r.ed.fila.length - 1]; if (!r.prog && u && u.t === 'c' && u.s === '≔') continue; }          // «a ≔» sin lado derecho: definición a medias, no una evaluación «a =» (no muestra resultado)
      if (r.modo === 2 && !r.prog) continue;          // solo notación: se dibuja, no se calcula ni define nada
      if (r.prog) {          // programa: todas las líneas del bloque se ejecutan juntas
        if (hechos.has(r.prog)) continue; hechos.add(r.prog);
        const grupo = reg.filter((x) => x.prog === r.prog); grupo.forEach((x) => { x.ed.resultado = null; });
        try {
          const ult = HK.M.programa(grupo.map((x) => x.ed.texto() + (x.sil ? ';' : '')), env);
          if (ult && !grupo[0].prog.tecleado) grupo[grupo.length - 1].ed.resultado = valorRes(ult.v);
        } catch (e) { grupo[grupo.length - 1].ed.resultado = { kind: 'err', texto: e.message }; }
        continue;
      }
      const txt = r.ed.texto();
      let s; try { s = HK.sentencia(txt); } catch (e) { s = { k: 'vacia' }; }
      try {
        if (s.k === 'simb') r.ed.resultado = { sim: '→', fila: HK.aFilas(sim(s.e)) };          // expr →  : evaluación simbólica
        else if (s.k === 'simbdef') {          // K = expr →  : el resultado simbólico queda como fórmula viva
          const res = sim(s.e); if (s.n.t === 'id') env.l[s.n.n] = res; r.ed.resultado = { sim: '→', fila: HK.aFilas(res) }; marcaIgual(r.ed, 'define');
        }
        else if ((s.k === 'muestra' || s.k === 'expr') && s.e.t === 'call' && s.e.f === 'fplot') { r.graf = fplot(s.e.args, env); }
        else if ((s.k === 'muestra' || s.k === 'expr') && s.e.t === 'call' && HK.graf2 && HK.graf2.TIPOS[s.e.f]) { r.graf = HK.graf2.calcula(s.e.f, s.e.args, env); }          // friemann, fgauss, fgauss2d, fvolumen, fvoxeles
        else if ((s.k === 'muestra' || s.k === 'expr') && s.e.t === 'call' && (s.e.f === 'fmapa' || s.e.f === 'fsuperficie')) { r.graf = { tipo: s.e.f === 'fmapa' ? 'mapa' : 'sup', d: malla2(s.e.args, env) }; }
        else if ((s.k === 'muestra' || s.k === 'expr') && s.e.t === 'call' && s.e.f === 'mapa' && (s.e.args.length === 1 || s.e.args.length === 3)) { r.graf = { tipo: 'mapa', d: mapaMatriz(s.e.args, env) }; }          // mapa(M [, a, b]): la matriz de resultados (i = x, j = y)
        else if (s.k === 'expr' && r.modo !== 1 && r.auto && !r.editado && !HK.simb.tieneSimb(s.e)) {          // solo filas cargadas de un .hmath y sin tocar          // fila numérica con solo una expresión («u», «dif»): muestra su valor, como en escritorio
          try { r.ed.resultado = valorRes(HK.evalua(s.e, env)); } catch (e) { if (!/^indef:/.test(e.message)) throw e; r.ed.resultado = { sim: '=', fila: HK.aFilas(sim(s.e)) }; }
        } else if (s.k === 'expr' && r.modo === 1 && r.auto && !r.editado) {          // fila simbólica: «expr» → resultado con flecha
          r.ed.resultado = { sim: '→', fila: HK.aFilas(sim(s.e)) };
        } else if (s.k === 'muestra') {
          marcaIgual(r.ed, 'evalua', r.modo === 1 ? '→' : null);
          let numInt = false;          // «∫ x² dx =» con límites: el «=» EJECUTA la integral (numérica, Gauss), como en el WPF; no hace falta «y = ∫…»
          if (r.modo !== 1 && S.tieneSimb(s.e) && soloIntegral(s.e)) {
            env.numInt = true;
            try { r.ed.resultado = valorRes(HK.evalua(s.e, env)); numInt = true; } catch (e) { numInt = false; } finally { env.numInt = false; }
          }
          if (numInt) { /* ya tiene resultado numérico */ }
          else if (r.modo === 1 || S.tieneSimb(s.e)) r.ed.resultado = { sim: r.modo === 1 ? '→' : '=', fila: HK.aFilas(sim(s.e)) };
          else {
            try { r.ed.resultado = valorRes(HK.evalua(s.e, env)); }
            catch (e) { if (!/^indef:/.test(e.message)) throw e; r.ed.resultado = { sim: '=', fila: HK.aFilas(sim(s.e)) }; }          // lo no definido es un SÍMBOLO: resultado simbólico
          }
        } else if (s.k === 'def') {
          marcaIgual(r.ed, 'define');
          let simbolica = S.tieneSimb(s.r);
          if (simbolica && s.l.t === 'id' && r.modo !== 1 && soloIntegral(s.r)) {          // «K = … integral(…)»: numérica (Gauss) si todo se puede evaluar; si no, queda simbólica
            env.numInt = true; try { env.v[s.l.n] = HK.evalua(s.r, env); delete env.l[s.l.n]; simbolica = null; } catch (e) { simbolica = true; } finally { env.numInt = false; }
          }
          if (simbolica === null) continue;
          if (s.muestra && s.l.t === 'id' && !simbolica) {          // «a = expr =»: define y enseña el valor
            try { const v = HK.evalua(s.r, env); env.v[s.l.n] = v; delete env.l[s.l.n]; r.ed.resultado = valorRes(v); marcaIgual(r.ed, 'define'); continue; } catch (e) { if (!/^indef:/.test(e.message)) throw e; }
          }
          let cuerpo = s.r;
          if (simbolica) {
            try { cuerpo = sim(s.r); }
            catch (e) { if (e.message === 'motor:cargando' || s.l.t !== 'id' || r.modo === 1) throw e; let v; env.numInt = true; try { v = HK.evalua(s.r, env); } catch (e2) { throw e; } finally { env.numInt = false; } env.v[s.l.n] = v; delete env.l[s.l.n]; continue; }          // integral de una matriz (Nv, Bm…): el motor simbólico no puede → numérica (Gauss)
          }
          if (s.l.t === 'call' && s.l.args.every((a) => a.t === 'id')) env.f[s.l.f] = { p: s.l.args.map((a) => a.n), b: cuerpo };
          else if (s.l.t === 'id') {
            if (simbolica) env.l[s.l.n] = cuerpo;
            else { try { env.v[s.l.n] = HK.evalua(cuerpo, env); delete env.l[s.l.n]; } catch (e) { env.l[s.l.n] = cuerpo; } }
          }
        }
      } catch (e) {
        const m = /^indef:(.*)$/.exec(e.message);
        r.ed.resultado = e.message === 'motor:cargando' ? { kind: 'aviso', texto: 'cargando el motor simbólico…' } : m ? { kind: 'aviso', texto: 'sin definir: ' + m[1] } : { kind: 'err', texto: e.message };
      }
    }
    redibuja();
  }
  let previo = null;
  const RX_FN = /(?:^|[^A-Za-z0-9_])(?:diff|pdiff|partial|integral|sum|prod|limit|taylor|sqrt)\s*\(/;
  function normaliza(ed) {          // al salir de una fórmula, lo tecleado como texto (diff(…), integral(…), limit(…), sum(…), sqrt(…)) se dibuja con los nodos del WPF: d/dx, ∫, lim, Σ, √
    try { const t = ed.texto(); if (RX_FN.test(t)) { const f = HK.codigoAFilas(t); if (f && f.some((x) => x.t !== 'c')) ed.cargar(f); } } catch (e) { /* se queda como está */ }
  }
  function redibuja() {
    if (previo && previo !== activo && reg.some((r) => r.ed === previo)) normaliza(previo);
    previo = activo;
    for (const r of reg) if (r.t === 'eq') { r.ed.foco = (r.ed === activo); r.ed.dibuja(); dibujaGraf(r); }
  }

  // ---------------------------------------------------------------- teclado
  document.addEventListener('keydown', (e) => {
    if (!activo) return;
    const t = e.target; if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 'Dead') {          // teclado latino/español: «^» es una tecla muerta (Mayús + ¨ / ^): se toma como exponente
      e.preventDefault(); if (e.shiftKey || e.code === 'BracketLeft' || e.code === 'Quote') activo.tecla({ key: '^', preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false });
      return;
    }
    if (HK.sug && HK.sug.tecla(e)) { e.preventDefault(); e.stopImmediatePropagation(); return; }          // lista de autocompletar abierta: ↑ ↓ Tab Esc
    if (e.key === 'Enter' || e.key === 'Tab') { if (HK.sug) HK.sug.oculta(); return; }          // los atiende el manejador de abajo
    if (activo.tecla(e)) e.preventDefault();
    if (HK.sug) { const ed = activo; setTimeout(() => { if (activo === ed) HK.sug.actualiza(ed); }, 0); }          // ya con el carácter puesto en el nodo
  });
  // ---------------------------------------------------------------- moverse entre ecuaciones, quitar una, copiar y pegar nodos
  function eqs() { return reg.filter((x) => x.t === 'eq'); }
  function salta(r, d) {          // ±1 horizontal, ±2 vertical: a la ecuación anterior (cursor al final) o a la siguiente (cursor al inicio)
    const l = eqs(), k = l.indexOf(r) + (d < 0 ? -1 : 1); if (k < 0 || k >= l.length) return;
    const o = l[k]; activo = o.ed; o.ed.quitaSel(); o.ed.cur = { fila: o.ed.fila, i: d < 0 ? o.ed.fila.length : 0 }; redibuja(); o.el.scrollIntoView({ block: 'nearest' });
  }
  function quita(r) {
    const l = eqs(); if (l.length <= 1) return; const k = l.indexOf(r), prev = l[k > 0 ? k - 1 : 1];
    const fila = r.el.parentElement.classList.contains('grupo') ? r.el.parentElement : r.el; r.el.remove(); const f = fila.parentElement; if (f && f.classList.contains('fila') && !f.children.length) f.remove();
    reg.splice(reg.indexOf(r), 1); activo = prev.ed; prev.ed.cur = { fila: prev.ed.fila, i: prev.ed.fila.length }; resolver(); prev.el.scrollIntoView({ block: 'nearest' });
  }
  const enTexto = () => { const t = document.activeElement; return t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'); };
  document.addEventListener('copy', (e) => { if (!activo || enTexto()) return; if (multi && multi.eds.length > 1) { const cs = multi.eds.map((x) => x.copiaSel()).filter(Boolean); if (cs.length) { e.clipboardData.setData('text/plain', cs.map((x) => x.texto).join('  ')); e.clipboardData.setData('application/x-hekatan-nodos', cs[0].json); e.preventDefault(); return; } } const c = activo.copiaSel(); if (!c) return; e.clipboardData.setData('text/plain', c.texto); e.clipboardData.setData('application/x-hekatan-nodos', c.json); e.preventDefault(); });
  document.addEventListener('cut', (e) => { if (!activo || enTexto()) return; const c = activo.copiaSel(); if (!c) return; e.clipboardData.setData('text/plain', c.texto); e.clipboardData.setData('application/x-hekatan-nodos', c.json); e.preventDefault(); activo.borraSel(); activo.cambio(); });
  document.addEventListener('paste', (e) => {
    if (!activo || enTexto()) return; e.preventDefault(); const j = e.clipboardData.getData('application/x-hekatan-nodos');
    if (j) { try { activo.pega(JSON.parse(j)); return; } catch (x) { /* sigue con el texto */ } }
    const t = (e.clipboardData.getData('text/plain') || '').split(String.fromCharCode(10))[0].trim(); if (t) activo.pega(HK.codigoAFilas(t));
  });
  document.addEventListener('keydown', (e) => {          // selección que cruza ecuaciones: Supr/Retroceso la borra; teclear la reemplaza; flechas/Esc la quitan
    if (!multi || multi.eds.length < 2 || enTexto()) return;
    const k = e.key, borra = () => { const primero = multi.eds[0]; multi.eds.forEach((x) => x.borraSel()); multi.eds.forEach((x) => x.quitaSel()); multi = null; activo = primero; resolver(); redibuja(); };
    if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); e.stopPropagation(); borra(); return; }
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { borra(); return; }          // la tecla sigue su camino y se escribe en la primera
    if (/^Arrow|^Escape$|^Home$|^End$/.test(k)) { limpiaMulti(); redibuja(); }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!activo || enTexto()) return; const r = eqs().find((x) => x.ed === activo); if (!r) return;
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey) { e.preventDefault(); const f = r.el.closest('.fila'); insertaDespues(f, nuevaEq('')); return; }
    if (e.key === 'Tab') { e.preventDefault(); salta(r, e.shiftKey ? -1 : 1); }
  });
  // clic en la hoja vacía: se crea (o se enfoca) una ecuación, lista para escribir; clic derecho: menú «aquí»
  const papel = document.getElementById('papel'), area = document.getElementById('area');
  // botones Repetir / Mientras / Condición / Programa / Devolver del WPF: filas del bloque, el cursor queda en el cuerpo
  function bloque(tipo) {
    const cab = { para: 'for i=1:n', mientras: 'while i<n', si: 'if i>0', prog: 'prog' }[tipo];
    if (tipo === 'devolver') { nuevaEq('return '); return; }
    nuevaEq(cab); const cuerpo = nuevaEq(''); nuevaEq('end'); activo = cuerpo.ed; resolver(); redibuja(); cuerpo.el.scrollIntoView({ block: 'nearest' });
  }
  function insertaMat(filas, cols) {          // vector fila / columna (botones del WPF)
    if (!activo) nuevaEq('');
    const it = { t: 'mat', corch: true, cells: Array.from({ length: filas }, () => Array.from({ length: cols }, () => [])) };
    activo.inserta(it); activo.entra(it.cells[0][0]); activo.cambio(); activo.dibuja();
  }
  function activaEq() { return reg.find((x) => x.t === 'eq' && x.ed === activo) || ultimaEq(); }
  function codigoLimpio(t) {          // el código que se ve: x^2/(y+1) y no (x^(2))/((y+1)); solo quita paréntesis que sobran
    let u = t.replace(/\^\(([\w.]+)\)/g, '^$1');
    for (let k = 0; k < 4; k++) u = u.replace(/\(\(([^()]*)\)\)/g, '($1)');          // ((…)) → (…)
    return u.replace(/\(([\w.^]+)\)\//g, '$1/').replace(/\/\(([\w.^]+)\)/g, '/$1');          // (x^2)/… → x^2/…   y   …/(y) → …/y
  }
  function alternaCodigo() {          // Código ⇄ Nodos (Ctrl+K): la región activa se ve como texto de código editable o como ecuación dibujada
    const r = activaEq(); if (!r) return false;
    if (r.cod) { r.ed.cargar(HK.codigoAFilas(r.cod.value)); r.editado = true; r.cod.remove(); r.cod = null; r.ed.canvas.style.display = ''; activo = r.ed; resolver(); redibuja(); return true; }
    const ta = document.createElement('textarea'); ta.className = 'cod'; ta.spellcheck = false; ta.value = codigoLimpio(r.ed.texto()); ta.rows = Math.max(1, ta.value.split('\n').length);
    ta.addEventListener('input', () => { r.ed.cargar(HK.codigoAFilas(ta.value)); r.editado = true; resolver(); });
    ta.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); alternaCodigo(); } });
    r.ed.canvas.style.display = 'none'; r.el.appendChild(ta); r.cod = ta; ta.focus(); return true;
  }
  function ocultaBloque() {          // Ocultar bloque (Ctrl+H): la región con el cursor se esconde; Ctrl+Mayús+H muestra u oculta los bloques ocultos
    const r = activaEq(); if (!r) return false;
    r.oculto = !r.oculto; r.el.classList.toggle('oculto', r.oculto);
    if (r.oculto) { const l = eqs().filter((x) => !x.oculto); if (l.length) { const o = l[Math.max(0, l.indexOf(r) - 1)] || l[0]; activo = o.ed; } }
    redibuja(); return r.oculto;
  }
  function setModo(m) {          // Notación / Simbólica / Numérica de la región con el cursor (como en el WPF)
    const r = reg.find((x) => x.t === 'eq' && x.ed === activo) || ultimaEq(); if (!r) return false;
    r.modo = m; r.editado = true; resolver(); redibuja(); return true;
  }
  function ultimaEq() { for (let i = reg.length - 1; i >= 0; i--) if (reg[i].t === 'eq') return reg[i]; return null; }
  function eqEnFila(cv, x) { return eqDeFila(cv.closest('.fila'), x); }
  function eqDeFila(f, x) {          // la ecuación de la fila f más cercana en horizontal a x
    if (!f) return null; let mejor = null, dm = 1e9;
    for (const r of reg) { if (r.t !== 'eq' || r.enTexto || !f.contains(r.el)) continue; const b = r.ed.canvas.getBoundingClientRect(); if (!b.width) continue; const d = x < b.left ? b.left - x : x > b.right ? x - b.right : 0; if (d < dm) { dm = d; mejor = r; } }
    return mejor;
  }
  function filaEnY(y) {          // la fila (línea) del papel en cuya franja vertical cae y (con 4 px de holgura: también el hueco entre filas)
    let mejor = null, dm = 1e9;
    for (const f of document.querySelectorAll('#hoja .fila')) { const b = f.getBoundingClientRect(); if (!b.height) continue; const d = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0; if (d <= 4 && d < dm) { dm = d; mejor = f; } }
    return mejor;
  }
  function enHueco(e) { return e.target === papel || e.target === hoja || e.target === area || (e.target.classList && (e.target.classList.contains('fila') || e.target.classList.contains('pg'))); }
  (papel || document).addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !enHueco(e)) return;
    e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const f = e.target.classList && e.target.classList.contains('fila') ? e.target : filaEnY(e.clientY);          // clic en la franja de una línea (hueco, margen izq./der., entre filas): el cursor se queda EN ESA LÍNEA, no baja a otra
    if (f) {
      const o = eqDeFila(f, e.clientX);
      if (o) { const b = o.ed.canvas.getBoundingClientRect(); activo = o.ed; o.ed.quitaSel(); o.ed.cur = { fila: o.ed.fila, i: e.clientX < b.left ? 0 : o.ed.fila.length }; redibuja(); return; }
      const t = [...f.querySelectorAll('.txt')].pop();          // la línea es solo texto: cursor al final de ese texto
      if (t) { t.focus(); const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents(t); rg.collapse(e.clientX < t.getBoundingClientRect().left); sel.removeAllRanges(); sel.addRange(rg); return; }
    }
    const u = ultimaEq();
    if (u && u.ed.fila.length === 0) { activo = u.ed; u.ed.cur = { fila: u.ed.fila, i: 0 }; redibuja(); }
    else nuevaEq('');
  });
  let menuCtx = null;
  function cierraCtx() { if (menuCtx) { menuCtx.remove(); menuCtx = null; } }
  document.addEventListener('mousedown', (e) => { if (menuCtx && !menuCtx.contains(e.target)) cierraCtx(); });
  (papel || document).addEventListener('contextmenu', (e) => {
    e.preventDefault(); cierraCtx();
    const y = e.clientY, filas = [...hoja.querySelectorAll(':scope > .fila')]; let ref = null;
    for (const f of filas) if (f.getBoundingClientRect().bottom <= y + 2) ref = f;
    const m = document.createElement('div'); m.className = 'ctx'; m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px';
    for (const [t, fn] of [['Ecuación aquí', () => insertaDespues(ref, nuevaEq(''))], ['Texto aquí', () => insertaDespues(ref, nuevoTxt('Texto…'))], ['Deslizador aquí', () => { const n = prompt('Nombre del deslizador', 'a'); if (n) { agregaSlider(n, 0, 10, 1, 0.1); insertaDespues(ref, reg[reg.length - 1]); resolver(); } }]]) {
      const b = document.createElement('button'); b.textContent = t; b.onmousedown = (ev) => ev.preventDefault(); b.onclick = () => { cierraCtx(); fn(); }; m.appendChild(b);
    }
    document.body.appendChild(m); menuCtx = m;
  });
  function insertaDespues(ref, r) {          // mueve la región recién creada justo después de la fila de referencia (y en el orden de cálculo)
    if (!r) return; const fila = r.el.parentElement.classList.contains('grupo') ? r.el.parentElement.parentElement : r.el.parentElement;
    if (ref) hoja.insertBefore(fila, ref.nextSibling); else hoja.insertBefore(fila, hoja.firstChild);
    reg.splice(reg.indexOf(r), 1); let k = 0; for (let i = 0; i < reg.length; i++) { if (ref && ref.contains(reg[i].el)) k = i + 1; } if (!ref) k = 0; reg.splice(k, 0, r);
    resolver();
  }
  G.addEventListener('resize', redibuja);

  // ---------------------------------------------------------------- abrir / guardar .hmath
  function abre(json) {
    const d = typeof json === 'string' ? JSON.parse(json) : json; limpia();
    { const lisp = d.estilo === 'lisp'; document.body.classList.toggle('lisp', lisp); document.body.classList.toggle('sinpag', lisp);          // hoja de Hekatan LISP: continua y compacta, como en el WPF (estilo «lisp»)
      if (HK.app) { if (lisp) { HK.app.setTxt(Math.round(d.txt || 15)); HK.app.setEq(Math.round(d.eq || 15)); } else if (HK.app.estiloLisp) { HK.app.setTxt(13); HK.app.setEq(14); } HK.app.estiloLisp = lisp; } }
    for (let it of d.items || []) {
      if (it.t === 'texto') { const r = agregaTxt(it.text, it.titulo, it.nivel, it.mismaLinea); if (it.html) limpioHtml(r.el, it.html); }
      else if (it.t === 'parrafo') {          // párrafo del WPF: [{s:texto,b,i,u}, {eq:código,m:0|1|2}, {img:data:…}]
        const r = agregaTxt('', !!it.titulo, it.nivel, it.mismaLinea);
        for (const g of it.seg || []) {
          if (g.eq != null) { const q = agregaEqEnTexto(r.el, g.eq, g.m == null ? 2 : g.m, null); q.auto = true; continue; }
          if (g.img && /^data:image\//i.test(g.img)) { const im = document.createElement('img'); im.src = g.img; r.el.appendChild(im); continue; }
          let nodo = document.createTextNode(g.s || ''); for (const [k, tg] of [['u', 'u'], ['i', 'i'], ['b', 'b']]) if (g[k]) { const w = document.createElement(tg); w.appendChild(nodo); nodo = w; }
          r.el.appendChild(nodo);
        }
      }
      else if (it.t === 'slider') agregaSlider(it.nombre, it.min, it.max, it.valor, it.inc);
      else if (it.t === 'cad') agregaCad(it.codigo || CAD_CAB, it.titulo);
      else if (it.t === 'raw') agregaRaw(it.text, it.oculto);
      else if (it.t === 'eq') {
        if (it.teclas != null && it.codigo == null) { const tc = HK.teclasACodigo(it.ini, it.teclas); it = Object.assign({}, it, { codigo: tc.codigo, modo: tc.notacion ? 2 : it.modo }); }          // formato nuevo del WPF: lo tecleado
        const todas = String(it.codigo || '').split(String.fromCharCode(10)).map((l) => l.split(String.fromCharCode(13)).join('')).filter((l) => l.trim());
        const esProg = todas.some((l) => /^\s*(for|while|if|prog|else|end|return)\b|=\s*prog\s*$/.test(l));
        const c = contenedor(it.mismaLinea); let grupo = c;
        if (todas.length > 1) { grupo = document.createElement('div'); grupo.className = 'grupo'; c.appendChild(grupo); }
        let comentario = null;
        todas.forEach((l, i) => {
          const mc = /\s%\s(.*)$/.exec(l); if (mc) { l = l.slice(0, mc.index); if (!esProg && !it.oculto) comentario = mc[1]; }          // «expr % comentario»: el comentario va en gris, en la misma línea
          const sil = /;\s*$/.test(l), r = agregaEq(l.trim().replace(/;\s*$/, ''), { modo: it.modo, grupo, oculto: it.oculto });
          r.original = it; r.sil = sil; r.auto = true; if (esProg) { r.prog = it; r.ed.sangria = (l.match(/^\s*/)[0].length) * 2; r.el.style.marginLeft = r.ed.sangria * 5 + 'px'; }
        });
        if (comentario) { const tc = agregaTxt(comentario, false, 1, true); tc.el.contentEditable = 'true'; }
      }
    }
    resolver();
  }
  // formato del texto (negrita, tamaño, tabla…): solo etiquetas y estilos de una lista corta
  const ETQ = /^(B|I|U|S|STRIKE|SUB|SUP|A|BR|SPAN|FONT|DIV|P|UL|OL|LI|TABLE|TBODY|TR|TD|TH|IMG)$/;
  function limpioHtml(el, html) {
    const t = document.createElement('template'); t.innerHTML = html;
    (function lim(n) {
      for (const c of [...n.children]) {
        if (!ETQ.test(c.tagName)) { c.replaceWith(document.createTextNode(c.textContent)); continue; }
        for (const a of [...c.attributes]) {
          const ok = (a.name === 'style' && !/url\(|expression/i.test(a.value)) || (c.tagName === 'A' && a.name === 'href' && /^(https?:|#)/i.test(a.value)) || (c.tagName === 'IMG' && a.name === 'src' && /^data:image\//i.test(a.value)) || (c.tagName === 'FONT' && /^(face|size|color)$/.test(a.name)) || (c.tagName === 'SPAN' && c.className === 'coment' && /^(title|class)$/.test(a.name)) || (c.tagName === 'SUP' && /^(title|class)$/.test(a.name)) || /^(colspan|rowspan)$/.test(a.name);
          if (!ok) c.removeAttribute(a.name);
        }
        lim(c);
      }
    })(t.content);
    el.innerHTML = ''; el.appendChild(t.content);
  }
  function codigoWpf(c, enTexto) {
    c = String(c || '').trim(); const fin = c.endsWith('→') ? '→' : (c.endsWith('=') && !c.endsWith('==') && !/[<>!≠≤≥]=$/.test(c)) ? '=' : '';
    if (!fin) return c;
    const cuerpo = c.slice(0, -1).trim(); let d = 0, ix = -1;
    for (let i = 0; i < cuerpo.length; i++) { const k = cuerpo[i]; if (k === '(' || k === '[') d++; else if (k === ')' || k === ']') d--; else if (k === '=' && d === 0 && cuerpo[i + 1] !== '=' && cuerpo[i - 1] !== '=' && !/[<>!]/.test(cuerpo[i - 1] || '')) { ix = i; break; } }
    if (ix < 1) return cuerpo;          // «expr =»  →  «expr» (en el WPF una línea con solo la expresión muestra su valor)
    return enTexto ? cuerpo : cuerpo + '\n' + cuerpo.slice(0, ix).trim();          // «a = expr =»  →  «a = expr» y debajo «a»
  }
  function guarda() {
    const items = [];
    for (const r of reg) {
      if (r.t === 'txt' && r.el.querySelector('.ifx')) {          // párrafo con fórmulas dentro: segmentos como el WPF
        const seg = []; (function rec(n) {
          for (const c of n.childNodes) {
            if (c.nodeType === 3) { if (!c.nodeValue) continue; const p = c.parentElement, g = { s: c.nodeValue }; if (p.closest('b,strong')) g.b = 1; if (p.closest('i,em')) g.i = 1; if (p.closest('u')) g.u = 1; seg.push(g); }
            else if (c.classList && c.classList.contains('ifx')) { const q = reg.find((x) => x.enTexto && x.spanTxt === c); if (q) seg.push({ eq: codigoWpf(q.editado || !q.codigo ? q.ed.texto() : q.codigo, true), m: q.modo }); }
            else if (c.tagName === 'BR') seg.push({ s: '\n' }); else if (c.tagName === 'IMG' && /^data:image\//i.test(c.getAttribute('src') || '')) seg.push({ img: c.getAttribute('src') }); else rec(c);
          }
        })(r.el); const o = { t: 'parrafo', seg }; if (r.titulo) { o.titulo = true; o.nivel = r.nivel; } if (r.mismo) o.mismaLinea = true; items.push(o);
      }
      else if (r.t === 'txt') { const o = { t: 'texto', text: r.el.textContent }; if (r.titulo) { o.titulo = true; o.nivel = r.nivel; } if (r.mismo) o.mismaLinea = true; if (r.el.querySelector('*') || r.el.getAttribute('style')) o.html = r.el.innerHTML; items.push(o); }
      else if (r.t === 'slider') items.push({ t: 'slider', nombre: r.nombre, min: r.min, max: r.max, valor: r.valor, inc: r.inc });
      else if (r.t === 'cad') items.push({ t: 'cad', codigo: r.ta.value, ...(r.titulo ? { titulo: r.titulo } : {}) });
      else if (r.t === 'raw') items.push({ t: 'raw', text: r.ta.value, ...(r.oculto ? { oculto: true } : {}) });
      else if (r.enTexto) continue;          // ya va dentro de su párrafo
      else items.push({ t: 'eq', codigo: codigoWpf(r.editado || !r.codigo ? r.ed.texto() : r.codigo), modo: r.modo, ...(r.oculto ? { oculto: true } : {}) });
    }
    return JSON.stringify({ formato: 'hmath 1', eq: 14, txt: 16, gap: 6, fmt: 0, items }, null, 1);
  }
  // ---------------------------------------------------------------- acciones que usa la cinta (app.js)
  function nuevaEq(codigo, mismo, modo) { const r = agregaEq(codigo || '', { mismaLinea: !!mismo, modo: modo || 0 }); activo = r.ed; r.ed.cargar(codigo ? HK.codigoAFilas(codigo) : []); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); resolver(); r.el.scrollIntoView({ block: 'nearest' }); return r; }
  function nuevoTxt(t) { const r = agregaTxt(t || 'Texto…', false); r.el.focus(); if (!t) { const g = getSelection(), rg = document.createRange(); rg.selectNodeContents(r.el); g.removeAllRanges(); g.addRange(rg); } return r; }
  function nuevoSlider(n) { n = n || prompt('Nombre del deslizador', 'a'); if (n) { agregaSlider(n, 0, 10, 1, 0.1); resolver(); } }
  function escribe(txt) {          // teclea en la ecuación activa (o crea una): «~» = Espacio
    if (!activo) nuevaEq('');
    for (const c of txt) activo.tecla({ key: c === '~' ? ' ' : c, preventDefault() {}, ctrlKey: false, metaKey: false });
    activo.dibuja();
  }
  function tam(clase, d) { const el = document.documentElement; const k = clase === 'txt' ? '--txt' : '--eq'; const v = Math.max(8, Math.min(30, (parseFloat(getComputedStyle(el).getPropertyValue(k)) || (clase === 'txt' ? 16 : 14)) + d)); el.style.setProperty(k, v); aplicaTam(); return v; }
  function aplicaTam() { const el = document.documentElement, t = parseFloat(getComputedStyle(el).getPropertyValue('--txt')) || 16, e = parseFloat(getComputedStyle(el).getPropertyValue('--eq')) || 14; el.style.setProperty('--txtpx', t + 'px'); reg.forEach((r) => { if (r.t === 'eq') r.ed.tam = e; }); redibuja(); }
  function descarga(nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([guarda()], { type: 'application/json' })); a.download = (nombre || 'hoja') + '.hmath'; a.click(); }
  function nuevoCad(codigo) { const r = agregaCad(codigo == null ? CAD_CAB : codigo); r.el.scrollIntoView({ block: 'nearest' }); return r; }
  function cadAgrega(linea) {          // agrega una instrucción al bloque CAD con el foco, si no al último; si no hay ninguno, lo crea
    const cads = reg.filter((x) => x.t === 'cad'), r = cads.find((x) => x.ta === document.activeElement) || cads[cads.length - 1];
    if (!r) return nuevoCad(CAD_CAB + '\n' + linea);
    r.ta.value = r.ta.value.replace(/\s*$/, '') + '\n' + linea; r.dibuja(); r.el.scrollIntoView({ block: 'nearest' }); return r;
  }
  function cadExporta(tipo) { const r = reg.filter((x) => x.t === 'cad').pop(); if (!r) return false; if (tipo === 'dwg') { HK.cad.bajaDwg(r.ents).then((n) => HK.app.estado('DWG guardado: dibujo.dwg (' + n + ' bytes)')).catch((x) => HK.app.estado('No se pudo guardar el DWG: ' + x.message)); return true; } HK.cad.baja(tipo === 'lsp' ? 'dibujo.lsp' : 'dibujo.dxf', tipo === 'lsp' ? HK.cad.aLsp(r.ents, 'dibujo') : HK.cad.aDxf(r.ents), 'text/plain'); return true; }
  function siguienteEq() { const l = reg.filter((r) => r.t === 'eq' && !r.oculto), i = l.findIndex((r) => r.ed === activo); const n = l[i + 1] || l[0]; if (n) { activo = n.ed; n.ed.cur = { fila: n.ed.fila, i: n.ed.fila.length }; redibuja(); n.el.scrollIntoView({ block: 'nearest' }); } }
  function fracVar() { if (!activo) nuevaEq(''); escribe('/'); const p = activo.cur.fila._p; if (p && p.it.t === 'frac') { p.it.diag = true; activo.cambio(); } }          // «Var. fracción»: fracción diagonal a⁄b
  HK.hoja = { fracVar, modoManual: (f) => { calcManual = !!f; if (!f) resolver(true); }, siguienteEq, nuevoCad, cadAgrega, cadExporta, abre, guarda, resolver, agregaEq, agregaTxt, agregaSlider, reg, limpia, activar: (r) => { activo = r.ed; redibuja(); }, nuevaEq, eqEnTexto, setModo, bloque, insertaMat, nuevoTxt, nuevoSlider, escribe, tam, descarga, hayActivo: () => !!activo, activa: () => activo, alternaCodigo, ocultaBloque, redibuja: () => { redibuja(); } };
  if (!/[?&]vacia/.test(location.search)) { agregaTxt('Hekatan Math Studio', true, 1); agregaTxt('Pulsa «Ecuación» en la cinta, o haz clic en la hoja, y teclea: «/» fracción, «^» exponente, «_» subíndice, «\\» raíz, «(» paréntesis; Espacio sale del hueco. El resultado solo aparece cuando terminas con «=».', false); resolver(); nuevaEq(''); }
})(window);
