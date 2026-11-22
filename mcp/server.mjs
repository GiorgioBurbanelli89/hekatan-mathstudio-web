#!/usr/bin/env node
/**
 * MCP de Hekatan Math Studio WEB (la interfaz del navegador, NO la de WPF).
 *
 * Levanta su propio servidor estático SIN caché sobre la carpeta de la web, abre la página en un Chrome controlado y deja que Claude:
 *   - VEA (captura de la ventana o de la hoja) y lea el estado (regiones, cuál está activa, tamaños);
 *   - TECLEE como una persona (teclado real), haga clic, doble clic, arrastre y use el menú, las pestañas y los botones de la cinta;
 *   - ABRA hojas .hmath, lea la hoja guardada y MIDA cada ecuación (ancho/alto en px) para compararla con el WPF.
 *
 * Seguridad: solo sirve esta carpeta en 127.0.0.1; no ejecuta JavaScript arbitrario; abrir_hoja solo lee archivos .hmath.
 *   HEKATAN_VISIBLE=1  ventana visible
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const AQUI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const STRUCT = path.resolve(AQUI, "..", "hekatan-struct", "node_modules");
const cargaPuppeteer = () => { try { return require("puppeteer"); } catch { return require(path.join(STRUCT, "puppeteer")); } };
const cargaPng = () => { try { return require("pngjs").PNG; } catch { return require(path.join(STRUCT, "pngjs")).PNG; } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".wasm": "application/wasm", ".css": "text/css", ".hmath": "application/json; charset=utf-8", ".json": "application/json", ".png": "image/png" };

let nav = null, pag = null, servidor = null, base = null;
const consola = [];
const srv = new McpServer({ name: "hekatan-mathstudio-web", version: "0.1.0" });
const texto = (t) => ({ content: [{ type: "text", text: typeof t === "string" ? t : JSON.stringify(t, null, 2) }] });
const falla = (t) => ({ isError: true, content: [{ type: "text", text: t }] });
const sinPagina = () => (pag && !pag.isClosed() ? null : falla("No hay web abierta. Llama primero a `abrir`."));
const pausa = () => esperar(90);

async function sirve() {
  if (servidor) return base;
  servidor = http.createServer((q, r) => {
    const f = path.join(AQUI, decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html");
    const ok = f.startsWith(AQUI) && fs.existsSync(f) && fs.statSync(f).isFile();
    r.writeHead(ok ? 200 : 404, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
    if (ok) fs.createReadStream(f).pipe(r); else r.end();
  });
  await new Promise((o) => servidor.listen(0, "127.0.0.1", o));
  base = "http://127.0.0.1:" + servidor.address().port + "/index.html";
  return base;
}
// Ventana REAL: el contenido ocupa TODA la ventana (defaultViewport: null), sin un viewport emulado de otro tamaño (con eso, si el viewport era más alto o ancho que la
// ventana, abajo se cortaba y no se veía ni la barra de estado ni la flecha para bajar la hoja). Oculta (headless): viewport fijo.
async function lanzar(visible, ancho, alto) {
  const puppeteer = cargaPuppeteer();
  const headless = (visible === false && !process.env.HEKATAN_VISIBLE) ? "new" : false;          // por defecto la ventana es REAL y se trae al frente (regla de Jorge)
  const args = ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=" + (ancho || 1400) + "," + (alto || 900)];
  if (!headless) args.push("--window-position=0,0");
  const opc = { headless, args, ...(headless ? {} : { defaultViewport: null }) };
  try { return await puppeteer.launch({ ...opc, channel: "chrome" }); } catch { return await puppeteer.launch(opc); }
}
// Ajusta la ventana real al tamaño pedido SIN pasarse de la pantalla (availWidth × availHeight)
async function ajustaVentana(pag, ancho, alto) {
  try {
    const sc = await pag.evaluate(() => ({ w: screen.availWidth, h: screen.availHeight })), cdp = await pag.createCDPSession(), { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { left: 0, top: 0, width: Math.min(ancho || 1400, sc.w), height: Math.min(alto || 900, sc.h) } });
    await cdp.detach();
  } catch { /* si el navegador no deja, queda como lanzó */ }
}

// Trae al frente la ventana de Chrome que muestra la web (user32: ShowWindow + BringWindowToTop + SetForegroundWindow + minimizar/restaurar para saltar el bloqueo de foco)
function alFrente() {
  const ps = `Add-Type -Name W -Namespace U -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h); [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr a,int x,int y,int w,int c,uint f);';
Get-Process | ? { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like '*Hekatan Math Studio*' -and $_.ProcessName -match 'chrome|msedge' } | % { $h=$_.MainWindowHandle; [U.W]::ShowWindow($h,6)|Out-Null; [U.W]::ShowWindow($h,9)|Out-Null; [U.W]::SetWindowPos($h,[IntPtr](-1),0,0,0,0,3)|Out-Null; [U.W]::SetWindowPos($h,[IntPtr](-2),0,0,0,0,3)|Out-Null; [U.W]::BringWindowToTop($h)|Out-Null; [U.W]::SetForegroundWindow($h)|Out-Null }`;
  return new Promise((r) => execFile("powershell", ["-NoProfile", "-Command", ps], { timeout: 10000 }, () => r()));
}

srv.tool("abrir",
  "Abre Hekatan Math Studio WEB (sirve la carpeta sin caché) y espera al motor simbólico. Por defecto abre una ventana REAL y la trae al frente; `visible:false` la corre oculta. `ejemplo` = archivo de ejemplos/ (p. ej. Funciones_de_forma.hmath).",
  { visible: z.boolean().optional(), ejemplo: z.string().regex(/^[\w.\- ]{1,80}\.hmath$/).optional(), ancho: z.number().int().min(600).max(2400).optional(), alto: z.number().int().min(400).max(1600).optional() },
  async ({ visible, ejemplo, ancho, alto }) => {
    if (nav) { try { await nav.close(); } catch { /* ya cerrado */ } }
    await sirve(); const real = visible !== false || !!process.env.HEKATAN_VISIBLE; nav = await lanzar(visible, ancho, alto); pag = await nav.newPage();
    if (real) await ajustaVentana(pag, ancho, alto); else await pag.setViewport({ width: ancho || 1285, height: alto || 800 });
    consola.length = 0;
    pag.on("pageerror", (e) => consola.push("[error] " + e.message));
    pag.on("console", (m) => { if (m.type() === "error") consola.push("[console.error] " + m.text()); });
    await pag.goto(base, { waitUntil: "load", timeout: 120000 });
    await pag.bringToFront().catch(() => {});
    await pag.waitForFunction("window.HK && HK.motor && (HK.motor.listo || HK.motor.error)", { timeout: 90000 });
    const buscaEj = (n) => { const a = path.join(AQUI, "ejemplos", n); if (fs.existsSync(a)) return a; const w = path.resolve(AQUI, "..", "HekatanMathStudio", "ejemplos"); let r = null; (function rec(d) { if (r || !fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) rec(p); else if (e.name === n) r = p; } })(w); return r || a; };
    if (ejemplo) { const t = fs.readFileSync(buscaEj(ejemplo), "utf8").replace(/^﻿/, ""); await pag.evaluate((t) => HK.hoja.abre(t), t); await esperar(500); }
    if (visible !== false || process.env.HEKATAN_VISIBLE) await alFrente();
    return texto("Abierto (al frente) " + base + (ejemplo ? " con " + ejemplo : ""));
  });

srv.tool("cerrar", "Cierra el navegador y el servidor.", {}, async () => {
  if (nav) { try { await nav.close(); } catch { /* ya cerrado */ } }
  nav = pag = null; if (servidor) { servidor.close(); servidor = null; base = null; }
  return texto("Cerrado.");
});

srv.tool("captura", "Captura de pantalla de la web (ventana entera, o solo la hoja con `hoja:true`).", { hoja: z.boolean().optional() }, async ({ hoja }) => {
  const e = sinPagina(); if (e) return e;
  const el = hoja ? await pag.$("#papel") : null;
  return { content: [{ type: "image", data: await (el || pag).screenshot({ type: "png", encoding: "base64" }), mimeType: "image/png" }] };
});

srv.tool("estado", "Estado de la hoja: regiones (tipo, texto, rectángulo en pantalla), cuál tiene el cursor, tamaños y barra de estado.", {}, async () => {
  const e = sinPagina(); if (e) return e;
  return texto(await pag.evaluate(() => {
    const act = HK.hoja.activa && HK.hoja.activa();
    const primera = HK.hoja.reg.find((r) => r.ed);
    return {
      regiones: HK.hoja.reg.map((r, i) => {
        const el = (r.ed && r.ed.canvas) || r.el || r.ta; const b = el && el.getBoundingClientRect();
        return { i, tipo: r.t, texto: r.ed ? r.ed.texto() : ((r.el && r.el.textContent) || "").slice(0, 80), activa: !!(r.ed && r.ed === act), modo: r.modo, rect: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null };
      }),
      tamEcuacion: primera ? primera.ed.tam : null,
      barra: (document.getElementById("msg") || {}).textContent, motor: (document.getElementById("motor") || {}).textContent,
    };
  }));
});

srv.tool("teclear", "Teclea con el teclado real. «~» = Espacio (sale del hueco), «`» = barra invertida (raíz). Va a lo que tenga el foco (la ecuación activa).", { texto: z.string().min(1).max(400) }, async ({ texto: t }) => {
  const e = sinPagina(); if (e) return e;
  for (const c of t) {
    if (c === "~") await pag.keyboard.press("Space"); else if (c === "`") await pag.keyboard.press("Backslash"); else await pag.keyboard.type(c);
    await esperar(12);
  }
  await pausa(); return texto("Tecleado: " + t);
});

srv.tool("tecla", "Pulsa una tecla (Enter, Tab, Escape, Backspace, Delete, ArrowLeft…, Home, End) con modificadores opcionales.",
  { tecla: z.string().max(20), ctrl: z.boolean().optional(), mayus: z.boolean().optional(), alt: z.boolean().optional() },
  async ({ tecla, ctrl, mayus, alt }) => {
    const e = sinPagina(); if (e) return e;
    if (ctrl) await pag.keyboard.down("Control");
    if (mayus) await pag.keyboard.down("Shift");
    if (alt) await pag.keyboard.down("Alt");
    await pag.keyboard.press(tecla);
    if (alt) await pag.keyboard.up("Alt");
    if (mayus) await pag.keyboard.up("Shift");
    if (ctrl) await pag.keyboard.up("Control");
    await pausa(); return texto("Tecla " + tecla);
  });

srv.tool("clic",
  "Clic del ratón en coordenadas de la ventana (x,y), o sobre una región por índice con `region` y `donde` (inicio | medio | fin | derecha | izquierda | arriba | abajo). `doble:true` = doble clic.",
  { x: z.number().optional(), y: z.number().optional(), region: z.number().int().min(0).optional(), donde: z.enum(["inicio", "medio", "fin", "derecha", "izquierda", "arriba", "abajo"]).optional(), doble: z.boolean().optional(), derecho: z.boolean().optional() },
  async ({ x, y, region, donde, doble, derecho }) => {
    const e = sinPagina(); if (e) return e;
    if (region !== undefined) {
      const r = await pag.evaluate((i) => {
        const q = HK.hoja.reg[i]; if (!q) return null;
        const el = (q.ed && q.ed.canvas) || q.el || q.ta; const b = el.getBoundingClientRect(); const f = el.closest(".fila"); const fb = f ? f.getBoundingClientRect() : b;
        return { l: b.left, t: b.top, r: b.right, b: b.bottom, fl: fb.left, fr: fb.right, ft: fb.top, fb: fb.bottom };
      }, region);
      if (!r) return falla("No existe la región " + region);
      const cy = (r.t + r.b) / 2;
      const p = { inicio: { x: r.l + 3, y: cy }, medio: { x: (r.l + r.r) / 2, y: cy }, fin: { x: r.r - 3, y: cy }, derecha: { x: Math.min(r.r + 150, r.fr - 6), y: cy }, izquierda: { x: Math.max(r.l - 20, r.fl + 2), y: cy }, arriba: { x: r.l + 5, y: r.ft + 1 }, abajo: { x: r.r + 40, y: r.fb - 1 } }[donde || "medio"];
      x = p.x; y = p.y;
    }
    if (x === undefined || y === undefined) return falla("Falta x,y o region.");
    await pag.mouse.click(x, y, { button: derecho ? "right" : "left", clickCount: doble ? 2 : 1 }); await pausa();
    return texto("Clic en (" + Math.round(x) + ", " + Math.round(y) + ")");
  });

srv.tool("arrastrar", "Arrastra el ratón de (x1,y1) a (x2,y2) en pasos (selecciona, o pasa el cursor de una ecuación a otra de la misma fila).",
  { x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(), pasos: z.number().int().min(1).max(60).optional() },
  async ({ x1, y1, x2, y2, pasos }) => {
    const e = sinPagina(); if (e) return e;
    await pag.mouse.move(x1, y1); await pag.mouse.down(); await pag.mouse.move(x2, y2, { steps: pasos || 12 }); await pag.mouse.up(); await pausa();
    return texto("Arrastrado.");
  });

srv.tool("rueda", "Rueda del ratón en (x,y); `ctrl:true` = zoom de la hoja.", { x: z.number(), y: z.number(), delta: z.number().min(-2000).max(2000), ctrl: z.boolean().optional() }, async ({ x, y, delta, ctrl }) => {
  const e = sinPagina(); if (e) return e;
  await pag.mouse.move(x, y); if (ctrl) await pag.keyboard.down("Control");
  await pag.mouse.wheel({ deltaY: delta }); if (ctrl) await pag.keyboard.up("Control");
  await pausa(); return texto("Rueda " + delta);
});

srv.tool("pestana", "Elige una pestaña de la cinta por su nombre (Matemática, Cálculo, Insertar, CAD, Texto…). Devuelve los botones que tiene.", { nombre: z.string().max(40) }, async ({ nombre }) => {
  const e = sinPagina(); if (e) return e;
  const ok = await pag.evaluate((n) => { const b = [...document.querySelectorAll("#pestanas button")].find((x) => x.textContent.trim() === n); if (!b) return false; b.click(); return true; }, nombre);
  if (!ok) return falla("No hay pestaña «" + nombre + "».");
  await pausa();
  return texto(await pag.evaluate(() => [...document.querySelectorAll("#cinta .bt")].map((b) => b.textContent.trim().replace(/\s+/g, " ")).filter(Boolean)));
});

srv.tool("boton", "Pulsa un botón de la cinta por su texto (termina en…), p. ej. «Ecuación», «Fracción», «Raíz». Primero elige la `pestana`.", { texto: z.string().max(60) }, async ({ texto: t }) => {
  const e = sinPagina(); if (e) return e;
  const r = await pag.evaluate((t) => {
    const l = [...document.querySelectorAll("#cinta .bt")];
    const b = l.find((x) => x.textContent.trim().replace(/\s+/g, " ").endsWith(t)) || l.find((x) => x.textContent.includes(t));
    if (!b) return "no hay"; b.click(); return "ok";
  }, t);
  if (r !== "ok") return falla("No hay botón «" + t + "» en la pestaña actual (usa `pestana`).");
  await pausa();
  return texto("Botón: " + t + " · barra: " + await pag.evaluate(() => (document.getElementById("msg") || {}).textContent));
});

srv.tool("menu", "Abre un menú (Archivo, Letra, Cuadrícula) y pulsa uno de sus elementos por texto. Sin `elemento` solo lista las opciones. Los cuadros de nombre se aceptan con `nombre`.",
  { menu: z.string().max(30), elemento: z.string().max(80).optional(), nombre: z.string().max(60).optional() },
  async ({ menu, elemento, nombre }) => {
    const e = sinPagina(); if (e) return e;
    pag.removeAllListeners("dialog"); pag.on("dialog", (d) => d.accept(nombre || "hoja"));
    const r = await pag.evaluate((m, el) => {
      const s = [...document.querySelectorAll("#menu .mi > span")].find((x) => x.textContent.trim().replace(/^▦\s*/, "") === m);
      if (!s) return { err: "no hay menú" }; s.click();
      const bs = [...s.parentElement.querySelectorAll(".sub button")]; const ops = bs.map((b) => b.textContent.trim());
      if (!el) return { ops };
      const b = bs.find((x) => x.textContent.trim().startsWith(el)); if (!b) return { err: "no hay elemento", ops };
      b.click(); return { ok: true, ops };
    }, menu, elemento);
    if (r.err) return falla(r.err + (r.ops ? ": " + r.ops.join(" | ") : ""));
    await esperar(300); return texto(r.ops);
  });

srv.tool("abrir_hoja", "Carga una hoja .hmath del disco (ruta absoluta) en la web. Solo lee el archivo.", { ruta: z.string().min(3).max(500).regex(/\.hmath$/i) }, async ({ ruta }) => {
  const e = sinPagina(); if (e) return e;
  let t; try { t = fs.readFileSync(ruta, "utf8"); } catch (x) { return falla("No se pudo leer: " + x.message); }
  await pag.evaluate((t) => HK.hoja.abre(t), t); await esperar(500); return texto("Hoja cargada (" + t.length + " bytes).");
});

srv.tool("hoja", "Devuelve el .hmath de la hoja actual (lo que se guardaría).", {}, async () => {
  const e = sinPagina(); if (e) return e;
  return texto(await pag.evaluate(() => HK.hoja.guarda()));
});

srv.tool("nueva_ecuacion", "Agrega una ecuación escrita en código Calcpad (p. ej. «a = x^2/(y+1)»). `modo`: 0 numérico, 1 simbólico, 2 solo notación. `mismaLinea` la pone en la fila anterior.",
  { codigo: z.string().max(300), modo: z.number().int().min(0).max(2).optional(), mismaLinea: z.boolean().optional() },
  async ({ codigo, modo, mismaLinea }) => {
    const e = sinPagina(); if (e) return e;
    await pag.evaluate((c, m, l) => { HK.hoja.nuevaEq(c, !!l, m || 0); }, codigo, modo, mismaLinea);
    await pausa(); return texto("Ecuación agregada.");
  });

srv.tool("medir", "Mide la TINTA de cada ecuación (ancho × alto en px a 96 dpi, sin cursor) para compararla con el WPF. Con `region` solo esa.", { region: z.number().int().min(0).optional() }, async ({ region }) => {
  const e = sinPagina(); if (e) return e;
  const lista = await pag.evaluate(() => {
    const o = [];
    HK.hoja.reg.forEach((r, i) => { if (r.ed) { const b = r.ed.canvas.getBoundingClientRect(); o.push({ i, texto: r.ed.texto(), x: b.left, y: b.top, w: b.width, h: b.height }); } });
    return o;
  });
  const PNG = cargaPng(); const sal = [];
  for (const q of lista) {
    if (region !== undefined && q.i !== region) continue;
    const buf = await pag.screenshot({ type: "png", clip: { x: q.x, y: q.y, width: Math.max(1, q.w), height: Math.max(1, q.h) } });
    const im = PNG.sync.read(buf); const bg = [im.data[0], im.data[1], im.data[2]]; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < im.height; y++) {
      for (let x = 0; x < im.width; x++) {
        const k = (y * im.width + x) * 4;
        if (Math.abs(im.data[k] - bg[0]) + Math.abs(im.data[k + 1] - bg[1]) + Math.abs(im.data[k + 2] - bg[2]) > 230) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    sal.push({ region: q.i, texto: q.texto, tinta: x1 < 0 ? null : [x1 - x0 + 1, y1 - y0 + 1] });
  }
  return texto(sal);
});

srv.tool("errores", "Errores de consola/página desde que se abrió.", {}, async () => texto(consola.length ? consola.join("\n") : "(sin errores)"));

await srv.connect(new StdioServerTransport());
