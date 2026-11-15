// Comprueba que todos los textos de la app tienen traducción al inglés.
//
// Busca en src/ los textos marcados con t('…'), tx('…'), tn(n, '…', '…') y
// las etiquetas de opciones (etiqueta: '…'), que Segmentado traduce al
// pintarlas, y mira que estén en src/i18n/en.ts con las mismas variables.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { EN } from '../src/i18n/en.ts';

const LIT = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
const PATRONES = [
  new RegExp(String.raw`\bt[x]?\(\s*(?:${LIT})`, 'g'),
  new RegExp(String.raw`\btn\([^,]+,\s*(?:${LIT}),\s*(?:${LIT})`, 'g'),
  new RegExp(String.raw`\betiqueta:\s*(?:${LIT})`, 'g'),
];

function ficheros(dir) {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n);
    if (statSync(r).isDirectory()) return n === 'i18n' ? [] : ficheros(r);
    return /\.tsx?$/.test(n) ? [r] : [];
  });
}

export function textos() {
  const todos = new Map();
  for (const f of ficheros('src')) {
    const s = readFileSync(f, 'utf8');
    for (const re of PATRONES) {
      for (const m of s.matchAll(re)) {
        for (const g of m.slice(1)) {
          if (g === undefined) continue;
          const texto = g.replace(/\\(['"\\])/g, '$1');
          // Las etiquetas sin letras («1,5 L», «3») no se traducen
          if (/\p{L}/u.test(texto)) todos.set(texto, f);
        }
      }
    }
  }
  return todos;
}

const variables = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('todos los textos tienen traducción al inglés', () => {
  const faltan = [...textos()].filter(([texto]) => !(texto in EN)).map(([texto, f]) => `${f}: ${texto}`);
  assert.deepEqual(faltan, []);
});

test('las traducciones llevan las mismas variables', () => {
  const mal = Object.entries(EN).filter(([es, en]) => variables(es).join() !== variables(en).join());
  assert.deepEqual(mal.map(([es]) => es), []);
});
