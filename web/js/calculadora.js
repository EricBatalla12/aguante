// Calculadora de la web: el mismo cálculo que la app (js/lib/calculo.js se
// compila de src/lib/calculo.ts con `npm run sitio`), en modo normal.

import { calcular, calcularFaltante, formatoNumero } from './lib/calculo.js';
import { GENERICOS } from './constants/genericos.js';

const kcal100 = (fdc) => GENERICOS.find((g) => g.fdc === fdc).kcal100g;
const GARBANZOS = kcal100(173800); // cocidos, escurridos
const ATUN = kcal100(173708); // en aceite, escurrido
const ARROZ = kcal100(169756); // crudo

const $ = (id) => document.getElementById(id);
const caja = $('personas');
const cajaMascotas = $('mascotas');
let siguiente = 0;

function filaMascota() {
  const n = siguiente++;
  const fila = document.createElement('div');
  fila.className = 'fila mascota';
  fila.innerHTML = `
    <div><label for="especie${n}">Mascota</label>
      <select id="especie${n}" data-campo="especie"><option value="perro">Perro</option><option value="gato">Gato</option></select></div>
    <div><label for="pesoM${n}">Peso</label><input id="pesoM${n}" data-campo="peso" type="number" min="1" max="100" inputmode="decimal" placeholder="kg"></div>
    <div></div>
    <button type="button" aria-label="Quitar esta mascota">×</button>`;
  fila.querySelector('button').addEventListener('click', () => {
    fila.remove();
    calcularYPintar();
  });
  cajaMascotas.appendChild(fila);
}

function filaPersona(sexo = 'mujer', edad = '', peso = '') {
  const n = siguiente++;
  const fila = document.createElement('div');
  fila.className = 'fila';
  fila.innerHTML = `
    <div><label for="sexo${n}">Sexo</label>
      <select id="sexo${n}" data-campo="sexo"><option value="mujer">Mujer</option><option value="hombre">Hombre</option></select></div>
    <div><label for="edad${n}">Edad</label><input id="edad${n}" data-campo="edad" type="number" min="1" max="110" inputmode="numeric" placeholder="años"></div>
    <div><label for="peso${n}">Peso</label><input id="peso${n}" data-campo="peso" type="number" min="5" max="250" inputmode="decimal" placeholder="kg"></div>
    <button type="button" aria-label="Quitar esta persona">×</button>`;
  fila.querySelector('[data-campo="sexo"]').value = sexo;
  fila.querySelector('[data-campo="edad"]').value = edad;
  fila.querySelector('[data-campo="peso"]').value = peso;
  fila.querySelector('button').addEventListener('click', () => {
    fila.remove();
    calcularYPintar();
  });
  caja.appendChild(fila);
}

const num = (id) => {
  const v = Number(String($(id).value).replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

function leer() {
  const mascotas = [...cajaMascotas.querySelectorAll('.fila')]
    .map((f, i) => ({
      id: `m${i}`,
      nombre: `Mascota ${i + 1}`,
      especie: f.querySelector('[data-campo="especie"]').value,
      pesoKg: Number(String(f.querySelector('[data-campo="peso"]').value).replace(',', '.')),
    }))
    .filter((m) => m.pesoKg > 0);
  const personas = [...caja.querySelectorAll('.fila')]
    .map((f, i) => ({
      id: `p${i}`,
      nombre: `Persona ${i + 1}`,
      sexo: f.querySelector('[data-campo="sexo"]').value,
      edadAnios: Number(f.querySelector('[data-campo="edad"]').value),
      pesoKg: Number(String(f.querySelector('[data-campo="peso"]').value).replace(',', '.')),
    }))
    // La app no calcula la comida de bebés de menos de 1 año: aquí se piden de 1 año en adelante
    .filter((p) => p.edadAnios >= 1 && p.pesoKg > 0);
  const productos = [
    { id: 'agua', nombre: 'Agua', categoria: 'agua', cantidad: 1, litrosPorUnidad: num('agua') },
    { id: 'botes', nombre: 'Legumbre', categoria: 'comida', cantidad: num('botes'), kcalPorUnidad: (400 * GARBANZOS) / 100 },
    { id: 'latas', nombre: 'Pescado', categoria: 'comida', cantidad: num('latas'), kcalPorUnidad: (80 * ATUN) / 100 },
    { id: 'secos', nombre: 'Arroz y pasta', categoria: 'comida', cantidad: num('secos'), kcalPorUnidad: (1000 * ARROZ) / 100 },
    { id: 'otras', nombre: 'Otra comida', categoria: 'comida', cantidad: 1, kcalPorUnidad: num('otras') },
  ].filter((p) => p.cantidad > 0 && (p.litrosPorUnidad ?? 0) + (p.kcalPorUnidad ?? 0) > 0);
  return { personas, mascotas, productos };
}

const dias = (n) => `${formatoNumero(Math.floor(n * 10) / 10, 1)} días`;

function calcularYPintar() {
  const { personas, mascotas, productos } = leer();
  const salida = $('resultado');
  if (personas.length === 0) {
    salida.innerHTML = '<p class="nota">Pon la edad y el peso de quien vive en casa para ver el resultado.</p>';
    return;
  }
  const r = calcular(personas, mascotas, productos, 'normal');
  const f = calcularFaltante(personas, mascotas, productos, 3);
  const limita = r.limita === 'agua' ? 'Os limita el agua' : r.limita === 'comida' ? 'Os limita la comida' : '';
  const ancho = (d) => `${Math.min(100, (d / 7) * 100)}%`;
  const falta72 = [];
  if (f.faltanLitros > 0) falta72.push(`${Math.ceil(f.faltanLitros / 5)} garrafas de agua de 5 L`);
  if (f.faltanKcal > 0) falta72.push(`unas ${formatoNumero(Math.ceil(f.faltanKcal / 100) * 100)} kcal de comida`);
  salida.innerHTML = `
    <div class="heroe">
      <p class="lema">Con lo que tenéis, aguantáis</p>
      <span class="numero">${r.dias}</span><span class="unidad">${r.dias === 1 ? 'día' : 'días'}</span>
      <div class="barras">
        <div>Agua: ${dias(r.diasAgua)}<div class="pista"><span style="width:${ancho(r.diasAgua)};background:#8db8ee"></span></div></div>
        <div>Comida: ${dias(r.diasComida)}<div class="pista"><span style="width:${ancho(r.diasComida)};background:#f2a56f"></span></div></div>
      </div>
      <p class="lema">${limita}${limita ? ' · ' : ''}las barras llegan a una semana</p>
    </div>
    <p>${falta72.length ? `Para llegar a 72 horas os falta: ${falta72.join(' y ')}.` : 'Llegáis a 72 horas.'}
    Cada día la casa necesita ${formatoNumero(r.litrosDia, 1)} L de agua y ${formatoNumero(r.kcalDia)} kcal.
    ${r.mascotas ? `Las mascotas comen además unas ${formatoNumero(r.mascotas.kcalDia)} kcal al día de lo suyo, que aquí no se cuenta.` : ''}</p>`;
}

$('otra').addEventListener('click', () => {
  filaPersona();
  calcularYPintar();
});
$('otraMascota').addEventListener('click', () => {
  filaMascota();
  calcularYPintar();
});
$('calculadora').addEventListener('input', calcularYPintar);
filaPersona();
calcularYPintar();
