// Hekatan Math Studio Web — AUTOCOMPLETAR (como el de WPF): al escribir 2 letras sale una lista con lo que el programa sabe hacer:
// estructuras (integral → ∫ …), símbolos (alpha → α), funciones (sin → sin( ), variables y funciones de la hoja, y en el bloque CAD las funciones AutoLISP.
// ↑ ↓ eligen · Tab inserta · Esc cierra · clic inserta. Enter sigue siendo «ecuación nueva» (no inserta nada).
(function (G) {
  const HK = G.HK;
  const E = (p, ic, tecla, d) => ({ p, t: 'estructura', ic, tecla, d }), S = (p, sim, d) => ({ p, t: 'simbolo', ic: sim, sim, d }), F = (p, d) => ({ p, t: 'funcion', ic: 'ƒ', d }), P = (p, d) => ({ p, t: 'palabra', ic: '⏎', d });
  const FIJAS = [
    E('lim', 'lim', 'lim~', 'límite: variable → punto (inf = ∞) → expresión'), E('limite', 'lim', 'lim~', 'límite: variable → punto (inf = ∞) → expresión'), E('serie', 'T(x)', 'serie~', 'serie de Taylor: variable → punto → orden → función'), E('taylor', 'T(x)', 'serie~', 'serie de Taylor: variable → punto → orden → función'), E('prod', '∏', '%', 'productoria'), E('mat', '[ ]', '@', 'matriz vacía 2×2'), E('matrizvacia', '[ ]', '@', 'matriz vacía 2×2'), E('integral', '∫', '$', 'integral: límite inferior → superior → función → variable (Espacio pasa al hueco siguiente)'), E('sumatoria', '∑', '#', 'sumatoria: i = 1 → n → término'), E('productoria', '∏', '%', 'productoria'),
    E('derivada', 'd/dx', '?', 'derivada ordinaria: variable → función (otra vez «?» sube el orden)'), E('parcial', '∂/∂x', '!', 'derivada parcial'), E('matriz', '[ ]', '@', 'matriz 2×2: «|» columna nueva, «;» fila nueva'),
    E('fraccion', 'a/b', '/', 'fracción: numerador → denominador'), E('raiz', '√', '\\', 'raíz cuadrada'), E('potencia', 'xⁿ', '^', 'potencia: base → exponente'), E('subindice', 'x₁', '_', 'subíndice'),
    S('alpha', 'α', 'alfa'), S('beta', 'β', 'beta'), S('gamma', 'γ', 'gamma'), S('delta', 'δ', 'delta'), S('epsilon', 'ε', 'épsilon'), S('zeta', 'ζ', 'zeta'), S('eta', 'η', 'eta'), S('theta', 'θ', 'theta'),
    S('lambda', 'λ', 'lambda'), S('mu', 'μ', 'mu'), S('nu', 'ν', 'nu (Poisson)'), S('xi', 'ξ', 'xi'), S('pi', 'π', 'pi'), S('rho', 'ρ', 'rho'), S('sigma', 'σ', 'sigma'), S('tau', 'τ', 'tau'), S('phi', 'φ', 'phi'),
    S('chi', 'χ', 'chi'), S('psi', 'ψ', 'psi'), S('omega', 'ω', 'omega'), S('Gamma', 'Γ', 'Gamma mayúscula'), S('Delta', 'Δ', 'Delta mayúscula'), S('Theta', 'Θ', 'Theta mayúscula'), S('Lambda', 'Λ', 'Lambda mayúscula'),
    S('Sigma', 'Σ', 'Sigma mayúscula'), S('Phi', 'Φ', 'Phi mayúscula'), S('Psi', 'Ψ', 'Psi mayúscula'), S('Omega', 'Ω', 'Omega mayúscula'),
    S('infinito', '∞', 'infinito'), S('grados', '°', 'grado'), S('menorigual', '≤', 'menor o igual'), S('mayorigual', '≥', 'mayor o igual'), S('distinto', '≠', 'distinto'), S('flecha', '→', 'flecha (resultado simbólico)'), S('implica', '⇒', 'implica'),
    F('sin', 'seno'), F('cos', 'coseno'), F('tan', 'tangente'), F('asin', 'arcoseno'), F('acos', 'arcocoseno'), F('atan', 'arcotangente'), F('atan2', 'arcotangente de dos argumentos: atan2(y, x)'),
    F('sinh', 'seno hiperbólico'), F('cosh', 'coseno hiperbólico'), F('tanh', 'tangente hiperbólica'), F('exp', 'exponencial'), F('ln', 'logaritmo natural'), F('log', 'logaritmo decimal'), F('sqrt', 'raíz cuadrada'),
    F('abs', 'valor absoluto'), F('floor', 'parte entera hacia abajo'), F('ceil', 'entero hacia arriba'), F('round', 'redondear'), F('sign', 'signo'), F('min', 'mínimo'), F('max', 'máximo'),
    F('diff', 'derivada simbólica: diff(f, x)  ·  diff(f, x, 2)'), F('limit', 'límite: limit(f, x, a)'), F('solve', 'despeja: solve(a*x + b == c, x)'),
    F('dsolve', 'ecuación diferencial: dsolve(diff(y,x,2) + 4*y == 0, y, x)'), F('expand', 'desarrolla una expresión'), F('simplify', 'simplifica una expresión'), F('factor', 'factoriza un polinomio'), F('taylor', 'serie de Taylor'),
    F('fplot', 'curvas de x: fplot(f1, f2, …, [a, b])'), F('friemann', 'integral de Riemann con n rectángulos: friemann(f, a, b, n [, tipo])  tipo 0 izquierda · 1 centro · 2 derecha'), F('fgauss', 'cuadratura de Gauss con n puntos: fgauss(f, a, b, n)'), F('fgauss2d', 'cuadratura de Gauss en 2D: fgauss2d(n [, forma])'), F('gausspts', 'puntos y pesos de Gauss–Legendre en [−1, 1]: gausspts(n) → matriz n×2'), F('fvolumen', 'escena 3D: sólido bajo f(x,y): fvolumen(f, x0, x1, y0, y1, n)  (n=0 sólido exacto)'), F('fvoxeles', 'escena 3D: triple integral de 1 como cubitos: fvoxeles(f, x0, x1, y0, y1, n, m)'), F('fmapa', 'mapa de color: fmapa(f(x,y), [x0,x1], [y0,y1])'), F('fsuperficie', 'superficie 3D: fsuperficie(f(x,y), [x0,x1], [y0,y1], az, el)'),
    F('zeros', 'matriz de ceros: zeros(filas, columnas)'), F('ones', 'matriz de unos: ones(filas, columnas)'), F('transpose', 'transpuesta de una matriz'), F('lsolve', 'resuelve K·u = F: lsolve(K, F)'),
    F('sum', 'suma de los elementos'), F('col', 'columna j de una matriz: col(M, j)'), F('size', 'tamaño [filas, columnas]'),
    P('for', 'bucle for i = 1..n'), P('while', 'bucle while'), P('if', 'condición if'), P('else', 'si no'), P('end', 'cierra el bloque'),
  ];
  const LISP = [
    F('linea', '(linea \'(x1 y1) \'(x2 y2) :color 1)'), F('rect', '(rect \'(x y) ancho alto)'), F('circulo', '(circulo \'(x y) radio)'), F('arco', '(arco \'(x y) radio ang1 ang2)   ángulos en grados'),
    F('polilinea', '(polilinea \'((x1 y1) (x2 y2) …))'), F('curva', '(curva (lambda (x) …) a b :n 100)'), F('achurado', '(achurado \'((x y) …) :patron "ANSI31")'), F('texto', '(texto \'(x y) "texto" :altura 0.3)'),
    F('cota', '(cota \'(x1 y1) \'(x2 y2) :sep -0.3 :texto "L = 4")'), F('capa', '(capa "NOMBRE" :color 5)'), F('caja', '(caja \'(x y z) dx dy dz)'), F('entmake', 'crea una entidad desde su lista DXF'),
    F('entget', 'lista DXF de una entidad'), F('entlast', 'última entidad creada'), F('entnext', 'siguiente entidad'), F('entdel', 'borra una entidad'), F('ssget', 'conjunto de selección'),
    F('setq', 'asigna: (setq x 5)'), F('defun', 'define una función: (defun nombre (args) …)'), F('lambda', 'función anónima'), F('foreach', '(foreach x lista …)'), F('repeat', '(repeat n …)'), F('list', 'crea una lista'), F('cons', 'agrega al inicio'),
    F('car', 'primer elemento'), F('cdr', 'resto de la lista'), F('assoc', 'busca en lista de pares'), F('mapcar', 'aplica una función a cada elemento'), F('sqrt', 'raíz cuadrada'), F('sin', 'seno'), F('cos', 'coseno'),
  ];

  LISP.forEach((x) => { x.lisp = true; });

  // ---------------------------------------------------------------- qué se ofrece para lo escrito
  function sugerencias(pref, base) {
    if (!pref || pref.length < 2) return [];
    const todas = base.slice(), tiene = (p) => todas.some((s) => s.p === p), en = HK.entorno;
    if (en && base === FIJAS) {
      Object.keys(en.f || {}).forEach((k) => { if (!tiene(k)) todas.push({ p: k, t: 'funcion', ic: 'ƒ', d: 'función de la hoja' }); });
      Object.keys(en.v || {}).concat(Object.keys(en.l || {})).forEach((k) => { if (!tiene(k) && /^[A-Za-z]\w*$/.test(k)) todas.push({ p: k, t: 'variable', ic: 'x', d: 'variable de la hoja' }); });
    }
    const q = pref.toLowerCase(), min = (s) => s.p.toLowerCase();
    const exacta = todas.filter((s) => s.p === pref && s.t !== 'funcion' && s.t !== 'variable');          // ya escribió la palabra entera: se ofrece convertirla
    const ini = todas.filter((s) => min(s).startsWith(q) && s.p !== pref), otros = todas.filter((s) => !min(s).startsWith(q) && min(s).includes(q) && s.p.length > 3);
    return exacta.concat(ini, otros).slice(0, 8);
  }

  // ---------------------------------------------------------------- la lista desplegable
  let el = null, lista = [], sel = 0, aplicar = null;
  const CAT = { estructura: 'Estructura', simbolo: 'Símbolo', funcion: 'Función', variable: 'Variable de la hoja', palabra: 'Palabra del programa' };
  function oculta() { if (el) { el.remove(); el = null; } lista = []; aplicar = null; }
  function pinta() {
    if (!el) { el = document.createElement('div'); el.className = 'sug'; document.body.appendChild(el); }
    el.innerHTML = '<ul>' + lista.map((s, i) => '<li class="' + (i === sel ? 'sel' : '') + '" data-i="' + i + '"><span class="ic">' + s.ic + '</span><span class="p">' + s.p + (s.t === 'funcion' && !s.lisp ? '( )' : '') + '</span></li>').join('') + '</ul>' +
      '<div class="det"><b>' + lista[sel].p + '</b> <i>' + CAT[lista[sel].t] + '</i><div>' + lista[sel].d + '</div><small>Tab inserta · Esc cierra</small></div>';
  }
  function muestra(l, x, y, fn) {
    lista = l; sel = 0; aplicar = fn; pinta();
    el.style.left = Math.max(4, Math.min(x, G.innerWidth - el.offsetWidth - 6)) + 'px';
    const alto = el.offsetHeight; el.style.top = (y + alto > G.innerHeight - 6 ? Math.max(4, y - alto - 22) : y) + 'px';
    el.onmousedown = (e) => { e.preventDefault(); const li = e.target.closest('li'); if (li) { const s = lista[+li.dataset.i]; const f = aplicar; oculta(); f(s); } };
    el.onmousemove = (e) => { const li = e.target.closest('li'); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; pinta(); } };
  }

  // ---------------------------------------------------------------- en una ecuación (nodos)
  function actualiza(ed) {
    if (!ed || !ed.palabraAntes) { oculta(); return; }
    const w = ed.palabraAntes(); if (!w || w.texto.length < 2) { oculta(); return; }
    const l = sugerencias(w.texto, FIJAS); if (!l.length) { oculta(); return; }
    const s = ed.lugar(), r = ed.canvas.getBoundingClientRect(), k = ed.canvas.offsetWidth ? r.width / ed.canvas.offsetWidth : 1;
    muestra(l, r.left + s.x * k - 6, r.top + (s.y + s.d) * k + 8, (sg) => ed.aplicaSug(sg));
  }
  // teclas con la lista abierta: devuelve true si las atendió
  function tecla(e) {
    if (!el) return false;
    if (e.ctrlKey || e.altKey || e.metaKey) { oculta(); return false; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { sel = (sel + (e.key === 'ArrowDown' ? 1 : lista.length - 1)) % lista.length; pinta(); return true; }
    if (e.key === 'Tab' && !e.shiftKey) { const s = lista[sel], f = aplicar; oculta(); f(s); return true; }
    if (e.key === 'Escape') { oculta(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- en el código AutoLISP del bloque CAD (textarea)
  function enTextarea(ta) {
    const i = ta.selectionStart, ant = ta.value.slice(0, i), m = /[A-Za-z][A-Za-z0-9-]*$/.exec(ant);
    if (!m || ta.selectionEnd !== i || !/(^|[\s('])[A-Za-z][A-Za-z0-9-]*$/.test(ant) || m[0].length < 2) { oculta(); return; }
    const l = sugerencias(m[0], LISP); if (!l.length) { oculta(); return; }
    const cs = getComputedStyle(ta), c = document.createElement('canvas').getContext('2d'); c.font = cs.font; const cw = c.measureText('M').width, lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
    const lineas = ant.split('\n'), col = lineas[lineas.length - 1].length - m[0].length, r = ta.getBoundingClientRect();
    muestra(l, r.left + 8 + col * cw, r.top + 4 + lineas.length * lh - ta.scrollTop + 2, (sg) => {
      ta.setRangeText(sg.p, i - m[0].length, i, 'end'); ta.dispatchEvent(new Event('input')); ta.focus();
    });
  }
  document.addEventListener('mousedown', (e) => { if (el && !el.contains(e.target)) oculta(); });
  G.addEventListener('blur', oculta); document.addEventListener('scroll', oculta, true);
  HK.sug = { actualiza, tecla, oculta, enTextarea, visible: () => !!el, FIJAS };
})(window);
