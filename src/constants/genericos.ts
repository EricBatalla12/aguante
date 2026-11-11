// Energía típica de alimentos de despensa, para cuando no hay conexión o el
// producto no está en Open Food Facts.
//
// Todas las cifras son de USDA FoodData Central (SR Legacy), consultadas el 11
// de noviembre de 2026; `fdc` es el identificador de cada alimento allí
// (https://fdc.nal.usda.gov/food-details/<fdc>/nutrients). Solo están los que
// se han podido comprobar: no añadas valores de memoria.

export type Generico = {
  nombre: string;
  kcal100g: number;
  fdc: number;
  /** Palabras (sin tildes) que tienen que aparecer todas en el nombre. */
  claves: string[][];
};

export const GENERICOS: Generico[] = [
  { nombre: 'Garbanzos cocidos, escurridos', kcal100g: 139, fdc: 173800, claves: [['garbanzo']] },
  { nombre: 'Lentejas cocidas', kcal100g: 114, fdc: 175254, claves: [['lenteja']] },
  { nombre: 'Lentejas secas', kcal100g: 352, fdc: 172420, claves: [['lenteja']] },
  { nombre: 'Alubias blancas en conserva', kcal100g: 114, fdc: 175204, claves: [['alubia'], ['judia', 'blanca'], ['judion'], ['faba']] },
  { nombre: 'Atún en aceite, escurrido', kcal100g: 198, fdc: 173708, claves: [['atun', 'aceite'], ['bonito', 'aceite']] },
  { nombre: 'Atún al natural, escurrido', kcal100g: 128, fdc: 175158, claves: [['atun'], ['bonito']] },
  { nombre: 'Sardinas en aceite, escurridas', kcal100g: 208, fdc: 175139, claves: [['sardina']] },
  { nombre: 'Arroz blanco crudo', kcal100g: 365, fdc: 169756, claves: [['arroz']] },
  { nombre: 'Pasta seca', kcal100g: 371, fdc: 168927, claves: [['pasta'], ['macarron'], ['espagueti'], ['fideo']] },
  { nombre: 'Tomate en conserva (salsa)', kcal100g: 24, fdc: 170054, claves: [['tomate']] },
];

/** Minúsculas y sin tildes, para comparar nombres. */
export const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Valores típicos que encajan con un nombre, del más específico al más general. */
export function genericosPara(nombre: string): Generico[] {
  const n = normalizar(nombre);
  if (n.length < 3) return [];
  return GENERICOS.filter((g) => g.claves.some((grupo) => grupo.every((c) => n.includes(c))));
}
