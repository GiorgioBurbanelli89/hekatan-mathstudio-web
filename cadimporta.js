// Puente con Hekatan CAD (visor DWG): importa un .dxf (el que baja el visor) a un bloque CAD de la hoja.
// El DXF se lee como pares (código, valor); cada entidad pasa a la lista DXF de AutoLISP: (entmake '((0 . "LINE") (10 x y z) …)),
// el mismo formato que usa «Dibujar» (LispCad.js) y que entiende el motor (cad.js). Entidades: LINE, CIRCLE, ARC, LWPOLYLINE, TEXT/MTEXT, POINT.
(function (G) {
  const HK = G.HK;
  function pares(txt) {
    const L = String(txt).split(/\r?\n/), o = [];
    for (let i = 0; i + 1 < L.length; i += 2) { const c = parseInt(L[i].trim(), 10); if (isNaN(c)) { i--; continue; } o.push([c, L[i + 1].trim()]); }
    return o;
  }
  const n = (v) => { const x = parseFloat(v); return isFinite(x) ? +x.toFixed(6) : 0; };
  const BS = String.fromCharCode(92);
  const cad = (s) => '"' + String(s).split(BS).join(BS + BS).split('"').join(BS + '"') + '"';
  function entidades(txt) {
    const P = pares(txt), out = []; let i = 0;
    while (i < P.length && !(P[i][0] === 2 && P[i][1] === 'ENTITIES')) i++;
    for (i++; i < P.length; i++) {
      if (P[i][0] === 0 && P[i][1] === 'ENDSEC') break;
      if (P[i][0] !== 0) continue;
      const tipo = P[i][1], g = []; let j = i + 1;
      while (j < P.length && P[j][0] !== 0) { g.push(P[j]); j++; }
      out.push({ tipo, g }); i = j - 1;
    }
    return out;
  }
  const MAX_ENT = 5000,  /* 20000 revienta la memoria del motor WASM (>12000 ya falla) y cada entidad cuesta ~4 ms */ MAX_VERT = 2000, MAX_BYTES = 5 * 1024 * 1024;
  const malo = (v) => { const x = parseFloat(v); return !isFinite(x) || Math.abs(x) > 1e12; };
  function una(e) {
    if (e.g.some((q) => [10, 11, 20, 21, 30, 31, 40, 50, 51].indexOf(q[0]) >= 0 && malo(q[1]))) return null;          // coordenadas no finitas: se ignora la entidad
    const f = (c) => { const q = e.g.find((x) => x[0] === c); return q ? q[1] : null; }, capa = f(8) || '0', pre = '(0 . "' + e.tipo + '") (8 . ' + cad(capa) + ')';
    if (e.tipo === 'LINE') return "(entmake '(" + pre + ' (10 ' + n(f(10)) + ' ' + n(f(20)) + ' ' + n(f(30)) + ') (11 ' + n(f(11)) + ' ' + n(f(21)) + ' ' + n(f(31)) + ')))';
    if (e.tipo === 'CIRCLE') return "(entmake '(" + pre + ' (10 ' + n(f(10)) + ' ' + n(f(20)) + ' ' + n(f(30)) + ') (40 . ' + n(f(40)) + ')))';
    if (e.tipo === 'ARC') return "(entmake '(" + pre + ' (10 ' + n(f(10)) + ' ' + n(f(20)) + ' ' + n(f(30)) + ') (40 . ' + n(f(40)) + ') (50 . ' + n(f(50)) + ') (51 . ' + n(f(51)) + ')))';
    if (e.tipo === 'POINT') return "(entmake '(" + pre + ' (10 ' + n(f(10)) + ' ' + n(f(20)) + ' ' + n(f(30)) + ')))';
    if (e.tipo === 'TEXT' || e.tipo === 'MTEXT') return "(entmake '((0 . \"TEXT\") (8 . " + cad(capa) + ') (10 ' + n(f(10)) + ' ' + n(f(20)) + ' ' + n(f(30)) + ') (40 . ' + n(f(40) || 0.25) + ') (1 . ' + cad((f(1) || '').split(BS + 'P').join(' ')) + ')))';
    if (e.tipo === 'LWPOLYLINE') {
      const v = []; let x = null; for (const [c, val] of e.g) { if (v.length >= MAX_VERT) break; if (c === 10) x = n(val); else if (c === 20 && x !== null) { v.push('(10 ' + x + ' ' + n(val) + ')'); x = null; } }
      return v.length > 1 ? "(entmake '(" + pre + ' (70 . ' + (parseInt(f(70) || '0', 10) & 1) + ') ' + v.join(' ') + '))' : null;
    }
    return null;
  }
  function aEntmake(txt) {
    const ents = entidades(txt), ls = [], omit = {};
    for (const e of ents) { const s = una(e); if (s) ls.push(s); else omit[e.tipo] = (omit[e.tipo] || 0) + 1; }
    return { lineas: ls, omitidas: omit, total: ents.length };
  }
  // Abre el selector de archivos y crea un bloque CAD nuevo con el DXF
  function importaDxf(txt, nombre) {
    if (String(txt).length > MAX_BYTES) { HK.app.estado('DXF demasiado grande (más de 5 MB): no se importó'); return false; }
    const r = aEntmake(txt); if (!r.lineas.length) { HK.app.estado('El DXF no trae entidades que sepa leer (LINE, CIRCLE, ARC, LWPOLYLINE, TEXT, POINT)'); return false; }
    let corte = '';
    if (r.lineas.length > MAX_ENT) { corte = 'DXF muy grande: se importaron las primeras ' + MAX_ENT + ' de ' + r.lineas.length; r.lineas = r.lineas.slice(0, MAX_ENT); }
    HK.hoja.nuevoCad(';; Dibujo AutoLISP (Hekatan Math Studio): importado de ' + (nombre || 'DXF') + ' (Hekatan CAD)\n' + r.lineas.join('\n'));
    const om = Object.keys(r.omitidas).map((k) => k + ' ×' + r.omitidas[k]).join(', ');
    HK.app.estado(corte || ('DXF importado: ' + r.lineas.length + ' entidades' + (om ? ' · no soportadas: ' + om : '')));
    return true;
  }
  function elige() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.dxf'; i.onchange = () => { const f = i.files[0]; if (!f) return; if (f.size > MAX_BYTES) { HK.app.estado('DXF demasiado grande (más de 5 MB): no se importó'); return; } const rd = new FileReader(); rd.onload = () => importaDxf(String(rd.result), f.name); rd.readAsText(f); }; i.click();
  }
  HK.cadImporta = { importaDxf, aEntmake, elige, MAX_ENT, MAX_VERT, MAX_BYTES };
})(window);
