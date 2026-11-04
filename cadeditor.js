// Hekatan CAD en Hekatan Math Studio web: ventana de dibujo con el ratón (línea, polilínea, rectángulo, círculo, arco, texto, cota, grosores).
// «Guardar en la hoja» escribe el dibujo como bloque CAD (código AutoLISP editable); «Editar en Hekatan CAD» (en la barra del bloque) lo reabre.
// Lo que el editor no entiende de un bloque (curvas, achurados, lambdas…) se conserva tal cual al guardar.
(function (global) {
  'use strict';
  const HK = global.HK || (global.HK = {});
  const N = '(-?\\d+(?:\\.\\d+)?(?:e-?\\d+)?)', nf = (v) => String(+(+v).toFixed(3));
  const NC = N.replace('(', '(?:');
  const RP = new RegExp("'?\\(\\s*" + N + '\\s+' + N + '\\s*\\)', 'g');
  const PESO_PX = { gruesa: 3, media: 1.8, fina: 0.9 };
  const ACI = { 1: '#d32f2f', 2: '#d99a00', 3: '#2e9e4f', 4: '#00a5b5', 5: '#1a4fa3', 6: '#b0359b', 7: '#222', 8: '#777', 9: '#aaa' };
  const NOMCOL = [[7, 'negro'], [1, 'rojo'], [2, 'amarillo'], [3, 'verde'], [4, 'cian'], [5, 'azul'], [6, 'magenta'], [8, 'gris']];
  const PATRONES = [['ANSI31', 'Diagonal (ANSI31)'], ['ANSI37', 'Cuadrícula (ANSI37)'], ['SOLID', 'Sólido']];
  const colCapa = (c) => ACI[Math.abs(c)] || '#222';

  // ---------------------------------------------------------------- código ⇄ entidades
  function lee(code) {
    const ents = [], extra = [], capas = [{ n: '0', c: 7 }]; let peso = 'media', cur = '0';
    const capaDe = (n) => capas.find((x) => x.n === n);
    const _push = ents.push.bind(ents); ents.push = (e) => { if (e.capa == null) e.capa = cur; return _push(e); };          // cada entidad nace en la capa actual (se quita al final)
    for (const raw of code.split('\n')) {
      const l = raw.trim(); if (!l || l.startsWith(';')) continue;
      let m; const P = []; let q; RP.lastIndex = 0; while ((q = RP.exec(l))) P.push([+q[1], +q[2]]);
      if ((m = /^\(capa\s+"([^"]*)"(?:\s+:color\s+(-?\d+))?\s*\)$/i.exec(l))) { cur = m[1]; const x = capaDe(cur); if (!x) capas.push({ n: cur, c: m[2] != null ? +m[2] : 7 }); else if (m[2] != null) x.c = +m[2]; continue; }
      if (/^\(entmake\s+'\(\s*(\(\d+\s[^()]*\)\s*)+\)\s*\)$/.test(l)) {          // (entmake '((0 . "TIPO") (8 . "capa") ...)): capas y cotas angular / de radio / de diámetro
        const G = {}; for (const mm of l.matchAll(new RegExp('\\((\\d+)\\s+(?:\\.\\s+)?("[^"]*"|' + NC + ')(?:\\s+(' + NC + '))?(?:\\s+(' + NC + '))?\\s*\\)', 'g'))) { const v = mm[2][0] === '"' ? mm[2].slice(1, -1) : +mm[2]; G[mm[1]] = mm[3] != null ? [v, +mm[3], mm[4] != null ? +mm[4] : 0] : v; }
        if (G[0] === 'LAYER' && G[2] != null) { const c = G[62] != null ? G[62] : 7, x = capaDe(G[2]); if (x) x.c = c; else capas.push({ n: G[2], c }); continue; }
        if (G[0] === 'DIMENSION' && Array.isArray(G[10]) && typeof G[70] === 'number') {
          const k = G[70] & 7, txt = G[1] ? G[1] : null, capa = G[8] != null ? G[8] : cur;
          if (k === 5 && Array.isArray(G[13]) && Array.isArray(G[14]) && Array.isArray(G[15])) { ents.push({ t: 'cotaang', v: G[15].slice(0, 2), p1: G[13].slice(0, 2), p2: G[14].slice(0, 2), d: G[10].slice(0, 2), txt, peso, capa }); continue; }
          if (k === 4 && Array.isArray(G[15])) { ents.push({ t: 'cotarad', c: G[10].slice(0, 2), p: G[15].slice(0, 2), L: G[40] || 0, txt, peso, capa }); continue; }
          if (k === 3 && Array.isArray(G[15])) { ents.push({ t: 'cotadia', a: G[10].slice(0, 2), b: G[15].slice(0, 2), L: G[40] || 0, txt, peso, capa }); continue; }
        }
        extra.push(raw); continue;
      }
      if ((m = /^\(achurado\s+'\(((?:\(\s*[-\d.e]+\s+[-\d.e]+\s*\)\s*)+)\)(?:\s+:patron\s+"([^"]*)")?\s*\)$/.exec(l)) && P.length >= 3) { ents.push({ t: 'achurado', pts: P, patron: m[2] || 'ANSI31', peso, capa: cur }); continue; }
      const num = (re) => { const x = re.exec(l); return x ? +x[1] : null; };
      if ((m = /^\(peso\s+"?(gruesa|media|fina)"?\s*\)$/i.exec(l))) { peso = m[1].toLowerCase(); continue; }
      if (/^\(linea\b/.test(l) && P.length === 2 && /^\(linea\s+'\([^()]*\)\s+'\([^()]*\)\s*\)$/.test(l)) { ents.push({ t: 'linea', a: P[0], b: P[1], peso }); continue; }
      if ((m = new RegExp("^\\(rect\\s+'\\([^()]*\\)\\s+" + N + '\\s+' + N + '\\s*\\)$').exec(l)) && P.length === 1) { ents.push({ t: 'rect', a: P[0], b: [P[0][0] + +m[1], P[0][1] + +m[2]], peso }); continue; }
      if ((m = new RegExp("^\\(circulo\\s+'\\([^()]*\\)\\s+" + N + '\\s*\\)$').exec(l)) && P.length === 1) { ents.push({ t: 'circulo', c: P[0], R: +m[1], peso }); continue; }
      if ((m = new RegExp("^\\(arco\\s+'\\([^()]*\\)\\s+" + N + '\\s+' + N + '\\s+' + N + '\\s*\\)$').exec(l)) && P.length === 1) { ents.push({ t: 'arco', c: P[0], R: +m[1], a0: +m[2], a1: +m[3], peso }); continue; }
      if (/^\(polilinea\s+'\(\(/.test(l) && P.length >= 2 && /^\(polilinea\s+'\((\(\s*[-\d.e]+\s+[-\d.e]+\s*\)\s*)+\)\s*\)$/.test(l)) { ents.push({ t: 'poli', pts: P, peso }); continue; }
      if ((m = /^\(texto\s+'\([^()]*\)\s+"([^"]*)"(?:\s+:altura\s+(-?[\d.]+))?\s*\)$/.exec(l)) && P.length === 1) { ents.push({ t: 'texto', a: P[0], txt: m[1], h: m[2] ? +m[2] : 0.3, peso }); continue; }
      if ((m = /^\(cota\s+'\([^()]*\)\s+'\([^()]*\)(?:\s+:sep\s+(-?[\d.]+))?(?:\s+:texto\s+"([^"]*)")?\s*\)$/.exec(l)) && P.length === 2) { ents.push({ t: 'cota', a: P[0], b: P[1], sep: m[1] != null ? +m[1] : -0.3, txt: m[2] != null ? m[2] : null, peso }); continue; }
      extra.push(raw);
    }
    delete ents.push;
    return { ents, extra, capas };
  }
  const pt = (p) => "'(" + nf(p[0]) + ' ' + nf(p[1]) + ')';
  const entmakeCota = (pares) => "(entmake '(" + pares.join(' ') + '))';
  const p3 = (q) => nf(q[0]) + ' ' + nf(q[1]) + ' 0.0';
  function escribe(ents, extra, capas) {
    capas = (capas || [{ n: '0', c: 7 }]).map((x) => ({ n: x.n, c: x.c }));
    for (const e of ents) if (e.capa && !capas.some((x) => x.n === e.capa)) capas.push({ n: e.capa, c: 7 });
    if (!capas.some((x) => x.n === '0')) capas.unshift({ n: '0', c: 7 });
    const o = [';; Dibujo AutoLISP (Hekatan CAD): cada línea agrega una entidad; abajo se dibuja.']; let peso = null, cur = '0';
    for (const c of capas) if (c.n !== '0' || c.c !== 7) o.push('(capa "' + c.n + '" :color ' + c.c + ')');
    const c0 = capas.find((x) => x.n === '0'); if (capas.length > 1 || c0.c !== 7) o.push('(capa "0" :color ' + c0.c + ')');
    for (const x of extra) o.push(x);
    for (const e of ents) {
      if (e.capa && e.capa !== cur) { cur = e.capa; o.push('(capa "' + cur + '" :color ' + capas.find((x) => x.n === cur).c + ')'); }
      if (e.peso !== peso) { peso = e.peso; o.push('(peso "' + peso + '")'); }
      if (e.t === 'cotaang') o.push(entmakeCota(['(0 . "DIMENSION")', '(100 . "AcDbDimension")', '(10 ' + p3(e.d) + ')', '(70 . 37)', '(1 . "' + (e.txt || '') + '")', '(100 . "AcDb3PointAngularDimension")', '(13 ' + p3(e.p1) + ')', '(14 ' + p3(e.p2) + ')', '(15 ' + p3(e.v) + ')']));
      else if (e.t === 'cotarad') o.push(entmakeCota(['(0 . "DIMENSION")', '(100 . "AcDbDimension")', '(10 ' + p3(e.c) + ')', '(70 . 36)', '(1 . "' + (e.txt || '') + '")', '(100 . "AcDbRadialDimension")', '(15 ' + p3(e.p) + ')', '(40 . ' + nf(e.L || 0) + ')']));
      else if (e.t === 'cotadia') o.push(entmakeCota(['(0 . "DIMENSION")', '(100 . "AcDbDimension")', '(10 ' + p3(e.a) + ')', '(70 . 35)', '(1 . "' + (e.txt || '') + '")', '(100 . "AcDbDiametricDimension")', '(15 ' + p3(e.b) + ')', '(40 . ' + nf(e.L || 0) + ')']));
      else if (e.t === 'achurado') o.push("(achurado '(" + e.pts.map((q) => '(' + nf(q[0]) + ' ' + nf(q[1]) + ')').join(' ') + ') :patron "' + (e.patron || 'ANSI31') + '")');
      else if (e.t === 'linea') o.push('(linea ' + pt(e.a) + ' ' + pt(e.b) + ')');
      else if (e.t === 'rect') o.push('(rect ' + pt([Math.min(e.a[0], e.b[0]), Math.min(e.a[1], e.b[1])]) + ' ' + nf(Math.abs(e.b[0] - e.a[0])) + ' ' + nf(Math.abs(e.b[1] - e.a[1])) + ')');
      else if (e.t === 'circulo') o.push('(circulo ' + pt(e.c) + ' ' + nf(e.R) + ')');
      else if (e.t === 'arco') o.push('(arco ' + pt(e.c) + ' ' + nf(e.R) + ' ' + nf(e.a0) + ' ' + nf(e.a1) + ')');
      else if (e.t === 'poli') o.push("(polilinea '(" + e.pts.map((p) => '(' + nf(p[0]) + ' ' + nf(p[1]) + ')').join(' ') + '))');
      else if (e.t === 'texto') o.push('(texto ' + pt(e.a) + ' "' + e.txt + '" :altura ' + nf(e.h) + ')');
      else if (e.t === 'cota') { const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]); o.push('(cota ' + pt(e.a) + ' ' + pt(e.b) + ' :sep ' + nf(e.sep) + ' :texto "' + (e.txt != null ? e.txt : 'L = ' + nf(L)) + '")'); }
    }
    return o.join('\n');
  }

  // ---------------------------------------------------------------- ventana
  const HERR = [['sel', '↖', 'Seleccionar (Supr borra)'], ['linea', '／', 'Línea: 2 clics'], ['poli', '⌇', 'Polilínea: clics, Enter o doble clic termina'], ['rect', '▭', 'Rectángulo: 2 esquinas'],
    ['circulo', '○', 'Círculo: centro y un punto del borde'], ['arco', '◠', 'Arco: centro, inicio y fin (antihorario)'], ['texto', 'A', 'Texto: clic y escribe'], ['cota', '↔', 'Cota: punto A, punto B y posición de la línea'],
    ['mover', '✥', 'Mover: elige la entidad, punto base y destino'], ['copiar', '⧉', 'Copiar: elige la entidad, punto base y destino (repite)'], ['girar', '↻', 'Girar: elige la entidad, centro, referencia y ángulo nuevo'],
    ['cotaang', '∠', 'Cota angular: clic en dos líneas (o vértice y dos puntos) y la posición del arco'], ['cotarad', 'R', 'Cota de radio: clic en un círculo o arco y la posición'], ['cotadia', 'Ø', 'Cota de diámetro: clic en un círculo o arco y la posición'],
    ['achurar', '▨', 'Achurado: clic dentro de un contorno cerrado (rectángulo, círculo o polilínea cerrada)']];
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const CSS = '.hcad-capas{position:absolute;right:12px;top:84px;z-index:20;width:300px;background:#fff;border:1px solid #1f3864;border-radius:6px;box-shadow:0 4px 16px #0004;padding:8px;font:12px "Segoe UI",sans-serif;color:#222}' +
    '.hcad-capas h4{margin:0 0 6px;font-size:13px;color:#1f3864}.hcad-capas .cp-f{display:flex;align-items:center;gap:4px;padding:2px 3px;border-radius:3px}.hcad-capas .cp-f.act{background:#e0ebff}' +
    '.hcad-capas button{border:1px solid #9ab;background:#f2f6ff;border-radius:3px;cursor:pointer;min-width:24px;padding:1px 4px}.hcad-capas .cp-nom{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hcad-capas .cp-n{color:#789;font-size:11px}' +
    '.hcad-capas .cp-f.off .cp-nom{color:#999;text-decoration:line-through}.hcad-capas .cp-nuevo{display:flex;gap:4px;margin-top:6px}.hcad-capas input{width:116px;padding:1px 4px}.hcad-capas select{max-width:84px}' +
    '.hcad-bar .capa{max-width:130px}';
  function abre(rec) {
    if (document.querySelector('.hcad')) return;
    const src = rec ? lee(rec.ta.value) : { ents: [], extra: [], capas: [{ n: '0', c: 7 }] };
    const S = { ents: src.ents, extra: src.extra, capas: src.capas, capa: '0', patron: 'ANSI31', crudo: null, tool: 'sel', pend: [], sel: -1, peso: 'media', snap: true, imanes: true, iman: null, x0: -1, y0: -1, s: 60, mouse: null, pan: null, deshacer: [] };
    const root = document.createElement('div'); root.className = 'hcad';
    root.innerHTML = '<div class="hcad-bar"><b>Hekatan CAD</b>' + HERR.map((h) => '<button data-t="' + h[0] + '" title="' + h[2] + '">' + h[1] + '</button>').join('') +
      '<span class="sp"></span><select class="peso" title="Grosor de trazo"><option value="gruesa">Gruesa</option><option value="media" selected>Media</option><option value="fina">Fina</option></select>' +
      '<span class="sp"></span><select class="capa" title="Capa activa: lo nuevo se dibuja en ella"></select><button data-a="capas" title="Capas: crear, activar, ocultar y color">≡ Capas</button><select class="patron" title="Patrón del achurado">' + PATRONES.map((q) => '<option value="' + q[0] + '">' + q[1] + '</option>').join('') + '</select>' +
      '<label title="Pegar el cursor a la rejilla de 0,1"><input type="checkbox" class="snap" checked> Rejilla</label><label title="Imanes: extremo ■, punto medio △, centro ○, cuadrante ◇"><input type="checkbox" class="iman" checked> Imanes</label><button data-a="undo" title="Deshacer (Ctrl+Z)">↶</button><button data-a="fit" title="Ajustar vista">⤢</button>' +
      '<span class="sp"></span><button data-a="ok" class="ok">Guardar en la hoja</button><button data-a="no">Cerrar</button></div><div class="hcad-msg"></div><div class="hcad-lienzo"><div class="hcad-svg"></div></div>';
    document.body.appendChild(root);
    if (!document.getElementById('hcad-estilo-extra')) { const st = document.createElement('style'); st.id = 'hcad-estilo-extra'; st.textContent = CSS; document.head.appendChild(st); }
    const lienzo = root.querySelector('.hcad-lienzo'), caja = root.querySelector('.hcad-svg'), msg = root.querySelector('.hcad-msg');
    const dim = () => ({ W: lienzo.clientWidth, H: lienzo.clientHeight });
    const capaE = (e) => S.capas.find((x) => x.n === e.capa);
    const vis = (e) => { const c = capaE(e); return !(c && c.c < 0); };
    const colE = (e) => { const c = capaE(e); return c ? colCapa(c.c) : '#222'; };
    const px = (x) => (x - S.x0) * S.s, py = (y) => dim().H - (y - S.y0) * S.s;
    const aMundo = (cx, cy) => [S.x0 + cx / S.s, S.y0 + (dim().H - cy) / S.s];
    // imanes (object snap): puntos clave de las entidades; ganan a la rejilla si el cursor está a ≤ 12 px
    const claves = () => {
      const R = [], add = (p, t) => R.push([p, t]), md = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      for (const e of S.ents) {
        if (!vis(e)) continue;
        if (e.t === 'cotaang') { add(e.v, 'extremo'); add(e.p1, 'extremo'); add(e.p2, 'extremo'); }
        else if (e.t === 'cotarad') add(e.p, 'extremo');
        else if (e.t === 'cotadia') { add(e.a, 'extremo'); add(e.b, 'extremo'); }
        else if (e.t === 'achurado') e.pts.forEach((q) => add(q, 'extremo'));
        else if (e.t === 'linea') { add(e.a, 'extremo'); add(e.b, 'extremo'); add(md(e.a, e.b), 'medio'); }
        else if (e.t === 'rect') { const c = [e.a, [e.b[0], e.a[1]], e.b, [e.a[0], e.b[1]]]; c.forEach((q, i) => { add(q, 'extremo'); add(md(q, c[(i + 1) % 4]), 'medio'); }); add(md(e.a, e.b), 'centro'); }
        else if (e.t === 'circulo') { add(e.c, 'centro'); [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach((d) => add([e.c[0] + d[0] * e.R, e.c[1] + d[1] * e.R], 'cuadrante')); }
        else if (e.t === 'arco') { add(e.c, 'centro'); const P = (a) => [e.c[0] + e.R * Math.cos(a * Math.PI / 180), e.c[1] + e.R * Math.sin(a * Math.PI / 180)]; let d = e.a1 - e.a0; if (d <= 0) d += 360; add(P(e.a0), 'extremo'); add(P(e.a1), 'extremo'); add(P(e.a0 + d / 2), 'medio'); }
        else if (e.t === 'poli') { e.pts.forEach((q, i) => { add(q, 'extremo'); if (i) add(md(e.pts[i - 1], q), 'medio'); }); }
        else if (e.t === 'texto') add(e.a, 'extremo');
        else if (e.t === 'cota') { add(e.a, 'extremo'); add(e.b, 'extremo'); }
      }
      return R;
    };
    const sn = (w) => {
      S.iman = null;
      if (S.imanes) { let mj = null, md = 12 / S.s; for (const k of claves()) { const d = Math.hypot(k[0][0] - w[0], k[0][1] - w[1]); if (d < md) { md = d; mj = k; } } if (mj) { S.iman = mj; return [mj[0][0], mj[0][1]]; } }
      return S.snap ? [Math.round(w[0] * 10) / 10, Math.round(w[1] * 10) / 10] : [Math.round(w[0] * 1000) / 1000, Math.round(w[1] * 1000) / 1000];
    };
    // mover / copiar / girar: copia de la entidad con sus puntos transformados (un rectángulo girado pasa a polilínea cerrada)
    const mapea = (e, f, dAng) => {
      const n = JSON.parse(JSON.stringify(e));
      if (n.t === 'rect' && dAng) { const c = [n.a, [n.b[0], n.a[1]], n.b, [n.a[0], n.b[1]]].map(f); return { t: 'poli', pts: c.concat([c[0]]), peso: n.peso, capa: n.capa }; }
      for (const k of ['a', 'b', 'c', 'v', 'p1', 'p2', 'd', 'p']) if (n[k]) n[k] = f(n[k]);
      if (n.pts) n.pts = n.pts.map(f);
      if (n.t === 'arco' && dAng) { n.a0 += dAng; n.a1 += dAng; }
      return n;
    };
    const traslada = (d) => (q) => [q[0] + d[0], q[1] + d[1]];
    const gira = (c, ang) => { const co = Math.cos(ang * Math.PI / 180), si = Math.sin(ang * Math.PI / 180); return (q) => { const x = q[0] - c[0], y = q[1] - c[1]; return [c[0] + x * co - y * si, c[1] + x * si + y * co]; }; };
    const angDe = (c, q) => Math.atan2(q[1] - c[1], q[0] - c[0]) * 180 / Math.PI;
    const ayuda = { sel: 'Clic en una entidad para elegirla; Supr la borra. Doble clic en el número de una cota: nueva medida.', linea: 'Línea: primer punto', poli: 'Polilínea: primer punto', rect: 'Rectángulo: primera esquina', circulo: 'Círculo: centro', arco: 'Arco: centro', texto: 'Texto: clic donde va', cota: 'Cota: punto A', mover: 'Mover: clic en la entidad', copiar: 'Copiar: clic en la entidad', girar: 'Girar: clic en la entidad', cotaang: 'Cota angular: clic en una línea (o en el vértice)', cotarad: 'Cota de radio: clic en un círculo o arco', cotadia: 'Cota de diámetro: clic en un círculo o arco', achurar: 'Achurado: clic dentro de un contorno cerrado' };
    const push = () => { S.deshacer.push(JSON.stringify({ e: S.ents, c: S.capas })); if (S.deshacer.length > 80) S.deshacer.shift(); };
    const fit = () => {
      const P = []; for (const e of S.ents) { if (e.v) P.push(e.v, e.p1, e.p2); if (e.pts) P.push(...e.pts); if (e.a) P.push(e.a); if (e.b) P.push(e.b); if (e.c) P.push([e.c[0] - e.R, e.c[1] - e.R], [e.c[0] + e.R, e.c[1] + e.R]); }
      const { W, H } = dim(); if (!P.length) { S.x0 = -1; S.y0 = -1; S.s = 60; return; }
      const x0 = Math.min(...P.map((p) => p[0])), x1 = Math.max(...P.map((p) => p[0])), y0 = Math.min(...P.map((p) => p[1])), y1 = Math.max(...P.map((p) => p[1]));
      S.s = Math.min((W - 120) / Math.max(1e-6, x1 - x0), (H - 120) / Math.max(1e-6, y1 - y0), 400); S.x0 = x0 - (W / S.s - (x1 - x0)) / 2; S.y0 = y0 - (H / S.s - (y1 - y0)) / 2;
    };
    // arco: ángulos en grados, antihorario; punto del SVG por ángulo
    const arcoD = (c, R, a0, a1) => { let d = a1 - a0; if (d <= 0) d += 360; const p = (a) => [px(c[0] + R * Math.cos(a * Math.PI / 180)), py(c[1] + R * Math.sin(a * Math.PI / 180))]; const A = p(a0), B = p(a1); return 'M' + A + ' A' + R * S.s + ' ' + R * S.s + ' 0 ' + (d > 180 ? 1 : 0) + ' 0 ' + B; };
    const cotaG = (e) => { const dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; return { L, A2: [e.a[0] + nx * e.sep, e.a[1] + ny * e.sep], B2: [e.b[0] + nx * e.sep, e.b[1] + ny * e.sep], nx, ny }; };
    const aA = (v, q) => Math.atan2(q[1] - v[1], q[0] - v[0]), nm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const cotaAngG = (e) => { const a1 = aA(e.v, e.p1), a2 = aA(e.v, e.p2), ad = aA(e.v, e.d), R = Math.hypot(e.d[0] - e.v[0], e.d[1] - e.v[1]), o = nm(ad - a1) <= nm(a2 - a1) ? { t0: a1, dt: nm(a2 - a1) } : { t0: a2, dt: nm(a1 - a2) }; return { t0: o.t0, dt: o.dt, R, m: o.dt * 180 / Math.PI }; };
    const flecha = (o, ux, uy, c) => '<polygon points="' + [[o[0], o[1]], [o[0] - 8 * ux - 2.5 * uy, o[1] - 8 * uy + 2.5 * ux], [o[0] - 8 * ux + 2.5 * uy, o[1] - 8 * uy - 2.5 * ux]].map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') + '" fill="' + c + '"/>';
    const dibujaEnt = (e, cls, prev) => {
      const sw = (PESO_PX[e.peso] || 1.8) + (cls ? 1.5 : 0), st = 'fill="none" stroke="' + (cls ? '#1a73e8' : prev ? '#d99a00' : colE(e)) + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"';
      if (e.t === 'linea') return '<line x1="' + px(e.a[0]) + '" y1="' + py(e.a[1]) + '" x2="' + px(e.b[0]) + '" y2="' + py(e.b[1]) + '" ' + st + '/>';
      if (e.t === 'rect') return '<rect x="' + px(Math.min(e.a[0], e.b[0])) + '" y="' + py(Math.max(e.a[1], e.b[1])) + '" width="' + Math.abs(e.b[0] - e.a[0]) * S.s + '" height="' + Math.abs(e.b[1] - e.a[1]) * S.s + '" ' + st + '/>';
      if (e.t === 'circulo') return '<circle cx="' + px(e.c[0]) + '" cy="' + py(e.c[1]) + '" r="' + e.R * S.s + '" ' + st + '/>';
      if (e.t === 'arco') return '<path d="' + arcoD(e.c, e.R, e.a0, e.a1) + '" ' + st + '/>';
      if (e.t === 'poli') return '<polyline points="' + e.pts.map((p) => px(p[0]) + ',' + py(p[1])).join(' ') + '" ' + st + '/>';
      if (e.t === 'texto') return '<text x="' + px(e.a[0]) + '" y="' + py(e.a[1]) + '" font-size="' + Math.max(8, e.h * S.s) + '" fill="' + (cls ? '#1a73e8' : colE(e)) + '" font-family="Segoe UI,sans-serif">' + e.txt.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
      if (e.t === 'achurado') {
        const q = e.pts.map((p) => px(p[0]) + ',' + py(p[1])).join(' '), solido = e.patron === 'SOLID', col = cls ? '#1a73e8' : prev ? '#d99a00' : colE(e);
        return '<polygon points="' + q + '" fill="' + (solido ? (col.length === 4 ? '#' + [...col.slice(1)].map((x) => x + x).join('') : col) + '55' : 'url(#hcp' + (/^ANSI3[5-9]/i.test(e.patron) ? '37' : '31') + ')') + '" stroke="' + col + '" stroke-width="' + (cls ? 2.3 : 0.8) + '"/>';
      }
      if (e.t === 'cotaang') {
        const g = cotaAngG(e), c = cls ? '#1a73e8' : prev ? '#d99a00' : '#555', C = [px(e.v[0]), py(e.v[1])], Rs = g.R * S.s, P = (a) => [C[0] + Rs * Math.cos(a), C[1] - Rs * Math.sin(a)], A = P(g.t0), B = P(g.t0 + g.dt);
        let o = '<g class="hc-cotaang" data-i="' + S.ents.indexOf(e) + '">';
        for (const q of [e.p1, e.p2]) { const r0 = Math.hypot(q[0] - e.v[0], q[1] - e.v[1]); if (r0 < g.R) { const a = Math.atan2(q[1] - e.v[1], q[0] - e.v[0]); o += '<line x1="' + px(q[0]) + '" y1="' + py(q[1]) + '" x2="' + P(a)[0] + '" y2="' + P(a)[1] + '" stroke="' + c + '"/>'; } }
        o += '<path d="M' + A + ' A' + Rs + ' ' + Rs + ' 0 ' + (g.dt > Math.PI ? 1 : 0) + ' 0 ' + B + '" fill="none" stroke="' + c + '" stroke-width="1.2"/>' + flecha(A, Math.sin(g.t0), Math.cos(g.t0), c) + flecha(B, -Math.sin(g.t0 + g.dt), -Math.cos(g.t0 + g.dt), c);
        const tm = g.t0 + g.dt / 2, tx = e.txt && e.txt !== '<>' ? e.txt.replace('<>', nf(g.m) + '°') : (+g.m.toFixed(2)) + '°';
        return o + '<text class="hc-cota-t" x="' + (C[0] + (Rs + 14) * Math.cos(tm)) + '" y="' + (C[1] - (Rs + 14) * Math.sin(tm) + 4) + '" text-anchor="middle" font-size="12" fill="' + c + '" font-family="Segoe UI,sans-serif">' + esc(tx) + '</text></g>';
      }
      if (e.t === 'cotarad' || e.t === 'cotadia') {
        const dia = e.t === 'cotadia', c = cls ? '#1a73e8' : prev ? '#d99a00' : '#555', a = dia ? e.a : e.c, b = dia ? e.b : e.p, A = [px(a[0]), py(a[1])], B = [px(b[0]), py(b[1])];
        let ux = B[0] - A[0], uy = B[1] - A[1]; const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L; let an = Math.atan2(uy, ux); if (an > Math.PI / 2 || an < -Math.PI / 2) an += Math.PI;
        const m = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = e.txt && e.txt !== '<>' ? e.txt.replace('<>', nf(m)) : (dia ? 'Ø' : 'R') + (HK.fmt ? HK.fmt(m) : nf(m));
        return '<g class="hc-cotarad" data-i="' + S.ents.indexOf(e) + '"><line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '" stroke="' + c + '" stroke-width="1.2"/>' + flecha(B, ux, uy, c) + (dia ? flecha(A, -ux, -uy, c) : '') +
          '<text class="hc-cota-t" transform="translate(' + (A[0] + B[0]) / 2 + ',' + ((A[1] + B[1]) / 2 - 4) + ') rotate(' + an * 180 / Math.PI + ')" text-anchor="middle" font-size="12" fill="' + c + '" font-family="Segoe UI,sans-serif">' + esc(tx) + '</text></g>';
      }
      if (e.t === 'cota') {
        const g = cotaG(e), c = '#' + (cls ? '1a73e8' : prev ? 'd99a00' : '555'), l = (a, b) => '<line x1="' + px(a[0]) + '" y1="' + py(a[1]) + '" x2="' + px(b[0]) + '" y2="' + py(b[1]) + '" stroke="' + c + '" stroke-width="1"/>';
        const t = e.txt != null ? e.txt : 'L = ' + nf(g.L);
        return l(e.a, g.A2) + l(e.b, g.B2) + l(g.A2, g.B2) + '<text class="hc-cota" data-i="' + S.ents.indexOf(e) + '" x="' + (px(g.A2[0]) + px(g.B2[0])) / 2 + '" y="' + ((py(g.A2[1]) + py(g.B2[1])) / 2 - 5) + '" text-anchor="middle" font-size="12" fill="' + c + '" font-family="Segoe UI,sans-serif">' + t + '</text>';
      }
      return '';
    };
    // entidad provisional según la herramienta y los puntos ya dados
    // cota angular: sector (de los cuatro que forman las dos rectas) donde cae el arco de cota, como AutoCAD
    const mkAng = (g, d) => {
      let a = g.p1, b = g.p2;
      if (g.lineas) { const v = g.v; let best = null; for (const sg of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { let A = [v[0] + sg[0] * (g.p1[0] - v[0]), v[1] + sg[0] * (g.p1[1] - v[1])], B = [v[0] + sg[1] * (g.p2[0] - v[0]), v[1] + sg[1] * (g.p2[1] - v[1])], t1 = aA(v, A), t2 = aA(v, B); if (nm(t2 - t1) > Math.PI) { [A, B, t1, t2] = [B, A, t2, t1]; } if (nm(aA(v, d) - t1) <= nm(t2 - t1) + 1e-12) best = [A, B]; } if (best) [a, b] = best; }
      if (Math.hypot(d[0] - g.v[0], d[1] - g.v[1]) < 1e-9) return null;
      return { t: 'cotaang', v: g.v.slice(), p1: a.slice(), p2: b.slice(), d: d.slice(), txt: null, peso: S.peso, capa: S.capa };
    };
    const mkRad = (ci, x, dia) => {
      const dx = x[0] - ci.c[0], dy = x[1] - ci.c[1], l = Math.hypot(dx, dy); if (l < 1e-9) return null; const u = [dx / l, dy / l], q = [ci.c[0] + ci.R * u[0], ci.c[1] + ci.R * u[1]], L = Math.max(0, l - ci.R);
      return dia ? { t: 'cotadia', a: [ci.c[0] - ci.R * u[0], ci.c[1] - ci.R * u[1]], b: q, L, txt: null, peso: S.peso, capa: S.capa } : { t: 'cotarad', c: ci.c.slice(), p: q, L, txt: null, peso: S.peso, capa: S.capa };
    };
    const provisional = () => {
      const m = S.mouse, p = S.pend; if (!m || (!p.length && !p.circ && !p.ang)) return null; const pe = S.peso;
      if (S.tool === 'linea') return { t: 'linea', a: p[0], b: m, peso: pe };
      if (S.tool === 'poli') return { t: 'poli', pts: p.concat([m]), peso: pe };
      if (S.tool === 'rect') return { t: 'rect', a: p[0], b: m, peso: pe };
      if (S.tool === 'circulo') return { t: 'circulo', c: p[0], R: Math.hypot(m[0] - p[0][0], m[1] - p[0][1]), peso: pe };
      if (S.tool === 'arco') { if (p.length === 1) return { t: 'linea', a: p[0], b: m, peso: 'fina' }; const R = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), a0 = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]) * 180 / Math.PI; return { t: 'arco', c: p[0], R, a0, a1: Math.atan2(m[1] - p[0][1], m[0] - p[0][0]) * 180 / Math.PI, peso: pe }; }
      if (S.tool === 'cota') { if (p.length === 1) return { t: 'linea', a: p[0], b: m, peso: 'fina' }; const dx = p[1][0] - p[0][0], dy = p[1][1] - p[0][1], L = Math.hypot(dx, dy) || 1; return { t: 'cota', a: p[0], b: p[1], sep: (m[0] - p[0][0]) * (-dy / L) + (m[1] - p[0][1]) * (dx / L), txt: null, peso: pe }; }
      if (S.tool === 'cotaang') { if (p.ang) return mkAng(p.ang, m); if (p.length === 1) return { t: 'linea', a: p[0], b: m, peso: 'fina' }; if (p.length === 2) return { t: 'poli', pts: [p[1], p[0], m], peso: 'fina' }; return null; }
      if ((S.tool === 'cotarad' || S.tool === 'cotadia') && p.circ) return mkRad(p.circ, m, S.tool === 'cotadia');
      if ((S.tool === 'mover' || S.tool === 'copiar' || S.tool === 'girar') && S.sel >= 0) {
        const e = S.ents[S.sel];
        if (S.tool !== 'girar') return mapea(e, traslada([m[0] - p[0][0], m[1] - p[0][1]]), 0);
        if (p.length === 1) return { t: 'linea', a: p[0], b: m, peso: 'fina' };
        const d = angDe(p[0], m) - angDe(p[0], p[1]); return mapea(e, gira(p[0], d), d);
      }
      return null;
    };
    const redib = () => {
      const { W, H } = dim(); let o = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><defs><pattern id="hcp31" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#444" stroke-width="1"/></pattern><pattern id="hcp37" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#444" stroke-width="1"/><line x1="0" y1="0" x2="6" y2="0" stroke="#444" stroke-width="1"/></pattern></defs>';
      const paso = S.s > 90 ? 0.1 : S.s > 24 ? 0.5 : S.s > 8 ? 1 : 5;
      for (let x = Math.ceil(S.x0 / paso) * paso; px(x) < W; x += paso) for (let y = Math.ceil(S.y0 / paso) * paso; py(y) > 0; y += paso) o += '<circle cx="' + px(x) + '" cy="' + py(y) + '" r="0.9" fill="#bbb"/>';
      o += '<line x1="' + px(0) + '" y1="0" x2="' + px(0) + '" y2="' + H + '" stroke="#e0b4b4" stroke-width="1"/><line x1="0" y1="' + py(0) + '" x2="' + W + '" y2="' + py(0) + '" stroke="#b4c8e0" stroke-width="1"/>';
      S.ents.forEach((e, i) => { if (vis(e)) o += dibujaEnt(e, i === S.sel); });
      const pv = provisional(); if (pv) o += dibujaEnt(pv, false, true);
      if (S.mouse) o += '<g stroke="#1a73e8" stroke-width="1"><line x1="' + (px(S.mouse[0]) - 7) + '" y1="' + py(S.mouse[1]) + '" x2="' + (px(S.mouse[0]) + 7) + '" y2="' + py(S.mouse[1]) + '"/><line x1="' + px(S.mouse[0]) + '" y1="' + (py(S.mouse[1]) - 7) + '" x2="' + px(S.mouse[0]) + '" y2="' + (py(S.mouse[1]) + 7) + '"/></g>';
      if (S.iman) {          // marca del imán: ■ extremo · △ medio · ○ centro · ◇ cuadrante
        const [q, tp] = S.iman, x = px(q[0]), y = py(q[1]), g = '<g fill="none" stroke="#0a8a3a" stroke-width="2">';
        o += g + (tp === 'extremo' ? '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10"/>' : tp === 'medio' ? '<polygon points="' + x + ',' + (y - 6) + ' ' + (x - 6) + ',' + (y + 5) + ' ' + (x + 6) + ',' + (y + 5) + '"/>' : tp === 'centro' ? '<circle cx="' + x + '" cy="' + y + '" r="6"/>' : '<polygon points="' + x + ',' + (y - 6) + ' ' + (x + 6) + ',' + y + ' ' + x + ',' + (y + 6) + ' ' + (x - 6) + ',' + y + '"/>') + '</g><text x="' + (x + 9) + '" y="' + (y - 8) + '" font-size="11" fill="#0a8a3a" font-family="Segoe UI,sans-serif">' + tp + '</text>';
      }
      caja.innerHTML = o + '</svg>';
      root.querySelectorAll('.hcad-bar [data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === S.tool));
    };
    const estado = (t) => { msg.textContent = (t || ayuda[S.tool]) + (S.mouse ? '   x=' + nf(S.mouse[0]) + '  y=' + nf(S.mouse[1]) : ''); };
    // distancia (px) de un punto a cada entidad → la más cercana para seleccionar
    const dSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const dentro = (p, q) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > p[1]) !== (q[j][1] > p[1]) && p[0] < (q[j][0] - q[i][0]) * (p[1] - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) c = !c; return c; };
    const dEnt = (e, p) => {
      if (!vis(e)) return 1e9;
      if (e.t === 'achurado') { const b = Math.min(...e.pts.map((q, i) => dSeg(p, q, e.pts[(i + 1) % e.pts.length]))); return dentro(p, e.pts) ? Math.min(b, 9 / S.s) : b; }
      if (e.t === 'cotaang') { const g = cotaAngG(e), r = Math.hypot(p[0] - e.v[0], p[1] - e.v[1]); let q = nm(aA(e.v, p) - g.t0); return q <= g.dt ? Math.abs(r - g.R) : 1e9; }
      if (e.t === 'cotarad') return dSeg(p, e.c, e.p);
      if (e.t === 'cotadia') return dSeg(p, e.a, e.b);
      if (e.t === 'linea') return dSeg(p, e.a, e.b);
      if (e.t === 'rect') { const c = [[e.a[0], e.a[1]], [e.b[0], e.a[1]], [e.b[0], e.b[1]], [e.a[0], e.b[1]]]; return Math.min(...c.map((q, i) => dSeg(p, q, c[(i + 1) % 4]))); }
      if (e.t === 'circulo') return Math.abs(Math.hypot(p[0] - e.c[0], p[1] - e.c[1]) - e.R);
      if (e.t === 'arco') { const r = Math.hypot(p[0] - e.c[0], p[1] - e.c[1]); let a = Math.atan2(p[1] - e.c[1], p[0] - e.c[0]) * 180 / Math.PI, d = e.a1 - e.a0; if (d <= 0) d += 360; let q = a - e.a0; while (q < 0) q += 360; return q <= d ? Math.abs(r - e.R) : 1e9; }
      if (e.t === 'poli') return Math.min(...e.pts.slice(1).map((q, i) => dSeg(p, e.pts[i], q)));
      if (e.t === 'texto') return Math.hypot(p[0] - e.a[0] - e.txt.length * e.h * 0.3, p[1] - e.a[1] - e.h * 0.4) * 0.6;
      if (e.t === 'cota') { const g = cotaG(e); return Math.min(dSeg(p, g.A2, g.B2), dSeg(p, e.a, g.A2), dSeg(p, e.b, g.B2)); }
      return 1e9;
    };
    const lineaCerca = (w, excl) => { let mejor = -1, md = 10 / S.s; S.ents.forEach((e, i) => { if (e.t === 'linea' && i !== excl && vis(e)) { const d = dSeg(w, e.a, e.b); if (d < md) { md = d; mejor = i; } } }); return mejor; };
    const esquina = (e1, e2) => {
      const d1 = [e1.b[0] - e1.a[0], e1.b[1] - e1.a[1]], d2 = [e2.b[0] - e2.a[0], e2.b[1] - e2.a[1]], den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-12) return null;
      const t = ((e2.a[0] - e1.a[0]) * d2[1] - (e2.a[1] - e1.a[1]) * d2[0]) / den, v = [e1.a[0] + t * d1[0], e1.a[1] + t * d1[1]], lej = (e) => Math.hypot(e.a[0] - v[0], e.a[1] - v[1]) > Math.hypot(e.b[0] - v[0], e.b[1] - v[1]) ? e.a : e.b;
      return { v, p1: lej(e1).slice(), p2: lej(e2).slice(), lineas: true };
    };
    const contornos = () => {          // contornos cerrados: rectángulo, círculo (48 lados) y polilínea cuyo último punto vuelve al primero
      const R = [];
      for (const e of S.ents) {
        if (!vis(e)) continue; let pts = null;
        if (e.t === 'rect') pts = [e.a, [e.b[0], e.a[1]], e.b, [e.a[0], e.b[1]]];
        else if (e.t === 'circulo') pts = Array.from({ length: 48 }, (_, i) => [e.c[0] + e.R * Math.cos(i * Math.PI / 24), e.c[1] + e.R * Math.sin(i * Math.PI / 24)]);
        else if (e.t === 'poli' && e.pts.length >= 4 && Math.hypot(e.pts[0][0] - e.pts[e.pts.length - 1][0], e.pts[0][1] - e.pts[e.pts.length - 1][1]) < 1e-9) pts = e.pts.slice(0, -1);
        if (pts) { let a = 0; pts.forEach((q, i) => { const r = pts[(i + 1) % pts.length]; a += q[0] * r[1] - r[0] * q[1]; }); R.push({ pts: pts.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), area: Math.abs(a) / 2 }); }
      }
      return R;
    };
    const termina = (e) => { push(); if (!e.capa) e.capa = S.capa; S.ents.push(e); S.pend = []; S.sel = S.ents.length - 1; };
    const entrada = (x, y, valor, cb) => {          // caja de texto sobre el lienzo
      const i = document.createElement('input'); i.className = 'hcad-inp'; i.value = valor; i.style.left = x + 'px'; i.style.top = y + 'px'; lienzo.appendChild(i); i.focus(); i.select();
      let ok = false; const fin = (v) => { if (ok) return; ok = true; const t = i.value; i.remove(); if (v) cb(t); redib(); };
      i.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); }); i.addEventListener('blur', () => fin(true));
    };
    const clic = (w) => {
      const t = S.tool, p = S.pend;
      if (t === 'sel') { let mejor = -1, md = 10 / S.s; S.ents.forEach((e, i) => { const d = dEnt(e, w); if (d < md) { md = d; mejor = i; } }); S.sel = mejor; return; }
      if (t === 'mover' || t === 'copiar' || t === 'girar') {
        if (S.sel < 0) { let mejor = -1, md = 10 / S.s; S.ents.forEach((e, i) => { const d = dEnt(e, w); if (d < md) { md = d; mejor = i; } }); S.sel = mejor; return; }
        p.push(w);
        if (t !== 'girar' && p.length === 2) {
          const e = S.ents[S.sel], n = mapea(e, traslada([p[1][0] - p[0][0], p[1][1] - p[0][1]]), 0); push();
          if (t === 'mover') S.ents[S.sel] = n; else { S.ents.push(n); S.sel = S.ents.length - 1; }          // al copiar, la copia queda elegida: se puede repetir
          S.pend = [];
        } else if (t === 'girar' && p.length === 3) {
          const d = angDe(p[0], p[2]) - angDe(p[0], p[1]); push(); S.ents[S.sel] = mapea(S.ents[S.sel], gira(p[0], d), d); S.pend = [];
        }
        return;
      }
      if (t === 'cotaang') {
        if (p.ang) { const pv = provisional(); if (pv) termina(pv); else S.pend = []; return; }
        if (p.l1 != null) {          // segunda línea
          const j = lineaCerca(S.crudo || w, p.l1); if (j < 0) return; const g = esquina(S.ents[p.l1], S.ents[j]); if (!g) { estado('Cota angular: las dos líneas son paralelas'); return; } p.ang = g; return;
        }
        if (!p.length) { const j = S.iman ? -1 : lineaCerca(S.crudo || w, -1); if (j >= 0) { p.l1 = j; return; } }
        p.push(w); if (p.length === 3) p.ang = { v: p[0], p1: p[1], p2: p[2] }; return;
      }
      if (t === 'cotarad' || t === 'cotadia') {
        if (!p.circ) { let mejor = -1, md = 10 / S.s; S.ents.forEach((e, i) => { if ((e.t === 'circulo' || e.t === 'arco') && vis(e)) { const d = dEnt(e, S.crudo || w); if (d < md) { md = d; mejor = i; } } }); if (mejor >= 0) p.circ = { c: S.ents[mejor].c, R: S.ents[mejor].R }; return; }
        const pv = provisional(); if (pv) termina(pv); else S.pend = []; return;
      }
      if (t === 'achurar') {
        const c = contornos(), q = S.crudo || w; let cand = c.filter((k) => dentro(q, k.pts)).sort((a, b) => a.area - b.area)[0];
        if (!cand) { let md = 10 / S.s; for (const k of c) { const d = Math.min(...k.pts.map((u, i) => dSeg(q, u, k.pts[(i + 1) % k.pts.length]))); if (d < md) { md = d; cand = k; } } }
        if (!cand) { estado('Achurado: haz clic DENTRO de un contorno cerrado (rectángulo, círculo o polilínea cerrada)'); return; }
        termina({ t: 'achurado', pts: cand.pts.map((u) => u.slice()), patron: S.patron, peso: S.peso, capa: S.capa }); return;
      }
      p.push(w);
      if (t === 'linea' && p.length === 2) termina({ t: 'linea', a: p[0], b: p[1], peso: S.peso });
      else if (t === 'rect' && p.length === 2) termina({ t: 'rect', a: p[0], b: p[1], peso: S.peso });
      else if (t === 'circulo' && p.length === 2) { const R = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]); if (R > 1e-9) termina({ t: 'circulo', c: p[0], R, peso: S.peso }); else S.pend = []; }
      else if (t === 'arco' && p.length === 3) { const R = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]); if (R > 1e-9) termina({ t: 'arco', c: p[0], R, a0: Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]) * 180 / Math.PI, a1: Math.atan2(p[2][1] - p[0][1], p[2][0] - p[0][0]) * 180 / Math.PI, peso: S.peso }); else S.pend = []; }
      else if (t === 'cota' && p.length === 3) { const pv = provisional(); if (pv && pv.t === 'cota') termina(pv); else S.pend = []; }
      else if (t === 'texto') { S.pend = []; entrada(px(w[0]), py(w[1]) - 10, 'Texto', (v) => { if (v.trim()) { push(); S.ents.push({ t: 'texto', a: w, txt: v.trim(), h: Math.max(0.1, +(14 / S.s).toFixed(2)), peso: S.peso, capa: S.capa }); S.sel = S.ents.length - 1; } }); }
    };
    const siguienteEstado = () => { const t = S.tool, n = S.pend.length;
      if (t === 'cotaang') return S.pend.ang ? 'Cota angular: posición del arco de cota' : S.pend.l1 != null ? 'Cota angular: segunda línea' : ['Cota angular: clic en una línea (o en el vértice)', 'Cota angular: primer punto', 'Cota angular: segundo punto'][n] || null;
      if (t === 'cotarad' || t === 'cotadia') return S.pend.circ ? (t === 'cotarad' ? 'Cota de radio' : 'Cota de diámetro') + ': posición de la línea de cota' : ayuda[t]; const txt = { linea: ['primer punto', 'segundo punto'], poli: ['primer punto', 'siguiente punto (Enter o doble clic termina)'], rect: ['primera esquina', 'esquina opuesta'], circulo: ['centro', 'punto del borde'], arco: ['centro', 'punto de inicio', 'punto final (antihorario)'], cota: ['punto A', 'punto B', 'posición de la línea de cota'], mover: ['punto base', 'destino'], copiar: ['punto base', 'destino (otra copia: otro clic base)'], girar: ['centro de giro', 'punto de referencia', 'nueva posición del punto'] }[t];
      if (txt && (t === 'mover' || t === 'copiar' || t === 'girar')) return S.sel < 0 ? { mover: 'Mover', copiar: 'Copiar', girar: 'Girar' }[t] + ': clic en la entidad' : { mover: 'Mover', copiar: 'Copiar', girar: 'Girar' }[t] + ': ' + txt[Math.min(n, txt.length - 1)];
      return txt ? (t[0].toUpperCase() + t.slice(1)).replace('Poli', 'Polilínea').replace('Circulo', 'Círculo') + ': ' + txt[Math.min(n, txt.length - 1)] : null; };
    const cierra = (guarda) => {
      if (guarda) {
        const code = escribe(S.ents, S.extra, S.capas);
        if (rec) { rec.ta.value = code; rec.dibuja(); } else HK.hoja.nuevoCad(code);
      }
      document.removeEventListener('keydown', tecla, true); root.remove();
    };
    const tecla = (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') return;
      if (e.key === 'Escape') { if (S.pend.length) { S.pend = []; redib(); } else if (S.tool !== 'sel') { S.tool = 'sel'; redib(); } e.stopPropagation(); }
      else if (e.key === 'Delete' && S.sel >= 0) { push(); S.ents.splice(S.sel, 1); S.sel = -1; redib(); }
      else if (e.key === 'Enter' && S.tool === 'poli' && S.pend.length >= 2) { termina({ t: 'poli', pts: S.pend.slice(), peso: S.peso }); redib(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); deshaz(); }
      e.stopPropagation();
    };
    const deshaz = () => { const u = S.deshacer.pop(); if (u) { const o = JSON.parse(u); S.ents = o.e; S.capas = o.c; if (!S.capas.some((x) => x.n === S.capa)) S.capa = '0'; S.sel = -1; S.pend = []; sincapas(); redib(); } };
    document.addEventListener('keydown', tecla, true);
    root.querySelector('.hcad-bar').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t) { S.tool = b.dataset.t; S.pend = []; estado(); redib(); }
      else if (b.dataset.a === 'undo') deshaz(); else if (b.dataset.a === 'fit') { fit(); redib(); }
      else if (b.dataset.a === 'capas') { panel.hidden = !panel.hidden; sincapas(); }
      else if (b.dataset.a === 'ok') cierra(true); else if (b.dataset.a === 'no') cierra(false);
    });
    root.querySelector('.peso').addEventListener('change', (e) => { S.peso = e.target.value; if (S.sel >= 0 && S.tool === 'sel') { push(); S.ents[S.sel].peso = S.peso; redib(); } });
    root.querySelector('.capa').addEventListener('change', (e) => { S.capa = e.target.value; const c = S.capas.find((x) => x.n === S.capa); if (c && c.c < 0) c.c = -c.c; sincapas(); redib(); });
    root.querySelector('.patron').addEventListener('change', (e) => { S.patron = e.target.value; if (S.tool === 'sel' && S.sel >= 0 && S.ents[S.sel].t === 'achurado') { push(); S.ents[S.sel].patron = S.patron; redib(); } });
    // panel de capas: activar (●), mostrar/ocultar (◉/◌), color y crear
    const panel = document.createElement('div'); panel.className = 'hcad-capas'; panel.hidden = true; root.appendChild(panel);
    function sincapas() {
      const sel = root.querySelector('.capa'); sel.innerHTML = S.capas.map((c) => '<option value="' + esc(c.n) + '"' + (c.n === S.capa ? ' selected' : '') + '>' + esc(c.n) + '</option>').join('');
      if (panel.hidden) return;
      panel.innerHTML = '<h4>Capas</h4>' + S.capas.map((c) => '<div class="cp-f' + (c.n === S.capa ? ' act' : '') + (c.c < 0 ? ' off' : '') + '" data-n="' + esc(c.n) + '"><button class="cp-act" title="Capa activa: lo que dibujes va aquí">' + (c.n === S.capa ? '●' : '○') + '</button><button class="cp-ojo" title="Mostrar / ocultar">' + (c.c < 0 ? '◌' : '◉') + '</button><select class="cp-col" title="Color">' +
        NOMCOL.map((q) => '<option value="' + q[0] + '"' + (Math.abs(c.c) === q[0] ? ' selected' : '') + '>' + q[1] + '</option>').join('') + '</select><span class="cp-nom">' + esc(c.n) + '</span><span class="cp-n">' + S.ents.filter((e) => e.capa === c.n).length + '</span></div>').join('') +
        '<div class="cp-nuevo"><input class="cp-nn" placeholder="Nombre de la capa" maxlength="30"><select class="cp-nc">' + NOMCOL.map((q) => '<option value="' + q[0] + '">' + q[1] + '</option>').join('') + '</select><button class="cp-crear" title="Crear la capa y activarla">Crear</button></div>' +
        '<div class="cp-nuevo"><button class="cp-asig" title="Pasa la entidad elegida a la capa activa">Elegida → capa activa</button></div>';
    }
    panel.addEventListener('click', (e) => {
      e.stopPropagation(); const b = e.target.closest('button'); if (!b) return; const f = b.closest('.cp-f'), c = f && S.capas.find((x) => x.n === f.dataset.n);
      if (b.classList.contains('cp-act') && c) { S.capa = c.n; if (c.c < 0) c.c = -c.c; }
      else if (b.classList.contains('cp-ojo') && c) { c.c = c.c === 0 ? -7 : -c.c; }
      else if (b.classList.contains('cp-crear')) {
        const n = panel.querySelector('.cp-nn').value.trim().replace(/["|()';\s]+/g, '_'); if (!n) return;
        if (!S.capas.some((x) => x.n === n)) S.capas.push({ n, c: +panel.querySelector('.cp-nc').value }); S.capa = n; const c2 = S.capas.find((x) => x.n === n); if (c2.c < 0) c2.c = -c2.c;
      } else if (b.classList.contains('cp-asig')) { if (S.sel >= 0) { push(); S.ents[S.sel].capa = S.capa; } }
      sincapas(); redib();
    });
    panel.addEventListener('change', (e) => { const f = e.target.closest('.cp-f'), c = f && S.capas.find((x) => x.n === f.dataset.n); if (c && e.target.classList.contains('cp-col')) { c.c = (c.c < 0 ? -1 : 1) * +e.target.value; sincapas(); redib(); } });
    ['mousedown', 'wheel', 'keydown'].forEach((k) => panel.addEventListener(k, (e) => e.stopPropagation()));
    root.querySelector('.snap').addEventListener('change', (e) => { S.snap = e.target.checked; });
    root.querySelector('.iman').addEventListener('change', (e) => { S.imanes = e.target.checked; if (!S.imanes) S.iman = null; redib(); });
    lienzo.addEventListener('mousemove', (e) => {
      const r = lienzo.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
      if (S.pan) { S.x0 -= (cx - S.pan[0]) / S.s; S.y0 += (cy - S.pan[1]) / S.s; S.pan = [cx, cy]; redib(); return; }
      S.crudo = aMundo(cx, cy); S.mouse = sn(S.crudo); estado(siguienteEstado()); redib();
    });
    lienzo.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT') return; e.preventDefault();          // sin esto el clic le quita el foco a la caja de texto recién abierta
      const r = lienzo.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) { S.pan = [cx, cy]; e.preventDefault(); return; }
      if (e.button === 2) { if (S.tool === 'poli' && S.pend.length >= 2) { termina({ t: 'poli', pts: S.pend.slice(), peso: S.peso }); redib(); } return; }
      if (e.target.closest && e.target.closest('.hc-cota')) return;
      S.crudo = aMundo(cx, cy); clic(sn(S.crudo)); estado(siguienteEstado()); redib();
    });
    window.addEventListener('mouseup', () => { S.pan = null; });
    lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
    lienzo.addEventListener('dblclick', (e) => {
      const c = e.target.closest && e.target.closest('.hc-cota');
      if (c) {          // medida de la cota: la B se mueve para cumplirla y el rótulo la sigue
        const i = +c.dataset.i, en = S.ents[i], g = cotaG(en), r = lienzo.getBoundingClientRect(), cr = c.getBoundingClientRect();
        entrada(cr.left - r.left, cr.top - r.top - 4, String(+g.L.toFixed(4)), (v) => { const L = parseFloat(v.replace(',', '.')); if (L > 0) { push(); const ux = (en.b[0] - en.a[0]) / g.L, uy = (en.b[1] - en.a[1]) / g.L; en.b = [en.a[0] + ux * L, en.a[1] + uy * L]; en.txt = null; } });
        return;
      }
      if (S.tool === 'poli' && S.pend.length >= 3) { S.pend.pop(); termina({ t: 'poli', pts: S.pend.slice(), peso: S.peso }); redib(); }
    });
    lienzo.addEventListener('wheel', (e) => {
      e.preventDefault(); const r = lienzo.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top, w = aMundo(cx, cy), f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      S.s = Math.max(2, Math.min(2000, S.s * f)); S.x0 = w[0] - cx / S.s; S.y0 = w[1] - (dim().H - cy) / S.s; redib();
    }, { passive: false });
    requestAnimationFrame(() => { fit(); sincapas(); estado(); redib(); });
    return S;
  }
  HK.cadEditor = { abre, lee, escribe };
})(window);
