// Regla de Jorge: nada fuera del margen. Revisa cada línea (.fila) de la hoja: no puede cruzar un corte de página ni caer en los márgenes.
//   node tests/margenes.mjs ejemplos/X.hmath
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1100, height: 900 });
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
for (const h of process.argv.slice(2)) {
  await pg.evaluate((t) => { HK.hoja.abre(t); }, fs.readFileSync(path.resolve(AQUI, h), 'utf8')); await new Promise((o) => setTimeout(o, 3500));
  const r = await pg.evaluate(() => {
    const papel = document.getElementById('papel'), P = papel.getBoundingClientRect(), cs = getComputedStyle(papel), mt = parseFloat(cs.paddingTop), mb = parseFloat(cs.paddingBottom), PGH = 1056, util = PGH - mt - mb, mal = [], n = [];
    for (const f of document.querySelectorAll('#hoja > .fila')) {
      const b = f.getBoundingClientRect(), t = b.top - P.top, bo = b.bottom - P.top; if (!b.height) continue; n.push(1);
      const k = Math.floor(t / PGH), ini = k * PGH + mt, fin = (k + 1) * PGH - mb, alto = bo - t;
      const txt = (f.textContent || '').trim().slice(0, 40) || [...f.children].map((c) => c.className).join(',');
      if (alto > util + 1) mal.push({ t: 'más alto que la página útil', alto: Math.round(alto), y: Math.round(t), txt });
      else if (t < ini - 1) mal.push({ t: 'en el margen superior', y: Math.round(t), pag: k + 1, txt });
      else if (bo > fin + 1) mal.push({ t: 'cruza el margen inferior/corte', y: Math.round(t), fondo: Math.round(bo), limite: fin, pag: k + 1, txt });
    }
    // el número de página no debe pisar ninguna gráfica / ecuación
    const nums = [...papel.querySelectorAll('.pg:not(.encab):not(.pie)')].map((e) => e.getBoundingClientRect());
    const pisa = []; for (const e of document.querySelectorAll('#hoja canvas')) { const b = e.getBoundingClientRect(); for (const q of nums) if (b.left < q.right && b.right > q.left && b.top < q.bottom && b.bottom > q.top) pisa.push(Math.round(b.top - P.top)); }
    return { filas: n.length, mal, pisa };
  });
  console.log(h, JSON.stringify({ filas: r.filas, violaciones: r.mal.length, pisaNumero: r.pisa.length })); r.mal.slice(0, 12).forEach((m) => console.log('  ', JSON.stringify(m)));
}
await nav.close(); srv.close();
