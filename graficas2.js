// Hekatan Math Studio Web — gráficas de integración, copia de HekatanVisualNodes (WPF): GaussGraficos.cs y Escena3D.cs
//   friemann(f, a, b, n [, tipo])            integral de Riemann: curva, área exacta, n rectángulos (tipo 0 izq · 1 centro · 2 der)
//   fgauss(f, a, b, n)                       cuadratura de Gauss: área con signo, n puntos, una barra por punto (base = peso)
//   fgauss2d(n [, forma])                    n×n puntos de Gauss en el elemento de referencia y en el real (forma 0 rectángulo · 1 irregular)
//   fvolumen(f, x0, x1, y0, y1, n [, az, el])  doble integral: n×n prismas (n = 0 el sólido exacto)
//   fvoxeles(f, x0, x1, y0, y1, n, m [, az, el])  triple integral de 1: n×n×m cubitos
(function (G) {
  const HK = G.HK;
  const TIPOS = { friemann: 'riemann', fgauss: 'gauss1', fgauss2d: 'gauss2', fvolumen: 'esc3', fvoxeles: 'esc3', tabla: 'tabla', mallanum: 'malla' };

  // puntos y pesos de Gauss–Legendre en [-1, 1] (raíces de Legendre por Newton)
  function gaussLeg(n) {
    n = Math.max(1, Math.min(64, Math.round(n))); const x = new Array(n).fill(0), w = new Array(n).fill(0);
    for (let i = 0; i < Math.floor((n + 1) / 2); i++) {
      let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 1;
      for (let it = 0; it < 100; it++) {
        let p1 = 1, p2 = 0; for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
        pp = n * (z * p1 - p2) / (z * z - 1); const z1 = z; z = z1 - p1 / pp; if (Math.abs(z - z1) < 1e-15) break;
      }
      x[i] = -z; x[n - 1 - i] = z; w[i] = w[n - 1 - i] = 2 / ((1 - z * z) * pp * pp);
    }
    if (n % 2 === 1) x[(n - 1) / 2] = 0;
    return { x, w };
  }
  HK.gaussLeg = gaussLeg;
  const G4X = [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526], G4W = [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538];

  // ------------------------------------------------------------ cálculo
  function calcula(nombre, args, env) {
    const num = (a) => { const v = HK.evalua(a, env); return typeof v === 'number' ? v : NaN; };
    const ev = (a, vars) => { try { const v = HK.evalua(a, { v: Object.assign({}, env.v, vars), f: env.f, l: env.l }); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
    const aviso = { friemann: 'friemann(f(x), a, b, n [, tipo])', fgauss: 'fgauss(f(x), a, b, n)', fgauss2d: 'fgauss2d(n [, forma])', fvolumen: 'fvolumen(f(x,y), x0, x1, y0, y1, n [, az, el])', fvoxeles: 'fvoxeles(f(x,y), x0, x1, y0, y1, n, m [, az, el])' }[nombre];
    if (nombre === 'tabla') {          // tabla(a, b, x_j, e_j…): cada nombre es una columna (vector) o varias (matriz); título = el nombre
      const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', a: 'ₐ', e: 'ₑ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', m: 'ₘ', n: 'ₙ', x: 'ₓ' };
      const rot = (n) => { const k = n.indexOf('_'); if (k < 0) return n; const r = n.slice(k + 1); return [...r].every((c) => SUB[c]) ? n.slice(0, k) + [...r].map((c) => SUB[c]).join('') : n; };
      const tit = [], cols = [];
      for (const a of args) {
        const nm = a.t === 'id' ? a.n : null; let v = HK.evalua(a, env), m = HK.M.esM(v) ? v : new HK.M.Mat(1, 1, [v]);
        if (m.r === 1 && m.c > 1) m = new HK.M.Mat(m.c, 1, m.a.slice());
        for (let c = 0; c < m.c; c++) { const col = []; for (let r = 0; r < m.r; r++) col.push(m.g(r, c)); cols.push(col); tit.push(nm == null ? 'c' + cols.length : m.c === 1 ? rot(nm) : rot(nm) + '.' + (c + 1)); }
      }
      if (!cols.length) throw new Error('tabla(a, b, x_j, …): sin columnas');
      return { tipo: 'tabla', d: { tit, cols, filas: Math.min(40, Math.max(...cols.map((c) => c.length))), total: Math.max(...cols.map((c) => c.length)) } };
    }
    if (nombre === 'mallanum') {          // mallanum(X, Y, ELE, SUP): malla numerada con apoyos
      const col = (a) => { const v = HK.evalua(a, env); return HK.M.esM(v) ? v.a.slice() : [v]; };
      const me = HK.evalua(args[2], env); if (!HK.M.esM(me)) throw new Error('mallanum(X, Y, ELE, SUP)');
      const X = col(args[0]), Y = col(args[1]), el = []; for (let i = 0; i < me.r; i++) { const f = []; for (let j = 0; j < me.c; j++) f.push(Math.round(me.g(i, j)) - 1); el.push(f); }
      return { tipo: 'malla', d: { X, Y, el, sup: args.length > 3 ? col(args[3]).map(Math.round) : [], A: Math.max(1e-9, ...X), B: Math.max(1e-9, ...Y) } };
    }
    const tipo = TIPOS[nombre], cl = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));
    const exacto1 = (f, a, b, cs) => { let s = 0; for (let c = 0; c < cs; c++) { const x0 = a + (b - a) * c / cs, x1 = a + (b - a) * (c + 1) / cs; for (let u = 0; u < 4; u++) s += G4W[u] * (x1 - x0) / 2 * ev(f, { x: (x0 + x1) / 2 + (x1 - x0) / 2 * G4X[u] }); } return s; };
    if (nombre === 'fgauss') {
      if (args.length < 4) throw new Error(aviso);
      const a = num(args[1]), b = num(args[2]), n = cl(num(args[3]), 1, 40), ys = [];
      for (let i = 0; i <= 240; i++) ys.push(ev(args[0], { x: a + (b - a) * i / 240 }));
      if (ys.every((v) => !isFinite(v))) throw new Error('no se pudo graficar: la función no se evalúa en [a, b]');
      const g = gaussLeg(n), xp = [], hp = [], wp = []; let sg = 0;
      for (let i = 0; i < n; i++) { xp.push((a + b) / 2 + (b - a) / 2 * g.x[i]); hp.push(ev(args[0], { x: xp[i] })); wp.push(g.w[i] * (b - a) / 2); sg += wp[i] * hp[i]; }
      let apos = 0, aneg = 0; const NP = 4000, dx = (b - a) / NP;
      for (let i = 0; i < NP; i++) { const fv = ev(args[0], { x: a + dx * (i + 0.5) }); if (!isFinite(fv)) continue; if (fv >= 0) apos += fv * dx; else aneg += fv * dx; }
      return { tipo, d: { a, b, n, ys, xp, hp, wp, sg, aex: exacto1(args[0], a, b, 16), apos, aneg } };
    }
    if (nombre === 'fgauss2d') {
      if (args.length < 1) throw new Error(aviso);
      const n = cl(num(args[0]), 1, 12), forma = args.length > 1 ? cl(num(args[1]), 0, 1) : 1;
      const nod = forma === 0 ? [[0, 0], [4, 0], [4, 3], [0, 3]] : [[0, 0], [4, 0.5], [4.4, 3.5], [0.3, 3]], g = gaussLeg(n); let areaG = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const xi = g.x[i], et = g.x[j], d1 = [-(1 - et) / 4, (1 - et) / 4, (1 + et) / 4, -(1 + et) / 4], d2 = [-(1 - xi) / 4, -(1 + xi) / 4, (1 + xi) / 4, (1 - xi) / 4]; let j11 = 0, j12 = 0, j21 = 0, j22 = 0;
        for (let k = 0; k < 4; k++) { j11 += d1[k] * nod[k][0]; j12 += d1[k] * nod[k][1]; j21 += d2[k] * nod[k][0]; j22 += d2[k] * nod[k][1]; }
        areaG += g.w[i] * g.w[j] * (j11 * j22 - j12 * j21);
      }
      let areaEx = 0; for (let k = 0; k < 4; k++) { const p = nod[k], q = nod[(k + 1) % 4]; areaEx += p[0] * q[1] - q[0] * p[1]; }
      return { tipo, d: { n, forma, xi: g.x, wi: g.w, nod, areaG, areaEx: Math.abs(areaEx) / 2 } };
    }
    if (nombre === 'friemann') {
      if (args.length < 4) throw new Error(aviso);
      const a = num(args[1]), b = num(args[2]), n = cl(num(args[3]), 1, 2000), tp = args.length > 4 ? cl(num(args[4]), 0, 2) : 1, ys = [];
      for (let i = 0; i <= 200; i++) ys.push(ev(args[0], { x: a + (b - a) * i / 200 }));
      if (ys.every((v) => !isFinite(v))) throw new Error('no se pudo graficar: la función no se evalúa en [a, b]');
      const hs = [], dx = (b - a) / n; let sn = 0;
      for (let i = 0; i < n; i++) { const x = a + dx * (tp === 0 ? i : tp === 2 ? i + 1 : i + 0.5); hs.push(ev(args[0], { x })); sn += hs[i] * dx; }
      return { tipo, d: { a, b, n, tp, ys, hs, sn, aex: exacto1(args[0], a, b, 8) } };
    }
    // fvolumen / fvoxeles: los intervalos son [x0,x1] [y0,y1] o cuatro números sueltos
    let rg = args.slice(1).filter((q) => q.t === 'vec' && q.items.length === 2).map((q) => [num(q.items[0]), num(q.items[1])]), pr;
    if (rg.length >= 2) pr = args.slice(1).filter((q) => q.t !== 'vec').map(num);
    else if (args.length >= 5) { const v = args.slice(1).map(num); rg = [[v[0], v[1]], [v[2], v[3]]]; pr = v.slice(4); }
    else throw new Error(aviso);
    const [xa, xb] = rg[0], [ya, yb] = rg[1], vox = nombre === 'fvoxeles';
    let n = pr.length ? Math.max(0, Math.round(pr[0])) : 0; const m = vox ? (pr.length > 1 ? Math.max(1, Math.round(pr[1])) : 6) : 0, ip = vox ? 2 : 1;
    if (vox && n < 1) n = 6;
    const az = pr.length > ip ? pr[ip] : -38, el = pr.length > ip + 1 ? pr[ip + 1] : 28, Ng = 24, Z = [];
    for (let i = 0; i <= Ng; i++) { Z.push([]); for (let j = 0; j <= Ng; j++) Z[i].push(ev(args[0], { x: xa + (xb - xa) * i / Ng, y: ya + (yb - ya) * j / Ng })); }
    if (Z.every((r) => r.every((v) => !isFinite(v)))) throw new Error('no se pudo graficar: la función no se evalúa en el dominio');
    let vex = 0; const cel = 8;
    for (let ci = 0; ci < cel; ci++) for (let cj = 0; cj < cel; cj++) {
      const x0 = xa + (xb - xa) * ci / cel, x1 = xa + (xb - xa) * (ci + 1) / cel, y0 = ya + (yb - ya) * cj / cel, y1 = ya + (yb - ya) * (cj + 1) / cel;
      for (let u = 0; u < 4; u++) for (let v = 0; v < 4; v++) { const f = ev(args[0], { x: (x0 + x1) / 2 + (x1 - x0) / 2 * G4X[u], y: (y0 + y1) / 2 + (y1 - y0) / 2 * G4X[v] }); vex += G4W[u] * G4W[v] * (x1 - x0) / 2 * (y1 - y0) / 2 * Math.max(0, isFinite(f) ? f : 0); }
    }
    const nh = Math.max(1, n), Hc = []; let vn = 0, zmax = 0; Z.forEach((r) => r.forEach((v) => { if (isFinite(v)) zmax = Math.max(zmax, v); }));
    for (let i = 0; i < nh; i++) { Hc.push([]); for (let j = 0; j < nh; j++) Hc[i].push(ev(args[0], { x: xa + (xb - xa) * (i + 0.5) / nh, y: ya + (yb - ya) * (j + 0.5) / nh })); }
    if (vox) { const hz = zmax / m; for (let i = 0; i < nh; i++) for (let j = 0; j < nh; j++) for (let q = 0; q < m; q++) if ((q + 0.5) * hz <= Hc[i][j]) vn += (xb - xa) / nh * (yb - ya) / nh * hz; }
    else for (let i = 0; i < nh; i++) for (let j = 0; j < nh; j++) vn += Math.max(0, isFinite(Hc[i][j]) ? Hc[i][j] : 0) * (xb - xa) / nh * (yb - ya) / nh;
    return { tipo, d: { xa, xb, ya, yb, Z, Ng, Hc, n, m, modo: vox ? 1 : n > 0 ? 0 : 2, vn, vex, az, el } };
  }

  // ------------------------------------------------------------ dibujo
  const f4 = (v) => HK.fmt(parseFloat(Number(v).toPrecision(6)));
  const paso = (r) => { const q = Math.max(r, 1e-12) / 5, e = Math.pow(10, Math.floor(Math.log10(q))), m = q / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; };
  const NAR = '#c2410c', VERDE = '#15803d', AZUL = '#1e40af';
  function txt(c, s, x, y, tam, col, al) { c.font = tam + 'px "Segoe UI", sans-serif'; c.fillStyle = col || '#222'; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(s, x, y); c.textBaseline = 'alphabetic'; }
  function ejes2(c, l, t, w, h, A, B, ymin, ymax, X, Y) {
    const sx = paso(B - A), sy = paso(ymax - ymin); c.strokeStyle = 'rgba(90,100,120,.25)'; c.lineWidth = .6;
    for (let x = Math.ceil(A / sx - 1e-9) * sx; x <= B + 1e-9; x += sx) { c.beginPath(); c.moveTo(X(x), t); c.lineTo(X(x), t + h); c.stroke(); txt(c, f4(Math.round(x * 1e6) / 1e6), X(x), t + h + 10, 9, '#666', 'center'); }
    for (let y = Math.ceil(ymin / sy - 1e-9) * sy; y <= ymax + 1e-9; y += sy) { c.beginPath(); c.moveTo(l, Y(y)); c.lineTo(l + w, Y(y)); c.stroke(); txt(c, f4(Math.round(y * 1e6) / 1e6), l - 4, Y(y), 9, '#666', 'right'); }
  }
  function curva(c, ys, A, B, X, Y) { c.strokeStyle = AZUL; c.lineWidth = 2; c.beginPath(); let on = false; ys.forEach((v, i) => { if (!isFinite(v)) { on = false; return; } const x = X(A + (B - A) * i / (ys.length - 1)), y = Y(v); if (!on) { c.moveTo(x, y); on = true; } else c.lineTo(x, y); }); c.stroke(); }
  function rect(c, x0, x1, ya, yb, rel, bor) { const x = Math.min(x0, x1), y = Math.min(ya, yb), w = Math.abs(x1 - x0), h = Math.abs(yb - ya); c.fillStyle = rel; c.fillRect(x, y, w, h); if (bor) { c.strokeStyle = bor; c.lineWidth = .8; c.strokeRect(x, y, w, h); } }

  // ------------------------------------------------------------ hover (como el WPF): capa propia .ghov que crea hoja.js; aquí solo se pinta
  let HV = null;          // cada gráfica deja su función de hover: (c, px, py) => líneas del globo | null
  const dot = (c, x, y, col) => { c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.stroke(); };
  const ring = (c, x, y) => { c.lineWidth = 2.4; c.strokeStyle = '#000'; c.beginPath(); c.arc(x, y, 6, 0, 7); c.stroke(); c.lineWidth = 1.1; c.strokeStyle = '#fff'; c.beginPath(); c.arc(x, y, 6, 0, 7); c.stroke(); };
  const vert = (c, x, y0, y1) => { c.strokeStyle = 'rgba(20,20,20,.65)'; c.lineWidth = 1; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); c.setLineDash([]); };
  function globo(c, lineas, x, y, W, H) {
    c.font = '11px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; const w = Math.max(...lineas.map((t) => c.measureText(t).width)) + 12, h = lineas.length * 15 + 8;
    let gx = x + 12, gy = y + 12; if (gx + w > W - 2) gx = x - 12 - w; if (gy + h > H - 2) gy = y - 12 - h; gx = Math.max(2, gx); gy = Math.max(2, gy);
    c.fillStyle = 'rgba(255,255,255,.92)'; c.strokeStyle = '#555'; c.lineWidth = 1; c.beginPath(); c.rect(gx, gy, w, h); c.fill(); c.stroke();
    c.fillStyle = '#111'; lineas.forEach((t, i) => c.fillText(t, gx + 6, gy + 15 + i * 15));
  }
  function conectaHover(r) {          // hoja.js ya limpió y dimensionó r.hov (si r.hv existe); este escucha va después del suyo
    r.hv = { k: 'g2' }; r.hf2 = HV; const cv = r.gel; if (cv._h2) return; cv._h2 = true;
    cv.addEventListener('mousemove', (e) => {
      if (e.buttons || !r.hf2 || !r.hov || !r.hv || r.hv.k !== 'g2') return;
      const b = cv.getBoundingClientRect(), k = b.width ? cv.offsetWidth / b.width : 1, px = (e.clientX - b.left) * k, py = (e.clientY - b.top) * k, c = r.hov.getContext('2d');
      const lin = r.hf2(c, px, py); if (lin) { globo(c, lin, px, py, cv.offsetWidth, cv.offsetHeight); r.hoverTxt = lin.join(' | '); }
    });
  }

  function riemann(c, d, W, H) {
    const fin = (v) => isFinite(v) ? v : 0, ymin = Math.min(0, ...d.ys.filter(isFinite), ...d.hs.filter(isFinite)); let ymax = Math.max(...d.ys.filter(isFinite), ...d.hs.filter(isFinite)); if (ymax - ymin < 1e-12) ymax = ymin + 1; ymax += .06 * (ymax - ymin);
    const l = 46, t = 14, w = W - 66, h = H - 84, X = (x) => l + (x - d.a) / (d.b - d.a) * w, Y = (y) => t + h - (y - ymin) / (ymax - ymin) * h;
    HV = (c, px, py) => {          // hover: rectángulo bajo el cursor (x, f(x), altura y área del rectángulo)
      if (px < l || px > l + w || py < t || py > t + h) return null;
      const xv = d.a + (px - l) / w * (d.b - d.a), i = Math.min(d.n - 1, Math.floor((xv - d.a) / (d.b - d.a) * d.n)), j = Math.round((xv - d.a) / (d.b - d.a) * (d.ys.length - 1)), fx = d.ys[j], hi = d.hs[i], dxr = (d.b - d.a) / d.n;
      c.strokeStyle = '#000'; c.lineWidth = 1.6; c.strokeRect(X(d.a + dxr * i), Math.min(Y(hi), Y(0)), w / d.n, Math.abs(Y(hi) - Y(0)));
      vert(c, px, t, t + h); if (isFinite(fx)) dot(c, px, Y(fx), AZUL);
      return ['x = ' + f4(xv) + '   f(x) = ' + f4(fx), 'rectángulo ' + (i + 1) + ': altura = ' + f4(hi) + '   área = ' + f4(hi * dxr)];
    };
    ejes2(c, l, t, w, h, d.a, d.b, ymin, ymax, X, Y);
    c.fillStyle = 'rgba(22,163,74,.22)'; c.beginPath(); c.moveTo(X(d.a), Y(0)); d.ys.forEach((v, i) => c.lineTo(X(d.a + (d.b - d.a) * i / (d.ys.length - 1)), Y(fin(v)))); c.lineTo(X(d.b), Y(0)); c.closePath(); c.fill();
    const dxp = w / d.n, bor = dxp >= 3 ? 'rgba(29,78,137,.8)' : null;
    for (let i = 0; i < d.n; i++) rect(c, X(d.a + (d.b - d.a) * i / d.n), X(d.a + (d.b - d.a) * (i + 1) / d.n), Y(fin(d.hs[i])), Y(0), 'rgba(37,99,235,.37)', bor);
    curva(c, d.ys, d.a, d.b, X, Y);
    c.strokeStyle = '#000'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(l, Y(0)); c.lineTo(l + w + 6, Y(0)); c.moveTo(l, Y(ymin)); c.lineTo(l, t - 4); c.stroke();
    txt(c, 'x', l + w + 12, Y(0), 11, NAR, 'center'); txt(c, 'y', l, t - 9, 11, VERDE, 'center');
    txt(c, 'Suma de Riemann (' + (d.tp === 0 ? 'extremo izquierdo' : d.tp === 2 ? 'extremo derecho' : 'punto medio') + '), n = ' + d.n + ' rectángulos', 10, H - 24, 10.5);
    txt(c, 'A ≈ ' + f4(d.sn) + '     integral = ' + f4(d.aex) + '     error = ' + f4(Math.abs(d.sn - d.aex)), 10, H - 9, 10.5);
  }

  function gauss1(c, d, W, H) {
    const hp = d.hp.filter(isFinite); let ymin = Math.min(0, ...d.ys.filter(isFinite), ...hp), ymax = Math.max(0, ...d.ys.filter(isFinite), ...hp); if (ymax - ymin < 1e-12) ymax = ymin + 1; const marg = .08 * (ymax - ymin); ymax += marg; if (ymin < 0) ymin -= marg;
    const l = 46, t = 14, w = W - 66, h = H - 98, X = (x) => l + (x - d.a) / (d.b - d.a) * w, Y = (y) => t + h - (y - ymin) / (ymax - ymin) * h;
    HV = (c, px, py) => {          // hover: punto de Gauss más cercano (xᵢ, wᵢ, f(xᵢ), wᵢ·f) o, si no, el valor de la curva
      for (let i = 0; i < d.n; i++) { const qx = X(d.xp[i]), qy = Y(isFinite(d.hp[i]) ? d.hp[i] : 0); if ((qx - px) ** 2 + (qy - py) ** 2 <= 196) { ring(c, qx, qy); return ['punto de Gauss ' + (i + 1) + ': x = ' + f4(d.xp[i]), 'peso w = ' + f4(d.wp[i]) + '   f(x) = ' + f4(d.hp[i]), 'w·f(x) = ' + f4(d.wp[i] * d.hp[i])]; } }
      if (px < l || px > l + w || py < t || py > t + h) return null;
      const xv = d.a + (px - l) / w * (d.b - d.a), fx = d.ys[Math.round((xv - d.a) / (d.b - d.a) * (d.ys.length - 1))];
      vert(c, px, t, t + h); if (isFinite(fx)) dot(c, px, Y(fx), AZUL); return ['x = ' + f4(xv) + '   f(x) = ' + f4(fx)];
    };
    ejes2(c, l, t, w, h, d.a, d.b, ymin, ymax, X, Y);
    const m = d.ys.length - 1;
    for (let i = 0; i < m; i++) { const ya = d.ys[i], yb = d.ys[i + 1]; if (!isFinite(ya) || !isFinite(yb)) continue; const ym = (ya + yb) / 2; rect(c, X(d.a + (d.b - d.a) * i / m), X(d.a + (d.b - d.a) * (i + 1) / m) + .4, Y(ym), Y(0), ym >= 0 ? 'rgba(22,163,74,.27)' : 'rgba(220,38,38,.35)'); }
    for (let i = 0; i < d.n; i++) { const anc = d.wp[i] / (d.b - d.a) * w; rect(c, X(d.xp[i]) - anc / 2, X(d.xp[i]) + anc / 2, Y(isFinite(d.hp[i]) ? d.hp[i] : 0), Y(0), 'rgba(37,99,235,.31)', 'rgba(29,78,137,.86)'); }
    curva(c, d.ys, d.a, d.b, X, Y);
    c.strokeStyle = '#000'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(l, Y(0)); c.lineTo(l + w + 6, Y(0)); c.moveTo(l, t - 4); c.lineTo(l, t + h); c.stroke();
    for (let i = 0; i < d.n; i++) { const px = X(d.xp[i]), py = Y(isFinite(d.hp[i]) ? d.hp[i] : 0); c.fillStyle = NAR; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(px, py, 4.2, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.arc(px, Y(0), 2.6, 0, 7); c.fill(); if (d.n <= 12) txt(c, 'ξ' + (i + 1) + '=' + f4(Math.round(d.xp[i] * 1e4) / 1e4), px, t + h + 22, 8.5, NAR, 'center'); }
    txt(c, 'x', l + w + 12, Y(0), 11, NAR, 'center');
    txt(c, 'Cuadratura de Gauss, n = ' + d.n + ' punto' + (d.n === 1 ? '' : 's') + '  (la base de cada barra es su peso wᵢ)', 10, H - 38, 10.5);
    txt(c, 'I ≈ Σ wᵢ·f(xᵢ) = ' + f4(d.sg) + '     integral = ' + f4(d.aex) + '     error = ' + f4(Math.abs(d.sg - d.aex)), 10, H - 23, 10.5);
    txt(c, 'área con signo:  arriba (verde) = ' + f4(d.apos) + '   abajo (rojo) = ' + f4(d.aneg) + '   suma = ' + f4(d.apos + d.aneg), 10, H - 8, 10.5, VERDE);
  }

  function gauss2(c, d, W, H) {
    const n = d.n, mitad = (W - 30) / 2, alto = H - 56, lado = Math.min(mitad - 30, alto - 16), wmax = Math.max(...d.wi), rad = (wa) => 3 + 6 * Math.sqrt(wa / wmax);
    const azul = 'rgba(37,99,235,.27)', lin = AZUL, rej = 'rgba(90,100,120,.27)', x0 = 20 + (mitad - lado) / 2, y0 = 22;
    c.fillStyle = azul; c.strokeStyle = lin; c.lineWidth = 1.6; c.fillRect(x0, y0, lado, lado); c.strokeRect(x0, y0, lado, lado);
    const CX = (v) => x0 + (v + 1) / 2 * lado, CY = (v) => y0 + lado - (v + 1) / 2 * lado, ln = (a, b, p, q) => { c.beginPath(); c.moveTo(a, b); c.lineTo(p, q); c.stroke(); };
    c.strokeStyle = rej; c.lineWidth = .7; ln(CX(0), y0, CX(0), y0 + lado); ln(x0, CY(0), x0 + lado, CY(0));
    d.xi.forEach((v) => { ln(CX(v), y0, CX(v), y0 + lado); ln(x0, CY(v), x0 + lado, CY(v)); });
    const punto = (x, y, r) => { c.fillStyle = NAR; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke(); };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) punto(CX(d.xi[i]), CY(d.xi[j]), rad(d.wi[i] * d.wi[j]));
    txt(c, 'elemento de referencia', x0 + lado / 2, 9, 10, '#222', 'center'); txt(c, 'ξ', x0 + lado + 10, CY(0), 11, NAR, 'center'); txt(c, 'η', CX(0), y0 - 3, 11, NAR, 'center');
    txt(c, '−1', x0, y0 + lado + 9, 8.5, '#666', 'center'); txt(c, '1', x0 + lado, y0 + lado + 9, 8.5, '#666', 'center');
    const xr = 20 + mitad + 30, nod = d.nod, minx = Math.min(...nod.map((q) => q[0])), maxx = Math.max(...nod.map((q) => q[0])), miny = Math.min(...nod.map((q) => q[1])), maxy = Math.max(...nod.map((q) => q[1])), esc = Math.min((mitad - 40) / (maxx - minx), lado / (maxy - miny));
    const P = (x, y) => [xr + (x - minx) * esc, y0 + lado - (y - miny) * esc];
    const Map = (xi, et) => { const Ni = [(1 - xi) * (1 - et) / 4, (1 + xi) * (1 - et) / 4, (1 + xi) * (1 + et) / 4, (1 - xi) * (1 + et) / 4]; let mx = 0, my = 0; for (let k = 0; k < 4; k++) { mx += Ni[k] * nod[k][0]; my += Ni[k] * nod[k][1]; } return P(mx, my); };
    const real = (xi, et) => { let mx = 0, my = 0; const Ni = [(1 - xi) * (1 - et) / 4, (1 + xi) * (1 - et) / 4, (1 + xi) * (1 + et) / 4, (1 - xi) * (1 + et) / 4]; for (let k = 0; k < 4; k++) { mx += Ni[k] * nod[k][0]; my += Ni[k] * nod[k][1]; } return [mx, my]; };
    HV = (c, px, py) => {          // hover: punto de Gauss más cercano en el elemento de referencia o en el real (se marca el par)
      let mejor = null, md = 196;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const A = [CX(d.xi[i]), CY(d.xi[j])], B = Map(d.xi[i], d.xi[j]); for (const q of [A, B]) { const dd = (q[0] - px) ** 2 + (q[1] - py) ** 2; if (dd <= md) { md = dd; mejor = { i, j, A, B }; } } }
      if (!mejor) return null; ring(c, mejor.A[0], mejor.A[1]); ring(c, mejor.B[0], mejor.B[1]);
      const { i, j } = mejor, rp = real(d.xi[i], d.xi[j]);
      return ['punto de Gauss (' + (i + 1) + ', ' + (j + 1) + ')', 'ξ = ' + f4(d.xi[i]) + '   η = ' + f4(d.xi[j]), 'x = ' + f4(rp[0]) + '   y = ' + f4(rp[1]), 'peso wᵢ·wⱼ = ' + f4(d.wi[i] * d.wi[j])];
    };
    c.fillStyle = azul; c.strokeStyle = lin; c.lineWidth = 1.6; c.beginPath(); nod.forEach((q, k) => { const p = P(q[0], q[1]); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = rej; c.lineWidth = .7; d.xi.forEach((v) => { const a1 = Map(v, -1), a2 = Map(v, 1), b1 = Map(-1, v), b2 = Map(1, v); ln(a1[0], a1[1], a2[0], a2[1]); ln(b1[0], b1[1], b2[0], b2[1]); });
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const p = Map(d.xi[i], d.xi[j]); punto(p[0], p[1], rad(d.wi[i] * d.wi[j])); }
    nod.forEach((q, k) => { const p = P(q[0], q[1]); txt(c, String(k + 1), p[0] + (k === 0 || k === 3 ? -8 : 8), p[1] + (k < 2 ? 8 : -8), 9, '#222', 'center'); });
    txt(c, d.forma === 0 ? 'elemento real (rectángulo)' : 'elemento real (cuadrilátero irregular)', xr + (maxx - minx) * esc / 2, 9, 10, '#222', 'center');
    txt(c, n + '×' + n + ' = ' + n * n + ' punto' + (n * n === 1 ? '' : 's') + ' de Gauss  (círculo mayor = peso wᵢ·wⱼ mayor)   Σ wᵢ wⱼ det J = ' + f4(d.areaG) + '   área exacta = ' + f4(d.areaEx), 10, H - 9, 10.5);
  }

  // escena 3D con ejes: piso con rejilla, prismas / cubitos / sólido, superficie en malla, ejes con flechas y números
  function escena(c, d, W, H, ob) {
    ob = ob || { az: 0, el: 0, z: 1 };
    const az = (d.az + ob.az) * Math.PI / 180, el = Math.max(-89, Math.min(89, d.el + ob.el)) * Math.PI / 180, ca = Math.cos(az), sa = Math.sin(az), se = Math.sin(el), ce = Math.cos(el);
    let zmn = Infinity, zmx = -Infinity; d.Z.forEach((r) => r.forEach((v) => { if (isFinite(v)) { zmn = Math.min(zmn, v); zmx = Math.max(zmx, v); } }));
    const zlo = Math.min(0, zmn), zhi = Math.max(zmx, 1e-9), dx = d.xb - d.xa, dy = d.yb - d.ya, dz = zhi - zlo, k = 1 / Math.max(dx, dy), zk = Math.min(1, .8 * Math.max(dx, dy) / Math.max(dz, 1e-12));
    const cx = (d.xa + d.xb) / 2, cy = (d.ya + d.yb) / 2, cz = (zlo + zhi) / 2;
    const Pr = (x, y, z) => { const xc = (x - cx) * k, yc = (y - cy) * k, zc = (z - cz) * k * zk, u = xc * ca - yc * sa, v = xc * sa + yc * ca; return [u, -(v * se + zc * ce), v * ce - zc * se]; };
    let mnX = 1e9, mxX = -1e9, mnY = 1e9, mxY = -1e9;
    for (const x of [d.xa - .12 * dx, d.xb + .18 * dx]) for (const y of [d.ya - .12 * dy, d.yb + .18 * dy]) for (const z of [zlo, zhi + .2 * dz]) { const q = Pr(x, y, z); mnX = Math.min(mnX, q[0]); mxX = Math.max(mxX, q[0]); mnY = Math.min(mnY, q[1]); mxY = Math.max(mxY, q[1]); }
    const pw = W - 30, ph = H - 36; let s = Math.min(pw / (mxX - mnX), ph / (mxY - mnY)), ox = 16 + (pw - s * (mxX - mnX)) / 2 - s * mnX, oy = 8 + (ph - s * (mxY - mnY)) / 2 - s * mnY;
    if (ob.z !== 1) { const zm = ob.z, ccx = 16 + pw / 2, ccy = 8 + ph / 2; s *= zm; ox = ccx - zm * (ccx - ox); oy = ccy - zm * (ccy - oy); }
    const T = (x, y, z) => { const q = Pr(x, y, z); return [ox + s * q[0], oy + s * q[1]]; }, rng = Math.max(zhi - zlo, 1e-12);
    const jet = (t) => { t = Math.max(0, Math.min(1, t)); const f = (o) => Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - o)))); return [f(3), f(2), f(1)]; };
    const Col = (z) => jet(1 - (z - zlo) / rng), camx = -sa * ce, camy = -ca * ce, camz = se, caras = [];
    const Quad = (a, b, c2, d2, col, alfa, borde, nrm) => {
      if (nrm && nrm[0] * camx + nrm[1] * camy + nrm[2] * camz <= 1e-9) return;
      caras.push({ p: [T(...a), T(...b), T(...c2), T(...d2)], D: Pr((a[0] + c2[0]) / 2, (a[1] + c2[1]) / 2, (a[2] + c2[2]) / 2)[2], col, alfa, borde });
    };
    const som = (col, f) => col.map((v) => Math.round(v * f)), sx = paso(dx), sy = paso(dy), sz = paso(dz);
    c.strokeStyle = 'rgba(90,100,120,.28)'; c.lineWidth = .6;
    const seg = (p, q) => { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); };
    for (let x = Math.ceil(d.xa / sx - 1e-9) * sx; x <= d.xb + 1e-9; x += sx) seg(T(x, d.ya, zlo), T(x, d.yb, zlo));
    for (let y = Math.ceil(d.ya / sy - 1e-9) * sy; y <= d.yb + 1e-9; y += sy) seg(T(d.xa, y, zlo), T(d.xb, y, zlo));
    const N = d.n, hx = dx / Math.max(1, N), hy = dy / Math.max(1, N);
    const pts = [], Hc = d.Hc;          // hover: puntos de la escena (centro de la cara superior de cada prisma/cubito o nudo de la superficie)
    if (d.modo === 0) { for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (Hc[i][j] > 0) pts.push({ p: T(d.xa + (i + .5) * hx, d.ya + (j + .5) * hy, Hc[i][j]), l: ['prisma (' + (i + 1) + ', ' + (j + 1) + ')', 'x = ' + f4(d.xa + (i + .5) * hx) + '   y = ' + f4(d.ya + (j + .5) * hy), 'altura = ' + f4(Hc[i][j])] }); }
    else if (d.modo === 1) { const M = d.m, hz = zmx / Math.max(1, M); for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { let q = -1; while (q + 1 < M && (q + 1.5) * hz <= Hc[i][j]) q++; if (q >= 0) pts.push({ p: T(d.xa + (i + .5) * hx, d.ya + (j + .5) * hy, (q + 1) * hz), l: ['columna (' + (i + 1) + ', ' + (j + 1) + '): ' + (q + 1) + ' cubitos', 'x = ' + f4(d.xa + (i + .5) * hx) + '   y = ' + f4(d.ya + (j + .5) * hy), 'z superior = ' + f4((q + 1) * hz)] }); } }
    else { const Ng = d.Ng; for (let i = 0; i <= Ng; i++) for (let j = 0; j <= Ng; j++) { const z = d.Z[i][j]; if (isFinite(z)) pts.push({ p: T(d.xa + i * dx / Ng, d.ya + j * dy / Ng, z), l: ['x = ' + f4(d.xa + i * dx / Ng) + '   y = ' + f4(d.ya + j * dy / Ng), 'z = ' + f4(z)] }); } }
    HV = (c, px, py) => { let m = null, md = 196; for (const q of pts) { const dd = (q.p[0] - px) ** 2 + (q.p[1] - py) ** 2; if (dd <= md) { md = dd; m = q; } } if (!m) return null; ring(c, m.p[0], m.p[1]); return m.l; };
    if (d.modo === 0) {
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const h = d.Hc[i][j]; if (!(h > 0)) continue; const xa = d.xa + i * hx, xb = xa + hx, ya = d.ya + j * hy, yb = ya + hy, col = Col(h);
        Quad([xa, ya, h], [xb, ya, h], [xb, yb, h], [xa, yb, h], col, .84, true, [0, 0, 1]); Quad([xa, ya, 0], [xb, ya, 0], [xb, ya, h], [xa, ya, h], som(col, .78), .84, true, [0, -1, 0]);
        Quad([xb, ya, 0], [xb, yb, 0], [xb, yb, h], [xb, ya, h], som(col, .66), .84, true, [1, 0, 0]); Quad([xb, yb, 0], [xa, yb, 0], [xa, yb, h], [xb, yb, h], som(col, .78), .84, true, [0, 1, 0]); Quad([xa, yb, 0], [xa, ya, 0], [xa, ya, h], [xa, yb, h], som(col, .66), .84, true, [-1, 0, 0]);
      }
    } else if (d.modo === 1) {
      const M = d.m, hz = zmx / Math.max(1, M), lleno = (i, j, q) => i >= 0 && j >= 0 && q >= 0 && i < N && j < N && q < M && (q + .5) * hz <= d.Hc[i][j];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let q = 0; q < M; q++) {
        if (!lleno(i, j, q)) continue; const xa = d.xa + i * hx, xb = xa + hx, ya = d.ya + j * hy, yb = ya + hy, za = q * hz, zb = za + hz, col = Col((za + zb) / 2);
        if (!lleno(i, j, q + 1)) Quad([xa, ya, zb], [xb, ya, zb], [xb, yb, zb], [xa, yb, zb], col, .88, true, [0, 0, 1]);
        if (!lleno(i, j - 1, q)) Quad([xa, ya, za], [xb, ya, za], [xb, ya, zb], [xa, ya, zb], som(col, .78), .88, true, [0, -1, 0]);
        if (!lleno(i + 1, j, q)) Quad([xb, ya, za], [xb, yb, za], [xb, yb, zb], [xb, ya, zb], som(col, .66), .88, true, [1, 0, 0]);
        if (!lleno(i, j + 1, q)) Quad([xb, yb, za], [xa, yb, za], [xa, yb, zb], [xb, yb, zb], som(col, .78), .88, true, [0, 1, 0]);
        if (!lleno(i - 1, j, q)) Quad([xa, yb, za], [xa, ya, za], [xa, ya, zb], [xa, yb, zb], som(col, .66), .88, true, [-1, 0, 0]);
      }
    } else {
      const Ng = d.Ng, gx = dx / Ng, gy = dy / Ng, Z = d.Z, f0 = (v) => isFinite(v) ? v : 0;
      for (let i = 0; i < Ng; i++) for (let j = 0; j < Ng; j++) {
        const xa = d.xa + i * gx, xb = xa + gx, ya = d.ya + j * gy, yb = ya + gy, z00 = f0(Z[i][j]), z10 = f0(Z[i + 1][j]), z11 = f0(Z[i + 1][j + 1]), z01 = f0(Z[i][j + 1]);
        Quad([xa, ya, z00], [xb, ya, z10], [xb, yb, z11], [xa, yb, z01], Col((z00 + z10 + z11 + z01) / 4), .92, false, null);
        if (j === 0) Quad([xa, ya, 0], [xb, ya, 0], [xb, ya, z10], [xa, ya, z00], som(Col((z00 + z10) / 2), .78), .92, false, [0, -1, 0]);
        if (j === Ng - 1) Quad([xb, yb, 0], [xa, yb, 0], [xa, yb, z01], [xb, yb, z11], som(Col((z01 + z11) / 2), .78), .92, false, [0, 1, 0]);
        if (i === Ng - 1) Quad([xb, ya, 0], [xb, yb, 0], [xb, yb, z11], [xb, ya, z10], som(Col((z10 + z11) / 2), .66), .92, false, [1, 0, 0]);
        if (i === 0) Quad([xa, yb, 0], [xa, ya, 0], [xa, ya, z00], [xa, yb, z01], som(Col((z00 + z01) / 2), .66), .92, false, [-1, 0, 0]);
      }
    }
    caras.sort((p, q) => q.D - p.D);
    for (const cr of caras) {
      c.beginPath(); c.moveTo(cr.p[0][0], cr.p[0][1]); for (let i = 1; i < 4; i++) c.lineTo(cr.p[i][0], cr.p[i][1]); c.closePath();
      const rgba = 'rgba(' + cr.col.join(',') + ',' + cr.alfa + ')'; c.fillStyle = rgba; c.fill(); c.strokeStyle = cr.borde ? 'rgba(30,30,40,.47)' : rgba; c.lineWidth = cr.borde ? .5 : .6; c.stroke();
    }
    if (d.modo !== 2) {
      const Ng = d.Ng, gx = dx / Ng, gy = dy / Ng, f0 = (v) => isFinite(v) ? v : 0; c.strokeStyle = 'rgba(20,20,30,.59)'; c.lineWidth = .8;
      for (let i = 0; i <= Ng; i += 2) { c.beginPath(); for (let j = 0; j <= Ng; j++) { const q = T(d.xa + i * gx, d.ya + j * gy, f0(d.Z[i][j])); j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke(); }
      for (let j = 0; j <= Ng; j += 2) { c.beginPath(); for (let i = 0; i <= Ng; i++) { const q = T(d.xa + i * gx, d.ya + j * gy, f0(d.Z[i][j])); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke(); }
    }
    const Eje = (a, b, col, nombre, en, desde, hasta, pas) => {
      const pa = T(...a), pb = T(...b); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.5; seg(pa, pb);
      let dX = pb[0] - pa[0], dY = pb[1] - pa[1]; const ln = Math.max(1e-9, Math.hypot(dX, dY)); dX /= ln; dY /= ln; const nX = -dY, nY = dX;
      c.beginPath(); c.moveTo(pb[0], pb[1]); c.lineTo(pb[0] - dX * 8 + nX * 3.2, pb[1] - dY * 8 + nY * 3.2); c.lineTo(pb[0] - dX * 8 - nX * 3.2, pb[1] - dY * 8 - nY * 3.2); c.closePath(); c.fill();
      txt(c, nombre, pb[0] + dX * 10, pb[1] + dY * 10, 11, col, 'center');
      for (let t = Math.ceil(desde / pas - 1e-9) * pas; t <= hasta + 1e-9; t += pas) { const q = T(...en(t)); c.strokeStyle = col; c.lineWidth = 1.5; seg([q[0] - nX * 2.5, q[1] - nY * 2.5], [q[0] + nX * 2.5, q[1] + nY * 2.5]); txt(c, f4(Math.round(t * 1e6) / 1e6), q[0] - nX * 9, q[1] - nY * 9, 8.5, '#666', 'center'); }
    };
    const ex = d.xb + .14 * dx, ey = d.yb + .14 * dy, ez = zhi + .16 * dz;
    Eje([d.xa, d.ya, zlo], [ex, d.ya, zlo], NAR, 'x', (t) => [t, d.ya, zlo], d.xa, d.xb, sx); Eje([d.xa, d.ya, zlo], [d.xa, ey, zlo], VERDE, 'y', (t) => [d.xa, t, zlo], d.ya, d.yb, sy); Eje([d.xa, d.ya, zlo], [d.xa, d.ya, ez], '#1d4e89', 'z', (t) => [d.xa, d.ya, t], zlo, zhi, sz);
    txt(c, d.modo === 1 ? 'Triple integral de 1: ' + N + '×' + N + '×' + d.m + ' cubitos  V ≈ ' + f4(d.vn) + '   (exacto ' + f4(d.vex) + ')' : d.modo === 0 ? 'Doble integral: ' + N + '×' + N + ' prismas  V ≈ ' + f4(d.vn) + '   (exacto ' + f4(d.vex) + ')' : 'Sólido bajo z = f(x,y):  V = ' + f4(d.vex), 10, H - 12, 10.5);
  }

  function tabla(c, d, W, H) {
    const cw = (W - 40) / d.cols.length, x0 = 36, y0 = 6; c.lineWidth = 1;
    HV = (c, px, py) => {          // hover: celda bajo el cursor (columna, fila y valor)
      const k = Math.floor((px - x0) / cw), r = Math.floor((py - y0 - 24) / 20); if (px < x0 || k < 0 || k >= d.cols.length || r < 0 || r >= d.filas || r >= d.cols[k].length) return null;
      c.strokeStyle = '#000'; c.lineWidth = 1.6; c.strokeRect(x0 + cw * k + .5, y0 + 24 + r * 20 + .5, cw, 20);
      return [d.tit[k] + '   fila ' + (r + 1), 'valor = ' + f4(d.cols[k][r])];
    };
    c.fillStyle = '#f1f5f9'; c.fillRect(0, y0, W, 24); c.strokeStyle = '#94a3b8'; c.strokeRect(0.5, y0 + 0.5, W - 1, 24 + d.filas * 20);
    txt(c, '', 0, 0, 12); d.tit.forEach((t, k) => txt(c, t, x0 + cw * k + cw / 2, y0 + 12, 13, '#0f172a', 'center'));
    for (let r = 0; r < d.filas; r++) {
      const y = y0 + 24 + r * 20; c.strokeStyle = '#e2e8f0'; c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke();
      txt(c, String(r + 1), x0 - 6, y + 10, 12, '#64748b', 'right');
      d.cols.forEach((col, k) => { if (r < col.length) txt(c, HK.fmt(parseFloat(Number(col[r]).toPrecision(6))), x0 + cw * k + cw - 8, y + 10, 12.5, '#111', 'right'); });
    }
    c.strokeStyle = '#94a3b8'; c.beginPath(); c.moveTo(x0 - 0.5, y0); c.lineTo(x0 - 0.5, y0 + 24 + d.filas * 20); c.stroke();
    if (d.total > d.filas) txt(c, '… ' + d.total + ' filas (se muestran ' + d.filas + ')', 6, y0 + 24 + d.filas * 20 + 12, 11, '#64748b');
  }
  function malla(c, d, W, H) {
    const pw = W - 70, ph = Math.max(60, pw * d.B / d.A), k = pw / d.A, x0 = 25, y0 = 14; c.save(); c.translate(0, 0);
    const P = (x, y) => [x0 + x * k, y0 + ph - y * k];
    HV = (c, px, py) => {          // hover: nudo más cercano (≤ 10 px) o, si no, el elemento bajo el cursor
      let nb = -1, md = 100; for (let j = 0; j < d.X.length; j++) { const p = P(d.X[j], d.Y[j]), dd = (p[0] - px) ** 2 + (p[1] - py) ** 2; if (dd <= md) { md = dd; nb = j; } }
      if (nb >= 0) { const p = P(d.X[nb], d.Y[nb]); ring(c, p[0], p[1]); return ['nudo ' + (nb + 1), 'x = ' + f4(d.X[nb]) + '   y = ' + f4(d.Y[nb]), d.sup.includes(nb + 1) ? 'con apoyo' : 'libre']; }
      for (let e = 0; e < d.el.length; e++) { const q = d.el[e].map((j) => P(d.X[j], d.Y[j])); let dentro = false; for (let a = 0, b = q.length - 1; a < q.length; b = a++) if ((q[a][1] > py) !== (q[b][1] > py) && px < (q[b][0] - q[a][0]) * (py - q[a][1]) / (q[b][1] - q[a][1]) + q[a][0]) dentro = !dentro;
        if (dentro) { c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); return ['elemento ' + (e + 1), 'nudos: ' + d.el[e].map((j) => j + 1).join(', ')]; } }
      return null;
    };
    c.fillStyle = 'rgba(255,255,0,0.2)'; c.fillRect(x0, y0, pw, ph);
    d.el.forEach((n, e) => {
      c.beginPath(); n.forEach((j, q) => { const p = P(d.X[j], d.Y[j]); q ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath();
      c.fillStyle = 'rgba(0,255,0,0.1)'; c.fill(); c.strokeStyle = 'rgba(46,139,87,0.55)'; c.lineWidth = 1; c.stroke();
      const cx = n.reduce((s, j) => s + d.X[j], 0) / n.length, cy = n.reduce((s, j) => s + d.Y[j], 0) / n.length, p = P(cx, cy); txt(c, String(e + 1), p[0], p[1], Math.max(8, Math.min(12, k * d.A / (d.el.length ** 0.5) * 0.4)), '#64748b', 'center');
    });
    const rr = Math.max(2, 0.04 * pw * 0.5); c.strokeStyle = '#dc2626'; c.fillStyle = '#ffb6c1';
    d.sup.forEach((j1) => { const j = j1 - 1, p = P(d.X[j], d.Y[j]); const hor = Math.abs(d.Y[j]) < 1e-9 || Math.abs(d.Y[j] - d.B) < 1e-9; c.beginPath(); if (hor) { c.moveTo(p[0] - 4 * rr, p[1]); c.lineTo(p[0] + 4 * rr, p[1]); } else { c.moveTo(p[0], p[1] - 4 * rr); c.lineTo(p[0], p[1] + 4 * rr); } c.stroke(); c.beginPath(); c.arc(p[0], p[1], rr, 0, 7); c.fill(); c.stroke(); });
    c.restore();
  }
  function dibuja(r) {
    const g = r.graf, cv = r.gel, dpr = window.devicePixelRatio || 1, pa = document.getElementById('hoja'), disp = pa ? pa.clientWidth - 24 : 600, W0 = Math.max(380, Math.min(disp, g.tipo === 'esc3' ? 560 : 680)), W = g.tipo === 'tabla' ? Math.min(W0, 60 + 92 * g.d.cols.length) : g.tipo === 'malla' ? Math.min(W0, 460) : W0, H = g.tipo === 'tabla' ? 40 + g.d.filas * 20 + (g.d.total > g.d.filas ? 18 : 0) : g.tipo === 'malla' ? Math.max(60, (W - 70) * g.d.B / g.d.A) + 30 : g.tipo === 'gauss1' ? 340 : g.tipo === 'gauss2' ? 300 : g.tipo === 'esc3' ? 400 : 290;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.style.margin = '4px 0 6px 6px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    HV = null; c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    ({ riemann, gauss1, gauss2, tabla, malla, esc3: (cc, d, w, h) => escena(cc, d, w, h, r.orb) })[g.tipo](c, g.d, W, H);
    c.restore(); conectaHover(r);
  }
  HK.graf2 = { TIPOS, calcula, dibuja, gaussLeg, es3d: (g) => !!g && g.tipo === 'esc3' };
})(window);
