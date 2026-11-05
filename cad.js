// Hekatan Math Studio Web — pestaña CAD: el código AutoLISP del bloque corre en el motor de Hekatan LISP (WASM: linea, rect, circulo, arco, texto, cota, achurado, curva, capa, entmake…),
// las entidades que deja (listas DXF de entget) se dibujan en SVG y se bajan como .lsp (AutoLISP para AutoCAD: entmake) o DXF, igual que el CAD de la versión WPF.
(function (G) {
  const HK = G.HK;

  // ---------------------------------------------------------------- lector mínimo de listas LISP: "((0 . \"LINE\") (10 0.0 0.0 0.0))" → grupos {c, v[], r[]}
  function leeLisp(s) {
    const tk = s.match(/\(|\)|"(?:[^"\\]|\\.)*"|[^\s()"]+/g) || []; let i = 0;
    function elem() {
      const t = tk[i++]; if (t === undefined) throw new Error('lista incompleta');
      if (t === '(') { const l = []; while (tk[i] !== ')') { if (i >= tk.length) throw new Error('lista incompleta'); l.push(elem()); } i++; return l; }
      if (t === '.') return { punto: true };
      if (t[0] === '"') return { s: t, v: JSON.parse(t) };
      return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t) ? { s: t, v: parseFloat(t) } : { s: t, v: t };
    }
    return elem();
  }
  function grupos(txt) {          // "((…)(…))" → [entidad = [{c, v:[], r:[], par}]]   (par: «(0 . "LINE")»; si no, «(10 x y z)»)
    return leeLisp(txt).map((e) => e.map((g) => {
      const c = g[0].v; if (g.length === 3 && g[1].punto) return { c, v: [g[2].v], r: [g[2].s], par: true };
      return { c, v: g.slice(1).map((x) => x.v), r: g.slice(1).map((x) => x.s), par: false };
    }));
  }
  const val = (g) => g.par ? g.v[0] : g.v;          // «(40 . 0.5)» → 0.5 ;  «(10 x y z)» → [x, y, z]
  const get = (e, c) => { const g = e.find((x) => x.c === c); return g ? val(g) : null; };
  const todos = (e, c) => e.filter((x) => x.c === c).map(val);

  // ---------------------------------------------------------------- ejecutar el código del bloque en el motor
  const LIMPIA = '(let ((l nil) (e (entnext))) (loop while e do (push e l) (setq e (entnext e))) (dolist (x l) (entdel x)))';
  const VUELCA = "(let ((r nil) (e (entnext))) (loop while e do (push (remove-if (lambda (g) (and (consp g) (member (car g) '(-1 5)))) (entget e)) r) (setq e (entnext e))) (reverse r))";
  const PESO_DXF = { gruesa: 100, media: 50, fina: 25 }, PESO_PX = { gruesa: 2.8, media: 1.6, fina: 0.8 };          // grosor de trazo: DXF 370 en centésimas de mm (1,0 · 0,5 · 0,25 mm) y píxeles en pantalla
  const pesoDe = (e) => e.peso || null;
  // (peso "x") y (capa "N" ...) comparten la capa actual del motor: se combinan en «N|x»; al volcar se separan (capa N, grosor x)
  const aCapaPeso = (cod) => {
    let N = '0', P = null;
    return '(capa "0")\n' + cod.replace(/\((capa|peso)\s+"?([^")\s]*)"?([^()]*)\)/gi, (m, k, v) => {
      if (k.toLowerCase() === 'peso') { if (!/^(gruesa|media|fina)$/i.test(v)) return m; P = v.toLowerCase(); return '(capa "' + N + '|' + P + '")'; }
      N = v; return P ? m + ' (capa "' + N + '|' + P + '")' : m;
    });
  };
  function separaCapas(ents) {          // «N|x» -> capa N + grosor x ; tabla de capas (color, apagada) del motor -> ents.capas
    const M = HK.motor, nombres = new Set();
    for (const e of ents) { const g = e.find((x) => x.c === 8); if (!g) continue; const v = String(val(g)), i = v.lastIndexOf('|'); if (i >= 0) { e.peso = v.slice(i + 1); g.v = [v.slice(0, i)]; g.r = [JSON.stringify(v.slice(0, i))]; } nombres.add(String(val(g))); }
    ents.capas = {};
    try {
      const L = grupos(M.run('(prin1 (mapcar (lambda (n) (tblsearch "LAYER" n)) (quote (' + [...nombres].map((n) => JSON.stringify(n)).join(' ') + '))))'));
      for (const l of L) { const n = get(l, 2), c = get(l, 62); if (n == null) continue; ents.capas[n] = { c: c == null ? 7 : c, off: c < 0 || ((get(l, 70) || 0) & 1) === 1 }; }
    } catch (x) { /* sin tabla de capas: todo visible */ }
    return ents;
  }
  function ejecuta(codigo) {
    codigo = aCapaPeso(codigo);
    const M = HK.motor; if (!M.listo) return { ents: [], error: M.error ? 'motor: ' + M.error : 'el motor simbólico todavía está cargando…', cargando: !M.error };
    const s = M.run('(prin1 (progn ' + LIMPIA + '\n' + codigo + '\n' + VUELCA + '))');
    if (s.startsWith(';')) return { ents: [], error: s.replace(/^;\s*(error:\s*)?/, '').split('\n')[0].trim() };
    try { return { ents: separaCapas(grupos(s)) }; } catch (e) { return { ents: [], error: 'no se pudo leer el dibujo: ' + e.message }; }
  }

  // ---------------------------------------------------------------- SVG
  const ACI = { 1: '#d32f2f', 2: '#d99a00', 3: '#2e9e4f', 4: '#00a5b5', 5: '#1a4fa3', 6: '#b0359b', 7: '#222', 8: '#777', 9: '#aaa' };
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nfin = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
  const suave = (c) => (c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c) + '55';          // relleno translucido (#rgb se expande a #rrggbb)
  const pts = (e, c) => todos(e, c).filter((v) => v.length >= 2);
  function dimGeom(e) {          // cota alineada: puntos 13 y 14, posición de la línea de cota 10
    const a = get(e, 13), b = get(e, 14), p = get(e, 10); if (!a || !b || !p) return null;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, s = (p[0] - a[0]) * nx + (p[1] - a[1]) * ny;
    return { a, b, ux, uy, nx, ny, s, L };
  }
  // ---- cotas angular (70 = 5: 13, 14 y vertice 15; 10 = posicion del arco), de radio (4) y de diametro (3): de 10 a 15
  const ang = (v, p) => Math.atan2(p[1] - v[1], p[0] - v[0]), norm2 = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  function cotaEsp(e) {
    const k = (get(e, 70) || 0) & 7, d = get(e, 10), q = get(e, 15); if (!d || !q) return null;
    if (k === 5) {
      const p1 = get(e, 13), p2 = get(e, 14); if (!p1 || !p2) return null;
      const a1 = ang(q, p1), a2 = ang(q, p2), ad = ang(q, d), R = Math.hypot(d[0] - q[0], d[1] - q[1]);
      const o = norm2(ad - a1) <= norm2(a2 - a1) ? { t0: a1, dt: norm2(a2 - a1) } : { t0: a2, dt: norm2(a1 - a2) };
      return { k, v: q, p1, p2, R, t0: o.t0, dt: o.dt, m: o.dt * 180 / Math.PI, pts: [p1, p2, [q[0] - R, q[1] - R], [q[0] + R, q[1] + R]] };
    }
    return { k, a: d, b: q, m: Math.hypot(q[0] - d[0], q[1] - d[1]), pts: [d, q] };
  }
  function cotaEspecialSvg(e, X, Y, s) {
    const g = cotaEsp(e); if (!g) return '';
    const txtU = get(e, 1), c = '#555', ln = (a, b) => '<line x1="' + X(a[0]) + '" y1="' + Y(a[1]) + '" x2="' + X(b[0]) + '" y2="' + Y(b[1]) + '" stroke="' + c + '" stroke-width="1"/>';
    const fl = (x, y, ux, uy) => '<polygon points="' + [[x, y], [x - 8 * ux - 2.5 * uy, y - 8 * uy + 2.5 * ux], [x - 8 * ux + 2.5 * uy, y - 8 * uy - 2.5 * ux]].map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '" fill="' + c + '"/>';
    const txt = (t, x, y, rot) => '<text class="cota-t" transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + (rot || 0).toFixed(1) + ')" text-anchor="middle" font-size="11" fill="#333">' + esc(t) + '</text>';
    const sobre = (t) => (txtU && txtU !== '<>') ? txtU.replace('<>', t) : t;
    if (g.k === 5) {
      let o = '<g class="hk-cota-esp">'; const cx = +X(g.v[0]), cy = +Y(g.v[1]), R = g.R * s;
      for (const [p, a] of [[g.p1, ang(g.v, g.p1)], [g.p2, ang(g.v, g.p2)]]) { if (Math.hypot(p[0] - g.v[0], p[1] - g.v[1]) < g.R) o += ln(p, [g.v[0] + g.R * Math.cos(a), g.v[1] + g.R * Math.sin(a)]); }
      const pa = (a) => [cx + R * Math.cos(a), cy - R * Math.sin(a)], A = pa(g.t0), B = pa(g.t0 + g.dt);
      o += '<path d="M' + A.map((v) => v.toFixed(1)) + ' A' + R.toFixed(1) + ' ' + R.toFixed(1) + ' 0 ' + (g.dt > Math.PI ? 1 : 0) + ' 0 ' + B.map((v) => v.toFixed(1)) + '" fill="none" stroke="' + c + '" stroke-width="1"/>';
      o += fl(A[0], A[1], Math.sin(g.t0), Math.cos(g.t0)) + fl(B[0], B[1], -Math.sin(g.t0 + g.dt), -Math.cos(g.t0 + g.dt));
      const tm = g.t0 + g.dt / 2; return o + txt(sobre((Math.round(g.m * 100) / 100) + '\u00b0'), cx + (R + 12) * Math.cos(tm), cy - (R + 12) * Math.sin(tm) + 4) + '</g>';
    }
    const A = [+X(g.a[0]), +Y(g.a[1])], B = [+X(g.b[0]), +Y(g.b[1])]; let ux = B[0] - A[0], uy = B[1] - A[1]; const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    let an = Math.atan2(uy, ux); if (an > Math.PI / 2 || an < -Math.PI / 2) an += Math.PI;
    return '<g class="hk-cota-esp"><line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '" stroke="' + c + '" stroke-width="1"/>' + fl(B[0], B[1], ux, uy) + (g.k === 3 ? fl(A[0], A[1], -ux, -uy) : '') +
      txt(sobre((g.k === 3 ? '\u00d8' : 'R') + HK.fmt(g.m)), (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 3, an * 180 / Math.PI) + '</g>';
  }
  // ---- cotas editables: reescriben la línea «(cota …)» del código AutoLISP (la k-ésima, en orden)
  const NUM = '(-?\\d+(?:\\.\\d+)?(?:e-?\\d+)?)', fnum = (v) => String(+(+v).toFixed(4));
  function formaCota(code, k) {
    let i = -1, n = 0; const re = /\(cota\b/g; let m;
    while ((m = re.exec(code))) { if (n++ === k) { i = m.index; break; } }
    if (i < 0) return null;
    let d = 0, j = i, enStr = false; for (; j < code.length; j++) { const ch = code[j]; if (ch === '"') enStr = !enStr; else if (!enStr) { if (ch === '(') d++; else if (ch === ')' && --d === 0) break; } }
    return j < code.length ? { i, j: j + 1, txt: code.slice(i, j + 1) } : null;
  }
  // cambio: {medida:L} · {sep:v, sepOld:v0} · {a:[x,y]} · {b:[x,y]}; devuelve el código nuevo o null si la cota usa expresiones
  function editaCota(code, k, ch) {
    const f = formaCota(code, k); if (!f) return null; let t = f.txt;
    const rp = new RegExp("'?\\(\\s*" + NUM + '\\s+' + NUM + '\\s*\\)', 'g'); const P = []; let m;
    while ((m = rp.exec(t)) && P.length < 2) P.push({ i: m.index, len: m[0].length, x: +m[1], y: +m[2] });
    if (P.length < 2) return null;
    const pt = (p, x, y) => "'(" + fnum(x) + ' ' + fnum(y) + ')';
    let a = [P[0].x, P[0].y], b = [P[1].x, P[1].y], texto = null;
    if (ch.a) a = ch.a; if (ch.b) b = ch.b;
    if (ch.medida != null) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; b = [a[0] + dx / L * ch.medida, a[1] + dy / L * ch.medida]; texto = ch.medida; }
    else if (ch.a || ch.b) texto = Math.hypot(b[0] - a[0], b[1] - a[1]);          // al mover un punto, el rótulo sigue a la medida real
    // se reemplaza de atrás hacia adelante para no mover los índices
    t = t.slice(0, P[1].i) + pt(P[1], b[0], b[1]) + t.slice(P[1].i + P[1].len);
    t = t.slice(0, P[0].i) + pt(P[0], a[0], a[1]) + t.slice(P[0].i + P[0].len);
    if (ch.sep != null) {
      const rs = new RegExp(':sep\\s+' + NUM), v = (ch.sepOld && Math.abs(ch.sepOld) > 1e-9 && rs.test(t)) ? +rs.exec(t)[1] * ch.sep / ch.sepOld : ch.sep;
      t = rs.test(t) ? t.replace(rs, ':sep ' + fnum(v)) : t.replace(/\)\s*$/, ' :sep ' + fnum(v) + ')');
    }
    if (texto != null) t = t.replace(/(:texto\s+"[^"]*?)-?\d+(?:\.\d+)?/, (q, pre) => pre + fnum(texto));          // el número del rótulo sigue a la medida
    return code.slice(0, f.i) + t + code.slice(f.j);
  }
  function puntosEnt(e) {          // para el encuadre
    const t = get(e, 0), r = [];
    if (t === 'CIRCLE' || t === 'ARC') { const c = get(e, 10), R = get(e, 40); r.push([c[0] - R, c[1] - R], [c[0] + R, c[1] + R]); }
    else if (t === 'HATCH') pts(e, 10).slice(1).forEach((p) => r.push(p));
    else if (t === 'DIMENSION' && [3, 4, 5].includes((get(e, 70) || 0) & 7)) { const g = cotaEsp(e); if (g) g.pts.forEach((q) => r.push(q)); }
    else if (t === 'DIMENSION') { const d = dimGeom(e); if (d) r.push(d.a, d.b, [d.a[0] + d.nx * d.s, d.a[1] + d.ny * d.s], [d.b[0] + d.nx * d.s, d.b[1] + d.ny * d.s]); }
    else if (t === 'TEXT') { const p = get(e, 10), h = get(e, 40) || 1, n = (get(e, 1) || '').length; r.push([p[0], p[1]], [p[0] + n * h * 0.6, p[1] + h]); }
    else for (const c of [10, 11, 12, 13]) pts(e, c).forEach((p) => r.push(p));
    return r;
  }
  function aSvg(ents, ancho) {
    const P = []; ents.forEach((e) => { const ci = (ents.capas || {})[get(e, 8)]; if (!(ci && ci.off)) puntosEnt(e).forEach((p) => P.push(p)); });
    if (!P.length) return '<svg xmlns="http://www.w3.org/2000/svg" width="' + ancho + '" height="40"><text x="8" y="24" fill="#888" font-size="12">(el dibujo está vacío)</text></svg>';
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    if (x1 - x0 < 1e-9) x1 = x0 + 1; if (y1 - y0 < 1e-9) y1 = y0 + 1;
    let M = 24, k = (ancho - 2 * M) / (x1 - x0), alto = Math.max(60, Math.min(520, (y1 - y0) * k + 2 * M)), s = Math.min(k, (alto - 2 * M) / (y1 - y0));
    if (HK.cad.vistaFija) { [x0, y0, s, alto, M] = HK.cad.vistaFija; }          // durante un arrastre la escala no cambia (si no, el ratón se desfasa en cada redibujo)
    const X = (x) => (M + (x - x0) * s).toFixed(2), Y = (y) => (alto - M - (y - y0) * s).toFixed(2), n = (v) => (v * s).toFixed(2);
    let kCota = 0;
    let o = '<svg xmlns="http://www.w3.org/2000/svg" data-g="' + [x0, y0, s, alto, M].join(',') + '" width="' + ancho + '" height="' + alto + '" font-family="Segoe UI,sans-serif"><defs><pattern id="hkh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#444" stroke-width="1"/></pattern><pattern id="hkh37" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#444" stroke-width="1"/><line x1="0" y1="0" x2="6" y2="0" stroke="#444" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="#fff"/>';
    for (const e of ents) {
      const ci = (ents.capas || {})[get(e, 8)]; if (ci && ci.off) continue;
      const t = get(e, 0), col = ACI[get(e, 62)] || (ci && ACI[Math.abs(ci.c)]) || '#222', pw = pesoDe(e), st = 'stroke="' + col + '" fill="none" stroke-width="' + (pw ? PESO_PX[pw] : 1.4) + '" stroke-linejoin="round"';
      if (t === 'LINE') { const a = get(e, 10), b = get(e, 11); o += '<line x1="' + X(a[0]) + '" y1="' + Y(a[1]) + '" x2="' + X(b[0]) + '" y2="' + Y(b[1]) + '" ' + st + '/>'; }
      else if (t === 'LWPOLYLINE' || t === 'POLYLINE') { const q = pts(e, 10); o += '<' + ((get(e, 70) || 0) & 1 ? 'polygon' : 'polyline') + ' points="' + q.map((p) => X(p[0]) + ',' + Y(p[1])).join(' ') + '" ' + st + '/>'; }
      else if (t === 'CIRCLE') { const c = get(e, 10); o += '<circle cx="' + X(c[0]) + '" cy="' + Y(c[1]) + '" r="' + n(get(e, 40)) + '" ' + st + '/>'; }
      else if (t === 'ARC') {
        const c = get(e, 10), R = get(e, 40), a1 = get(e, 50), a2 = get(e, 51); let d = a2 - a1; if (d <= 0) d += 2 * Math.PI;
        const sx = c[0] + R * Math.cos(a1), sy = c[1] + R * Math.sin(a1), ex = c[0] + R * Math.cos(a2), ey = c[1] + R * Math.sin(a2);
        o += '<path d="M' + X(sx) + ' ' + Y(sy) + ' A' + n(R) + ' ' + n(R) + ' 0 ' + (d > Math.PI ? 1 : 0) + ' 0 ' + X(ex) + ' ' + Y(ey) + '" ' + st + '/>';
      }
      else if (t === 'TEXT') { const p = get(e, 10), h = get(e, 40) || 1, ang = (get(e, 50) || 0) * 180 / Math.PI; o += '<text transform="translate(' + X(p[0]) + ',' + Y(p[1]) + ') rotate(' + (-ang).toFixed(2) + ')" font-size="' + Math.max(4, h * s).toFixed(1) + '" fill="' + col + '">' + esc(get(e, 1)) + '</text>'; }
      else if (t === 'HATCH') {
        const q = pts(e, 10).slice(1); const solido = (get(e, 2) || '').toUpperCase() === 'SOLID';
        o += '<polygon points="' + q.map((p) => X(p[0]) + ',' + Y(p[1])).join(' ') + '" fill="' + (solido ? suave(col) : /^(ANSI3[5-9]|NET|CROSS)/i.test(get(e, 2) || '') ? 'url(#hkh37)' : 'url(#hkh)') + '" stroke="' + col + '" stroke-width="0.8"/>';
      }
      else if (t === 'DIMENSION' && [3, 4, 5].includes((get(e, 70) || 0) & 7)) o += cotaEspecialSvg(e, X, Y, s);
      else if (t === 'DIMENSION') {
        const d = dimGeom(e); if (!d) continue; const ox = d.nx * d.s, oy = d.ny * d.s, tk = 4;
        o += '<g class="hk-cota" data-k="' + (kCota++) + '" data-a="' + nfin(d.a[0]) + ',' + nfin(d.a[1]) + '" data-b="' + nfin(d.b[0]) + ',' + nfin(d.b[1]) + '" data-s="' + nfin(d.s) + '">';
        const A = [d.a[0] + ox, d.a[1] + oy], B = [d.b[0] + ox, d.b[1] + oy], g = 'stroke="#555" stroke-width="1"';
        o += '<line x1="' + X(d.a[0]) + '" y1="' + Y(d.a[1]) + '" x2="' + X(A[0]) + '" y2="' + Y(A[1]) + '" ' + g + '/><line x1="' + X(d.b[0]) + '" y1="' + Y(d.b[1]) + '" x2="' + X(B[0]) + '" y2="' + Y(B[1]) + '" ' + g + '/>';
        o += '<line x1="' + X(A[0]) + '" y1="' + Y(A[1]) + '" x2="' + X(B[0]) + '" y2="' + Y(B[1]) + '" ' + g + '/>';
        for (const Q of [A, B]) o += '<line x1="' + (X(Q[0]) - tk) + '" y1="' + (+Y(Q[1]) + tk) + '" x2="' + (+X(Q[0]) + tk) + '" y2="' + (Y(Q[1]) - tk) + '" ' + g + '/>';
        const txt = get(e, 1) || HK.fmt(get(e, 42) != null ? get(e, 42) : d.L);
        const mx = ((+X(A[0]) + +X(B[0])) / 2).toFixed(1), my = (((+Y(A[1]) + +Y(B[1])) / 2) - 4).toFixed(1);
        o += '<text class="cota-t" x="' + mx + '" y="' + my + '" text-anchor="middle" font-size="11" fill="#333"><title>Doble clic: editar la medida</title>' + esc(txt) + '</text>';
        const H = (cls, x, y, ttl) => '<circle class="h" data-p="' + cls + '" cx="' + x + '" cy="' + y + '" r="5.5"><title>' + ttl + '</title></circle>';
        o += H('a', X(d.a[0]), Y(d.a[1]), 'Arrastra: mueve el punto medido A') + H('b', X(d.b[0]), Y(d.b[1]), 'Arrastra: mueve el punto medido B') + H('s', (+X(A[0]) + +X(B[0])) / 2, (+Y(A[1]) + +Y(B[1])) / 2 + 12, 'Arrastra: acerca o aleja la línea de cota') + '</g>';
      }
      else if (t === '3DFACE') { const q = [10, 11, 12, 13].map((c) => get(e, c)).filter(Boolean); o += '<polygon points="' + q.map((p) => X(p[0]) + ',' + Y(p[1])).join(' ') + '" fill="' + col + '22" ' + 'stroke="' + col + '" stroke-width="0.8"/>'; }
    }
    return o + '</svg>';
  }

  // ---------------------------------------------------------------- AutoLISP (.lsp) y DXF
  const FLOT = (c) => (c >= 10 && c <= 59) || (c >= 110 && c <= 149) || (c >= 210 && c <= 239) || (c >= 460 && c <= 469);
  const num = (g, i) => { const r = g.r[i]; return FLOT(g.c) && /^[-+]?\d+$/.test(r) ? r + '.0' : r; };
  const grupoLisp = (g) => g.par ? '(' + g.c + ' . ' + num(g, 0) + ')' : '(' + g.c + ' ' + g.r.map((_, i) => num(g, i)).join(' ') + ')';
  function aLsp(ents, nombre) {
    const capas = [...new Set(ents.map((e) => get(e, 8)).filter((c) => c && c !== '0'))];
    let o = ';;; ' + nombre + '.lsp — generado por Hekatan Math Studio Web (' + ents.length + ' entidades)\n;;; En AutoCAD: APPLOAD (o (load "' + nombre + '.lsp")) y escribir HKDIBUJO\n';
    o += '(defun c:HKDIBUJO ()\n';
    for (const c of capas) o += '  (if (not (tblsearch "LAYER" "' + c + '")) (entmake (list \'(0 . "LAYER") \'(100 . "AcDbSymbolTableRecord") \'(100 . "AcDbLayerTableRecord") (cons 2 "' + c + '") \'(70 . 0) \'(62 . ' + ((ents.capas || {})[c] ? ents.capas[c].c : 7) + ') \'(6 . "Continuous"))))\n';
    for (const e of ents) o += "  (entmake '(" + e.map(grupoLisp).join(' ') + (pesoDe(e) ? ' (370 . ' + PESO_DXF[pesoDe(e)] + ')' : '') + "))\n";
    return o + '  (princ "\\nHekatan: dibujo creado.")\n  (princ)\n)\n(princ "\\nEscribe HKDIBUJO para crear el dibujo.")\n(princ)\n';
  }
  function aDxf(ents) {
    const L = []; const w = (c, v) => { L.push(String(c), String(v)); };
    const capas = [...new Set(['0'].concat(ents.map((e) => get(e, 8)).filter(Boolean)))];
    w(0, 'SECTION'); w(2, 'HEADER'); w(9, '$ACADVER'); w(1, 'AC1015'); w(0, 'ENDSEC');
    w(0, 'SECTION'); w(2, 'TABLES'); w(0, 'TABLE'); w(2, 'LAYER'); w(70, capas.length);
    capas.forEach((c) => { w(0, 'LAYER'); w(2, c); w(70, 0); w(62, (ents.capas || {})[c] ? ents.capas[c].c : 7); w(6, 'Continuous'); }); w(0, 'ENDTAB'); w(0, 'ENDSEC');
    w(0, 'SECTION'); w(2, 'ENTITIES');
    for (const e of ents) { for (const g of e) {
      if (g.par) { w(g.c, (g.c === 50 || g.c === 51) && typeof g.v[0] === 'number' ? +(g.v[0] * 180 / Math.PI).toFixed(6) : typeof g.v[0] === 'string' ? g.v[0] : num(g, 0)); continue; }          // ángulos de arco y texto: radianes (entget) → grados (DXF)
      g.r.forEach((r, i) => w(g.c + i * 10, num({ c: g.c, r: g.r }, i)));          // punto (x y z) → 10/20/30
    } if (pesoDe(e)) w(370, PESO_DXF[pesoDe(e)]); }
    w(0, 'ENDSEC'); w(0, 'EOF'); return L.join('\n') + '\n';
  }
  // DWG (AutoCAD 2018): el mismo escritor que usa Hekatan LISP y el WPF (acadrust-wasm). El JSON lleva las entidades como listas de grupos DXF.
  const ENTERO = (k) => (k >= 60 && k <= 99) || (k >= 170 && k <= 179) || (k >= 280 && k <= 289) || (k >= 370 && k <= 389);
  function aDwgJson(ents) {
    const capas = [...new Set(['0'].concat(ents.map((e) => get(e, 8)).filter(Boolean)))];
    const E = ents.map((e) => e.map((g) => {
      if (g.par) { const v = g.v && g.v[0] !== undefined ? g.v[0] : g.r[0]; if ((g.c === 50 || g.c === 51) && typeof v === 'number') return [g.c, +(v * 180 / Math.PI).toFixed(6)]; return [g.c, typeof v === 'number' ? v : (FLOT(g.c) || ENTERO(g.c)) && v !== '' && !isNaN(+v) ? +v : String(v)]; }
      const p = g.r.map((x) => +x); while (p.length < 3 && g.c < 20) p.push(0); return [g.c, p];
    }).concat(pesoDe(e) ? [[370, PESO_DXF[pesoDe(e)]]] : []));
    return JSON.stringify({ version: 'AC1032', layers: capas.map((n) => ({ name: n, color: (ents.capas || {})[n] ? Math.abs(ents.capas[n].c) : 7 })), entities: E });
  }
  let dwgMod = null;
  async function bajaDwg(ents, nombre) {
    if (!dwgMod) { dwgMod = await import('./dwg/acadrust_wasm.mjs'); await dwgMod.default(new URL('dwg/acadrust_wasm_bg.wasm', document.baseURI)); }
    const bytes = dwgMod.write_dwg_bytes(aDwgJson(ents)); const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/acad' })); a.download = nombre || 'dibujo.dwg'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return bytes.length;
  }
  function baja(nombre, texto, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

  // ---------------------------------------------------------------- instrucciones de los botones de la cinta (como las de la pestaña CAD de WPF)
  const PRIM = {
    'Gruesa': '(peso "gruesa")', 'Media': '(peso "media")', 'Fina': '(peso "fina")',
    'Línea': "(linea '(0 0) '(4 0))", 'Rectángulo': "(rect '(0 0) 4 0.4)", 'Círculo': "(circulo '(2 1) 0.5)", 'Arco': "(arco '(2 0) 1 0 180)",
    'Polilínea': "(polilinea '((0 0) (1 1) (2 0) (3 1)))", 'Curva': '(curva (lambda (x) (* -0.1 x x)) 0 4)',
    'Achurado': "(achurado '((0 0) (4 0) (4 0.4) (0 0.4)) :patron \"ANSI31\")", 'Texto': "(texto '(2 1) \"Texto\" :altura 0.3)",
    'Cota': "(cota '(0 -0.6) '(4 -0.6) :sep -0.3 :texto \"L = 4.00\")", 'Capa': '(capa "CARGAS" :color 5)',
    'CotaAng': "(entmake '((0 . \"DIMENSION\") (100 . \"AcDbDimension\") (10 0.6 0.6 0.0) (70 . 37) (1 . \"\") (100 . \"AcDb3PointAngularDimension\") (13 1.0 0.0 0.0) (14 0.0 1.0 0.0) (15 0.0 0.0 0.0)))",
  };
  HK.cad = { ejecuta, aSvg, editaCota, aLsp, aDxf, aDwgJson, bajaDwg, baja, PRIM, grupos };
})(window);
