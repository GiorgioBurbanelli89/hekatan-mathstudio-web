# Hekatan Math Studio Web

Editor de NODOS en el navegador (canvas), igual en estructura al de WPF. Sin servidor ni build: HTML + JS.

Abrir (hace falta http: el motor WASM no carga con file://): `python -m http.server 8000` en esta carpeta y entrar a http://localhost:8000/ (o abrir `index.html`; los ejemplos del menú necesitan http).

- `parser.js`: texto ⇄ árbol ⇄ nodos y evaluador numérico (+ − · / ^, funciones, definiciones `a = …`, `f(x) = …`, `expr =`).
- `nodos.js`: el lienzo: fracción `/`, exponente `^`, subíndice `_`, raíz `\`, paréntesis `(`; Espacio sale del hueco; flechas, clic, Retroceso.
- `hoja.js`: regiones (texto, ecuación, deslizador con ▶), abrir/guardar `.hmath`, `fplot`.
- `tests/puppet.mjs`: prueba con Puppeteer (`node tests/puppet.mjs`): teclado real en el lienzo, motor simbólico WASM, hojas .hmath y la armadura de Logan contra el valor de Struct (dif ≈ 5e-20). Levanta un servidor local TEMPORAL solo mientras corre (no hay hosting ni despliegue).
- `tests/prueba.py` y `tests/abrir.py`: lo mismo con Playwright.
- `matriz.js`: matrices, `zeros`, `transpose`, `lsolve`, `max`, índices `A(i,j)` y programas `for`/`while`/`if`.

- `simbolico.js` + `motor/hlisp.wasm`: el motor simbólico de Hekatan LISP (ECL → WASM) VIAJA con la página: derivar (`diff`), integrar, despejar (`solve`), límites y simplificar corren en el navegador del usuario, sin instalar nada. Los resultados simbólicos (→) se guardan como definiciones vivas, igual que en la versión de escritorio.

- `cad.js` + pestaña CAD: bloque de código AutoLISP (`linea`, `rect`, `circulo`, `arco`, `polilinea`, `curva`, `achurado`, `texto`, `cota`, `capa`, `entmake`…) que corre en el mismo motor WASM; las entidades se dibujan en SVG y se bajan como `.lsp` (AutoCAD: APPLOAD y `HKDIBUJO`) o DXF. Se guarda en el `.hmath`. Prueba: `node tests/cad.mjs`.
- `tests/barrido_botones.mjs` (todos los botones de la cinta, con tiempo límite) y `tests/teclas_arreglos.mjs` (↑↓ en fracciones, `!=`).

- `autocompletar.js`: AUTOCOMPLETAR como el de WPF: a las 2 letras sale una lista (estructuras ∫ ∑ ∏ d/dx matriz…, símbolos α β π…, funciones, variables y funciones de la hoja y, en el bloque CAD, las funciones AutoLISP). ↑ ↓ eligen, Tab inserta, Esc cierra; Enter sigue creando ecuación. Prueba: `node tests/autocompletar.mjs`.

Falta: malla3d, solvers de elementos finitos (C++ → WASM).
