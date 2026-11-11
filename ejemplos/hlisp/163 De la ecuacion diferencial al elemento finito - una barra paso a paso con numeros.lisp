# De la ecuación diferencial al elemento finito: una barra, paso a paso con números
#numerico
#: Una barra empotrada a la izquierda, con carga repartida q y una fuerza P en la punta. Se resuelve **tres veces**: a mano con la ecuación diferencial, comprobando la forma débil, y con elementos finitos. Las tres tienen que dar lo mismo.

## 1 · Datos
L = 4 'largo de la barra
EA = 10000 'rigidez axial (módulo por área)
q = 5 'carga repartida a lo largo de la barra
P = 10 'fuerza en la punta (x = L)

## 2 · La ecuación diferencial (forma fuerte)
#: Se corta una rebanada de ancho dx. **Equilibrio:** a la izquierda actúa la fuerza axial N, a la derecha N + dN, y dentro la carga q·dx, así que dN + q·dx = 0, o sea **N′ = −q**.
#: **Cinemática:** la deformación es la derivada del desplazamiento, ε = u′. **Constitutiva (Hooke):** N = EA·ε = EA·u′.
#: Se sustituye y queda **una sola ecuación con una incógnita**, la forma fuerte: **EA·u″ = −q**. Hay que integrarla dos veces, y cada integral trae una constante.
#: Condiciones de borde: **esencial** u(0) = 0 (el apoyo) y **natural** EA·u′(L) = P (la fuerza en la punta).

## 3 · Resolverla a mano: integrar dos veces
#: Primera integral: EA·u′ = −q·x + C₁. Segunda: EA·u = −q·x²/2 + C₁·x + C₂.
#: La natural en x = L da −q·L + C₁ = P. La esencial en x = 0 da C₂ = 0.
Ca = P + q*L 'de la condición natural
Cb = 0 'de la condición esencial
u(x) = (-q*x^2/2 + Ca*x + Cb)/EA 'desplazamiento exacto
N(x) = -q*x + Ca 'fuerza axial N = EA·u′
u_L = u(L) 'desplazamiento de la punta
u_mid = u(L/2) 'desplazamiento a media barra
N_0 = N(0) 'fuerza axial en el apoyo (debe ser P + q·L)
N_L = N(L) 'fuerza axial en la punta (debe ser P)

## 4 · La forma débil: la misma ecuación, pesada con v
#: Se multiplica la ecuación por una función v(x) con v(0) = 0 y se integra por partes. Queda: **∫EA·u′·v′ dx = ∫q·v dx + P·v(L)**, trabajo interno = trabajo externo. Se comprueba con la solución exacta, con dos funciones v distintas.
#: **Con v = x** (v′ = 1):
Ti1 = Integral{Ca - q*x @ x = 0 : L}
Te1 = Integral{q*x @ x = 0 : L} + P*L
dif_1 = Ti1 - Te1 'debe ser 0
#: **Con v = x²** (v′ = 2x):
Ti2 = Integral{(Ca - q*x)*2*x @ x = 0 : L}
Te2 = Integral{q*x^2 @ x = 0 : L} + P*L^2
dif_2 = Ti2 - Te2 'debe ser 0
#: Con la solución exacta la igualdad vale **para cualquier v**: la débil no es otra física. Ahora una aproximación **pobre**, la recta u = a·x, con la a que cumple la igualdad solo para v = x:
a_G = (q*L/2 + P)/EA 'a de Galerkin
#: Con v = x se cumple (EA·a·L = q·L²/2 + P·L):
d_G1 = Integral{EA*a_G*1 @ x = 0 : L} - (Integral{q*x @ x = 0 : L} + P*L)
#: Con v = x² ya **no** se cumple: la recta no es la solución, solo es la mejor de su familia.
d_G2 = Integral{EA*a_G*2*x @ x = 0 : L} - (Integral{q*x^2 @ x = 0 : L} + P*L^2)
#: Por eso Galerkin exige la igualdad solo para las v de la **misma familia** que la aproximación. Con más funciones (más elementos), la familia crece y la aproximación mejora.

## 5 · Elementos finitos: dos elementos
#: Se parte la barra en 2 tramos de largo h, con 3 nudos (0, 1, 2). En cada tramo la aproximación es una **recta** que une los valores de sus dos nudos, con las funciones de forma N₁ = 1 − x/h y N₂ = x/h.
n_e = 2 'número de elementos
h = L/n_e 'largo de cada elemento
#: **Matriz de rigidez del elemento.** La deformación es u′ = B·u_{e}, con B = [N₁′, N₂′] = [−1/h, 1/h]. Sustituida en la forma débil, la rigidez es **k_{e} = ∫EA·Bᵀ·B dx**:
B_e = [-1/h, 1/h]
k_e = Simplify{EA*Integral{transpose(B_e)*B_e @ x = 0 : h}}
#: Es la matriz del resorte, con k = EA/h. Las **cargas del elemento** salen de ∫q·N dx: la carga repartida se divide por mitad a los dos nudos.
f_e = Simplify{q*Integral{transpose([1 - x/h, x/h]) @ x = 0 : h}}
#: **Ensamblaje.** El nudo 1 pertenece a los dos elementos, así que en su casilla se suman las dos rigideces y las dos cargas. La fuerza P va al nudo 2.
K = [k_e(1, 1), k_e(1, 2), 0; k_e(2, 1), k_e(2, 2) + k_e(1, 1), k_e(1, 2); 0, k_e(2, 1), k_e(2, 2)]
F = [f_e(1); f_e(2) + f_e(1); f_e(2) + P]
#: **Apoyo (condición esencial).** u₀ = 0: se quita la fila y la columna 0.
K_r = [K(2, 2), K(2, 3); K(3, 2), K(3, 3)]
F_r = [F(2); F(3)]
#: **Resolver K·u = F:**
u_r = inv(K_r)*F_r
u_1 = u_r(1) 'desplazamiento del nudo 1
u_2 = u_r(2) 'desplazamiento del nudo 2 (la punta)

## 6 · Comparación
#: **En los nudos**, el elemento finito da exactamente la solución de la ecuación diferencial (propiedad de esta barra de rigidez constante):
e_n1 = u_1 - u(h)
e_n2 = u_2 - u(L)
#: **Dentro del elemento**, la aproximación es una recta, y la solución exacta es una parábola. A mitad del primer tramo:
u_fm = u_1/2 'la recta entre u₀ = 0 y u₁
u_em = u(h/2) 'la parábola exacta
e_m = u_fm - u_em
#: Con un solo elemento (n = 1) la recta une 0 con u(L), y a media barra el error es mayor. Se calcula para ver que refinar la malla ayuda:
e_m1 = u_L/2 - u_mid
#: **Comprobación de equilibrio:** la reacción del apoyo debe ser q·L + P, con signo contrario.
R_0 = K(1, 2)*u_1 - F(1) 'fila 0 de K·u = F, sin quitar el apoyo
R_esp = -(q*L + P) 'valor esperado

## 7 · Lectura
#: **Fuerte → débil → elemento.** La ecuación diferencial se resolvió con constantes ajustadas por las condiciones de borde. La forma débil dio la misma respuesta como igualdad de trabajos para cualquier v. El elemento finito la usa con v de la familia de las funciones de forma, y todo se reduce a **K·u = F**, con K armada sumando resortes.
#: **Para la membrana Q4** el esqueleto es idéntico: k_{e} = ∫EA·Bᵀ·B dx pasa a ser **K = ∫Bᵀ·D·B·t dA**, con Gauss y el Jacobiano. Lo demás (ensamblar, apoyar, resolver) es lo que hiciste aquí.
