// Hekatan Math Studio Web — abre hojas de Hekatan LISP (.lisp / .hlisp), con las MISMAS reglas que el WPF (HekatanMathStudio/ArchivoHlisp.cs · ImportaHlisp):
//   «# título» «## sección» «#: párrafo» → texto · «#hide … #show» → bloque oculto · líneas de cálculo → ecuaciones (nodos editables)
//   Nombre{… @ …} → llamadas que entienden los nodos (simplify, diff, limit, taylor, sum, integral…) · nombres griegos latinos (xi → ξ) · «[m]» se quita · «@@(…)» y «'…» = comentario
//   Lo que los nodos no dibujan (#fplot con datos, #map, #surf, #anim, #dibujo, #modelo3d, #tabla…) queda TAL CUAL como «bloque LISP» (se edita como texto).
(function (G) {
  const HK = G.HK;
  const RxUnidad = /(?<=[\w)\]])\s+\[[A-Za-zµ°][^\]\[\s,;]*\]/g, RxBloque = /^(for|while|if|function)\b/;
  const Cierres = { dibujo: '#fin', autolisp: '#fin', dibujar: '#fin', fila: '#finfila', noc: '#equ', sust: '#nosust', triple: '#nosust' };
  const RxLlave = /(?<![A-Za-z])(Simplify|Diff|Slope|Derivate|Partial|Limit|Taylor|Sum|Suma|Integral|Area)\{/g;
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
        case 'Simplify': rep = 'simplify(' + cuerpo + ')'; break;
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
      if (t.startsWith('#:')) { vacia(); items.push({ t: 'texto', text: t.slice(2).trim() }); continue; }
      if (t.startsWith('##')) { vacia(); const nv = t.match(/^#+/)[0].length; items.push({ t: 'texto', text: t.replace(/^#+/, '').trim(), titulo: true, nivel: Math.min(nv, 3) }); continue; }
      if (t.startsWith('# ') && primera) { vacia(); items.push({ t: 'texto', text: t.slice(1).trim(), titulo: true, nivel: 1 }); primera = false; continue; }
      if (t.startsWith('# ') || t === '#') continue;          // comentario de la hoja: no se dibuja
      if (t.startsWith('#')) {          // directiva de Hekatan LISP
        vacia(); primera = false; const nombre = (/^#(\w+)/.exec(t) || [])[1] || '', txt = [l];
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
  HK.hlisp = { importa, omitidas, esHlisp: (nombre, texto) => /\.(lisp|hlisp)$/i.test(nombre || '') || (!/^\s*[{\[]/.test(texto || '') && /^\s*#/m.test(texto || '')) };
})(window);
