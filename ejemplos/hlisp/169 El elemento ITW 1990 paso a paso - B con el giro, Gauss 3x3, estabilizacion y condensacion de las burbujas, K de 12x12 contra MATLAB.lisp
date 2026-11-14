# El elemento ITW 1990 paso a paso: de las funciones de forma del giro a la matriz K de 12 × 12 (primero símbolos, luego números)
#numerico
#: **Qué se hace.** Continuación de la hoja 167. Allí se escribió el **campo de desplazamientos** del cuadrilátero de membrana con giro (Ibrahimbegovic, Taylor y Wilson, 1990). Aquí se construye su **matriz de rigidez**: el Jacobiano, la matriz **B** con los términos del giro, la **cuadratura de Gauss 3 × 3**, la estabilización del giro y la **condensación de las 2 burbujas**. Se hace en el orden de siempre: **datos → símbolos → números → comprobación**.
#: **De dónde sale el algoritmo.** Es el ke_itw.m de Hekatan Lab (carpeta 22 Muros acoplados ITW), el mismo de los muros acoplados. **Se ejecutó en MATLAB, Hekatan Lab, Python, C++, Fortran, Calcpad y Hekatan LISP y los siete dan la misma K** (8 decimales). Aquí está escrito como **funciones de una línea de ξ y η** (sin bucles): la suma de los 9 puntos de Gauss son 9 términos. Los números los calcula el motor.
#: **Quién es quién.** Nudos 1 a 4 en las esquinas, 3 grados por nudo (u, v, ψ) = 12, más 2 grados de la burbuja = 14; la burbuja se elimina al final. ξ y η van de −1 a 1.

## 1 · Datos
#: Un cuadrilátero **no rectangular**, nudos en sentido antihorario (m), una fila por nudo con (x, y):
Xn = [0, 0; 4, 0; 3.5, 3; 0.5, 2.5] 'coordenadas de los nudos (x, y) [m]
E = 30000 'módulo de elasticidad
ν = 0.25 'coeficiente de Poisson
t = 1 'espesor
#: La matriz constitutiva de **tensión plana** con el espesor dentro, y el módulo de corte γ = E/(2(1+ν)) que pesa la estabilización del giro:
f_D = E*t/(1 - ν^2) 'factor de la matriz
D = f_D*[1, ν, 0; ν, 1, 0; 0, 0, (1 - ν)/2] 'matriz constitutiva 3 × 3
γ = E/(2*(1 + ν)) 'módulo de corte
#dibujo("Figura 0. El cuadrilátero con sus nudos", ud = m, escala = auto, cotas = m, alto = 200)
#  poligono([0, 4, 3.5, 0.5], [0, 0, 3, 2.5], "azul tenue")
#  polilinea([0, 4, 3.5, 0.5, 0], [0, 0, 3, 2.5, 0], "fina")
#  texto(-0.5, -0.35, "1 (0, 0)", 1.4, "c")
#  texto(3.9, -0.35, "2 (4, 0)", 1.4, "c")
#  texto(3.7, 3.15, "3 (3.5, 3)", 1.6, "c")
#  texto(-0.3, 2.65, "4 (0.5, 2.5)", 1.8, "c")
#fin

## 2 · Símbolos: lo que se calcula en cada punto de Gauss
#: **Paso 1, el Jacobiano.** El elemento real sale del cuadrado natural con las funciones bilineales de las esquinas. Con las derivadas de x e y respecto a ξ y η, el determinante es el factor de área de la integral:
detJ = Simplify{x_xi*y_eta - y_xi*x_eta} @@(determinante del Jacobiano: el factor de área en la integral)
#: **Paso 2, derivadas cartesianas.** Cada función de forma se deriva respecto a ξ y η y se pasa a x e y con la **inversa del Jacobiano**: **N_{,x} = (y_{,η}·N_{,ξ} − y_{,ξ}·N_{,η})/detJ** y **N_{,y} = (−x_{,η}·N_{,ξ} + x_{,ξ}·N_{,η})/detJ**. Lo mismo para las funciones de los lados (serendipidad, las N₅ a N₈ de la hoja 167) y para la burbuja N₉.
#: **Paso 3, el giro entra por los lados.** Para el lado que va del nudo J al K el vector que empuja su punto medio es **c = ( (y_{K} − y_{J})/8 , −(x_{K} − x_{J})/8 )**. Por eso el desplazamiento del lado vale **c·(ψ_{K} − ψ_{J})** (hoja 167) y las deformaciones llevan, junto a cada ψ, los términos **g₁ a g₄**: la función del lado siguiente por su c, menos la del propio lado por el suyo (por ejemplo g₁ = N_{S,x}(sig)·c_{x}(sig) − N_{S,x}·c_{x}).
#: **Paso 4, la matriz B.** Tres filas (ε_{x}, ε_{y}, γ_{xy}) y 14 columnas: u, v y ψ de cada nudo y 2 de la burbuja. En símbolos: **ε_{x} = Σ N_{I,x}·u_{I} + Σ g₁·ψ**, **ε_{y} = Σ N_{I,y}·v_{I} + Σ g₄·ψ**, **γ_{xy} = Σ (N_{I,y}·u_{I} + N_{I,x}·v_{I}) + Σ (g₂ + g₃)·ψ**.
#: **Paso 5, la rigidez por Gauss.** La integral se reemplaza por una suma sobre los 9 puntos (3 × 3), con pesos 5/9, 8/9, 5/9 y puntos 0 y ±√(3/5):
#: **K₁₄ = Σ_{i} Σ_{j} w_{i}·w_{j}·detJ·Bᵀ·D·B  +  γ·t·4·detJ₀·r·rᵀ**
#: El último término **estabiliza el giro** (r es la fila del giro en el punto central, detJ₀ el Jacobiano ahí): sin él, el giro de los nudos no tendría rigidez propia.
#: **Paso 6, condensación.** Los 2 grados de la burbuja no se ensamblan: se eliminan, y lo que queda es una matriz de 12 × 12:
#: **K = K_{uu} − K_{ub}·K_{bb}⁻¹·K_{bu}**

## 3 · Los vectores c de los lados
#: Un número por lado (J → K), con las coordenadas de la fila J y la fila K de Xn. Se ponen en una matriz diagonal para multiplicar cada función de lado por su c:
cxv = [Xn(2, 2) - Xn(1, 2); Xn(3, 2) - Xn(2, 2); Xn(4, 2) - Xn(3, 2); Xn(1, 2) - Xn(4, 2)]/8 'c_x de los 4 lados
cyv = -[Xn(2, 1) - Xn(1, 1); Xn(3, 1) - Xn(2, 1); Xn(4, 1) - Xn(3, 1); Xn(1, 1) - Xn(4, 1)]/8 'c_y de los 4 lados
Dx = [cxv(1), 0, 0, 0; 0, cxv(2), 0, 0; 0, 0, cxv(3), 0; 0, 0, 0, cxv(4)] 'c_x en la diagonal
Dy = [cyv(1), 0, 0, 0; 0, cyv(2), 0, 0; 0, 0, cyv(3), 0; 0, 0, 0, cyv(4)] 'c_y en la diagonal
#: **El lado siguiente.** En g₁ a g₄ aparece la diferencia entre la función del lado siguiente y la del propio. Esa permutación de los 4 lados es una matriz, y Rm = P − I hace la resta de una vez:
Pm = [0, 1, 0, 0; 0, 0, 1, 0; 0, 0, 0, 1; 1, 0, 0, 0] 'permutación: el lado siguiente
Rm = Pm - [1, 0, 0, 0; 0, 1, 0, 0; 0, 0, 1, 0; 0, 0, 0, 1] 'siguiente menos propio
#: **Dónde cae cada grado.** Las 14 columnas de B son u₁ v₁ ψ₁ u₂ v₂ ψ₂ u₃ v₃ ψ₃ u₄ v₄ ψ₄ y las 2 de la burbuja. Estas matrices de 0 y 1 colocan cada fila de 4 funciones en su columna (igual que E_u y E_v de la hoja 162):
Eu = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] 'columnas de u
Ev = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] 'columnas de v
Ep = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0] 'columnas de ψ
b1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0] 'primer grado de la burbuja
b2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] 'segundo grado de la burbuja

## 4 · Funciones de forma, Jacobiano y derivadas en un punto (ξ, η)
#: Las derivadas de las funciones de las **esquinas** (2 filas: respecto a ξ y a η), las de los **lados** (serendipidad), las funciones de las esquinas y las de la **burbuja**:
dN_q(xi, eta) = [-(1 - eta), (1 - eta), (1 + eta), -(1 + eta); -(1 - xi), -(1 + xi), (1 + xi), (1 - xi)]*0.25
NS_q(xi, eta) = [-2*xi*(1 - eta), 1 - eta^2, -2*xi*(1 + eta), -(1 - eta^2); -(1 - xi^2), -2*eta*(1 + xi), 1 - xi^2, -2*eta*(1 - xi)]*0.5
NN_q(xi, eta) = [(1 - xi)*(1 - eta), (1 + xi)*(1 - eta), (1 + xi)*(1 + eta), (1 - xi)*(1 + eta)]*0.25
nb_q(xi, eta) = [-2*xi*(1 - eta^2); -2*eta*(1 - xi^2)]
#: **El Jacobiano** y su determinante, con las mismas funciones de las esquinas (por eso se llama isoparamétrico):
J_q(xi, eta) = dN_q(xi, eta)*Xn
dJ_q(xi, eta) = det(J_q(xi, eta))
#: **Derivadas respecto a x e y** con la inversa del Jacobiano: las esquinas (g), los lados (S) y la burbuja (b):
gx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*dN_q(xi, eta)
gy_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*dN_q(xi, eta)
Sx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*NS_q(xi, eta)
Sy_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*NS_q(xi, eta)
bx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*nb_q(xi, eta)
by_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*nb_q(xi, eta)
#: **Los términos del giro g₁ a g₄**: la función de lado por su c, menos la del lado vecino:
g1_q(xi, eta) = Sx_q(xi, eta)*Dx*Rm
g2_q(xi, eta) = Sy_q(xi, eta)*Dx*Rm
g3_q(xi, eta) = Sx_q(xi, eta)*Dy*Rm
g4_q(xi, eta) = Sy_q(xi, eta)*Dy*Rm

## 5 · La matriz B (3 × 14) y la fila del giro
#: Cada fila de B es una deformación: **B_{x}** da ε_{x}, **B_{y}** da ε_{y} y **B_{g}** da γ_{xy}. Con las matrices de columnas de arriba:
Bx_q(xi, eta) = gx_q(xi, eta)*Eu + g1_q(xi, eta)*Ep + bx_q(xi, eta)*b1
By_q(xi, eta) = gy_q(xi, eta)*Ev + g4_q(xi, eta)*Ep + by_q(xi, eta)*b2
Bg_q(xi, eta) = gy_q(xi, eta)*Eu + gx_q(xi, eta)*Ev + (g2_q(xi, eta) + g3_q(xi, eta))*Ep + by_q(xi, eta)*b1 + bx_q(xi, eta)*b2
B_q(xi, eta) = [Bx_q(xi, eta); By_q(xi, eta); Bg_q(xi, eta)]
#: La **fila del giro** r (14 × 1) que estabiliza el giro: la rotación del campo menos el giro del nudo, tal cual el paper:
r_q(xi, eta) = transpose(-0.5*gy_q(xi, eta)*Eu + 0.5*gx_q(xi, eta)*Ev + (0.5*(g3_q(xi, eta) - g2_q(xi, eta)) - NN_q(xi, eta))*Ep - 0.5*by_q(xi, eta)*b1 + 0.5*bx_q(xi, eta)*b2)

## 6 · Números: la rigidez por Gauss 3 × 3
#: El aporte de **un** punto de Gauss, 14 × 14: **detJ · Bᵀ·D·B** (lo que vale esa muestra de la integral):
k_q(xi, eta) = dJ_q(xi, eta)*transpose(B_q(xi, eta))*D*B_q(xi, eta)
#: Los puntos son 0 y ±√(3/5). Los 4 puntos de las esquinas pesan 25/81, los 4 de los lados 40/81 y el central 64/81 (productos de los pesos 5/9 y 8/9):
h = sqrt(3/5) 'punto de Gauss ±h
dJ_c = dJ_q(0, 0) 'detJ en el centro
dJ_1 = dJ_q(-h, -h) 'detJ en un punto de esquina
#: La suma de los 9 aportes:
K14 = 25/81*(k_q(-h, -h) + k_q(h, -h) + k_q(h, h) + k_q(-h, h)) + 40/81*(k_q(0, -h) + k_q(0, h) + k_q(-h, 0) + k_q(h, 0)) + 64/81*k_q(0, 0) 'rigidez sin estabilizar, 14 × 14
#: **La estabilización del giro**, con la fila del giro en el centro:
r0 = r_q(0, 0) 'fila del giro en el punto central
K14s = K14 + γ*t*4*dJ_q(0, 0)*r0*transpose(r0) 'rigidez con el giro estabilizado
#: **Condensación de la burbuja**: se separan los 12 grados del elemento de los 2 de la burbuja y se elimina la burbuja:
Kuu = K14s(1:12, 1:12) 'bloque del elemento
Kab = K14s(1:12, 13:14) 'acoplamiento elemento–burbuja
Kbb = K14s(13:14, 13:14) 'bloque de la burbuja
Ke = Kuu - Kab*inv(Kbb)*transpose(Kab) 'rigidez del elemento, 12 × 12 (u, v, ψ de los 4 nudos)
k_11 = Ke(1, 1) 'rigidez u₁–u₁
k_22 = Ke(2, 2) 'rigidez v₁–v₁
k_33 = Ke(3, 3) 'rigidez ψ₁–ψ₁ (el giro tiene rigidez propia)
k_12 = Ke(1, 2) 'acoplamiento u₁–v₁
k_13 = Ke(1, 3) 'acoplamiento u₁–ψ₁
#: **Área por Gauss.** La suma de pesos por detJ es el área del elemento; se compara con la fórmula del zapatero:
A_g = 25/81*(dJ_q(-h, -h) + dJ_q(h, -h) + dJ_q(h, h) + dJ_q(-h, h)) + 40/81*(dJ_q(0, -h) + dJ_q(0, h) + dJ_q(-h, 0) + dJ_q(h, 0)) + 64/81*dJ_q(0, 0) 'área por Gauss 3 × 3
A_z = 0.5*(Xn(1, 1)*Xn(2, 2) - Xn(2, 1)*Xn(1, 2) + Xn(2, 1)*Xn(3, 2) - Xn(3, 1)*Xn(2, 2) + Xn(3, 1)*Xn(4, 2) - Xn(4, 1)*Xn(3, 2) + Xn(4, 1)*Xn(1, 2) - Xn(1, 1)*Xn(4, 2)) 'área por la fórmula del zapatero
dif_A = A_g - A_z 'diferencia: debe ser 0
#dibujo("Figura 1. El cuadrilátero y sus 9 puntos de Gauss (3 × 3). Las flechas verdes son los vectores c de los lados: el giro de las esquinas empuja el punto medio del lado en esa dirección", ud = m, escala = auto, cotas = m, alto = 230)
#  poligono([0, 4, 3.5, 0.5], [0, 0, 3, 2.5], "azul tenue")
#  polilinea([0, 4, 3.5, 0.5, 0], [0, 0, 3, 2.5, 0], "fina")
#  circulo(0.4945, 0.2881, 0.07, "rojo")
#  circulo(0.6445, 1.2782, 0.07, "rojo")
#  circulo(0.7945, 2.2682, 0.07, "rojo")
#  circulo(2.0, 0.3099, 0.07, "rojo")
#  circulo(2.0, 1.375, 0.07, "rojo")
#  circulo(2.0, 2.4401, 0.07, "rojo")
#  circulo(3.5055, 0.3318, 0.07, "rojo")
#  circulo(3.3555, 1.4718, 0.07, "rojo")
#  circulo(3.2055, 2.6119, 0.07, "rojo")
#  circulo(2.0, 1.375, 0.12, "rojo")
#  texto(-0.55, -0.35, "1", 0.5, "c")
#  texto(4.2, -0.35, "2", 0.5, "c")
#  texto(3.75, 3.15, "3", 0.5, "c")
#  texto(0.2, 2.65, "4", 0.5, "c")
#  flecha(2.0, 0.0, 2.0, -0.55, "verde")
#  flecha(3.75, 1.5, 4.3, 1.5, "verde")
#  flecha(2.0, 2.75, 2.0, 3.3, "verde")
#  flecha(0.25, 1.25, -0.3, 1.25, "verde")
#fin

## 7 · Comprobaciones (si fallan, hay un error de signo o de orden)
#: **1. Contra MATLAB.** El ke_itw.m de Hekatan Lab, en MATLAB R2017a, con estos mismos datos, da K₁₁ = 12604.15649285, K₂₂ = 15902.61830586, K₃₃ = 17227.67491813, K₁₂ = 3901.56844297 y K₁₃ = −4250.22742509:
d_11 = k_11 - 12604.15649285 'diferencia con MATLAB en K₁₁
d_22 = k_22 - 15902.61830586 'diferencia con MATLAB en K₂₂
d_33 = k_33 - 17227.67491813 'diferencia con MATLAB en K₃₃
d_12 = k_12 - 3901.56844297 'diferencia con MATLAB en K₁₂
d_13 = k_13 + 4250.22742509 'diferencia con MATLAB en K₁₃
#: **2. Simétrica.** La rigidez de un elemento es simétrica; la diferencia con su traspuesta debe ser 0:
asim = norm(Ke - transpose(Ke)) 'asimetría de K
#: **3. Movimiento de cuerpo rígido.** Un desplazamiento de todos los nudos en x, **sin deformar** el elemento, no puede producir fuerzas. Lo mismo un giro rígido (u = −y, v = x y ψ = 1 en todos los nudos):
U_x = [1; 0; 0; 1; 0; 0; 1; 0; 0; 1; 0; 0] 'traslación rígida en x
F_x = Ke*U_x 'fuerzas de la traslación
f_x = norm(F_x) 'norma de esas fuerzas: debe ser 0
U_r = [-Xn(1, 2); Xn(1, 1); 1; -Xn(2, 2); Xn(2, 1); 1; -Xn(3, 2); Xn(3, 1); 1; -Xn(4, 2); Xn(4, 1); 1] 'rotación rígida de 1 rad
F_r = Ke*U_r 'fuerzas de la rotación
f_r = norm(F_r) 'norma de esas fuerzas: debe ser 0

## 8 · Lectura
#: **Se sigue el orden de siempre:** el Jacobiano da el factor de área; las derivadas cartesianas, las deformaciones; el giro entra por los lados con el vector c; la suma de Gauss 3 × 3 da K y la condensación elimina la burbuja. Las diferencias contra MATLAB son 0 (hasta la cifra que se escribe), K es simétrica y los movimientos rígidos no producen fuerzas: **el algoritmo está bien armado y es el mismo en los 7 lenguajes**.
#: **Lo que NO dice esta hoja.** Que el elemento sea exacto: con 3 × 3 puntos y el Jacobiano variable la integral no es exacta (la integración 2 × 2 de CSI da otra K). Esa comparación con ETABS está en el video siguiente (voladizo: ETABS 0.354201 contra el paper 0.3553).
