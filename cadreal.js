// Hekatan CAD REAL en Hekatan Math Studio web: la MISMA ventana de dibujo de Hekatan LISP (LispCad.js, copia tal cual de hekatan-lisp/LispCad.js).
// Va dentro de un iframe a pantalla completa (igual que Hekatan LISP web: el CAD corre en la pagina del resultado) con el mismo contrato de mensajes:
//   hoja → CAD : <script id="x-cad"> con {nombre, ud, rejilla, pal, capas, ents = pares DXF}      CAD → hoja : {hkCad:'guardar', nombre, cuerpo} · {hkCad:'cerrar'}
// «Guardar en la hoja» escribe el cuerpo ((entmake '(...)) por entidad) en el bloque CAD y lo redibuja. El editor simple (cadeditor.js) queda como respaldo.
(function (G) {
  const HK = G.HK; let marco = null, rec = null, nombre = 'dibujo1';
  const ES_TXT = new Set([1, 2, 3, 6, 7, 8, 100, 0, 410]);
  // grupos del motor ({c, v[], par}) → pares DXF [[0,"LINE"],[10,[x,y,z]],[40,1.0],…] (lo que entrega entget)
  function aPares(ent) { return ent.map((g) => g.par ? [g.c, g.v[0]] : [g.c, g.v.length > 1 ? g.v.map(Number) : g.v[0]]); }
  function datos(r) {
    const ents = r && r.ents ? r.ents : [], capas = [], vistas = new Set();
    const cm = (r && r.ents && r.ents.capas) || {};
    const add = (n, c) => { if (vistas.has(n)) return; vistas.add(n); capas.push({ n, c: Math.abs(c || 7), tipo: 'CONTINUOUS' }); };
    add('0', cm['0'] ? cm['0'].c : 7);
    for (const n of Object.keys(cm)) add(n, cm[n].c);
    for (const e of ents) for (const g of e) if (g.c === 8 && g.par) add(String(g.v[0]), 7);
    return { nombre, ud: 'm', rejilla: 0, pal: {}, capas, ents: ents.map(aPares) };
  }
  function cierra() { if (marco) { marco.remove(); marco = null; } removeEventListener('message', alMensaje); }
  function alMensaje(e) {
    const m = e.data;
    if (!marco || !m || typeof m !== 'object' || !m.hkCad || e.source !== marco.contentWindow) return;
    if (m.hkCad === 'cerrar') { cierra(); return; }
    if (m.hkCad === 'struct' && m.url) { if (/^https:\/\//i.test(String(m.url))) G.open(String(m.url), '_blank', 'noopener,noreferrer'); return; }
    if (m.hkCad !== 'guardar') return;
    const cod = String(m.cuerpo || '');
    if (rec && HK.hoja.reg && HK.hoja.reg.indexOf(rec) >= 0) { rec.ta.value = cod; rec.dibuja(); }
    else { rec = HK.hoja.nuevoCad(cod); }
    if (HK.app && HK.app.estado) HK.app.estado('Hekatan CAD: dibujo guardado en la hoja');
  }
  function abre(r) {
    if (marco) return;
    rec = r || null;
    const cs = getComputedStyle(document.documentElement), v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    const id = 'hkdib1', dat = JSON.stringify(datos(rec)).replace(/</g, '\u003c').replace(/>/g, '\u003e').replace(/&/g, '\u0026').replace(/\u2028/g, '\u2028').replace(/\u2029/g, '\u2029');
    const css = ':root{--bg:' + v('--bg', '#ffffff') + ';--fg:' + v('--fg', '#222222') + ';--sep:' + v('--sep', '#bbbbbb') + ';--mut:' + v('--mut', '#777777') + ';--var:' + v('--var', '#1c5fbf') + '}html,body{margin:0;background:transparent}';
    marco = document.createElement('iframe'); marco.className = 'hkcad-marco'; marco.setAttribute('sandbox', 'allow-scripts allow-modals allow-popups allow-downloads');
    marco.setAttribute('style', 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100000;background:transparent');
    marco.srcdoc = '<!doctype html><meta charset="utf-8"><style>' + css + '</style><body><script type="application/json" id="' + id + '-cad">' + dat + '<\/script>' +
      '<script src="' + new URL('LispCad.js', document.baseURI).href + '"><\/script><script>hkCadAbrir("' + id + '")<\/script></body>';
    marco.onload = () => { try { marco.contentWindow.focus(); } catch (x) { } };
    document.body.appendChild(marco); addEventListener('message', alMensaje);
  }
  HK.cadReal = { abre, cierra, datos, aPares };
})(window);
