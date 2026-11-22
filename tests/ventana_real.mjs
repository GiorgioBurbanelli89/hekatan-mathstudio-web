// Ventana REAL de Chrome (como la abre el MCP): pide un tamaño mayor que la pantalla y comprueba que el contenido cabe y se ve la barra de estado.
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const [ANCHO, ALTO] = [2400, 1600];          // a propósito mayor que cualquier pantalla
const nav = await puppeteer.launch({ headless: false, channel: 'chrome', defaultViewport: null, args: ['--no-sandbox', '--window-size=' + ANCHO + ',' + ALTO, '--window-position=0,0'] });
const pg = await nav.newPage();
const sc = await pg.evaluate(() => ({ w: screen.availWidth, h: screen.availHeight })), cdp = await pg.createCDPSession(), { windowId } = await cdp.send('Browser.getWindowForTarget');
await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } }); await cdp.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: Math.min(ANCHO, sc.w), height: Math.min(ALTO, sc.h) } });
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
await pg.evaluate((t) => { HK.hoja.abre(t); }, fs.readFileSync(path.resolve(AQUI, 'ejemplos/Funciones_de_forma_2D_CSI.hmath'), 'utf8')); await new Promise((o) => setTimeout(o, 2500));
const m = await pg.evaluate(() => { const e = document.getElementById('estado').getBoundingClientRect(); return { inner: [innerWidth, innerHeight], outer: [outerWidth, outerHeight], pantalla: [screen.availWidth, screen.availHeight], estadoAbajo: Math.round(e.bottom) }; });
console.log(JSON.stringify(m));
const ok = m.outer[0] <= m.pantalla[0] + 16 && m.outer[1] <= m.pantalla[1] + 16 && m.estadoAbajo <= m.inner[1] + 1;
console.log((ok ? '  ✅ ' : '  ❌ ') + 'la ventana cabe en la pantalla y la barra de estado se ve (pedí ' + ANCHO + '×' + ALTO + ')');
if (process.argv[2]) await pg.screenshot({ path: process.argv[2] });
await nav.close(); srv.close(); console.log(ok ? '\nTodo bien' : '\nHay fallos');
