// Tarea en segundo plano: en la web no hay. La del móvil está en
// segundo-plano.native.ts.

export async function registrarSegundoPlano(): Promise<void> {}

export async function ejecutarTareaAhora(): Promise<void> {}

export async function estadoSegundoPlano(): Promise<{ disponible: boolean; registrada: boolean }> {
  return { disponible: false, registrada: false };
}
