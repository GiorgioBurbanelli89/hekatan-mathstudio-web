# Pórtico de un piso: análisis lineal y no lineal (P-Δ) con deformada y diagramas en 2D y en 3D
#numerico

#: **Qué se calcula.** Un pórtico de hormigón de un piso, de 5 m × 5 m en planta y 3 m de alto, empotrado en el suelo. Se le aplica una fuerza lateral H y el peso P en cada nudo del techo. Se resuelve de dos maneras: **lineal** (la rigidez no cambia: K·u = F) y **no lineal geométrica P-Δ** (la fuerza axial de las columnas le quita rigidez lateral: se repite hasta que sobre equilibrio, método de Newton con rigidez tangente).
#: **Por qué importa.** En lineal el desplazamiento crece en línea recta con la carga. En P-Δ la gravedad «empuja» a la columna ya inclinada y la curva se dobla hacia arriba: la estructura se vuelve más flexible. Cerca de la carga crítica λ_{cr} la flecha se dispara.
#: **De dónde sale.** Es el modelo de los videos del pórtico 3D, comprobado contra **OpenSees 3.7.1** (elasticBeamColumn, Linear y PDelta): lineal con error relativo 1e-15 y P-Δ con 1e-8 en el residuo de Newton. Barra 3D de Euler-Bernoulli de 12 × 12, 6 grados de libertad por nudo (48, de los cuales 24 son libres). Unidades kN, m, kPa.

## 1 · Datos
#dibujo("El pórtico: elevación (plano x-z) con apoyos, cargas y cotas", ud = m, escala = auto, cotas = m, alto = 120, lado = derecha)
#  polilinea(0, 0, 0, H_c, L_x, H_c, L_x, 0, "gruesa")
#  empotramiento(-0.4, 0, L_x + 0.4, 0, -1)
#  flecha(-1.4, H_c, -0.12, H_c, "gruesa rojo")
#  texto(-1.4, H_c + 0.25, "H/4 por nudo", 2.4, "i")
#  flecha(0, H_c + 0.9, 0, H_c + 0.12, "gruesa verde")
#  flecha(L_x, H_c + 0.9, L_x, H_c + 0.12, "gruesa verde")
#  texto(0.15, H_c + 0.7, "P por nudo", 2.4, "i")
#  texto(0.15, H_c/2, "columnas", 2.4, "i")
#  texto(L_x/2, H_c + 0.2, "vigas", 2.4, "c")
#  cota(0, -0.55, L_x, -0.55, 0, "5.00")
#  cota(-0.75, 0, -0.75, H_c, 0, "3.00")
#  hover([0, L_x], [0, 0], "nudo {#1:0} (empotrado): x = {#2:1} m, z = {#3:1} m", [1, 2], [0, L_x], [0, 0])
#  hover([0, L_x], [H_c, H_c], "nudo {#1:0} (libre): x = {#2:1} m, z = {#3:1} m\nH/4 = {#4:1} kN, P = {#5:0} kN", [5, 6], [0, L_x], [H_c, H_c], H_total/4, P_nolineal)
#  hover([0, L_x, L_x/2], [H_c/2, H_c/2, H_c], "{#1:0}\nsección {#2:2} x {#2:2} m, L = {#3:2} m\nE = {#4:0} kPa", [1, 2, 5], lado_s, [H_c, H_c, L_x], E_m)
#fin
E_m = 2.5e7 'módulo de elasticidad del hormigón [kPa]
nu_p = 0.2 'coeficiente de Poisson
lado_s = 0.40 'lado de la sección cuadrada de columnas y vigas [m]
H_total = 50.0 'fuerza lateral total en x, repartida en los 4 nudos del techo [kN]
P_lineal = 1000.0 'gravedad por nudo del techo en el análisis lineal [kN]
P_nolineal = 8000.0 'gravedad por nudo del techo en el análisis no lineal, alta para que se note P-Δ [kN]
n_inc = 10 'incrementos de carga hasta λ = 1
tol = 1.0e-6 'tolerancia del residuo de Newton [kN]
iter_max = 20 'iteraciones máximas de Newton por paso
tan_completa = 0 'cero usa la tangente normal; uno añade el término dKg/dN
nudos = [0.0, 0.0, 0.0, 1; 5.0, 0.0, 0.0, 1; 5.0, 5.0, 0.0, 1; 0.0, 5.0, 0.0, 1; 0.0, 0.0, 3.0, 0; 5.0, 0.0, 3.0, 0; 5.0, 5.0, 3.0, 0; 0.0, 5.0, 3.0, 0] 'nudos: x, y, z [m] y 1 = empotrado, 0 = libre (1 a 4 en el suelo, 5 a 8 en el techo)
barras = [1, 5, 1, 0, 0; 2, 6, 1, 0, 0; 3, 7, 1, 0, 0; 4, 8, 1, 0, 0; 5, 6, 0, 0, 1; 6, 7, 0, 0, 1; 7, 8, 0, 0, 1; 8, 5, 0, 0, 1] 'barras: nudo i, nudo j y el vector que fija el eje local (1-4 columnas, 5-8 vigas)
kg_tipo = 2 'matriz geométrica: 2 es la de cuerda N/L, igual al PDelta de OpenSees; 1 es la consistente cúbica
#: Los datos de arriba son los de un solo archivo para todos los lenguajes. Lo que sigue se deduce de ellos.
G_m = E_m/(2·(1 + nu_p)) 'módulo de corte [kPa]
A_s = lado_s^2 'área de la sección [m²]
I_s = lado_s^4/12 'inercia de la sección, igual en los dos ejes [m⁴]
J_s = 0.1406·lado_s^4 'constante de torsión [m⁴]
n_n = 8 'número de nudos
n_b = 8 'número de barras
n_g = 48 'grados de libertad en total
Pm = [E_m, A_s, I_s, I_s, kg_tipo] 'parámetros que se pasan a las funciones: E, A, Iy, Iz, tipo de matriz geométrica
esc = 400 'amplificación de las deformadas dibujadas (solo para verlas)
L_x = nudos(2, 1) 'luz del pórtico en x [m]
H_c = nudos(5, 3) 'altura de las columnas [m]
X_n = nudos(1:8, 1:3) 'coordenadas x, y, z de los 8 nudos [m]
e_n = barras(1:8, 1:2) 'barras: nudo inicial y final de cada una
sin_losa = [1, 1, 1, 1] 'este modelo no tiene losa: una cara de área cero en el nudo 1 (no se ve)
apoyo_nudo = nudos(1:8, 4) 'apoyo de cada nudo: 1 = empotrado, 0 = libre
sin_valor = zeros(8, 2) 'sin diagrama sobre las barras
#: **El modelo en 3D con cursor.** Arrastra para girar, rueda para acercar; al pasar el cursor sobre un nudo o una barra sale el valor (aquí, si el nudo es apoyo).
#modelo3d(X_n, sin_losa, e_n, apoyo_nudo, sin_valor)

## 2 · La idea: la rigidez de una columna, con y sin carga axial

#: Para una columna de altura L, la flexión en un plano mueve 4 grados de libertad (desplazamiento y giro en cada extremo). Su rigidez elástica es EI/L³ por la matriz de abajo. La carga axial N (compresión = negativa) suma una **rigidez geométrica** N/(30L) por otra matriz: con compresión resta rigidez, con tracción suma.
L_c = 3 'altura de la columna [m]
EI_c = E_m·I_s 'rigidez a flexión EI [kN·m²]
k_flex = EI_c/L_c^3·[12, 6·L_c, -12, 6·L_c; 6·L_c, 4·L_c^2, -6·L_c, 2·L_c^2; -12, -6·L_c, 12, -6·L_c; 6·L_c, 2·L_c^2, -6·L_c, 4·L_c^2] 'rigidez elástica de flexión de una columna (u1, θ1, u2, θ2)
N_ej = -8000 'una compresión de ejemplo [kN]
k_geo = N_ej/(30·L_c)·[36, 3·L_c, -36, 3·L_c; 3·L_c, 4·L_c^2, -3·L_c, -L_c^2; -36, -3·L_c, 36, -3·L_c; 3·L_c, -L_c^2, -3·L_c, 4·L_c^2] 'rigidez geométrica de esa compresión: es negativa, resta rigidez
k_tan = k_flex + k_geo 'rigidez tangente: la suma de las dos
rig_perdida = 100·(1 - k_tan(1, 1)/k_flex(1, 1)) 'porcentaje de rigidez lateral que pierde esa columna con esa compresión [%]

## 3 · Cómo se arma cada barra (todo en línea, sin funciones)

#: En esta hoja no hay funciones aparte: todo se escribe en el mismo `for` del ensamblaje, una pieza tras otra, para que se lea de arriba abajo y corra igual en Hekatan LISP y en Math Studio web. Cada barra necesita tres piezas.
#: **1) La rigidez local k (12 × 12).** Axial EA/L, torsión GJ/L y flexión en los dos planos: 12EI/L³, 6EI/L², 4EI/L y 2EI/L. El orden de los 12 grados de libertad es u v w θx θy θz en el nudo i y lo mismo en el j.
#: **2) La matriz T (12 × 12).** Gira los ejes globales a los de la barra: x local = de i a j; y = vxz × x; z = x × y (igual que geomTransf de OpenSees). La rigidez de la barra en ejes globales es Tᵀ·k·T.
#: **3) La rigidez geométrica k_g.** Es lineal en la fuerza axial N: se calcula UNA vez para N = 1 y luego se multiplica por la N de cada barra en cada iteración. Con kg_tipo = 2 es la de «cuerda» (N/L, igual al PDelta de OpenSees); con 1, la consistente cúbica (N/(30L)).
#: **Resolver K·u = F.** Con la inversa de la matriz de los 24 grados de libertad libres. **Pandeo:** se prueba si K_e + λ·K_g aún es definida positiva con una factorización de Cholesky escrita aquí mismo (si algún pivote es ≤ 0 ya no lo es).

## 4 · Ensamblaje: la rigidez de cada barra en el sistema global
#: Por cada barra: k local (12 × 12), la matriz T que gira de global a local, y se suma Tᵀ·k·T en las filas y columnas de sus dos nudos. Así queda la rigidez elástica K_{e} de toda la estructura (48 × 48).
#hide
K_e = zeros(n_g, n_g)
k_loc = zeros(96, 12)
T_all = zeros(96, 12)
G_all = zeros(96, 12)
KE_all = zeros(96, 12)
GT_all = zeros(96, 12)
L_b = zeros(n_b, 1)
#show
for e_b = 1:n_b
  i_n = barras(e_b, 1)
  j_n = barras(e_b, 2)
  dx = nudos(j_n, 1) - nudos(i_n, 1)
  dy = nudos(j_n, 2) - nudos(i_n, 2)
  dz = nudos(j_n, 3) - nudos(i_n, 3)
  Lb_e = sqrt(dx^2 + dy^2 + dz^2)
  L_b(e_b) = Lb_e
  EA = E_m*A_s
  GJ = G_m*J_s
  EIy = E_m*I_s
  EIz = E_m*I_s
  k_e = zeros(12, 12)
  k_e(1, 1) = EA/Lb_e
  k_e(1, 7) = -EA/Lb_e
  k_e(7, 7) = EA/Lb_e
  k_e(4, 4) = GJ/Lb_e
  k_e(4, 10) = -GJ/Lb_e
  k_e(10, 10) = GJ/Lb_e
  k_e(2, 2) = 12*EIz/Lb_e^3
  k_e(2, 6) = 6*EIz/Lb_e^2
  k_e(2, 8) = -12*EIz/Lb_e^3
  k_e(2, 12) = 6*EIz/Lb_e^2
  k_e(6, 6) = 4*EIz/Lb_e
  k_e(6, 8) = -6*EIz/Lb_e^2
  k_e(6, 12) = 2*EIz/Lb_e
  k_e(8, 8) = 12*EIz/Lb_e^3
  k_e(8, 12) = -6*EIz/Lb_e^2
  k_e(12, 12) = 4*EIz/Lb_e
  k_e(3, 3) = 12*EIy/Lb_e^3
  k_e(3, 5) = -6*EIy/Lb_e^2
  k_e(3, 9) = -12*EIy/Lb_e^3
  k_e(3, 11) = -6*EIy/Lb_e^2
  k_e(5, 5) = 4*EIy/Lb_e
  k_e(5, 9) = 6*EIy/Lb_e^2
  k_e(5, 11) = 2*EIy/Lb_e
  k_e(9, 9) = 12*EIy/Lb_e^3
  k_e(9, 11) = 6*EIy/Lb_e^2
  k_e(11, 11) = 4*EIy/Lb_e
  g_e = zeros(12, 12)
  if kg_tipo == 2
    cg = 1/Lb_e
    g_e(2, 2) = cg
    g_e(2, 8) = -cg
    g_e(8, 8) = cg
    g_e(3, 3) = cg
    g_e(3, 9) = -cg
    g_e(9, 9) = cg
  else
    cg = 1/(30*Lb_e)
    g_e(2, 2) = 36*cg
    g_e(2, 6) = 3*Lb_e*cg
    g_e(2, 8) = -36*cg
    g_e(2, 12) = 3*Lb_e*cg
    g_e(6, 6) = 4*Lb_e^2*cg
    g_e(6, 8) = -3*Lb_e*cg
    g_e(6, 12) = -Lb_e^2*cg
    g_e(8, 8) = 36*cg
    g_e(8, 12) = -3*Lb_e*cg
    g_e(12, 12) = 4*Lb_e^2*cg
    g_e(3, 3) = 36*cg
    g_e(3, 5) = -3*Lb_e*cg
    g_e(3, 9) = -36*cg
    g_e(3, 11) = -3*Lb_e*cg
    g_e(5, 5) = 4*Lb_e^2*cg
    g_e(5, 9) = 3*Lb_e*cg
    g_e(5, 11) = -Lb_e^2*cg
    g_e(9, 9) = 36*cg
    g_e(9, 11) = 3*Lb_e*cg
    g_e(11, 11) = 4*Lb_e^2*cg
    ct = (I_s + I_s)/(A_s*Lb_e)
    g_e(4, 4) = ct
    g_e(4, 10) = -ct
    g_e(10, 10) = ct
  end
  for i = 1:12
    for j = i + 1:12
      k_e(j, i) = k_e(i, j)
      g_e(j, i) = g_e(i, j)
    end
  end
  ex1 = dx/Lb_e
  ex2 = dy/Lb_e
  ex3 = dz/Lb_e
  va1 = barras(e_b, 3)
  va2 = barras(e_b, 4)
  va3 = barras(e_b, 5)
  ey1 = va2*ex3 - va3*ex2
  ey2 = va3*ex1 - va1*ex3
  ey3 = va1*ex2 - va2*ex1
  ny = sqrt(ey1^2 + ey2^2 + ey3^2)
  ey1 = ey1/ny
  ey2 = ey2/ny
  ey3 = ey3/ny
  ez1 = ex2*ey3 - ex3*ey2
  ez2 = ex3*ey1 - ex1*ey3
  ez3 = ex1*ey2 - ex2*ey1
  T_e = zeros(12, 12)
  for bq = 0:3
    T_e(3*bq + 1, 3*bq + 1) = ex1
    T_e(3*bq + 1, 3*bq + 2) = ex2
    T_e(3*bq + 1, 3*bq + 3) = ex3
    T_e(3*bq + 2, 3*bq + 1) = ey1
    T_e(3*bq + 2, 3*bq + 2) = ey2
    T_e(3*bq + 2, 3*bq + 3) = ey3
    T_e(3*bq + 3, 3*bq + 1) = ez1
    T_e(3*bq + 3, 3*bq + 2) = ez2
    T_e(3*bq + 3, 3*bq + 3) = ez3
  end
  kk_g = transpose(T_e)*k_e*T_e
  gg_g = transpose(T_e)*g_e*T_e
  a1 = 6*(i_n - 1)
  a2 = 6*(j_n - 1)
  gdl = [a1 + 1, a1 + 2, a1 + 3, a1 + 4, a1 + 5, a1 + 6, a2 + 1, a2 + 2, a2 + 3, a2 + 4, a2 + 5, a2 + 6]
  K_e(gdl, gdl) = K_e(gdl, gdl) + kk_g
  r0 = 12*(e_b - 1)
  for i = 1:12
    for j = 1:12
      k_loc(r0 + i, j) = k_e(i, j)
      T_all(r0 + i, j) = T_e(i, j)
      G_all(r0 + i, j) = g_e(i, j)
      KE_all(r0 + i, j) = kk_g(i, j)
      GT_all(r0 + i, j) = gg_g(i, j)
    end
  end
end

#: Las cargas: H/4 en x y el peso en -z en cada uno de los 4 nudos del techo (nudos libres), y la lista de los 24 grados de libertad libres.
#hide
libre = zeros(24, 1)
F_lin = zeros(n_g, 1)
F_ext = zeros(n_g, 1)
#show
n_l = 0
for n = 1:n_n
  if nudos(n, 4) == 0
    F_lin(6·(n - 1) + 1) = H_total/4
    F_lin(6·(n - 1) + 3) = -P_lineal
    F_ext(6·(n - 1) + 1) = H_total/4
    F_ext(6·(n - 1) + 3) = -P_nolineal
    for a = 1:6
      n_l = n_l + 1
      libre(n_l) = 6·(n - 1) + a
    end
  end
end

## 5 · Análisis LINEAL: K·u = F
#: Se quitan los grados de libertad empotrados (los 24 del suelo) y se resuelve el sistema de 24 ecuaciones con el peso de P_lineal. Las reacciones salen de K·U − F y las fuerzas internas de cada barra de k_local·T·U.
#hide
Kff = K_e(libre, libre)
Ff = F_lin(libre)
#show
uf = inv(Kff)*Ff 'desplazamientos de los 24 GDL libres, con K·u = F [m]
#hide
U_l = zeros(n_g, 1)
for k = 1:24
  U_l(libre(k)) = uf(k)
end
R_l = K_e*U_l - F_lin
FI_l = zeros(n_b, 12)
#show
for e_b = 1:n_b
  a1 = 6*(barras(e_b, 1) - 1)
  a2 = 6*(barras(e_b, 2) - 1)
  gdl = [a1 + 1, a1 + 2, a1 + 3, a1 + 4, a1 + 5, a1 + 6, a2 + 1, a2 + 2, a2 + 3, a2 + 4, a2 + 5, a2 + 6]
  r0 = 12*(e_b - 1)
  u_l = T_all(r0 + 1:r0 + 12, 1:12)*U_l(gdl)
  f_l = k_loc(r0 + 1:r0 + 12, 1:12)*u_l
  for i = 1:12
    FI_l(e_b, i) = f_l(i)
  end
end
u_x5 = U_l(25) 'desplazamiento lateral del techo, nudo 5, en el análisis lineal [m]
N_l1 = FI_l(1, 1) 'fuerza axial en la columna 1, extremo i [kN]
M_l1 = FI_l(1, 5) 'momento en el pie de la columna 1 [kN·m]
R_z1 = R_l(3) 'reacción vertical del nudo 1 [kN]
#hide
SF_x = H_total
for n = 1:n_n
  SF_x = SF_x + R_l(6·(n - 1) + 1)
end
#show
SF_x 'suma de fuerzas en x: carga lateral más reacciones, debe dar 0 [kN]

## 6 · Carga crítica de pandeo y análisis lineal con la carga alta
#: Con la carga alta P_nolineal se calcula primero el resultado lineal. Después se busca la carga crítica: el menor λ para el cual K_{e} + λ·K_{g} deja de ser definida positiva (la estructura se vuelve inestable). Primero se duplica λ hasta que falle y luego se hace bisección: no se sabe cuántas vueltas hacen falta (por eso es while).
#hide
U_lin = zeros(n_g, 1)
uf2 = inv(K_e(libre, libre))*F_ext(libre)
for k = 1:24
  U_lin(libre(k)) = uf2(k)
end
#show
ux_lin = U_lin(25) 'desplazamiento lateral lineal del techo con la carga alta [m]
#hide
FI_k = zeros(n_b, 12)
Kg0 = zeros(n_g, n_g)
#show
#: Las fuerzas internas lineales de cada barra, y la rigidez geométrica de esas axiales N0 (K_g0): es la suma, barra por barra, de N0·Tᵀ·k_g(1)·T.
for e_b = 1:n_b
  a1 = 6*(barras(e_b, 1) - 1)
  a2 = 6*(barras(e_b, 2) - 1)
  gdl = [a1 + 1, a1 + 2, a1 + 3, a1 + 4, a1 + 5, a1 + 6, a2 + 1, a2 + 2, a2 + 3, a2 + 4, a2 + 5, a2 + 6]
  r0 = 12*(e_b - 1)
  u_l = T_all(r0 + 1:r0 + 12, 1:12)*U_lin(gdl)
  f_l = k_loc(r0 + 1:r0 + 12, 1:12)*u_l
  for i = 1:12
    FI_k(e_b, i) = f_l(i)
  end
  N0 = E_m*A_s/L_b(e_b)*(u_l(7) - u_l(1))
  Kg0(gdl, gdl) = Kg0(gdl, gdl) + N0*GT_all(r0 + 1:r0 + 12, 1:12)
end
#hide
Kff0 = K_e(libre, libre)
Kgg0 = Kg0(libre, libre)
#show
#: Se duplica λ hasta que K_e + λ·K_g deje de ser definida positiva y se afina por bisección (while: no se sabe cuántas vueltas hacen falta). La prueba es una factorización de Cholesky: si algún pivote es ≤ 0, ya no es definida positiva.
lam_lo = 0
lam_hi = 0
lam_t = 1
fin_c = 0
n_bis = 0
while fin_c == 0
  Kc = Kff0 + lam_t*Kgg0
  Lc = zeros(24, 24)
  ok = 1
  for i = 1:24
    for j = 1:i
      s = Kc(i, j)
      for k = 1:j - 1
        s = s - Lc(i, k)*Lc(j, k)
      end
      if i == j
        if s <= 0
          ok = 0
        else
          Lc(i, i) = sqrt(s)
        end
      else
        if ok == 1
          Lc(i, j) = s/Lc(j, j)
        end
      end
    end
  end
  if ok == 1
    lam_lo = lam_t
    if lam_hi == 0
      lam_t = 2*lam_t
    else
      lam_t = (lam_lo + lam_hi)/2
    end
  else
    lam_hi = lam_t
    lam_t = (lam_lo + lam_hi)/2
  end
  n_bis = n_bis + 1
  if lam_hi > 0
    if lam_hi - lam_lo <= 1e-13*lam_hi
      fin_c = 1
    end
  end
end
lam_cr = (lam_lo + lam_hi)/2 'factor de carga de pandeo λcr (con kg_tipo = 2: 5.36739; con 1: 4.76987)

#: **Deformada lineal con cursor.** Pórtico en 3D con la deformada lineal (solo el movimiento horizontal, amplificado esc veces). Arrastra para girar. El cursor sobre un nudo da su desplazamiento horizontal ux en mm; sobre una barra, el momento M de sus dos extremos en kN·m (positivo = tracción en la cara exterior).
#hide
U3_lineal = zeros(8, 3)
uxmm_lineal = zeros(8, 1)
Mext_lineal = zeros(8, 2)
#show
for n = 1:n_n
  U3_lineal(n, 1) = U_lin(6·(n - 1) + 1)
  U3_lineal(n, 2) = U_lin(6·(n - 1) + 2)
  uxmm_lineal(n) = 1000·U_lin(6·(n - 1) + 1)
end
for e = 1:n_b
  sg = 1
  if e <= 4
    sg = -1
  end
  Mext_lineal(e, 1) = sg·(-FI_k(e, 5))
  Mext_lineal(e, 2) = sg·FI_k(e, 11)
end
#modelo3d(X_n, sin_losa, e_n, uxmm_lineal, Mext_lineal, U3_lineal, esc)

## 7 · Análisis NO lineal P-Δ: control de carga y Newton
#: Se sube la carga de a pasos (for, λ = 0.1, 0.2 … 1). En cada paso se repite (while): se calcula el residuo R = λ·F − F_{int}(U); si es mayor que la tolerancia, se arma la rigidez tangente K_{t} = K_{e} + K_{g}(N) con la axial actual, se resuelve K_{t}·ΔU = R y se corrige U. Si un paso no converge, se divide a la mitad.
#hide
curva = zeros(60, 2)
U = zeros(n_g, 1)
#show
lam = 0
dlam_try = 1/n_inc
n_it = 0
n_c = 0
for inc = 1:n_inc
  lam_obj = inc/n_inc
  while lam < lam_obj - 1e-12
    dl = dlam_try
    if lam + dl > lam_obj
      dl = lam_obj - lam
    end
    lam_new = lam + dl
    U_prev = U + zeros(n_g, 1)
    iter = 0
    fin_n = 0
    while fin_n == 0
      F_int = zeros(n_g, 1)
      Kgn = zeros(n_g, n_g)
      for e_b = 1:n_b
        a1 = 6*(barras(e_b, 1) - 1)
        a2 = 6*(barras(e_b, 2) - 1)
        gdl = [a1 + 1, a1 + 2, a1 + 3, a1 + 4, a1 + 5, a1 + 6, a2 + 1, a2 + 2, a2 + 3, a2 + 4, a2 + 5, a2 + 6]
        r0 = 12*(e_b - 1)
        u_l = T_all(r0 + 1:r0 + 12, 1:12)*U(gdl)
        N_e = E_m*A_s/L_b(e_b)*(u_l(7) - u_l(1))
        kk = KE_all(r0 + 1:r0 + 12, 1:12) + N_e*GT_all(r0 + 1:r0 + 12, 1:12)
        fe = kk*U(gdl)
        for i = 1:12
          F_int(gdl(i)) = F_int(gdl(i)) + fe(i)
        end
        Kgn(gdl, gdl) = Kgn(gdl, gdl) + N_e*GT_all(r0 + 1:r0 + 12, 1:12)
      end
      Rr = lam_new*F_ext - F_int
      normR = 0
      for k = 1:24
        normR = normR + Rr(libre(k))^2
      end
      normR = sqrt(normR)
      if normR <= tol
        fin_n = 1
      else
        if iter >= iter_max
          fin_n = 1
        else
          Kt = K_e + Kgn
          du = inv(Kt(libre, libre))*Rr(libre)
          for k = 1:24
            U(libre(k)) = U(libre(k)) + du(k)
          end
          iter = iter + 1
          n_it = n_it + 1
        end
      end
    end
    if normR <= tol
      lam = lam_new
      dlam_try = 1/n_inc
    else
      U = U_prev + zeros(n_g, 1)
      dlam_try = dl/2
    end
  end
  n_c = n_c + 1
  curva(n_c, 1) = lam
  curva(n_c, 2) = U(25)
end
nit_1 = n_it
#hide
U_pd = U + zeros(n_g, 1)
#show
ux5_pd = U(25) 'desplazamiento lateral del techo con P-Δ, λ = 1 [m]
amp = U(25)/ux_lin 'factor de amplificación P-Δ / lineal
amp_teo = 1/(1 - 1/lam_cr) 'estimación 1/(1 - λ/λcr)
n_it 'iteraciones de Newton hasta λ = 1

## 8 · Fuerzas internas con P-Δ
#hide
FI_p = zeros(n_b, 12)
#show
for e_b = 1:n_b
  a1 = 6*(barras(e_b, 1) - 1)
  a2 = 6*(barras(e_b, 2) - 1)
  gdl = [a1 + 1, a1 + 2, a1 + 3, a1 + 4, a1 + 5, a1 + 6, a2 + 1, a2 + 2, a2 + 3, a2 + 4, a2 + 5, a2 + 6]
  r0 = 12*(e_b - 1)
  u_l = T_all(r0 + 1:r0 + 12, 1:12)*U_pd(gdl)
  N_e = E_m*A_s/L_b(e_b)*(u_l(7) - u_l(1))
  f_l = (k_loc(r0 + 1:r0 + 12, 1:12) + N_e*G_all(r0 + 1:r0 + 12, 1:12))*u_l
  for i = 1:12
    FI_p(e_b, i) = f_l(i)
  end
end
M_p1 = FI_p(1, 5) 'momento en el pie de la columna 1 con P-Δ [kN·m]
M_k1 = FI_k(1, 5) 'momento en el pie de la columna 1 lineal con la misma carga [kN·m]
N_p1 = FI_p(1, 1) 'fuerza axial de la columna 1 con P-Δ [kN]

#: **Deformada con P-Δ y cursor.** Lo mismo con el análisis no lineal: cursor sobre un nudo da ux en mm; sobre una barra, M en sus extremos con P-Δ (kN·m).
#hide
U3_pdelta = zeros(8, 3)
uxmm_pdelta = zeros(8, 1)
Mext_pdelta = zeros(8, 2)
#show
for n = 1:n_n
  U3_pdelta(n, 1) = U_pd(6·(n - 1) + 1)
  U3_pdelta(n, 2) = U_pd(6·(n - 1) + 2)
  uxmm_pdelta(n) = 1000·U_pd(6·(n - 1) + 1)
end
for e = 1:n_b
  sg = 1
  if e <= 4
    sg = -1
  end
  Mext_pdelta(e, 1) = sg·(-FI_p(e, 5))
  Mext_pdelta(e, 2) = sg·FI_p(e, 11)
end
#modelo3d(X_n, sin_losa, e_n, uxmm_pdelta, Mext_pdelta, U3_pdelta, esc)

## 9 · La curva completa hasta cerca del pandeo
#: Se sigue subiendo la carga de λ = 1 hasta cerca de λ_{cr} con el mismo Newton, para ver cuánto se aleja la curva real de la recta lineal. Se guarda cada punto (λ, desplazamiento del techo).
lam_fin = 0.9·lam_cr 'carga final de la curva [λ]
n_ext = 12 'pasos de carga de la parte extendida
for inc = 1:n_ext
  lam_obj = 1 + inc*(lam_fin - 1)/n_ext
  while lam < lam_obj - 1e-12
    dl = dlam_try
    if lam + dl > lam_obj
      dl = lam_obj - lam
    end
    lam_new = lam + dl
    U_prev = U + zeros(n_g, 1)
    iter = 0
    fin_n = 0
    while fin_n == 0
      F_int = zeros(n_g, 1)
      Kgn = zeros(n_g, n_g)
      for e_b = 1:n_b
        a1 = 6*(barras(e_b, 1) - 1)
        a2 = 6*(barras(e_b, 2) - 1)
        gdl = [a1 + 1, a1 + 2, a1 + 3, a1 + 4, a1 + 5, a1 + 6, a2 + 1, a2 + 2, a2 + 3, a2 + 4, a2 + 5, a2 + 6]
        r0 = 12*(e_b - 1)
        u_l = T_all(r0 + 1:r0 + 12, 1:12)*U(gdl)
        N_e = E_m*A_s/L_b(e_b)*(u_l(7) - u_l(1))
        kk = KE_all(r0 + 1:r0 + 12, 1:12) + N_e*GT_all(r0 + 1:r0 + 12, 1:12)
        fe = kk*U(gdl)
        for i = 1:12
          F_int(gdl(i)) = F_int(gdl(i)) + fe(i)
        end
        Kgn(gdl, gdl) = Kgn(gdl, gdl) + N_e*GT_all(r0 + 1:r0 + 12, 1:12)
      end
      Rr = lam_new*F_ext - F_int
      normR = 0
      for k = 1:24
        normR = normR + Rr(libre(k))^2
      end
      normR = sqrt(normR)
      if normR <= tol
        fin_n = 1
      else
        if iter >= iter_max
          fin_n = 1
        else
          Kt = K_e + Kgn
          du = inv(Kt(libre, libre))*Rr(libre)
          for k = 1:24
            U(libre(k)) = U(libre(k)) + du(k)
          end
          iter = iter + 1
          n_it = n_it + 1
        end
      end
    end
    if normR <= tol
      lam = lam_new
      dlam_try = 1.0
    else
      U = U_prev + zeros(n_g, 1)
      dlam_try = dl/2
    end
  end
  n_c = n_c + 1
  curva(n_c, 1) = lam
  curva(n_c, 2) = U(25)
end
ux5_fin = U(25) 'desplazamiento lateral del techo en el último paso [m]
amp_fin = ux5_fin/(lam·ux_lin) 'amplificación respecto a la recta lineal en ese paso
#hide
cv_x = zeros(n_c + 1, 1)
cv_y = zeros(n_c + 1, 1)
for k = 1:n_c
  cv_x(k + 1) = curva(k, 2)·1000
  cv_y(k + 1) = curva(k, 1)
end
x_max = 1000·ux5_fin
sy = 0.8·x_max/lam_fin
lin_x = [0, 1000·ux_lin·lam_fin]
lin_y = [0, sy·lam_fin]
cv_ys = sy·cv_y
#show

## 10 · Gráficas 2D
#: **Elevación del pórtico** (plano x-z, y = 0). Gris: sin deformar. Azul: deformada lineal. Rojo: deformada con P-Δ a la misma carga. Todo amplificado esc veces para que se vea; la curva de cada columna pasa por los giros de sus extremos. Cada dibujo se hace de un solo trazo: el recorrido por las barras (una barra negativa se recorre al revés).
lista2 = [1, 5, -2]
lista3 = [1, 5, -2, 2, 6, -3, 3, 7, -4, 4, 8]
#hide
UU = zeros(n_g, 3)
for k = 1:n_g
  UU(k, 2) = U_lin(k)
  UU(k, 3) = U_pd(k)
end
PX = zeros(121, 3)
PY = zeros(121, 3)
PZ = zeros(121, 3)
#show
#: Los 121 puntos (11 por barra) de las 11 barras del recorrido, para los tres casos: sin deformar, lineal y P-Δ. Cada barra sale por la curva cúbica de Hermite que pasa por los giros de sus extremos (solo se amplifica el movimiento horizontal y los giros; las vigas en y van rectas entre los nudos desplazados).
for vv = 1:3
  esc_v = esc
  if vv == 1
    esc_v = 0
  end
  for q = 1:11
    e_b = abs(lista3(q))
    i_n = barras(e_b, 1)
    j_n = barras(e_b, 2)
    xi = nudos(i_n, 1)
    yi = nudos(i_n, 2)
    zi = nudos(i_n, 3)
    xj = nudos(j_n, 1)
    yj = nudos(j_n, 2)
    zj = nudos(j_n, 3)
    ui1 = UU(6*(i_n - 1) + 1, vv)
    ui2 = UU(6*(i_n - 1) + 2, vv)
    ui5 = UU(6*(i_n - 1) + 5, vv)
    uj1 = UU(6*(j_n - 1) + 1, vv)
    uj2 = UU(6*(j_n - 1) + 2, vv)
    uj5 = UU(6*(j_n - 1) + 5, vv)
    Lh = sqrt((xj - xi)^2 + (yj - yi)^2 + (zj - zi)^2)
    hx = (xj - xi)/Lh
    hz = (zj - zi)/Lh
    nx = -hz
    nz = hx
    herm = 0
    if yi == yj
      herm = 1
    end
    a_i = ui1*hx
    a_j = uj1*hx
    v_i = ui1*nx
    v_j = uj1*nx
    m_i = -ui5
    m_j = -uj5
    for k = 1:11
      t = (k - 1)/10
      sl = t*Lh
      a_t = a_i + (a_j - a_i)*t
      if herm == 1
        v_t = v_i*(1 - 3*t^2 + 2*t^3) + Lh*m_i*(t - 2*t^2 + t^3) + v_j*(3*t^2 - 2*t^3) + Lh*m_j*(-t^2 + t^3)
        px = xi + hx*sl + esc_v*(hx*a_t + nx*v_t)
        pz = zi + hz*sl + esc_v*(hz*a_t + nz*v_t)
        py = yi
      else
        px = xi + (xj - xi)*t + esc_v*(ui1 + (uj1 - ui1)*t)
        py = yi + (yj - yi)*t + esc_v*(ui2 + (uj2 - ui2)*t)
        pz = zi + (zj - zi)*t
      end
      kk = k
      if lista3(q) < 0
        kk = 12 - k
      end
      PX(11*(q - 1) + kk, vv) = px
      PY(11*(q - 1) + kk, vv) = py
      PZ(11*(q - 1) + kk, vv) = pz
    end
  end
end
e0x = PX(1:33, 1) 'elevación sin deformar: x de cada punto del recorrido [m]
e0z = PZ(1:33, 1) 'elevación sin deformar: z de cada punto del recorrido [m]
elx = PX(1:33, 2) 'elevación lineal amplificada: x [m]
elz = PZ(1:33, 2) 'elevación lineal amplificada: z [m]
epx = PX(1:33, 3) 'elevación P-Δ amplificada: x [m]
epz = PZ(1:33, 3) 'elevación P-Δ amplificada: z [m]
#: **Valores en 33 puntos del recorrido** (para el cursor de los dibujos y de las gráficas): abscisa en m a lo largo del pórtico (de 0 a 3 la columna izquierda de abajo hacia arriba, de 3 a 8 la viga, de 8 a 11 la columna derecha de arriba hacia abajo), M, V, N y ux de cada punto, lineal y con P-Δ. Hb es la barra, Hx la distancia desde su extremo i en m. Signo: positivo = tracción en la cara exterior.
#hide
cum = [0, L_b(1), L_b(1) + L_b(5)]
pth = [1, 5, 2]
dir_p = [1, 1, -1]
M_lin = zeros(33, 2)
M_pdelta = zeros(33, 2)
V_lin = zeros(33, 2)
V_pdelta = zeros(33, 2)
N_lin = zeros(33, 2)
N_pdelta = zeros(33, 2)
D_lin = zeros(33, 2)
D_pdelta = zeros(33, 2)
Hb = zeros(33, 1)
Hx = zeros(33, 1)
Hml = zeros(33, 1)
Hmp = zeros(33, 1)
Hvl = zeros(33, 1)
Hvp = zeros(33, 1)
Hnl = zeros(33, 1)
Hnp = zeros(33, 1)
Hdl = zeros(33, 1)
Hdp = zeros(33, 1)
#show
for q = 1:3
  e_b = pth(q)
  sg = 1
  if e_b <= 4
    sg = -1
  end
  i_n = barras(e_b, 1)
  j_n = barras(e_b, 2)
  for k = 1:11
    t = (k - 1)/10
    s = t
    if dir_p(q) < 0
      s = 1 - t
    end
    r = 11·(q - 1) + k
    xx = cum(q) + t·L_b(e_b)
    M_lin(r, 1) = xx
    M_pdelta(r, 1) = xx
    V_lin(r, 1) = xx
    V_pdelta(r, 1) = xx
    N_lin(r, 1) = xx
    N_pdelta(r, 1) = xx
    D_lin(r, 1) = xx
    D_pdelta(r, 1) = xx
    M_lin(r, 2) = sg·((1 - s)·(-FI_k(e_b, 5)) + s·FI_k(e_b, 11))
    M_pdelta(r, 2) = sg·((1 - s)·(-FI_p(e_b, 5)) + s·FI_p(e_b, 11))
    V_lin(r, 2) = sg·((1 - s)·FI_k(e_b, 3) + s·(-FI_k(e_b, 9)))
    V_pdelta(r, 2) = sg·((1 - s)·FI_p(e_b, 3) + s·(-FI_p(e_b, 9)))
    N_lin(r, 2) = sg·((1 - s)·(-FI_k(e_b, 1)) + s·FI_k(e_b, 7))
    N_pdelta(r, 2) = sg·((1 - s)·(-FI_p(e_b, 1)) + s·FI_p(e_b, 7))
    D_lin(r, 2) = 1000·(elx(r) - e0x(r))/esc
    D_pdelta(r, 2) = 1000·(epx(r) - e0x(r))/esc
    Hb(r) = e_b
    Hx(r) = s·L_b(e_b)
    Hml(r) = M_lin(r, 2)
    Hmp(r) = M_pdelta(r, 2)
    Hvl(r) = V_lin(r, 2)
    Hvp(r) = V_pdelta(r, 2)
    Hnl(r) = N_lin(r, 2)
    Hnp(r) = N_pdelta(r, 2)
    Hdl(r) = D_lin(r, 2)
    Hdp(r) = D_pdelta(r, 2)
  end
end

#dibujo("Elevación: sin deformar (gris), lineal (azul) y P-Δ (rojo), amplificadas ×400", ud = m, escala = auto, alto = 110, lado = derecha)
#  polilinea(e0x, e0z, "media gris")
#  polilinea(elx, elz, "gruesa azul")
#  polilinea(epx, epz, "gruesa rojo")
#  hover(e0x, e0z, "barra {#1:0}, x = {#2:2} m: ux = {#3:2} mm (lineal) / {#4:2} mm (P-Δ)", Hb, Hx, Hdl, Hdp)
#  hover(elx, elz, "barra {#1:0}, x = {#2:2} m: ux = {#3:2} mm (lineal) / {#4:2} mm (P-Δ)", Hb, Hx, Hdl, Hdp)
#  hover(epx, epz, "barra {#1:0}, x = {#2:2} m: ux = {#3:2} mm (lineal) / {#4:2} mm (P-Δ)", Hb, Hx, Hdl, Hdp)
#  flecha(-1.3, 3, -0.15, 3, "gruesa verde")
#  texto(-1.3, 3.25, "H/4 por nudo", 2.4, "i")
#  texto(2.5, 3.6, "lineal: azul · P-Δ: rojo", 2.6, "c")
#fin

#: **Diagramas de la elevación.** Se dibujan sobre cada barra, perpendiculares a ella: el momento M (kN·m), el cortante V (kN) y la fuerza axial N (kN, tracción positiva). Azul: lineal con la misma carga. Rojo: P-Δ. Cada diagrama tiene su escala para que mida 1 m en su valor máximo.
#hide
Mi_k = zeros(8, 1)
Mj_k = zeros(8, 1)
Mi_p = zeros(8, 1)
Mj_p = zeros(8, 1)
Vi_k = zeros(8, 1)
Vj_k = zeros(8, 1)
Vi_p = zeros(8, 1)
Vj_p = zeros(8, 1)
Ni_k = zeros(8, 1)
Nj_k = zeros(8, 1)
Ni_p = zeros(8, 1)
Nj_p = zeros(8, 1)
mx_M = 0
mx_V = 0
mx_N = 0
for e_b = 1:8
  sg = 1
  if e_b <= 4
    sg = -1
  end
  Mi_k(e_b) = sg·(-FI_k(e_b, 5))
  Mj_k(e_b) = sg·(FI_k(e_b, 11))
  Mi_p(e_b) = sg·(-FI_p(e_b, 5))
  Mj_p(e_b) = sg·(FI_p(e_b, 11))
  Vi_k(e_b) = sg·(FI_k(e_b, 3))
  Vj_k(e_b) = sg·(-FI_k(e_b, 9))
  Vi_p(e_b) = sg·(FI_p(e_b, 3))
  Vj_p(e_b) = sg·(-FI_p(e_b, 9))
  Ni_k(e_b) = sg·(-FI_k(e_b, 1))
  Nj_k(e_b) = sg·(FI_k(e_b, 7))
  Ni_p(e_b) = sg·(-FI_p(e_b, 1))
  Nj_p(e_b) = sg·(FI_p(e_b, 7))
  mx_M = max([mx_M, abs(Mi_p(e_b)), abs(Mj_p(e_b)), abs(Mi_k(e_b)), abs(Mj_k(e_b))])
  mx_V = max([mx_V, abs(Vi_p(e_b)), abs(Vi_k(e_b))])
  mx_N = max([mx_N, abs(Ni_p(e_b)), abs(Ni_k(e_b))])
end

OI = zeros(8, 6)
OJ = zeros(8, 6)
for e_b = 1:8
  OI(e_b, 1) = Mi_k(e_b)
  OJ(e_b, 1) = Mj_k(e_b)
  OI(e_b, 2) = Mi_p(e_b)
  OJ(e_b, 2) = Mj_p(e_b)
  OI(e_b, 3) = Vi_k(e_b)
  OJ(e_b, 3) = Vj_k(e_b)
  OI(e_b, 4) = Vi_p(e_b)
  OJ(e_b, 4) = Vj_p(e_b)
  OI(e_b, 5) = Ni_k(e_b)
  OJ(e_b, 5) = Nj_k(e_b)
  OI(e_b, 6) = Ni_p(e_b)
  OJ(e_b, 6) = Nj_p(e_b)
end
DG = zeros(12, 12)
for d = 1:6
  sc = 1/mx_M
  if d >= 3
    sc = 1/mx_V
  end
  if d >= 5
    sc = 1/mx_N
  end
  for q = 1:3
    e_b = abs(lista2(q))
    i_n = barras(e_b, 1)
    j_n = barras(e_b, 2)
    dxg = nudos(j_n, 1) - nudos(i_n, 1)
    dzg = nudos(j_n, 3) - nudos(i_n, 3)
    Lg = sqrt(dxg^2 + dzg^2)
    nxg = -dzg/Lg
    nzg = dxg/Lg
    pxs = [nudos(i_n, 1), nudos(i_n, 1) + sc*OI(e_b, d)*nxg, nudos(j_n, 1) + sc*OJ(e_b, d)*nxg, nudos(j_n, 1)]
    pzs = [nudos(i_n, 3), nudos(i_n, 3) + sc*OI(e_b, d)*nzg, nudos(j_n, 3) + sc*OJ(e_b, d)*nzg, nudos(j_n, 3)]
    for k = 1:4
      kk = k
      if lista2(q) < 0
        kk = 5 - k
      end
      DG(4*(q - 1) + k, 2*d - 1) = pxs(kk)
      DG(4*(q - 1) + k, 2*d) = pzs(kk)
    end
  end
end
#show
mx_M 'momento máximo de los diagramas [kN·m]
mx_V 'cortante máximo de los diagramas [kN]
mx_N 'axial máximo de los diagramas [kN]
mkx = DG(1:12, 1) 'diagrama de M lineal: x [m]
mkz = DG(1:12, 2) 'diagrama de M lineal: z [m]
mpx = DG(1:12, 3) 'diagrama de M con P-Δ: x [m]
mpz = DG(1:12, 4) 'diagrama de M con P-Δ: z [m]
vkx = DG(1:12, 5) 'diagrama de V lineal: x [m]
vkz = DG(1:12, 6) 'diagrama de V lineal: z [m]
vpx = DG(1:12, 7) 'diagrama de V con P-Δ: x [m]
vpz = DG(1:12, 8) 'diagrama de V con P-Δ: z [m]
nkx = DG(1:12, 9) 'diagrama de N lineal: x [m]
nkz = DG(1:12, 10) 'diagrama de N lineal: z [m]
npx = DG(1:12, 11) 'diagrama de N con P-Δ: x [m]
npz = DG(1:12, 12) 'diagrama de N con P-Δ: z [m]
#dibujo("Momento M (kN·m): lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 100, lado = derecha)
#  polilinea(e0x, e0z, "fina gris")
#  polilinea(mkx, mkz, "media azul")
#  polilinea(mpx, mpz, "media rojo")
#  hover(e0x, e0z, "barra {#1:0}, x = {#2:2} m: M = {#3:2} kN·m (lineal) / {#4:2} kN·m (P-Δ)", Hb, Hx, Hml, Hmp)
#fin
#dibujo("Cortante V (kN): lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 100, lado = derecha)
#  polilinea(e0x, e0z, "fina gris")
#  polilinea(vkx, vkz, "media azul")
#  polilinea(vpx, vpz, "media rojo")
#  hover(e0x, e0z, "barra {#1:0}, x = {#2:2} m: V = {#3:2} kN (lineal) / {#4:2} kN (P-Δ)", Hb, Hx, Hvl, Hvp)
#fin
#dibujo("Axial N (kN, tracción +): lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 100, lado = derecha)
#  polilinea(e0x, e0z, "fina gris")
#  polilinea(nkx, nkz, "media azul")
#  polilinea(npx, npz, "media rojo")
#  hover(e0x, e0z, "barra {#1:0}, x = {#2:2} m: N = {#3:2} kN (lineal) / {#4:2} kN (P-Δ)", Hb, Hx, Hnl, Hnp)
#fin

#: **Curva carga-desplazamiento.** Eje horizontal: desplazamiento lateral del techo en mm. Eje vertical: el factor de carga λ (las cargas son λ·H y λ·P). Azul: la recta del análisis lineal. Rojo: la curva P-Δ, que se despega hacia la derecha y se vuelve casi horizontal al acercarse a λcr.
x_max = 1000·ux5_fin 'desplazamiento final del techo en la curva [mm]
sy = 0.8·x_max/lam_fin 'escala vertical para que la gráfica no quede aplastada [mm por unidad de λ]
lin_x = [0, 1000·ux_lin·lam_fin] 'recta lineal: desplazamiento de sus dos puntos [mm]
lin_y = [0, sy·lam_fin] 'recta lineal: altura de sus dos puntos (λ·sy)
#hide
cv_xx = zeros(n_c + 1, 1)
cv_yy = zeros(n_c + 1, 1)
for k = 1:n_c
  cv_xx(k + 1) = curva(k, 2)·1000
  cv_yy(k + 1) = sy·curva(k, 1)
end
#show
cv_x = cv_xx(1:n_c + 1) 'curva P-Δ: desplazamiento del techo en cada paso [mm]
cv_y = cv_yy(1:n_c + 1) 'curva P-Δ: λ de cada paso por sy
#: Cursor sobre cada punto: sale (desplazamiento del techo en mm; λ). Azul: lineal. Rojo: P-Δ.
#hide
C_lineal = zeros(n_c, 2)
C_pdelta = zeros(n_c, 2)
#show
for k = 1:n_c
  C_lineal(k, 1) = 1000·ux_lin·curva(k, 1)
  C_lineal(k, 2) = curva(k, 1)
  C_pdelta(k, 1) = 1000·curva(k, 2)
  C_pdelta(k, 2) = curva(k, 1)
end
#hide
cvl_x = zeros(n_c + 1, 1)
cvl_y = zeros(n_c + 1, 1)
cvl_l = zeros(n_c + 1, 1)
cvp_x = zeros(n_c + 1, 1)
cvp_y = zeros(n_c + 1, 1)
for k = 1:n_c
  cvl_x(k + 1) = C_lineal(k, 1)
  cvl_y(k + 1) = sy*C_lineal(k, 2)
  cvl_l(k + 1) = C_lineal(k, 2)
  cvp_x(k + 1) = C_pdelta(k, 1)
  cvp_y(k + 1) = sy*C_pdelta(k, 2)
end
#show
#dibujo("Curva carga-desplazamiento: lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 130)
#  linea(0, 0, 1.08*x_max, 0, "media")
#  linea(0, 0, 0, 1.1*sy*lam_fin, "media")
#  linea(0, sy, 1.08*x_max, sy, "fina trazos gris")
#  polilinea(cvl_x, cvl_y, "gruesa azul")
#  polilinea(cvp_x, cvp_y, "gruesa rojo")
#  texto(-0.02*x_max, sy, "λ = 1", 2.4, "d")
#  texto(-0.02*x_max, sy*lam_fin, "λ = 0.9 λcr", 2.4, "d")
#  texto(0.5*x_max, -0.12*sy, "desplazamiento del techo (mm)", 2.4, "c")
#  texto(0.1*x_max, 1.12*sy*lam_fin, "λ (factor de carga)", 2.4, "i")
#  hover(cvl_x, cvl_y, "lineal\nλ = {#1:3}\nux del techo = {#2:2} mm", cvl_l, cvl_x)
#  hover(cvp_x, cvp_y, "P-Δ\nλ = {#1:3}\nux del techo = {#2:2} mm", cvl_l, cvp_x)
#fin

#: **Los diagramas con cursor.** Abscisa = recorrido por el pórtico en m: de 0 a 3 la columna izquierda (de abajo hacia arriba), de 3 a 8 la viga, de 8 a 11 la columna derecha (de arriba hacia abajo). Cursor sobre un punto: sale (abscisa; valor). Signo: positivo = tracción en la cara exterior. Azul: lineal. Rojo: P-Δ.
#: Momento M (kN·m):
#hide
ab_x = M_lin(1:33, 1)
#show
#hide
gM_l = 3/mx_M*M_lin(1:33, 2)
gM_p = 3/mx_M*M_pdelta(1:33, 2)
#show
#dibujo("Momento M (kN·m) a lo largo del recorrido: lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 70)
#  linea(0, 0, 11, 0, "media")
#  linea(3, -3.4, 3, 3.4, "fina trazos gris")
#  linea(8, -3.4, 8, 3.4, "fina trazos gris")
#  texto(1.5, 3.6, "columna izq.", 2.2, "c")
#  texto(5.5, 3.6, "viga", 2.2, "c")
#  texto(9.5, 3.6, "columna der.", 2.2, "c")
#  polilinea(ab_x, gM_l, "gruesa azul")
#  polilinea(ab_x, gM_p, "gruesa rojo")
#  hover(ab_x, gM_l, "abscisa {#1:2} m (barra {#2:0})\nM = {#3:2} kN·m (lineal) / {#4:2} kN·m (P-Δ)", ab_x, Hb, Hml, Hmp)
#  hover(ab_x, gM_p, "abscisa {#1:2} m (barra {#2:0})\nM = {#3:2} kN·m (lineal) / {#4:2} kN·m (P-Δ)", ab_x, Hb, Hml, Hmp)
#fin
#: Cortante V (kN):
#hide
gV_l = 3/mx_V*V_lin(1:33, 2)
gV_p = 3/mx_V*V_pdelta(1:33, 2)
#show
#dibujo("Cortante V (kN) a lo largo del recorrido: lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 70)
#  linea(0, 0, 11, 0, "media")
#  linea(3, -3.4, 3, 3.4, "fina trazos gris")
#  linea(8, -3.4, 8, 3.4, "fina trazos gris")
#  texto(1.5, 3.6, "columna izq.", 2.2, "c")
#  texto(5.5, 3.6, "viga", 2.2, "c")
#  texto(9.5, 3.6, "columna der.", 2.2, "c")
#  polilinea(ab_x, gV_l, "gruesa azul")
#  polilinea(ab_x, gV_p, "gruesa rojo")
#  hover(ab_x, gV_l, "abscisa {#1:2} m (barra {#2:0})\nV = {#3:2} kN (lineal) / {#4:2} kN (P-Δ)", ab_x, Hb, Hvl, Hvp)
#  hover(ab_x, gV_p, "abscisa {#1:2} m (barra {#2:0})\nV = {#3:2} kN (lineal) / {#4:2} kN (P-Δ)", ab_x, Hb, Hvl, Hvp)
#fin
#: Axial N (kN, tracción positiva):
#hide
gN_l = 3/mx_N*N_lin(1:33, 2)
gN_p = 3/mx_N*N_pdelta(1:33, 2)
#show
#dibujo("Axial N (kN, tracción +) a lo largo del recorrido: lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 70)
#  linea(0, 0, 11, 0, "media")
#  linea(3, -3.4, 3, 3.4, "fina trazos gris")
#  linea(8, -3.4, 8, 3.4, "fina trazos gris")
#  texto(1.5, 3.6, "columna izq.", 2.2, "c")
#  texto(5.5, 3.6, "viga", 2.2, "c")
#  texto(9.5, 3.6, "columna der.", 2.2, "c")
#  polilinea(ab_x, gN_l, "gruesa azul")
#  polilinea(ab_x, gN_p, "gruesa rojo")
#  hover(ab_x, gN_l, "abscisa {#1:2} m (barra {#2:0})\nN = {#3:2} kN (lineal) / {#4:2} kN (P-Δ)", ab_x, Hb, Hnl, Hnp)
#  hover(ab_x, gN_p, "abscisa {#1:2} m (barra {#2:0})\nN = {#3:2} kN (lineal) / {#4:2} kN (P-Δ)", ab_x, Hb, Hnl, Hnp)
#fin
#: Desplazamiento horizontal ux a lo largo del recorrido (mm; la elevación con cursor):
#hide
mx_D = max(D_pdelta(1:33, 2))
#show
#hide
gD_l = 3/mx_D*D_lin(1:33, 2)
gD_p = 3/mx_D*D_pdelta(1:33, 2)
#show
#dibujo("Desplazamiento horizontal ux (mm) a lo largo del recorrido: lineal (azul) y P-Δ (rojo)", ud = m, escala = auto, alto = 70)
#  linea(0, 0, 11, 0, "media")
#  linea(3, -3.4, 3, 3.4, "fina trazos gris")
#  linea(8, -3.4, 8, 3.4, "fina trazos gris")
#  texto(1.5, 3.6, "columna izq.", 2.2, "c")
#  texto(5.5, 3.6, "viga", 2.2, "c")
#  texto(9.5, 3.6, "columna der.", 2.2, "c")
#  polilinea(ab_x, gD_l, "gruesa azul")
#  polilinea(ab_x, gD_p, "gruesa rojo")
#  hover(ab_x, gD_l, "abscisa {#1:2} m (barra {#2:0})\nux = {#3:2} mm (lineal) / {#4:2} mm (P-Δ)", ab_x, Hb, Hdl, Hdp)
#  hover(ab_x, gD_p, "abscisa {#1:2} m (barra {#2:0})\nux = {#3:2} mm (lineal) / {#4:2} mm (P-Δ)", ab_x, Hb, Hdl, Hdp)
#fin

## 11 · Gráfica 3D: el pórtico en perspectiva
#: Las 8 barras en vista tridimensional (se gira 35° alrededor de la vertical y se inclina 25°). Gris: sin deformar. Azul: lineal. Rojo: P-Δ. Las columnas y las vigas del plano x-z siguen la curva de Hermite; las vigas en y se dibujan rectas entre los nudos desplazados.
az_v = 35 'giro de la vista alrededor de la vertical [grados]
el_v = 25 'inclinación de la vista [grados]
#hide
#hide
ca = cos(az_v*0.017453292519943295)
sa = sin(az_v*0.017453292519943295)
ce = cos(el_v*0.017453292519943295)
se = sin(el_v*0.017453292519943295)
T3 = zeros(121, 6)
for r = 1:121
  for vv = 1:3
    T3(r, 2*vv - 1) = PX(r, vv)*ca + PY(r, vv)*sa
    T3(r, 2*vv) = PZ(r, vv)*ce + (-PX(r, vv)*sa + PY(r, vv)*ca)*se
  end
end
#show
t0x = T3(1:121, 1) 'vista 3D sin deformar: abscisa de cada punto [m]
t0z = T3(1:121, 2) 'vista 3D sin deformar: ordenada de cada punto [m]
tlx = T3(1:121, 3) 'vista 3D lineal: abscisa [m]
tlz = T3(1:121, 4) 'vista 3D lineal: ordenada [m]
tpx = T3(1:121, 5) 'vista 3D P-Δ: abscisa [m]
tpz = T3(1:121, 6) 'vista 3D P-Δ: ordenada [m]
#hide
nq_i = zeros(8, 1)
nq_x0 = zeros(8, 1)
nq_y0 = zeros(8, 1)
nq_z0 = zeros(8, 1)
nq_x = zeros(8, 1)
nq_z = zeros(8, 1)
nq_xl = zeros(8, 1)
nq_zl = zeros(8, 1)
nq_xp = zeros(8, 1)
nq_zp = zeros(8, 1)
nq_ul = zeros(8, 1)
nq_up = zeros(8, 1)
for n = 1:n_n
  nq_i(n) = n
  nq_x0(n) = X_n(n, 1)
  nq_y0(n) = X_n(n, 2)
  nq_z0(n) = X_n(n, 3)
  x0 = X_n(n, 1)
  y0 = X_n(n, 2)
  z0 = X_n(n, 3)
  xl = x0 + esc*U_lin(6*(n - 1) + 1)
  yl = y0 + esc*U_lin(6*(n - 1) + 2)
  xp = x0 + esc*U_pd(6*(n - 1) + 1)
  yp = y0 + esc*U_pd(6*(n - 1) + 2)
  nq_x(n) = x0*ca + y0*sa
  nq_z(n) = z0*ce + (-x0*sa + y0*ca)*se
  nq_xl(n) = xl*ca + yl*sa
  nq_zl(n) = z0*ce + (-xl*sa + yl*ca)*se
  nq_xp(n) = xp*ca + yp*sa
  nq_zp(n) = z0*ce + (-xp*sa + yp*ca)*se
  nq_ul(n) = 1000*U_lin(6*(n - 1) + 1)
  nq_up(n) = 1000*U_pd(6*(n - 1) + 1)
end
#show
#dibujo("Pórtico 3D: sin deformar (gris), lineal (azul) y P-Δ (rojo), amplificadas ×400", ud = m, escala = auto, alto = 130)
#  polilinea(t0x, t0z, "media gris")
#  polilinea(tlx, tlz, "gruesa azul")
#  polilinea(tpx, tpz, "gruesa rojo")
#  hover(nq_xl, nq_zl, "nudo {#1:0}: x = {#2:2}, y = {#3:2}, z = {#4:2} m\nux = {#5:2} mm (lineal) / {#6:2} mm (P-Δ)", nq_i, nq_x0, nq_y0, nq_z0, nq_ul, nq_up)
#  hover(nq_xp, nq_zp, "nudo {#1:0}: x = {#2:2}, y = {#3:2}, z = {#4:2} m\nux = {#5:2} mm (lineal) / {#6:2} mm (P-Δ)", nq_i, nq_x0, nq_y0, nq_z0, nq_ul, nq_up)
#fin

## 12 · Comprobación contra OpenSees 3.7.1
#: Los mismos números calculados con OpenSees (elasticBeamColumn: Linear para el lineal y PDelta para el no lineal) con el mismo modelo, nudo a nudo. La diferencia relativa debe ser del orden de 1e-12 o menor.
ux_os = 8.733272492881403e-04 'OpenSees lineal: desplazamiento ux del nudo 5 [m]
dif_ux = abs(u_x5 - ux_os)/ux_os 'diferencia relativa del lineal
M_os = 22.85054517674827 'OpenSees lineal: momento My en el pie de la columna 1 [kN·m]
dif_M = abs(M_l1 - M_os)/M_os 'diferencia relativa del momento
uxp_os = 1.073290497343695e-03 'OpenSees PDelta: desplazamiento ux del nudo 5 con P alta [m]
dif_uxp = abs(ux5_pd - uxp_os)/uxp_os 'diferencia relativa del P-Δ
N_os = 7992.798509774815 'OpenSees PDelta: fuerza axial de la columna 1 [kN]
dif_N = abs(abs(N_p1) - N_os)/N_os 'diferencia relativa de la axial
lcr_os = 5.36743 'OpenSees PDelta: carga crítica λcr, por ajuste 1/(1 - λ/λcr)
dif_lcr = abs(lam_cr - lcr_os)/lcr_os 'diferencia relativa de la carga crítica (OpenSees solo da 6 cifras)


#: **Contra los resultados de los videos** (carpeta portico3d, C++ con kg_tipo = 2, que ya coincide con OpenSees). Cada diferencia relativa debe ser del orden de 1e-12 o menor; la de λcr es del orden de 1e-15 porque aquí se calcula igual que en el C++ (y no por ajuste, como con OpenSees).
Rz_ref = 994.1402180706992 'C++ lineal: reacción vertical del nudo 1 [kN]
dif_Rz = abs(R_z1 - Rz_ref)/Rz_ref 'diferencia relativa de la reacción
Mv_ref = 14.64945482325159 'C++ lineal: momento en la cabeza de la columna 1 (nudo del techo) [kN·m]
dif_Mv = abs(FI_l(1, 11) - Mv_ref)/Mv_ref 'diferencia relativa del momento en la cabeza de la columna
lcr_cpp = 5.367390992364335 'C++ con kg_tipo = 2: carga crítica λcr por bisección
dif_lcrc = abs(lam_cr - lcr_cpp)/lcr_cpp 'diferencia relativa de λcr
amp_cpp = 1.228967146300020 'C++: amplificación ux(P-Δ)/ux(lineal) con la carga alta
dif_amp = abs(amp - amp_cpp)/amp_cpp 'diferencia relativa de la amplificación
c5_cpp = 4.815192093046097e-04 'C++: desplazamiento del techo en el paso 5 (λ = 0.5) [m]
dif_c5 = abs(curva(5, 2) - c5_cpp)/c5_cpp 'diferencia relativa del paso 5 de la curva
it_cpp = 29 'C++: iteraciones de Newton hasta λ = 1
dif_it = nit_1 - it_cpp 'diferencia en el número de iteraciones (debe ser 0)