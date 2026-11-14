# El elemento ITW 1990 de membrana con giro normal (drilling): del campo de desplazamientos a los mapas
#numerico
#: **Qué es.** El cuadrilátero de membrana de Ibrahimbegovic, Taylor y Wilson (1990), IJNME 30, 445-457. Tiene tres grados por nudo, **u, v y el giro ψ** dentro de su plano. Por eso un muro puede recibir el momento de una viga. Aquí se escribe **tal cual el paper**: el campo de desplazamientos, las funciones de forma y el patch test, y se ven los mapas de color. Pasa el cursor sobre un mapa: el globo da la posición y el valor.
#: **Quién es quién.** Nudos del 1 al 4 en las esquinas, del 5 al 8 en el centro de cada lado. ξ y η van de −1 a 1. ψ_{I} es el giro del nudo I. l_{JK} es la longitud del lado J→K y n_{JK} su normal exterior.

## 1 · Las funciones de forma de las esquinas (bilineales)
#: Cada una vale 1 en su nudo y 0 en los otros tres:
N_1 = Expand{(1-xi)*(1-eta)/4}
N_2 = Expand{(1+xi)*(1-eta)/4}
N_3 = Expand{(1+xi)*(1+eta)/4}
N_4 = Expand{(1-xi)*(1+eta)/4}
particion = Simplify{(1-xi)*(1-eta)/4 + (1+xi)*(1-eta)/4 + (1+xi)*(1+eta)/4 + (1-xi)*(1+eta)/4}
#: **Partición de la unidad:** suman 1 en todo el elemento. Sin eso no reproduce el movimiento de cuerpo rígido.

## 2 · Las funciones de los lados (serendipidad) y la burbuja
#: Los nudos 5 a 8 están en el centro de cada lado. Son **parabólicas a lo largo del lado**. Con ellas el giro de las esquinas curva los lados: así el giro entra en el campo de desplazamientos.
N_5 = Expand{(1-xi^2)*(1-eta)/2}
N_6 = Expand{(1+xi)*(1-eta^2)/2}
N_7 = Expand{(1-xi^2)*(1+eta)/2}
N_8 = Expand{(1-xi)*(1-eta^2)/2}
#: La **burbuja** vale cero en todo el borde y uno en el centro; sus grados se **condensan** (se eliminan) antes de ensamblar:
N_9 = Expand{(1-xi^2)*(1-eta^2)}

## 3 · El campo de desplazamientos del paper (ec. 19)
#: **u = Σ N_{I}·u_{I}  +  Σ_{I=5..8} (l_{JK}/8)·N_{I}·(ψ_{K} − ψ_{J})·n_{JK}  +  N_{9}·Δu_{9}.** La primera suma es el Q4 de siempre. La segunda es lo nuevo: **la diferencia de giros de los dos nudos de un lado empuja el punto medio del lado en la dirección de su normal**. La tercera es la burbuja.
#: Para ver el efecto, un lado de longitud 1 con giros 0.1 y −0.1 en sus extremos (un giro de signo contrario curva el lado). El empuje del punto medio vale l/8·(ψ_{K} − ψ_{J}):
l_JK = 1 'longitud del lado
psi_J = 0.1 'giro del nudo J (rad)
psi_K = -0.1 'giro del nudo K (rad)
empuje = l_JK/8*(psi_K - psi_J) 'desplazamiento del punto medio, normal al lado

## 4 · Mapas de las funciones de lado
#: **Cómo se leen los mapas.** El cuadrado natural, ξ a la derecha y η hacia arriba; escala de color a la derecha. Pasa el cursor: el globo da (ξ, η) y el valor. **N₅** vale 1 en el centro del lado de abajo y 0 en los otros tres lados:
Nq_5(x, y) = (1 - x^2)*(1 - y)/2
fmapa(Nq_5(x, y), [-1, 1], [-1, 1])
#: **N₆**, en el lado de la derecha:
Nq_6(x, y) = (1 + x)*(1 - y^2)/2
fmapa(Nq_6(x, y), [-1, 1], [-1, 1])
#: La **burbuja** N₉, máxima en el centro y cero en el borde:
Nq_9(x, y) = (1 - x^2)*(1 - y^2)
fmapa(Nq_9(x, y), [-1, 1], [-1, 1])

## 5 · El patch test: deformación constante
#: Si el elemento está bien, **una deformación constante** (ε_x = 0.01) se reproduce exacta con cualquier forma del elemento. El desplazamiento u = 0.01·x en los nudos tiene que dar ε_x = 0.01 en todos los puntos:
eps_x = 0.01 'deformación impuesta
u_n(x) = eps_x*x 'desplazamiento de los nudos
#: En un nudo a x = 4: u = 0.04. El resultado de **Hekatan Struct, ETABS 22 y SAP2000 24** con un solo elemento sesgado: 0.04 en los tres, error 8e-13 %.
u_4 = u_n(4)
#: **Conclusión.** El elemento pasa el patch test; el giro del nudo entra por el campo de desplazamientos y no como una penalización pegada encima.
