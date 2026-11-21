// Hekatan Math Studio Web — DIBUJO TÉCNICO 2D (SVG) de los bloques «#dibujo(…) … #fin» de Hekatan LISP.
// Puerto fiel de hekatan-lisp/LispDibujo.cs (Render, Style, primitivas, evaluador numérico de argumentos).
//   HK.dibujo.render(texto, lookup) → HTML (título + SVG + leyenda + observaciones + avisos)
//   lookup(nombre) → arreglo de números (escalar = [v], vector = [v1, v2…]) o null si no está definida.
// El papel va en MILÍMETROS (viewBox en mm); la geometría a escala 1:E (automática o «escala = 1:50»).
(function (G) {
  const HK = G.HK || (G.HK = {});

  const RxInicio = /^\s*#\s*dibujo\s*(?:\(([\s\S]*)\))?\s*$/i;
  const RxFin = /^\s*#\s*(?:fin\s*dibujo|findibujo|fin)\s*$/i;
  const RxCmd = /^\s*#\s*([A-Za-zÁÉÍÓÚáéíóúñÑ_]\w*)\s*\(([\s\S]*)\)\s*$/;

  // ---------------- bloque: cabecera + comandos (como ExtractBlocks) ----------------
  function bloque(texto) {
    const lines = String(texto || '').replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = RxInicio.exec(lines[i] || ''); if (!m) continue;
      const b = { cab: m[1] !== undefined ? m[1] : '', cmds: [] };
      for (let j = i + 1; j < lines.length; j++) {
        const t = (lines[j] || '').trim();
        if (RxFin.test(t)) break;
        if (!t.startsWith('#')) break;
        if (RxInicio.test(t)) break;
        const c = t.replace(/^#+/, '').trim();
        if (c.length) b.cmds.push(c);
      }
      return b;
    }
    return null;
  }

  // ---------------- expresiones: parser + evaluador NUMÉRICO (escalares y vectores) ----------------
  function tokens(s) {
    const out = [], re = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([\p{L}_][\p{L}\p{N}_]*)|(\*\*|[-+*\/^(),;\[\]·]))/uy;
    let k = 0; s = String(s);
    while (k < s.length) {
      if (/^\s*$/.test(s.slice(k))) break;
      re.lastIndex = k; const m = re.exec(s);
      if (!m) throw new Error('no se puede leer «' + s + '»');
      k = re.lastIndex;
      if (m[1] !== undefined) out.push({ k: 'n', v: parseFloat(m[1]) });
      else if (m[2] !== undefined) out.push({ k: 'id', v: m[2] });
      else out.push({ k: 'op', v: m[3] === '·' ? '*' : m[3] === '**' ? '^' : m[3] });
    }
    return out;
  }
  function parse(s) {
    const tk = tokens(s); let p = 0;
    const ve = () => tk[p], es = (v) => tk[p] && tk[p].k === 'op' && tk[p].v === v;
    const pide = (v) => { if (!es(v)) throw new Error('se esperaba «' + v + '» en «' + s + '»'); p++; };
    function add() { let a = mul(); while (es('+') || es('-')) { const op = tk[p++].v; a = { t: 'op', op, a, b: mul() }; } return a; }
    function mul() { let a = una(); while (es('*') || es('/')) { const op = tk[p++].v; a = { t: 'op', op, a, b: una() }; } return a; }
    function una() { if (es('-')) { p++; return { t: 'neg', a: una() }; } if (es('+')) { p++; return una(); } return pot(); }
    function pot() { const a = prim(); if (es('^')) { p++; return { t: 'op', op: '^', a, b: una() }; } return a; }
    function prim() {
      const t = ve(); if (!t) throw new Error('expresión incompleta: «' + s + '»');
      if (t.k === 'n') { p++; return { t: 'num', v: t.v }; }
      if (t.k === 'id') {
        p++;
        if (es('(')) { p++; const items = []; if (!es(')')) { items.push(add()); while (es(',')) { p++; items.push(add()); } } pide(')'); return { t: 'fn', n: t.v, items }; }
        return { t: 'id', n: t.v };
      }
      if (es('(')) { p++; const a = add(); pide(')'); return a; }
      if (es('[')) { p++; const items = []; if (!es(']')) { items.push(add()); while (es(',') || es(';')) { p++; if (es(']')) break; items.push(add()); } } pide(']'); return { t: 'vec', items }; }
      throw new Error('no se puede leer «' + s + '»');
    }
    const r = add(); if (p < tk.length) throw new Error('no se puede leer «' + s + '»'); return r;
  }
  function bin(a, b, f) {
    if (a.length === 1) return b.map((y) => f(a[0], y));
    if (b.length === 1) return a.map((x) => f(x, b[0]));
    if (a.length !== b.length) throw new Error('vectores de distinto largo (' + a.length + ' y ' + b.length + ')');
    return a.map((x, i) => f(x, b[i]));
  }
  function ev(n, look) {
    switch (n.t) {
      case 'num': return [n.v];
      case 'id': {
        if (n.n === 'pi' || n.n === 'π') return [Math.PI];
        const v = look ? look(n.n) : null;
        if (!v) throw new Error('«' + n.n + '» no está definida (o no es un número)');
        return v;
      }
      case 'neg': return ev(n.a, look).map((x) => -x);
      case 'op': {
        const a = ev(n.a, look), b = ev(n.b, look);
        switch (n.op) { case '+': return bin(a, b, (p, q) => p + q); case '-': return bin(a, b, (p, q) => p - q); case '*': return bin(a, b, (p, q) => p * q); case '/': return bin(a, b, (p, q) => p / q); case '^': return bin(a, b, Math.pow); }
        break;
      }
      case 'vec': return [].concat(...n.items.map((it) => ev(it, look)));
      case 'fn': {
        const f = n.n.toLowerCase(), items = n.items || [];
        const vv = look ? look(n.n) : null;          // v(i): componente i (base 1) de un vector de la hoja
        if (vv && items.length === 1) {
          const k = Math.round(ev(items[0], look)[0]) - 1;
          if (k < 0 || k >= vv.length) throw new Error('índice fuera de rango: ' + n.n + '(' + (k + 1) + ')');
          return [vv[k]];
        }
        const args = items.map((it) => ev(it, look)), U = (g) => args[0].map(g);
        switch (f) {
          case 'sqrt': return U(Math.sqrt); case 'abs': return U(Math.abs); case 'sin': return U(Math.sin); case 'cos': return U(Math.cos);
          case 'tan': return U(Math.tan); case 'exp': return U(Math.exp);
          case 'ceil': return U((x) => Math.ceil(x - 1e-9)); case 'floor': return U((x) => Math.floor(x + 1e-9)); case 'round': return U((x) => Math.floor(x + 0.5));
          case 'max': return args.length === 1 ? [Math.max(...args[0])] : args.reduce((p, q) => bin(p, q, Math.max));
          case 'min': return args.length === 1 ? [Math.min(...args[0])] : args.reduce((p, q) => bin(p, q, Math.min));
          case 'sum': case 'suma': return [args[0].reduce((s, x) => s + x, 0)];
          case 'len': case 'length': case 'numel': return [args[0].length];
          case 'dec': return args[0];
        }
        throw new Error('función desconocida en el dibujo: ' + n.n);
      }
    }
    throw new Error('operación no numérica');
  }

  // ---------------- argumentos de un comando ----------------
  function splitTop(s, sep) {
    const res = []; let depth = 0, inQ = false, cur = '';
    for (const c of String(s || '')) {
      if (c === '"') inQ = !inQ;
      if (!inQ) { if (c === '(' || c === '[' || c === '{') depth++; else if (c === ')' || c === ']' || c === '}') depth--; }
      if (c === sep && depth === 0 && !inQ) { res.push(cur); cur = ''; } else cur += c;
    }
    if (cur.trim().length > 0 || res.length > 0) res.push(cur);
    return res;
  }
  const unq = (t) => { t = t.trim(); return t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"' ? t.slice(1, -1) : t; };
  function parseArgs(inside) {
    return splitTop(inside, ',').map((p0) => {
      let p = p0.trim(); const a = { Raw: null, Str: null, Strs: null, Name: null };
      const nm = /^([A-Za-z_]\w*)\s*=(?!=)\s*([\s\S]+)$/.exec(p);
      if (nm && !p.startsWith('"')) { a.Name = nm[1].toLowerCase(); p = nm[2].trim(); }
      a.Raw = p;
      if (p.length >= 2 && p[0] === '"' && p[p.length - 1] === '"') a.Str = p.slice(1, -1);
      else if (p.length >= 2 && p[0] === '{' && p[p.length - 1] === '}') a.Strs = splitTop(p.slice(1, -1), ',').map(unq);
      return a;
    });
  }

  // ---------------- formato ----------------
  const F = (v) => { const r = Math.round(v * 1000) / 1000; return String(Object.is(r, -0) ? 0 : r); };
  function Num(v, dec = 2) {
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    const r = +v.toFixed(Math.max(1, dec)); return String(r);
  }
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  // texto en línea (título, leyenda, observaciones): **negrita**, _{sub}, ^{sup}
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/_\{([^{}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>');

  // ---------------- estilos ----------------
  function Style(s, defW = 0.25) {
    const st = { Col: 'var(--fg)', W: defW, Dash: null, Fill: false, FillOp: 0.15, NoStroke: false };
    for (const t0 of String(s || '').toLowerCase().split(/[ ,+]+/).filter(Boolean)) {
      switch (t0) {
        case 'fina': st.W = 0.18; break; case 'media': st.W = 0.3; break; case 'gruesa': st.W = 0.5; break; case 'muygruesa': st.W = 0.7; break;
        case 'eje': st.Dash = '7 1.2 1.2 1.2'; st.W = 0.18; st.Col = 'var(--mut)'; break;
        case 'trazos': case 'oculta': st.Dash = '2.2 1.2'; break;
        case 'puntos': st.Dash = '0.4 0.9'; break;
        case 'relleno': st.Fill = true; break;
        case 'denso': st.Fill = true; st.FillOp = 0.35; break;
        case 'tenue': st.Fill = true; st.FillOp = 0.08; break;
        case 'resalte': st.Fill = true; st.FillOp = 0.18; st.NoStroke = true; break;
        case 'sinborde': st.NoStroke = true; break;
        case 'negro': st.Col = 'var(--fg)'; break; case 'gris': st.Col = 'var(--mut)'; break;
        case 'rojo': st.Col = 'var(--dib-rojo)'; break; case 'azul': st.Col = 'var(--dib-azul)'; break;
        case 'verde': st.Col = 'var(--dib-verde)'; break; case 'naranja': st.Col = 'var(--dib-nar)'; break;
        case 'morado': st.Col = 'var(--nary)'; break;
        case 'acero': case 'varilla': st.Col = 'var(--dib-acero)'; st.W = Math.max(st.W, 0.55); break;
      }
    }
    return st;
  }
  const sty = (o) => Object.assign({ Col: 'var(--fg)', W: 0.25, Dash: null, Fill: false, FillOp: 0.15, NoStroke: false }, o);
  const StrokeCss = (st) => st.NoStroke ? 'stroke:none' : 'stroke:' + st.Col + ';stroke-width:' + F(st.W) + (st.Dash != null ? ';stroke-dasharray:' + st.Dash : '') + ';stroke-linecap:round;stroke-linejoin:round';
  const FillCss = (st) => st.Fill ? 'fill:' + st.Col + ';fill-opacity:' + F(st.FillOp) : 'fill:none';

  function SvgText(t) {
    let e = esc(t);
    e = e.replace(/_\{([^{}]*)\}/g, '<tspan baseline-shift="sub" font-size="72%">$1</tspan>');
    e = e.replace(/\^\{([^{}]*)\}/g, '<tspan baseline-shift="super" font-size="72%">$1</tspan>');
    return e;
  }
  const VisLen = (t) => String(t || '').replace(/[_^]\{([^{}]*)\}/g, '$1').length;

  // ---------------- contexto ----------------
  function Ctx(look) {
    const c = { Look: look, Ud: 'm', UdMm: 1000, UdCota: null, Dec: -1, K: 1, Vy: 1, X0: 0, Y1: 0, ML: 8, MT: 8, GxMin: 0, GxMax: 0, GyMin: 0, GyMax: 0, Sb: [],
      PxMin: Infinity, PxMax: -Infinity, PyMin: Infinity, PyMax: -Infinity, Id: 'hkd' + Math.random().toString(16).slice(2, 8) };
    c.Px = (x) => c.ML + (x - c.X0) * c.K;
    c.Py = (y) => c.MT + (c.Y1 - y) * c.K * c.Vy;
    c.Ext = (px, py) => { c.PxMin = Math.min(c.PxMin, px); c.PxMax = Math.max(c.PxMax, px); c.PyMin = Math.min(c.PyMin, py); c.PyMax = Math.max(c.PyMax, py); };
    return c;
  }

  function Text(c, px, py, txt, size, anchor = 'middle', ang = 0, col = 'var(--fg)', weight = null) {
    let s = '<text x="' + F(px) + '" y="' + F(py) + '" font-size="' + F(size) + '" text-anchor="' + anchor + '" dominant-baseline="middle" style="fill:' + col + ";stroke:none;font-family:'Segoe UI',Arial,sans-serif" + (weight != null ? ';font-weight:' + weight : '') + '"';
    if (Math.abs(ang) > 1e-6) s += ' transform="rotate(' + F(ang) + ' ' + F(px) + ' ' + F(py) + ')"';
    c.Sb.push(s + '>' + SvgText(txt) + '</text>');
    const w = VisLen(txt) * size * 0.56, h = size;
    const ca = Math.abs(Math.cos(ang * Math.PI / 180)), sa = Math.abs(Math.sin(ang * Math.PI / 180));
    const bw = w * ca + h * sa, bh = w * sa + h * ca;
    const cx = anchor === 'start' ? px + bw / 2 * ca : anchor === 'end' ? px - bw / 2 * ca : px;
    c.Ext(cx - bw / 2, py - bh / 2); c.Ext(cx + bw / 2, py + bh / 2);
  }
  function PLine(c, a, b, d, e, css) {
    c.Sb.push('<line x1="' + F(a) + '" y1="' + F(b) + '" x2="' + F(d) + '" y2="' + F(e) + '" style="' + css + '"/>');
    c.Ext(a, b); c.Ext(d, e);
  }
  function Line(c, x1, y1, x2, y2, st) { PLine(c, c.Px(x1), c.Py(y1), c.Px(x2), c.Py(y2), StrokeCss(st)); }
  const PUNTA_MM = 2.6, PUNTA_ANCHO = 0.40;
  const PuntaLargo = (c) => PUNTA_MM / c.K;
  function Punta(c, x0, y0, x1, y1, st, conTrazo) {
    const dx = x1 - x0, dy = y1 - y0, n = Math.sqrt(dx * dx + dy * dy);
    if (n < 1e-12) return;
    const ux = dx / n, uy = dy / n, lg = Math.min(PuntaLargo(c), n * 0.9), an = lg * PUNTA_ANCHO;
    if (conTrazo) Line(c, x0, y0, x1 - ux * lg * 0.85, y1 - uy * lg * 0.85, st);
    const relleno = sty({ Col: st.Col, Fill: true, FillOp: 1.0, NoStroke: true });
    Poly(c, [x1, x1 - ux * lg - uy * an, x1 - ux * lg + uy * an], [y1, y1 - uy * lg + ux * an, y1 - uy * lg - ux * an], true, relleno);
  }
  function Poly(c, xs, ys, closed, st, extraFill = null) {
    const pts = [];
    for (let i = 0; i < xs.length; i++) { const a = c.Px(xs[i]), b = c.Py(ys[i]); pts.push(F(a) + ',' + F(b)); c.Ext(a, b); }
    c.Sb.push((closed ? '<polygon' : '<polyline') + ' points="' + pts.join(' ') + '" style="' + StrokeCss(st) + ';' + (extraFill || FillCss(st)) + '"/>');
  }
  function Arrow(c, px, py, ux, uy, L = 2.0, W = 0.7) {
    const bx = px - ux * L, by = py - uy * L, nx = -uy, ny = ux;
    c.Sb.push('<polygon points="' + F(px) + ',' + F(py) + ' ' + F(bx + nx * W) + ',' + F(by + ny * W) + ' ' + F(bx - nx * W) + ',' + F(by - ny * W) + '" style="fill:var(--fg);stroke:none"/>');
  }

  // ---------------- primitivas ----------------
  const Known = new Set(['linea', 'polilinea', 'poligono', 'rect', 'circulo', 'arco', 'flecha', 'flechamomento', 'texto', 'cota', 'cotas', 'cotasx', 'cotasy',
    'ejex', 'ejey', 'ejesx', 'ejesy', 'hueco', 'achurado', 'varilla', 'varillas', 'fila', 'estribo', 'seccion',
    'leyenda', 'obs', 'observacion', 'carga', 'curva', 'empotramiento', 'empotre', 'hover']);

  const Pos = (p, i) => { const pos = p.A.filter((a) => a.Name == null); return i < pos.length ? pos[i] : null; };
  const Named = (p, n) => p.A.find((a) => a.Name === n) || null;
  function Vals(c, a) {
    if (!a) throw new Error('faltan argumentos');
    if (a.Str != null || a.Strs != null) throw new Error('se esperaba un número y llegó texto: ' + a.Raw);
    let tree; try { tree = parse(a.Raw); } catch (e) { throw new Error('no se puede leer «' + a.Raw + '»'); }
    return ev(tree, c.Look);
  }
  const V = (c, a) => Vals(c, a)[0];
  const NumArg = (c, p, i, def) => { const a = Pos(p, i); return a == null || a.Str != null ? def : V(c, a); };
  const NumNamed = (c, p, n, def) => { const a = Named(p, n); return a == null ? def : V(c, a); };
  const StrArg = (p, i, def = null) => { const a = Pos(p, i); return a == null ? def : (a.Str != null ? a.Str : a.Raw); };
  function Interp(c, s) {
    if (!s) return s || '';
    return s.replace(/(?<![_^])\{([^{}:]+)(?::(\d))?\}/g, (m0, e, d0) => {
      try {
        const v = ev(parse(e), c.Look), d = d0 !== undefined ? parseInt(d0, 10) : 3;
        return v.map((x) => d0 !== undefined ? x.toFixed(d) : Num(x, d)).join(', ');
      } catch (er) { return m0; }
    });
  }
  function ObsEstado(e) {
    e = String(e || '').toLowerCase();
    if (e.startsWith('corr') || e.startsWith('ok') || e.startsWith('resuel') || e.startsWith('cerr')) return 'corregida';
    if (e.startsWith('info') || e.startsWith('nota')) return 'info';
    return 'pendiente';
  }
  const ObsCol = (est) => est === 'corregida' ? 'var(--dib-verde)' : est === 'info' ? 'var(--dib-azul)' : 'var(--dib-rojo)';
  function Labels(p, idx, n) {
    const a = Pos(p, idx);
    if (a && a.Strs) return a.Strs;
    const s0 = a == null ? '1' : (a.Str != null ? a.Str : a.Raw).trim(), res = [];
    if (/^[+-]?\d+$/.test(s0)) { const k0 = parseInt(s0, 10); for (let i = 0; i < n; i++) res.push(String(k0 + i)); }
    else if (s0.length === 1 && /\p{L}/u.test(s0)) for (let i = 0; i < n; i++) res.push(String.fromCharCode(s0.charCodeAt(0) + i));
    else for (let i = 0; i < n; i++) res.push(i === 0 ? s0 : s0 + (i + 1));
    return res;
  }
  const MmToUd = (c, mm) => mm / c.UdMm;
  function BarLabel(n, dmm, s) { let t = Num(n) + ' Ø ' + Num(dmm) + ' mm'; if (!isNaN(s) && s > 0) t += ' @ ' + Num(s, 1) + ' cm'; return t; }
  function NormalIzq(x1, y1, x2, y2) { const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-12) return [0, 1]; return [-(y2 - y1) / L, (x2 - x1) / L]; }

  function Rects(c, p) {
    const v = [0, 1, 2, 3].map((i) => Vals(c, Pos(p, i)));
    const n = Math.max(...v.map((a) => a.length));
    for (const a of v) if (a.length !== 1 && a.length !== n) throw new Error('x, y, b, h de distinto largo');
    const g = (a, i) => a[Math.min(i, a.length - 1)];
    return Array.from({ length: n }, (_, i) => [g(v[0], i), g(v[1], i), g(v[2], i), g(v[3], i)]);
  }
  function XY(c, p) {
    const pos = p.A.filter((a) => a.Name == null && a.Str == null);
    if (pos.length >= 2) {
      const v0 = Vals(c, pos[0]);
      if (v0.length > 1) { const v1 = Vals(c, pos[1]); if (v1.length !== v0.length) throw new Error('x e y de distinto largo'); return [v0, v1]; }
    }
    const flat = [].concat(...pos.map((a) => Vals(c, a)));
    if (flat.length < 4 || flat.length % 2 !== 0) throw new Error('se esperan pares x, y');
    const xs = [], ys = []; for (let i = 0; i < flat.length; i += 2) { xs.push(flat[i]); ys.push(flat[i + 1]); }
    return [xs, ys];
  }
  function Curva(c, p) {
    const xa = V(c, Pos(p, 0)), xb = V(c, Pos(p, 1));
    const ea = Pos(p, 2); if (!ea || ea.Str != null) throw new Error('curva: falta la expresión (sin comillas)');
    let n = Math.round(NumNamed(c, p, 'n', 64)); n = Math.max(2, Math.min(n, 2000));
    const vn = Named(p, 'var'), vr = (vn ? (vn.Str != null ? vn.Str : vn.Raw) : 'x').trim();
    const xs = []; for (let i = 0; i <= n; i++) xs.push(xa + (xb - xa) * i / n);
    let tree; try { tree = parse(ea.Raw); } catch (e) { throw new Error('no se puede leer «' + ea.Raw + '»'); }
    let ys = ev(tree, (nm) => nm === vr ? xs : (c.Look ? c.Look(nm) : null));
    if (ys.length === 1) ys = xs.map(() => ys[0]);
    return [xs, ys];
  }

  // ---------------- 1ª pasada: puntos para la caja ----------------
  function Measure(c, p, obs, ley) {
    const Add = (x, y) => p.Pts.push([x, y]);
    switch (p.Name) {
      case 'linea': case 'cota': case 'varilla': case 'varillas': case 'fila':
        Add(V(c, Pos(p, 0)), V(c, Pos(p, 1))); Add(V(c, Pos(p, 2)), V(c, Pos(p, 3)));
        if (p.Name === 'cota') {
          const d = NumArg(c, p, 4, 0), x1 = V(c, Pos(p, 0)), y1 = V(c, Pos(p, 1)), x2 = V(c, Pos(p, 2)), y2 = V(c, Pos(p, 3));
          const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-12) break;
          const nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
          Add(x1 + nx * d, y1 + ny * d); Add(x2 + nx * d, y2 + ny * d);
        }
        break;
      case 'polilinea': case 'poligono': { const [xs, ys] = XY(c, p); for (let i = 0; i < xs.length; i++) Add(xs[i], ys[i]); break; }
      case 'achurado':
        if (Pos(p, 0) != null && Vals(c, Pos(p, 0)).length > 1) { const [xs, ys] = XY(c, p); for (let i = 0; i < xs.length; i++) Add(xs[i], ys[i]); break; }
        for (const [x, y, b, h] of Rects(c, p)) { Add(x, y); Add(x + b, y + h); }
        break;
      case 'rect': case 'hueco': case 'seccion': case 'estribo':
        for (const [x, y, b, h] of Rects(c, p)) { Add(x, y); Add(x + b, y + h); }
        break;
      case 'circulo': case 'arco': {
        const xs = Vals(c, Pos(p, 0)), ys = Vals(c, Pos(p, 1)), r = V(c, Pos(p, 2));
        for (let i = 0; i < Math.max(xs.length, ys.length); i++) { const x = xs[Math.min(i, xs.length - 1)], y = ys[Math.min(i, ys.length - 1)]; Add(x - r, y - r); Add(x + r, y + r); }
        break;
      }
      case 'carga': {
        const x1 = V(c, Pos(p, 0)), y1 = V(c, Pos(p, 1)), x2 = V(c, Pos(p, 2)), y2 = V(c, Pos(p, 3));
        const q1 = V(c, Pos(p, 4)), q2 = NumArg(c, p, 5, q1), [nx, ny] = NormalIzq(x1, y1, x2, y2);
        Add(x1, y1); Add(x2, y2); Add(x1 + nx * q1, y1 + ny * q1); Add(x2 + nx * q2, y2 + ny * q2);
        break;
      }
      case 'curva': {
        const [xs, ys] = Curva(c, p);
        for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) Add(xs[i], ys[i]);
        const b = Named(p, 'base'); if (b) { const y0 = V(c, b); Add(xs[0], y0); Add(xs[xs.length - 1], y0); }
        break;
      }
      case 'empotramiento': case 'empotre': Add(V(c, Pos(p, 0)), V(c, Pos(p, 1))); Add(V(c, Pos(p, 2)), V(c, Pos(p, 3))); break;
      case 'texto': Add(V(c, Pos(p, 0)), V(c, Pos(p, 1))); break;
      case 'cotas': case 'cotasx': { const xs = Vals(c, Pos(p, 0)), y = V(c, Pos(p, 1)), d = NumArg(c, p, 2, 0); for (const x of xs) { Add(x, y); Add(x, y + d); } break; }
      case 'cotasy': { const ys = Vals(c, Pos(p, 0)), x = V(c, Pos(p, 1)), d = NumArg(c, p, 2, 0); for (const y of ys) { Add(x, y); Add(x - d, y); } break; }
      case 'ejex': case 'ejesx': p.IsAxis = true; for (const x of Vals(c, Pos(p, 0))) p.Pts.push([x, NaN]); break;
      case 'ejey': case 'ejesy': p.IsAxis = true; for (const y of Vals(c, Pos(p, 0))) p.Pts.push([NaN, y]); break;
      case 'obs': {
        const o = { N: Math.round(V(c, Pos(p, 0))), X: Vals(c, Pos(p, 1)), Y: Vals(c, Pos(p, 2)), Estado: ObsEstado(StrArg(p, 3, 'pendiente')), Texto: Interp(c, StrArg(p, 4, '')), Dx: NaN, Dy: NaN };
        if (o.X.length !== o.Y.length && o.X.length !== 1 && o.Y.length !== 1) throw new Error('obs: x e y de distinto largo');
        const n = Math.max(o.X.length, o.Y.length);
        if (o.X.length === 1 && n > 1) o.X = Array(n).fill(o.X[0]);
        if (o.Y.length === 1 && n > 1) o.Y = Array(n).fill(o.Y[0]);
        for (let i = 0; i < n; i++) Add(o.X[i], o.Y[i]);
        o.Dx = NumNamed(c, p, 'dx', NaN); o.Dy = NumNamed(c, p, 'dy', NaN);
        obs.push(o);
        break;
      }
      case 'leyenda': ley.push([Interp(c, StrArg(p, 0, '')), StrArg(p, 1, '')]); break;
    }
  }

  // ---------------- 2ª pasada: dibujar ----------------
  const StyS = (p) => { const n = Named(p, 'estilo'); if (n && n.Str != null) return n.Str; const a = p.A.find((q) => q.Name == null && q.Str != null); return a ? a.Str : null; };

  // ---------------- HOVER (globo con el cursor), igual que LispDibujo.cs ----------------
  // hover(x, y, "barra {#1:0}: M = {#2:2} kN·m", barra, M [, radio = 16]): x, y = puntos de anclaje (vectores del mismo largo);
  // {#k} o {#k:d} = k-ésimo vector que sigue al texto en el punto i (un escalar vale para todos), d decimales (2 si falta); la secuencia \n del texto = salto de línea.
  // No dibuja: deja <g class="hk-hv" data-h="[[px,py,"texto"],…]"> y el escucha de abajo muestra el globo del punto más cercano (≤ radio px).
  const HoverNum = (v, d) => { if (!isFinite(v)) return '—'; const r = v.toFixed(d); return /^-0(\.0+)?$/.test(r) ? r.slice(1) : r; };
  function DrawHover(c, p) {
    const nums = p.A.filter((a) => a.Name == null && a.Str == null), ta = p.A.find((a) => a.Name == null && a.Str != null);
    if (nums.length < 2 || !ta) throw new Error('hover(x, y, "texto {#1:2}", v1, v2…)');
    const xs = Vals(c, nums[0]), ys = Vals(c, nums[1]);
    if (xs.length !== ys.length) throw new Error('hover: x e y de distinto largo');
    const vs = nums.slice(2).map((a) => Vals(c, a)), tpl = ta.Str.replace(/\\n/g, '\n'), out = [];
    for (let i = 0; i < xs.length; i++) {
      if (isNaN(xs[i]) || isNaN(ys[i])) continue;
      const txt = tpl.replace(/\{#(\d+)(?::(\d))?\}/g, (m0, k0, d0) => {
        const k = parseInt(k0, 10) - 1; if (k < 0 || k >= vs.length) return m0;
        const v = vs[k], x = v.length === 1 ? v[0] : i < v.length ? v[i] : NaN;
        return HoverNum(x, d0 !== undefined ? parseInt(d0, 10) : 2);
      });
      out.push([+F(c.Px(xs[i])), +F(c.Py(ys[i])), txt]);
    }
    const rad = NumNamed(c, p, 'radio', 16);
    c.Sb.push('<g class="hk-hv" data-r="' + F(rad) + '" data-h="' + JSON.stringify(out).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"/>');
  }
  (function instalaHover() {          // delegación en el documento (una vez): el SVG se pone con innerHTML y ahí no corren scripts
    if (typeof document === 'undefined' || window.__hkDibHv) return; window.__hkDibHv = 1;
    let tip = null, mk = null;
    const T = () => { if (!tip) { tip = document.createElement('div'); tip.style.cssText = 'position:fixed;z-index:9999;display:none;pointer-events:none;background:#fffffff2;border:1px solid #888;border-radius:4px;padding:3px 6px;font:12px/1.35 Consolas,monospace;color:#111;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:pre'; document.body.appendChild(tip); } return tip; };
    const off = () => { if (tip) tip.style.display = 'none'; if (mk && mk.parentNode) mk.parentNode.removeChild(mk); mk = null; };
    document.addEventListener('pointermove', (e) => {
      const s = e.target && e.target.closest ? e.target.closest('svg.hk-dib-svg') : null;
      if (!s) { off(); return; }
      const gs = s.querySelectorAll('g.hk-hv'); if (!gs.length) return;
      const m = s.getScreenCTM(); if (!m) return;
      const pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(m.inverse()), sc = m.a;
      let best = null, bd = 1e18;
      for (const g of gs) {
        let d = g.__h; if (!d) { try { d = JSON.parse(g.getAttribute('data-h')); } catch (x) { d = []; } g.__h = d; }
        const r = +g.getAttribute('data-r') || 16;
        for (const h of d) { const dx = (h[0] - q.x) * sc, dy = (h[1] - q.y) * sc, dd = dx * dx + dy * dy; if (dd < bd && dd <= r * r) { bd = dd; best = h; } }
      }
      if (!best) { off(); return; }
      const t = T(); t.textContent = best[2]; t.style.display = 'block';
      const w = t.offsetWidth, h2 = t.offsetHeight; let L = e.clientX + 14, Tp = e.clientY + 14;
      if (L + w > window.innerWidth - 4) L = Math.max(2, e.clientX - w - 14); if (Tp + h2 > window.innerHeight - 4) Tp = Math.max(2, e.clientY - h2 - 14);
      t.style.left = L + 'px'; t.style.top = Tp + 'px';
      if (!mk || mk.parentNode !== s) { off(); mk = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); mk.setAttribute('style', 'fill:none;stroke:#c00;pointer-events:none'); s.appendChild(mk); }
      mk.setAttribute('cx', best[0]); mk.setAttribute('cy', best[1]); mk.setAttribute('r', 4 / sc); mk.style.strokeWidth = (1.6 / sc) + 'px';
    });
    document.documentElement.addEventListener('mouseleave', off);
  })();

  function Draw(c, p) {
    switch (p.Name) {
      case 'hover': DrawHover(c, p); break;
      case 'linea': Line(c, V(c, Pos(p, 0)), V(c, Pos(p, 1)), V(c, Pos(p, 2)), V(c, Pos(p, 3)), Style(StyS(p))); break;
      case 'polilinea': case 'poligono': { const [xs, ys] = XY(c, p); Poly(c, xs, ys, p.Name === 'poligono', Style(StyS(p))); break; }
      case 'rect': for (const [x, y, b, h] of Rects(c, p)) Poly(c, [x, x + b, x + b, x], [y, y, y + h, y + h], true, Style(StyS(p))); break;
      case 'circulo': {
        const xs = Vals(c, Pos(p, 0)), ys = Vals(c, Pos(p, 1)), r = V(c, Pos(p, 2)), st = Style(StyS(p));
        for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
          const x = xs[Math.min(i, xs.length - 1)], y = ys[Math.min(i, ys.length - 1)];
          c.Sb.push('<circle cx="' + F(c.Px(x)) + '" cy="' + F(c.Py(y)) + '" r="' + F(r * c.K) + '" style="' + StrokeCss(st) + ';' + FillCss(st) + '"/>');
          c.Ext(c.Px(x - r), c.Py(y + r)); c.Ext(c.Px(x + r), c.Py(y - r));
        }
        break;
      }
      case 'carga': DrawCarga(c, p); break;
      case 'curva': {
        const [xs, ys] = Curva(c, p), st = Style(StyS(p) || 'media'), b = Named(p, 'base');
        const tramos = []; let cx = [], cy = [];
        for (let i = 0; i < xs.length; i++) {
          if (!isFinite(ys[i])) { if (cx.length > 1) tramos.push([cx, cy]); cx = []; cy = []; continue; }
          cx.push(xs[i]); cy.push(ys[i]);
        }
        if (cx.length > 1) tramos.push([cx, cy]);
        for (const [tx, ty] of tramos) {
          if (b && st.Fill) {
            const y0 = V(c, b);
            Poly(c, [tx[0], ...tx, tx[tx.length - 1]], [y0, ...ty, y0], true, sty({ Col: st.Col, Fill: true, FillOp: st.FillOp, NoStroke: true }));
            Line(c, tx[0], y0, tx[0], ty[0], sty({ Col: st.Col, W: 0.18 }));
            Line(c, tx[tx.length - 1], y0, tx[tx.length - 1], ty[ty.length - 1], sty({ Col: st.Col, W: 0.18 }));
          }
          Poly(c, tx, ty, false, sty({ Col: st.Col, W: st.W, Dash: st.Dash }));
        }
        break;
      }
      case 'empotramiento': case 'empotre': {
        const x1 = V(c, Pos(p, 0)), y1 = V(c, Pos(p, 1)), x2 = V(c, Pos(p, 2)), y2 = V(c, Pos(p, 3));
        const lado = NumArg(c, p, 4, 1) < 0 ? -1 : 1;
        const a = c.Px(x1), b = c.Py(y1), d = c.Px(x2), e = c.Py(y2);
        const L = Math.hypot(d - a, e - b); if (L < 1e-9) break;
        const ux = (d - a) / L, uy = (e - b) / L, nx = uy * lado, ny = -ux * lado, paso = 1.5, largo = 2.2;
        const css = 'stroke:var(--fg);stroke-width:.2;stroke-linecap:round';
        for (let s0 = paso * 0.5; s0 <= L + 1e-9; s0 += paso) { const sx = a + ux * s0, sy = b + uy * s0; PLine(c, sx, sy, sx + (nx - ux) * largo * 0.7071, sy + (ny - uy) * largo * 0.7071, css); }
        PLine(c, a, b, d, e, 'stroke:var(--fg);stroke-width:.6;stroke-linecap:round');
        break;
      }
      case 'arco': {
        const x = V(c, Pos(p, 0)), y = V(c, Pos(p, 1)), r = V(c, Pos(p, 2)), a1 = V(c, Pos(p, 3)), a2 = V(c, Pos(p, 4)), st = Style(StyS(p));
        const t1 = a1 * Math.PI / 180, t2 = a2 * Math.PI / 180;
        let sweep = ((a2 - a1) % 360 + 360) % 360; if (sweep === 0 && a2 !== a1) sweep = 360;
        const sx = c.Px(x + r * Math.cos(t1)), sy = c.Py(y + r * Math.sin(t1)), ex = c.Px(x + r * Math.cos(t2)), ey = c.Py(y + r * Math.sin(t2));
        c.Sb.push('<path d="M' + F(sx) + ' ' + F(sy) + ' A' + F(r * c.K) + ' ' + F(r * c.K) + ' 0 ' + (sweep > 180 ? 1 : 0) + ' 0 ' + F(ex) + ' ' + F(ey) + '" style="' + StrokeCss(st) + ';fill:none"/>');
        c.Ext(c.Px(x - r), c.Py(y + r)); c.Ext(c.Px(x + r), c.Py(y - r));
        break;
      }
      case 'flecha': Punta(c, V(c, Pos(p, 0)), V(c, Pos(p, 1)), V(c, Pos(p, 2)), V(c, Pos(p, 3)), Style(StyS(p)), true); break;
      case 'flechamomento': {
        const xc = V(c, Pos(p, 0)), yc = V(c, Pos(p, 1)), r = V(c, Pos(p, 2)), a1 = V(c, Pos(p, 3)), a2 = V(c, Pos(p, 4)), st = Style(StyS(p));
        const n = 96, xs = [], ys = [];
        for (let i = 0; i < n; i++) { const t = (a1 + (a2 - a1) * i / (n - 1)) * Math.PI / 180; xs.push(xc + r * Math.cos(t)); ys.push(yc + r * Math.sin(t)); }
        const lg = PuntaLargo(c); let corte = n - 1;
        while (corte > 1 && Math.hypot(xs[corte] - xs[n - 1], ys[corte] - ys[n - 1]) < lg) corte--;
        Poly(c, xs.slice(0, corte + 1), ys.slice(0, corte + 1), false, st);
        Punta(c, xs[corte], ys[corte], xs[n - 1], ys[n - 1], st, false);
        break;
      }
      case 'texto': {
        const xs = Vals(c, Pos(p, 0)), ys = Vals(c, Pos(p, 1)), ta = Pos(p, 2);
        const txts = ta && ta.Strs ? ta.Strs : [ta ? (ta.Str != null ? ta.Str : ta.Raw) : ''];
        const size = NumArg(c, p, 3, 2.5), an = String(StrArg(p, 4, 'c') || 'c').toLowerCase();
        const anchor = an.startsWith('i') || an.startsWith('l') ? 'start' : an.startsWith('d') || an.startsWith('r') ? 'end' : 'middle';
        const ang = NumArg(c, p, 5, 0), n = Math.max(xs.length, ys.length, txts.length);
        const ne = Named(p, 'estilo'), col = Style(ne && ne.Str != null ? ne.Str : '').Col;
        for (let i = 0; i < n; i++) Text(c, c.Px(xs[Math.min(i, xs.length - 1)]), c.Py(ys[Math.min(i, ys.length - 1)]), Interp(c, txts[Math.min(i, txts.length - 1)]), size, anchor, -ang, col);
        break;
      }
      case 'hueco':
        for (const [x, y, b, h] of Rects(c, p)) {
          Poly(c, [x, x + b, x + b, x], [y, y, y + h, y + h], true, Style('media'), 'fill:var(--bg)');
          const th = Style('fina gris'); Line(c, x, y, x + b, y + h, th); Line(c, x, y + h, x + b, y, th);
          const t = StrArg(p, 4, null);
          if (t) Text(c, c.Px(x + b / 2), c.Py(y + h / 2) - 2.2, Interp(c, t), 2.2, 'middle', 0, 'var(--mut)');
        }
        break;
      case 'achurado': {
        const sa = p.A.filter((a) => a.Name == null && a.Str != null), tipo = (sa.length ? sa[sa.length - 1].Str : 'diagonal').toLowerCase();
        const pat = tipo.startsWith('cruz') ? 'cruz' : tipo.startsWith('conc') ? 'conc' : 'diag', fill = 'fill:url(#' + c.Id + '-' + pat + ')';
        const st = Style(tipo.includes('borde') ? 'media' : 'sinborde'), v0 = Vals(c, Pos(p, 0));
        if (v0.length > 1) { const [xs, ys] = XY(c, p); Poly(c, xs, ys, true, st, fill); }
        else { const x = v0[0], y = V(c, Pos(p, 1)), b = V(c, Pos(p, 2)), h = V(c, Pos(p, 3)); Poly(c, [x, x + b, x + b, x], [y, y, y + h, y + h], true, st, fill); }
        break;
      }
      case 'seccion': {
        const x = V(c, Pos(p, 0)), y = V(c, Pos(p, 1)), b = V(c, Pos(p, 2)), h = V(c, Pos(p, 3));
        Poly(c, [x, x + b, x + b, x], [y, y, y + h, y + h], true, Style('gruesa'), 'fill:url(#' + c.Id + '-conc)');
        break;
      }
      case 'cota': { const t = Pos(p, 5); DrawCota(c, V(c, Pos(p, 0)), V(c, Pos(p, 1)), V(c, Pos(p, 2)), V(c, Pos(p, 3)), NumArg(c, p, 4, 0), t && t.Str != null ? Interp(c, t.Str) : null); break; }
      case 'cotas': case 'cotasx': { const xs = Vals(c, Pos(p, 0)), y = V(c, Pos(p, 1)), d = NumArg(c, p, 2, 0); for (let i = 0; i + 1 < xs.length; i++) DrawCota(c, xs[i], y, xs[i + 1], y, d, null); break; }
      case 'cotasy': { const ys = Vals(c, Pos(p, 0)), x = V(c, Pos(p, 1)), d = NumArg(c, p, 2, 0); for (let i = 0; i + 1 < ys.length; i++) DrawCota(c, x, ys[i], x, ys[i + 1], d, null); break; }
      case 'ejex': case 'ejesx': {
        const xs = Vals(c, Pos(p, 0)), lb = Labels(p, 1, xs.length), yt = c.Py(c.GyMax) - 4, yb = c.Py(c.GyMin) + 4, R = 3.1;
        for (let i = 0; i < xs.length; i++) { const px = c.Px(xs[i]); PLine(c, px, yt, px, yb, StrokeCss(Style('eje'))); Bubble(c, px, yt - R, R, i < lb.length ? lb[i] : '?'); }
        break;
      }
      case 'ejey': case 'ejesy': {
        const ys = Vals(c, Pos(p, 0)), lb = Labels(p, 1, ys.length), xl = c.Px(c.GxMin) - 4, xr = c.Px(c.GxMax) + 4, R = 3.1;
        for (let i = 0; i < ys.length; i++) { const py = c.Py(ys[i]); PLine(c, xl, py, xr, py, StrokeCss(Style('eje'))); Bubble(c, xl - R, py, R, i < lb.length ? lb[i] : '?'); }
        break;
      }
      case 'varilla': {
        const x1 = V(c, Pos(p, 0)), y1 = V(c, Pos(p, 1)), x2 = V(c, Pos(p, 2)), y2 = V(c, Pos(p, 3));
        const dmm = NumArg(c, p, 4, 12), g1 = NumArg(c, p, 5, 0), g2 = NumArg(c, p, 6, 0), ra = Pos(p, 7), rot = ra ? ra.Str : null, lado = NumArg(c, p, 8, 1);
        const ne = Named(p, 'estilo'); DrawBar(c, x1, y1, x2, y2, dmm, g1, g2, ne ? ne.Str : null);
        if (rot) BarText(c, x1, y1, x2, y2, Interp(c, rot), lado, NumNamed(c, p, 'off', 0));
        break;
      }
      case 'varillas': {
        const x1 = V(c, Pos(p, 0)), y1 = V(c, Pos(p, 1)), x2 = V(c, Pos(p, 2)), y2 = V(c, Pos(p, 3));
        const n = V(c, Pos(p, 4)), dmm = V(c, Pos(p, 5)), s = NumArg(c, p, 6, NaN), g1 = NumArg(c, p, 7, 0), g2 = NumArg(c, p, 8, 0);
        const sg = Math.sign(g1 + g2), lado = NumArg(c, p, 9, sg !== 0 ? -sg : 1);
        const ne = Named(p, 'estilo'); DrawBar(c, x1, y1, x2, y2, dmm, g1, g2, ne ? ne.Str : null);
        BarText(c, x1, y1, x2, y2, BarLabel(n, dmm, s), lado, NumNamed(c, p, 'off', 0));
        break;
      }
      case 'fila': {
        const x1 = V(c, Pos(p, 0)), y1 = V(c, Pos(p, 1)), x2 = V(c, Pos(p, 2)), y2 = V(c, Pos(p, 3));
        const n = Math.round(V(c, Pos(p, 4))), dmm = V(c, Pos(p, 5)), s = NumArg(c, p, 6, NaN), lado = NumArg(c, p, 7, 1);
        const r = Math.max(MmToUd(c, dmm) / 2 * c.K, 0.45), ne = Named(p, 'estilo'), col = Style(ne && ne.Str != null ? ne.Str : 'acero').Col;
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0.5 : i / (n - 1), px = c.Px(x1 + (x2 - x1) * t), py = c.Py(y1 + (y2 - y1) * t);
          c.Sb.push('<circle cx="' + F(px) + '" cy="' + F(py) + '" r="' + F(r) + '" style="fill:' + col + ';stroke:none"/>');
          c.Ext(px - r, py - r); c.Ext(px + r, py + r);
        }
        const ro = Named(p, 'rotulo'); if (!(ro && ro.Str === 'no')) BarText(c, x1, y1, x2, y2, BarLabel(n, dmm, s), lado, r + 0.6 + NumNamed(c, p, 'off', 0));
        break;
      }
      case 'estribo': {
        const x = V(c, Pos(p, 0)), y = V(c, Pos(p, 1)), b = V(c, Pos(p, 2)), h = V(c, Pos(p, 3)), rec = V(c, Pos(p, 4)), dmm = NumArg(c, p, 5, 10);
        const db = MmToUd(c, dmm), e = rec + db / 2, rr = 2 * db, L = Math.max(6 * db, MmToUd(c, 75));
        const ax = c.Px(x + e), ay = c.Py(y + h - e), bx = c.Px(x + b - e), by = c.Py(y + e);
        const css = 'stroke:var(--dib-acero);stroke-width:' + F(Math.max(0.35, db * c.K)) + ';fill:none;stroke-linejoin:round;stroke-linecap:round';
        c.Sb.push('<rect x="' + F(ax) + '" y="' + F(ay) + '" width="' + F(bx - ax) + '" height="' + F(by - ay) + '" rx="' + F(rr * c.K) + '" style="' + css + '"/>');
        c.Ext(ax, ay); c.Ext(bx, by);
        const k45 = Math.sqrt(0.5) * L * c.K, hx1 = ax + rr * c.K, hy1 = ay, hx2 = ax, hy2 = ay + rr * c.K;
        PLine(c, hx1, hy1, hx1 + k45, hy1 + k45, css); PLine(c, hx2, hy2, hx2 + k45, hy2 + k45, css);
        const ro = Named(p, 'rotulo'); if (!(ro && ro.Str === 'no')) Text(c, c.Px(x + b) + 2, (ay + by) / 2, 'E Ø ' + Num(dmm) + ' mm', 2.2, 'start', 0, 'var(--dib-acero)');
        break;
      }
    }
  }

  function DrawCarga(c, p) {
    const x1 = V(c, Pos(p, 0)), y1 = V(c, Pos(p, 1)), x2 = V(c, Pos(p, 2)), y2 = V(c, Pos(p, 3));
    const q1 = V(c, Pos(p, 4)), q2 = NumArg(c, p, 5, q1);
    const strs = p.A.filter((a) => a.Name == null && a.Str != null).map((a) => a.Str);
    const txt = strs.length > 0 ? strs[0] : null, ne = Named(p, 'estilo');
    const st = Style(ne && ne.Str != null ? ne.Str : (strs.length > 1 ? strs[1] : 'rojo'));
    if (st.Col === 'var(--fg)') st.Col = 'var(--dib-rojo)';
    let n = Math.round(NumNamed(c, p, 'n', 9)); n = Math.max(2, Math.min(n, 60));
    const sentido = NumNamed(c, p, 'sentido', 1) < 0 ? -1 : 1, [nx, ny] = NormalIzq(x1, y1, x2, y2);
    const ox1 = x1 + nx * q1, oy1 = y1 + ny * q1, ox2 = x2 + nx * q2, oy2 = y2 + ny * q2;
    Poly(c, [x1, x2, ox2, ox1], [y1, y2, oy2, oy1], true, sty({ Col: st.Col, Fill: true, FillOp: st.Fill ? st.FillOp : 0.14, NoStroke: true }));
    Line(c, ox1, oy1, ox2, oy2, sty({ Col: st.Col, W: Math.max(0.3, st.W) }));
    if (Math.abs(q1) > 1e-12) Line(c, x1, y1, ox1, oy1, sty({ Col: st.Col, W: 0.18 }));
    if (Math.abs(q2) > 1e-12) Line(c, x2, y2, ox2, oy2, sty({ Col: st.Col, W: 0.18 }));
    const fl = sty({ Col: st.Col, W: 0.3 }), minQ = PuntaLargo(c) * 1.2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), bx = x1 + (x2 - x1) * t, by = y1 + (y2 - y1) * t, q = q1 + (q2 - q1) * t;
      if (Math.abs(q) < minQ) continue;
      const ex = bx + nx * q, ey = by + ny * q;
      if (sentido > 0) Punta(c, ex, ey, bx, by, fl, true); else Punta(c, bx, by, ex, ey, fl, true);
    }
    if (txt) {
      const mx = (ox1 + ox2) / 2, my = (oy1 + oy2) / 2, qm = (q1 + q2) / 2, sg = qm >= 0 ? 1 : -1;
      const pxm = c.Px(mx) + nx * sg * 2.6, pym = c.Py(my) - ny * sg * 2.6;
      let ang = Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI;
      if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
      Text(c, pxm, pym, Interp(c, txt), 2.5, 'middle', ang, st.Col);
    }
  }
  function Bubble(c, cx, cy, R, lab) {
    c.Sb.push('<circle cx="' + F(cx) + '" cy="' + F(cy) + '" r="' + F(R) + '" style="fill:var(--bg);stroke:var(--fg);stroke-width:.25"/>');
    c.Ext(cx - R, cy - R); c.Ext(cx + R, cy + R);
    Text(c, cx, cy + 0.1, lab, lab.length > 2 ? 2.4 : 3.0, 'middle', 0, 'var(--fg)', '600');
  }
  function DrawCota(c, x1, y1, x2, y2, d, txt) {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-12) return;
    const uxw = (x2 - x1) / L, uyw = (y2 - y1) / L, nxw = -uyw, nyw = uxw;
    const qx1 = x1 + nxw * d, qy1 = y1 + nyw * d, qx2 = x2 + nxw * d, qy2 = y2 + nyw * d;
    const P1x = c.Px(x1), P1y = c.Py(y1), P2x = c.Px(x2), P2y = c.Py(y2), Q1x = c.Px(qx1), Q1y = c.Py(qy1), Q2x = c.Px(qx2), Q2y = c.Py(qy2);
    const sg = d >= 0 ? 1 : -1, npx = nxw * sg, npy = -nyw * sg, upx = uxw, upy = -uyw, thin = 'stroke:var(--fg);stroke-width:.18';
    if (Math.abs(d) > 1e-12) {
      PLine(c, P1x + npx * 0.8, P1y + npy * 0.8, Q1x + npx * 1.2, Q1y + npy * 1.2, thin);
      PLine(c, P2x + npx * 0.8, P2y + npy * 0.8, Q2x + npx * 1.2, Q2y + npy * 1.2, thin);
    }
    PLine(c, Q1x, Q1y, Q2x, Q2y, thin);
    const Lp = L * c.K;
    if (Lp >= 5.5) { Arrow(c, Q1x, Q1y, -upx, -upy, 1.8, 0.55); Arrow(c, Q2x, Q2y, upx, upy, 1.8, 0.55); }
    else {
      const tx = (upx - npx) * 0.9, ty = (upy - npy) * 0.9;
      PLine(c, Q1x - tx, Q1y - ty, Q1x + tx, Q1y + ty, 'stroke:var(--fg);stroke-width:.3');
      PLine(c, Q2x - tx, Q2y - ty, Q2x + tx, Q2y + ty, 'stroke:var(--fg);stroke-width:.3');
    }
    const udc = c.UdCota === 'mm' ? 1 : c.UdCota === 'cm' ? 10 : 1000, val = L * c.UdMm / udc;
    const dec = c.Dec >= 0 ? c.Dec : (c.UdCota === 'm' ? (Math.abs(val * 100 - Math.round(val * 100)) > 1e-6 ? 3 : 2) : c.UdCota === 'cm' ? (Math.abs(val - Math.round(val)) < 1e-6 ? 0 : 1) : 0);
    const t = txt != null ? txt : val.toFixed(dec);
    let ang = Math.atan2(upy, upx) * 180 / Math.PI;
    if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
    let mx = (Q1x + Q2x) / 2 + npx * 1.7, my = (Q1y + Q2y) / 2 + npy * 1.7;
    if (Lp < 5.5) { mx += npx * 0.6; my += npy * 0.6; }
    Text(c, mx, my, t, 2.3, 'middle', ang);
  }
  function DrawBar(c, x1, y1, x2, y2, dmm, g1, g2, styS) {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-12) return;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, db = MmToUd(c, dmm);
    const Rot = (vx, vy, deg) => { const t = deg * Math.PI / 180; return [vx * Math.cos(t) - vy * Math.sin(t), vx * Math.sin(t) + vy * Math.cos(t)]; };
    function Hook(px, py, ox, oy, g, atStart) {
      const ga = Math.abs(g), s = Math.sign(g); if (ga < 1) return '';
      if (ga >= 179) {
        const D = 6 * db, ext = Math.max(4 * db, MmToUd(c, 65)), [nx, ny] = Rot(ox, oy, atStart ? -90 * s : 90 * s);
        const ex = px + nx * D, ey = py + ny * D, fx = ex - ox * ext, fy = ey - oy * ext, sweep = ((atStart ? -s : s) > 0) ? 0 : 1;
        return ' M' + F(c.Px(px)) + ' ' + F(c.Py(py)) + ' A' + F(D / 2 * c.K) + ' ' + F(D / 2 * c.K) + ' 0 0 ' + sweep + ' ' + F(c.Px(ex)) + ' ' + F(c.Py(ey)) + ' L' + F(c.Px(fx)) + ' ' + F(c.Py(fy));
      }
      const len = ga >= 134 ? Math.max(6 * db, MmToUd(c, 75)) : 12 * db, [dx, dy] = Rot(ox, oy, atStart ? -ga * s : ga * s);
      return ' M' + F(c.Px(px)) + ' ' + F(c.Py(py)) + ' L' + F(c.Px(px + dx * len)) + ' ' + F(c.Py(py + dy * len));
    }
    const st = Style('acero');
    if (styS) { const s2 = Style(styS); if (s2.Col !== 'var(--fg)') st.Col = s2.Col; if (s2.Dash != null) st.Dash = s2.Dash; }
    const d = 'M' + F(c.Px(x1)) + ' ' + F(c.Py(y1)) + ' L' + F(c.Px(x2)) + ' ' + F(c.Py(y2)) + Hook(x1, y1, -ux, -uy, g1, true) + Hook(x2, y2, ux, uy, g2, false);
    c.Sb.push('<path d="' + d + '" style="' + StrokeCss(st) + ';fill:none"/>');
    const hk = Math.max(Math.abs(g1), Math.abs(g2)) > 0 ? 12 * db * c.K : 0;
    c.Ext(Math.min(c.Px(x1), c.Px(x2)) - hk, Math.min(c.Py(y1), c.Py(y2)) - hk);
    c.Ext(Math.max(c.Px(x1), c.Px(x2)) + hk, Math.max(c.Py(y1), c.Py(y2)) + hk);
  }
  function BarText(c, x1, y1, x2, y2, txt, lado, extraMm = 0) {
    const L = Math.hypot(x2 - x1, y2 - y1), ux = L > 1e-12 ? (x2 - x1) / L : 1, uy = L > 1e-12 ? (y2 - y1) / L : 0;
    const sg = lado < 0 ? -1 : 1, npx = -uy * sg, npy = -ux * sg, off = 1.9 + extraMm;
    const mx = (c.Px(x1) + c.Px(x2)) / 2 + npx * off, my = (c.Py(y1) + c.Py(y2)) / 2 + npy * off;
    let ang = Math.atan2(-uy, ux) * 180 / Math.PI;
    if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
    Text(c, mx, my, txt, 2.3, 'middle', ang, 'var(--dib-acero)');
  }
  function DrawObs(c, o) {
    const multi = o.X.length > 1, R = multi ? 2.0 : 2.7, fs = multi ? 2.4 : 3.0, col = ObsCol(o.Estado);
    for (let i = 0; i < o.X.length; i++) {
      const px = c.Px(o.X[i]), py = c.Py(o.Y[i]); let bx = px, by = py;
      if (!isNaN(o.Dx) || !isNaN(o.Dy)) {
        bx = px + (isNaN(o.Dx) ? 0 : o.Dx); by = py - (isNaN(o.Dy) ? 0 : o.Dy);
        PLine(c, px, py, bx, by, 'stroke:' + col + ';stroke-width:.3');
        c.Sb.push('<circle cx="' + F(px) + '" cy="' + F(py) + '" r=".6" style="fill:' + col + '"/>');
      }
      c.Sb.push('<circle cx="' + F(bx) + '" cy="' + F(by) + '" r="' + F(R) + '" style="fill:' + col + ';stroke:var(--bg);stroke-width:.35"/>');
      c.Ext(bx - R, by - R); c.Ext(bx + R, by + R);
      c.Sb.push('<text x="' + F(bx) + '" y="' + F(by + 0.1) + '" font-size="' + F(fs) + '" text-anchor="middle" dominant-baseline="middle" style="fill:#fff;font-weight:700;font-family:\'Segoe UI\',Arial,sans-serif">' + o.N + '</text>');
    }
  }
  function ObsTable(c, list) {
    let s = '<div class="ws-tbl-wrap"><table class="ws-table hk-obs"><thead><tr><th class="ws-c-center">N°</th><th class="ws-c-txt">Estado</th><th class="ws-c-txt">Observación</th><th class="ws-c-txt">Ubicación [' + esc(c.Ud) + ']</th></tr></thead><tbody>';
    for (const o of list.slice().sort((a, b) => a.N - b.N)) {
      const col = ObsCol(o.Estado), ub = o.X.length === 1 ? '(' + Num(o.X[0], 3) + '; ' + Num(o.Y[0], 3) + ')' : o.X.length + ' puntos (marcados en el dibujo)';
      s += '<tr><td class="ws-c-center"><span class="hk-obs-n" style="background:' + col + '">' + o.N + '</span></td><td class="ws-c-txt"><span class="hk-obs-e" style="color:' + col + '">' + o.Estado + '</span></td><td class="ws-c-txt">' + inline(o.Texto) + '</td><td class="ws-c-txt">' + ub + '</td></tr>';
    }
    return s + '</tbody></table></div>';
  }
  function Swatch(styS, id) {
    const s = String(styS || '').toLowerCase(), head = '<svg width="30" height="12" viewBox="0 0 30 12" style="vertical-align:middle">';
    if (s.includes('pendiente') || s.includes('corregida') || s.includes('info')) {
      const col = ObsCol(ObsEstado(s.includes('pendiente') ? 'pendiente' : s.includes('corregida') ? 'corregida' : 'info'));
      return head + '<circle cx="15" cy="6" r="5" style="fill:' + col + '"/></svg>';
    }
    if (s.includes('hueco')) return head + '<rect x="3" y="1" width="24" height="10" style="fill:none;stroke:var(--fg);stroke-width:1"/><line x1="3" y1="1" x2="27" y2="11" style="stroke:var(--mut);stroke-width:.7"/><line x1="3" y1="11" x2="27" y2="1" style="stroke:var(--mut);stroke-width:.7"/></svg>';
    if (s.includes('achurado') || s.includes('seccion') || s.includes('concreto'))
      return head + '<rect x="3" y="1" width="24" height="10" style="fill:url(#' + id + '-' + (s.includes('conc') || s.includes('seccion') ? 'conc' : 'diag') + ');stroke:var(--fg);stroke-width:.6"/></svg>';
    if (s.includes('fila') || s.includes('punto'))
      return head + '<circle cx="8" cy="6" r="2.4" style="fill:var(--dib-acero)"/><circle cx="15" cy="6" r="2.4" style="fill:var(--dib-acero)"/><circle cx="22" cy="6" r="2.4" style="fill:var(--dib-acero)"/></svg>';
    const st = Style(s);
    if (s.includes('resalte')) return head + '<rect x="2" y="1" width="26" height="10" style="fill:' + st.Col + ';fill-opacity:' + F(st.FillOp * 1.6) + '"/></svg>';
    const w = st.W * 3.2, dash = st.Dash != null ? ';stroke-dasharray:' + st.Dash.split(' ').map((t) => F(parseFloat(t) * 2.2)).join(' ') : '';
    return head + '<line x1="2" y1="6" x2="28" y2="6" style="stroke:' + st.Col + ';stroke-width:' + F(w) + dash + ';stroke-linecap:round"/></svg>';
  }
  const ErrHtml = (errs) => errs.map((e) => '<div>⚠ ' + esc(e) + '</div>').join('');

  // ---------------- Render ----------------
  function render(texto, lookup) {
    const blk = typeof texto === 'string' ? bloque(texto) : texto;
    if (!blk) return '<div class="hk-dib-err">⚠ #dibujo: no se encontró la cabecera «#dibujo(…)»</div>';
    const c = Ctx(lookup), errs = [];
    let titulo = null, escFija = null, anchoMax = 170, altoMax = 150;
    for (const a of parseArgs(blk.cab || '')) {
      if (a.Name == null && a.Str != null) { titulo = a.Str; continue; }
      const v = String(a.Str != null ? a.Str : (a.Raw || '')).trim();
      const num = (def) => { const x = parseFloat(v); return isFinite(x) ? x : def; };
      switch (a.Name) {
        case 'titulo': titulo = v; break;
        case 'ud': case 'unidad': c.Ud = v.toLowerCase(); break;
        case 'cotas': c.UdCota = v.toLowerCase(); break;
        case 'dec': c.Dec = /^-?\d+$/.test(v) ? parseInt(v, 10) : 0; break;
        case 'ancho': anchoMax = num(0); break;
        case 'alto': altoMax = num(0); break;
        case 'vert': case 'exagerar': c.Vy = num(0); if (c.Vy <= 0) c.Vy = 1; break;
        case 'escala': { const em = /^1\s*:\s*([\d.]+)$/.exec(v); if (em) escFija = parseFloat(em[1]); break; }
      }
    }
    c.UdMm = c.Ud === 'mm' ? 1 : c.Ud === 'cm' ? 10 : 1000;
    if (c.UdCota == null) c.UdCota = c.Ud;

    const prims = [], obsList = [], leyenda = [];
    for (const src of blk.cmds) {
      const m = RxCmd.exec('#' + src);
      if (!m) { errs.push('no entiendo «' + src + '» (forma: nombre(argumentos))'); continue; }
      const p = { Name: m[1].toLowerCase(), A: parseArgs(m[2]), Src: src, Pts: [], IsAxis: false };
      if (p.Name === 'observacion') p.Name = 'obs';
      if (!Known.has(p.Name)) { errs.push('primitiva desconocida «' + p.Name + '» en «' + src + '»'); continue; }
      try { Measure(c, p, obsList, leyenda); prims.push(p); } catch (ex) { errs.push(ex.message + '  ← «' + src + '»'); }
    }
    const geo = [].concat(...prims.filter((p) => !p.IsAxis && !(p.Name.startsWith('cota') || p.Name === 'texto' || p.Name === 'obs' || p.Name === 'leyenda')).map((p) => p.Pts));
    const all = [].concat(...prims.map((p) => p.Pts));
    const allX = all.map((q) => q[0]).filter((v) => !isNaN(v)), allY = all.map((q) => q[1]).filter((v) => !isNaN(v));
    if (!allX.length || !allY.length) return '<div class="hk-dib"><div class="hk-dib-err">⚠ #dibujo sin nada que dibujar' + ErrHtml(errs) + '</div></div>';
    const gX = geo.map((q) => q[0]).filter((v) => !isNaN(v)), gY = geo.map((q) => q[1]).filter((v) => !isNaN(v));
    const mn = (a) => Math.min(...a), mx = (a) => Math.max(...a);
    c.GxMin = gX.length ? mn(gX) : mn(allX); c.GxMax = gX.length ? mx(gX) : mx(allX);
    c.GyMin = gY.length ? mn(gY) : mn(allY); c.GyMax = gY.length ? mx(gY) : mx(allY);
    const xmin = Math.min(c.GxMin, mn(allX)), xmax = Math.max(c.GxMax, mx(allX)), ymin = Math.min(c.GyMin, mn(allY)), ymax = Math.max(c.GyMax, mx(allY));
    const hasX = prims.some((p) => p.Name === 'ejex' || p.Name === 'ejesx'), hasY = prims.some((p) => p.Name === 'ejey' || p.Name === 'ejesy');
    c.ML = hasY ? 17 : 8; c.MT = hasX ? 17 : 8;
    const mR = 8, mB = 8, wg = Math.max(xmax - xmin, 1e-9), hg = Math.max(ymax - ymin, 1e-9);
    let E, escNota = '';
    if (escFija != null) E = escFija;
    else {
      const kNeed = Math.min((anchoMax - c.ML - mR) / wg, (altoMax - c.MT - mB) / (hg * c.Vy)), eMin = c.UdMm / kNeed;
      const norm = [1, 2, 2.5, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000, 10000];
      E = norm.find((v) => v >= eMin - 1e-9) || 0;
      if (E === 0) E = Math.ceil(eMin);
    }
    c.K = c.UdMm / E;
    if (escFija != null && (wg * c.K + c.ML + mR > anchoMax + 0.5)) escNota = ' (a 1:' + Num(E) + ' no cabe en ' + Num(anchoMax) + ' mm: se reduce en pantalla)';
    c.X0 = xmin; c.Y1 = ymax;

    const id = c.Id;
    const defs = '<defs>' +
      '<pattern id="' + id + '-diag" patternUnits="userSpaceOnUse" width="1.6" height="1.6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.6" style="stroke:var(--mut);stroke-width:.16"/></pattern>' +
      '<pattern id="' + id + '-cruz" patternUnits="userSpaceOnUse" width="1.8" height="1.8" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.8" style="stroke:var(--mut);stroke-width:.14"/><line x1="0" y1="0" x2="1.8" y2="0" style="stroke:var(--mut);stroke-width:.14"/></pattern>' +
      '<pattern id="' + id + '-conc" patternUnits="userSpaceOnUse" width="3" height="3"><circle cx=".7" cy=".8" r=".16" style="fill:var(--mut)"/><circle cx="2.2" cy="2.1" r=".12" style="fill:var(--mut)"/><path d="M1.9 .5 l.45 .7 h-.9 z" style="fill:none;stroke:var(--mut);stroke-width:.1"/></pattern>' +
      '</defs>';
    const Order = (p) => {
      switch (p.Name) {
        case 'achurado': case 'seccion': case 'hueco': return 0;
        case 'carga': case 'curva': return 2;
        case 'ejex': case 'ejey': case 'ejesx': case 'ejesy': return 1;
        case 'obs': return 9;
        case 'texto': case 'cota': case 'cotas': case 'cotasx': case 'cotasy': return 5;
        default: return p.A.some((a) => (a.Str || '').includes('resalte')) ? 0 : 3;
      }
    };
    for (const p of prims.map((p, i) => [p, i]).sort((a, b) => Order(a[0]) - Order(b[0]) || a[1] - b[1]).map((q) => q[0])) {
      try { Draw(c, p); } catch (ex) { errs.push(ex.message + '  ← «' + p.Src + '»'); }
    }
    for (const o of obsList) DrawObs(c, o);

    const pad = 2, vx = Math.min(0, c.PxMin - pad), vy = Math.min(0, c.PyMin - pad);
    const vw = Math.max(c.PxMax + pad, c.ML + wg * c.K + mR) - vx, vh = Math.max(c.PyMax + pad, c.MT + hg * c.K * c.Vy + mB) - vy;
    let s = '<div class="hk-dib"><div class="hk-dib-tit">';
    if (titulo) s += '<b>' + inline(titulo) + '</b> · ';
    s += '<span class="hk-dib-esc">Esc. 1:' + Num(E) + (c.Vy !== 1 ? ' (vertical ×' + Num(c.Vy) + ')' : '') + escNota + ' · geometría en ' + esc(c.Ud) + (prims.some((p) => p.Name.startsWith('cota')) ? ' · cotas en ' + esc(c.UdCota) : '') + '</span></div>';
    s += '<svg class="hk-dib-svg" xmlns="http://www.w3.org/2000/svg" viewBox="' + F(vx) + ' ' + F(vy) + ' ' + F(vw) + ' ' + F(vh) + '" width="' + F(vw) + 'mm" height="' + F(vh) + 'mm" data-x0="' + c.X0 + '" data-y1="' + c.Y1 + '" data-ml="' + F(c.ML) + '" data-mt="' + F(c.MT) + '" data-k="' + c.K + '" data-vy="' + c.Vy + '" style="max-width:100%;height:auto">' + defs + c.Sb.join('') + '</svg>';
    if (leyenda.length) s += '<div class="hk-dib-ley">' + leyenda.map(([t, st]) => '<span class="hk-dib-li">' + Swatch(st, id) + inline(t) + '</span>').join('') + '</div>';
    if (obsList.length) s += ObsTable(c, obsList);
    if (errs.length) s += '<div class="hk-dib-err">' + ErrHtml(errs) + '</div>';
    return s + '</div>';
  }

  const esDibujo = (texto) => RxInicio.test((String(texto || '').replace(/\r/g, '').split('\n').find((l) => l.trim()) || ''));
  // lookup sobre las variables de la hoja (env.v de hoja.js): número → [v]; cantidad con unidades {v (SI), d} → [v];
  // matriz/vector (HK.M) → sus componentes. Los nombres latinos de las directivas (phi_1, gamma) se buscan también en griego
  // (φ_1, γ), porque hlisp.js pasa a griego las líneas de cálculo pero NO las que empiezan por «#».
  const GR = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', psi: 'ψ', omega: 'ω' };
  const RxGr = new RegExp('(?<![A-Za-z0-9À-ɏ])(' + Object.keys(GR).join('|') + ')(?![A-Za-z0-9À-ɏ(])', 'g');
  const aNum = (x) => typeof x === 'number' ? x : typeof x === 'boolean' ? (x ? 1 : 0) : x && typeof x.v === 'number' ? x.v : NaN;
  function lookupDe(vars) {
    const una = (n) => {
      if (!vars || !Object.prototype.hasOwnProperty.call(vars, n)) return null;
      const x = vars[n];
      if (x && Array.isArray(x.a) && typeof x.r === 'number') return x.a.map(aNum);
      const v = aNum(x); return isNaN(v) && typeof x !== 'number' ? null : [v];
    };
    return (n) => { const v = una(n); if (v) return v; const g = n.replace(RxGr, (q) => GR[q]); return g !== n ? una(g) : null; };
  }
  HK.dibujo = { render, bloque, esDibujo, lookupDe, parse, evalua: (e, look) => ev(parse(e), look) };
})(window);
