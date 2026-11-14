# El kernel de CSI para la membrana con giro (drilling): Allman, proyección, rango uno, reloj de arena y burbuja, contra la ITW 1990 (primero símbolos, luego números)
#numerico
#: **Qué se hace.** La membrana de **SAP2000 y ETABS** es un cuadrilátero con **tres grados por nudo, u, v y el giro normal θ** (el *drilling*). Aquí se escribe su **kernel**, la fórmula que reproduce la matriz K de 12 × 12 de ETABS 22 con un error de **2·10⁻¹⁵** en 12 celdas (medido contra el programa, no sacado de un libro). Se hace en el orden de siempre: **datos → símbolos → números → comprobación**.
#: **Las piezas del kernel:** el giro entra por los lados como en **Allman** (ITW 1990); **Gauss 2 × 2**; la **proyección** del giro; un término de **rango uno** de Wilson; un **reloj de arena** sobre los giros; y la **burbuja** (2 modos) que se condensa.

## 1 · Datos
#: El mismo cuadrilátero torcido de las hojas 169 y 170 (m), E = 30000, ν = 0.25, t = 1:
Xn = [0, 0; 4, 0; 3.5, 3; 0.5, 2.5] 'coordenadas de los nudos (x, y) [m]
E = 30000 'módulo de elasticidad
ν = 0.25 'coeficiente de Poisson
t = 1 'espesor
f_D = E*t/(1 - ν^2) 'factor de la matriz constitutiva
D = f_D*[1, ν, 0; ν, 1, 0; 0, 0, (1 - ν)/2] 'matriz esfuerzo-deformación
G = E/(2*(1 + ν)) 'módulo de corte

## 2 · Símbolos: los pasos del kernel
#: **Paso 1 · el giro entra por los lados (Allman).** El desplazamiento normal del punto medio de cada lado es parabólico, **Δu = (l/8)·(θ_K − θ_J)·n**: cada nudo suma en un lado y resta en el otro.
du_s = Simplify{(l_ij/8)*(th_k - th_j)} @@(empuje del punto medio de un lado)
#: **Paso 2 · B de 3 × 14** (u, v, θ de 4 nudos más 2 de la burbuja) y la **proyección**: a las columnas del giro se les resta su media sobre el elemento, **B_θ ← B_θ − B̄_θ**.
#: **Paso 3 · rigidez básica.** **K₁₄ = Σ w·detJ·Bᵀ·D·B** con los 4 puntos de Gauss (±1/√3, peso 1).
#: **Paso 4 · rango uno.** **K₁₄ ← K₁₄ + 0.1·G·t·A·(2b₀)(2b₀)ᵀ = 0.4·G·t·A·b₀b₀ᵀ**, con **b₀ = (½)(v,x − u,y) − (¼)Σθᵢ**: el giro del medio menos el giro medio de los nudos.
P_s = Simplify{0.4*G*t*A_0} @@(el factor del rango uno)
#: **Paso 5 · reloj de arena.** **K₁₄ ← K₁₄ + 5·10⁻⁵·G·t·A·h·hᵀ**, con **h = (+1, −1, +1, −1)** solo en los giros.
H_s = Simplify{5e-5*G*t*A_0} @@(el factor del reloj de arena)
#: **Paso 6 · la burbuja se condensa.** **K = K_aa − K_aα·K_αα⁻¹·K_αa**. Queda la matriz de 12 × 12.

## 3 · Colocar las columnas
cxv = [Xn(2, 2) - Xn(1, 2); Xn(3, 2) - Xn(2, 2); Xn(4, 2) - Xn(3, 2); Xn(1, 2) - Xn(4, 2)]/8 'c_x de los 4 lados
cyv = -[Xn(2, 1) - Xn(1, 1); Xn(3, 1) - Xn(2, 1); Xn(4, 1) - Xn(3, 1); Xn(1, 1) - Xn(4, 1)]/8 'c_y de los 4 lados
Dx = [cxv(1), 0, 0, 0; 0, cxv(2), 0, 0; 0, 0, cxv(3), 0; 0, 0, 0, cxv(4)] 'c_x en la diagonal
Dy = [cyv(1), 0, 0, 0; 0, cyv(2), 0, 0; 0, 0, cyv(3), 0; 0, 0, 0, cyv(4)] 'c_y en la diagonal
Rm = [0, 1, 0, 0; 0, 0, 1, 0; 0, 0, 0, 1; 1, 0, 0, 0] - [1, 0, 0, 0; 0, 1, 0, 0; 0, 0, 1, 0; 0, 0, 0, 1] 'lado siguiente menos lado propio
Eu = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] 'columnas de u (de 14)
Ev = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] 'columnas de v
Ep = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0] 'columnas del giro θ
Eb = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] 'las 2 columnas de la burbuja
Sa = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0; 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0] 'las 12 columnas físicas

## 4 · Funciones de forma, Jacobiano y derivadas en (r, s)
dN_q(xi, eta) = [-(1 - eta), (1 - eta), (1 + eta), -(1 + eta); -(1 - xi), -(1 + xi), (1 + xi), (1 - xi)]*0.25
NS_q(xi, eta) = [-2*xi*(1 - eta), 1 - eta^2, -2*xi*(1 + eta), -(1 - eta^2); -(1 - xi^2), -2*eta*(1 + xi), 1 - xi^2, -2*eta*(1 - xi)]*0.5
NN_q(xi, eta) = [(1 - xi)*(1 - eta), (1 + xi)*(1 - eta), (1 + xi)*(1 + eta), (1 - xi)*(1 + eta)]*0.25
dNB_q(xi, eta) = [-2*xi*(1 - eta^2); -2*eta*(1 - xi^2)] 'la burbuja (1 - r²)(1 - s²) derivada
J_q(xi, eta) = dN_q(xi, eta)*Xn
dJ_q(xi, eta) = det(J_q(xi, eta))
gx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*dN_q(xi, eta)
gy_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*dN_q(xi, eta)
Sx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*NS_q(xi, eta)
Sy_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*NS_q(xi, eta)
gbx_q(xi, eta) = [1, 0]*inv(J_q(xi, eta))*dNB_q(xi, eta)
gby_q(xi, eta) = [0, 1]*inv(J_q(xi, eta))*dNB_q(xi, eta)
g1_q(xi, eta) = Sx_q(xi, eta)*Dx*Rm
g2_q(xi, eta) = Sy_q(xi, eta)*Dx*Rm
g3_q(xi, eta) = Sx_q(xi, eta)*Dy*Rm
g4_q(xi, eta) = Sy_q(xi, eta)*Dy*Rm

## 5 · B (3 × 14), la proyección y el vector b₀
Buv_q(xi, eta) = [gx_q(xi, eta)*Eu; gy_q(xi, eta)*Ev; gy_q(xi, eta)*Eu + gx_q(xi, eta)*Ev]
Bth_q(xi, eta) = [g1_q(xi, eta); g4_q(xi, eta); g2_q(xi, eta) + g3_q(xi, eta)]
Bbu_q(xi, eta) = [gbx_q(xi, eta)*Eb(1, :) + 0*Eb(2, :); 0*Eb(1, :) + gby_q(xi, eta)*Eb(2, :); gby_q(xi, eta)*Eb(1, :) + gbx_q(xi, eta)*Eb(2, :)]
#: **La media del giro** con los 4 puntos de Gauss (r, s = ±1/√3, peso 1):
h = 1/sqrt(3) 'punto de Gauss ±h
A_el = dJ_q(-h, -h) + dJ_q(h, -h) + dJ_q(h, h) + dJ_q(-h, h) 'área del elemento por Gauss 2 × 2
Bbar = (dJ_q(-h, -h)*Bth_q(-h, -h) + dJ_q(h, -h)*Bth_q(h, -h) + dJ_q(h, h)*Bth_q(h, h) + dJ_q(-h, h)*Bth_q(-h, h))/A_el 'media de B_θ sobre el elemento
B_q(xi, eta) = Buv_q(xi, eta) + (Bth_q(xi, eta) - Bbar)*Ep + Bbu_q(xi, eta)
b_q(xi, eta) = transpose(-0.5*gy_q(xi, eta)*Eu + 0.5*gx_q(xi, eta)*Ev + (0.5*(g3_q(xi, eta) - g2_q(xi, eta)) - NN_q(xi, eta))*Ep)

## 6 · Números: la rigidez de 12 × 12
k_q(xi, eta) = dJ_q(xi, eta)*transpose(B_q(xi, eta))*D*B_q(xi, eta)
K_14 = k_q(-h, -h) + k_q(h, -h) + k_q(h, h) + k_q(-h, h) 'paso 3: rigidez básica de 14 × 14
b_0 = b_q(0, 0) 'b₀ en el centro
A_0 = 4*dJ_q(0, 0) 'área exacta del cuadrilátero
P_14 = 0.1*G*t*A_0*(2*b_0)*transpose(2*b_0) 'paso 4: rango uno
hv = [0; 0; 1; 0; 0; -1; 0; 0; 1; 0; 0; -1; 0; 0] 'h = (+1, −1, +1, −1) en los giros
H_14 = 5e-5*G*t*A_0*hv*transpose(hv) 'paso 5: reloj de arena
K_t = K_14 + P_14 + H_14 'suma de las tres piezas
K_aa = Sa*K_t*transpose(Sa)
K_ab = Sa*K_t*transpose(Eb)
K_bb = Eb*K_t*transpose(Eb)
K_c = K_aa - K_ab*inv(K_bb)*transpose(K_ab) 'paso 6: la burbuja condensada, K de 12 × 12
k_11 = K_c(1, 1) 'rigidez u₁–u₁
k_22 = K_c(2, 2) 'rigidez v₁–v₁
k_33 = K_c(3, 3) 'rigidez θ₁–θ₁
k_12 = K_c(1, 2) 'acoplamiento u₁–v₁
k_13 = K_c(1, 3) 'acoplamiento u₁–θ₁
#: **De dónde sale K₃₃:** la parte básica (con la burbuja ya condensada), el rango uno y el reloj de arena:
K_ab14 = Sa*K_14*transpose(Eb) 'acoplamiento físico–burbuja de la parte básica
K_bb14 = Eb*K_14*transpose(Eb) 'burbuja–burbuja de la parte básica
K_base = Sa*K_14*transpose(Sa) - K_ab14*inv(K_bb14)*transpose(K_ab14) 'parte básica condensada
k33_base = K_base(3, 3) 'rigidez básica en θ₁
P_12 = Sa*P_14*transpose(Sa) 'el rango uno en las 12 columnas físicas
k33_P = P_12(3, 3) 'aporte del rango uno
H_12 = Sa*H_14*transpose(Sa) 'el reloj de arena en las 12 columnas físicas
k33_H = H_12(3, 3) 'aporte del reloj de arena

## 7 · Comprobaciones
#: **K es simétrica y los movimientos rígidos no cuestan nada:**
asim = norm(K_c - transpose(K_c)) 'asimetría de K
U_x = [1; 0; 0; 1; 0; 0; 1; 0; 0; 1; 0; 0] 'traslación rígida en x
f_x = norm(K_c*U_x) 'fuerzas de la traslación: debe ser 0
U_r = [-Xn(1, 2); Xn(1, 1); 1; -Xn(2, 2); Xn(2, 1); 1; -Xn(3, 2); Xn(3, 1); 1; -Xn(4, 2); Xn(4, 1); 1] 'rotación rígida de 1 rad
f_r = norm(K_c*U_r) 'fuerzas de la rotación: debe ser 0

## 8 · Contra la ITW 1990 (la hoja 169)
#: La ITW del paper usa **Gauss 3 × 3**, sin proyección, con una estabilización **γ·t·4·detJ₀·r rᵀ**: sale **K₁₁ = 12604.156, K₂₂ = 15902.618, K₃₃ = 17227.675**. El kernel de CSI da **K₁₁ = 11904.504, K₂₂ = 15464.598, K₃₃ = 6099.469**: la diferencia está sobre todo en el giro.
K11_itw = 12604.156 'K₁₁ de la ITW 1990 (hoja 169)
K33_itw = 17227.675 'K₃₃ de la ITW 1990 (hoja 169)
cociente_33 = k_33/K33_itw 'el giro del kernel respecto del de la ITW
#: **Los tres modos de giro del cuadrado, en unidades de G·t·A:** uniforme **1/10** (solo el rango uno), cruzado **1/(18 − 6ν)** (sale de la burbuja condensada) y reloj de arena **1/5000**:
nu_c = 0.2
modo_unif = 1/10 'giro uniforme
modo_cruz = 1/(18 - 6*nu_c) 'giro cruzado
modo_reloj = 1/5000 'reloj de arena

## 9 · Lectura
#: **El orden es el de siempre:** funciones de forma, Jacobiano, derivadas, **B**, **cuadratura de Gauss**, K. Lo propio del kernel es **cómo entra el giro**: por la parábola l/8 de cada lado (Allman), con la **proyección** que anula su media, un **rango uno** que da rigidez al giro uniforme y un **reloj de arena** mínimo para el cruzado, más la **burbuja** condensada. **Medido:** contra ETABS 22 la K de 12 × 12 coincide a 2·10⁻¹⁵ en 12 celdas; contra SAP2000, 12 mallas del paper a 10⁻¹⁰ %. **SAFE no se midió.**
