# MCP de Hekatan Math Studio WEB

Para probar la **interfaz gráfica de la web** (no la de WPF) desde Claude: abre la página en un Chrome controlado, teclea, hace clic, arrastra y mide.
Sirve la carpeta de la web por su cuenta (127.0.0.1, puerto libre, **sin caché**): no hace falta levantar nada antes.

| herramienta | qué hace |
|---|---|
| `abrir` | abre la web y espera al motor (`ejemplo`: un .hmath de `ejemplos/`) |
| `captura` | PNG de la ventana (o solo la hoja con `hoja:true`) |
| `estado` | regiones (tipo, texto, rectángulo), cuál tiene el cursor, tamaños |
| `teclear` / `tecla` | teclado real (`~` = Espacio, `` ` `` = raíz); Enter, Tab, flechas, Ctrl/Mayús |
| `clic` / `arrastrar` / `rueda` | ratón por coordenadas, o `clic` por `region` + `donde` (inicio, fin, derecha…) |
| `pestana` / `boton` / `menu` | cinta y menús por su texto |
| `nueva_ecuacion` | agrega una ecuación en código Calcpad (modo 0/1/2) |
| `abrir_hoja` / `hoja` | carga un .hmath del disco / devuelve el .hmath actual |
| `medir` | tinta (ancho × alto en px) de cada ecuación, para compararla con el WPF |
| `errores`, `cerrar` | consola del navegador / cerrar |

## Instalar
```bash
cd mcp && PUPPETEER_SKIP_DOWNLOAD=1 npm install --ignore-scripts
claude mcp add hekatan-mathstudio-web -- node /RUTA/A/hekatan-mathstudio-web/mcp/server.mjs
```
Usa el Chrome del sistema (`channel: chrome`). `HEKATAN_VISIBLE=1` muestra la ventana.

## Probar
`node probar.mjs [carpeta_png]` (arranca el servidor por stdio como lo haría Claude y llama a las herramientas).

## Seguridad
Solo sirve esta carpeta en 127.0.0.1; no ejecuta JavaScript arbitrario; `abrir_hoja` solo lee archivos `.hmath`.
