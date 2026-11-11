// Lo que enseña la pantalla «Fuentes y método». Es un resumen de
// docs/fuentes-y-reglas.md: si cambias una regla allí o en lib/calculo.ts,
// cámbiala también aquí.

import type { NombreIcono } from '@/components/ui';

export type Punto = { texto: string; propio?: boolean };
export type Enlace = { nombre: string; url: string };
export type Bloque = { titulo: string; icono: NombreIcono; puntos: Punto[]; enlaces: Enlace[] };

export const FECHA_CONSULTA = '11 de noviembre de 2026';

export const BLOQUES: Bloque[] = [
  {
    titulo: 'Principios',
    icono: 'shield-check-outline',
    puntos: [
      { texto: 'El agua para beber no se raciona. Si se acaba, se bebe lo que haga falta hoy y se busca más para mañana.' },
      { texto: 'La comida sí se puede racionar, salvo a niños y embarazadas. Por eso los menores de 18 años, las embarazadas y las mujeres en lactancia comen siempre al 100 %.' },
      { texto: 'También puedes marcar «no racionar» a cualquier persona (mayores, enfermos).', propio: true },
      { texto: 'Objetivo mínimo: que la casa aguante 72 horas por su cuenta.' },
    ],
    enlaces: [
      { nombre: 'FEMA, Cruz Roja y USDA: Food and Water in an Emergency (archivo)', url: 'https://webharvest.gov/peth04/20041015031112/http://www.fema.gov/rrr/foodwtr.shtm' },
      { nombre: 'CDC: comida en el kit de emergencia (archivo de 2009)', url: 'https://webarchive.library.unt.edu/web/20090116155203/http://emergency.cdc.gov/preparedness/kit/food' },
      { nombre: 'Comisión Europea: estrategia de preparación', url: 'https://commission.europa.eu/topics/preparedness_uk' },
    ],
  },
  {
    titulo: 'Calorías de cada persona',
    icono: 'food-variant',
    puntos: [
      { texto: 'Adultos: gasto basal con las ecuaciones de Schofield (FAO/OMS/UNU 2004) según sexo, edad y peso, multiplicado por 1,40, el nivel de actividad sedentario más bajo que da la FAO.' },
      { texto: 'De 1 a 17 años: regresión de la FAO según el peso, más un 1 % por crecimiento, en su variante de actividad ligera (un 15 % menos).' },
      { texto: 'Bebés de menos de 1 año: necesitan leche materna o de fórmula, así que su comida no se calcula. Su agua sí cuenta.' },
      { texto: 'Embarazo: +85, +285 y +475 kcal al día por trimestre. Lactancia: +505 kcal.' },
    ],
    enlaces: [
      { nombre: 'FAO/OMS/UNU 2004: adultos', url: 'https://www.fao.org/4/y5686e/y5686e07.htm' },
      { nombre: 'FAO/OMS/UNU 2004: niños y adolescentes', url: 'https://www.fao.org/4/y5686e/y5686e06.htm' },
      { nombre: 'FAO/OMS/UNU 2004: embarazo', url: 'https://www.fao.org/4/y5686e/y5686e0a.htm' },
      { nombre: 'FAO/OMS/UNU 2004: lactancia', url: 'https://www.fao.org/4/y5686e/y5686e0b.htm' },
    ],
  },
  {
    titulo: 'Modos de aguante: comida',
    icono: 'gauge',
    puntos: [
      { texto: 'Normal: el 100 % de lo calculado.' },
      { texto: 'Ligero: el 85 %. Es un punto intermedio.', propio: true },
      { texto: 'Severo: el 70 %, el mínimo de asistencia alimentaria del Food Security Cluster (unas 1.550 kcal sobre la cifra de planificación de 2.100).' },
      { texto: 'Extremo: el 50 %. FEMA dice que un adulto sano y con poca actividad puede pasar con la mitad de su comida habitual durante bastante tiempo.' },
      { texto: 'El recorte se aplica solo a los adultos que se pueden racionar.' },
    ],
    enlaces: [
      { nombre: 'Food Security Cluster: directrices de emergencia (2025)', url: 'https://fscluster.org/sites/default/files/2025-01/WoS%20Food%20Security%20Sector%20Emergency%20Guidelines%20-%20January%202025-%20Final.pdf' },
      { nombre: 'PMA y ACNUR: las 2.100 kcal de planificación', url: 'https://ennonline.net/fex/3/summary' },
    ],
  },
  {
    titulo: 'Agua',
    icono: 'water-outline',
    puntos: [
      { texto: 'Para beber: la ingesta adecuada de la EFSA. 2,5 L los hombres y 2,0 L las mujeres desde los 14 años; menos los niños (de 1,0 a 2,1 L según la edad). Embarazo +0,3 L y lactancia +0,7 L.' },
      { texto: 'Estas cifras de la EFSA vienen de fuentes que la citan: no pude leer el dictamen original.' },
      { texto: 'Con mucho calor se bebe el doble (FEMA).' },
      { texto: 'Modo normal: 3,8 L por persona y día (1 galón, Ready.gov), para beber y saneamiento.' },
      { texto: 'Modo ligero: lo de beber más 0,5 L de higiene mínima.', propio: true },
      { texto: 'Modos severo y extremo: solo lo de beber. Eso no baja nunca.' },
      { texto: 'El agua para cocinar cada producto se descuenta de la reserva.' },
    ],
    enlaces: [
      { nombre: 'Ready.gov: cuánta agua guardar', url: 'https://www.ready.gov/water' },
      { nombre: 'EUFIC: cuánta agua beber al día (cita a la EFSA)', url: 'https://www.eufic.org/en/healthy-living/article/how-much-water-should-you-drink-per-day' },
      { nombre: 'Tabla EFSA/IOM de ingesta de agua', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4080755/table/T3' },
      { nombre: 'Sphere: cantidad mínima de agua', url: 'https://sphereprototype.conted.ox.ac.uk/standards/watersupply/accessAndWaterQuantity.html' },
    ],
  },
  {
    titulo: 'Reparto manual',
    icono: 'tune-variant',
    puntos: [
      { texto: 'Tú fijas las kcal y los litros de cada persona y mascota. La app calcula los días con esas raciones y no las corrige.', propio: true },
      { texto: 'Avisa si alguien bebe menos de su ingesta adecuada, si se recorta la comida a alguien que las fuentes dicen que no se racione, o si un adulto baja de la mitad de lo que necesita.' },
      { texto: '«Una comida» es un tercio de lo que esa persona necesita al día.', propio: true },
    ],
    enlaces: [],
  },
  {
    titulo: 'Mascotas',
    icono: 'paw',
    puntos: [
      { texto: 'Energía: 70 × kg^0,75 (fórmula RER de la AAHA), por 1,6 en perros y por 1,2 en gatos. El factor se cita mucho, pero no encontré una norma veterinaria que lo fije.' },
      { texto: 'Agua: tantos mililitros como kcal de mantenimiento.' },
      { texto: 'Son fuentes secundarias: si tu veterinario te ha dado otra cifra, fíate de la suya.' },
    ],
    enlaces: [
      { nombre: 'Dogster: calculadora de calorías', url: 'https://www.dogster.com/dog-calorie-calculator/' },
      { nombre: 'Agua diaria de un perro', url: 'https://mycockerspaniel.com/h2o.htm' },
    ],
  },
  {
    titulo: 'Calorías de los productos',
    icono: 'barcode-scan',
    puntos: [
      { texto: 'Al escanear o al elegir una sugerencia, el peso, las kcal por 100 g y la foto salen de Open Food Facts, una base de datos abierta que rellenan voluntarios: conviene comprobarlo con la etiqueta.' },
      { texto: 'Los «valores típicos» (garbanzos, lentejas, atún, arroz, pasta…) son de USDA FoodData Central y van dentro de la app, así que funcionan sin conexión.' },
      { texto: 'Si el envase solo trae mes y año, se toma el último día de ese mes como caducidad.', propio: true },
    ],
    enlaces: [
      { nombre: 'Open Food Facts', url: 'https://es.openfoodfacts.org' },
      { nombre: 'USDA FoodData Central', url: 'https://fdc.nal.usda.gov' },
    ],
  },
  {
    titulo: 'Cómo salen los días',
    icono: 'calendar-check-outline',
    puntos: [
      { texto: 'Días de comida: kcal útiles de la despensa entre las kcal diarias de las personas.' },
      { texto: 'Días de agua: litros guardados, menos los reservados para cocinar, entre los litros diarios de personas y mascotas.' },
      { texto: 'Aguantáis el menor de los dos, redondeado hacia abajo.' },
      { texto: 'No cuenta lo caducado, ni lo que necesita nevera si no hay luz, ni lo que hay que cocinar si no hay cocina.' },
    ],
    enlaces: [],
  },
];
