// Motor de cálculo de Aguante.
//
// Todas las cifras salen de docs/fuentes-y-reglas.md, donde está la fuente de
// cada una. Si cambias un número aquí, cámbialo también allí.
//
// Este fichero no importa nada y no usa enums: así los tests se ejecutan con
// `node --test` sin compilar (Node quita los tipos por su cuenta).
// ---------------------------------------------------------------- Constantes
// Nivel de actividad física (PAL) de los adultos. FAO 2004, tabla 5.3: 1,40 es
// el suelo del estilo de vida sedentario. 1,60 es el nivel «moderado» con el
// que la EFSA fija el agua. Por defecto, sedentaria (lo pidió Eric: en una
// emergencia se hace poco).
export const PAL = { sedentaria: 1.4, normal: 1.6 };
export const ACTIVIDAD_POR_DEFECTO = 'sedentaria';
// Factor de comida por modo, solo para adultos que se pueden racionar.
// Ligero 85 % es un valor intermedio propio; el resto tiene fuente.
export const FACTOR_COMIDA = {
    normal: 1,
    ligero: 0.85,
    severo: 0.7, // Food Security Cluster: mínimo ≈ 70 % de 2.100 kcal
    extremo: 0.5, // FEMA: la mitad de la comida habitual, adultos sanos
};
// Agua de higiene por persona y día, que se suma a la de beber. Normal: 1,5 L,
// valor propio entre lo que deja libre el galón de Ready.gov (unos 3,8 L con
// unos 2,8 L de bebida) y el mínimo de higiene de Sphere (2 L). Ligero: 0,5 L,
// también propio. Severo y extremo: nada, solo se bebe.
export const AGUA_HIGIENE_L = { normal: 1.5, ligero: 0.5, severo: 0, extremo: 0 };
// NRC 1989 (RDA, 10.ª ed.): 1 mL de agua por kcal gastada en adultos.
const ML_AGUA_POR_KCAL = 1;
// Sin luz y con la puerta cerrada. Nevera: unas 4 horas (Ready.gov). Congelador:
// unas 48 horas si está lleno y 24 si está a medias (FoodSafety.gov, USDA).
export const HORAS_NEVERA_SIN_LUZ = 4;
export const HORAS_CONGELADOR_LLENO = 48;
export const HORAS_CONGELADOR_MEDIAS = 24;
const EXTRA_EMBARAZO_KCAL = [0, 85, 285, 475];
const EXTRA_LACTANCIA_KCAL = 505;
const EXTRA_EMBARAZO_AGUA_L = 0.3;
const EXTRA_LACTANCIA_AGUA_L = 0.7;
// ------------------------------------------------------------------- Energía
/** Gasto basal (kcal/día) con Schofield, FAO 2004 tabla 5.2. Solo adultos. */
export function bmrAdulto(sexo, edad, kg) {
    if (sexo === 'hombre') {
        if (edad < 30)
            return 15.057 * kg + 692.2;
        if (edad < 60)
            return 11.472 * kg + 873.1;
        return 11.711 * kg + 587.7;
    }
    if (edad < 30)
        return 14.818 * kg + 486.6;
    if (edad < 60)
        return 8.126 * kg + 845.6;
    return 9.082 * kg + 658.5;
}
/**
 * Necesidad de un menor de 1 a 17 años, FAO 2004 capítulo 4: gasto total por
 * regresión según el peso y +1 % de crecimiento. La regresión es de actividad
 * moderada: sedentaria usa la variante ligera (−15 %).
 */
export function kcalMenor(sexo, kg, actividad = ACTIVIDAD_POR_DEFECTO) {
    const tee = sexo === 'hombre'
        ? 310.2 + 63.3 * kg - 0.263 * kg * kg
        : 263.4 + 65.3 * kg - 0.454 * kg * kg;
    return tee * 1.01 * (actividad === 'normal' ? 1 : 0.85);
}
/** ¿Se le puede recortar la comida? Ver el principio 2 de las fuentes. */
export function esProtegida(p) {
    return (p.edadAnios < 18 ||
        (p.embarazoTrimestre ?? 0) > 0 ||
        !!p.lactancia ||
        !!p.noRacionar);
}
/** kcal/día de una persona sin racionar, con la actividad del escenario. Un bebé devuelve 0: va aparte. */
export function kcalBase(p, esc = {}) {
    if (p.edadAnios < 1)
        return 0;
    const actividad = esc.actividad ?? ACTIVIDAD_POR_DEFECTO;
    let kcal = p.edadAnios < 18
        ? kcalMenor(p.sexo, p.pesoKg, actividad)
        : bmrAdulto(p.sexo, p.edadAnios, p.pesoKg) * PAL[actividad];
    kcal += EXTRA_EMBARAZO_KCAL[p.embarazoTrimestre ?? 0] ?? 0;
    if (p.lactancia)
        kcal += EXTRA_LACTANCIA_KCAL;
    return kcal;
}
/**
 * kcal/día de una persona en un modo, respetando a los grupos protegidos. En
 * manual manda lo que haya fijado el usuario, también para ellos: la pantalla
 * avisa, pero la decisión es suya.
 */
export function kcalPersona(p, modo, manual = {}, esc = {}) {
    const base = kcalBase(p, esc);
    if (modo === 'manual')
        return p.edadAnios < 1 ? 0 : (manual[p.id]?.kcal ?? base);
    return esProtegida(p) ? base : base * FACTOR_COMIDA[modo];
}
// ---------------------------------------------------------------------- Agua
/** Ingesta adecuada de agua total de la EFSA (L/día), por edad, sexo, embarazo y lactancia. */
export function aguaEFSA(p) {
    const e = p.edadAnios;
    let l;
    if (e < 1)
        l = 1.0;
    else if (e < 2)
        l = 1.2;
    else if (e < 4)
        l = 1.3;
    else if (e < 9)
        l = 1.6;
    else if (e < 14)
        l = p.sexo === 'hombre' ? 2.1 : 1.9;
    else
        l = p.sexo === 'hombre' ? 2.5 : 2.0;
    if ((p.embarazoTrimestre ?? 0) > 0)
        l += EXTRA_EMBARAZO_AGUA_L;
    if (p.lactancia)
        l += EXTRA_LACTANCIA_AGUA_L;
    return l;
}
/**
 * Agua para beber (L/día): la tabla de la EFSA o 1 mL por kcal gastada (NRC
 * 1989), lo que sea mayor. La EFSA pone el suelo por edad y sexo; las kcal
 * hacen que suba con el peso y la actividad. Con calor, el doble (Ready.gov:
 * «water needs can double»). Nunca se recorta.
 */
export function aguaBeber(p, esc = {}) {
    const porEnergia = (kcalBase(p, esc) * ML_AGUA_POR_KCAL) / 1000;
    return Math.max(aguaEFSA(p), porEnergia) * (esc.calor ? 2 : 1);
}
/**
 * Agua de una persona en un modo: la de beber, que no se recorta nunca (FEMA:
 * «never ration water»), más la de higiene del modo, que es lo único que se
 * recorta. En manual manda lo fijado; sin fijar, el modo normal.
 */
export function aguaPersona(p, modo, esc = {}, manual = {}) {
    const beber = aguaBeber(p, esc);
    if (modo === 'manual')
        return manual[p.id]?.litros ?? beber + AGUA_HIGIENE_L.normal;
    return beber + AGUA_HIGIENE_L[modo];
}
/** Lo mismo, partido en beber e higiene. En manual, si se fija menos de lo que se bebe, la higiene es 0. */
export function aguaDesglose(p, modo, esc = {}, manual = {}) {
    const total = aguaPersona(p, modo, esc, manual);
    const beber = Math.min(total, aguaBeber(p, esc));
    return { beber, higiene: total - beber };
}
// ------------------------------------------------------------------ Mascotas
/** Mantenimiento (kcal/día): RER = 70·kg^0,75 × 1,6 en perros y × 1,2 en gatos. */
export function kcalMascota(m) {
    const rer = 70 * Math.pow(m.pesoKg, 0.75);
    return rer * (m.especie === 'perro' ? 1.6 : 1.2);
}
/** Agua (L/día): mL ≈ kcal de mantenimiento. */
export function aguaMascota(m) {
    return kcalMascota(m) / 1000;
}
/** Ración de una mascota: la calculada, o la fijada a mano en modo manual. */
export function racionMascota(m, modo, manual = {}) {
    const r = modo === 'manual' ? manual[m.id] : undefined;
    return { kcal: r?.kcal ?? kcalMascota(m), litros: r?.litros ?? aguaMascota(m) };
}
/** Días que faltan para la fecha (negativo si ya pasó). */
export function diasHasta(fechaISO, hoy) {
    const [a, m, d] = fechaISO.split('-').map(Number);
    const objetivo = Date.UTC(a, m - 1, d);
    const base = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Math.round((objetivo - base) / 86_400_000);
}
/** Rojo: 30 días o menos. Ámbar: 90 días o menos. Sirve para productos y para lo del kit. */
export function estadoCaducidad(p, hoy) {
    if (!p.caducidad)
        return 'sin-fecha';
    const dias = diasHasta(p.caducidad, hoy);
    if (dias < 0)
        return 'caducado';
    if (dias <= 30)
        return 'rojo';
    if (dias <= 90)
        return 'ambar';
    return 'ok';
}
// ------------------------------------------------------------- Conservación
export function conservacionDe(p) {
    return p.conservacion ?? (p.necesitaFrio ? 'nevera' : 'ambiente');
}
/** Horas que aguanta frío ese sitio sin luz (Infinity si no hace falta frío o hay luz). */
export function horasFrio(c, esc) {
    if (!esc.sinLuz || c === 'ambiente')
        return Infinity;
    if (c === 'nevera')
        return HORAS_NEVERA_SIN_LUZ;
    return esc.congeladorLleno ? HORAS_CONGELADOR_LLENO : HORAS_CONGELADOR_MEDIAS;
}
/**
 * Días, contados desde ahora, que le quedan a un producto antes de que no se
 * pueda comer: lo que antes llegue, el final del día de caducidad o que se
 * caliente la nevera o el congelador. `horasSinLuz` son las que ya han pasado
 * desde el apagón.
 */
export function limiteDias(p, esc, hoy, horasSinLuz = 0) {
    const porFecha = p.caducidad ? diasHasta(p.caducidad, hoy) + 1 : Infinity;
    const frio = horasFrio(conservacionDe(p), esc);
    const porFrio = frio === Infinity ? Infinity : Math.max(0, frio - horasSinLuz) / 24;
    return Math.min(porFecha, porFrio);
}
const RANGO_CONSERVACION = { nevera: 0, congelador: 1, ambiente: 2 };
/**
 * Orden en que conviene comer: primero lo que antes deja de poderse comer y,
 * a igualdad, nevera → congelador → despensa. Sin luz eso da justo la regla
 * de las guías: nevera, después congelador y al final las latas.
 */
export function ordenarParaComer(productos, esc, hoy, horasSinLuz = 0) {
    return [...productos].sort((a, b) => {
        const la = limiteDias(a, esc, hoy, horasSinLuz);
        const lb = limiteDias(b, esc, hoy, horasSinLuz);
        if (la !== lb)
            return la - lb;
        return RANGO_CONSERVACION[conservacionDe(a)] - RANGO_CONSERVACION[conservacionDe(b)];
    });
}
/**
 * Simula comer `kcalDia` cada día, en el orden de `ordenarParaComer`. Lo que
 * caduca (o se calienta) antes de que dé tiempo a comerlo no cuenta: sumar
 * todas las calorías daría más días de los reales. Comer siempre primero lo
 * que antes se estropea es lo que menos desperdicia.
 */
export function simularConsumo(productos, kcalDia, esc, hoy, horasSinLuz = 0) {
    const total = productos.reduce((s, p) => s + p.cantidad * (p.kcalPorUnidad ?? 0), 0);
    if (kcalDia <= 0)
        return { dias: 0, kcalUtiles: total, perdidos: [] };
    let t = 0; // días ya comidos
    let utiles = 0;
    const perdidos = [];
    for (const p of ordenarParaComer(productos, esc, hoy, horasSinLuz)) {
        const kcal = p.cantidad * (p.kcalPorUnidad ?? 0);
        if (kcal <= 0)
            continue;
        const limite = limiteDias(p, esc, hoy, horasSinLuz);
        const cabe = limite === Infinity ? kcal : Math.max(0, (limite - t) * kcalDia);
        const como = Math.min(kcal, cabe);
        t += como / kcalDia;
        utiles += como;
        if (kcal - como > 0.5)
            perdidos.push({ id: p.id, nombre: p.nombre, kcal: kcal - como });
    }
    return { dias: t, kcalUtiles: utiles, perdidos };
}
function cuenta(p, esc, hoy) {
    if (p.cantidad <= 0)
        return false;
    if (estadoCaducidad(p, hoy) === 'caducado')
        return false;
    if (esc.sinCocina && p.necesitaCocinar)
        return false;
    return true;
}
export function calcular(personas, mascotas, productos, modo, esc = {}, hoy = new Date(), manual = {}, horasSinLuz = 0) {
    const kcalDia = personas.reduce((s, p) => s + kcalPersona(p, modo, manual, esc), 0);
    const desglose = personas.map((p) => aguaDesglose(p, modo, esc, manual));
    const litrosBeberDia = desglose.reduce((s, d) => s + d.beber, 0) +
        mascotas.reduce((s, m) => s + racionMascota(m, modo, manual).litros, 0);
    const litrosHigieneDia = desglose.reduce((s, d) => s + d.higiene, 0);
    const litrosDia = litrosBeberDia + litrosHigieneDia;
    const kcalMascotasDia = mascotas.reduce((s, m) => s + racionMascota(m, modo, manual).kcal, 0);
    const utiles = productos.filter((p) => cuenta(p, esc, hoy));
    const comida = simularConsumo(utiles.filter((p) => p.categoria === 'comida'), kcalDia, esc, hoy, horasSinLuz);
    const pienso = simularConsumo(utiles.filter((p) => p.categoria === 'mascota'), kcalMascotasDia, esc, hoy, horasSinLuz);
    const kcalTotal = comida.kcalUtiles;
    const litrosTotal = utiles
        .filter((p) => p.categoria === 'agua')
        .reduce((s, p) => s + p.cantidad * (p.litrosPorUnidad ?? 0), 0);
    const litrosCocinar = utiles
        .filter((p) => p.categoria === 'comida' && p.necesitaCocinar)
        .reduce((s, p) => s + p.cantidad * (p.aguaCocinarPorUnidadL ?? 0), 0);
    const diasComida = comida.dias;
    const diasAgua = litrosDia > 0 ? Math.max(0, litrosTotal - litrosCocinar) / litrosDia : 0;
    const minimo = Math.min(diasComida, diasAgua);
    let limita = 'nada';
    if (personas.length > 0)
        limita = diasAgua <= diasComida ? 'agua' : 'comida';
    return {
        dias: personas.length > 0 ? Math.floor(minimo) : 0,
        diasComida,
        diasAgua,
        limita,
        kcalDia,
        litrosDia,
        litrosBeberDia,
        litrosHigieneDia,
        kcalTotal,
        perdidos: [...comida.perdidos, ...pienso.perdidos],
        litrosTotal,
        litrosCocinar,
        mascotas: mascotas.length > 0
            ? { diasComida: pienso.dias, kcalDia: kcalMascotasDia }
            : null,
        hayBebe: personas.some((p) => p.edadAnios < 1),
        caducados: productos.filter((p) => estadoCaducidad(p, hoy) === 'caducado').map((p) => p.nombre),
        sinPersonas: personas.length === 0,
    };
}
/** Lo que falta para llegar al objetivo en modo normal, sin escenario salvo la actividad. */
export function calcularFaltante(personas, mascotas, productos, objetivoDias, hoy = new Date(), actividad = ACTIVIDAD_POR_DEFECTO) {
    const r = calcular(personas, mascotas, productos, 'normal', { actividad }, hoy);
    const faltanLitros = Math.max(0, objetivoDias * r.litrosDia + r.litrosCocinar - r.litrosTotal);
    const faltanKcal = Math.max(0, objetivoDias * r.kcalDia - r.kcalTotal);
    const kcalMascotasTotal = r.mascotas ? r.mascotas.diasComida * r.mascotas.kcalDia : 0;
    const faltanKcalMascotas = r.mascotas
        ? Math.max(0, objetivoDias * r.mascotas.kcalDia - kcalMascotasTotal)
        : 0;
    return {
        objetivoDias,
        faltanLitros,
        faltanKcal,
        faltanKcalMascotas,
        cumplido: faltanLitros === 0 && faltanKcal === 0 && faltanKcalMascotas === 0,
    };
}
/**
 * Qué comer hoy para cubrir `kcalObjetivo`. Primero va lo que antes se
 * estropea (sin luz: nevera, congelador y después despensa) y lo que no tiene
 * fecha va al final. Lo que ya se ha calentado no se propone. Las unidades se redondean hacia arriba en
 * cuartos (¼ de bolsa de arroz, por ejemplo), así que el total puede pasarse
 * un poco del objetivo.
 */
export function planDelDia(productos, kcalObjetivo, esc = {}, hoy = new Date(), horasSinLuz = 0) {
    const candidatos = ordenarParaComer(productos.filter((p) => p.categoria === 'comida' &&
        (p.kcalPorUnidad ?? 0) > 0 &&
        cuenta(p, esc, hoy) &&
        limiteDias(p, esc, hoy, horasSinLuz) > 0), esc, hoy, horasSinLuz);
    const plan = [];
    let falta = kcalObjetivo;
    for (const p of candidatos) {
        if (falta <= 0)
            break;
        const kcalU = p.kcalPorUnidad ?? 0;
        const unidades = Math.min(p.cantidad, Math.ceil((falta / kcalU) * 4) / 4);
        if (unidades <= 0)
            continue;
        plan.push({ productoId: p.id, nombre: p.nombre, unidades, kcal: unidades * kcalU });
        falta -= unidades * kcalU;
    }
    return plan;
}
// ------------------------------------------------------------ Agua bebida
const cuatroDecimales = (n) => Math.round(n * 10_000) / 10_000;
/** Agua que se puede beber, en el orden en que se gasta: primero la que caduca antes. */
function aguaPorOrden(productos, hoy) {
    return productos
        .filter((p) => p.categoria === 'agua' && (p.litrosPorUnidad ?? 0) > 0 && estadoCaducidad(p, hoy) !== 'caducado')
        .sort((a, b) => (a.caducidad ?? '9999-12-31').localeCompare(b.caducidad ?? '9999-12-31'));
}
/**
 * Descuenta `litros` del agua guardada, empezando por la que caduca antes. Si
 * no hay bastante, se queda a cero: el resto se habrá bebido de otro sitio.
 */
export function descontarAgua(productos, litros, hoy = new Date()) {
    let falta = litros;
    const cantidades = new Map();
    for (const p of aguaPorOrden(productos, hoy)) {
        if (falta <= 1e-9)
            break;
        const porUnidad = p.litrosPorUnidad ?? 0;
        const tomo = Math.min(p.cantidad * porUnidad, falta);
        if (tomo <= 0)
            continue;
        cantidades.set(p.id, cuatroDecimales(p.cantidad - tomo / porUnidad));
        falta -= tomo;
    }
    return productos.map((p) => (cantidades.has(p.id) ? { ...p, cantidad: cantidades.get(p.id) ?? p.cantidad } : p));
}
/**
 * Devuelve `litros` a la reserva (para corregir un error al apuntar). Van al
 * envase que se estaba gastando: el primero, por caducidad, al que le queda algo.
 */
export function devolverAgua(productos, litros, hoy = new Date()) {
    const orden = aguaPorOrden(productos, hoy);
    const destino = orden.find((p) => p.cantidad > 0) ?? orden[0];
    if (!destino)
        return productos;
    const porUnidad = destino.litrosPorUnidad ?? 1;
    return productos.map((p) => p.id === destino.id ? { ...p, cantidad: cuatroDecimales(p.cantidad + litros / porUnidad) } : p);
}
// ------------------------------------------------------------------ Formato
// Separadores de miles y decimales. En inglés van al revés: 31,000 y 3.5. Lo
// fija src/lib/i18n.ts.
let separadores = { miles: '.', decimal: ',' };
export function fijarFormatoNumero(idioma) {
    separadores = idioma === 'en' ? { miles: ',', decimal: '.' } : { miles: '.', decimal: ',' };
}
export const separadorDecimal = () => separadores.decimal;
/** 31000 → "31.000"; 3.45 con 1 decimal → "3,5". */
export function formatoNumero(n, decimales = 0) {
    const fijo = n.toFixed(decimales);
    const [entera, frac] = fijo.split('.');
    const conPuntos = entera.replace(/\B(?=(\d{3})+(?!\d))/g, separadores.miles);
    return frac ? `${conPuntos}${separadores.decimal}${frac}` : conPuntos;
}
// ------------------------------------------------------------------ Gastar escaneando
/**
 * El mismo código de barras puede leerse con ceros delante o sin ellos: un
 * UPC-A de 12 cifras es el EAN-13 con un 0 delante, y cada lector lo da a su
 * manera. Se comparan sin los ceros iniciales.
 */
const sinCerosDelante = (codigo) => codigo.trim().replace(/^0+/, '');
/**
 * Los productos de la despensa con ese código de barras y algo que gastar,
 * primero el que antes caduca (es el que hay que gastar antes). Puede haber
 * varios: el mismo arroz comprado en dos tandas con distinta caducidad.
 */
export function productosConCodigo(productos, codigo) {
    const buscado = sinCerosDelante(codigo);
    if (!buscado)
        return [];
    return productos
        .filter((p) => p.codigo && sinCerosDelante(p.codigo) === buscado && p.cantidad > 0)
        .sort((a, b) => (a.caducidad ?? '9999').localeCompare(b.caducidad ?? '9999'));
}
