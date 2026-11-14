# La membrana con rotaciones normales de Wilson (cap. 9): lo que usan SAP2000 y ETABS, paso a paso y contra el BFS (primero símbolos, luego números)
#numerico
#: **Qué se hace.** El capítulo 9 del libro de Edward Wilson (*Análisis estático y dinámico de estructuras*) desarrolla **el elemento de membrana de SAP2000**: un cuadrilátero con **tres grados por nudo, u, v y el giro normal θ**. Aquí se escribe **tal cual el libro**, con sus ecuaciones numeradas, y se compara con lo que ya conoces: **el BFS** (funciones de forma, Jacobiano y cuadratura de Gauss).
#: **El problema (capítulo 9.1).** El elemento de esfuerzo plano de siempre tiene solo **u y v** por nudo: no puede recibir un momento normal al plano. Una viga empotrada en un muro o losa necesita ese giro. Si se le agrega θ sin hacer nada más, **su fila de K es cero** y la matriz es singular.

## 1 · Datos
#: El mismo cuadrilátero torcido de la hoja 169 (m), E = 30000, ν = 0.25, t = 1:
Xn = [0, 0; 4, 0; 3.5, 3; 0.5, 2.5] 'coordenadas de los nudos (x, y) [m]
E = 30000 'módulo de elasticidad
ν = 0.25 'coeficiente de Poisson
t = 1 'espesor
f_D = E*t/(1 - ν^2) 'factor de la matriz constitutiva (9.9)
D = f_D*[1, ν, 0; ν, 1, 0; 0, 0, (1 - ν)/2] 'matriz esfuerzo-deformación, simétrica (ec. 9.9)
G = E/(2*(1 + ν)) 'módulo de corte
k_0 = 0.025*G*t 'rigidez de rotación del libro, k0 = 0.025·D33 (ec. 9.14)

## 2 · Símbolos: los cuatro pasos del libro
#: **Paso 1 (9.2).** Se parte de un cuadrilátero de **8 nodos** (4 esquinas y 4 puntos medios). Las 4 primeras funciones son las bilineales de siempre; las otras 4, **parabólicas a lo largo de cada lado** (funciones jerárquicas, ec. 9.2e a 9.2h): **N₅ = (1 − r²)(1 − s)/2**, y las otras tres por rotación.
N_5 = Expand{(1 - r^2)*(1 - s)/2} @@(función del lado de abajo, ec. 9.2e)
#: **Paso 2 (9.3 y 9.4).** El desplazamiento normal relativo del punto medio de un lado se supone **parabólico**: para el lado ij, **Δu_{ij} = (L_{ij}/8)·(Δθ_{j} − Δθ_{i})**. Es la misma l/8 que ya vimos. En componentes x e y del lado, con su vector c = ((y_{j} − y_{i})/8, −(x_{j} − x_{i})/8): **Δu_{x} = c_{x}·(θ_{j} − θ_{i})** y **Δu_{y} = c_{y}·(θ_{j} − θ_{i})**.
du_s = Simplify{(l_ij/8)*(th_j - th_i)} @@(empuje del punto medio del lado, ec. 9.3)
#: **Paso 3 (9.6).** Con eso el campo es **u = Σ N_{i}·u_{i} + Σ M_{i}·θ_{i}**: las 8 funciones se reducen a 12 grados (u, v, θ de 4 nudos), con funciones M_{i} modificadas que llevan el giro.
#: **Paso 4 (9.7 y 9.8).** La deformación es **ε = [B₁₁ B₁₂]·[u; θ]** (3 × 12). Para pasar la prueba de esfuerzo constante («patch test») se modifica la parte del giro: **B₁₂ ← B₁₂ − (1/A)∫B₁₂ dA** (ec. 9.8).
#: **La rigidez (9.10).** **K = ∫ Bᵀ·D·B dV**, con **integración de cuatro puntos (2 × 2)**. Esa K tiene **un modo de energía cero** además de los 3 de cuerpo rígido: el de girar todos los nudos igual sin mover los puntos medios.
#: **El arreglo (9.11 a 9.14).** Se le suma una matriz **de rango uno** que da rigidez a ese modo: **K₀ = k₀·b₀ᵀ·b₀·Vol**, con **b₀·u = θ₀ − ΣN_{i}(0,0)·θ_{i}** (la rotación absoluta en el centro menos el giro promedio de los nudos) y **k₀ = 0.025·D₃₃** (D₃₃ = módulo de corte).

## 3 · Colocar las columnas (como en la hoja 169, sin burbuja)
cxv = [Xn(2, 2) - Xn(1, 2); Xn(3, 2) - Xn(2, 2); Xn(4, 2) - Xn(3, 2); Xn(1, 2) - Xn(4, 2)]/8 'c_x de los 4 lados
cyv = -[Xn(2, 1) - Xn(1, 1); Xn(3, 1) - Xn(2, 1); Xn(4, 1) - Xn(3, 1); Xn(1, 1) - Xn(4, 1)]/8 'c_y de los 4 lados
Dx = [cxv(1), 0, 0, 0; 0, cxv(2), 0, 0; 0, 0, cxv(3), 0; 0, 0, 0, cxv(4)] 'c_x en la diagonal
Dy = [cyv(1), 0, 0, 0; 0, cyv(2), 0, 0; 0, 0, cyv(3), 0; 0, 0, 0, cyv(4)] 'c_y en la diagonal
Rm = [0, 1, 0, 0; 0, 0, 1, 0; 0, 0, 0, 1; 1, 0, 0, 0] - [1, 0, 0, 0; 0, 1, 0, 0; 0, 0, 1, 0; 0, 0, 0, 1] 'lado siguiente menos lado propio
Eu = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0] 'columnas de u
Ev = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0] 'columnas de v
Ep = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] 'columnas del giro θ

## 4 · Funciones de forma, Jacobiano y derivadas en (r, s)
#: Lo que ya conoces del BFS: **funciones de forma, Jacobiano y derivadas cartesianas**. Las esquinas son bilineales; los lados son las parábolas (9.2e a 9.2h):
dN_q(xi, eta) = [-(1 - eta), (1 - eta), (1 + eta), -(1 + eta); -(1 - xi), -(1 + xi), (1 + xi), (1 - xi)]*0.25
NS_q(xi, eta) = [-2*xi*(1 - eta), 1 - eta^2, -2*xi*(1 + eta), -(1 - eta^2); -(1 - xi^2), -2*eta*(1 + xi), 1 - xi^2, -2*eta*(1 - xi)]*0.5
NN_q(xi, eta) = [(1 - xi)*(1 - eta), (1 + xi)*(1 - eta), (1 + xi)*(1 + eta), (1 - xi)*(1 + eta)]*0.25
J_q(xi, eta) = dN_q(xi, eta)*Xn
dJ_q(xi, eta) = det(J_q(xi, eta))
gx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*dN_q(xi, eta)
gy_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*dN_q(xi, eta)
Sx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*NS_q(xi, eta)
Sy_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*NS_q(xi, eta)
g1_q(xi, eta) = Sx_q(xi, eta)*Dx*Rm
g2_q(xi, eta) = Sy_q(xi, eta)*Dx*Rm
g3_q(xi, eta) = Sx_q(xi, eta)*Dy*Rm
g4_q(xi, eta) = Sy_q(xi, eta)*Dy*Rm

## 5 · B (3 × 12), la modificación (9.8) y la fila del giro
Buv_q(xi, eta) = [gx_q(xi, eta)*Eu; gy_q(xi, eta)*Ev; gy_q(xi, eta)*Eu + gx_q(xi, eta)*Ev]
Bth_q(xi, eta) = [g1_q(xi, eta); g4_q(xi, eta); g2_q(xi, eta) + g3_q(xi, eta)]
#: **La media del giro** (ec. 9.8), con los 4 puntos de Gauss 2 × 2 (r, s = ±1/√3, peso 1):
h = 1/sqrt(3) 'punto de Gauss ±h
A_el = dJ_q(-h, -h) + dJ_q(h, -h) + dJ_q(h, h) + dJ_q(-h, h) 'área del elemento por Gauss 2 × 2
Bbar = (dJ_q(-h, -h)*Bth_q(-h, -h) + dJ_q(h, -h)*Bth_q(h, -h) + dJ_q(h, h)*Bth_q(h, h) + dJ_q(-h, h)*Bth_q(-h, h))/A_el 'media de B12 sobre el elemento
B_q(xi, eta) = Buv_q(xi, eta) + (Bth_q(xi, eta) - Bbar)*Ep
r_q(xi, eta) = transpose(-0.5*gy_q(xi, eta)*Eu + 0.5*gx_q(xi, eta)*Ev + (0.5*(g3_q(xi, eta) - g2_q(xi, eta)) - NN_q(xi, eta))*Ep)

## 6 · Números: la rigidez de 12 × 12
k_q(xi, eta) = dJ_q(xi, eta)*transpose(B_q(xi, eta))*D*B_q(xi, eta)
K_12 = k_q(-h, -h) + k_q(h, -h) + k_q(h, h) + k_q(-h, h) 'ec. 9.10: integración de cuatro puntos
r_0 = r_q(0, 0) 'b0 de la ec. 9.11 en el centro
K_w = K_12 + k_0*4*dJ_q(0, 0)*r_0*transpose(r_0) 'K + K0 (ecs. 9.13 y 9.14)
k_11 = K_w(1, 1) 'rigidez u₁–u₁
k_22 = K_w(2, 2) 'rigidez v₁–v₁
k_33 = K_w(3, 3) 'rigidez θ₁–θ₁: el giro del nudo SÍ tiene rigidez
k_12 = K_w(1, 2) 'acoplamiento u₁–v₁
k_13 = K_w(1, 3) 'acoplamiento u₁–θ₁
#: **Sin el paso del giro, el giro no costaría nada.** K₃₃ valía 0 en el elemento de esfuerzo plano; aquí vale **5469**. Y los 3 movimientos rígidos siguen sin costar:
U_x = [1; 0; 0; 1; 0; 0; 1; 0; 0; 1; 0; 0] 'traslación rígida en x
f_x = norm(K_w*U_x) 'fuerzas de la traslación: debe ser 0
U_r = [-Xn(1, 2); Xn(1, 1); 1; -Xn(2, 2); Xn(2, 1); 1; -Xn(3, 2); Xn(3, 1); 1; -Xn(4, 2); Xn(4, 1); 1] 'rotación rígida de 1 rad
f_r = norm(K_w*U_r) 'fuerzas de la rotación: debe ser 0
asim = norm(K_w - transpose(K_w)) 'asimetría de K

## 7 · Contra el BFS: lo que ya entiendes
#: Los tres ingredientes de siempre, en los dos elementos:
#: **Funciones de forma.** BFS: **productos de Hermite cúbicas**, 4 grados por nudo (w y sus derivadas), continuidad **C1**. ITW/Wilson: **bilineales en las esquinas y parábolas en los lados**, 3 grados por nudo (u, v, θ), continuidad **C0**.
#: **Jacobiano.** BFS en un rectángulo: constante. ITW en un cuadrilátero torcido: **cambia de punto a punto** (detJ = 2.406 en el centro y 2.460 en un punto de esquina de Gauss 2 × 2), y la inversa es una fracción: el integrando ya **no es un polinomio**.
dJ_centro = dJ_q(0, 0) 'detJ en el centro
dJ_esq = dJ_q(-h, -h) 'detJ en un punto de esquina
#: **Cuadratura de Gauss.** BFS: **4 × 4 = 16 puntos**, exacta para el grado 6 del integrando. ITW del paper: **3 × 3**; Wilson (9.10) y CSI: **2 × 2**, con el giro arreglado por K₀. Ninguna es exacta en un cuadrilátero torcido: por eso el elemento «se degrada» con la distorsión.

## 8 · Lo que dice el libro y lo que hace ETABS
#: **La Tabla 9.1 del libro** (viga en voladizo de 2 elementos, desplazamiento de la punta con la pareja de momentos, normalizado) da **1.000, 0.502 y 0.280** para a = 0, 1, 2, con a = lo que se tuerce el nudo central. Hekatan con el elemento tipo 0 (ITW) da **1.000, 0.589, 0.390**, y con el **tipo 13, que es el de ETABS (medido en 17 geometrías), 0.998, 0.781, 0.767**: **ETABS se degrada menos que el elemento del libro**.
#: **Lo que NO sale del libro (medido).** ETABS usa **γ = 0.4 μ** y no el 0.025·D₃₃ del libro (ec. 9.14); la formulación es insensible a ese valor en varios órdenes de magnitud. Además lleva un término de reloj de arena (2·10⁻⁴·μ·t·A) y 2 modos de burbuja. Estos números se midieron contra la matriz de membrana de ETABS (reconstruida por flexibilidad), no están en ningún libro. **De SAFE no tengo medida esta membrana.**
#dibujo("Figura 1. Tabla 9.1 del libro (momento en la punta de una viga de 2 elementos): el libro (azul) contra el elemento de Hekatan tipo 0 (naranja) y el tipo 13 de ETABS (verde), para a = 0, 1, 2", ud = m, escala = auto, cotas = m, alto = 210)
#  linea(-0.2, 0, 9.4, 0, "media")
#  poligono([0.4, 0.4, 1.1, 1.1], [0, 1.5, 1.5, 0], "azul tenue")
#  poligono([1.2000000000000002, 1.2000000000000002, 1.9000000000000001, 1.9000000000000001], [0, 1.5, 1.5, 0], "naranja tenue")
#  poligono([2.0, 2.0, 2.7, 2.7], [0, 1.497, 1.497, 0], "verde tenue")
#  texto(1.6, -0.28, "a = 0", 1.4, "c")
#  poligono([3.5, 3.5, 4.2, 4.2], [0, 0.753, 0.753, 0], "azul tenue")
#  poligono([4.3, 4.3, 5.0, 5.0], [0, 0.883, 0.883, 0], "naranja tenue")
#  poligono([5.1, 5.1, 5.8, 5.8], [0, 1.171, 1.171, 0], "verde tenue")
#  texto(4.7, -0.28, "a = 1", 1.4, "c")
#  poligono([6.6000000000000005, 6.6000000000000005, 7.300000000000001, 7.300000000000001], [0, 0.42, 0.42, 0], "azul tenue")
#  poligono([7.4, 7.4, 8.1, 8.1], [0, 0.585, 0.585, 0], "naranja tenue")
#  poligono([8.200000000000001, 8.200000000000001, 8.9, 8.9], [0, 1.151, 1.151, 0], "verde tenue")
#  texto(7.800000000000001, -0.28, "a = 2", 1.4, "c")
#fin

## 9 · Lectura
#: **El orden es el de siempre:** funciones de forma, Jacobiano, derivadas, **B**, **cuadratura de Gauss**, K. Lo nuevo del ITW/Wilson es **cómo entra el giro**: por la parábola l/8 de cada lado, con la **modificación** de B (9.8) para pasar el patch test y la **rigidez de rango uno** (9.13) para que el giro tenga rigidez.
