# Fuentes y reglas de cálculo

Este documento es la referencia de `src/lib/calculo.ts`. Cada número del
código sale de aquí, y aquí se dice de dónde sale. Donde no hay fuente y el
valor es una decisión nuestra, se marca como **[propio]**.

Consultado el 11 de noviembre de 2026 (agua y actividad, el 18).

## Principios que fijan las fuentes

1. **El agua para beber no se raciona.** El folleto de FEMA, Cruz Roja y USDA
   *Food and Water in an Emergency* dice: «If supplies run low, never ration
   water». Recomienda beber lo que haga falta hoy y buscar más para mañana. Es
   una edición archivada, no la web actual de Ready.gov.
   Fuente: <https://webharvest.gov/peth04/20041015031112/http://www.fema.gov/rrr/foodwtr.shtm>
   → Ningún modo baja el agua por debajo de la cantidad para beber. Lo único
   que se recorta es el agua de higiene y cocina.

2. **La comida sí se puede racionar, salvo a niños y embarazadas.** El mismo
   folleto, repetido por los CDC en 2009, dice: «Food, unlike water, may be
   rationed safely, except for children and pregnant women». Añade que, con
   menos actividad, una persona sana puede pasar con la mitad de su comida
   habitual durante bastante tiempo.
   Fuentes: el enlace anterior y
   <https://webarchive.library.unt.edu/web/20090116155203/http://emergency.cdc.gov/preparedness/kit/food>
   → Los menores de 18 años, las embarazadas y las mujeres en lactancia no se
   racionan nunca. También se puede marcar a mano «no racionar» a una persona
   (mayores, enfermos): **[propio]**, por prudencia.

3. **Objetivo mínimo de 72 horas.** La Estrategia de la Unión de Preparación de
   la UE (marzo de 2025) recomienda que los hogares aguanten al menos 72 horas
   por su cuenta.
   Fuente: <https://commission.europa.eu/topics/preparedness_uk>

## Energía: calorías por persona y día

### Adultos (18 años o más)

Gasto basal (BMR) con las ecuaciones de Schofield, que FAO/OMS/UNU (2004)
mantiene en su tabla 5.2. El peso va en kg y el resultado en kcal/día:

| Edad    | Hombres              | Mujeres              |
|---------|----------------------|----------------------|
| 18–30   | 15,057·kg + 692,2    | 14,818·kg + 486,6    |
| 30–60   | 11,472·kg + 873,1    | 8,126·kg + 845,6     |
| ≥ 60    | 11,711·kg + 587,7    | 9,082·kg + 658,5     |

Fuente: <https://www.fao.org/4/y5686e/y5686e07.htm> (sección 5.2)

Gasto total = BMR × **PAL**, según la actividad elegida:

| Actividad  | PAL  | De dónde sale |
|------------|------|---------------|
| Sedentaria | 1,40 | FAO, tabla 5.3: límite inferior del estilo de vida sedentario (1,40–1,69) y el PAL más bajo que una población puede mantener mucho tiempo |
| Normal     | 1,60 | Nivel «moderado» con el que la EFSA fija sus ingestas de agua (PAL 1,6); cae dentro del rango sedentario/ligero de la FAO |

**Por defecto, sedentaria** (decisión de Eric, 18/11/2026: en una emergencia uno
se mueve poco). Hay dos actividades distintas **[propio]**:

- La del día a día, en Ajustes. Se comparte con la casa (ajuste `actividad`).
- La de la emergencia, que se elige al empezarla (por defecto, sedentaria) y va
  dentro de la emergencia compartida.

### Niños y adolescentes (de 1 a 17 años)

FAO no usa aquí BMR × PAL, sino una regresión del gasto total según el peso,
más la energía del crecimiento (que suma ≈ 1 %):

- Niños: `TEE = 310,2 + 63,3·kg − 0,263·kg²`
- Niñas: `TEE = 263,4 + 65,3·kg − 0,454·kg²`
- Necesidad diaria = TEE × 1,01

Con actividad **sedentaria** se aplica la variante de **actividad ligera**: un
15 % menos que la moderada; con actividad **normal**, la moderada tal cual
(tablas 4.5 y 4.6). Comprobación: una niña de 20,6 kg sale a
1.430 × 0,85 ≈ 1.215 kcal, y la tabla de FAO dice 1.225.
Fuente: <https://www.fao.org/4/y5686e/y5686e06.htm>

### Bebés (menos de 1 año)

No se calculan con la comida general: necesitan leche materna o de fórmula.
La app avisa y no cuenta su comida. Sí cuenta su agua, porque la fórmula se
prepara con agua.

### Embarazo y lactancia (se suma al cálculo de la persona)

| Situación            | kcal/día extra |
|----------------------|----------------|
| Embarazo, 1.er trim. | +85            |
| Embarazo, 2.º trim.  | +285           |
| Embarazo, 3.er trim. | +475           |
| Lactancia            | +505           |

Fuentes: <https://www.fao.org/4/y5686e/y5686e0a.htm> (embarazo) y
<https://www.fao.org/4/y5686e/y5686e0b.htm> (lactancia, primeros 6 meses en
mujeres bien nutridas).

## Modos de aguante: comida

El factor se aplica solo a adultos que se pueden racionar (ver principio 2).

| Modo    | Factor | De dónde sale |
|---------|--------|---------------|
| Normal  | 100 %  | Necesidad calculada |
| Ligero  | 85 %   | **[propio]** Punto intermedio, sin fuente propia |
| Severo  | 70 %   | Mínimo de asistencia alimentaria del Food Security Cluster (≈ 70 % de 2.100 kcal ≈ 1.550 kcal) |
| Extremo | 50 %   | FEMA: un adulto sano y con poca actividad puede pasar con la mitad de su comida habitual |

Fuentes:
- Food Security Cluster, directrices de emergencia (enero de 2025):
  <https://fscluster.org/sites/default/files/2025-01/WoS%20Food%20Security%20Sector%20Emergency%20Guidelines%20-%20January%202025-%20Final.pdf>
- PMA y ACNUR, cifra de planificación de 2.100 kcal:
  <https://ennonline.net/fex/3/summary>

## Modos de aguante: agua

Revisado el 18/11/2026. El agua de cada persona y día es **la de beber más la
de higiene**. Lo de beber depende de la persona y no se recorta nunca; la
higiene depende del modo y es lo único que se recorta. Antes, el modo normal
daba 3,8 L fijos a todo el mundo (máx(3,8 L, beber)): lo mismo a un bebé que a
un hombre de 115 kg, y con calor la higiene desaparecía.

### Agua para beber (nunca se recorta)

Lo mayor de dos cifras, y con calor el doble:

1. **Ingesta adecuada de agua total de la EFSA (2010)**, en L/día:

   | Grupo            | L/día |
   |------------------|-------|
   | 6–12 meses       | 1,0 (rango 0,8–1,0; se toma el alto) |
   | 1–2 años         | 1,2 (rango 1,1–1,2; se toma el alto) |
   | 2–3 años         | 1,3   |
   | 4–8 años         | 1,6   |
   | 9–13, niños      | 2,1   |
   | 9–13, niñas      | 1,9   |
   | 14+, hombres     | 2,5   |
   | 14+, mujeres     | 2,0   |
   | Embarazo         | +0,3  |
   | Lactancia        | +0,7 (rango 0,6–0,7; se toma el alto) |

   Leído en el resumen del dictamen original el 18/11/2026 (antes venía de
   fuentes secundarias). Incluye el agua de la comida y **solo vale con
   temperatura y actividad moderadas (PAL 1,6)**. A los mayores les da lo mismo
   que a los adultos. Fuente:
   <https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1459>

2. **1 mL por kcal gastada** (NRC, *Recommended Dietary Allowances*, 10.ª ed.,
   1989, capítulo «Water and Electrolytes»): es la necesidad de agua de un
   adulto en condiciones medias. A menudo se sube a 1,5 mL/kcal para cubrir
   actividad, sudor y carga de solutos; en bebés recomienda 1,5 mL/kcal. Las
   kcal son las de `kcalBase` (con la actividad elegida), así que esta cifra
   sube con el peso y la actividad. En bebés vale 0 (su comida no se calcula) y
   manda la EFSA. Fuente: <https://www.ncbi.nlm.nih.gov/books/NBK234935/>
   El mismo capítulo avisa de que los mayores tienen menos sed y pueden
   necesitar mucha agua en verano.

Usar agua total como agua para beber es conservador: en la práctica, un 20 %
llega con la comida.

**Calor:** con la opción «hace mucho calor», lo de beber se multiplica ×2.
Ready.gov: «In very hot temperatures, water needs can double».

Ejemplos (sedentaria, sin calor, calculados con el código):

| Persona                 | Beber | + higiene normal | Antes (normal) |
|-------------------------|-------|------------------|----------------|
| Bebé de 8 meses         | 1,0   | 2,5              | 3,8            |
| Niña de 3 años, 14 kg   | 1,3   | 2,8              | 3,8            |
| Mujer de 35, 55 kg      | 2,0   | 3,5              | 3,8            |
| Hombre de 40, 80 kg     | 2,5   | 4,0              | 3,8            |
| Hombre de 40, 115 kg    | 3,1   | 4,6              | 3,8            |

### Higiene por modo

| Modo    | Higiene por persona y día | De dónde sale |
|---------|---------------------------|---------------|
| Normal  | 1,5 L | **[propio]** Ready.gov pide 1 galón (≈ 3,8 L) para beber y saneamiento y dice que una persona normalmente activa bebe unos ¾ de galón (≈ 2,8 L): deja ≈ 1 L. Sphere da 2–6 L de higiene. 1,5 L queda entre los dos |
| Ligero  | 0,5 L | **[propio]** Higiene mínima |
| Severo  | 0     | FEMA: no racionar el agua para beber; se recorta lo demás |
| Extremo | 0     | Igual |

Fuentes: <https://www.ready.gov/water> (actualizada el 22/02/2021) y Sphere
<https://sphereprototype.conted.ox.ac.uk/standards/watersupply/accessAndWaterQuantity.html>
(supervivencia 2,5–3 L «según el clima y la fisiología de cada uno»; higiene
2–6 L «según las normas sociales y culturales»; total 7,5–15 L).

En pantalla se ve partido: «X L al día (Y para beber, Z de higiene)».

### Guías europeas, para comparar (leídas el 18/11/2026)

Ninguna distingue por edad, sexo ni peso:

- Protecció Civil de Catalunya: 1,5 L por persona y día como mínimo
  (<https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/consells_autoproteccio_emergencia/preparat_per_les_emergencies/equip_emergencies/>).
- Alemania (BBK): 2 L por persona y día, 0,5 de ellos para cocinar (leído en
  resúmenes del buscador de documentos de bbk.bund.de, no abierto).
- Países Bajos (Denk vooruit): 3 L por persona y día.
- Finlandia (72 tuntia): unos 2 L para beber, más cocina e higiene.
- Suecia (MCF): 3–5 L por adulto y día para beber, cocinar e higiene básica.

Los valores de Aguante quedan por encima de todas para beber e higiene.

### Agua para cocinar

Cada producto que hay que cocinar (arroz, pasta, legumbre seca) guarda los
litros que necesita. Ese agua se descuenta de la reserva. Con el escenario
«sin cocina» esos productos no cuentan como comida y su agua no se descuenta.

## Reparto manual

Además de los cuatro modos, el usuario puede fijar a mano las kcal y los
litros diarios de cada persona y de cada mascota. **[propio]**: no sale de
ninguna fuente, es una función de la app.

- Los días se calculan con esas raciones. A quien no tenga ración fijada se le
  aplica la del modo normal.
- La app no corrige nada, pero avisa en tres casos, que salen de los
  principios 1 y 2:
  - alguien bebe menos de su agua para beber (`aguaBeber`: EFSA o 1 mL/kcal, ×2 con calor);
  - se recorta la comida a un menor, una embarazada, una mujer en lactancia o
    alguien marcado como «no racionar»;
  - un adulto baja del 50 % de lo que necesita, que es el límite del que habla
    FEMA.
- «Una comida» equivale a un tercio de la necesidad diaria de esa persona.
  **[propio]**: es solo una forma cómoda de fijar la ración.
- Un bebé sigue sin contar comida, también en manual.

## Mascotas

No se racionan.

- **Energía, perro:** RER = 70 × kg^0,75 (fórmula de la AAHA), y mantenimiento
  = 1,6 × RER. **Gato:** 1,2 × RER.
  El factor 1,6 se cita mucho, pero no encontré una norma veterinaria primaria
  que lo fije. Hay que tomarlo como una estimación.
- **Agua:** mL/día ≈ kcal/día de mantenimiento. Para un perro de 18 kg sale
  ≈ 0,98 L, dentro de la regla de 50–60 mL/kg.

Fuentes: <https://www.dogster.com/dog-calorie-calculator/>,
<https://mycockerspaniel.com/h2o.htm> y
<https://simpledecisionmaker.onrender.com/tools/dog-water-intake-calculator/>.
Son fuentes secundarias: falta contrastarlas con un veterinario.

La comida de mascota solo cuenta para las mascotas, y la de personas solo para
las personas. El agua es común.

## Calorías de los productos

- **Con código de barras o eligiendo una sugerencia:** el peso neto, las kcal
  por 100 g y la foto vienen de Open Food Facts
  (<https://es.openfoodfacts.org>). Es una base de datos abierta que rellenan
  voluntarios, así que puede tener errores: la app deja editar los datos.
  La búsqueda por nombre usa <https://search.openfoodfacts.org>.
- **Valores típicos, sin conexión** (`src/constants/genericos.ts`): kcal por
  100 g de USDA FoodData Central, conjunto SR Legacy, consultadas el 11 de
  noviembre de 2026. Entre paréntesis, el identificador en
  <https://fdc.nal.usda.gov>:

  | Alimento                         | kcal/100 g | FDC    |
  |----------------------------------|------------|--------|
  | Garbanzos en conserva, escurridos | 139       | 173800 |
  | Lentejas cocidas                 | 114        | 175254 |
  | Lentejas secas                   | 352        | 172420 |
  | Alubias blancas en conserva      | 114        | 175204 |
  | Atún claro en aceite, escurrido  | 198        | 173708 |
  | Atún blanco al natural, escurrido | 128       | 175158 |
  | Sardinas en aceite, escurridas   | 208        | 175139 |
  | Arroz blanco largo, crudo        | 365        | 169756 |
  | Pasta seca                       | 371        | 168927 |
  | Salsa de tomate en conserva      | 24         | 170054 |

  La lista es corta a propósito: solo están los valores que se pudieron
  comprobar (la clave pública de la API de USDA limita las consultas). Para
  añadir más hay que consultarlos allí, no ponerlos de memoria.
- Las kcal de una unidad son `peso (g) × kcal por 100 g / 100`. En conservas
  con líquido, lo correcto es usar el peso escurrido.

## Caducidad

- Muchos envases solo traen mes y año. En ese caso se toma el **último día del
  mes** como fecha de caducidad y se recuerda que la etiqueta no traía día.
  **[propio]**: es la lectura habitual de «consumir preferentemente antes del
  fin de…».
- Un producto caducado no cuenta, aunque una fecha de consumo preferente no
  significa que el producto ya no se pueda comer. Es una decisión prudente.
  **[propio]**

## Modo emergencia

- El agua que se apunta como bebida se descuenta de la reserva, empezando por
  la que caduca antes. «Quitar» devuelve lo apuntado por error.
- La meta del contador de agua es lo de beber (sin higiene) de toda la casa;
  en reparto manual, la suma de las raciones fijadas.
- Lo que se marca como comido se descuenta de la despensa y queda en una lista
  del día, desde la que se puede deshacer. El plan propone lo que falta para
  llegar a las kcal del día, empezando por lo que antes se estropea.
- El escenario se elige al empezar la emergencia y se puede cambiar durante
  ella («¿Ha cambiado algo?»).

## Sin luz: nevera y congelador

- Con la puerta cerrada, la nevera mantiene el frío **unas 4 horas**. Pasado
  ese tiempo, lo perecedero (carne, pescado, leche, huevos, sobras) se tira.
  Fuente: [Ready.gov, Food](https://www.ready.gov/food) (comprobado el
  15/11/2026: «about four hours if it is unopened»).
- Un congelador **lleno** aguanta **unas 48 horas** y uno **a medias, unas 24**.
  Fuente: [FoodSafety.gov, Three ways to keep food safe when you lose
  power](https://www.foodsafety.gov/blog/three-ways-keep-food-safe-when-you-lose-power)
  (vía búsqueda del 15/11/2026; la página de USDA FSIS no se pudo abrir).
  Por defecto se toma «a medias», que es lo prudente; el escenario tiene el
  interruptor «El congelador está lleno».
- De ahí el orden: **nevera → congelador → despensa y latas**. El plan del
  día lo sigue y, en plena emergencia, descuenta las horas que han pasado
  desde que se activó «sin luz» (se guarda la hora en ese momento).
- Para el cálculo se supone que la ración del día se come repartida a lo
  largo de las 24 horas, así que de la nevera solo cuenta lo que cabe en sus
  4 horas. **[propio]**: es prudente; en la práctica se puede comer algo más
  deprisa.

## Energía propia

- **Placas solares**: kWh al día por cada kWp de
  [PVGIS 5.3](https://re.jrc.ec.europa.eu/pvg_tools/es/) (Comisión Europea,
  JRC), consultado el 15/11/2026 por su API con placa fija, inclinación y
  orientación óptimas y 14 % de pérdidas:

  | Ciudad | Peor mes (dic.) | Media anual |
  |---|---|---|
  | Bilbao | 2,04 | 3,21 |
  | A Coruña | 2,00 | 3,52 |
  | Madrid | 3,33 | 4,44 |
  | Barcelona | 3,23 | 4,31 |
  | Sevilla | 3,64 | 4,58 |
  | Las Palmas | 3,78 | 4,42 |

  La app usa tres zonas con el valor más bajo de cada pareja: norte 2,0 / 3,2;
  centro 3,2 / 4,3; sur 3,6 / 4,4. Una placa tumbada o con sombra da menos.
- **Power banks**: se aprovechan dos tercios de la capacidad de la caja (mAh ×
  3,7 V × 0,65). **[propio]**: las celdas van a 3,7 V y la salida a 5 V, con
  pérdidas; no he encontrado una fuente única para el porcentaje.
- **Baterías con inversor**: se pierde un 15 %. **[propio]**
- **Generador**: litros guardados / consumo por hora de su ficha × potencia.
- **Aparatos de partida** (móvil 15 W × 1 h, LED 9 W × 4 h, radio 5 W × 3 h,
  router 10 W, nevera 30 W de media, portátil 45 W, CPAP 40 W × 8 h):
  orientativos, **[propio]**; la pantalla pide cambiarlos por los de la
  etiqueta.
- Días de energía = lo guardado / (consumo diario − producción solar diaria).
  Si el sol cubre el consumo, no se acaba.

## Cómo se calculan los días

- **Días de comida**: se simula comer las kcal diarias de las personas
  empezando por lo que antes se estropea (fecha de caducidad o, sin luz, las
  horas de nevera y congelador). Lo que caducaría antes de que dé tiempo a
  comerlo no cuenta y la app avisa de ello. Así no se cuentan como días
  calorías que se van a tirar. Comer siempre primero lo que antes se estropea
  es lo que menos desperdicia.
- Días de agua = (litros − agua reservada para cocinar) / litros diarios de
  personas y mascotas
- **Días que aguantáis** = mínimo de los dos, redondeado hacia abajo
- No se cuenta lo caducado ni, sin cocina, lo que hay que cocinar.

## Kit de emergencia

Consultado el 16/11/2026.

- Listas de `src/constants/kit.ts`:
  - **Casa, mochila y botiquín**: kit básico de Ready.gov y sus «suministros
    adicionales» (https://www.ready.gov/kit, actualizada el 07/01/2026).
    Ready.gov pide agua y comida «para varios días» sin dar una cifra, y que
    el kit esté listo por si hay que salir de casa deprisa.
  - **Coche**: «extras» de Ready.gov para el coche (https://www.ready.gov/car,
    actualizada el 03/12/2026), más el agua y la comida del kit básico.
  - El botiquín de la Cruz Roja americana no se pudo leer (la página devuelve
    403): no se ha usado.
- **Mochila medida contra 72 horas** **[propio]**: el agua solo para beber
  (la de `aguaBeber` con la actividad del día a día, más la de las mascotas) y
  la comida de un día en modo normal, por tres. Con la higiene (el agua del
  modo normal: beber + 1,5 L por persona) se
  enseña aparte: con ella la mochila de una casa de tres pesaría más de 30 kg. Las 72 horas vienen de la Comisión Europea,
  que en su estrategia de preparación (marzo de 2025) se propone «develop
  guidelines to reach a population self-sufficiency of minimum 72 hours»
  (https://commission.europa.eu/topics/preparedness_en). Es un objetivo de la
  estrategia, no una recomendación a los hogares: la app ya no dice que «la UE
  recomienda».
- **Plan de compra** **[propio]**: el bote de referencia son 400 g de
  garbanzos cocidos escurridos con las kcal de USDA de `genericos.ts`
  (556 kcal). Los precios y el presupuesto los pone cada uno.

## Trueque

- Lo que sobra o falta se calcula respecto al objetivo de días con el modo en
  uso. Para ponerlo en palabras, 2.000 kcal cuentan como un día de un adulto.
  **[propio]**
- Se ofrece también lo que caducará antes de que dé tiempo a comerlo, pero no
  lo que ya se ha estropeado por el calor.

## Avisos que la app tiene que mostrar

- La estimación es orientativa y no sustituye el consejo médico.
- Si hay un bebé, que necesita leche materna o de fórmula.
- Que el agua para beber no se raciona: si se acaba, hay que buscar más.

## Avisos oficiales

Añadido el 18/11/2026 (`src/lib/avisos.ts`, `src/lib/avisos-estado.ts`;
desde la tarde del 18/11/2026 es la pestaña Actualidad,
`src/app/(tabs)/actualidad.tsx`). Solo fuentes oficiales; nada de prensa
(derechos, API de pago y alarmismo): Eric lo confirmó el 18/11/2026. Todas se leen por RSS desde el móvil, sin servidor
propio ni claves. Ninguna manda cabeceras CORS: en la versión web no se pueden
descargar (en el móvil no hay CORS).

- **AEMET**, avisos meteorológicos (Meteoalerta). Un RSS por comunidad:
  `https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAC{61…79}_RSS.xml`.
  Cada `<item>` lleva «Aviso. Nivel {amarillo|naranja|rojo}. {Fenómeno}. {Zona}»,
  el tramo «de HH:MM DD-MM-AAAA CET (UTC+1) a …» y, en el `guid`, el código de
  zona `AFAZ` + 6 cifras: comunidad AEMET (2), provincia INE (2) y zona (2). En
  Baleares (53, 54, 55) y Canarias las zonas van por islas: allí se enseña toda
  la comunidad. Se salta el «Estado completo» (un `.tar.gz` con los CAP).
  **Condiciones** (nota legal, leída el 18/11/2026,
  <https://www.aemet.es/es/nota_legal>): reutilización permitida, también
  comercial, citando «Fuente: AEMET» o «Información elaborada por la Agencia
  Estatal de Meteorología», con la fecha de actualización, sin cambiar el
  sentido y sin dar a entender que AEMET respalda la app.
- **IGN**, terremotos de España de los últimos 10 días:
  <https://www.ign.es/ign/RssTools/sismologia.xml>. La hora del RSS es UTC
  (comprobado en la ficha del terremoto, que da «Hora UTC» y «Hora local»). El
  lugar acaba en la matrícula de la provincia («TABOADA.LU»); lo de fuera
  (Marruecos «.MAC», Argelia «.ARG», zonas de mar sin sufijo) no se enseña. Las
  matrículas de Baleares (IB/PM) y Las Palmas (GC/LP) no están comprobadas.
  Licencia CC BY 4.0 (ficha del catálogo en IDEE/datos.gob.es; el PDF de
  condiciones del IGN no se leyó).
  **[propio]**: se enseñan los de magnitud ≥ 3,0 en tu provincia y ≥ 4,0 en el
  resto de España.
- **GDACS** (ONU, OCHA, y Comisión Europea, JRC), desastres del mundo:
  <https://www.gdacs.org/xml/rss.xml>. Solo `alertlevel` Orange o Red con
  `iscurrent` distinto de false (las sequías largas vienen como no actuales).
  Licencia que trae el propio RSS: «European Union (CC BY 4.0), reuse is
  allowed, provided appropriate credit to GDACS is given».
- **Noticias de AEMET**: <https://www.aemet.es/es/noticias.rss> (enlazado desde
  <https://www.aemet.es/es/rss_info>). Viene en **ISO-8859-15**, no en UTF-8:
  se baja como bytes y se lee con `latin9` (en React Native no hay
  `TextDecoder` para esa codificación). `pubDate` con el mes en español
  («mar, 10 nov 2026 00:00 +0000»). AEMET corta los títulos largos con «...».
  Condiciones, en el propio RSS: «Autorizado el uso de la información y su
  reproducción citando a AEMET como autora de la misma».
- **Protección Civil y 112**: no se ha encontrado RSS (18/11/2026:
  `proteccioncivil.es/rss` da 404, la sala de prensa no anuncia ninguno y el
  RSS del Ministerio del Interior responde 403). Los 112 autonómicos son
  distintos en cada comunidad; no se han mirado.
- **ES-Alert**: no hay API ni RSS para terceros (no encontrado). Llega solo a
  los móviles; la pantalla lo recuerda.

Descarga **[propio]**: al abrir la app y al volver a ella, como mucho cada 30
minutos, y con «Actualizar». Cada fuente por su lado; si falla, se queda lo
último guardado y se avisa. La provincia y la caché van en `aguante-avisos`
(del móvil: no van en copias ni se comparten).

En Inicio se destaca un aviso **naranja o rojo** de tu provincia si está en
curso o empieza en las próximas 48 horas **[propio]**.

**Historial [propio]**: los RSS solo traen lo de ahora (AEMET quita el aviso al
acabar, el IGN da diez días, GDACS deja de listar lo cerrado). En cada descarga
se junta lo nuevo con lo guardado y se conserva **30 días**
(`DIAS_HISTORIAL`): los avisos de AEMET ya acabados de la provincia (un aviso
que desaparece antes de acabar se da por retirado y no se guarda; los
reemitidos con otro `guid` se reconocen por zona, fenómeno, nivel y tramo), los
terremotos de España de 3,0 o más, los desastres que se cierran (marcados
`cerrado`) y las noticias (siempre las diez últimas aunque tengan más de un
mes, porque AEMET publica pocas). Solo hay historial desde que el móvil tiene
esta versión.

**Pestaña Actualidad**: arriba, los avisos de AEMET en vigor o por llegar;
debajo, «Lo que ha pasado», agrupado por días, con filtro Todo / Provincia /
España (incluye la provincia) / Mundo (solo lo de fuera). Cada fila abre la
fuente.

