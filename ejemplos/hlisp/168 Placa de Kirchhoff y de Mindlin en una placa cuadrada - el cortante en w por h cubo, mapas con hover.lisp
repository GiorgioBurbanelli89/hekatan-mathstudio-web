# Placa cuadrada simplemente apoyada: Kirchhoff contra Mindlin, el cortante en w por h cubo
#numerico
#: **Qué es.** Una placa cuadrada de lado a, espesor h, apoyada en sus cuatro lados con carga uniforme q. La placa delgada (**Kirchhoff**: DKE, Shell-Thin) no tiene cortante. La gruesa (**Mindlin**: DSE, MITC4, Shell-Thick) sí, y el cortante **suma flecha**. Se ve con la serie de Navier, basta el primer término: w(x, y) = W·sin(πx/a)·sin(πy/a). Pasa el cursor sobre un mapa: el globo da x, y y el valor.
#: **Unidades coherentes:** kN y m. a en m, q en kN/m², E en kPa, w en m.

## 1 · Datos
a = 1 'lado de la placa (m)
q = 1 'carga uniforme (kN/m2)
E = 30000000 'módulo de elasticidad (kPa)
nu = 0.3 'Poisson
kap = 5/6 'factor de corrección de cortante

## 2 · La rigidez a flexión D crece con h cubo
#: **D = E·h³ / (12·(1 − ν²)).** Por eso la flecha de Kirchhoff cae con **1/h³**: al doble de espesor, ocho veces menos flecha.
D(h) = E*h^3/(12*(1 - nu^2))
D_fino = D(0.01*a) 'h/a = 0.01
D_grueso = D(0.2*a) 'h/a = 0.2

## 3 · Flecha de Kirchhoff (Navier, primer término)
#: **W_K = 16·q·a⁴ / (π⁶·D).** Es el centro de la placa.
WK(h) = 16*q*a^4/(pi^6*D(h))
WK_fino = WK(0.01*a)
WK_grueso = WK(0.2*a)
#: Multiplicada por h³ la flecha de Kirchhoff **no depende del espesor**: ese es el sentido de «w por h cubo».
WK_h3 = WK(0.2*a)*(0.2*a)^3

## 4 · El cortante de Mindlin suma flecha
#: Para el modo seno por seno, el cortante añade **W_M = W_K·(1 + π²/(3·κ·(1 − ν))·(h/a)²)**. El segundo término crece con el **cuadrado** de h/a: en una placa delgada desaparece, en una gruesa pesa:
cociente(r) = 1 + pi^2/(3*kap*(1 - nu))*r^2
c_fino = cociente(0.01) 'h/a = 0.01
c_grueso = cociente(0.2) 'h/a = 0.2
WM_grueso = WK_grueso*c_grueso
extra_porc = (c_grueso - 1)*100 'cortante, en % de la flecha de Kirchhoff

## 5 · Mapas de la flecha por h cubo
#: **Kirchhoff, w·h³** (h/a = 0.2). Una campana seno por seno, máxima en el centro y cero en los cuatro apoyos:
wK3(x, y) = WK_h3*sin(pi*x/a)*sin(pi*y/a)
fmapa(wK3(x, y), [0, 1], [0, 1])
#: **Mindlin, w·h³** (h/a = 0.2). La misma campana, más alta en el factor del cociente:
wM3(x, y) = WK_h3*c_grueso*sin(pi*x/a)*sin(pi*y/a)
fmapa(wM3(x, y), [0, 1], [0, 1])
#: **El cociente Mindlin / Kirchhoff** según h/a (a la derecha) y el Poisson (arriba). Vale 1 en la placa delgada y sube con (h/a)²:
cq(x, y) = 1 + pi^2/(3*kap*(1 - y))*x^2
fmapa(cq(x, y), [0.01, 0.3], [0, 0.45])
#: **Conclusión.** Con h/a = 0.01 el cortante suma 0.06 %: DKE y Shell-Thin bastan. Con h/a = 0.2 suma más de 20 %: ahí hacen falta DSE, MITC4 o Shell-Thick.
