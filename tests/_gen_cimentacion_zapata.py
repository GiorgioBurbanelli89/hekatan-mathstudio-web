# Genera ejemplos/Cimentacion_zapata_Guerra.hmath (Math Studio web): lo que analiza Hekatan Geotechnic (hekatan-geotechnic/src/footing/zapata.ts)
# con tres tipos de contenido: SIMBOLICO (deducciones), NUMERICO (valores de GEO5/Geotechnic) y GRAFICO (mapa de presion y q_adm vs fi).
# python tests/_gen_cimentacion_zapata.py     Referencia numerica: tsx de zapata.ts (calcularZapata con ZAPATA_GUERRA), ver registros/2026-11-08_cimentacion_mathstudio_lisp.md
import json, os

AQUI = os.path.dirname(os.path.abspath(__file__))
items = []
T = lambda s, n=None: items.append({"t": "texto", "text": s, **({"titulo": True, "nivel": n} if n else {"titulo": False})})
Q = lambda c, **k: items.append({"t": "eq", "codigo": c.strip("\n"), "modo": 0, **k})

T("Cimentación: zapata aislada de Guerra (cap. 5, ej. 1), validación simbólica, numérica y gráfica", 1)
T("Es lo mismo que analiza Hekatan Geotechnic (módulo de cimentaciones, validado contra GEO5 2024 a 4 cifras): V en el fondo, excentricidad, área efectiva, presión, "
  "capacidad portante por Meyerhof, Estándar (Brinch-Hansen) y Vesic, factor de seguridad, deslizamiento y asiento edométrico. Aquí cada fórmula se escribe una vez y el motor la deduce (simbólico), la evalúa (numérico) y la dibuja (gráfico). Unidades: t y m.")
T("Dato importante: el libro NO da φ, c ni Df. El suelo es EQUIVALENTE (φ = 22.2°, c = 0, γ = 1.8 t/m³), elegido para que q_adm ≈ 14 t/m² con FS = 3. El libro solo da ks = 2920 t/m³ y q_adm = 14 t/m².")

T("1 · Simbólico: de dónde salen los factores de capacidad portante", 2)
T("Los factores de Prandtl-Reissner. Nq depende solo de φ: Nq = e^(π·tanφ)·tan²(45° + φ/2), y como tan²(45° + φ/2) = (1 + senφ)/(1 − senφ) se escribe con seno y coseno (el motor simbólico trabaja con sen, cos y exp). Nc sale de Nq. El motor simplifica la definición y la deriva.")
Q("NqF(f)=exp(pi*sin(f)/cos(f))*(1+sin(f))/(1-sin(f))")
Q("NqF(f)→")
Q("NcF(f)=(NqF(f)-1)*cos(f)/sin(f)")
Q("NcF(f)→")
T("Rapidez con que crece Nq con φ (derivada): explica por qué q_adm sube tan de prisa con φ en la gráfica de la sección 4.")
Q("dNq(f)=diff(NqF(f),f)")
Q("dNq(f)→")
T("Límite φ → 0 (suelo cohesivo, caso no drenado de GEO5). Es 0/0; por L'Hôpital Nc(0) = Nq'(0) (el motor no resuelve ese límite de forma directa, pero sí la derivada). Debe dar π + 2 = 5.1416:")
Q("dNq(0)")
Q("pi+2")
T("Nγ de cada método (las tres variantes de GEO5):", 3)
Q("NgM(f)=(NqF(f)-1)*sin(1.4*f)/cos(1.4*f)")
Q("NgM(f)→")
Q("NgE(f)=1.5*(NqF(f)-1)*sin(f)/cos(f)")
Q("NgE(f)→")
Q("NgV(f)=2*(NqF(f)+1)*sin(f)/cos(f)")
Q("NgV(f)→")
T("Presión de contacto de la zapata rígida (distribución lineal). Se parte de σ(x) = P/(B·L) + 12·M·x/(L·B³) y el motor comprueba el equilibrio integrando: la fuerza debe dar P y el momento M.", 3)
Q("pl(x)=Pz/(Bz*Lz)+12*Mz*x/(Lz*Bz^3)")
Q("Fz=Lz*integral(pl(x),x,-Bz/2,Bz/2)")
Q("Fz→")
Q("Mq=Lz*integral(pl(x)*x,x,-Bz/2,Bz/2)")
Q("Mq→")
T("Los extremos de ese plano son σ = P/(B·L) ± 6·M/(L·B²). La presión se anula en el borde cuando la excentricidad e = M/P llega al sexto del lado (núcleo central):")
Q("sx(Pz,Mz,Bz,Lz)=Pz/(Bz*Lz)+6*Mz/(Lz*Bz^2)")
Q("sx(Pz,Mz,Bz,Lz)→")
Q("solve(Pz/(Bz*Lz)-6*Pz*ez/(Lz*Bz^2)==0,ez)→")


T("2 · Numérico: los datos y las cargas en el fondo de la zapata", 2)
T("Datos de Guerra (cap. 5, ej. 1) y el suelo equivalente. Las fórmulas son las de zapata.ts de Geotechnic (GEO5 «Stress in the Footing Bottom» y «Effective Area»).")
for c, com in [("B=3.45", "lado en x [m]"), ("L=3.45", "lado en y [m]"), ("h=0.45", "canto de la zapata [m]"), ("Df=1.5", "profundidad del fondo desde la rasante [m]"),
               ("cx=0.45", "columna en x [m]"), ("cy=0.45", "columna en y [m]"), ("gc=2.4028", "peso específico del hormigón [t/m³]"), ("gr=1.8", "peso específico del relleno [t/m³]"),
               ("gs=1.8", "peso específico del suelo equivalente [t/m³]"), ("fi=22.2", "ángulo de fricción equivalente φ [°]"), ("N=121", "carga axial [t]"), ("My=17", "momento My [t·m]"),
               ("FSn=3", "factor de seguridad exigido"), ("ks=2920", "módulo de balasto [t/m³]")]:
    Q(f"{c} % {com}")
Q("G=B*L*h*gc % peso de la zapata [t]")
Q("G=")
Q("Z=gr*(Df-h)*(B*L-cx*cy) % relleno sobre la zapata [t]")
Q("Z=")
Q("V=N+G+Z % vertical en el fondo [t] (Geotechnic: 155.983)")
Q("V=")
Q("ex=(-My)/V % excentricidad [m]")
Q("ex=")
Q("bx=B-2*abs(ex) % ancho efectivo en x [m]")
Q("bef=min(bx,L) % lado menor del área efectiva [m]")
Q("lef=max(bx,L)")
Q("Aef=bx*L % área efectiva [m²]")
Q("sig=V/Aef % presión sobre el área efectiva [t/m²] (13.99)")
Q("sig=")
Q("q0=gs*Df % sobrecarga a la cota del fondo [t/m²]")
Q("fr=fi*pi/180 % φ en radianes")

T("3 · Capacidad portante por los tres métodos de GEO5", 2)
T("Rd = q₀·Nq·sq·dq + (b_ef/2)·γ·Nγ·sγ·dγ  (c = 0 y sin carga horizontal: los factores de inclinación valen 1). Los factores de forma s y profundidad d son los de zapata.ts.")
Q("Nq=exp(pi*tan(fr))*tan(pi/4+fr/2)^2")
Q("Nq=")
Q("Nc=(Nq-1)/tan(fr)")
Q("Nc=")
Q("bl=bef/lef % b_ef / l_ef")
Q("db=Df/bef % Df / b_ef")
Q("Kp=tan(pi/4+fr/2)^2")
T("Meyerhof:", 3)
Q("NgMy=(Nq-1)*tan(1.4*fr)")
Q("NgMy=")
Q("sqM=1+0.1*Kp*bl % s_q = s_γ (φ > 10°)")
Q("dqM=1+0.1*db*sqrt(Kp) % d_q = d_γ")
Q("RdM=q0*Nq*sqM*dqM+bef/2*gs*NgMy*sqM*dqM")
Q("RdM=")
T("Estándar (Brinch-Hansen):", 3)
Q("NgBH=1.5*(Nq-1)*tan(fr)")
Q("NgBH=")
Q("sqB=1+bl*sin(fr)")
Q("sgB=1-0.3*bl")
Q("dqB=1+0.1*sqrt(db*sin(2*fr))")
Q("RdB=q0*Nq*sqB*dqB+bef/2*gs*NgBH*sgB")
Q("RdB=")
T("Vesic (db ≤ 1, por eso t = Df/b_ef):", 3)
Q("NgVs=2*(Nq+1)*tan(fr)")
Q("NgVs=")
Q("sqV=1+bl*tan(fr)")
Q("sgV=1-0.4*bl")
Q("dqV=1+2*tan(fr)*(1-sin(fr))^2*db")
Q("RdV=q0*Nq*sqV*dqV+bef/2*gs*NgVs*sgV")
Q("RdV=")
T("Tabla de resultados por método (orden de las filas: Meyerhof, Estándar, Vesic). FS = Rd/σ; q_adm = Rd/FS exigido.", 3)
Q("Rdv=[RdM;RdB;RdV]")
Q("qadmv=Rdv/FSn")
Q("FSv=Rdv/sig")
Q("tabla(Rdv,qadmv,FSv)=")
T("Contra GEO5 2024 corrido sobre este mismo modelo: FS = 3.12 (Meyerhof), 2.84 (Estándar), 3.39 (Vesic).")
Q("FSv=")

T("Validación contra Geotechnic (zapata.ts ejecutado con tsx, mismos datos). Cada diferencia debe ser 0:", 3)
nom = ["V", "sig", "Nq", "Nc", "NgMy", "NgBH", "NgVs", "RdM", "RdB", "RdV"]
ref = ["155.98269715", "13.988860399559158", "7.981585611024295", "17.107853302469824", "4.208238535641821", "4.273698468967871", "7.330634388483725", "43.619992723241744", "39.77873960376557", "47.48998812862784"]
T("Orden de las filas: V [t], σ [t/m²], Nq, Nc, Nγ Meyerhof, Nγ Estándar, Nγ Vesic, Rd Meyerhof, Rd Estándar, Rd Vesic [t/m²].")
Q("dVal=[" + ";".join(nom) + "]-[" + ";".join(ref) + "]")
Q("dVal=")
Q("dFS=FSv-[3.118194869155773;2.8436011560326353;3.394843237560969]")
Q("dFS=")

T("Deslizamiento (GEO5 «Horizontal Bearing Capacity»): R_dh = V·tanφ + c·A_ef + empuje pasivo en reposo K0 = 1 − senφ sobre el canto h.", 3)
Q("K0=1-sin(fr)")
Q("Spd=K0*gs*(Df^2-(Df-h)^2)/2*L")
Q("Rdh=V*tan(fr)+Spd % [t] (Geotechnic: 65.872)")
Q("Rdh=")

T("Asiento por el módulo edométrico (GEO5): s = Σ (Δσz − m·σor)·dz / Eoed, con Δσz de Steinbrenner (suma de las cuatro esquinas) y la profundidad ficticia z_r = κ1·z, κ1 = 1 + 0.35·atan(1.55·Df/z).", 3)
Q("nuP=0.3 % Poisson del suelo")
Q("Edef=89.9 % módulo de deformación [MPa]")
Q("mP=0.3 % coeficiente de resistencia estructural")
Q("Eoed=Edef/(1-2*nuP^2/(1-nuP))*1000/9.80665 % módulo edométrico [t/m²]")
Q("Ec=23138 % módulo del hormigón [MPa]")
Q("kr=Ec*h^3/(Edef*B^3) % rigidez relativa zapata/suelo")
Q("kr=")
T("kr < 1: la zapata es FLEXIBLE para GEO5 (rígida si kr > 1), así que el asiento se evalúa en el CENTRO, donde las cuatro esquinas de Steinbrenner miden B/2 y L/2.")
Q("qn=V/(B*L)-gs*Df % presión neta media [t/m²]")
Q("Ics(a,b,z)=(atan(a*b/(z*sqrt(a^2+b^2+z^2)))+a*b*z/sqrt(a^2+b^2+z^2)*(1/(a^2+z^2)+1/(b^2+z^2)))/(2*pi)")
Q("k1(z)=1+0.35*atan(1.55*Df/z)")
Q("dsz(z)=4*qn*Ics(B/2,L/2,k1(z)*z)")
Q("msor(z)=mP*gs*(z+Df)")
Q("""
zinf = prog
  a=0.01
  b=30
  for k = 1:60
    c=(a+b)/2
    if dsz(c)-msor(c)>0
      a=c
    else
      b=c
    end
  end
  return (a+b)/2
end
""")
T("Fin de la zona de influencia: donde Δσz = m·σor (bisección, como GEO5).")
Q("zi=zinf % [m] (Geotechnic: se compara abajo)")
Q("zi=")
Q("s=integral(dsz(z)-msor(z),z,0.0000001,zi)/Eoed*1000 % asiento [mm]")
Q("s=")
Q("d_s=s-1.2555695554582322 % contra Geotechnic: ~0 (Geotechnic suma por punto medio con dz = 5 mm)")
Q("d_s=")
T("Presión de contacto de la zapata rígida (literatura: Navier/núcleo central; GEO5 usa el área efectiva). El plano es p = a + b·x con a = V/(B·L) y b = V·ex/(L·B³/12).")
Q("aP=V/(B*L)")
Q("bP=V*ex/(L*B^3/12)")
Q("smaxC=aP+abs(bP)*B/2 % Navier exacto [t/m²]")
Q("smaxC=")
Q("sminC=aP-abs(bP)*B/2")
Q("sminC=")
T("Geotechnic reparte la zapata en una malla de 80 × 80 celdas y calcula los momentos de área por suma de puntos medios (Σx²·dA = (B³ − B·dx²)·L/12, dx = B/80). Con esa misma suma se reproducen sus números; frente a Navier exacto la diferencia es 0.0004 t/m² (1.5·10⁻⁵ relativo).")
Q("dxm=B/80")
Q("bG=V*ex/(L*(B^3-B*dxm^2)/12)")
Q("smaxG=aP+abs(bG)*B/2")
Q("smaxG=")
Q("sminG=aP-abs(bG)*B/2")
Q("sminG=")
Q("d_smax=smaxG-15.589374906821973 % contra Geotechnic: ~0")
Q("d_smax=")
Q("d_smin=sminG-10.620698128255945")
Q("d_smin=")
Q("d_nav=smaxC-smaxG % Navier exacto menos la malla 80")
Q("d_nav=")
Q("sWmax=smaxC/ks*1000 % asiento Winkler σ/ks, máximo [mm]")
Q("sWmax=")
Q("giro=abs(bG)/ks*1000 % giro de la zapata rígida [‰] (Geotechnic: 0.49322)")
Q("giro=")

T("4 · Gráfico", 2)
T("Mapa de la presión de contacto en planta [t/m²]. Eje horizontal x [m] de 0 a B, eje vertical y [m] de 0 a L; la barra de la derecha es la escala. En la escala de color el azul es la presión máxima (15.59 t/m², lado x = 0, hacia donde cae la resultante, ex = −0.109 m) y el rojo la mínima (10.62 t/m², lado x = B). Pase el ratón: cruz y globo con el valor.")
Q("nm=24 % divisiones por lado")
Q("""
Pc = prog
  M=zeros(nm+1,nm+1)
  for i = 1:nm+1
    x=-B/2+(i-1)*B/nm
    for j = 1:nm+1
      M_{i,j}=max(0,aP+bP*x)
    end
  end
  return M
end
""")
Q("Pmap=Pc")
Q("mapa(Pmap,B,L)=")
T("Curva de q_adm = R_d/FS contra φ para los tres métodos (azul Meyerhof, naranja Estándar, verde Vesic; la línea roja vertical, de altura 65, marca el φ equivalente 22.2° (su base en 0 es solo el truco para dibujarla)). Son las mismas fórmulas de la sección 3 puestas como funciones de φ en grados, con la misma zapata, carga y excentricidad.")
Q("NqD(p)=exp(pi*tan(p*pi/180))*tan(pi/4+p*pi/360)^2")
Q("KpD(p)=tan(pi/4+p*pi/360)^2")
Q("qM(p)=(q0*NqD(p)*(1+0.1*KpD(p)*bl)*(1+0.1*db*sqrt(KpD(p)))+bef/2*gs*(NqD(p)-1)*tan(1.4*p*pi/180)*(1+0.1*KpD(p)*bl)*(1+0.1*db*sqrt(KpD(p))))/FSn")
Q("qB(p)=(q0*NqD(p)*(1+bl*sin(p*pi/180))*(1+0.1*sqrt(db*sin(2*p*pi/180)))+bef/2*gs*1.5*(NqD(p)-1)*tan(p*pi/180)*(1-0.3*bl))/FSn")
Q("qV(p)=(q0*NqD(p)*(1+bl*tan(p*pi/180))*(1+2*tan(p*pi/180)*(1-sin(p*pi/180))^2*db)+bef/2*gs*2*(NqD(p)+1)*tan(p*pi/180)*(1-0.4*bl))/FSn")
Q("fplot(qM(x),qB(x),qV(x),65*(x>22.19)*(x<22.21),[12.2,32.2])")
T("Control en el φ equivalente (deben ser q_adm = 14.54, 13.26 y 15.83 t/m² de Geotechnic):")
Q("qchk=[qM(fi);qB(fi);qV(fi)]")
Q("qchk=")
Q("d_q=qchk-[14.539997574413915;13.259579867921857;15.829996042875948]")
Q("d_q=")
T("Lectura. Con la excentricidad ex = −0.109 m (dentro del núcleo B/6 = 0.575 m) toda la base trabaja a compresión: σ_max/σ_min = 15.59/10.62 t/m². GEO5 verifica con la presión media sobre el área efectiva σ = 13.99 t/m². "
  "Con el suelo equivalente el factor de seguridad sale 3.12 (Meyerhof), 2.84 (Estándar) y 3.39 (Vesic): Meyerhof y Vesic cumplen FS ≥ 3; el Estándar queda en 2.84 (< 3). El asiento (1.26 mm) y el giro son pequeños: manda la capacidad portante. "
  "Lo que NO reproduce esta hoja: la distorsión angular de GEO5 (necesita el asiento en los cuatro bordes) y la homogeneización de Prandtl para suelo estratificado o con agua (no extraída).")

d = {"formato": "hmath 1", "eq": 15.5, "txt": 11, "gap": -4, "items": items}
ruta = os.path.join(AQUI, "..", "ejemplos", "Cimentacion_zapata_Guerra.hmath")
json.dump(d, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("escrito", os.path.abspath(ruta), len(items), "items")
