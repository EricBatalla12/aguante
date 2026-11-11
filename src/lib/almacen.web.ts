// En la web (solo para previsualizar la app en el navegador) se usa
// localStorage: SQLite en web necesita configurar wasm en Metro y no compensa.
const disponible = () => typeof window !== 'undefined' && !!window.localStorage;

export const almacen = {
  getItem: (k: string) => (disponible() ? window.localStorage.getItem(k) : null),
  setItem: (k: string, v: string) => {
    if (disponible()) window.localStorage.setItem(k, v);
  },
  removeItem: (k: string) => {
    if (disponible()) window.localStorage.removeItem(k);
  },
};
