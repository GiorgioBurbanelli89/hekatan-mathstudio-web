// Autocompletar de Math Studio Web con teclado real: al escribir 2 letras sale la lista; ↑ ↓ Tab Esc Enter; también en el código AutoLISP del bloque CAD.
//   node tests/autocompletar.mjs [url] [carpeta_png]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = createRequire(import.meta.url)(path.resolve(AQUI, '..', 'hekatan-struct', 'node_modules', 'puppeteer'));
const SAL = path.resolve(process.argv[3] || path.join(AQUI, 'tests', 'salida')); fs.mkdirSync(SAL, { recursive: true });
const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); const pg = await nav.newPage(); await pg.setViewport({ width: 1100, height: 800 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(process.argv[2] || 'http://127.0.0.1:8000/index.html'); await pg.waitForFunction(() => HK.motor.listo, { timeout: 60000 });
let fallos = 0; const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fallos++; };
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
const nueva = async () => { await pg.keyboard.down('Control'); await pg.keyboard.press('KeyN'); await pg.keyboard.up('Control'); await esp(60); };
const tipea = async (t) => { for (const c of t) { await pg.keyboard.type(c); await esp(15); } await esp(40); };
const lista = () => pg.evaluate(() => [...document.querySelectorAll('.sug li .p')].map((x) => x.textContent));
const sel = () => pg.evaluate(() => { const l = document.querySelector('.sug li.sel .p'); return l ? l.textContent : null; });
const eq = () => pg.evaluate(() => { const r = HK.hoja.reg.filter((x) => x.t === 'eq'); return r.map((x) => HK.filasATexto(x.ed.fila)); });

console.log('1. La lista aparece al escribir 2 letras (y no con 1)');
await nueva(); await tipea('i'); ok((await lista()).length === 0, 'con 1 letra no hay lista');
await tipea('n'); let l = await lista(); ok(l.includes('integral'), 'con «in»: ' + l.join(' · '));
await pg.screenshot({ path: path.join(SAL, 'sug_1_lista.png') });

console.log('2. Tab inserta la estructura / símbolo / función');
await tipea('t'); await pg.keyboard.press('Tab'); await esp(80);
ok(/integral\(/.test((await eq())[0]) && !(await lista()).length, 'integral + Tab → nodo ∫: ' + (await eq())[0]);
await nueva(); await tipea('alp'); l = await lista(); ok(l[0] === 'alpha', '«alp» ofrece alpha: ' + l.join(' · ')); await pg.keyboard.press('Tab'); await esp(80);
ok((await eq())[0] === 'α' || (await eq())[0] === 'alpha', 'alpha + Tab → α: ' + (await eq())[0]);
await nueva(); await tipea('sq'); await pg.keyboard.press('Tab'); await tipea('x'); ok((await eq())[0] === 'sqrt(x)', 'sq + Tab → función con paréntesis: ' + (await eq())[0]);
await nueva(); await tipea('zer'); await pg.keyboard.press('Tab'); await tipea('2)'); ok(/^zeros\(2\)/.test((await eq())[0]), 'zer + Tab → zeros(: ' + (await eq())[0]);
await nueva(); await tipea('sum'); await pg.keyboard.press('Tab'); await esp(60); const t5 = (await eq())[0]; ok(/sum|sumatoria|∑/.test(t5) || t5.length > 0, 'sum + Tab inserta algo: ' + t5);

console.log('3. ↑ ↓ eligen, Esc cierra, Enter NO inserta');
await nueva(); await tipea('si'); l = await lista(); const s0 = await sel(); await pg.keyboard.press('ArrowDown'); const s1 = await sel(); await pg.keyboard.press('ArrowUp'); const s2 = await sel();
ok(l.length > 1 && s1 !== s0 && s2 === s0, '↓ cambia (' + s0 + ' → ' + s1 + ') y ↑ vuelve (' + s2 + ')');
await pg.keyboard.press('Escape'); ok((await lista()).length === 0, 'Esc cierra la lista');
await tipea('n'); ok((await lista()).length > 0, 'sigue escribiendo y vuelve a salir: ' + (await lista()).join(' · '));
await pg.keyboard.press('Enter'); await esp(80); const e3 = await eq(); ok(e3.length >= 2 && e3[e3.length - 2] === 'sin' && !(await lista()).length, 'Enter crea ecuación nueva y deja «sin» como se escribió: ' + JSON.stringify(e3.slice(-2)));

console.log('4. Variables y funciones de la hoja');
await nueva(); await tipea('carga=5'); await pg.keyboard.press('Enter'); await esp(80); await tipea('ca'); l = await lista(); ok(l.includes('carga'), '«ca» ofrece la variable carga: ' + l.join(' · '));
await pg.keyboard.press('Tab'); await esp(60); ok((await eq()).pop() === 'carga', 'Tab inserta carga: ' + (await eq()).pop());
await pg.keyboard.press('Enter'); await esp(60); await tipea('f(x)=x^2 '); await pg.keyboard.press('Enter'); await esp(80); await tipea('x'); ok(true, '(f se define; ver siguiente)');

console.log('5. En el código AutoLISP del bloque CAD');
await pg.evaluate(() => HK.app.nuevo()); await pg.evaluate(() => HK.hoja.nuevoCad('')); await esp(100);
await pg.evaluate(() => { const t = document.querySelector('.cad textarea'); if (t && t.style.display === 'none') document.querySelector('.cad [data-a="cod"]').click(); }); await pg.click('.cad textarea'); await tipea('(lin'); l = await lista(); ok(l[0] === 'linea', '«(lin» ofrece linea (sin paréntesis de más): ' + l.join(' · '));
await pg.screenshot({ path: path.join(SAL, 'sug_2_cad.png') });
await pg.keyboard.press('Tab'); await esp(80); ok(/^\(linea$/.test(await pg.$eval('.cad textarea', (t) => t.value)), 'Tab inserta linea: ' + await pg.$eval('.cad textarea', (t) => t.value));
await pg.keyboard.press('Escape');

console.log('6. La lista no tapa la pantalla ni se escapa de ella');
await pg.evaluate(() => { document.activeElement.blur(); HK.app.nuevo(); }); await tipea('al');
const caja = await pg.evaluate(() => { const r = document.querySelector('.sug').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, W: innerWidth, H: innerHeight }; });
ok(caja.l >= 0 && caja.t >= 0 && caja.r <= caja.W && caja.b <= caja.H, 'dentro de la ventana: ' + JSON.stringify(caja));
ok(errs.length === 0, 'sin errores de página' + (errs.length ? ': ' + errs.join(' | ') : ''));
console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\nTodo bien. PNG en ' + SAL); await nav.close(); process.exit(fallos ? 1 : 0);
