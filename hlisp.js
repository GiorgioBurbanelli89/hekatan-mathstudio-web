// Hekatan Math Studio Web — abre hojas de Hekatan LISP (.lisp / .hlisp), con las MISMAS reglas que el WPF (HekatanMathStudio/ArchivoHlisp.cs · ImportaHlisp):
//   «# título» «## sección» «#: párrafo» → texto · «#hide … #show» → bloque oculto · líneas de cálculo → ecuaciones (nodos editables)
//   Nombre{… @ …} → llamadas que entienden los nodos (simplify, diff, limit, taylor, sum, integral…) · nombres griegos latinos (xi → ξ) · «[m]» se quita · «@@(…)» y «'…» = comentario
//   Lo que los nodos no dibujan (#fplot con datos, #map, #surf, #anim, #dibujo, #modelo3d, #tabla…) queda TAL CUAL como «bloque LISP» (se edita como texto).
(function (G) {
  const HK = G.HK;
  const RxUnidad = /(?<=[\w)\]])\s+\[[A-Za-zµ°][^\]\[\s,;]*\]/g, RxBloque = /^(for|while|if|function)\b/;
  const Cierres = { dibujo: '#fin', autolisp: '#fin', dibujar: '#fin', fila: '#finfila', noc: '#equ', sust: '#nosust', triple: '#nosust' };
  const RxLlave = /(?<![A-Za-z])(Simplify|Expand|Diff|Slope|Derivate|Partial|Limit|Taylor|Sum|Suma|Integral|Area)\{/g;
  const omitidas = {};
  function partesAt(s, sep) {
    const r = []; let prof = 0, ini = 0;
    for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[' || c === '{') prof++; else if (c === ')' || c === ']' || c === '}') prof--; else if (c === sep && prof === 0) { r.push(s.slice(ini, i).trim()); ini = i + 1; } }
    r.push(s.slice(ini).trim()); return r;
  }
  function traduceLlaves(s) {
    for (let guarda = 0; guarda < 40; guarda++) {
      const ms = [...s.matchAll(RxLlave)]; if (!ms.length) return s; const m = ms[ms.length - 1];          // la llave más INTERNA primero
      const a = m.index + m[0].length; let prof = 1, z = a; while (z < s.length && prof > 0) { if (s[z] === '{') prof++; else if (s[z] === '}') prof--; z++; }
      if (prof !== 0) return s; const interior = s.slice(a, z - 1), arr = partesAt(interior, '@'), cuerpo = arr[0], resto = arr.length > 1 ? arr[1] : null; let rep = null;
      switch (m[1]) {
        case 'Simplify': case 'Expand': rep = cuerpo; break;          // como Hekatan LISP: se dibuja solo la expresión y su resultado («→»), sin el nombre de la función en texto plano
        case 'Diff': case 'Slope': case 'Derivate': if (resto !== null) rep = 'diff(' + cuerpo + ', ' + resto.split(',')[0].trim() + ')'; break;
        case 'Partial': if (resto !== null) rep = 'pdiff(' + cuerpo + ', ' + resto.split(',')[0].trim() + ')'; break;
        case 'Limit': { const q = resto ? resto.split('=') : null; if (q && q.length === 2) rep = 'limit(' + cuerpo + ', ' + q[0].trim() + ', ' + q[1].trim() + ')'; break; }
        case 'Taylor': { const i = resto ? resto.indexOf('=') : -1, q = i >= 0 ? [resto.slice(0, i), resto.slice(i + 1)] : null, w = q ? q[1].split(':') : null; if (w && w.length === 2) rep = 'taylor(' + cuerpo + ', ' + q[0].trim() + ', ' + w[0].trim() + ', ' + w[1].trim() + ')'; break; }
        case 'Sum': case 'Suma': { const q = resto ? resto.split(':') : null; if (q && q.length === 2) rep = 'sum(' + cuerpo + ', ' + q[0].trim() + ', ' + q[1].trim() + ')'; break; }
        case 'Integral': case 'Area': { const i = resto ? resto.indexOf('=') : -1, q = i >= 0 ? [resto.slice(0, i), resto.slice(i + 1)] : null, w = q ? q[1].split(':') : null; if (w && w.length === 2) rep = 'integral(' + cuerpo + ', ' + q[0].trim() + ', ' + w[0].trim() + ', ' + w[1].trim() + ')'; break; }
      }
      if (rep === null) return s;          // algo sin traducir: queda con llaves
      s = s.slice(0, m.index) + rep + s.slice(z);
    }
    return s;
  }
  // #fplot(f1, f2, [a b]) → gráfica nativa de la web (fplot con ejes y leyenda); con datos «[x y; x y]» queda como bloque LISP
  function traduceFplot(linea) {
    const m = /^#fplot\s*\((.*)\)\s*$/.exec(linea.trim()); if (!m) return null;
    const args = partesAt(m[1].replace(/·/g, '*'), ','); if (args.length < 2) return null;
    const rg = /^\[\s*(-?[\d.eE+-]+)[\s,;]+(-?[\d.eE+-]+)\s*\]$/.exec(args[args.length - 1]); if (!rg) return null;
    const ex = [];
    for (let k = 0; k < args.length - 1; k++) { const e = args[k].trim(), nm = /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.*)$/u.exec(e), expr = nm ? nm[2].trim() : e; if (expr.startsWith('[') && expr.includes(';')) return null; ex.push(expr); }
    return 'fplot(' + ex.join(', ') + ', [' + rg[1] + ', ' + rg[2] + '])';
  }
  function lineaLisp(l) {
    const md = /\s*@@\((.*)\)\s*$/.exec(l); if (md) l = l.slice(0, md.index) + " '" + md[1].trim();          // «@@(descripción)» = comentario gris
    let enCad = false, k = -1;
    for (let i = 0; i < l.length; i++) { if (l[i] === '"') enCad = !enCad; else if (!enCad && l[i] === "'" && i > 0 && /\s/.test(l[i - 1]) && i + 1 < l.length && !/\s/.test(l[i + 1])) { k = i; break; } }
    let cod = k >= 0 ? l.slice(0, k) : l; const com = k >= 0 ? l.slice(k + 1) : null;
    cod = cod.replace(/·/g, '*').replace(RxUnidad, '');
    if (cod.includes('{')) cod = traduceLlaves(cod);
    return com !== null ? cod.replace(/\s+$/, '') + ' % ' + com.trim() : cod;
  }
  const GR = { alpha: 'α', beta: 'β', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', kappa: 'κ', mu: 'μ', nu: 'ν', xi: 'ξ', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', psi: 'ψ', omega: 'ω' };
  const RxGriega = new RegExp('(?<![A-Za-z0-9À-ɏ])(' + Object.keys(GR).join('|') + ')(?![A-Za-z0-9À-ɏ(])', 'g');
  function griegasEnCodigo(fuente) {
    return fuente.replace(/\r\n/g, '\n').split('\n').map((l) => { const t = l.trimStart(); return !t || t.startsWith('#') || t.startsWith('%') || t.startsWith("'") ? l : l.replace(RxGriega, (x) => GR[x]); }).join('\n');
  }
  function lineaValida(l) {          // ¿la entienden los nodos? En el WPF (Codigo.AFilas) fallan: llaves sin traducir, líneas que empiezan por «;», varias sentencias con «;», «[-]» (unidad suelta) y vectores con elementos separados por espacio «[1 x y]»
    const c = l.split('%')[0];
    if (/[{}]/.test(c) || /^\s*;/.test(c)) return false;
    let prof = 0; for (let i = 0; i < c.length; i++) { const k = c[i]; if (k === '(' || k === '[') prof++; else if (k === ')' || k === ']') prof--; else if (k === ';' && prof === 0 && /\S/.test(c.slice(i + 1))) return false; }
    for (const m of c.matchAll(/\[([^\[\]]*)\]/g)) {
      if (/^\s*[-+*\/]?\s*$/.test(m[1])) return false;
      for (const fila of m[1].split(';')) if (!fila.includes(',')) { const f = fila.trim(), lim = f.match(/[\w)\]](?=\s+[\w(\['"])/g) || []; if (lim.length >= 2 || /[\d.]\s+[\d.]/.test(f)) return false; }          // «[1 x]» vale (producto implícito); «[1 x y]» y «[1 0]» no
    }
    return true;
  }
  // Matemática dentro de un párrafo «#:», sin símbolos extra (igual que Hekatan LISP web): det(A) → |A| · adj(A) · inv(A) → A⁻¹ ·
  // transpose(A) → Aᵀ · A^-1 y A^T → exponente · a*d (sin espacios) → a·d · A_1 → subíndice. Devuelve HTML (solo B I SUB SUP) o null
  // si el párrafo no trae nada de eso (entonces queda como texto, igual que antes).
  function prosaHtml(texto) {
    let h = String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), cambio = false;
    const nom = (n) => { const k = n.indexOf('_'); return k > 0 && k < n.length - 1 ? '<i>' + n.slice(0, k) + '</i><sub>' + n.slice(k + 1) + '</sub>' : '<i>' + n + '</i>'; };
    const ID = '(\\p{L}[\\p{L}\\p{N}_]*)', ANTES = '(?<![\\p{L}\\p{N}_])';
    const rep = (re, f) => { h = h.replace(re, (...a) => { cambio = true; return f(a); }); };
    rep(new RegExp(ANTES + 'det\\(\\s*' + ID + '\\s*\\)', 'gu'), (a) => '|' + nom(a[1]) + '|');
    rep(new RegExp(ANTES + 'adj\\(\\s*' + ID + '\\s*\\)', 'gu'), (a) => 'adj(' + nom(a[1]) + ')');
    rep(new RegExp(ANTES + 'inv\\(\\s*' + ID + '\\s*\\)', 'gu'), (a) => nom(a[1]) + '<sup>−1</sup>');
    rep(new RegExp(ANTES + 'transpose\\(\\s*' + ID + '\\s*\\)', 'gu'), (a) => nom(a[1]) + '<sup>T</sup>');
    rep(new RegExp(ANTES + ID + '\\^(-1|T)(?![\\p{L}\\p{N}])', 'gu'), (a) => nom(a[1]) + '<sup>' + (a[2] === '-1' ? '−1' : 'T') + '</sup>');
    if (cambio) h = h.replace(/(?<=[\p{L}\p{N})\]>])(?<!\*)\*(?!\*)(?=[\p{L}\p{N}(<])/gu, '·');
    // matrices literales [a, b; c, d] dibujadas (corchetes, filas y columnas) y «1/det·[...]» con su fracción; letra griega + letras = subíndice (αij → α_ij)
    const TD = 'padding:1px 9px;text-align:center;white-space:nowrap';
    const celda = (c) => c.trim().replace(/([α-ωΑ-Ω])([A-Za-z]{1,2})(?![\p{L}\p{N}])/gu, '$1<sub>$2</sub>');
    const matriz = (cuerpo) => '<table style="display:inline-table;vertical-align:middle;border-collapse:separate;border-left:2px solid #1d2430;border-right:2px solid #1d2430;border-radius:7px;margin:0 3px">' + cuerpo.split(';').map((f) => '<tr>' + f.split(',').map((c) => '<td style="' + TD + '">' + celda(c) + '</td>').join('') + '</tr>').join('') + '</table>';
    const frac = (n, d) => '<span style="display:inline-block;vertical-align:middle;text-align:center;margin:0 3px"><span style="display:block;border-bottom:1px solid #1d2430;padding:0 4px">' + n + '</span><span style="display:block;padding:0 4px">' + d + '</span></span>';
    h = h.replace(/(?<![\p{L}\p{N}_])1\/(det)\s*·?\s*\[([^\[\]]*;[^\[\]]*)\]/gu, (m, d, c) => { cambio = true; return frac('1', d) + matriz(c); });
    h = h.replace(/\[([^\[\]<>]*;[^\[\]<>]*)\]/g, (m, c) => { cambio = true; return matriz(c); });
    h = h.replace(/(?<![\p{L}\p{N}_<\/])([α-ωΑ-Ω])([A-Za-z]{1,2})(?![\p{L}\p{N}_>])(?![^<]*<\/td>)/gu, (m, g, s2) => { cambio = true; return g + '<sub>' + s2 + '</sub>'; });
    // **negrita** y *cursiva* (markdown de los párrafos «#:», como en Hekatan LISP web)
    const md = h.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/gu, '<b>$1</b>').replace(/(?<![\p{L}\p{N}*])\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*(?![\p{L}\p{N}*])/gu, '<i>$1</i>');
    if (md !== h) { h = md; cambio = true; }
    return cambio ? h : null;
  }
  function importa(fuente) {
    fuente = griegasEnCodigo(fuente); for (const k in omitidas) delete omitidas[k];
    const items = []; let bloque = [], original = [], prof = 0, oculto = false, primera = true;
    const raw = (texto, oc) => items.push({ t: 'raw', text: texto, oculto: !!oc });
    const cuenta = (n) => { omitidas[n] = (omitidas[n] || 0) + 1; };
    function vacia() {
      if (!bloque.length) return; let cod = bloque.join('\n');
      if (!oculto && bloque.length === 1) {          // «x = expr» se ve con su resultado: se define y se muestra (como «x = expr» + «x»)
        const sc1 = cod.split('%')[0].trim(), md1 = /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*[^=]/u.exec(sc1);
        if (md1 && !RxBloque.test(sc1) && !sc1.endsWith(';')) cod += '\n' + md1[1];
      }
      const bal = (s) => { let p = 0; for (const k of s.split('%')[0].replace(/"[^"]*"/g, '')) { if (k === '(') p++; else if (k === ')') p--; } return p; };
      if (!bloque.every(lineaValida) || bloque.reduce((s, x) => s + bal(x), 0) !== 0) { omitidas['(codigo)'] = (omitidas['(codigo)'] || 0) + 1; raw(original.join('\n'), oculto); bloque = []; original = []; return; }          // lo que los nodos no entienden queda como bloque LISP (como el WPF)
      const d = { t: 'eq', codigo: cod, orig: original.join('\n') }; if (oculto) d.oculto = true; items.push(d);
      bloque = []; original = [];
    }
    const lin = fuente.replace(/\r/g, '').split('\n'); let i = 0;
    while (i < lin.length) {
      const l = lin[i].replace(/\s+$/, ''), t = l.trim(); i++;
      if (t === '') { if (prof === 0 && !oculto) vacia(); continue; }
      if (t === '#hide') { vacia(); oculto = true; continue; }
      if (t === '#show') { vacia(); oculto = false; continue; }
      if (t.startsWith('#:')) { vacia(); const tx = t.slice(2).trim(), ph = prosaHtml(tx); items.push(ph ? { t: 'texto', text: tx, html: ph } : { t: 'texto', text: tx }); continue; }
      if (t.startsWith('##')) { vacia(); const nv = t.match(/^#+/)[0].length; items.push({ t: 'texto', text: t.replace(/^#+/, '').trim(), titulo: true, nivel: Math.min(nv, 3) }); continue; }
      if (t.startsWith('# ') && primera) { vacia(); items.push({ t: 'texto', text: t.slice(1).trim(), titulo: true, nivel: 1 }); primera = false; continue; }
      if (t.startsWith('# ') || t === '#') continue;          // comentario de la hoja: no se dibuja
      if (t.startsWith('#')) {          // directiva de Hekatan LISP
        vacia(); primera = false; const nombre = (/^#(\w+)/.exec(t) || [])[1] || '', txt = [l];
        if (nombre === 'numerico' || nombre === 'simbolico') { cuenta('#' + nombre + ' (sin efecto)'); continue; }
        if (nombre === 'fplot') { const cod = traduceFplot(t); if (cod) { items.push(oculto ? { t: 'eq', codigo: cod, modo: 0, oculto: true, orig: '' } : { t: 'eq', codigo: cod, modo: 0, orig: '' }); cuenta('#fplot (nativa)'); continue; } }
        if (t.startsWith('#|')) while (i < lin.length && lin[i].trimStart().startsWith('#|')) { txt.push(lin[i].replace(/\s+$/, '')); i++; }
        let cierre = Cierres[nombre] || null; if (!cierre && nombre === 'anim' && /^#anim\s*\(/.test(t)) cierre = '#finanim';
        if (cierre) while (i < lin.length) { const q = lin[i].replace(/\s+$/, ''); txt.push(q); i++; if (q.trim() === cierre) break; }
        cuenta('#' + nombre); raw(txt.join('\n'), oculto); continue;
      }
      primera = false;
      {          // fórmula con llaves y rótulo al final «'Ec. (n) · qué es»: la fórmula es un nodo y el rótulo un texto en la misma línea
        let kc = -1, enC = false;
        for (let q = 0; q < l.length; q++) { if (l[q] === '"') enC = !enC; else if (!enC && l[q] === "'" && q > 0 && /\s/.test(l[q - 1]) && q + 1 < l.length && !/\s/.test(l[q + 1])) { kc = q; break; } }
        if (kc > 0 && l.slice(0, kc).includes('{') && prof === 0 && !oculto) {
          const cf = lineaLisp(l.slice(0, kc)); bloque.push(cf.trim()); original.push(l.slice(0, kc).replace(/\s+$/, '')); vacia();
          items.push({ t: 'texto', text: l.slice(kc + 1).trim(), mismaLinea: true }); continue;
        }
      }
      const c = lineaLisp(l), sc = c.split('%')[0].trim();
      if (RxBloque.test(sc)) prof++; else if (sc === 'end' || sc === 'end;') prof--;
      bloque.push(c.trim()); original.push(l);
      if (prof === 0 && !oculto) vacia();
    }
    vacia();
    return { formato: 'hmath 1', estilo: 'lisp', eq: 15.33, txt: 15, gap: 0, items };
  }
  // ---------------------------------------------------------------- hoja → texto de Hekatan LISP (lo inverso de importa): «# título» «## sección» «#: párrafo» · cálculo tal cual · #fplot · bloques LISP tal cual
  function exporta(json) {
    const d = typeof json === 'string' ? JSON.parse(json) : json, o = []; let oc = false;
    const ocultar = (x) => { if (!!x.oculto !== oc) { o.push(x.oculto ? '#hide' : '#show'); oc = !!x.oculto; } };
    const prm = (seg) => seg.map((g) => g.eq !== undefined ? g.eq : g.s !== undefined ? g.s : '').join('');
    const unaLinea = (s) => String(s).replace(/\s*\n\s*/g, ' ').trim();
    (d.items || []).forEach((x) => {
      ocultar(x);
      if (x.t === 'texto' || x.t === 'parrafo') {
        const t = unaLinea(x.t === 'texto' ? x.text : prm(x.seg || [])); if (!t) return;
        if (x.titulo) o.push('#'.repeat(Math.min(3, x.nivel || 1)) + ' ' + t); else o.push('#: ' + t);
      } else if (x.t === 'eq') {
        let ls = String(x.codigo || '').replace(/\r/g, '').split('\n'); if (!ls.length || !ls.join('').trim()) return;
        ls = ls.filter((l, i) => !(l.trim() === '' && (i === 0 || i === ls.length - 1))); { let q = ls.length - 1; while (q > 0 && ls[q].trim() === '') q--; const m = q > 0 ? /^([\p{L}_][\p{L}\p{N}_]*)\s*=/u.exec(ls[q - 1]) : null; if (m && ls[q].trim() === m[1]) ls = ls.slice(0, q).concat(ls.slice(q + 1)); }          // «x = expr» + «x»: el eco lo pone la importación
        o.push(ls.map((l) => { l = l.replace(/^(\s*)fplot\s*\((.*)\[\s*([^\],]+?)\s*[, ]\s*([^\],]+?)\s*\]\s*\)\s*$/, '$1#fplot($2[$3 $4])'); return l.replace(/\s+%\s*(.*)$/, " '$1"); }).join('\n'));
      } else if (x.t === 'slider') o.push(x.nombre + ' = ' + x.valor + " 'deslizador " + x.min + ' … ' + x.max);
      else if (x.t === 'cad') o.push('#autolisp\n' + String(x.codigo || '').replace(/\s+$/, '') + '\n#fin');
      else if (x.t === 'raw') o.push(String(x.text || '').replace(/\s+$/, ''));
    });
    if (oc) o.push('#show');
    return o.join('\n\n') + '\n';
  }
  HK.hlisp = { importa, exporta, omitidas, esHlisp: (nombre, texto) => /\.(lisp|hlisp)$/i.test(nombre || '') || (!/^\s*[{\[]/.test(texto || '') && /^\s*#/m.test(texto || '')) };
})(window);
