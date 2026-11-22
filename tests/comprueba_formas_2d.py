# -*- coding: utf-8 -*-
"""Comprobación independiente (sympy) de la hoja ejemplos/Funciones_de_forma_2D_deduccion.hmath.
Cada número que la hoja cita sale de aquí. Si algo falla, assert."""
import sympy as sp
xi, eta = sp.symbols('xi eta')
u1, u2, u3, u4 = U = sp.symbols('u1:5')
a0, a1, a2, a3 = A = sp.symbols('a0:4')
nodos = [(-1, -1), (1, -1), (1, 1), (-1, 1)]

# 1D (lo aprendido)
n1d = [(1 - xi) / 2, (1 + xi) / 2]
assert sp.simplify(sum(n1d) - 1) == 0

# hipótesis bilineal y condiciones
p = a0 + a1 * xi + a2 * eta + a3 * xi * eta
conds = [p.subs({xi: x, eta: y}) for x, y in nodos]
C = sp.Matrix([[1, x, y, x * y] for x, y in nodos])
assert C == sp.Matrix([[1, -1, -1, 1], [1, 1, -1, -1], [1, 1, 1, 1], [1, -1, 1, -1]])
assert C.det() == -16
assert C.T * C == 4 * sp.eye(4)               # columnas ortogonales -> inversa = C^T/4
Ci = C.inv()
assert Ci == sp.Rational(1, 4) * sp.Matrix([[1, 1, 1, 1], [-1, 1, 1, -1], [-1, -1, 1, 1], [1, -1, 1, -1]])
# combinaciones con signo de la hoja
assert sp.expand(sum(conds)) == 4 * a0
assert sp.expand(-conds[0] + conds[1] + conds[2] - conds[3]) == 4 * a1
assert sp.expand(-conds[0] - conds[1] + conds[2] + conds[3]) == 4 * a2
assert sp.expand(conds[0] - conds[1] + conds[2] - conds[3]) == 4 * a3
sol = sp.solve([c - u for c, u in zip(conds, U)], A, dict=True)[0]
assert sol[a0] == (u1 + u2 + u3 + u4) / 4
assert sol[a1] == (-u1 + u2 + u3 - u4) / 4
assert sol[a2] == (-u1 - u2 + u3 + u4) / 4
assert sol[a3] == (u1 - u2 + u3 - u4) / 4

q = sp.expand(p.subs(sol))
N = [sp.diff(q, u) for u in U]
cerr = [(1 - xi) * (1 - eta) / 4, (1 + xi) * (1 - eta) / 4, (1 + xi) * (1 + eta) / 4, (1 - xi) * (1 + eta) / 4]
for n, c in zip(N, cerr):
    assert sp.expand(n - c) == 0
# producto de rectas 1D
assert sp.expand(N[0] - n1d[0].subs(xi, xi) * n1d[0].subs(xi, eta)) == 0
assert sp.expand(N[1] - n1d[1] * n1d[0].subs(xi, eta)) == 0
assert sp.expand(N[2] - n1d[1] * n1d[1].subs(xi, eta)) == 0
assert sp.expand(N[3] - n1d[0] * n1d[1].subs(xi, eta)) == 0
# Ni(nudo j) = delta_ij
for i in range(4):
    for j, (x, y) in enumerate(nodos):
        assert N[i].subs({xi: x, eta: y}) == (1 if i == j else 0)
# partición de la unidad y campos exactos
assert sp.simplify(sum(N) - 1) == 0
assert sp.expand(sum(n * x for n, (x, y) in zip(N, nodos)) - xi) == 0
assert sp.expand(sum(n * y for n, (x, y) in zip(N, nodos)) - eta) == 0
assert sp.expand(sum(n * x * y for n, (x, y) in zip(N, nodos)) - xi * eta) == 0
# campo de prueba u = [0,1,3,1]
uv = {u1: 0, u2: 1, u3: 3, u4: 1}
u = sp.expand(sum(n * v for n, v in zip(N, uv.values())))
assert u == sp.Rational(5, 4) + sp.Rational(3, 4) * xi + sp.Rational(3, 4) * eta + sp.Rational(1, 4) * xi * eta
assert u.subs({xi: 0, eta: 0}) == sp.Rational(5, 4)                       # 1.25 = promedio
assert u.subs({xi: sp.Rational(1, 2), eta: -sp.Rational(1, 2)}) == sp.Rational(19, 16)  # 1.1875
for (x, y), v in zip(nodos, uv.values()):
    assert u.subs({xi: x, eta: y}) == v
assert {k: sol[k].subs(uv) for k in A} == {a0: sp.Rational(5, 4), a1: sp.Rational(3, 4), a2: sp.Rational(3, 4), a3: sp.Rational(1, 4)}
# derivadas
dxi = [sp.diff(n, xi) for n in N]
det = [sp.diff(n, eta) for n in N]
assert dxi == [(eta - 1) / 4, (1 - eta) / 4, (1 + eta) / 4, -(1 + eta) / 4]
assert det == [(xi - 1) / 4, -(1 + xi) / 4, (1 + xi) / 4, (1 - xi) / 4]
assert sp.simplify(sum(dxi)) == 0 and sp.simplify(sum(det)) == 0
assert sp.expand(sp.diff(u, xi) - (eta + 3) / 4) == 0
assert sp.expand(sp.diff(u, eta) - (xi + 3) / 4) == 0
# cuadrilátero real (0,0)-(2,0)-(1.5,1)-(0.5,1)
xs = [0, 2, sp.Rational(3, 2), sp.Rational(1, 2)]
ys = [0, 0, 1, 1]
X = sp.expand(sum(n * v for n, v in zip(N, xs)))
Y = sp.expand(sum(n * v for n, v in zip(N, ys)))
assert X == 1 + sp.Rational(3, 4) * xi - xi * eta / 4
assert Y == (eta + 1) / 2
J = sp.Matrix([[sp.diff(X, xi), sp.diff(Y, xi)], [sp.diff(X, eta), sp.diff(Y, eta)]])
detJ = sp.expand(J.det())
assert detJ == (3 - eta) / 8
print('detJ =', detJ)
area = sp.integrate(sp.integrate(detJ, (xi, -1, 1)), (eta, -1, 1))
assert area == sp.Rational(3, 2)               # trapecio de bases 2 y 1, altura 1
assert (X.subs({xi: 0, eta: 0}), Y.subs({xi: 0, eta: 0})) == (1, sp.Rational(1, 2))
assert (X.subs({xi: 1, eta: 0}), Y.subs({xi: 1, eta: 0})) == (sp.Rational(7, 4), sp.Rational(1, 2))
print('OK: todos los asserts. detJ =', detJ, ' area =', area)
