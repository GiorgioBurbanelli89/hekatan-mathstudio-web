// Hekatan Math Studio Web — abre hojas de Hekatan LISP (.lisp / .hlisp), con las MISMAS reglas que el WPF (HekatanMathStudio/ArchivoHlisp.cs · ImportaHlisp):
//   «# título» «## sección» «#: párrafo» → texto · «#hide … #show» → bloque oculto · líneas de cálculo → ecuaciones (nodos editables)
//   Nombre{… @ …} → llamadas que entienden los nodos (simplify, diff, limit, taylor, sum, integral…) · nombres griegos latinos (xi → ξ) · «[m]» se quita · «@@(…)» y «'…» = comentario
//   Lo que los nodos no dibujan (#fplot con datos, #map, #surf, #anim, #dibujo, #modelo3d, #tabla…) queda TAL CUAL como «bloque LISP» (se edita como texto).
(function (G) {
  const HK = G.HK;
  const RxUnidad = /(?<=[\w)\]])\s+\[[A-Za-zµ°][^\]\[\s,;]*\]/g, RxBloque = /^(for|while|if|function)\b/;
  const Cierres = { dibujo: '#fin', autolisp: '#fin', dibujar: '#fin', fila: '#finfila', noc: '#equ' };          // #sust/#triple/#equ/#val/#nosust NO son bloques: son MODOS de mostrar (no se tragan el resto de la hoja)
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
    for (let k = 0; k < args.length - 1; k++) { const e = args[k].trim(), nm = /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.*)$/u.exec(e), expr = nm ? nm[2].trim() : e;
      if (nm && nm[1] === 'puntos' && /^\[.*\]$/.test(expr)) { ex.push('puntos([' + expr.slice(1, -1).split(';').map((f) => f.trim().split(/[\s,]+/).filter(Boolean).join(', ')).join('; ') + '])'); continue; }          // «puntos = [x y; x y]»: marcas en esos puntos (como Hekatan LISP), no una curva
      if (expr.startsWith('[') && expr.includes(';')) return null; ex.push(nm ? nm[1] + ' == ' + expr : expr); }          // «ec_1 = …»: el nombre va a la leyenda (como Hekatan LISP); «==» para que no sea una asignación
    return 'fplot(' + ex.join(', ') + ', [' + rg[1] + ', ' + rg[2] + '])';
  }
  // «texto $ecuación$ texto» → párrafo del WPF [{s:texto,b}, {eq:código,m:2}, …]: Math Studio mezcla texto y expresión matemática en la misma línea
  function parrafoMixto(tx) {
    const seg = []; let b = false;
    const trozo = (q) => {          // «A^{-1}», «ε_{x}»: superíndice / subíndice (va: 'sup' | 'sub'), como HlispMixto.cs del escritorio
      const re2 = /([\^_])\{([^{}]*)\}/g; let k0 = 0, m2;
      const pon = (s, va) => { if (!s) return; const g = { s }; if (va) g.va = va; if (b) g.b = 1; seg.push(g); };
      while ((m2 = re2.exec(q))) { pon(q.slice(k0, m2.index)); pon(m2[1] === '^' ? m2[2].replace(/-/g, '−') : m2[2], m2[1] === '^' ? 'sup' : 'sub'); k0 = m2.index + m2[0].length; }
      pon(q.slice(k0));
    };
    const texto = (s) => s.split('**').forEach((q, i) => { if (i) b = !b; if (q) trozo(q); });
    const re = /\$([^$]+)\$/g; let k = 0, m;
    while ((m = re.exec(tx))) {
      texto(tx.slice(k, m.index));
      const pz = []; let pr = 0, i0 = 0; const s0 = m[1];          // «$ec1; ec2; ec3$» = SISTEMA con llave (como Hekatan LISP y el WPF); los «;» de una matriz [a; b] no cuentan
      for (let i = 0; i < s0.length; i++) { const c = s0[i]; if ('([{'.includes(c)) pr++; else if (')]}'.includes(c)) pr--; else if (c === ';' && pr === 0) { pz.push(s0.slice(i0, i)); i0 = i + 1; } }
      pz.push(s0.slice(i0)); const ecs = pz.filter(q => q.trim());
      if (ecs.length > 1) seg.push({ sis: ecs.map(q => lineaLisp(q.trim()).split(' % ')[0]), m: 2 });
      else seg.push({ eq: lineaLisp(m[1].trim()).split(' % ')[0], m: 2 });
      k = m.index + m[0].length;
    }
    texto(tx.slice(k)); return { t: 'parrafo', seg };
  }
  // En Hekatan LISP «[a, b, c]» (una fila, con comas) es un VECTOR 1D = columna: su transpose es fila y transpose(v)·M multiplica.
  // En los nodos «[a, b, c]» es una fila 1×n: se reescribe «[a; b; c]» (con «;» ya es matriz y no se toca). Igual que el WPF (ArchivoHlisp.VectoresColumna).
  function vectoresColumna(s) {
    const c = s.split(''), pila = [], pares = []; let enCad = false;
    for (let i = 0; i < s.length; i++) { const k = s[i]; if (k === '"') enCad = !enCad; if (enCad) continue; if (k === '[') pila.push(i); else if (k === ']' && pila.length) pares.push([pila.pop(), i]); }
    for (const [a, z] of pares) {
      let prof = 0, punto = false; const comas = [];
      for (let i = a + 1; i < z; i++) { const k = s[i]; if ('([{'.includes(k)) prof++; else if (')]}'.includes(k)) prof--; else if (prof === 0 && k === ';') punto = true; else if (prof === 0 && k === ',') comas.push(i); }
      if (!punto) for (const k of comas) c[k] = ';';
    }
    return c.join('');
  }
  function lineaLisp(l) {
    const md = /\s*@@\((.*)\)\s*$/.exec(l); if (md) l = l.slice(0, md.index) + " '" + md[1].trim();          // «@@(descripción)» = comentario gris
    let enCad = false, k = -1;
    for (let i = 0; i < l.length; i++) { if (l[i] === '"') enCad = !enCad; else if (!enCad && l[i] === "'" && i > 0 && /\s/.test(l[i - 1]) && i + 1 < l.length && !/\s/.test(l[i + 1])) { k = i; break; } }
    let cod = k >= 0 ? l.slice(0, k) : l; const com = k >= 0 ? l.slice(k + 1) : null;
    cod = cod.replace(/·/g, '*').replace(RxUnidad, '');
    if (cod.includes('{')) cod = traduceLlaves(cod);
    if (cod.includes('[')) cod = vectoresColumna(cod);
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
    rep(/\^\{([^{}]*)\}/g, (a) => '<sup>' + a[1].replace(/-/g, '−') + '</sup>');          // A^{-1}, (cof(A))^{T}: superíndice (como el render de Hekatan LISP)
    rep(/_\{([^{}]*)\}/g, (a) => '<sub>' + a[1] + '</sub>');
    rep(/(?<![\p{L}\p{N}_&#])(\p{L}{1,3})_([\p{L}\p{N}]{1,4})(?![\p{L}\p{N}_])/gu, (a) => a[1] + '<sub>' + a[2] + '</sub>');          // A_n, K_ff, u_f en la prosa: subíndice (como Hekatan LISP)
    if (cambio) h = h.replace(/(?<=[\p{L}\p{N})\]>])(?<!\*)\*(?!\*)(?=[\p{L}\p{N}(<])/gu, '·');
    // matrices literales [a, b; c, d] dibujadas (corchetes, filas y columnas) y «1/det·[...]» con su fracción; letra griega + letras = subíndice (αij → α_ij)
    const TD = 'padding:1px 9px;text-align:center;white-space:nowrap';
    const celda = (c) => c.trim().replace(/^(ok|mal):\s*/, '').replace(/([α-ωΑ-Ω])_?([A-Za-z]{1,2})(?![\p{L}\p{N}])/gu, '$1<sub>$2</sub>');
    const estCas = (c) => { const m = /^\s*(ok|mal):/.exec(c); return m ? (m[1] === 'ok' ? ';background:#dff3e6;color:#1e8449;font-weight:600;border-radius:5px' : ';background:#fbe3e0;color:#c0392b;font-weight:600;border-radius:5px') : ''; };
    const matriz = (cuerpo) => '<table style="display:inline-table;vertical-align:middle;border-collapse:separate;border-left:1.5px solid #1d2430;border-right:1.5px solid #1d2430;margin:0 3px;background:linear-gradient(#1d2430,#1d2430) left top/5px 1.5px no-repeat,linear-gradient(#1d2430,#1d2430) left bottom/5px 1.5px no-repeat,linear-gradient(#1d2430,#1d2430) right top/5px 1.5px no-repeat,linear-gradient(#1d2430,#1d2430) right bottom/5px 1.5px no-repeat">' + cuerpo.split(';').map((f) => '<tr>' + f.split(',').map((c) => '<td style="' + TD + estCas(c) + '">' + celda(c) + '</td>').join('') + '</tr>').join('') + '</table>';
    const frac = (n, d) => '<span style="display:inline-block;vertical-align:middle;text-align:center;margin:0 3px"><span style="display:block;border-bottom:1px solid #1d2430;padding:0 4px">' + n + '</span><span style="display:block;padding:0 4px">' + d + '</span></span>';
    h = h.replace(/(?<![\p{L}\p{N}_])1\/(det)\s*·?\s*\[([^\[\]]*;[^\[\]]*)\]/gu, (m, d, c) => { cambio = true; return frac('1', d) + matriz(c); });
    h = h.replace(/\[([^\[\]<>]*;[^\[\]<>]*)\]/g, (m, c) => { if (!/(^|[;,])\s*(ok|mal):/.test(c)) return m; cambio = true; return matriz(c); });          // «A_n = [4, 7; 2, d]» queda como TEXTO en la frase (como Hekatan LISP); solo las tablas de fe de erratas (ok:/mal:) se dibujan
    h = h.replace(/(?<![\p{L}\p{N}_<\/])([α-ωΑ-Ω])_?([A-Za-z]{1,2})(?![\p{L}\p{N}_>])(?![^<]*<\/td>)/gu, (m, g, s2) => { cambio = true; return g + '<sub>' + s2 + '</sub>'; });
    // **negrita** y *cursiva* (markdown de los párrafos «#:», como en Hekatan LISP web)
    const md = h.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/gu, '<b>$1</b>').replace(/(?<![\p{L}\p{N}*])\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*(?![\p{L}\p{N}*])/gu, '<i>$1</i>');
    if (md !== h) { h = md; cambio = true; }
    const tj = /^\s*<b>(Lo correcto|Correcta|Inversa correcta)\b/i.test(h) ? ['ok', 'CORRECTA', '#dff3e6', '#1e8449'] : /^\s*<b>(Lo mal tipeado|Impresa|Mal tipeada)\b/i.test(h) ? ['mal', 'IMPRESA EN EL LIBRO', '#fbe3e0', '#c0392b'] : null;
    if (tj) { h = '<div style="background:#f3f6fa;border-left:5px solid ' + tj[3] + ';border-radius:8px;padding:8px 14px;margin:6px 0"><span style="background:' + tj[2] + ';color:' + tj[3] + ';font-weight:700;font-size:12px;padding:2px 9px;border-radius:12px">' + tj[1] + '</span><br>' + h + '</div>'; cambio = true; }
    return cambio ? h : null;
  }
  function importa(fuente) {
    fuente = griegasEnCodigo(fuente); for (const k in omitidas) delete omitidas[k];
    const items = []; let bloque = [], original = [], prof = 0, oculto = false, primera = true, numerico = false;
    const raw = (texto, oc) => items.push({ t: 'raw', text: texto, oculto: !!oc });
    const cuenta = (n) => { omitidas[n] = (omitidas[n] || 0) + 1; };
    function vacia() {
      if (!bloque.length) return; let cod = bloque.join('\n');
      if (!oculto && bloque.length === 1) {          // «x = expr» se ve con su resultado: se define y se muestra (como «x = expr» + «x»)
        const sc1 = cod.split('%')[0].trim(), md1 = /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*[^=]/u.exec(sc1);
        if (md1 && !RxBloque.test(sc1) && !sc1.endsWith(';')) {          // UNA sola línea (no repetir la variable debajo): «x = 8» se queda así; «R = √(…)» → «R = √(…) = 23.4» con el resultado al final
          const der = sc1.slice(sc1.indexOf('=') + 1).trim(), com = cod.indexOf(' % ') >= 0 ? cod.slice(cod.indexOf(' % ')) : '';
          if (der === md1[1]) cod = md1[1] + ' =' + com;          // «F = F» (volver a mostrar una variable) → «F = 1.44»
          else if (!/^-?[\d.]+([eE][+-]?\d+)?$/.test(der) && !/^\[[^\[\]()*\/^]*\]$/.test(der)) cod = sc1 + ' =' + com;          // «A = [a, b; c, d]» (matriz literal) se ve UNA vez, sin repetir «= [..]» (como ArchivoHlisp.Vacia del escritorio)
        }
      }
      const bal = (s) => { let p = 0; for (const k of s.split('%')[0].replace(/"[^"]*"/g, '')) { if (k === '(') p++; else if (k === ')') p--; } return p; };
      if (!bloque.every(lineaValida) || bloque.reduce((s, x) => s + bal(x), 0) !== 0) { omitidas['(codigo)'] = (omitidas['(codigo)'] || 0) + 1; raw(original.join('\n'), oculto); bloque = []; original = []; return; }          // lo que los nodos no entienden queda como bloque LISP (como el WPF)
      const d = { t: 'eq', codigo: cod, orig: original.join('\n') }; if (oculto) d.oculto = true; items.push(d);
      bloque = []; original = [];
    }
    const lin = fuente.replace(/\r/g, '').split('\n'); let i = 0; const misma = [];
    while (i < lin.length) {
      let l = lin[i].replace(/\s+$/, ''), t = l.trim(); i++;
      if (/^&&(\s|$)/.test(t)) { vacia(); misma.push(items.length); l = l.replace(/^(\s*)&&\s?/, '$1'); t = l.trim(); }          // «&& …»: lo que sigue va en la MISMA fila que lo anterior (si no, cada bloque baja a una fila nueva)
      if (t === '') { if (prof === 0 && !oculto) vacia(); continue; }
      if (t === '#hide') { vacia(); oculto = true; continue; }
      if (/^#(sust|sustituir|triple|equ|nosust|val|valor)\s*$/.test(t)) { vacia(); cuenta('#modo (sust/equ/val)'); continue; }          // modo de Hekatan LISP: fórmula = números = valor; aquí se muestra fórmula = valor
      if (t === '#show') { vacia(); oculto = false; continue; }
      if (t.startsWith('#:') && /\$[^$]+\$/.test(t)) { vacia(); items.push(parrafoMixto(t.slice(2).trim())); continue; }          // «#: texto $ecuación$ texto»: las ecuaciones entre $…$ van dibujadas DENTRO de la frase
      if (t.startsWith('#:')) { vacia(); const tx = t.slice(2).trim(), ph = prosaHtml(tx); items.push(ph ? { t: 'texto', text: tx, html: ph } : { t: 'texto', text: tx }); continue; }
      if (t.startsWith('##')) { vacia(); const nv = t.match(/^#+/)[0].length; const tt = t.replace(/^#+/, '').trim(), it = { t: 'texto', text: tt, titulo: true, nivel: Math.min(nv, 3) }; if (/[\^_]\{/.test(tt)) { const ph = prosaHtml(tt); if (ph) it.html = ph; } items.push(it); continue; }          // «## A·A^{-1} = I»: el exponente también en el título
      if (t.startsWith('# ') && primera) { vacia(); items.push({ t: 'texto', text: t.slice(1).trim(), titulo: true, nivel: 1 }); primera = false; continue; }
      if (t.startsWith('# ') || t === '#') continue;          // comentario de la hoja: no se dibuja
      if (t.startsWith('#')) {          // directiva de Hekatan LISP
        vacia(); primera = false; const nombre = (/^#(\w+)/.exec(t) || [])[1] || '', txt = [l];
        if (nombre === 'numerico' || nombre === 'simbolico') { if (nombre === 'numerico') numerico = true; cuenta('#' + nombre + ' (oculto)'); continue; }          // no se dibuja; la hoja queda marcada «numerico» (como el escritorio)
        if (nombre === 'fplot') { const cod = traduceFplot(t); if (cod) { items.push(oculto ? { t: 'eq', codigo: cod, modo: 0, oculto: true, orig: '' } : { t: 'eq', codigo: cod, modo: 0, orig: '' }); cuenta('#fplot (nativa)'); continue; } }
        if (nombre === 'slider') {          // #slider fplot(f1, f2, [a b]), n = lo:hi → un deslizador de la hoja (n) y la gráfica nativa que lo usa: al moverlo la curva se redibuja
          const ms = /^#slider\s+(fplot|fresorte|fresortesim|ftrocito|friemann)\s*\((.*)\)\s*,\s*([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(-?[\d.eE+-]+)\s*:\s*(-?[\d.eE+-]+)\s*$/u.exec(t), cod = ms && (ms[1] === 'fplot' ? traduceFplot('#fplot(' + ms[2] + ')') : ms[1] + '(' + ms[2].replace(/·/g, '*') + ')');
          if (ms && cod) { const lo = parseFloat(ms[4]), hi = parseFloat(ms[5]); items.push({ t: 'slider', nombre: ms[3], min: lo, max: hi, valor: (lo + hi) / 2, inc: (hi - lo) / 50 }, oculto ? { t: 'eq', codigo: cod, modo: 0, oculto: true, orig: '' } : { t: 'eq', codigo: cod, modo: 0, orig: '' }); cuenta('#slider fplot (nativa)'); continue; }
        }
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
    for (const k of misma) if (items[k]) items[k].mismaLinea = true;
    const hoja = { formato: 'hmath 1', estilo: 'lisp', eq: 15.33, txt: 15, gap: 0, items }; if (numerico) hoja.numerico = true;
    return hoja;
  }
  // ---------------------------------------------------------------- hoja → texto de Hekatan LISP (lo inverso de importa): «# título» «## sección» «#: párrafo» · cálculo tal cual · #fplot · bloques LISP tal cual
  const GrafSlider = /^(fplot|fresorte|fresortesim|ftrocito|friemann)\s*\(/;
  function exporta(json) {
    const d = typeof json === 'string' ? JSON.parse(json) : json, o = []; let oc = false;
    const ocultar = (x) => { if (!!x.oculto !== oc) { o.push(x.oculto ? '#hide' : '#show'); oc = !!x.oculto; } };
    const prm = (seg) => seg.map((g) => Array.isArray(g.sis) ? '$' + g.sis.map(adiff).join('; ') + '$' : g.eq !== undefined ? '$' + adiff(g.eq) + '$' : g.s !== undefined ? ((s0) => g.b ? '**' + s0 + '**' : s0)(g.va === 'sup' ? '^{' + g.s.replace(/−/g, '-') + '}' : g.va === 'sub' ? '_{' + g.s + '}' : g.s) : '').join('');
    const unaLinea = (s) => String(s).replace(/\s*\n\s*/g, ' ').trim();
    // diff(a, v) / pdiff(a, v) (lo que guarda la hoja) -> Derivate{a @ v} / Partial{a @ v} (como se escribe en Hekatan LISP)
    const adiff = (s) => { let r = String(s); for (let g = 0; g < 30; g++) { const m = /(?<![\p{L}\p{N}_])(pdiff|diff)\(/u.exec(r); if (!m) break; const ini = m.index + m[0].length; let p = 1, k = ini, com = -1; for (; k < r.length && p > 0; k++) { const c = r[k]; if (c === '(' || c === '[' || c === '{') p++; else if (c === ')' || c === ']' || c === '}') p--; else if (c === ',' && p === 1 && com < 0) com = k; } if (p !== 0 || com < 0) break; r = r.slice(0, m.index) + (m[1] === 'pdiff' ? 'Partial' : 'Derivate') + '{' + r.slice(ini, com).trim() + ' @ ' + r.slice(com + 1, k - 1).trim() + '}' + r.slice(k); } return r; };
    // el texto con html (negritas/cursivas) vuelve a markdown: <b>x</b> -> **x**, <i>x</i> -> *x*
    const dehtml = (h) => String(h).replace(/<b>(.*?)<\/b>/gis, '**$1**').replace(/<i>(.*?)<\/i>/gis, '*$1*').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    let pend = null;          // un deslizador espera a la grafica que sigue: se escribe como «#slider grafica, n = lo:hi»
    let ultNom = null, ultEq = -1;          // nombre de la ultima «x = ...» y su posicion en o: el eco «x» y la nota de la misma linea se pegan a ella
    const mis = new Set();          // posiciones de o que van en la misma fila que la anterior («&& …»)
    (d.items || []).forEach((x) => {
      ocultar(x);
      if (pend && !(x.t === 'eq' && GrafSlider.test(String(x.codigo || '').trim()))) { o.push(pend.nombre + ' = ' + pend.valor + " 'deslizador " + pend.min + ' … ' + pend.max); pend = null; }
      const n0 = o.length;
      if (pend && x.t === 'eq') {          // el deslizador + su grafica vuelven a ser UNA directiva
        const cg = adiff(String(x.codigo || '').trim()).replace(/^fplot\s*\((.*)\[\s*([^\],]+?)\s*[, ]\s*([^\],]+?)\s*\]\s*\)\s*$/, 'fplot($1[$2 $3])');
        o.push('#slider ' + cg + ', ' + pend.nombre + ' = ' + pend.min + ':' + pend.max); pend = null; ultNom = null; ultEq = -1; return;
      }
      if (x.t === 'texto' || x.t === 'parrafo') {
        const t = unaLinea(x.t === 'texto' ? (x.fuente || (x.html && !x.titulo ? dehtml(x.html) : x.text)) : prm(x.seg || [])); if (!t) return;
        if (x.mismaLinea && x.t === 'texto' && !x.titulo && ultEq >= 0 && ultEq === o.length - 1 && !o[ultEq].includes('\n')) { if (!o[ultEq].endsWith("'" + t)) o[ultEq] += " '" + t; return; }          // «f = ... 'nota»: la nota va al final de la linea de la formula
        if (x.titulo) o.push('#'.repeat(Math.min(3, x.nivel || 1)) + ' ' + t); else o.push('#: ' + t);
      } else if (x.t === 'eq') {
        let ls = String(x.codigo || '').replace(/\r/g, '').split('\n'); if (!ls.length || !ls.join('').trim()) return;
        if (ultNom && String(x.codigo || '').trim() === ultNom && !x.mismaLinea) return;          // el eco «x» de «x = expr» lo pone la importacion
        ls = ls.filter((l, i) => !(l.trim() === '' && (i === 0 || i === ls.length - 1))); { let q = ls.length - 1; while (q > 0 && ls[q].trim() === '') q--; const m = q > 0 ? /^([\p{L}_][\p{L}\p{N}_]*)\s*=/u.exec(ls[q - 1]) : null; if (m && ls[q].trim() === m[1]) ls = ls.slice(0, q).concat(ls.slice(q + 1)); }          // «x = expr» + «x»: el eco lo pone la importación
        { const mnom = /^([\p{L}_][\p{L}\p{N}_]*)\s*=[^=]/u.exec(ls[ls.length - 1] || ''); ultNom = mnom && ls.length === 1 ? mnom[1] : null; }
        o.push(ls.map((l) => { if (/^\s*fplot\s*\(/.test(l)) l = l.replace(/\s*==\s*/g, ' = ').replace(/puntos\(\[([^\]]*)\]\)/g, (m0, q) => 'puntos = [' + q.split(';').map((f) => f.split(',').map((s) => s.trim()).join(' ')).join('; ') + ']');          // vuelve a la forma de Hekatan LISP: «ec_1 = …», «puntos = [x y]»
          l = adiff(l).replace(/^(\s*)fplot\s*\((.*)\[\s*([^\],]+?)\s*[, ]\s*([^\],]+?)\s*\]\s*\)\s*$/, '$1#fplot($2[$3 $4])'); return l.replace(/\s+%\s*(.*)$/, " '$1"); }).join('\n'));
      } else if (x.t === 'slider') pend = x;
      else if (x.t === 'cad') o.push('#autolisp\n' + String(x.codigo || '').replace(/\s+$/, '') + '\n#fin');
      else if (x.t === 'raw') o.push(String(x.text || '').replace(/\s+$/, ''));
      if (x.t === 'eq' && o.length > n0) ultEq = o.length - 1; else if (x.t !== 'texto' || !x.mismaLinea) { ultEq = -1; if (x.t !== 'eq') ultNom = null; }
      if (x.mismaLinea && o.length > n0 && n0 > 0 && !/^#(hide|show)$/.test(o[n0 - 1] || '')) { o[n0] = '&& ' + o[n0]; mis.add(n0); }
    });
    if (pend) o.push(pend.nombre + ' = ' + pend.valor + " 'deslizador " + pend.min + ' … ' + pend.max);
    if (oc) o.push('#show');
    if (d.numerico && !o.some((s) => /^#numerico\b/.test(s))) { const k = o.length && /^#\s/.test(o[0]) ? 1 : 0; o.splice(k, 0, '#numerico'); const m2 = new Set([...mis].map((q) => q >= k ? q + 1 : q)); mis.clear(); m2.forEach((q) => mis.add(q)); }          // hoja numérica: sin esta línea Hekatan LISP la lee como simbólica
    let r = ''; o.forEach((s, k) => { r += (k ? (mis.has(k) ? '\n' : '\n\n') : '') + s; });
    return r + '\n';
  }
  HK.hlisp = { importa, exporta, omitidas, esHlisp: (nombre, texto) => /\.(lisp|hlisp)$/i.test(nombre || '') || (!/^\s*[{\[]/.test(texto || '') && /^\s*#/m.test(texto || '')) };
})(window);
