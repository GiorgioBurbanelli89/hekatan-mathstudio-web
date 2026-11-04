// Hekatan Math Studio Web — lee las ecuaciones guardadas como TECLAS por el WPF ({R} flecha, {N} Enter, {for} {prog} {return}…)
// y las convierte en líneas de código (for … end, nombre = prog … end) que la web ya sabe calcular.
(function () {
  'use strict';
  const HK = window.HK;
  function fichas(s) {          // {R} {for} {prog}… (letras entre llaves, ≤ 13) o un carácter
    const o = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') { const j = s.indexOf('}', i); if (j > i + 1 && j - i <= 14 && /^[A-Za-z]+$/.test(s.slice(i + 1, j))) { o.push(s.slice(i, j + 1)); i = j; continue; } }
      o.push(s[i]);
    }
    return o;
  }
  const FLECHA = { '{L}': 'ArrowLeft', '{R}': 'ArrowRight', '{U}': 'ArrowUp', '{D}': 'ArrowDown', '{B}': 'Backspace', '{X}': 'Delete', '{H}': 'Home', '{E}': 'End' };
  function teclasACodigo(ini, teclas) {
    const ed = new HK.Editor(document.createElement('canvas'), { tam: 14 }); ed.cargar([]);
    const lineas = [], pila = []; let silenciosa = false, com = null, ret = false;
    const tecla = (k) => ed.tecla({ key: k, preventDefault() {}, ctrlKey: false, metaKey: false, shiftKey: false });
    const sangria = (n) => '  '.repeat(Math.max(0, n));
    const vacia = () => ed.fila.length === 0;
    const texto = () => { if (ed.cierraPalabra) ed.cierraPalabra(' '); return ed.texto().trim(); };          // como las teclas del WPF: D0 → D₀ al terminar la palabra
    const limpia = () => ed.cargar([]);
    const emite = (t, n) => { if (t) lineas.push(sangria(n) + t); };
    const enBorde = () => ed.cur.fila === ed.fila && ed.cur.i === ed.fila.length;          // al final de la línea (no dentro de un exponente, fracción…)
    const volcar = () => { let t = texto(); if (ret) { if (t) t = 'return ' + t; ret = false; } if (t) emite(t, pila.length); limpia(); com = null; };
    const rango = (s) => s.replace(/\s*\.\.\s*/g, ':').replace(/\s*=\s*/, '');
    const cierra = () => { volcar(); const c = pila.pop(); if (c) emite('end', pila.length); };
    for (const ch of ini || '') tecla(ch);
    for (const t of fichas(teclas || '')) {
      if (com !== null) { if (t === '{N}') { volcar(); } else if (t.length === 1) com += t; continue; }
      if (t === '{N}') { volcar(); continue; }
      if (t === '{LB}') { tecla('{'); continue; }
      if (t === '{prog}') {
        const cab = texto().replace(/\s*(≔|:|=)\s*$/, ''); limpia(); emite(cab + ' = prog', pila.length); pila.push({ k: 'prog' }); continue;
      }
      if (t === '{for}' || t === '{while}' || t === '{if}') { volcar(); pila.push({ k: t.slice(1, -1), slot: 0, v: '' }); continue; }
      if (t === '{return}') { ret = true; continue; }
      if (t === '{else}') { volcar(); emite('else', pila.length - 1); continue; }
      if (t === '{break}' || t === '{continue}') { emite(t.slice(1, -1), pila.length); continue; }
      if (t === '{R}' && enBorde()) {
        const c = pila[pila.length - 1];
        if (!c) continue;
        if (c.k === 'prog') { cierra(); continue; }
        if (c.slot === 2 || (c.k !== 'for' && c.slot === 1)) { cierra(); continue; }
        if (c.k === 'for') {
          if (c.slot === 0) { c.v = texto(); limpia(); c.slot = 1; continue; }
          emite('for ' + c.v + ' = ' + rango(texto()), pila.length - 1); limpia(); c.slot = 2; continue;
        }
        emite(c.k + ' ' + texto(), pila.length - 1); limpia(); c.slot = 1; continue;          // while / if: condición → cuerpo
      }
      if (t === '%') { ed.cur = { fila: ed.fila, i: ed.fila.length }; com = ''; continue; }          // «%texto»: comentario al final de la línea (no se calcula)
      if (t === '{T}') { ed.cur = { fila: ed.fila, i: ed.fila.length }; continue; }
      if (t === '{S') continue;
      if (FLECHA[t]) { tecla(FLECHA[t]); continue; }
      if (t.length === 1) { if (t === ';' && vacia() && !pila.length && !lineas.length) { silenciosa = true; continue; } tecla(t); }
    }
    while (pila.length) cierra(); volcar();
    return { codigo: lineas.join('\n'), notacion: silenciosa };
  }
  HK.teclasACodigo = teclasACodigo;
})();
