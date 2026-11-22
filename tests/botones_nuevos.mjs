// Botones que antes estaban apagados: Código ⇄ Nodos, Ocultar bloque, PNG hoja/ventana, Marcas, Letra de variables/cifras, Definir (=).   node tests/botones_nuevos.mjs
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css', '.hmath': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, '127.0.0.1', o));
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1285, height: 800 });
const err = []; pg.on('pageerror', (e) => err.push(e.message));
const esp = (ms) => new Promise((r) => setTimeout(r, ms)); let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html'); await pg.waitForFunction('HK.motor.listo || HK.motor.error', { timeout: 60000 });
await pg.evaluate(() => HK.hoja.abre(JSON.stringify({ formato: 'hmath 1', eq: 14, txt: 16, gap: 6, fmt: 0, items: [{ t: 'texto', text: 'Título', titulo: true, nivel: 1 }, { t: 'eq', codigo: 'a = 2' }, { t: 'eq', codigo: 'b = a^2 + 1' }] }))); await esp(200);
const pest = async (n) => { await pg.evaluate((n) => [...document.querySelectorAll('#pestanas button')].find((b) => b.textContent.trim() === n).click(), n); await esp(60); };
const btn = async (t) => { await pg.evaluate((t) => { const b = [...document.querySelectorAll('#cinta .bt')].find((x) => x.textContent.trim().replace(/\s+/g, ' ').endsWith(t)); if (!b) throw new Error('no hay botón ' + t); b.click(); }, t); await esp(150); };
const activaUltima = () => pg.evaluate(() => { const l = HK.hoja.reg.filter((r) => r.ed); HK.hoja.activar(l[l.length - 1]); });
const barra = () => pg.evaluate(() => document.getElementById('msg').textContent);
// Definir: el botón muestra «=» y al pulsarlo se dibuja «=»
await pest('Matemática'); const ic = await pg.evaluate(() => [...document.querySelectorAll('#cinta .bt')].filter((x) => /Definir/.test(x.textContent)).map((x) => x.textContent.trim()));
ok(ic.length && ic.every(t => /≔/.test(t) && !/:=/.test(t)), 'el botón Definir muestra «≔» sin «:=»: ' + JSON.stringify(ic));
// Código ⇄ Nodos
await pest('Formato'); await activaUltima(); await btn('Código ⇄ Nodos');
let s = await pg.evaluate(() => { const ta = document.querySelector('.fila textarea.cod'); return ta ? ta.value : null; }); ok(s === 'b=a^2+1', 'Código ⇄ Nodos muestra el código: ' + s);
await pg.evaluate(() => { const ta = document.querySelector('.fila textarea.cod'); ta.value = 'b = a^3 + 1'; ta.dispatchEvent(new Event('input', { bubbles: true })); }); await esp(100);
await btn('Código ⇄ Nodos'); s = await pg.evaluate(() => HK.hoja.reg.filter((r) => r.ed).map((r) => r.ed.texto())); ok(/a\^\(?3/.test(s[1]) && !(await pg.$('.fila textarea.cod')), 'al volver a nodos queda el código editado: ' + s.join(' | '));
// Ocultar bloque
await activaUltima(); await btn('Ocultar bloque'); let vis = await pg.evaluate(() => [...document.querySelectorAll('#hoja .eq')].map((e) => getComputedStyle(e).display)); ok(vis.includes('none'), 'Ocultar bloque esconde la región activa: ' + vis.join(','));
const hm = await pg.evaluate(() => JSON.parse(HK.hoja.guarda()).items.filter((i) => i.oculto).length); ok(hm === 1, 'el bloque oculto se guarda en el .hmath (' + hm + ')');
await pg.keyboard.down('Control'); await pg.keyboard.down('Shift'); await pg.keyboard.press('h'); await pg.keyboard.up('Shift'); await pg.keyboard.up('Control'); await esp(80);
vis = await pg.evaluate(() => [...document.querySelectorAll('#hoja .eq')].map((e) => getComputedStyle(e).display)); ok(!vis.includes('none'), 'Ctrl+Mayús+H muestra los bloques ocultos');
// Marcas
await pest('Disposición'); await btn('Marcas'); ok(await pg.evaluate(() => document.body.classList.contains('marcas')), 'Marcas de párrafo: ' + await barra());
// Letra de variables y de cifras
await pest('Formato matemático'); const sels = await pg.evaluate(() => [...document.querySelectorAll('#cinta select')].length); ok(sels >= 2, 'hay listas de Letra de variables y de cifras (' + sels + ')');
const w0 = await pg.evaluate(() => HK.hoja.reg.filter((r) => r.ed)[1].ed.canvas.getBoundingClientRect().width);
await pg.evaluate(() => { const q = [...document.querySelectorAll('#cinta .grupo-t')].find((g) => /variables/.test(g.textContent)).querySelector('select'); q.value = 'Consolas'; q.dispatchEvent(new Event('change')); }); await esp(150);
const w1 = await pg.evaluate(() => HK.hoja.reg.filter((r) => r.ed)[1].ed.canvas.getBoundingClientRect().width); ok(w1 !== w0 && await pg.evaluate(() => HK.fuentes.v === 'Consolas'), `cambiar la letra de las variables redibuja (${w0} → ${w1})`);
await pg.evaluate(() => { const q = [...document.querySelectorAll('#cinta .grupo-t')].find((g) => /variables/.test(g.textContent)).querySelector('select'); q.value = 'Georgia'; q.dispatchEvent(new Event('change')); });
// PNG
await pest('Capturar'); await btn('PNG hoja'); await esp(800);
const png = await pg.evaluate(() => HK.ultimaCaptura ? { w: HK.ultimaCaptura.w, h: HK.ultimaCaptura.h, n: HK.ultimaCaptura.url.length } : null); ok(png && png.w > 700 && png.n > 5000, 'PNG hoja: ' + JSON.stringify(png));
if (png) fs.writeFileSync(path.join(AQUI, 'tests', 'salida', 'png_hoja.png'), Buffer.from(await pg.evaluate(() => HK.ultimaCaptura.url.split(',')[1]), 'base64'));
await btn('PNG ventana'); await esp(800); const pv = await pg.evaluate(() => HK.ultimaCaptura && HK.ultimaCaptura.h); ok(pv > 300, 'PNG ventana: alto ' + pv);
ok(!err.length, err.length ? 'errores JS: ' + err.join(' | ') : 'sin errores de JS'); await nav.close(); srv.close(); process.exit(fallos ? 1 : 0);
