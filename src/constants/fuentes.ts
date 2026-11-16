// Lo que enseña la pantalla «Fuentes y método». Es un resumen de
// docs/fuentes-y-reglas.md: si cambias una regla allí o en lib/calculo.ts,
// cámbiala también aquí.

import type { NombreIcono } from '@/components/ui';
import { tx } from '@/lib/i18n';

export type Punto = { texto: string; propio?: boolean };
export type Enlace = { nombre: string; url: string };
export type Bloque = { titulo: string; icono: NombreIcono; puntos: Punto[]; enlaces: Enlace[] };

export const FECHA_CONSULTA = tx('11 de noviembre de 2026');

export const BLOQUES: Bloque[] = [
  {
    titulo: tx('Principios'),
    icono: 'shield-check-outline',
    puntos: [
      { texto: tx('El agua para beber no se raciona. Si se acaba, se bebe lo que haga falta hoy y se busca más para mañana.') },
      { texto: tx('La comida sí se puede racionar, salvo a niños y embarazadas. Por eso los menores de 18 años, las embarazadas y las mujeres en lactancia comen siempre al 100 %.') },
      { texto: tx('También puedes marcar «no racionar» a cualquier persona (mayores, enfermos).'), propio: true },
      { texto: tx('Objetivo mínimo: que la casa aguante 72 horas por su cuenta.') },
    ],
    enlaces: [
      { nombre: tx('FEMA, Cruz Roja y USDA: Food and Water in an Emergency (archivo)'), url: 'https://webharvest.gov/peth04/20041015031112/http://www.fema.gov/rrr/foodwtr.shtm' },
      { nombre: tx('CDC: comida en el kit de emergencia (archivo de 2009)'), url: 'https://webarchive.library.unt.edu/web/20090116155203/http://emergency.cdc.gov/preparedness/kit/food' },
      { nombre: tx('Comisión Europea: estrategia de preparación'), url: 'https://commission.europa.eu/topics/preparedness_en' },
    ],
  },
  {
    titulo: tx('Calorías de cada persona'),
    icono: 'food-variant',
    puntos: [
      { texto: tx('Adultos: gasto basal con las ecuaciones de Schofield (FAO/OMS/UNU 2004) según sexo, edad y peso, multiplicado por 1,40, el nivel de actividad sedentario más bajo que da la FAO.') },
      { texto: tx('De 1 a 17 años: regresión de la FAO según el peso, más un 1 % por crecimiento, en su variante de actividad ligera (un 15 % menos).') },
      { texto: tx('Bebés de menos de 1 año: necesitan leche materna o de fórmula, así que su comida no se calcula. Su agua sí cuenta.') },
      { texto: tx('Embarazo: +85, +285 y +475 kcal al día por trimestre. Lactancia: +505 kcal.') },
    ],
    enlaces: [
      { nombre: tx('FAO/OMS/UNU 2004: adultos'), url: 'https://www.fao.org/4/y5686e/y5686e07.htm' },
      { nombre: tx('FAO/OMS/UNU 2004: niños y adolescentes'), url: 'https://www.fao.org/4/y5686e/y5686e06.htm' },
      { nombre: tx('FAO/OMS/UNU 2004: embarazo'), url: 'https://www.fao.org/4/y5686e/y5686e0a.htm' },
      { nombre: tx('FAO/OMS/UNU 2004: lactancia'), url: 'https://www.fao.org/4/y5686e/y5686e0b.htm' },
    ],
  },
  {
    titulo: tx('Modos de aguante: comida'),
    icono: 'gauge',
    puntos: [
      { texto: tx('Normal: el 100 % de lo calculado.') },
      { texto: tx('Ligero: el 85 %. Es un punto intermedio.'), propio: true },
      { texto: tx('Severo: el 70 %, el mínimo de asistencia alimentaria del Food Security Cluster (unas 1.550 kcal sobre la cifra de planificación de 2.100).') },
      { texto: tx('Extremo: el 50 %. FEMA dice que un adulto sano y con poca actividad puede pasar con la mitad de su comida habitual durante bastante tiempo.') },
      { texto: tx('El recorte se aplica solo a los adultos que se pueden racionar.') },
    ],
    enlaces: [
      { nombre: tx('Food Security Cluster: directrices de emergencia (2025)'), url: 'https://fscluster.org/sites/default/files/2025-01/WoS%20Food%20Security%20Sector%20Emergency%20Guidelines%20-%20January%202025-%20Final.pdf' },
      { nombre: tx('PMA y ACNUR: las 2.100 kcal de planificación'), url: 'https://ennonline.net/fex/3/summary' },
    ],
  },
  {
    titulo: tx('Agua'),
    icono: 'water-outline',
    puntos: [
      { texto: tx('Para beber: la ingesta adecuada de la EFSA. 2,5 L los hombres y 2,0 L las mujeres desde los 14 años; menos los niños (de 1,0 a 2,1 L según la edad). Embarazo +0,3 L y lactancia +0,7 L.') },
      { texto: tx('Estas cifras de la EFSA vienen de fuentes que la citan: no pude leer el dictamen original.') },
      { texto: tx('Con mucho calor se bebe el doble (FEMA).') },
      { texto: tx('Modo normal: 3,8 L por persona y día (1 galón, Ready.gov), para beber y saneamiento.') },
      { texto: tx('Modo ligero: lo de beber más 0,5 L de higiene mínima.'), propio: true },
      { texto: tx('Modos severo y extremo: solo lo de beber. Eso no baja nunca.') },
      { texto: tx('El agua para cocinar cada producto se descuenta de la reserva.') },
    ],
    enlaces: [
      { nombre: tx('Ready.gov: cuánta agua guardar'), url: 'https://www.ready.gov/water' },
      { nombre: tx('EUFIC: cuánta agua beber al día (cita a la EFSA)'), url: 'https://www.eufic.org/en/healthy-living/article/how-much-water-should-you-drink-per-day' },
      { nombre: tx('Tabla EFSA/IOM de ingesta de agua'), url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4080755/table/T3' },
      { nombre: tx('Sphere: cantidad mínima de agua'), url: 'https://sphereprototype.conted.ox.ac.uk/standards/watersupply/accessAndWaterQuantity.html' },
    ],
  },
  {
    titulo: tx('Reparto manual'),
    icono: 'tune-variant',
    puntos: [
      { texto: tx('Tú fijas las kcal y los litros de cada persona y mascota. La app calcula los días con esas raciones y no las corrige.'), propio: true },
      { texto: tx('Avisa si alguien bebe menos de su ingesta adecuada, si se recorta la comida a alguien que las fuentes dicen que no se racione, o si un adulto baja de la mitad de lo que necesita.') },
      { texto: tx('«Una comida» es un tercio de lo que esa persona necesita al día.'), propio: true },
    ],
    enlaces: [],
  },
  {
    titulo: tx('Mascotas'),
    icono: 'paw',
    puntos: [
      { texto: tx('Energía: 70 × kg^0,75 (fórmula RER de la AAHA), por 1,6 en perros y por 1,2 en gatos. El factor se cita mucho, pero no encontré una norma veterinaria que lo fije.') },
      { texto: tx('Agua: tantos mililitros como kcal de mantenimiento.') },
      { texto: tx('Son fuentes secundarias: si tu veterinario te ha dado otra cifra, fíate de la suya.') },
    ],
    enlaces: [
      { nombre: tx('Dogster: calculadora de calorías'), url: 'https://www.dogster.com/dog-calorie-calculator/' },
      { nombre: tx('Agua diaria de un perro'), url: 'https://mycockerspaniel.com/h2o.htm' },
    ],
  },
  {
    titulo: tx('Calorías de los productos'),
    icono: 'barcode-scan',
    puntos: [
      { texto: tx('Al escanear o al elegir una sugerencia, el peso, las kcal por 100 g y la foto salen de Open Food Facts, una base de datos abierta que rellenan voluntarios: conviene comprobarlo con la etiqueta.') },
      { texto: tx('Los «valores típicos» (garbanzos, lentejas, atún, arroz, pasta…) son de USDA FoodData Central y van dentro de la app, así que funcionan sin conexión.') },
      { texto: tx('Si el envase solo trae mes y año, se toma el último día de ese mes como caducidad.'), propio: true },
    ],
    enlaces: [
      { nombre: tx('Open Food Facts'), url: 'https://es.openfoodfacts.org' },
      { nombre: tx('USDA FoodData Central'), url: 'https://fdc.nal.usda.gov' },
    ],
  },
  {
    titulo: tx('Cómo salen los días'),
    icono: 'calendar-check-outline',
    puntos: [
      { texto: tx('Días de comida: se simula comer la ración diaria empezando por lo que antes se estropea. Lo que caducaría antes de que dé tiempo a comerlo no cuenta: sumar todas las calorías daría más días de los reales.') },
      { texto: tx('Días de agua: litros guardados, menos los reservados para cocinar, entre los litros diarios de personas y mascotas.') },
      { texto: tx('Aguantáis el menor de los dos, redondeado hacia abajo.') },
      { texto: tx('No cuenta lo caducado ni lo que hay que cocinar si no hay cocina.') },
    ],
    enlaces: [],
  },
  {
    titulo: tx('Sin luz: nevera y congelador'),
    icono: 'fridge-outline',
    puntos: [
      { texto: tx('Con la puerta cerrada, la nevera mantiene el frío unas 4 horas. Pasado ese tiempo, lo perecedero (carne, pescado, leche, huevos, sobras) ya no es seguro.') },
      { texto: tx('Un congelador lleno aguanta unas 48 horas, y uno a medias unas 24.') },
      { texto: tx('Por eso el orden es nevera, después congelador y al final la despensa y las latas. El plan del día lo sigue y descuenta las horas que ya han pasado desde el apagón.') },
      { texto: tx('Para el cálculo se come la ración repartida a lo largo del día: lo que no cabe en esas horas cuenta como perdido. En la práctica se puede comer algo más deprisa.'), propio: true },
    ],
    enlaces: [
      { nombre: tx('Ready.gov: comida en una emergencia'), url: 'https://www.ready.gov/food' },
      { nombre: tx('FoodSafety.gov: tres formas de mantener la comida segura sin luz'), url: 'https://www.foodsafety.gov/blog/three-ways-keep-food-safe-when-you-lose-power' },
    ],
  },
  {
    titulo: tx('Energía propia'),
    icono: 'lightning-bolt-outline',
    puntos: [
      { texto: tx('Placas solares: kWh al día por cada kWp según PVGIS 5.3 (Comisión Europea), con la placa bien orientada y un 14 % de pérdidas. «Peor mes» es diciembre en casi toda España; «media», la media del año.') },
      { texto: tx('Valores por kWp al día: norte 2,0 (peor mes) y 3,2 (media); centro 3,2 y 4,3; sur 3,6 y 4,4. Son los de Bilbao y A Coruña, Madrid y Barcelona, y Sevilla y Las Palmas, tomando el más bajo de cada pareja.') },
      { texto: tx('Power banks: se aprovechan dos tercios de los mAh de la caja (celdas a 3,7 V y pérdidas al convertir a 5 V).'), propio: true },
      { texto: tx('Baterías con inversor: se pierde un 15 %.'), propio: true },
      { texto: tx('Generador: litros guardados entre el consumo por hora de su ficha, por la potencia.') },
      { texto: tx('Los vatios de los aparatos de partida son orientativos: hay que cambiarlos por los de su etiqueta.'), propio: true },
    ],
    enlaces: [{ nombre: tx('PVGIS (Comisión Europea, JRC)'), url: 'https://re.jrc.ec.europa.eu/pvg_tools/es/' }],
  },
  {
    titulo: tx('Kit de emergencia'),
    icono: 'clipboard-check-outline',
    puntos: [
      { texto: tx('Las listas de casa, mochila y botiquín salen del kit básico de Ready.gov y de sus suministros adicionales; la del coche, de su kit para el coche.') },
      { texto: tx('La mochila se mide contra 72 horas: el agua para beber (EFSA) y la comida de un día, por tres. Con la higiene, el agua del modo normal.'), propio: true },
      { texto: tx('La Comisión Europea se ha propuesto que la población pueda valerse por sí misma al menos 72 horas (estrategia de preparación, marzo de 2025).') },
    ],
    enlaces: [
      { nombre: tx('Ready.gov: arma un kit'), url: 'https://www.ready.gov/kit' },
      { nombre: tx('Ready.gov: kit para el coche'), url: 'https://www.ready.gov/car' },
    ],
  },
];
