// Hekatan Math Studio Web — la ventana: menú, cinta con pestañas (como la de WPF), hoja de papel con páginas y barra de estado
(function (G) {
  const HK = G.HK, H = () => HK.hoja, $ = (id) => document.getElementById(id);
  const estado = (t) => { $('msg').textContent = t; };

  // ---------------------------------------------------------------- cinta
  const G_ = (txt) => ({ ic: txt, t: txt, tip: 'Insertar ' + txt, acc: () => H().escribe(txt) });
  const CINTA = {
    'Matemática': [
      { ic: '<span style="font-size:17px;font-style:italic">a/b</span>', t: 'Fracción', acc: () => H().escribe('/') },
      { ic: '<span style="font-size:17px;font-style:italic">a⁄b</span>', t: 'Var. fracción', tip: 'Fracción diagonal a⁄b (numerador arriba, barra inclinada, denominador abajo)', acc: () => H().fracVar() },
      { ic: '<span style="font-size:13px">x̂ x̄ ∂</span>', t: 'Tokens ▾', tip: 'Sombrero, barra, derivada parcial y otros signos', acc: () => menuTokens() },
      { ic: '√', t: 'Raíz', acc: () => H().escribe('\\') },
      { ic: 'x<sup style="font-size:13px">2</sup>', t: 'Potencia', acc: () => H().escribe('^') },
      { ic: '<span style="font-size:15px">x≔</span>', t: 'Definir', tip: 'Definir: x = … (tecla :)', acc: () => H().escribe(':') },
      { ic: 'A', t: 'Bloque de texto', acc: () => H().nuevoTxt() },
      { ic: 'ƒ', t: 'Fórmula en texto', tip: 'Fórmula SOLO notación (Ctrl+M): se dibuja, no calcula ni define nada', acc: () => H().eqEnTexto(2) },
      { ic: '→', t: 'Simbólica en texto', tip: 'Operación SIMBÓLICA (Ctrl+Mayús+M): el = pide el resultado simbólico, con flecha →', acc: () => H().eqEnTexto(1) },
      { ic: '=', t: 'Numérica en texto', tip: 'Operación NUMÉRICA (Ctrl+Mayús+E): el = calcula el valor', acc: () => H().eqEnTexto(0) },
      { ic: '∑=', t: 'Ecuación', acc: () => H().nuevaEq('') },
      { ic: '⇥', t: 'Misma línea', acc: () => H().nuevaEq('', true) },
      { ic: '↓', t: 'Al final', acc: () => { const a = $('area'); a.scrollTop = a.scrollHeight; } },
      { ic: 'fx', t: 'Ejemplo', acc: () => { H().nuevaEq('f(x) = x^2/2 + 1'); H().nuevaEq('f(3) ='); } },
      'tam',
    ],
    'Cálculo': [
      { ic: '∫', t: 'Integral', tip: 'Integral definida: límite inferior, superior, función y variable (Espacio pasa al hueco siguiente)', acc: () => H().escribe('$') },
      { ic: 'Σ', t: 'Suma', tip: 'Sumatoria: i = 1 hasta n y el término', acc: () => H().escribe('#') },
      { ic: 'lim', t: 'Límite', tip: 'Límite: variable, punto al que tiende y función (o escribe lim y espacio)', acc: () => H().escribe('lim~') },
      { ic: 'T(x)', t: 'Serie', tip: 'Serie de Taylor: variable, punto, orden y función (o escribe serie y espacio)', acc: () => H().escribe('serie~') },
      { ic: '<span style="font-size:15px">d/dx</span>', t: 'Derivada', tip: 'Derivada ordinaria d/dx (otra vez «?» sube el orden)', acc: () => H().escribe('?') },
      { ic: '∂/∂x', t: 'Parcial', tip: 'Derivada parcial', acc: () => H().escribe('!') },
      { ic: 'K·u', t: 'Resolver K·u=F', tip: 'u = lsolve(K, F)', acc: () => H().escribe('lsolve(') },
      'sep',
      { ic: '[ , ; ]', t: 'Matriz [ ]', tip: 'Matriz: [1,2;3,4]   (; separa filas)', acc: () => H().escribe('[') },
      { ic: '[ ]', t: 'Matriz vacía', tip: 'Matriz 2×2 (; fila nueva · | columna nueva)', acc: () => H().escribe('@') },
      { ic: '[ → ]', t: 'Vector fila', tip: 'Vector fila de 3 elementos', acc: () => H().insertaMat(1, 3) },
      { ic: '[ ↓ ]', t: 'Vector columna', tip: 'Vector columna de 3 elementos', acc: () => H().insertaMat(3, 1) },
      'sep',
      { ic: '⇒', t: 'Implica', tip: 'Implica (teclas =>)', acc: () => H().escribe('⇒') },
      { ic: '→', t: 'Tiende a', tip: 'Flecha: resultado simbólico (teclas ->)', acc: () => H().escribe('→') },
      { ic: '⇔', t: 'Equivale', tip: 'Equivale (teclas <=>)', acc: () => H().escribe('⇔') },
      { ic: '≔', t: 'Definir', tip: 'Definir: x = … (tecla :)', acc: () => H().escribe(':') },
      { ic: '=', t: 'Evaluar', tip: 'x =   muestra el valor', acc: () => H().escribe('=') },
      { ic: '＝', t: 'Ecuación', tip: 'x^2 == 9', acc: () => H().escribe('==') },
      'sep',
      { ic: 'x=', t: 'Despejar', tip: 'solve(a*x + b == c, x)', acc: () => H().escribe('solve(') },
      { ic: 'Σ', t: 'Simplificar', tip: 'simplify(expr)', acc: () => H().escribe('simplify(') },
      { ic: '0', t: 'zeros', acc: () => H().escribe('zeros(') },
      { ic: 'Aᵀ', t: 'Transpuesta', acc: () => H().escribe('transpose(') },
    ],
    'Insertar': [
      { ic: '📂', t: 'Abrir .hmath', tip: 'Abrir una hoja .hmath (Ctrl+O)', acc: () => $('archivo').click() },
      { ic: '💾', t: 'Guardar', tip: 'Guardar la hoja como .hmath (Ctrl+S)', acc: () => guarda() },
      { ic: '💾', t: 'Guardar como', tip: 'Guardar con otro nombre', acc: () => guardaComo() },
      'ejemplos',
      { ic: '📐', t: 'Plantillas', off: 'Plantillas (vigas, losas, ménsulas…): disponible en la versión de escritorio' },
      { ic: '▦', t: 'Tabla Excel', off: 'Tabla Excel: disponible en la versión de escritorio' },
      { ic: '📂', t: 'Abrir .mcdx', off: 'Abrir .mcdx de Mathcad: disponible en la versión de escritorio' },
      { ic: '🗑', t: 'Limpiar', tip: 'Borra toda la hoja', acc: () => { if (confirm('¿Borrar toda la hoja?')) nuevo(); } },
      { ic: 'W', t: 'Word', off: 'Exportar a Word: disponible en la versión de escritorio' },
      { ic: 'PDF', t: 'PDF', tip: 'Páginas A4 tal como se ve la hoja', acc: () => G.print() },
      { ic: 'M', t: 'Abrir en Mathcad', off: 'Abrir en Mathcad: disponible en la versión de escritorio' },
      'sep',
      { ic: '📄', t: 'Hoja nueva', acc: () => nuevo() },
      { ic: '𝑥', t: 'Deslizador', tip: 'Una variable con barra y ▶ (anima las gráficas)', acc: () => H().nuevoSlider() },
    ],
    'Gráficos': [
      { ic: '▦', t: 'malla5', off: 'malla5: campo del talud de GEO5, disponible en la versión de escritorio' },
      { ic: '◔', t: 'dovelas', off: 'dovelas: talud con círculos críticos, disponible en la versión de escritorio' },
      { ic: '📉', t: 'convergencia', off: 'convergencia: disponible en la versión de escritorio' },
      { ic: '≣', t: 'iteraciones', off: 'iteraciones: disponible en la versión de escritorio' },
      { ic: '☰', t: 'escalera', off: 'escalera: disponible en la versión de escritorio' },
      { ic: '▨', t: 'mapa', tip: 'fmapa(f(x,y), [x0,x1], [y0,y1])   mapa de color', acc: () => H().escribe('fmapa(') },
      { ic: '◪', t: 'superficie', tip: 'fsuperficie(f(x,y), [x0,x1], [y0,y1], az, el)   superficie 3D', acc: () => H().escribe('fsuperficie(') },
      { ic: '∿', t: 'curvas', tip: 'fplot(f1, f2, …, [a, b])   curvas con ejes y leyenda', acc: () => H().escribe('fplot(') },
      { ic: '▥', t: 'modelo', off: 'modelo: malla y apoyos de una placa, disponible en la versión de escritorio' },
      'sep',
      { ic: '⬡', t: 'Malla 3D', off: 'malla3d: próximamente en la web' },
      { ic: '𝑥', t: 'Deslizador', acc: () => H().nuevoSlider() },
    ],
    'CAD': [
      { ic: '✏️', t: 'Dibujar', tip: 'La MISMA ventana de dibujo de Hekatan LISP (Línea/Polilínea/…/Mover/Recortar/3DPol/SCP, línea Orden:, refent); «Guardar en la hoja» crea el bloque CAD', acc: () => HK.cadReal.abre() },
      { ic: '✏️', t: 'Dibujar (simple)', tip: 'Editor simplificado anterior (respaldo)', acc: () => HK.cadEditor.abre() },
      { ic: '✎', t: 'Dibujo nuevo', tip: 'Bloque CAD con código AutoLISP: cada botón de al lado le agrega una entidad', acc: () => H().nuevoCad() },
      'sep',
      { ic: '／', t: 'Línea', tip: HK.cad.PRIM['Línea'], acc: () => H().cadAgrega(HK.cad.PRIM['Línea']) },
      { ic: '▭', t: 'Rectángulo', tip: HK.cad.PRIM['Rectángulo'], acc: () => H().cadAgrega(HK.cad.PRIM['Rectángulo']) },
      { ic: '○', t: 'Círculo', tip: HK.cad.PRIM['Círculo'], acc: () => H().cadAgrega(HK.cad.PRIM['Círculo']) },
      { ic: '◠', t: 'Arco', tip: HK.cad.PRIM['Arco'], acc: () => H().cadAgrega(HK.cad.PRIM['Arco']) },
      { ic: '⌇', t: 'Polilínea', tip: HK.cad.PRIM['Polilínea'], acc: () => H().cadAgrega(HK.cad.PRIM['Polilínea']) },
      { ic: '∿', t: 'Curva', tip: HK.cad.PRIM['Curva'], acc: () => H().cadAgrega(HK.cad.PRIM['Curva']) },
      { ic: '▨', t: 'Achurado', tip: HK.cad.PRIM['Achurado'], acc: () => H().cadAgrega(HK.cad.PRIM['Achurado']) },
      { ic: 'A', t: 'Texto', tip: HK.cad.PRIM['Texto'], acc: () => H().cadAgrega(HK.cad.PRIM['Texto']) },
      { ic: '↔', t: 'Cota', tip: HK.cad.PRIM['Cota'], acc: () => H().cadAgrega(HK.cad.PRIM['Cota']) },
      { ic: '<b>━</b>', t: 'Trazo gruesa', tip: 'Grosor de trazo GRUESO (1,0 mm) para lo que dibujes después: (peso "gruesa")', acc: () => H().cadAgrega(HK.cad.PRIM['Gruesa']) },
      { ic: '<span style="font-weight:600">─</span>', t: 'Trazo media', tip: 'Grosor de trazo MEDIO (0,5 mm): (peso "media")', acc: () => H().cadAgrega(HK.cad.PRIM['Media']) },
      { ic: '<span style="font-weight:100">─</span>', t: 'Trazo fina', tip: 'Grosor de trazo FINO (0,25 mm): (peso "fina")', acc: () => H().cadAgrega(HK.cad.PRIM['Fina']) },
      { ic: '≡', t: 'Capa', tip: HK.cad.PRIM['Capa'], acc: () => H().cadAgrega(HK.cad.PRIM['Capa']) },
      'sep',
      { ic: 'LSP', t: 'Exportar AutoLISP', tip: 'Baja el último dibujo como dibujo.lsp (entmake): en AutoCAD, APPLOAD y escribir HKDIBUJO', acc: () => { if (!H().cadExporta('lsp')) estado('No hay ningún dibujo CAD en la hoja'); } },
      { ic: 'DWG', t: 'Exportar DWG', tip: 'Guarda el último dibujo como dibujo.dwg (AutoCAD 2018), igual que el botón DWG del WPF', acc: () => { if (!H().cadExporta('dwg')) estado('No hay ningún dibujo CAD en la hoja'); } },
      { ic: 'DXF', t: 'Exportar DXF', tip: 'Baja el último dibujo como dibujo.dxf', acc: () => { if (!H().cadExporta('dxf')) estado('No hay ningún dibujo CAD en la hoja'); } },
      { ic: '🗂', t: 'Hekatan CAD', tip: 'Tu CAD viewer (abrir y revisar DWG, medir, órbita 3D, compartir) en una pestaña nueva. Si hay un dibujo en la hoja, antes baja su DWG para abrirlo allí', acc: () => { if (H().cadExporta('dwg')) estado('DWG del dibujo bajado: ábrelo en Hekatan CAD (pestaña nueva)'); else estado('Hekatan CAD abierto en otra pestaña'); G.open('https://dwg-web-viewer.pages.dev/', '_blank'); } },
      { ic: 'DXF', t: 'Importar DXF', tip: 'Trae a un bloque «Dibujar» de la hoja un .dxf de Hekatan CAD (el visor lo baja con «Exportar DXF»): LINE, CIRCLE, ARC, LWPOLYLINE, TEXT, POINT', acc: () => HK.cadImporta.elige() },
    ],
    'Símbolos': 'simbolos',
    'Vista': [
      { ic: '▦', t: 'Cuadrícula', acc: () => cuadricula() },
      { ic: 'A+', t: 'Texto +', acc: () => setTxt(+1) },
      { ic: 'A−', t: 'Texto −', acc: () => setTxt(-1) },
    ],
  };
  const PESTANAS = ['Matemática', 'Cálculo', 'Insertar', 'Capturar', 'Gráficos', 'Formato', 'Símbolos', 'CAD', 'Diapositivas', 'Word', 'Disposición', 'Fuente', 'Revisar', 'Vista', 'Texto', 'Formato matemático'];
  let txtPt = 13, eqPt = 14, sincro = true;
  function setTxt(d) { txtPt = Math.max(8, Math.min(28, typeof d === 'number' && Math.abs(d) <= 1 && d !== 0 ? txtPt + d : d)); document.documentElement.style.setProperty('--txtpx', txtPt + 'px'); const s = document.getElementById('sel-txt'); if (s) s.value = txtPt; pagina(); }
  function setEq(d) { eqPt = Math.max(8, Math.min(30, typeof d === 'number' && Math.abs(d) <= 1 && d !== 0 ? eqPt + d : d)); H().reg.forEach((r) => { if (r.t === 'eq') r.ed.tam = eqPt; }); const s = document.getElementById('sel-eq'); if (s) s.value = eqPt; H().resolver(); pagina(); }
  function boton(b) {
    const e = document.createElement('button'); e.className = 'bt'; e.innerHTML = '<span class="ic">' + b.ic + '</span><span>' + b.t + '</span>';
    e.title = b.off || b.tip || b.t; if (b.off) e.disabled = true; else e.onclick = () => { const antes = $('msg').textContent; b.acc(); if ($('msg').textContent === antes) estado(b.tip || b.t); };          // si la acción dejó su propio mensaje en la barra, se respeta
    e.addEventListener('mousedown', (ev) => ev.preventDefault());          // no le quita el foco a la ecuación
    return e;
  }
  function grupoTam(titulo, id, vals, ini, fn, menos, mas) {
    const g = document.createElement('div'); g.className = 'grupo-t'; g.innerHTML = '<span>' + titulo + '</span><div class="fil"></div>';
    const f = g.querySelector('.fil'), a = document.createElement('button'), s = document.createElement('select'), b = document.createElement('button');
    a.textContent = menos; b.textContent = mas; s.id = id; vals.forEach((v) => { const o = document.createElement('option'); o.value = v; o.textContent = v; s.appendChild(o); }); s.value = ini;
    a.onclick = () => fn(-1); b.onclick = () => fn(+1); s.onchange = () => fn(parseInt(s.value, 10));
    [a, b].forEach((x) => x.addEventListener('mousedown', (ev) => ev.preventDefault())); f.append(a, s, b); return g;
  }
  const TOKENS = [['x̂', '\u0302', 'Sombrero'], ['x̄', '\u0304', 'Barra'], ['ẋ', '\u0307', 'Punto (derivada en el tiempo)'], ['ẍ', '\u0308', 'Dos puntos'], ['∂', '∂', 'Derivada parcial'], ['∇', '∇', 'Nabla'], ['Δ', 'Δ', 'Delta'], ['∞', '∞', 'Infinito'], ['°', '°', 'Grado'], ['′', '′', 'Prima'], ['″', '″', 'Doble prima'], ['≈', '≈', 'Aproximado'], ['∝', '∝', 'Proporcional'], ['∈', '∈', 'Pertenece'], ['∀', '∀', 'Para todo'], ['∃', '∃', 'Existe']];
  function menuTokens() {
    document.querySelectorAll('.ctx-tokens').forEach((x) => x.remove());
    const b = [...document.querySelectorAll('#cinta .bt')].find((x) => /Tokens/.test(x.textContent)), r = b.getBoundingClientRect(), m = document.createElement('div'); m.className = 'ctx ctx-tokens'; m.style.left = r.left + 'px'; m.style.top = (r.bottom + 2) + 'px';
    TOKENS.forEach(([ic, tk, tip]) => { const e = document.createElement('button'); e.innerHTML = '<span style="display:inline-block;width:26px;font-size:16px">' + ic + '</span>' + tip; e.onmousedown = (ev) => ev.preventDefault(); e.onclick = () => { H().escribe(tk); m.remove(); estado(tip); }; m.appendChild(e); });
    document.body.appendChild(m); const cierra = (ev) => { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('mousedown', cierra, true); } }; setTimeout(() => document.addEventListener('mousedown', cierra, true), 0);
  }
  function pintaCinta(nombre) {
    const c = $('cinta'); c.innerHTML = ''; const def = CINTA[nombre];
    [...$('pestanas').children].forEach((p) => p.classList.toggle('sel', p.textContent === nombre));
    if (!def) { const a = document.createElement('div'); a.className = 'aviso-t'; a.textContent = '«' + nombre + '»: disponible en la versión de escritorio de Hekatan Math Studio (WPF); en la web, próximamente.'; c.appendChild(a); return; }
    if (def === 'simbolos') {
      const est = [['∫', 'Integral', '$', 'Integral definida: límite inferior, superior, función y variable (Espacio pasa al hueco siguiente)'], ['∑', 'Sumatoria', '#', 'Sumatoria: i = 1 hasta n y el término'], ['∏', 'Productoria', '%', 'Productoria'],
        ['d/dx', 'Derivada', '?', 'Derivada ordinaria d/dx'], ['∂/∂x', 'Parcial', '!', 'Derivada parcial'], ['[ ]', 'Matriz', '@', 'Matriz 2×2 (; fila nueva · | columna nueva)'], ['x₁', 'Subíndice', '_', 'Subíndice'],
        ['lim', 'Límite', 'limit(', 'Límite: limit(f, x, a)'], ['Σxⁿ', 'Serie', 'taylor(', 'Serie de Taylor: taylor(f, x, a, n)']];
      est.forEach(([ic, t, k, tip]) => c.appendChild(boton({ ic, t, tip, acc: () => H().escribe(k) })));
      [['Si', 'Condición', 'si', 'Bloque «si»: condición y lo que se calcula si se cumple'], ['Para', 'Repetir', 'para', 'Bucle «para»: variable, rango y cuerpo'], ['Mient.', 'Mientras', 'mientras', 'Bucle «mientras»: condición y cuerpo'],
        ['{ }', 'Programa', 'prog', 'Bloque de programa con varias líneas'], ['↵', 'Devolver', 'devolver', 'Devuelve un valor desde un programa']].forEach(([ic, t, k, tip]) => c.appendChild(boton({ ic, t, tip, acc: () => H().bloque(k) })));
      const g = document.createElement('div'); g.className = 'grupo-t'; g.innerHTML = '<span>Letras griegas y signos</span><div class="fil" style="display:flex;flex-wrap:wrap;width:520px;max-width:520px;gap:0"></div>'; const f = g.querySelector('.fil');
      'α β γ δ ε ζ η θ λ μ ν ξ π ρ σ τ φ χ ψ ω Δ Γ Θ Λ Σ Φ Ω ∞ ≤ ≥ ≠ ± · ° ′ ∇'.split(' ').forEach((s) => { const b = boton({ ic: s, t: ' ', tip: 'Insertar ' + s, acc: () => H().escribe(s) }); b.style.cssText = 'width:25px;height:26px;min-width:0;padding:0;margin:1px 0'; b.firstChild.style.fontSize = '15px'; f.appendChild(b); });
      c.appendChild(g); return;
    }
    def.forEach((b) => {
      if (b === 'sep') { const s = document.createElement('div'); s.className = 'sep'; c.appendChild(s); }
      else if (b === 'tam') {
        const s = document.createElement('div'); s.className = 'sep'; c.appendChild(s);
        c.appendChild(grupoTam('Texto', 'sel-txt', [8, 9, 10, 11, 12, 13, 14, 16, 18, 20], txtPt, (d) => { const a0 = txtPt; setTxt(d); if (sincro && a0 !== txtPt) { setEq(Math.round(eqPt * txtPt / a0)); const q = $('sel-eq'); if (q) q.value = eqPt; } }, 'A−', 'A+'));
        c.appendChild(grupoTam('Variables', 'sel-eq', [10, 12, 13, 14, 15, 16, 18, 20, 24], eqPt, (d) => { const a0 = eqPt; setEq(d); if (sincro && a0 !== eqPt) { setTxt(Math.round(txtPt * eqPt / a0)); const q = $('sel-txt'); if (q) q.value = txtPt; } }, 'x−', 'x+'));
        const tg = (t, tip, on, fn) => { const e = boton({ ic: '', t, tip, acc: () => {} }); e.className = 'bt'; e.querySelector('.ic').style.display = 'none'; e.style.minWidth = '90px'; e.style.alignSelf = 'center'; e.classList.toggle('activa', on()); e.onclick = () => { fn(); e.classList.toggle('activa', on()); }; return e; };
        c.appendChild(tg('▦ Cuadrícula', 'Hoja cuadriculada como Mathcad', () => document.body.classList.contains('cuad'), cuadricula));
        c.appendChild(tg('🔗 Sincronizar', 'Texto y variables se achican / agrandan juntos, en la misma proporción', () => sincro, () => { sincro = !sincro; }));
      } else if (b === 'fuente') { c.appendChild(selectCinta('Fuente', FUENTES, 'Times New Roman', (v) => cmd('fontName', v), 130));
      } else if (b === 'tamtxt') { c.appendChild(selectCinta('Tamaño', ['8', '9', '10', '11', '12', '14', '16', '18', '24'], '12', (v) => tamSel(parseInt(v, 10)), 60));
      } else if (b === 'casos') { c.appendChild(menuLista('Mayús./minús.', CASOS));
      } else if (b === 'papelsel') { c.appendChild(selectCinta('Tamaño del papel', Object.keys(PAPELES), papelNom, (v) => { papelNom = v; aplicaPagina(); }, 100));
      } else if (b === 'apa') { c.appendChild(selectCinta('Formato del documento', Object.keys(ESTILOS_DOC), 'Normas APA 7 — Times New Roman 12 pt', formatoDoc, 300));
      } else if (b === 'fvar' || b === 'fnum') { const k = b === 'fvar' ? 'v' : 'n'; c.appendChild(selectCinta(b === 'fvar' ? 'Letra de variables' : 'Letra de cifras', ['Georgia', 'Cambria', 'Cambria Math', 'Times New Roman', 'Segoe UI', 'Calibri', 'Arial', 'Consolas'], HK.fuentes[k], (v) => { HK.fuentes[k] = v; H().resolver(); H().redibuja(); estado((k === 'v' ? 'Letra de las variables: ' : 'Letra de las cifras: ') + v); }, 130));
      } else if (b === 'cifras') { c.appendChild(selectCinta('Cifras', ['3', '4', '5', '6', '7', '8', '10'], String(HK.cifras || 6), (v) => { HK.cifras = parseInt(v, 10); H().resolver(); H().reg.forEach((r) => { if (r.t === 'eq') r.ed.dibuja(); }); estado('Resultados con ' + v + ' cifras'); }, 60));
      } else if (b === 'zoomsel') {
        const g = document.createElement('div'); g.className = 'grupo-t'; g.innerHTML = '<span>Zoom</span><div class="fil"></div>'; const q = document.createElement('select'); q.id = 'sel-zoom';
        const pc = Math.round(zoom * 100); const vals = [50, 75, 100, 125, 150, 200]; if (!vals.includes(pc)) vals.push(pc); vals.sort((a, b2) => a - b2);
        vals.forEach((v) => { const o = document.createElement('option'); o.value = v; o.textContent = v + ' %'; q.appendChild(o); }); q.value = String(pc);
        q.onchange = () => ponZoom(parseInt(q.value, 10) / 100); g.querySelector('.fil').appendChild(q); c.appendChild(g);
      } else if (b === 'ejemplos') {
        const g = document.createElement('div'); g.className = 'grupo-t'; g.innerHTML = '<span>Ejemplos</span>'; const s = document.createElement('select'); s.style.marginTop = '4px'; s.style.height = '28px';
        s.innerHTML = '<option>Abrir ejemplo…</option><option value="ejemplos/Funciones_de_forma.hmath">Funciones de forma</option><option value="ejemplos/Viga_deduccion.hmath">Viga: deducción</option><option value="ejemplos/Armadura_Logan_3_9.hmath">Armadura de Logan</option><option value="ejemplos/Triangulo_jacobiano.hmath">Triángulo: jacobiano</option><option value="ejemplos/Integrales_Riemann_doble_triple.hmath">Integrales: Riemann, doble y triple</option><option value="ejemplos/Placa_DKE_Wilson_formulacion_y_tablas.hmath">Placa DKE de Wilson: formulación, K y tablas (ej. 158 de Hekatan LISP)</option><option value="ejemplos/Funciones_de_forma_a_rigidez_K.hmath">23 · De las funciones de forma a la rigidez K (con gráficas)</option><option value="ejemplos/hlisp/23 De las funciones de forma a la rigidez K.lisp">Hekatan LISP · 23 De las funciones de forma a la rigidez K (.lisp)</option><option value="ejemplos/hlisp/158 Placa delgada DKE de Wilson - libro 2005 cap. 8, simbolos, K, igual a la DKQ de Batoz y tabla 8.2.lisp">Hekatan LISP · 158 Placa DKE de Wilson (.lisp)</option><option value="ejemplos/hlisp/04 Funciones de forma 1D.lisp">Hekatan LISP · 04 Funciones de forma 1D (.lisp)</option><option value="ejemplos/hlisp/13 Por que las funciones de forma - 1D y 2D.lisp">Hekatan LISP · 13 Por qué las funciones de forma (.lisp)</option><option value="ejemplos/hlisp/02 Integrales.lisp">Hekatan LISP · 02 Integrales (.lisp)</option><option value="ejemplos/Funciones_de_forma_1D_deduccion_simbolica.hmath">Funciones de forma 1D: deducción simbólica (1 GDL)</option><option value="ejemplos/Funciones_de_forma_1D_lineal.hmath">Funciones de forma 1D lineal</option><option value="ejemplos/Funciones_de_forma_1D_cuadratica.hmath">Funciones de forma 1D cuadrática</option><option value="ejemplos/Placa_Kirchhoff_BFS_losa_rectangular.hmath">Placa Kirchhoff (BFS): losa rectangular</option>';
        s.onchange = () => { if (s.value.startsWith('ejemplos')) abreEjemplo(s.value); }; g.appendChild(s); c.appendChild(g);
      } else c.appendChild(boton(b));
    });
  }
  PESTANAS.forEach((n) => { const b = document.createElement('button'); b.textContent = n; b.onclick = () => pintaCinta(n); b.addEventListener('mousedown', (ev) => ev.preventDefault()); $('pestanas').appendChild(b); });

  // ---------------------------------------------------------------- menú
  function cierra() { document.querySelectorAll('.mi.abierto').forEach((m) => m.classList.remove('abierto')); }
  document.querySelectorAll('.mi:not(.sola) > span').forEach((s) => { s.onclick = (e) => { const m = s.parentElement, ya = m.classList.contains('abierto'); cierra(); pintaRecientes(); if (!ya) m.classList.add('abierto'); e.stopPropagation(); }; });
  document.addEventListener('click', cierra);
  // Abrir reciente (como el WPF): las últimas hojas abiertas o guardadas, con su contenido, en el navegador de la persona
  const RECI = 'hk_recientes';
  function recientes() { try { const l = JSON.parse(localStorage.getItem(RECI) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function recuerda(nombre, texto) {
    if (!texto || texto.length > 600000) return;
    try { const l = recientes().filter((r) => r.n !== nombre); l.unshift({ n: nombre, t: texto }); localStorage.setItem(RECI, JSON.stringify(l.slice(0, 8))); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }
  function pintaRecientes() {
    const c = $('recientes'); if (!c) return; const l = recientes().filter((r) => r && typeof r.n === 'string' && typeof r.t !== 'undefined'); c.innerHTML = '';
    if (!l.length) { const b = document.createElement('button'); b.disabled = true; b.textContent = '(ninguno todavía)'; c.appendChild(b); return; }
    l.forEach((r) => { const b = document.createElement('button'); b.textContent = r.n; b.onclick = () => { H().abre(r.t); estado('Abierto: ' + r.n); setTimeout(pagina, 50); recuerda(r.n, r.t); }; c.appendChild(b); });
  }
  function guardaComo() { const n = prompt('Nombre del archivo', 'hoja'); if (!n) return; const nom = n.replace(/\.hmath$/i, ''); H().descarga(nom); recuerda(nom + '.hmath', H().guarda()); estado('Guardado: ' + nom + '.hmath'); }
  function guarda() { H().descarga(); recuerda('hoja.hmath', H().guarda()); }
  function nuevo() { H().limpia(); estado('Hoja nueva'); pagina(); H().nuevaEq(''); }
  const comoHmath = (nombre, t) => HK.hlisp && HK.hlisp.esHlisp(nombre, t) ? JSON.stringify(HK.hlisp.importa(t)) : t;          // .lisp / .hlisp → la misma conversión que el WPF
  async function abreEjemplo(f) { try { const t = comoHmath(f, await (await fetch(f)).text()); H().abre(t); estado('Abierto: ' + f.split('/').pop()); setTimeout(pagina, 50); } catch (e) { estado('No se pudo abrir ' + f + ' (la página debe servirse por http)'); } }
  function cuadricula() { document.body.classList.toggle('cuad'); $('m-cuadricula').classList.toggle('activa', document.body.classList.contains('cuad')); }
  $('m-cuadricula').onclick = cuadricula;
  $('m-compartir').onclick = () => { capturaPng('hoja', true); };
  // Script de Hekatan LISP: la hoja como texto (se copia, se descarga como .lisp, se edita y se vuelve a aplicar con la misma importación del WPF)
  $('m-hlisp').onclick = () => {
    let v = document.getElementById('hlisp-modal'); if (v) { v.remove(); return; }
    v = document.createElement('div'); v.id = 'hlisp-modal';
    v.innerHTML = '<div class="hl-caja"><div class="hl-bar"><b>Script Hekatan LISP</b><span class="hl-sp"></span><button data-a="cp">Copiar</button><button data-a="dl">Descargar .lisp</button><button data-a="ap">Aplicar a la hoja</button><button data-a="x">✕</button></div><textarea spellcheck="false" wrap="off"></textarea></div>';
    document.body.appendChild(v); const ta = v.querySelector('textarea'); ta.value = HK.hlisp.exporta(H().guarda());
    v.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b && e.target === v) return v.remove(); if (!b) return; const q = b.dataset.a;
      if (q === 'x') v.remove();
      else if (q === 'cp') { ta.select(); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.resolve(document.execCommand('copy'))).then(() => estado('Script copiado'), () => estado('No se pudo copiar: selecciónalo y usa Ctrl+C')); }
      else if (q === 'dl') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' })); a.download = 'hoja.lisp'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); estado('Descargado: hoja.lisp'); }
      else if (q === 'ap') { H().abre(JSON.stringify(HK.hlisp.importa(ta.value))); v.remove(); estado('Script aplicado a la hoja'); setTimeout(pagina, 50); } });
  };
  $('m-lisp').onclick = () => { G.open('https://giorgioburbanelli89.github.io/hekatan-lisp/', '_blank', 'noopener,noreferrer'); estado('Vista completa Hekatan LISP: se abre en una pestaña nueva'); };          // siempre a la vista, en la barra de arriba
  // Ejemplos: toda la carpeta ejemplos/ (ejemplos/lista.json); lo que no esté a mano en el menú se añade en «Otros ejemplos»
  fetch('ejemplos/lista.json').then((r) => r.json()).then((L) => {
    const ya = new Set([...document.querySelectorAll('button[data-ej]')].map((b) => b.dataset.ej)), faltan = L.filter((n) => !ya.has('ejemplos/' + n)); if (!faltan.length) return;
    const g = $('grp-lisp'), l = document.createElement('div'); l.className = 'lbl'; l.textContent = 'Otros ejemplos'; g.before(l);
    faltan.forEach((n) => { const b = document.createElement('button'); b.dataset.ej = 'ejemplos/' + n; b.textContent = n.replace(/\.hmath$/, '').replace(/_/g, ' '); b.addEventListener('click', () => { abreEjemplo('ejemplos/' + n); cierra(); }); g.before(b); });
  }).catch(() => {});
  // Ejemplos de Hekatan LISP: la MISMA lista que la web de Hekatan LISP (ejemplos/hlisp/lista.json), un botón por hoja
  fetch('ejemplos/hlisp/lista.json').then((r) => r.json()).then((L) => {
    const g = $('grp-lisp'); if (!g) return; g.textContent = 'Hekatan LISP (.lisp) · ' + L.length + ' ejemplos'; let ant = g;
    L.forEach((n) => { const b = document.createElement('button'); b.textContent = n.replace(/\.lisp$/, ''); b.title = n; b.addEventListener('click', () => { abreEjemplo('ejemplos/hlisp/' + n); document.querySelectorAll('.mi.abierto').forEach((m) => m.classList.remove('abierto')); }); ant.after(b); ant = b; });
  }).catch(() => { const g = $('grp-lisp'); if (g) g.textContent = 'Hekatan LISP (.lisp) · no se pudo leer la lista'; });
  document.querySelectorAll('.sub button').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.a, ej = b.dataset.ej;
    if (ej) abreEjemplo(ej); else if (a === 'nuevo') nuevo(); else if (a === 'abrir') $('archivo').click(); else if (a === 'guardar') guarda(); else if (a === 'guardarcomo') guardaComo();
    else if (a === 'txt-') setTxt(-1); else if (a === 'txt+') setTxt(+1); else if (a === 'eq-') setEq(-1); else if (a === 'eq+') setEq(+1);
  }));
  $('archivo').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const txt = comoHmath(f.name, rd.result); H().abre(txt); recuerda(f.name.replace(/\.(lisp|hlisp)$/i, '.hmath'), txt); estado('Abierto: ' + f.name); setTimeout(pagina, 50); }; rd.readAsText(f, 'utf-8'); e.target.value = ''; };
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return; const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); guarda(); } else if (k === 'o') { e.preventDefault(); $('archivo').click(); } else if (k === 'n') { e.preventDefault(); nuevo(); }
    else if (k === 'k') { e.preventDefault(); H().alternaCodigo(); } else if (k === 'h' && e.shiftKey) { e.preventDefault(); document.body.classList.toggle('ver-ocultos'); } else if (k === 'h') { e.preventDefault(); const o = H().ocultaBloque(); estado(o ? 'Bloque oculto (Ctrl+Mayús+H para verlos)' : 'Bloque visible'); }
  });

  // ---------------------------------------------------------------- páginas de 816 × 1056 (como en WPF): número arriba a la derecha
  let PGW = 816, PGH = 1056;          // tamaño de la página en px (Carta vertical por defecto); Vertical/Horizontal y Carta/A4 lo cambian
  const PG0 = () => PGH;
  // Márgenes entre páginas (como el WPF): nada se escribe en la franja del margen inferior + margen superior de la página siguiente;
  // la línea (bloque) que no cabe entera antes del margen inferior pasa, entera, al comienzo de la página siguiente.
  let enPag = false;
  function empaqueta() {
    const hoja = $('hoja'), papel = $('papel'), hijos = [...hoja.children];
    hijos.forEach((c) => { c.style.marginTop = ''; c.classList.remove('ini-pag'); });
    const vista = document.body.getAttribute('data-vista');
    if (document.body.classList.contains('sinpag') || vista === 'web' || vista === 'borrador' || vista === 'esquema') return;
    const cs = getComputedStyle(papel), mt = parseFloat(cs.paddingTop) || 96, mb = parseFloat(cs.paddingBottom) || 96, util = PGH - mt - mb;
    const nat = hijos.map((c) => ({ c, top: c.offsetTop, h: c.offsetHeight, m0: parseFloat(getComputedStyle(c).marginTop) || 0 }));
    let extra = 0;
    for (let i = 0; i < nat.length; i++) {
      const n = nat[i]; if (!n.h) continue;
      const pe = n.c.children.length === 1 ? n.c.firstElementChild : null, esTit = pe && (pe.classList.contains('titulo') || /^\s*Figura(?![A-Za-z])/.test(pe.textContent)) && nat[i + 1];          // título o leyenda «Figura…»: va con lo que sigue          // un título va siempre con lo que sigue (como el WPF): nunca queda solo al pie de la página
      const y0 = n.top + extra, y1 = esTit ? nat[i + 1].top + extra + nat[i + 1].h : y0 + n.h, k = Math.max(0, Math.floor(y0 / PGH)), ini = k * PGH + mt, fin = (k + 1) * PGH - mb;
      let d = 0;
      if (y0 < ini) d = ini - y0;                                                    // cae en el margen superior: baja al comienzo de la página
      else if (y0 >= fin || (y1 > fin + 0.5 && y1 - y0 <= util)) d = (k + 1) * PGH + mt - y0;          // cae en el margen inferior o no cabe: pasa entera a la página siguiente
      if (d > 0.5) { n.c.style.marginTop = (n.m0 + d) + 'px'; extra += d; const t0 = n.c.firstElementChild; if (t0 && t0.classList.contains('titulo')) { const a0 = parseFloat(getComputedStyle(t0).marginTop) || 0; n.c.classList.add('ini-pag'); extra += (parseFloat(getComputedStyle(t0).marginTop) || 0) - a0; } }          // un título al comienzo de página pierde su aire de arriba: lo que sigue sube lo mismo
    }
  }
  function pagina() {
    if (enPag) return; enPag = true;
    try { empaqueta(); } finally { enPag = false; }
    if ($('nav')) llenaNav();
    const papel = $('papel'), hoja = $('hoja'); papel.querySelectorAll('.pg,.corte,.marco').forEach((x) => x.remove());
    const alto = hoja.offsetHeight + 192, n = Math.max(1, Math.ceil(alto / PGH)); papel.style.minHeight = (n * PGH) + 'px';
    const cs = getComputedStyle(papel), mt = parseFloat(cs.paddingTop) || 96, mb = parseFloat(cs.paddingBottom) || 96, ml = parseFloat(cs.paddingLeft) || 96, mr = parseFloat(cs.paddingRight) || 96;
    for (let k = 0; k < n; k++) {
      const m = document.createElement('div'); m.className = 'marco'; m.style.cssText = 'left:' + ml + 'px;top:' + (k * PGH + mt) + 'px;width:' + (papel.clientWidth - ml - mr) + 'px;height:' + (PGH - mt - mb) + 'px'; papel.appendChild(m);
      const p = document.createElement('div'); p.className = 'pg'; p.style.top = (k * PGH + 49) + 'px'; p.textContent = k + 1; papel.appendChild(p);
      if (encab) { const e = document.createElement('div'); e.className = 'pg encab'; e.style.top = (k * PGH + 40) + 'px'; e.textContent = encab; papel.appendChild(e); }
      if (pie) { const e = document.createElement('div'); e.className = 'pg pie'; e.style.top = ((k + 1) * PGH - 56) + 'px'; e.textContent = pie; papel.appendChild(e); }
      if (k) { const c = document.createElement('div'); c.className = 'corte'; c.style.top = (k * PGH) + 'px'; papel.appendChild(c); }
    }
  }
  new ResizeObserver(pagina).observe($('hoja'));

  // ---------------------------------------------------------------- zoom: Ctrl + rueda (queda bajo el ratón lo que ves), Ctrl + «+» «−» «0»
  let zoom = 1;
  function ponZoom(z, cx, cy) {
    const area = $('area'), z0 = zoom; z = Math.max(0.25, Math.min(4, z)); if (Math.abs(z - z0) < 1e-9) return;
    const r = area.getBoundingClientRect(); cx = cx === undefined ? r.width / 2 : cx - r.left; cy = cy === undefined ? r.height / 2 : cy - r.top;
    const ax = area.scrollLeft + cx, ay = area.scrollTop + cy; zoom = z; $('papel').style.zoom = z;
    area.scrollLeft = ax * (z / z0) - cx; area.scrollTop = ay * (z / z0) - cy; estado('Zoom ' + Math.round(z * 100) + ' %'); const s = document.getElementById('sel-zoom'); if (s) s.value = String(Math.round(z * 100));
  }
  $('area').addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); ponZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY); }, { passive: false });
  document.addEventListener('keydown', (e) => {          // Ctrl+M notación · Ctrl+Mayús+M simbólica · Ctrl+Mayús+E numérica (las mismas de WPF)
    if (!e.ctrlKey || e.altKey) return; const k = e.key.toLowerCase();
    if (k === 'm') { e.preventDefault(); H().nuevaEq('', false, e.shiftKey ? 1 : 2); estado(e.shiftKey ? 'Región simbólica' : 'Región de notación'); }
    else if (k === 'e' && e.shiftKey) { e.preventDefault(); H().nuevaEq('', false, 0); estado('Región numérica'); }
  });
  document.addEventListener('keydown', (e) => {          // Ctrl+B / I / U sobre texto editable; Mayús+F3 cicla MAYÚSCULAS → minúsculas → Cada Palabra (como el WPF)
    if (e.altKey) return; const k = e.key.toLowerCase();
    if (e.ctrlKey && !e.shiftKey && (k === 'b' || k === 'i' || k === 'u')) { if (selTxt()) { e.preventDefault(); cmd(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline'); } }
    else if (e.key === 'F3' && e.shiftKey && !e.ctrlKey) { const t = selTxt(); if (!t) return; const s = String(getSelection()); if (!s) return; e.preventDefault();
      const may = s.toUpperCase(), min = s.toLowerCase(), cap = s.toLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
      document.execCommand('insertText', false, s === may ? min : s === min ? cap : may); estado('Mayúsculas / minúsculas'); }
  });
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); ponZoom(zoom * 1.1); } else if (e.key === '-') { e.preventDefault(); ponZoom(zoom / 1.1); } else if (e.key === '0') { e.preventDefault(); ponZoom(1); }
  });
  const VISTAS = { impresion: 'Diseño de impresión: el papel con su regla y sus márgenes', lectura: 'Modo lectura: las páginas reales, para leer', web: 'Diseño web: sin papel, a todo el ancho', esquema: 'Esquema: los títulos del documento', borrador: 'Borrador: solo el texto, sin papel ni regla', enfoque: 'Enfoque: solo el documento (Esc para volver)' };
  function ponVista(v) {
    document.body.dataset.vista = v; estado(VISTAS[v]);
    if (v === 'lectura' || v === 'impresion') ponZoom(v === 'lectura' ? ($('area').clientWidth - 40) / PGW : 1);
    setTimeout(pagina, 0);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.dataset.vista === 'enfoque') ponVista('impresion'); });
  const fitUna = () => ponZoom(Math.min(($('area').clientHeight - 30) / PGH, ($('area').clientWidth - 40) / PGW));
  CINTA['Vista'] = [
    { ic: '🗋', t: 'Diseño de impresión', tip: VISTAS.impresion, acc: () => ponVista('impresion') },
    { ic: '📖', t: 'Modo lectura', tip: VISTAS.lectura, acc: () => ponVista('lectura') },
    { ic: '🌐', t: 'Diseño web', tip: VISTAS.web, acc: () => ponVista('web') },
    { ic: '☰', t: 'Esquema', tip: VISTAS.esquema, acc: () => ponVista('esquema') },
    { ic: '✎', t: 'Borrador', tip: VISTAS.borrador, acc: () => ponVista('borrador') },
    'sep',
    'zoomsel',
    { ic: '100%', t: '100 %', tip: 'Zoom al 100 %', acc: () => ponZoom(1) },
    { ic: '▯', t: 'Una página', tip: 'Una página entera en la ventana', acc: fitUna },
    { ic: '▯▯', t: 'Varias páginas', tip: 'Varias páginas (zoom 50 %)', acc: () => ponZoom(0.5) },
    { ic: '↔', t: 'Ancho de página', tip: 'El ancho de la página llena la ventana', acc: () => ponZoom(($('area').clientWidth - 40) / PGW) },
    'sep',
    { ic: '↕', t: 'Vertical', tip: 'Las páginas se recorren hacia abajo', acc: () => estado('Las páginas se recorren hacia abajo') },
    { ic: '↔', t: 'Lado a lado', off: 'Lado a lado: disponible en la versión de escritorio' },
    { ic: '⛶', t: 'Enfoque', tip: VISTAS.enfoque, acc: () => ponVista('enfoque') },
    'sep',
    { ic: '+', t: 'Acercar', acc: () => ponZoom(zoom * 1.1) },
    { ic: '−', t: 'Alejar', acc: () => ponZoom(zoom / 1.1) },
    { ic: '▦', t: 'Cuadrícula', acc: () => cuadricula() },
  ];


  // ---------------------------------------------------------------- pestañas de texto, página y documento (como las del WPF)
  let ultTxt = null;
  $('hoja').addEventListener('focusin', (e) => { const t = e.target.closest && e.target.closest('.txt'); if (t) ultTxt = t; });
  const enTxt = (n) => { let x = n && (n.nodeType === 1 ? n : n.parentNode); while (x && x !== document.body) { if (x.classList && x.classList.contains('txt')) return x; x = x.parentNode; } return null; };
  function selTxt() {          // asegura selección dentro de un bloque de texto; sin selección: todo el bloque (como WPF)
    const s = G.getSelection(); let t = s.rangeCount ? enTxt(s.anchorNode) : null;
    if (!t) { t = ultTxt && document.body.contains(ultTxt) ? ultTxt : null; if (!t) { estado('Haz clic primero en un bloque de texto'); return null; } t.focus(); const r = document.createRange(); r.selectNodeContents(t); s.removeAllRanges(); s.addRange(r); }
    else if (s.isCollapsed) { const r = document.createRange(); r.selectNodeContents(t); s.removeAllRanges(); s.addRange(r); }
    return t;
  }
  const cmd = (c, v) => { if (selTxt()) { document.execCommand(c, false, v); estado(c); } };
  function tamSel(px) { const t = selTxt(); if (!t) return; document.execCommand('fontSize', false, 7); t.querySelectorAll('font[size="7"]').forEach((f) => { const sp = document.createElement('span'); sp.style.fontSize = px + 'px'; sp.innerHTML = f.innerHTML; f.replaceWith(sp); }); estado('Tamaño ' + px + ' px'); }
  function casoSel(modo) {
    const t = selTxt(); if (!t) return; const s = G.getSelection().toString(); if (!s) return;
    const f = { oracion: (x) => x.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()), min: (x) => x.toLowerCase(), may: (x) => x.toUpperCase(), palabra: (x) => x.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()), inv: (x) => [...x].map((c) => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('') }[modo];
    document.execCommand('insertText', false, f(s));
  }
  function menuLista(titulo, items) {          // lista desplegable de la cinta (▾)
    const g = document.createElement('div'); g.className = 'grupo-t'; g.innerHTML = '<span>' + titulo + '</span><div class="fil"></div>'; const q = document.createElement('select');
    q.innerHTML = '<option value="">' + titulo + ' ▾</option>' + items.map(([k, t]) => '<option value="' + k + '">' + t + '</option>').join('');
    q.onchange = () => { if (q.value) casoSel(q.value); q.value = ''; }; q.addEventListener('mousedown', () => selTxt()); g.querySelector('.fil').appendChild(q); return g;
  }
  const CASOS = [['oracion', 'Tipo oración.'], ['min', 'minúsculas'], ['may', 'MAYÚSCULAS'], ['palabra', 'Cada Palabra'], ['inv', 'iNVERTIR']];
  function selectCinta(titulo, valores, ini, fn, ancho) {
    const g = document.createElement('div'); g.className = 'grupo-t'; g.innerHTML = '<span>' + titulo + '</span><div class="fil"></div>'; const q = document.createElement('select'); if (ancho) q.style.width = ancho + 'px';
    valores.forEach((v) => { const o = document.createElement('option'); o.value = v; o.textContent = v; q.appendChild(o); }); q.value = ini; q.onchange = () => fn(q.value);
    q.addEventListener('mousedown', () => selTxt()); g.querySelector('.fil').appendChild(q); return g;
  }
  // PNG de la hoja o de la ventana: se copia el DOM con sus estilos a un SVG (los lienzos de las ecuaciones pasan a imagen) y se dibuja en un canvas
  async function capturaPng(que, copiar) {
    const eds = H().reg.filter((r) => r.ed).map((r) => r.ed), antes = eds.map((e) => [e.dpr, e.foco]);          // para la imagen: ecuaciones al doble de resolución (nítidas) y sin cursor
    eds.forEach((e) => { e.dpr = 2; e.foco = false; e.dibuja(); });
    try { await capturaPng0(que, copiar); } finally { eds.forEach((e, i) => { e.dpr = antes[i][0]; e.foco = antes[i][1]; e.dibuja(); }); }
  }
  async function capturaPng0(que, copiar) {
    const el = que === 'ventana' ? $('app') : $('papel'), w = Math.ceil(que === 'ventana' ? el.clientWidth : el.offsetWidth), h = Math.ceil(que === 'ventana' ? el.clientHeight : el.scrollHeight);
    const clon = el.cloneNode(true), orig = [el, ...el.querySelectorAll('*')], copia = [clon, ...clon.querySelectorAll('*')];
    orig.forEach((o, i) => { const c = copia[i], cs = getComputedStyle(o); c.style.cssText = Array.from(cs).map((p) => p + ':' + cs.getPropertyValue(p)).join(';'); if (o.tagName === 'CANVAS') { const im = document.createElement('img'); im.src = o.toDataURL(); im.style.cssText = c.style.cssText; im.setAttribute('width', o.offsetWidth); im.setAttribute('height', o.offsetHeight); c.replaceWith(im); } });
    clon.style.transform = 'none'; clon.style.margin = '0'; clon.style.width = w + 'px';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><foreignObject width="100%" height="100%">' + new XMLSerializer().serializeToString(clon) + '</foreignObject></svg>';
    const img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('no se pudo dibujar')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const cx = cv.getContext('2d'); cx.scale(2, 2); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0);
    HK.ultimaCaptura = { w, h, url: cv.toDataURL('image/png') };
    if (copiar) {          // Compartir: la imagen de la hoja va al portapapeles (pegar con Ctrl+V en un chat, correo, Word…)
      try { const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); estado('Hoja copiada al portapapeles como imagen (' + w + ' × ' + h + ' px): pega con Ctrl+V'); HK.ultimoCopiado = 'imagen'; }
      catch (e) { estado('No se pudo copiar al portapapeles (' + e.message + '): se guarda como PNG'); const b = document.createElement('a'); b.href = HK.ultimaCaptura.url; b.download = 'hoja.png'; b.click(); }
      return;
    }
    const a = document.createElement('a'); a.href = HK.ultimaCaptura.url; a.download = (que === 'ventana' ? 'ventana' : 'hoja') + '.png'; a.click(); estado('PNG guardado: ' + a.download);
  }
  const FUENTES = ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Georgia', 'Segoe UI', 'Courier New', 'Verdana'];
  let paginas = true;
  function hojaConPaginas() { paginas = !paginas; document.body.classList.toggle('sinpag', !paginas); setTimeout(pagina, 0); estado(paginas ? 'Hoja con páginas' : 'Hoja continua'); }
  const ESTILOS_DOC = {          // como el desplegable «Formato del documento» del WPF: letra, tamaño (pt → px) e interlineado
    'Normas APA 7 — Times New Roman 12 pt': ['"Times New Roman", Times, serif', 16, 2.0], 'Normas APA 7 — Calibri 11 pt': ['Calibri, "Segoe UI", sans-serif', 14.67, 2.0],
    'Normas APA 7 — Arial 11 pt': ['Arial, Helvetica, sans-serif', 14.67, 2.0], 'Normas APA 7 — Georgia 11 pt': ['Georgia, serif', 14.67, 2.0],
    'IEEE — Times New Roman 10 pt': ['"Times New Roman", Times, serif', 13.33, 1.15], 'Informe / tesis — Arial 12 pt, 1.5': ['Arial, Helvetica, sans-serif', 16, 1.5],
    'Hoja libre — Segoe UI, apretado': ['"Segoe UI", sans-serif', 15, 1.3], 'Hekatan — Segoe UI 11 pt': ['inherit', 16, 1.7] };
  function formatoDoc(v) {
    const [fam, px, lh] = ESTILOS_DOC[v] || ESTILOS_DOC['Hekatan — Segoe UI 11 pt'];
    document.documentElement.style.setProperty('--txtfont', fam); document.documentElement.style.setProperty('--txtlh', lh); setTxt(Math.round(px)); setEq(14); estado(v);
  }
  function indice() {
    const tt = [...document.querySelectorAll('#hoja .txt.titulo')].map((e, i) => (e.classList.contains('n2') ? '    ' : '') + (i + 1) + '.  ' + e.textContent); const r = H().nuevoTxt('Tabla de contenido\n' + (tt.join('\n') || '(sin títulos)')); r.el.style.whiteSpace = 'pre-wrap'; estado('Tabla de contenido insertada');
  }
  const off = (ic, t, d) => ({ ic, t, off: (d || t) + ': disponible en la versión de escritorio' });
  const modoBtn = (ic, t, tip, m) => ({ ic, t, tip, acc: () => { if (!H().setModo(m)) estado('No hay ninguna ecuación'); } });
  const fx = [
    modoBtn('ƒ', 'Fórmula en texto', 'Fórmula dentro del texto, solo notación (Ctrl+M)', 2), modoBtn('→', 'Simbólica en texto', 'Operación simbólica (Ctrl+Mayús+M)', 1), modoBtn('＝', 'Numérica en texto', 'Operación numérica (Ctrl+Mayús+E)', 0),
  ];
  const fmtBtns = [
    { ic: '<b>N</b>', t: 'Negrita', tip: 'Negrita (Ctrl+B)', acc: () => cmd('bold') }, { ic: '<i>K</i>', t: 'Cursiva', tip: 'Cursiva (Ctrl+I)', acc: () => cmd('italic') },
    { ic: '<u>S</u>', t: 'Subrayado', tip: 'Subrayado (Ctrl+U)', acc: () => cmd('underline') },
  ];
  CINTA['Texto'] = [
    { ic: '', t: '', hack: 1 }, 'fuente', 'tamtxt', 'sep', ...fmtBtns, 'casos', 'sep',
    { ic: '⯇', t: 'Izquierda', tip: 'Alinear a la izquierda', acc: () => cmd('justifyLeft') }, { ic: '☰', t: 'Centrar', tip: 'Centrar', acc: () => cmd('justifyCenter') },
    { ic: '⯈', t: 'Derecha', tip: 'Alinear a la derecha', acc: () => cmd('justifyRight') }, { ic: '≣', t: 'Justificar', tip: 'Justificar', acc: () => cmd('justifyFull') }, 'sep', ...fx,
  ].filter((b) => !b.hack);
  CINTA['Fuente'] = [
    'casos', { ic: '<s>ab</s>', t: 'Tachado', acc: () => cmd('strikeThrough') }, { ic: 'x₂', t: 'Subíndice', acc: () => cmd('subscript') }, { ic: 'x²', t: 'Superíndice', acc: () => cmd('superscript') },
    { ic: '▭', t: 'Sin resaltado', tip: 'Quita el resaltado y el formato', acc: () => cmd('removeFormat') },
    { ic: '🔗', t: 'Hipervínculo', acc: () => { const u = prompt('Dirección (URL)', 'https://'); if (u) cmd('createLink', u); } },
    'sep', { ic: '☰', t: 'Tabla de contenido', tip: 'Inserta la lista de títulos de la hoja', acc: indice }, { ic: '⟳', t: 'Actualizar', tip: 'Vuelve a armar la tabla de contenido', acc: indice },
  ];
  CINTA['Formato'] = [
    'apa', 'sep',
    { ic: 'T', t: 'Título', tip: 'Pone o quita el estilo de título al bloque de texto que estás editando', acc: () => { const t = ultTxt && document.body.contains(ultTxt) ? ultTxt : null; if (!t) return estado('Haz clic primero en un bloque de texto'); t.classList.toggle('titulo'); t.classList.toggle('n1', t.classList.contains('titulo')); const r = H().reg.find((x) => x.el === t); if (r) r.titulo = t.classList.contains('titulo'); } },
    { ic: '<i>K</i>', t: 'Cursiva', tip: 'Cursiva del bloque de texto', acc: () => cmd('italic') },
    { ic: '==', t: 'Signo ==', tip: 'Cómo se dibuja el igual de ecuación (==)', acc: () => { document.body.classList.toggle('igual2'); estado('Signo == cambiado'); } },
    { ic: '▤', t: 'Hoja con páginas', tip: 'Hoja con páginas delimitadas o hoja continua sin límites', acc: hojaConPaginas },
    'sep',
    { ic: '◫', t: 'Ocultar bloque', tip: 'Oculta la región donde está el cursor (Ctrl+H); Ctrl+Mayús+H muestra u oculta los bloques ocultos', acc: () => { const o = H().ocultaBloque(); estado(o ? 'Bloque oculto (Ctrl+Mayús+H para verlos)' : 'Bloque visible'); } }, { ic: '＋', t: 'Código', tip: 'Región nueva escrita directamente como script estilo MATLAB (for / while / if / function … end); Ctrl+K la pasa a nodos', acc: () => { H().nuevoCodigo(); estado('Región de código: script estilo MATLAB (Ctrl+K lo pasa a nodos)'); } },
    { ic: '⇄', t: 'Código ⇄ Nodos', tip: 'Ver la región como código o como ecuación dibujada (Ctrl+K)', acc: () => { H().alternaCodigo(); } }, off('⌀', 'Ocultar unidades de conversión'),
  ];
  CINTA['Formato matemático'] = [
    modoBtn('ƒ', 'Notación', 'La región donde está el cursor solo se dibuja: no calcula ni define nada', 2), modoBtn('→', 'Simbólica', 'El = da la expresión exacta (simplifica, deriva…)', 1), modoBtn('=', 'Numérica', 'El = calcula el valor', 0),
    'sep', 'cifras',
    'fvar', 'fnum',
  ];
  CINTA['Revisar'] = [off('💬', 'Nuevo comentario'), off('🗑', 'Eliminar'), off('◀', 'Anterior'), off('▶', 'Siguiente')];
  CINTA['Capturar'] = [{ ic: '📋', t: 'Compartir', tip: 'Copia la hoja como imagen al portapapeles (Ctrl+V para pegarla donde quieras)', acc: () => { capturaPng('hoja', true); } }, { ic: '🖼', t: 'PNG hoja', tip: 'Guarda la hoja como imagen PNG', acc: () => { capturaPng('hoja'); } }, { ic: '🖼', t: 'PNG ventana', tip: 'Guarda toda la ventana como imagen PNG', acc: () => { capturaPng('ventana'); } }, off('🎞', 'GIF hoja'), off('🎞', 'GIF ventana'), off('🎬', 'MP4 hoja'), off('🎬', 'MP4 ventana'), off('⏹', 'Parar y guardar'), off('📁', 'Abrir carpeta')];
  CINTA['Diapositivas'] = [off('▤', 'Nueva presentación'), off('P', 'Abrir PowerPoint')];
  CINTA['Word'] = [
    off('W', 'Documento'), off('📂', 'Abrir Word'), off('💾', 'Guardar Word'), 'sep',
    { ic: 'Aa', t: 'Normal', tip: 'Quita el formato del texto seleccionado', acc: () => cmd('removeFormat') }, 'casos', { ic: '<u>S</u>', t: 'S', tip: 'Subrayado', acc: () => cmd('underline') },
    { ic: '•', t: 'Viñetas', acc: () => cmd('insertUnorderedList') }, { ic: '1.', t: 'Numeración', acc: () => cmd('insertOrderedList') },
    { ic: '▦', t: 'Tabla', tip: 'Tabla 3×3 como bloque propio (se desplaza por su borde izquierdo)', acc: () => { H().nuevaTabla(3, 3); estado('Tabla 3×3: escribe en las celdas; arrástrala por su borde izquierdo'); } },
    { ic: '🖼', t: 'Imagen', tip: 'Inserta una imagen en el texto', acc: () => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => { const rd = new FileReader(); rd.onload = () => cmd('insertImage', rd.result); if (f.files[0]) rd.readAsDataURL(f.files[0]); }; f.click(); } },
    { ic: '⤓', t: 'Salto de página', tip: 'Salto de página en este punto', acc: () => cmd('insertHTML', '<div style="break-after:page;border-top:1px dashed #9AA5B5"></div>') },
    { ic: '∑=', t: 'Ecuación', acc: () => H().nuevaEq('') },
  ];
  const margen = (cm) => { document.getElementById('papel').style.padding = (cm * 96 / 2.54) + 'px'; setTimeout(pagina, 0); estado('Márgenes de ' + cm + ' cm'); };
  const PAPELES = { 'Carta': [816, 1056], 'A4': [794, 1123], 'Oficio': [816, 1344], 'A3': [1123, 1587], 'A5': [559, 794], 'B5': [665, 945], 'Tabloide': [1056, 1632] };
  let horiz = false, papelNom = 'Carta';
  function aplicaPagina() {          // Carta, A4, Oficio, A3, A5, B5, Tabloide (px a 96 dpi) · horizontal = se intercambian
    const [w, h] = PAPELES[papelNom]; PGW = horiz ? h : w; PGH = horiz ? w : h; const rg = $('regla'); if (rg) dibujaRegla(rg);
    const p = $('papel'); p.style.width = PGW + 'px'; p.style.minHeight = PGH + 'px'; setTimeout(pagina, 0);
    estado((horiz ? 'Horizontal' : 'Vertical') + ' · ' + papelNom + ' (' + PGW + ' × ' + PGH + ' px)');
  }
  function numeroPagina() { document.body.classList.toggle('sinnum'); estado(document.body.classList.contains('sinnum') ? 'Sin número de página' : 'Con número de página'); }
  CINTA['Disposición'] = [
    { ic: '⇥', t: 'Sangría +', acc: () => cmd('indent') }, { ic: '⇤', t: 'Sangría −', acc: () => cmd('outdent') },
    off('↵', 'Salto de línea'), { ic: '¶', t: 'Marcas', tip: 'Muestra u oculta las marcas de párrafo ¶', acc: () => { document.body.classList.toggle('marcas'); estado(document.body.classList.contains('marcas') ? 'Marcas de párrafo visibles' : 'Marcas de párrafo ocultas'); } }, 'sep',
    { ic: '▭', t: 'Normal (2,54 cm)', tip: 'Márgenes de 2,54 cm', acc: () => margen(2.54) }, { ic: '▯', t: 'Estrecho (1,27 cm)', tip: 'Márgenes de 1,27 cm', acc: () => margen(1.27) },
    { ic: '▯', t: 'Vertical', tip: 'Alterna la orientación de la página: vertical ⇄ horizontal', acc: () => { horiz = !horiz; aplicaPagina(); } }, { ic: '▭', t: 'Carta', tip: 'Alterna el tamaño del papel: Carta ⇄ A4', acc: () => { a4 = !a4; aplicaPagina(); } }, 'sep', off('¹', 'Nota al pie'), off('✎', 'Editar nota'), off('⤓', 'Saltos'), off('▥', 'Columnas'), off('◇', 'Formas'), off('▔', 'Encabezado y pie'), { ic: '#', t: 'Número de página', tip: 'Muestra u oculta el número arriba a la derecha de cada página', acc: numeroPagina },
    { ic: '🖶', t: 'Vista de impresión', acc: () => ponVista('impresion') }, { ic: 'PDF', t: 'PDF del documento', acc: () => G.print() },
  ];

  // ---------------------------------------------------------------- botones que faltaban respecto de Hekatan Math Studio WPF
  // Vista: Regla y Panel de navegación
  function dibujaRegla(r) {
    const cm = 96 / 2.54, pad = parseFloat(getComputedStyle($('papel')).paddingLeft) || 96; let s = '<svg width="' + PGW + '" height="22" xmlns="http://www.w3.org/2000/svg"><rect width="' + PGW + '" height="22" fill="#eef1f5"/><rect width="' + pad + '" height="22" fill="#b4bfcc"/><rect x="' + (PGW - pad) + '" width="' + pad + '" height="22" fill="#b4bfcc"/>';
    for (let i = 0; i * cm < PGW; i++) { const x = i * cm; s += '<line x1="' + x + '" y1="12" x2="' + x + '" y2="22" stroke="#4a5568"/>' + (i ? '<text x="' + (x + 2) + '" y="10" font-size="9" fill="#4a5568">' + i + '</text>' : ''); const m = x + cm / 2; if (m < PGW) s += '<line x1="' + m + '" y1="17" x2="' + m + '" y2="22" stroke="#4a5568"/>'; }
    r.innerHTML = s + '</svg>'; r.style.width = PGW + 'px';
  }
  function regla() {
    const r = $('regla'); if (r) { r.remove(); estado('Regla oculta'); return; }
    const n = document.createElement('div'); n.id = 'regla'; dibujaRegla(n); $('area').insertBefore(n, $('area').firstChild); estado('Regla visible (1 cm = una marca; las zonas oscuras son los márgenes)');
  }
  function llenaNav() {
    const nav = $('nav'); if (!nav) return; const tt = [...document.querySelectorAll('#hoja .txt.titulo')];
    nav.innerHTML = '<b>Navegación</b>' + (tt.length ? '' : '<p>(sin títulos)</p>');
    tt.forEach((t) => { const a = document.createElement('a'); a.textContent = t.textContent.trim() || '(vacío)'; a.className = t.classList.contains('n3') ? 'n3' : t.classList.contains('n2') ? 'n2' : 'n1'; a.onclick = () => { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }; nav.appendChild(a); });
  }
  function panelNav() {
    const n = $('nav'); if (n) { n.remove(); document.body.classList.remove('connav'); estado('Panel de navegación oculto'); return; }
    const a = document.createElement('aside'); a.id = 'nav'; a.style.top = Math.round($('area').getBoundingClientRect().top) + 'px'; document.body.appendChild(a); document.body.classList.add('connav'); llenaNav(); estado('Panel de navegación: haz clic en un título para ir a él');
  }
  CINTA['Vista'].splice(CINTA['Vista'].findIndex((b) => b && b.t === 'Cuadrícula'), 0,
    { ic: '📏', t: 'Regla', tip: 'Muestra u oculta la regla con los márgenes de la página', acc: regla },
    { ic: '☷', t: 'Panel de navegación', tip: 'Lista de títulos de la hoja; un clic lleva a cada uno', acc: panelNav });

  // Disposición: tamaños de papel, horizontal, márgenes
  const D = CINTA['Disposición'];
  const iCarta = D.findIndex((b) => b && b.t === 'Carta'), iVert = D.findIndex((b) => b && b.t === 'Vertical');
  D.splice(iVert, 2,
    { ic: '▯', t: 'Vertical', tip: 'Página vertical', acc: () => { horiz = false; aplicaPagina(); } },
    { ic: '▭', t: 'Horizontal', tip: 'Página horizontal', acc: () => { horiz = true; aplicaPagina(); } }, 'papelsel');
  const iEstr = D.findIndex((b) => b && b.t === 'Estrecho (1,27 cm)');
  D.splice(iEstr + 1, 0,
    { ic: '▯', t: 'Moderado (1,91 cm)', tip: 'Márgenes de 1,91 cm', acc: () => margen(1.91) },
    { ic: '▯', t: 'Ancho (5,08 cm)', tip: 'Márgenes de 5,08 cm', acc: () => margen(5.08) });

  // Formato: estilos de documento (APA 7, IEEE, informe, hoja libre)
  // Word / Fuente: estilos de párrafo, colores y resaltados
  function estiloBloque(nombre) {
    const t = ultTxt && document.body.contains(ultTxt) ? ultTxt : null; if (!t) { estado('Haz clic primero en un bloque de texto'); return; }
    [...t.classList].filter((c) => /^est-|^n[123]$|^titulo$/.test(c)).forEach((c) => t.classList.remove(c));
    const r = H().reg.find((x) => x.el === t);
    if (/^Título [123]$/.test(nombre)) { t.classList.add('titulo', 'n' + nombre.slice(-1)); if (r) { r.titulo = true; r.nivel = +nombre.slice(-1); } }
    else if (nombre === 'Título') { t.classList.add('titulo', 'n1', 'est-titulo'); if (r) { r.titulo = true; r.nivel = 1; } }
    else { t.classList.add('est-' + nombre); if (r) r.titulo = false; }
    estado('Estilo «' + nombre + '» aplicado al bloque'); setTimeout(pagina, 0);
  }
  const estBtn = (ic, t, id) => ({ ic, t, tip: 'Estilo de párrafo: ' + t, acc: () => estiloBloque(id || t) });
  const colBtn = (ic, t, c, cmdo) => ({ ic: '<span style="color:' + c + ';font-weight:700">' + ic + '</span>', t, tip: t, acc: () => cmd(cmdo || 'foreColor', c) });
  CINTA['Word'] = CINTA['Word'].concat(['sep',
    estBtn('T1', 'Título 1'), estBtn('T2', 'Título 2'), estBtn('T3', 'Título 3'), estBtn('T', 'Título'), estBtn('St', 'Subtítulo', 'subtitulo'), estBtn('¶', 'Sin espacio', 'sinesp'), estBtn('❝', 'Cita', 'cita'), estBtn('❞', 'Cita destacada', 'citad'), estBtn('•¶', 'Párrafo de lista', 'lista'), estBtn('Lg', 'Leyenda', 'leyenda'),
    'sep', colBtn('A', 'Negro', '#000'), colBtn('A', 'Rojo', '#c00000'), colBtn('A', 'Azul', '#1a4fa3')]);
  CINTA['Fuente'] = CINTA['Fuente'].concat(['sep',
    colBtn('▮', 'Amarillo', '#ffeb3b', 'hiliteColor'), colBtn('▮', 'Verde', '#8bc34a', 'hiliteColor'), colBtn('▮', 'Celeste', '#81d4fa', 'hiliteColor'), colBtn('▮', 'Rosa', '#f8bbd0', 'hiliteColor'), colBtn('▮', 'Gris', '#cfd8dc', 'hiliteColor')]);

  // Gráficos: los que escriben una función (gráfica XY, diagrama 3D) y los dibujos de estructura (bloque CAD)
  const cadNuevo = (lineas) => { H().nuevoCad(';; Dibujo AutoLISP (Hekatan Math Studio): cada línea agrega una entidad; abajo se dibuja.\n' + lineas.join('\n')); };
  const r3 = (v) => +v.toFixed(3);
  const tri = (x, y, s) => "(polilinea '((" + r3(x - s) + ' ' + r3(y - 1.5 * s) + ') (' + x + ' ' + y + ') (' + r3(x + s) + ' ' + r3(y - 1.5 * s) + ') (' + r3(x - s) + ' ' + r3(y - 1.5 * s) + ')))';
  const flechas = (x0, x1, y, n) => { const r = []; for (let i = 0; i <= n; i++) { const x = r3(x0 + (x1 - x0) * i / n); r.push("(linea '(" + x + ' ' + r3(y + 0.9) + ") '(" + x + ' ' + y + '))', "(polilinea '((" + r3(x - 0.1) + ' ' + r3(y + 0.3) + ') (' + x + ' ' + y + ') (' + r3(x + 0.1) + ' ' + r3(y + 0.3) + ')))'); } return r; };
  const PORT2D = ["(linea '(0 0) '(0 3))", "(linea '(4 0) '(4 3))", "(linea '(0 3) '(4 3))", tri(0, 0, 0.2), tri(4, 0, 0.2), ...flechas(0.2, 3.8, 3.1, 6), "(texto '(2 4.1) \"w\" :altura 0.25)", "(cota '(0 -0.6) '(4 -0.6) :sep -0.3 :texto \"L = 4.00\")", "(cota '(-0.6 0) '(-0.6 3) :sep -0.3 :texto \"h = 3.00\")"];
  const DIAG2D = ["(linea '(0 0) '(6 0))", tri(0, 0, 0.2), tri(6, 0, 0.2), "(curva (lambda (x) (* -0.11 x (- 6 x))) 0 6)", "(texto '(3 -1.5) \"M máx = w L²/8\" :altura 0.25)", "(cota '(0 0.6) '(6 0.6) :sep 0.3 :texto \"L = 6.00\")"];
  const PORT3D = ["(linea '(0 0) '(0 3))", "(linea '(4 0) '(4 3))", "(linea '(0 3) '(4 3))", "(linea '(1.5 1) '(1.5 4))", "(linea '(5.5 1) '(5.5 4))", "(linea '(1.5 4) '(5.5 4))", "(linea '(0 0) '(1.5 1))", "(linea '(4 0) '(5.5 1))", "(linea '(0 3) '(1.5 4))", "(linea '(4 3) '(5.5 4))", "(texto '(2.8 4.6) \"Pórtico 3D (vista isométrica)\" :altura 0.25)"];
  const GR = CINTA['Gráficos'], iSepG = GR.findIndex((b) => b === 'sep');
  GR.splice(iSepG, 0,
    { ic: '📈', t: 'gráfica XY', tip: 'fplot(f1, f2, [a, b]): curvas con ejes y leyenda', acc: () => H().nuevaEq('fplot(sin(x), cos(x), [0, 6])') },
    { ic: '◪', t: 'diagrama 3D', tip: 'Superficie 3D de una función de dos variables', acc: () => H().nuevaEq('fsuperficie(sin(x)*cos(y), [0, 6], [0, 6])') },
    { ic: '⌇', t: 'diagrama 2D', tip: 'Viga apoyada con su diagrama de momentos (bloque CAD, editable)', acc: () => cadNuevo(DIAG2D) },
    { ic: '⊓', t: 'pórtico 2D', tip: 'Pórtico plano con apoyos y carga repartida (bloque CAD, editable)', acc: () => cadNuevo(PORT2D) },
    { ic: '⬡', t: 'pórtico 3D', tip: 'Pórtico en vista isométrica (bloque CAD, editable)', acc: () => cadNuevo(PORT3D) });

  // CAD: Plano, Anotar, Carga repartida, Empotramiento, Estructura, Trazos por código
  const C = CINTA['CAD'], iSepC = C.findIndex((b, i) => b === 'sep' && i > 3 && C[i - 1] && C[i - 1].t === 'Capa');
  C.splice(iSepC, 0, 'sep',
    { ic: '▣', t: 'Plano', tip: 'Dibujo nuevo con marco y cajetín de plano', acc: () => cadNuevo(["(rect '(0 0) 12 8)", "(rect '(0.3 0.3) 11.4 7.4)", "(rect '(7.9 0.3) 3.8 1.3)", "(texto '(8.1 1.2) \"Hekatan Math Studio\" :altura 0.3)", "(texto '(8.1 0.7) \"Plano: ____   Escala: 1:50\" :altura 0.22)"]) },
    { ic: '✐', t: 'Anotar', tip: 'Nota con línea de referencia', acc: () => H().cadAgrega("(linea '(1 1) '(2.2 2))\n(texto '(2.3 2.05) \"Nota\" :altura 0.3)") },
    { ic: '⇊', t: 'Carga repartida', tip: 'Carga repartida con flechas', acc: () => H().cadAgrega(flechas(0, 4, 1, 8).concat(["(linea '(0 1.9) '(4 1.9))", "(texto '(2 2.15) \"w\" :altura 0.25)"]).join('\n')) },
    { ic: '▥', t: 'Empotramiento', tip: 'Apoyo empotrado (muro con achurado)', acc: () => H().cadAgrega("(linea '(0 -1) '(0 1))\n(achurado '((-0.4 -1) (0 -1) (0 1) (-0.4 1)) :patron \"ANSI31\")") },
    { ic: '△', t: 'Estructura', tip: 'Viga con apoyo fijo y móvil', acc: () => H().cadAgrega(["(rect '(0 0) 6 0.3)", tri(0.2, 0, 0.25), "(circulo '(5.8 -0.2) 0.2)", "(linea '(5.4 -0.4) '(6.2 -0.4))"].join('\n')) },
    { ic: '‹›', t: 'Trazos por código', tip: 'Muestra u oculta el código AutoLISP del último dibujo', acc: () => { const b = [...document.querySelectorAll('#hoja .cad [data-a="cod"]')].pop(); if (b) b.click(); else estado('No hay ningún dibujo CAD en la hoja'); } });

  // Capturar: grabar pantalla, micrófono, voz (dictado)
  let grab = null;
  async function graba(que) {
    if (grab) { grab.rec.stop(); return; }
    try {
      const flujo = que === 'pantalla' ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) : await navigator.mediaDevices.getUserMedia({ audio: true });
      const trozos = [], rec = new MediaRecorder(flujo); grab = { rec, que };
      rec.ondataavailable = (e) => trozos.push(e.data);
      rec.onstop = () => { flujo.getTracks().forEach((t) => t.stop()); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(trozos, { type: rec.mimeType })); a.download = que === 'pantalla' ? 'pantalla.webm' : 'microfono.webm'; a.click(); grab = null; estado('Grabación guardada: ' + a.download); };
      rec.start(); estado('Grabando ' + (que === 'pantalla' ? 'la pantalla' : 'el micrófono') + '… vuelve a pulsar el botón para parar y guardar');
    } catch (e) { grab = null; estado('No se pudo grabar (' + e.message + ')'); }
  }
  async function pruebaMic() {
    try { const f = await navigator.mediaDevices.getUserMedia({ audio: true }), tr = [], rec = new MediaRecorder(f); rec.ondataavailable = (e) => tr.push(e.data); rec.onstop = () => { f.getTracks().forEach((t) => t.stop()); new Audio(URL.createObjectURL(new Blob(tr, { type: rec.mimeType }))).play(); estado('Reproduciendo lo grabado'); }; rec.start(); estado('Habla: grabando 3 s…'); setTimeout(() => rec.stop(), 3000); }
    catch (e) { estado('No se pudo usar el micrófono (' + e.message + ')'); }
  }
  let voz = null;
  function dictado() {
    const SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) { estado('Tu navegador no tiene reconocimiento de voz'); return; }
    if (voz) { voz.stop(); voz = null; estado('Dictado detenido'); return; }
    voz = new SR(); voz.lang = 'es-ES'; voz.continuous = true; voz.interimResults = false;
    voz.onresult = (e) => { const tx = e.results[e.results.length - 1][0].transcript; const t = ultTxt && document.body.contains(ultTxt) ? ultTxt : H().nuevoTxt('').el; t.focus(); document.execCommand('insertText', false, tx + ' '); };
    voz.onend = () => { voz = null; }; voz.start(); estado('Dictado: habla y el texto se escribe en el bloque; pulsa otra vez para parar');
  }
  CINTA['Capturar'] = CINTA['Capturar'].concat(['sep',
    { ic: '⏺', t: 'Grabar pantalla', tip: 'Graba la pantalla (WebM); otra pulsación para y guarda', acc: () => graba('pantalla') },
    { ic: '🎤', t: 'Grabar mi micrófono', tip: 'Graba el micrófono (WebM); otra pulsación para y guarda', acc: () => graba('mic') },
    { ic: '🎧', t: 'Probar micrófono (3 s)', tip: 'Graba 3 segundos y los reproduce', acc: pruebaMic },
    { ic: '🗣', t: 'Voz', tip: 'Dictado: lo que dices se escribe en el bloque de texto', acc: dictado }]);

  // Cálculo: celdas a mano, ejecutar, índice
  let manual = false;
  CINTA['Cálculo'] = (CINTA['Cálculo'] || []).concat(['sep',
    { ic: '▤', t: 'Celdas a mano', tip: 'El cálculo solo se hace al ejecutar (Ejecutar celda / Todo)', acc: () => { manual = !manual; H().modoManual(manual); estado(manual ? 'Cálculo a mano: pulsa «Ejecutar celda» o «Todo»' : 'Cálculo automático'); } },
    { ic: '＋', t: 'Nueva celda', tip: 'Ecuación nueva', acc: () => H().nuevaEq('') },
    { ic: '▶', t: 'Ejecutar celda', tip: 'Calcula la hoja', acc: () => { H().resolver(true); estado('Hoja calculada'); } },
    { ic: '▶|', t: 'y avanzar', tip: 'Calcula y pasa a la ecuación siguiente', acc: () => { H().resolver(true); H().siguienteEq(); } },
    { ic: '▶▶', t: 'Todo', tip: 'Calcula toda la hoja', acc: () => { H().resolver(true); estado('Hoja calculada'); } },
    { ic: '☰', t: 'Índice', tip: 'Inserta la tabla de contenido', acc: indice }]);


  // Disposición: salto de línea, saltos, columnas, nota al pie, encabezado y pie
  let encab = '', pie = '';
  function encabPie() {
    const e = prompt('Encabezado (arriba de cada página; vacío = ninguno)', encab); if (e === null) return; const p = prompt('Pie de página (abajo de cada página; vacío = ninguno)', pie); if (p === null) return;
    encab = e; pie = p; pagina(); estado(encab || pie ? 'Encabezado y pie puestos' : 'Encabezado y pie quitados');
  }
  let notas = 0;
  function notaPie() {
    const t = selTxt(); if (!t) return; const txt = prompt('Texto de la nota al pie', ''); if (!txt) return; notas++;
    cmd('insertHTML', '<sup class="nota" title="' + txt.replace(/"/g, '&quot;') + '">' + notas + '</sup>');
    const r = H().nuevoTxt(notas + '  ' + txt); r.el.classList.add('est-leyenda'); estado('Nota al pie ' + notas + ' agregada (al final de la hoja)');
  }
  function columnas() { const t = selTxt(); if (!t) return; const n = t.style.columnCount === '2' ? '' : '2'; t.style.columnCount = n; t.style.columnGap = n ? '28px' : ''; estado(n ? 'Texto en 2 columnas' : 'Texto en 1 columna'); }
  const rd = CINTA['Disposición'];
  const reemp = (nombre, b) => { const i = rd.findIndex((x) => x && x.t === nombre); if (i >= 0) rd[i] = b; };
  reemp('Salto de línea', { ic: '↵', t: 'Salto de línea', tip: 'Salto de línea en este punto (Mayús+Enter)', acc: () => cmd('insertHTML', '<br>') });
  reemp('Saltos', { ic: '⤓', t: 'Saltos', tip: 'Salto de página en este punto', acc: () => cmd('insertHTML', '<div style="break-after:page;border-top:1px dashed #9AA5B5"></div>') });
  reemp('Columnas', { ic: '▥', t: 'Columnas', tip: 'Pone el bloque de texto en 2 columnas (otra vez: una)', acc: columnas });
  reemp('Nota al pie', { ic: '¹', t: 'Nota al pie', tip: 'Inserta una nota al pie en el cursor', acc: notaPie });
  reemp('Editar nota', { ic: '✎', t: 'Editar nota', tip: 'Edita las notas: están al final de la hoja como textos «n  nota»', acc: () => estado('Las notas están al final de la hoja: edítalas como cualquier texto') });
  reemp('Encabezado y pie', { ic: '▔', t: 'Encabezado y pie', tip: 'Texto que se repite arriba y abajo de cada página', acc: encabPie });

  // Revisar: comentarios
  function nuevoComentario() {
    const t = selTxt(); if (!t) return; const sel = G.getSelection().toString(); if (!sel) { estado('Selecciona primero el texto a comentar'); return; }
    const c = prompt('Comentario', ''); if (!c) return; cmd('insertHTML', '<span class="coment" title="' + c.replace(/"/g, '&quot;') + '">' + sel.replace(/</g, '&lt;') + '</span>'); estado('Comentario agregado'); llenaComentarios();
  }
  const comentarios = () => [...document.querySelectorAll('#hoja .coment')];
  function irComentario(d) {
    const l = comentarios(); if (!l.length) { estado('No hay comentarios'); return; }
    const s = G.getSelection(), enSel = s.rangeCount ? l.findIndex((e) => e.contains(s.anchorNode)) : -1; const i = enSel < 0 ? (d > 0 ? 0 : l.length - 1) : (enSel + d + l.length) % l.length;
    l[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); const r = document.createRange(); r.selectNodeContents(l[i]); s.removeAllRanges(); s.addRange(r); estado('Comentario ' + (i + 1) + ' de ' + l.length + ': ' + l[i].title);
  }
  function quitaComentario() {
    const s = G.getSelection(); const e = s.rangeCount ? comentarios().find((x) => x.contains(s.anchorNode)) : null; if (!e) { estado('Pon el cursor dentro de un comentario'); return; }
    e.replaceWith(document.createTextNode(e.textContent)); estado('Comentario eliminado'); llenaComentarios();
  }
  function llenaComentarios() {
    const p = $('coment'); if (!p) return; p.innerHTML = '<b>Comentarios</b>' + (comentarios().length ? '' : '<p>(ninguno)</p>');
    comentarios().forEach((e, i) => { const a = document.createElement('a'); const it = document.createElement('i'); it.textContent = (i + 1) + '. «' + e.textContent.slice(0, 40) + '»'; a.append(it, document.createElement('br'), document.createTextNode(e.title || '')); a.onclick = () => e.scrollIntoView({ block: 'center', behavior: 'smooth' }); p.appendChild(a); });
  }
  function panelComentarios() {
    const p = $('coment'); if (p) { p.remove(); estado('Panel de comentarios oculto'); return; }
    const a = document.createElement('aside'); a.id = 'coment'; a.style.top = Math.round($('area').getBoundingClientRect().top) + 'px'; document.body.appendChild(a); llenaComentarios(); estado('Panel de comentarios');
  }
  CINTA['Revisar'] = [
    { ic: '💬', t: 'Nuevo comentario', tip: 'Comenta el texto seleccionado', acc: nuevoComentario }, { ic: '🗑', t: 'Eliminar', tip: 'Elimina el comentario donde está el cursor', acc: quitaComentario },
    { ic: '◀', t: 'Anterior', tip: 'Comentario anterior', acc: () => irComentario(-1) }, { ic: '▶', t: 'Siguiente', tip: 'Comentario siguiente', acc: () => irComentario(1) },
    { ic: '☰', t: 'Panel de comentarios', tip: 'Lista de todos los comentarios', acc: panelComentarios }];
  // Insertar: Documento (bloque de texto con título) y Mathcad Prime
  const ins = CINTA['Insertar'];
  if (ins && !ins.some((b) => b && b.t === 'Documento')) ins.push({ ic: '📄', t: 'Documento', tip: 'Título y primer párrafo de un documento nuevo', acc: () => { const a = H().agregaTxt('Título del documento', true, 1); H().agregaTxt('Escribe aquí el texto; con «Fórmula / Simbólica / Numérica en texto» metes matemática dentro del párrafo.', false); a.el.focus(); } });

  // ---------------------------------------------------------------- arranque
  function motorEstado() { const m = $('motor'); if (HK.motor.listo) { m.textContent = 'motor simbólico: listo (Hekatan LISP · WASM)'; m.className = 'ok'; } else if (HK.motor.error) m.textContent = 'motor simbólico: no disponible (' + HK.motor.error + ')'; else setTimeout(motorEstado, 300); }
  motorEstado(); pintaCinta('Matemática'); pagina();
  HK.app = { setTxt, setEq, ponZoom, getZoom: () => zoom, estado, pagina, setTxt, setEq, abreEjemplo, nuevo, pintaCinta };
})(window);
