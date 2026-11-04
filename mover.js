// Hekatan Math Studio Web — desplazar las regiones (como MoverRegiones.cs del WPF).
// Se agarra por el BORDE IZQUIERDO (franja de 10 px), por las franjas de arriba/abajo (6 px) o con Alt+arrastrar.
// La hoja web es un FLUJO de filas: al soltar la región se coloca arriba/abajo de otra (fila nueva) o a su derecha (misma línea), y se recalcula.
(function (G) {
  const HK = G.HK, FR = 10, BV = 6, AZUL = '#2D7DD2';
  const hoja = document.getElementById('hoja'), papel = document.getElementById('papel'), area = document.getElementById('area');
  if (!hoja || !papel) return;
  const H = () => HK.hoja, zoom = () => (HK.app && HK.app.getZoom ? HK.app.getZoom() : 1) || 1;
  const estado = (t) => { if (HK.app && HK.app.estado) HK.app.estado(t); };
  const sel = new Set();          // regiones seleccionadas (Mayús+clic en la franja, o banda)
  let hov = null, ag = null, arr = null, banda = null, guia = null;

  const unidad = (t) => (t && t.closest) ? t.closest('#hoja > .fila > *') : null;          // la región: hijo directo de una línea (ecuación, grupo de ecuaciones, texto, deslizador, CAD, bloque)
  const hijos = (f) => [...f.children].filter((u) => !u.classList.contains('oculto'));
  const filas = () => [...hoja.children].filter((f) => f.classList.contains('fila'));
  const enInline = (t) => !!(t && t.closest && t.closest('.ifx'));
  const interactivo = (t) => !!(t && t.closest && t.closest('button,input,textarea,select,a'));
  function izq(u, e) { return e.altKey || (e.clientX - u.getBoundingClientRect().left) <= FR * zoom(); }
  function zona(u, e) {          // ¿el punto está en una franja de agarre? (izquierda 10 px · arriba y abajo 6 px · Alt en cualquier parte)
    if (e.altKey) return true;
    const b = u.getBoundingClientRect(), z = zoom(), x = e.clientX - b.left, y = e.clientY - b.top;
    if (x <= FR * z) return true;
    if (enInline(e.target) || interactivo(e.target)) return false;
    return y <= BV * z || y >= b.height - BV * z;
  }
  function marca(u, on) { if (on) sel.add(u); else sel.delete(u); u.classList.toggle('mv-sel', on); }
  function limpiaSel() { sel.forEach((u) => u.classList.remove('mv-sel')); sel.clear(); }
  function vivas() { for (const u of [...sel]) if (!u.isConnected) { sel.delete(u); } return [...sel]; }
  const enOrden = (l) => l.slice().sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);

  // ---------------------------------------------------------------- asa y cursor
  function quitaAsa() { if (hov) { hov.classList.remove('mv-asa'); hov = null; } }
  papel.addEventListener('mouseover', (e) => { if (arr) return; const u = unidad(e.target); if (u === hov) return; quitaAsa(); if (u && !u.classList.contains('oculto')) { hov = u; u.classList.add('mv-asa'); } });
  papel.addEventListener('mouseleave', () => { if (!arr) { quitaAsa(); if (ag) { ag.classList.remove('mv-agarre'); ag = null; } } });
  papel.addEventListener('mousemove', (e) => {
    if (arr || banda) return; const u = unidad(e.target), ya = u && zona(u, e);
    if (ag && (ag !== u || !ya)) { ag.classList.remove('mv-agarre'); ag = null; }
    if (u && ya) { u.classList.add('mv-agarre'); ag = u; }
  });

  // ---------------------------------------------------------------- dónde cae lo que se suelta
  function destino(px, py, excl) {
    const fs = filas().filter((f) => f.getBoundingClientRect().height); if (!fs.length) return null;
    let mejor = null, dm = 1e9;
    for (const f of fs) { const b = f.getBoundingClientRect(), d = py < b.top ? b.top - py : py > b.bottom ? py - b.bottom : 0; if (d < dm) { dm = d; mejor = f; } }
    const fb = mejor.getBoundingClientRect(), us = hijos(mejor).filter((u) => !excl.has(u) && u.getBoundingClientRect().width);
    const ub = us.length ? Math.max(...us.map((u) => u.getBoundingClientRect().bottom)) : fb.bottom;
    const h = { fila: mejor, fb, ub };
    if (py < fb.top) return Object.assign(h, { k: 'antes' });
    if (py > fb.bottom) return Object.assign(h, { k: 'despues' });
    if (!us.length) return Object.assign(h, { k: py < (fb.top + fb.bottom) / 2 ? 'antes' : 'despues' });
    const rs = us.map((u) => u.getBoundingClientRect()), z = zoom();
    const i = rs.findIndex((r) => px >= r.left && px <= r.right);
    if (i >= 0) {
      const r = rs[i], u = us[i], borde = Math.min(40 * z, r.width * .3);
      if (!u.classList.contains('txt') && px >= r.right - borde) return Object.assign(h, { k: 'lado', ref: u, desp: true, r });          // a la derecha de otra región: queda en su misma línea
      return Object.assign(h, { k: py < r.top + r.height / 2 ? 'antes' : 'despues' });
    }
    if (px > rs[rs.length - 1].right) return Object.assign(h, { k: 'lado', ref: us[us.length - 1], desp: true, r: rs[rs.length - 1] });
    const j = rs.findIndex((r) => r.left + r.width / 2 > px);
    return Object.assign(h, { k: 'lado', ref: us[j < 0 ? 0 : j], desp: false, r: rs[j < 0 ? 0 : j] });
  }
  function ponGuia(d) {
    if (!guia) { guia = document.createElement('div'); guia.className = 'mv-guia'; document.body.appendChild(guia); }
    if (!d) { guia.style.display = 'none'; return; }
    const hb = hoja.getBoundingClientRect(); let s = guia.style; s.display = 'block';
    if (d.k === 'lado') { s.left = (d.desp ? d.r.right + 5 : d.r.left - 7) + 'px'; s.top = d.fb.top + 'px'; s.width = '3px'; s.height = Math.max(12, d.ub - d.fb.top) + 'px'; }
    else { s.left = hb.left + 'px'; s.width = hb.width + 'px'; s.height = '3px'; s.top = (d.k === 'antes' ? d.fb.top - 2 : d.ub + 4) + 'px'; }
  }

  // ---------------------------------------------------------------- aplicar el movimiento al flujo
  function normalizaTxt(f) {          // un texto que no abre línea es un «lado» (Ec. (n)); uno que abre línea, no
    if (!f || !f.isConnected) return;
    [...f.children].forEach((u, i) => { if (!u.classList.contains('txt')) return; const r = H().reg.find((x) => x.t === 'txt' && x.el === u); if (r) { r.mismo = i > 0; u.classList.toggle('lado', i > 0); } });
  }
  function aplica(grupo, d) {          // grupo: regiones en orden del documento · d: { k:'antes'|'despues'|'lado', fila, ref, desp }
    grupo = enOrden(grupo); const viejas = new Set(grupo.map((u) => u.parentElement)), bloques = [];
    grupo.forEach((u) => { const l = bloques[bloques.length - 1]; if (l && l[0].parentElement === u.parentElement) l.push(u); else bloques.push([u]); });
    const tocadas = new Set(viejas);
    if (d.k === 'lado') { for (const u of grupo) { if (d.desp) { d.ref.after(u); d.ref = u; } else d.ref.before(u); } tocadas.add(d.fila); }
    else {
      let ancla = d.fila;
      for (const b of bloques) {
        const f = document.createElement('div'); f.className = 'fila'; tocadas.add(f);
        if (d.k === 'antes') hoja.insertBefore(f, d.fila); else { ancla.after(f); ancla = f; }
        b.forEach((u) => f.appendChild(u));
      }
    }
    viejas.forEach((f) => { if (f.isConnected && !f.children.length) { f.remove(); tocadas.delete(f); } });
    tocadas.forEach(normalizaTxt);
    termina();
  }
  function termina() {
    const reg = H().reg; reg.sort((a, b) => (a === b || !a.el || !b.el) ? 0 : (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);          // el cálculo sigue el orden de la hoja
    H().resolver(); H().redibuja(); if (HK.app && HK.app.pagina) HK.app.pagina();
  }

  // ---------------------------------------------------------------- arrastrar (con el ratón real)
  papel.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e._mv) return;
    const u = unidad(e.target);
    if (u && !u.classList.contains('oculto') && zona(u, e)) {
      e.preventDefault(); e.stopPropagation(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (e.shiftKey) { marca(u, !sel.has(u)); H().desactiva(); return; }          // Mayús+clic en la franja: suma / quita de la selección
      if (!sel.has(u)) limpiaSel();
      const grupo = sel.has(u) ? vivas() : [u];
      arr = { u, x0: e.clientX, y0: e.clientY, st0: area.scrollTop, sl0: area.scrollLeft, grupo: enOrden(grupo), movio: false, ult: e, d: null, tm: null, vert: !izq(u, e), tgt: e.target };
      document.body.classList.add('mv-arrastrando'); return;
    }
    if (e.target === papel || e.target === hoja || e.target === area || (e.target.classList && e.target.classList.contains('fila'))) {          // vacío: banda de selección (un clic suelto sigue como antes)
      e.preventDefault(); e.stopPropagation(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      banda = { x0: e.clientX, y0: e.clientY, on: false, ev: e, tgt: e.target, shift: e.shiftKey }; if (!e.shiftKey) { /* se limpia al empezar la banda o al soltar */ }
    }
  }, true);
  function mueveArr(e) {
    const z = zoom(), dx = e.clientX - arr.x0 + (area.scrollLeft - arr.sl0), dy = e.clientY - arr.y0 + (area.scrollTop - arr.st0);
    if (!arr.movio) {
      if (Math.abs(dx) + Math.abs(dy) < 4) return; arr.movio = true;
      arr.grupo.forEach((u) => u.classList.add('mv-vuelo')); quitaAsa(); arr.u.classList.add('mv-asa'); estado('Moviendo… suelta donde quieras: la hoja se reacomoda y recalcula');
    }
    arr.grupo.forEach((u) => { u.style.transform = 'translate(' + (dx / z) + 'px,' + (dy / z) + 'px)'; });
    arr.d = destino(e.clientX, e.clientY, new Set(arr.grupo)); ponGuia(arr.d);
    const ar = area.getBoundingClientRect(); const v = e.clientY < ar.top + 36 ? -14 : e.clientY > ar.bottom - 36 ? 14 : 0;          // cerca del borde de la ventana: la hoja se desplaza sola
    if (v && !arr.tm) arr.tm = setInterval(() => { area.scrollTop += v; mueveArr(arr.ult); }, 40); else if (!v && arr.tm) { clearInterval(arr.tm); arr.tm = null; }
  }
  function sueltaArr(cancela) {
    const a = arr; if (!a) return; arr = null; if (a.tm) clearInterval(a.tm); ponGuia(null); document.body.classList.remove('mv-arrastrando');
    a.grupo.forEach((u) => { u.classList.remove('mv-vuelo'); u.style.transform = ''; });
    if (a.movio) { if (!cancela && a.d) { aplica(a.grupo, a.d); estado('Región movida: hoja reacomodada y recalculada'); } }
    else if (!cancela && a.vert) {          // clic suelto en la franja de arriba/abajo (no la izquierda): se comporta como un clic normal en esa línea (cursor en la ecuación)
      const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: a.x0, clientY: a.y0, button: 0, view: G }); ev._mv = true; a.tgt.dispatchEvent(ev);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: a.x0, clientY: a.y0, button: 0, view: G }));
    }
    else if (!cancela) {          // un clic suelto en la franja izquierda = seleccionar
      marca(a.u, !sel.has(a.u)); H().desactiva(); estado(sel.size + ' región(es) seleccionada(s): arrastra para mover · flechas para desplazar · Supr borra · Esc suelta');
    }
  }
  function mueveBanda(e) {
    const b = banda; if (!b.on) { if (Math.abs(e.clientX - b.x0) + Math.abs(e.clientY - b.y0) < 6) return; b.on = true; if (!b.shift) limpiaSel(); b.el = document.createElement('div'); b.el.className = 'mv-banda'; document.body.appendChild(b.el); }
    const x = Math.min(e.clientX, b.x0), y = Math.min(e.clientY, b.y0), w = Math.abs(e.clientX - b.x0), h = Math.abs(e.clientY - b.y0), s = b.el.style;
    s.left = x + 'px'; s.top = y + 'px'; s.width = w + 'px'; s.height = h + 'px';
    for (const f of filas()) for (const u of hijos(f)) { const r = u.getBoundingClientRect(); const dentro = r.width > 0 && r.left < x + w && r.right > x && r.top < y + h && r.bottom > y; if (dentro !== sel.has(u)) marca(u, dentro); }
  }
  document.addEventListener('mousemove', (e) => { if (arr) { arr.ult = e; mueveArr(e); e.preventDefault(); } else if (banda) mueveBanda(e); });
  document.addEventListener('mouseup', (e) => {
    if (arr) { sueltaArr(false); return; }
    if (banda) {
      const b = banda; banda = null; if (b.el) b.el.remove();
      if (b.on) { H().desactiva(); estado(sel.size + ' región(es) seleccionada(s): arrástralas por su borde izquierdo (o Alt+arrastrar) · Supr las borra · Esc cancela'); return; }
      limpiaSel(); const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: b.x0, clientY: b.y0, button: 0, view: G }); ev._mv = true; b.tgt.dispatchEvent(ev);          // clic suelto: lo de siempre (cursor en esa línea)
    }
  });
  // ---------------------------------------------------------------- teclado: Supr borra, Esc suelta, flechas desplazan lo seleccionado
  function enEdicion() { const t = document.activeElement; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  document.addEventListener('keydown', (e) => {
    if (arr && e.key === 'Escape') { sueltaArr(true); e.preventDefault(); return; }
    const l = vivas(); if (!l.length || enEdicion() || (H().hayActivo && H().hayActivo())) return;
    const k = e.key;
    if (k === 'Escape') { limpiaSel(); e.preventDefault(); estado('Selección suelta'); return; }
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault(); H().desactiva(); const fs = new Set(l.map((u) => u.parentElement)); l.forEach((u) => { H().quitaRegs(u); u.remove(); }); sel.clear();
      fs.forEach((f) => { if (f.isConnected && !f.children.length) f.remove(); else normalizaTxt(f); }); termina(); estado(l.length + ' región(es) borrada(s)'); return;
    }
    if (!/^Arrow(Left|Right|Up|Down)$/.test(k)) return;
    e.preventDefault(); const g = enOrden(l), set = new Set(g), p = g[0], q = g[g.length - 1];          // el WPF las corre 8 px; aquí (flujo) cada flecha las pasa al sitio vecino
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      const arriba = k === 'ArrowUp', f = (arriba ? p : q).parentElement, solas = [...f.children].every((c) => set.has(c));
      if (!solas) return aplica(g, { k: arriba ? 'antes' : 'despues', fila: f });
      const v = arriba ? f.previousElementSibling : f.nextElementSibling; if (v && v.classList.contains('fila')) aplica(g, { k: arriba ? 'antes' : 'despues', fila: v });
    } else if (k === 'ArrowLeft') { let v = p.previousElementSibling; while (v && set.has(v)) v = v.previousElementSibling; if (v) aplica(g, { k: 'lado', fila: p.parentElement, ref: v, desp: false }); }
    else { let v = q.nextElementSibling; while (v && set.has(v)) v = v.nextElementSibling; if (v) aplica(g, { k: 'lado', fila: q.parentElement, ref: v, desp: true }); }
  }, true);
  HK.mover = { sel, seleccion: () => vivas(), aplica, destino, limpiaSel, unidades: () => filas().flatMap(hijos) };
})(window);
