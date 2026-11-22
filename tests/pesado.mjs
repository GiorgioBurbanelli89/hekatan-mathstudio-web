// Un cálculo pesado no se cuelga: avisa y deja decidir. «Continuar» sube el tope a 20 millones y recalcula.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const require = createRequire(import.meta.url);
const puppeteer = require(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const sleep = (ms) => new Promise((o) => setTimeout(o, ms)); let ok = 0, mal = 0; const T = (c, m) => { c ? ok++ : mal++; console.log((c ? '  ✅ ' : '  ❌ ') + m); };
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1300, height: 800 });
await pg.goto('http://127.0.0.1:8000/index.html', { waitUntil: 'networkidle2' }); await sleep(1500);
const vis = () => pg.evaluate(() => { const b = document.getElementById('aviso-pesado'); return !!b && b.style.display !== 'none'; });
await pg.evaluate(() => { HK.hoja.nuevaEq && HK.hoja.nuevaEq(); }); await sleep(300);
const r = await pg.evaluate(() => { HK.M.reinicia(); try { HK.M.paso(2e6); return 'sin error'; } catch (e) { return e.pesado ? 'pesado:' + e.message : 'otro:' + e.message; } });
T(/^pesado:/.test(r), 'pasar de 1 millón lanza el error «pesado» (' + r + ')');
T(await pg.evaluate(() => { HK.M.limite(2e7); HK.M.reinicia(); try { HK.M.paso(2e6); return true; } catch (e) { return false; } finally { HK.M.limite(1e6); } }), 'con permiso (20 millones) 2 millones de pasos sí pasan');
await pg.evaluate(() => { HK.hoja.abre({ formato: 'hmath 1', items: [{ t: 'eq', codigo: 's=sum(k,k,1,3000000)' }] }); }); await sleep(2500);
T(await vis(), 'una suma de 3 millones muestra el aviso «cálculo pesado»');
await pg.screenshot({ path: path.join(AQUI, 'tests', '_pesado.png') });
await pg.evaluate(() => document.querySelector('#aviso-pesado .si').click()); await sleep(6000);
T(!(await vis()), 'tras «Continuar» el aviso se cierra' ); T((await pg.evaluate(() => HK.M.lim())) === 1e6, 'el tope vuelve a 1 millón');
console.log('ok=' + ok + ' fallos=' + mal); await nav.close(); process.exit(mal ? 1 : 0);
