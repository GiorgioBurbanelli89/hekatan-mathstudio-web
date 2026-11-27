// Hekatan Math Studio Web — editar en el CELULAR (pantalla táctil).
// Las ecuaciones se dibujan en un <canvas> y el teclado se lee en document.keydown: en el PC basta, pero en Android/iOS
// el teclado del teléfono SOLO aparece si hay un campo de texto enfocado. Aquí: al tocar una ecuación se enfoca un campo
// invisible (#hk-teclado) dentro del mismo gesto (click) → sale el teclado; lo que se escribe pasa al editor de nodos
// tecla por tecla, y abajo aparece una barra con ◀ ▶ ^ √ ⌫ ↶ · Cancelar · Aceptar. En el PC (ratón) no cambia nada.
(function (G) {
  const HK = G.HK || (G.HK = {});
  let tToque = -1e9;          // último dedo puesto en la pantalla (pointerdown táctil)
  G.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' || e.pointerType === 'pen') tToque = Date.now(); else if (e.pointerType === 'mouse') tToque = -1e9; }, true);
  G.addEventListener('touchstart', () => { tToque = Date.now(); }, { capture: true, passive: true });
  const reciente = () => Date.now() - tToque < 1500;          // el mousedown / click que el navegador fabrica tras un toque llega ~0–300 ms después

  const H = () => HK.hoja;
  let inp = null, barra = null, edAb = null, snap0 = null, previo = ' ', compon = false;
  const BASE = ' ';          // un espacio de guarda: así el teclado siempre tiene algo que borrar y el ⌫ llega como «input»
  const tecla = (k, extra) => { const ed = H() && H().activa(); if (!ed) return; ed.tecla(Object.assign({ key: k, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, extra || {})); if (HK.sug) setTimeout(() => { if (H().activa() === ed) HK.sug.actualiza(ed); }, 0); };
  const reg = (ed) => H().reg.find((r) => r.ed === ed);
  function crea() {
    if (inp) return;
    inp = document.createElement('input'); inp.id = 'hk-teclado'; inp.type = 'text'; inp.dataset.hkTeclado = '1';
    inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocorrect', 'off'); inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('spellcheck', 'false'); inp.setAttribute('inputmode', 'text'); inp.setAttribute('enterkeyhint', 'done'); inp.setAttribute('aria-label', 'Editar la ecuación');
    document.body.appendChild(inp);
    barra = document.createElement('div'); barra.id = 'hk-barra-tactil';
    const B = [['◀', 'Cursor a la izquierda', () => tecla('ArrowLeft')], ['▶', 'Cursor a la derecha', () => tecla('ArrowRight')], ['^', 'Exponente', () => tecla('^')], ['√', 'Raíz', () => tecla('r', { ctrlKey: true })], ['⌫', 'Borrar', () => tecla('Backspace')], ['↶', 'Deshacer (Ctrl+Z)', () => tecla('z', { ctrlKey: true })], ['✕', 'Cancelar: deja la ecuación como estaba', cancela, 'no'], ['✓ Aceptar', 'Termina de editar', acepta, 'si']];
    for (const [t, tip, fn, cl] of B) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if (tip) b.title = tip; if (cl) b.className = cl;
      // el botón NO le quita el foco al campo (el teclado sigue abierto): touchstart/mousedown sin acción por defecto, y la acción va en pointerup
      b.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); fn(); if (fn !== acepta && fn !== cancela && inp && document.activeElement !== inp && H().activa()) inp.focus({ preventScroll: true }); });
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (e.detail === 0) fn(); });          // solo activación por teclado (Enter/espacio sobre el botón); el dedo y el ratón ya actuaron en pointerup
      barra.appendChild(b);
    }
    document.body.appendChild(barra);
    inp.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return;          // teclado virtual: el texto llega por «input»
      if (HK.sug && HK.sug.visible && HK.sug.visible() && HK.sug.tecla(e)) { e.preventDefault(); return; }
      const k = e.key;
      if (k === 'Enter') { e.preventDefault(); acepta(); return; }
      if (k === 'Escape') { e.preventDefault(); cancela(); return; }
      if (k === 'Tab') { e.preventDefault(); return; }
      if (k.length === 1 || /^(Backspace|Delete|Arrow(Left|Right|Up|Down)|Home|End)$/.test(k)) { e.preventDefault(); tecla(k, { ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey }); }          // teclado físico (o Bluetooth) en el celular
    });
    inp.addEventListener('compositionstart', () => { compon = true; });
    inp.addEventListener('compositionend', () => { compon = false; aplica(); });
    inp.addEventListener('input', () => aplica());
    inp.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== inp) oculta(); }, 0); });
    if (G.visualViewport) { const ub = () => { if (!barra || !barra.classList.contains('on')) return; const v = G.visualViewport; barra.style.bottom = Math.max(0, G.innerHeight - (v.height + v.offsetTop)) + 'px'; }; G.visualViewport.addEventListener('resize', () => { compacto(); ub(); setTimeout(visible, 60); /* tras el reacomodo de la hoja */ }); G.visualViewport.addEventListener('scroll', ub); }
  }
  function aplica() {          // lo que cambió en el campo (diferencia con lo anterior) → teclas para el editor de nodos
    const v = inp.value; let p = 0; while (p < v.length && p < previo.length && v[p] === previo[p]) p++;
    for (let i = previo.length - p; i > 0; i--) tecla('Backspace');
    for (const c of v.slice(p)) { if (c === '\n') { acepta(); return; } tecla(c); }
    previo = v;
    if (!compon) { inp.value = BASE; previo = BASE; try { inp.setSelectionRange(BASE.length, BASE.length); } catch (e) { /* algunos tipos no lo admiten */ } }
  }
  function compacto() { const v = G.visualViewport; document.body.classList.toggle('tactil-compacto', !!(v && barra && barra.classList.contains('on') && v.height < 330)); }          // teclado arriba en HORIZONTAL: casi no queda alto → se esconden título, menú y cinta mientras se edita
  function visible() { const r = edAb && reg(edAb); if (!r || !r.el || !barra.classList.contains('on')) return; const b = r.el.getBoundingClientRect(), v = G.visualViewport, alto = v ? v.height + v.offsetTop : G.innerHeight; if (b.bottom > alto - 56 || b.top < 60) r.el.scrollIntoView({ block: 'center' }); }
  function pon() { const r = edAb && reg(edAb); if (!r || !r.ed.canvas) return; const b = r.ed.canvas.getBoundingClientRect(); inp.style.left = Math.max(0, Math.min(G.innerWidth - 40, b.left)) + 'px'; inp.style.top = Math.max(0, Math.min(G.innerHeight - 30, b.top)) + 'px'; }
  function abre(ed) {          // DEBE llamarse dentro del gesto del usuario (click/touchend): solo así Android abre el teclado
    crea(); if (!ed) return;
    if (ed !== edAb || !barra.classList.contains('on')) { edAb = ed; snap0 = { f: JSON.stringify(ed.clona(ed.fila)), rt: ed.ruta(ed.cur) }; }
    pon(); inp.value = BASE; previo = BASE; compon = false;
    barra.classList.add('on'); document.body.classList.add('tactil-editando');
    if (document.activeElement !== inp) inp.focus({ preventScroll: true });
    try { inp.setSelectionRange(BASE.length, BASE.length); } catch (e) { /* nada */ }
    if (G.visualViewport) { const v = G.visualViewport; barra.style.bottom = Math.max(0, G.innerHeight - (v.height + v.offsetTop)) + 'px'; }
    setTimeout(visible, 350);
  }
  function oculta() { if (barra) barra.classList.remove('on'); document.body.classList.remove('tactil-editando', 'tactil-compacto'); }
  function cierra() { edAb = null; snap0 = null; oculta(); if (inp && document.activeElement === inp) inp.blur(); if (HK.sug) HK.sug.oculta(); }
  function acepta() { const ed = H() && H().activa(); cierra(); if (ed) H().desactiva(); if (HK.app && HK.app.estado) HK.app.estado('Ecuación aceptada'); }
  function cancela() { const ed = edAb, s = snap0; cierra(); if (ed && s) ed.restaura(s); H().desactiva(); if (HK.app && HK.app.estado) HK.app.estado('Edición cancelada: la ecuación quedó como estaba'); }
  // tras un TOQUE: si quedó una ecuación activa y no hay otro campo enfocado (texto, deslizador…), se abre el teclado
  document.addEventListener('click', (e) => {
    if (!reciente() || !H()) return;
    if (barra && barra.contains(e.target)) return;
    const ae = document.activeElement, enCampo = ae && ae !== inp && (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
    const ed = H().activa();
    if (ed && !enCampo) abre(ed); else if (!ed) cierra();
  });
  // TEXTO (contenteditable) en el celular: cuando sube el teclado (la vista visible se achica) el renglón del cursor se lleva a la vista
  if (G.visualViewport) G.visualViewport.addEventListener('resize', () => {
    const a = document.activeElement; if (!a || a === inp || !a.isContentEditable) return;
    const sl = getSelection(); if (!sl.rangeCount) return; let rc = sl.getRangeAt(0).getBoundingClientRect(); if (!rc || (!rc.height && !rc.top)) rc = a.getBoundingClientRect();
    const v = G.visualViewport, alto = v.height + v.offsetTop; if (rc.bottom > alto - 12 || rc.top < 50) setTimeout(() => { const ar = document.getElementById('area'); if (ar) ar.scrollTop += rc.top - (alto / 2); }, 60);
  });
  HK.tactil = { reciente, abre, acepta, cancela, campo: () => inp, editando: () => !!(barra && barra.classList.contains('on')) };
})(window);
