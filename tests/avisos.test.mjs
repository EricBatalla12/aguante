// Tests de la lectura de avisos oficiales (src/lib/avisos.ts). Las muestras
// copian el formato de los RSS reales de AEMET, IGN y GDACS (18/11/2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  avisoDestacado,
  gravesSinAvisar,
  avisosDeProvincia,
  leerAemet,
  leerGdacs,
  leerIgn,
  matriculaDe,
  momentoAemet,
  provinciaPorIne,
  PROVINCIAS,
  COMUNIDADES,
  terremotosDestacados,
  actualidad,
  fechaRss,
  juntarDesastres,
  juntarMeteo,
  juntarNoticias,
  juntarTerremotos,
  latin9,
  leerNoticiasAemet,
  fechaSinHora,
  juntarActivaciones,
  leerAemps,
  leerAesan,
  leerCopernicus,
} from '../src/lib/avisos.ts';

const item = (titulo, descripcion, fichero) => `
    <item>
      <title>${titulo}</title>
      <description>${descripcion}</description>
      <link>https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/cap/${fichero}</link>
      <guid>${fichero}</guid>
      <pubDate>2026-11-18T09:57:52+00:00</pubDate>
    </item>`;

const AEMET = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
  <title>AEMET - Avisos de fenómenos meteorológicos adversos - Comunitat Valenciana</title>
  ${item('Estado completo de avisos para Comunitat Valenciana', 'Fichero tar.gz que contiene todos los avisos para Comunitat Valenciana de 11:41 18-11-2026 CET (UTC+1) a 23:59 20-11-2026 CET (UTC+1).', 'Z_CAP_C_LEMM_20261118104101_AFAC77.tar.gz')}
  ${item('Aviso. Nivel amarillo. Vientos. Interior norte de Valencia', 'Aviso de rachas máximas de nivel amarillo de 20:00 18-11-2026 CET (UTC+1) a 05:59 19-11-2026 CET (UTC+1).', 'Z_CAP_C_LEMM_20261118095752_AFAZ774601VIRM1905.xml')}
  ${item('Aviso. Nivel naranja. Lluvias. Litoral sur de Valencia', 'Aviso de precipitación acumulada en una hora de nivel naranja de 06:00 19-11-2026 CET (UTC+1) a 14:59 19-11-2026 CET (UTC+1).', 'Z_CAP_C_LEMM_20261118095752_AFAZ774604PR1H1911.xml')}
  ${item('Aviso. Nivel rojo. Lluvias. Litoral norte de Alicante', 'Aviso de precipitación acumulada en una hora de nivel rojo de 06:00 19-11-2026 CET (UTC+1) a 11:59 19-11-2026 CET (UTC+1).', 'Z_CAP_C_LEMM_20261118095752_AFAZ770303PR1H1911.xml')}
  ${item('Aviso. Nivel amarillo. Vientos. Interior de Alicante', 'Aviso de rachas máximas de nivel amarillo de 06:00 16-11-2026 CET (UTC+1) a 11:59 16-11-2026 CET (UTC+1).', 'Z_CAP_C_LEMM_20261116095752_AFAZ770302VIRM1911.xml')}
</channel></rss>`;

const AHORA = Date.UTC(2026, 10, 18, 12, 0); // 18/11/2026 13:00 en la península

test('AEMET: la hora lleva su zona horaria', () => {
  assert.equal(momentoAemet('20:00 18-11-2026 CET (UTC+1)'), Date.UTC(2026, 10, 18, 19, 0));
  assert.equal(momentoAemet('20:00 18-07-2026 CEST (UTC+2)'), Date.UTC(2026, 6, 18, 18, 0));
  assert.equal(momentoAemet('20:00 18-11-2026 WET (UTC)'), Date.UTC(2026, 10, 18, 20, 0));
  assert.equal(momentoAemet('sin fecha'), null);
});

test('AEMET: lee los avisos y se salta el «estado completo»', () => {
  const avisos = leerAemet(AEMET);
  assert.equal(avisos.length, 4);
  assert.deepEqual(
    { nivel: avisos[0].nivel, fenomeno: avisos[0].fenomeno, zona: avisos[0].zona, codigoZona: avisos[0].codigoZona },
    { nivel: 'amarillo', fenomeno: 'Vientos', zona: 'Interior norte de Valencia', codigoZona: '774601' },
  );
  assert.equal(avisos[0].inicio, Date.UTC(2026, 10, 18, 19, 0));
  assert.equal(avisos[0].fin, Date.UTC(2026, 10, 19, 4, 59));
});

test('AEMET: filtra por provincia y quita los que ya han pasado', () => {
  const avisos = leerAemet(AEMET);
  const valencia = avisosDeProvincia(avisos, provinciaPorIne('46'), AHORA);
  assert.deepEqual(valencia.map((a) => a.zona), ['Interior norte de Valencia', 'Litoral sur de Valencia']);
  // El de Interior de Alicante terminó el 16: no sale
  const alicante = avisosDeProvincia(avisos, provinciaPorIne('03'), AHORA);
  assert.deepEqual(alicante.map((a) => a.nivel), ['rojo']);
});

test('AEMET: en Baleares y Canarias se enseña toda la comunidad (las zonas van por islas)', () => {
  const xml = `<rss><channel>${item('Aviso. Nivel amarillo. Costeros. Menorca', 'Aviso de costeros de nivel amarillo de 06:00 19-11-2026 CET (UTC+1) a 11:59 19-11-2026 CET (UTC+1).', 'Z_CAP_C_LEMM_20261118095752_AFAZ645401COCO1911.xml')}</channel></rss>`;
  assert.equal(avisosDeProvincia(leerAemet(xml), provinciaPorIne('07'), AHORA).length, 1);
});

test('AEMET: con la app cerrada se avisa de los naranjas y rojos nuevos de la provincia, una sola vez', () => {
  const avisos = leerAemet(AEMET);
  const valencia = provinciaPorIne('46');
  const graves = gravesSinAvisar(avisos, valencia, AHORA, []);
  assert.ok(graves.length > 0);
  assert.ok(graves.every((a) => a.nivel !== 'amarillo' && a.codigoZona.slice(2, 4) === '46'));
  // Los ya avisados no se repiten
  assert.deepEqual(gravesSinAvisar(avisos, valencia, AHORA, graves.map((a) => a.id)), []);
  // Uno dentro de tres días aún no
  assert.deepEqual(gravesSinAvisar(avisos, valencia, AHORA - 3 * 86_400_000, []), []);
});

test('AEMET: destaca el más grave de las próximas 48 horas, nunca uno amarillo', () => {
  const avisos = leerAemet(AEMET);
  assert.equal(avisoDestacado(avisos, AHORA).nivel, 'rojo');
  assert.equal(avisoDestacado(avisosDeProvincia(avisos, provinciaPorIne('46'), AHORA), AHORA).nivel, 'naranja');
  const soloAmarillos = avisos.filter((a) => a.nivel === 'amarillo');
  assert.equal(avisoDestacado(soloAmarillos, AHORA), null);
  // Uno naranja dentro de tres días todavía no se destaca
  assert.equal(avisoDestacado(avisos, AHORA - 3 * 86_400_000), null);
});

test('provincias: las 52, cada una en una comunidad de AEMET que existe', () => {
  assert.equal(PROVINCIAS.length, 52);
  assert.equal(new Set(PROVINCIAS.map((p) => p.ine)).size, 52);
  for (const p of PROVINCIAS) assert.ok(COMUNIDADES[p.ccaa], p.nombre);
});

const IGN = `<rss><channel><title>GeoRSS Sismología IGN</title>
    <item>
      <title>-Info.terremoto: 18/11/2026 10:29:23</title>
      <link>http://www.ign.es/web/ign/portal/sis-catalogo-terremotos/-/catalogo-terremotos/detailTerremoto?evid=es2026wpkno</link>
      <description>Se ha producido un terremoto de magnitud 3.1 en E TABOADA.LU en la fecha 18/11/2026 10:29:23 en la siguiente localización: 42.6841,-7.6407</description>
      <guid>http://www.ign.es/x?evid=es2026wpkno</guid>
    </item>
    <item>
      <title>-Info.terremoto: 18/11/2026 04:49:12</title>
      <link>http://www.ign.es/x?evid=es2026wozht</link>
      <description>Se ha producido un terremoto de magnitud 4.5 en NE TEGGOUR.MAC en la fecha 18/11/2026 04:49:12 en la siguiente localización: 35.1,-3.9</description>
      <guid>http://www.ign.es/x?evid=es2026wozht</guid>
    </item>
    <item>
      <title>-Info.terremoto: 17/11/2026 22:01:00</title>
      <link>http://www.ign.es/x?evid=es2026a</link>
      <description>Se ha producido un terremoto de magnitud 4.2 en GOLFO DE CÁDIZ en la fecha 17/11/2026 22:01:00 en la siguiente localización: 36.5,-7.5</description>
      <guid>http://www.ign.es/x?evid=es2026a</guid>
    </item>
    <item>
      <title>-Info.terremoto: 16/11/2026 08:00:00</title>
      <link>http://www.ign.es/x?evid=es2026b</link>
      <description>Se ha producido un terremoto de magnitud 4.1 en SW LORCA.MU en la fecha 16/11/2026 08:00:00 en la siguiente localización: 37.6,-1.7</description>
      <guid>http://www.ign.es/x?evid=es2026b</guid>
    </item>
</channel></rss>`;

test('IGN: lee magnitud, lugar y hora (UTC)', () => {
  const ts = leerIgn(IGN);
  assert.equal(ts.length, 4);
  assert.deepEqual([ts[0].magnitud, ts[0].lugar, ts[0].fecha], [3.1, 'E TABOADA.LU', Date.UTC(2026, 10, 18, 10, 29, 23)]);
  assert.equal(matriculaDe('E TABOADA.LU'), 'LU');
  assert.equal(matriculaDe('NE TEGGOUR.MAC'), null);
  assert.equal(matriculaDe('GOLFO DE CÁDIZ'), null);
});

test('IGN: en tu provincia desde 3,0; en el resto de España desde 4,0; fuera de España, no', () => {
  const ts = leerIgn(IGN);
  assert.deepEqual(terremotosDestacados(ts, provinciaPorIne('27')).map((t) => t.lugar), ['E TABOADA.LU', 'SW LORCA.MU']);
  assert.deepEqual(terremotosDestacados(ts, provinciaPorIne('46')).map((t) => t.lugar), ['SW LORCA.MU']);
  assert.deepEqual(terremotosDestacados(ts, undefined).map((t) => t.lugar), ['SW LORCA.MU']);
});

const GDACS = `<rss><channel>
    <item><title>Green earthquake in Peru</title><link>http://www.gdacs.org/report.aspx?eventtype=EQ&amp;eventid=1</link><guid>EQ1</guid>
      <gdacs:iscurrent>true</gdacs:iscurrent><gdacs:fromdate>Wed, 18 Nov 2026 06:07:42 GMT</gdacs:fromdate><gdacs:todate>Wed, 18 Nov 2026 06:07:42 GMT</gdacs:todate>
      <gdacs:eventtype>EQ</gdacs:eventtype><gdacs:alertlevel>Green</gdacs:alertlevel><gdacs:iso3>PER</gdacs:iso3><gdacs:country>Peru</gdacs:country></item>
    <item><title>Orange notification for tropical cyclone</title><link>http://www.gdacs.org/report.aspx?eventtype=TC&amp;eventid=2</link><guid>TC2</guid>
      <gdacs:iscurrent>true</gdacs:iscurrent><gdacs:fromdate>Mon, 16 Nov 2026 18:00:00 GMT</gdacs:fromdate><gdacs:todate>Wed, 18 Nov 2026 06:00:00 GMT</gdacs:todate>
      <gdacs:eventtype>TC</gdacs:eventtype><gdacs:alertlevel>Orange</gdacs:alertlevel><gdacs:iso3>IND</gdacs:iso3><gdacs:country>India</gdacs:country></item>
    <item><title>Red flood in Spain</title><link>http://www.gdacs.org/report.aspx?eventtype=FL&amp;eventid=3</link><guid>FL3</guid>
      <gdacs:iscurrent>true</gdacs:iscurrent><gdacs:fromdate>Mon, 16 Nov 2026 00:00:00 GMT</gdacs:fromdate><gdacs:todate>Tue, 17 Nov 2026 00:00:00 GMT</gdacs:todate>
      <gdacs:eventtype>FL</gdacs:eventtype><gdacs:alertlevel>Red</gdacs:alertlevel><gdacs:iso3>ESP</gdacs:iso3><gdacs:country>Spain</gdacs:country></item>
    <item><title>Drought is on going</title><link>http://www.gdacs.org/report.aspx?eventtype=DR&amp;eventid=4</link><guid>DR4</guid>
      <gdacs:iscurrent>false</gdacs:iscurrent><gdacs:fromdate>Sun, 21 Dec 2025 00:00:00 GMT</gdacs:fromdate><gdacs:todate>Mon, 16 Nov 2026 00:00:00 GMT</gdacs:todate>
      <gdacs:eventtype>DR</gdacs:eventtype><gdacs:alertlevel>Orange</gdacs:alertlevel><gdacs:iso3>ALB</gdacs:iso3><gdacs:country>Albania, Spain</gdacs:country></item>
</channel></rss>`;

test('GDACS: solo naranjas y rojos abiertos, primero los rojos, y marca España', () => {
  const ds = leerGdacs(GDACS);
  assert.deepEqual(ds.map((d) => [d.tipo, d.nivel, d.enEspana]), [['FL', 'Red', true], ['TC', 'Orange', false]]);
  assert.ok(ds[0].url.startsWith('https://'), 'enlace por https');
  assert.ok(ds[0].url.includes('eventtype=FL&eventid=3'), 'entidades del XML decodificadas');
});

// ------------------------------------------------- Noticias e historial

test('noticias de AEMET: ISO-8859-15 bien leído y fecha con el mes en español', () => {
  // «Ã±» no: los bytes son los de Latin-9, una letra por byte; 0xA4 es el euro
  const bytes = Uint8Array.from([0x45, 0x73, 0x70, 0x61, 0xf1, 0x61, 0x20, 0xa4]);
  assert.equal(latin9(bytes), 'España €');
  assert.equal(fechaRss('mar, 10 nov 2026 00:00 +0000'), Date.UTC(2026, 10, 10));
  assert.equal(fechaRss('mié, 11 nov 2026 08:46 +0100'), Date.UTC(2026, 10, 11, 7, 46));
  assert.equal(fechaRss('Wed, 11 Nov 2026 08:46 +0000'), Date.UTC(2026, 10, 11, 8, 46), 'nov vale en los dos idiomas');
  assert.equal(fechaRss('basura'), null);
  const xml = `<rss><channel><title>Noticias</title>
    <item><title>Octubre de 2026 fue muy cálido y muy seco</title><link>https://www.aemet.es/es/noticias/2026/11/resumen_octubre2026</link><description>Su temperatura media, de 16,1 º C…</description><pubDate>mar, 10 nov 2026 00:00 +0000</pubDate><guid>https://www.aemet.es/es/noticias/2026/11/resumen_octubre2026</guid></item>
    <item><title>Sin fecha</title><link>https://www.aemet.es/x</link></item>
  </channel></rss>`;
  const ns = leerNoticiasAemet(xml);
  assert.equal(ns.length, 1);
  assert.equal(ns[0].titulo, 'Octubre de 2026 fue muy cálido y muy seco');
  assert.equal(ns[0].fecha, Date.UTC(2026, 10, 10));
});

test('historial de AEMET: guarda lo ya acabado de tu provincia, no lo retirado', () => {
  const valencia = provinciaPorIne('46');
  const viejos = leerAemet(AEMET);
  // En la descarga nueva ya no viene nada: AEMET quita los avisos al acabar
  const juntos = juntarMeteo(viejos, [], valencia, AHORA);
  // El de Alicante del 16/11 ya acabó pero es de otra provincia; los de Valencia no han acabado: retirados
  assert.equal(juntos.length, 0);
  const despues = Date.UTC(2026, 10, 20, 12);
  const pasados = juntarMeteo(viejos, [], valencia, despues);
  assert.deepEqual(pasados.map((a) => a.zona).sort(), ['Interior norte de Valencia', 'Litoral sur de Valencia']);
  // Si vuelve a venir el mismo aviso (con otro guid), no se duplica
  const otraVez = viejos.filter((a) => a.zona === 'Litoral sur de Valencia').map((a) => ({ ...a, id: 'otro-guid' }));
  assert.equal(juntarMeteo(pasados, otraVez, valencia, despues).length, 2);
  // A los 30 días se olvida
  assert.equal(juntarMeteo(pasados, [], valencia, despues + 31 * 86_400_000).length, 0);
});

test('historial de terremotos, desastres y noticias: se juntan sin duplicar y se olvidan al mes', () => {
  const ts = leerIgn(IGN);
  const juntos = juntarTerremotos(ts.slice(0, 2), ts, AHORA);
  // Fuera de España (Marruecos, golfo sin matrícula) no se guarda; los dos de aquí, una vez cada uno
  assert.deepEqual(juntos.map((t) => t.lugar).sort(), ['E TABOADA.LU', 'SW LORCA.MU']);
  assert.equal(juntarTerremotos(juntos, [], AHORA + 31 * 86_400_000).length, 0);

  const ds = leerGdacs(GDACS);
  const sinCiclon = juntarDesastres(ds, ds.filter((d) => d.tipo !== 'TC'), AHORA);
  assert.deepEqual(sinCiclon.map((d) => [d.tipo, !!d.cerrado]), [['FL', false], ['TC', true]]);

  const n = { id: 'a', titulo: 'x', resumen: '', fecha: AHORA - 86_400_000, url: 'https://www.aemet.es/' };
  assert.equal(juntarNoticias([n], [n], AHORA).length, 1);
  // Las diez últimas se guardan aunque tengan más de un mes; de ahí para atrás, solo las del mes
  const muchas = Array.from({ length: 14 }, (_, i) => ({ ...n, id: `n${i}`, fecha: AHORA - (i + 1) * 5 * 86_400_000 }));
  assert.deepEqual(juntarNoticias(muchas, [], AHORA).map((x) => x.id), muchas.slice(0, 10).map((x) => x.id));
  const pocas = muchas.slice(0, 3);
  assert.equal(juntarNoticias(pocas, [], AHORA + 365 * 86_400_000).length, 3);
});

test('actualidad: lo más reciente primero y filtros por provincia, España y mundo', () => {
  const lugo = provinciaPorIne('27');
  const despues = Date.UTC(2026, 10, 20, 12);
  const d = {
    meteo: [],
    terremotos: leerIgn(IGN),
    desastres: leerGdacs(GDACS),
    noticias: [{ id: 'n1', titulo: 'Noticia', resumen: '', fecha: Date.UTC(2026, 10, 17, 9), url: 'https://www.aemet.es/' }],
  };
  const todo = actualidad(d, lugo, despues);
  assert.deepEqual(todo.map((e) => e.tipo), ['terremoto', 'noticia', 'desastre', 'terremoto', 'desastre']);
  assert.ok(todo.every((e, i) => i === 0 || todo[i - 1].fecha >= e.fecha), 'por fecha');
  assert.deepEqual(actualidad(d, lugo, despues, 'provincia').map((e) => e.id), [`t:${d.terremotos[0].id}`]);
  // España incluye tu provincia, la noticia, el terremoto de Lorca y la inundación en España
  assert.deepEqual(actualidad(d, lugo, despues, 'espana').map((e) => e.tipo), ['terremoto', 'noticia', 'terremoto', 'desastre']);
  assert.deepEqual(actualidad(d, lugo, despues, 'mundo').map((e) => e.tipo), ['desastre']);

  // Los avisos de AEMET salen cuando ya han acabado (los que siguen en pie van aparte)
  const valencia = provinciaPorIne('46');
  const meteo = { ...d, meteo: leerAemet(AEMET) };
  assert.equal(actualidad(meteo, valencia, AHORA, 'provincia').filter((e) => e.tipo === 'tiempo').length, 0);
  assert.equal(actualidad(meteo, valencia, despues, 'provincia').filter((e) => e.tipo === 'tiempo').length, 2);
});

// ------------------------------------------ AESAN, AEMPS, Copernicus y tipos

// Copia del formato de https://www.aesan.gob.es/alertas/buscador-alertas (18/11/2026)
const AESAN = `<div class="aesan-section__row">
  <a class="seeMoreCard seeMoreCard--m" href="/alertas/2026_83" title="Retirada de la alerta por presencia de sulfitos (Ref. ES2026/681)<br/>">
    <div class="seeMoreCard-heading"><div class="seeMoreCard-heading__icon material-symbols-outlined" aria-hidden="true"> cookie </div>
    <span class="seeMoreCard-heading__value">13 Noviembre 2026</span></div>
    <p class="seeMoreCard__text">Retirada de la alerta por presencia de sulfitos no declarados en gamba &amp; langostino (Ref. ES2026/681)<br/></p>
    <span class="seeMoreCard__link" >Ver más</span></a>
  <a class="seeMoreCard seeMoreCard--m" href="/alertas/2026_81" title="Listeria">
    <div class="seeMoreCard-heading"><span class="seeMoreCard-heading__value">10 Noviembre 2026</span></div>
    <p class="seeMoreCard__text">Alerta por posible presencia de Listeria monocytogenes en productos lácteos</p></a>
  <a class="seeMoreCard seeMoreCard--m" href="/alertas/buscador-alertas" title="Otra cosa"><p class="seeMoreCard__text">No es una alerta</p></a>
</div>`;

test('AESAN: lee las tarjetas de alertas (fecha sin hora, texto limpio) y falla si cambia la página', () => {
  const as = leerAesan(AESAN);
  assert.equal(as.length, 2);
  assert.equal(as[0].titulo, 'Retirada de la alerta por presencia de sulfitos no declarados en gamba & langostino (Ref. ES2026/681)');
  assert.equal(as[0].url, 'https://www.aesan.gob.es/alertas/2026_83');
  assert.equal(as[0].fecha, Date.UTC(2026, 10, 13, 12));
  assert.equal(fechaSinHora('4 de marzo de 2026'), Date.UTC(2026, 2, 4, 12));
  assert.throws(() => leerAesan('<html>página nueva</html>'));
});

test('AEMPS: lee el RSS de alertas con la fecha en inglés', () => {
  const xml = `<rss><channel><item><title>ORAMORPH 2 MG/ML SOLUCION ORAL , 1 frasco de 100 ml (NR: 62039, CN: 821934)</title>
    <link>https://www.aemps.gob.es/informa/oramorph/</link><pubDate>Mon, 01 Jun 2026 09:40:34 +0000</pubDate>
    <guid isPermaLink="false">https://www.aemps.gob.es/?p=1</guid></item></channel></rss>`;
  const ms = leerAemps(xml);
  assert.equal(ms.length, 1);
  assert.equal(ms[0].fecha, Date.UTC(2026, 5, 1, 9, 40, 34));
  assert.equal(ms[0].id, 'https://www.aemps.gob.es/?p=1');
  assert.equal(fechaRss('Wed, 18 Nov 2026 06:07:42 GMT'), Date.UTC(2026, 10, 18, 6, 7, 42));
});

const COPERNICUS = {
  count: 3,
  results: [
    { code: 'EMSR936', countries: ['Ecuador'], eventTime: '2026-11-12T23:00:00', name: 'Flood in Ecuador', closed: false, gdacsId: 'FL1104167' },
    { code: 'EMSR930', countries: ['Spain'], eventTime: '2026-10-19T03:10:00', name: 'Flood in Alicante-Valencia Regions, Spain', closed: true, gdacsId: null },
    { code: 'EMSR900', countries: ['Chile'], name: 'Sin fecha' },
  ],
};

test('Copernicus: lee las activaciones (hora UTC), marca España y enlaza la ficha', () => {
  const cs = leerCopernicus(COPERNICUS);
  assert.deepEqual(cs.map((c) => [c.id, c.enEspana, c.cerrada]), [['EMSR936', false, false], ['EMSR930', true, true]]);
  assert.equal(cs[0].fecha, Date.UTC(2026, 10, 12, 23));
  assert.equal(cs[0].url, 'https://mapping.emergency.copernicus.eu/activations/EMSR936/');
  assert.throws(() => leerCopernicus({ code: 'Activation code parameter is mandatory' }));
  // Activa pocas: las diez últimas se guardan aunque tengan más de un mes
  assert.equal(juntarActivaciones(cs, [], Date.UTC(2027, 5, 1)).length, 2);
});

test('actualidad: filtro por tipo, y lo que Copernicus comparte con GDACS sale una vez', () => {
  const ahora = Date.UTC(2026, 10, 20, 12);
  const cs = leerCopernicus(COPERNICUS);
  const gdacs = [{ id: 'FL1104167', tipo: 'FL', nivel: 'Orange', paises: 'Ecuador', enEspana: false, inicio: Date.UTC(2026, 10, 12), fin: 0, url: 'https://www.gdacs.org/' }];
  const d = {
    meteo: [],
    terremotos: leerIgn(IGN),
    desastres: gdacs,
    noticias: [{ id: 'n1', titulo: 'Noticia', resumen: '', fecha: Date.UTC(2026, 10, 17, 9), url: 'https://www.aemet.es/' }],
    activaciones: cs,
    alimentos: leerAesan(AESAN),
    medicamentos: [{ id: 'm1', titulo: 'ORAMORPH', resumen: '', fecha: Date.UTC(2026, 5, 1), url: 'https://www.aemps.gob.es/' }],
  };
  const lugo = provinciaPorIne('27');
  const tipos = (t, f = 'todo') => actualidad(d, lugo, ahora, f, t).map((e) => e.tipo);
  assert.deepEqual(tipos('desastres'), ['desastre', 'copernicus'], 'el de Ecuador una vez (GDACS) y el de España de Copernicus');
  assert.deepEqual(tipos('alimentos'), ['alimento', 'alimento']);
  assert.deepEqual(tipos('medicamentos'), ['medicamento']);
  assert.deepEqual(tipos('noticias'), ['noticia']);
  assert.deepEqual(tipos('terremotos'), ['terremoto', 'terremoto']);
  // Los dos filtros a la vez: desastres solo de España
  assert.deepEqual(tipos('desastres', 'espana'), ['copernicus']);
  assert.equal(tipos('todos').length, 8);
});
