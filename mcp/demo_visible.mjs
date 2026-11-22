// Abre una ventana REAL de Chrome con la web, teclea una ecuación y la deja abierta 90 s.  node demo_visible.mjs
import { createRequire } from "node:module"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const require = createRequire(import.meta.url);
let puppeteer; try { puppeteer = require("puppeteer"); } catch { puppeteer = require(path.join(AQUI, "..", "hekatan-struct", "node_modules", "puppeteer")); }
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".wasm": "application/wasm", ".css": "text/css", ".hmath": "application/json" };
const srv = http.createServer((q, r) => { const f = path.join(AQUI, decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html"); const ok = fs.existsSync(f) && fs.statSync(f).isFile(); r.writeHead(ok ? 200 : 404, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); if (ok) fs.createReadStream(f).pipe(r); else r.end(); });
await new Promise((o) => srv.listen(0, "127.0.0.1", o));
let nav; try { nav = await puppeteer.launch({ headless: false, channel: "chrome", args: ["--window-size=1400,900"], defaultViewport: null }); } catch { nav = await puppeteer.launch({ headless: false, args: ["--window-size=1400,900"], defaultViewport: null }); }
const pg = await nav.newPage(); await pg.bringToFront(); await pg.goto("http://127.0.0.1:" + srv.address().port + "/index.html"); await pg.waitForFunction("HK.motor.listo || HK.motor.error", { timeout: 60000 });
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
await pg.evaluate(() => [...document.querySelectorAll("#cinta .bt")].find((x) => x.textContent.trim().endsWith("Ecuación")).click()); await esp(600);
for (const c of "a:x^2") { await pg.keyboard.type(c); await esp(250); } await pg.keyboard.press("Space"); await esp(300);
for (const c of "/(y+1)") { await pg.keyboard.type(c); await esp(250); } await pg.keyboard.press("Space"); await pg.keyboard.press("Space"); await esp(300);
for (const c of "+") { await pg.keyboard.type(c); await esp(250); } await pg.keyboard.press("Backslash"); await pg.keyboard.type("2"); await esp(300);
console.log("ventana abierta; se cierra sola en 90 s"); await esp(90000); await nav.close(); srv.close();
