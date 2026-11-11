import { useLocalSearchParams } from 'expo-router';

import { ProductoForm } from '@/components/producto-form';
import { Boton, Pantalla, Texto } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { volver } from '@/lib/navegacion';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { useResultado } from '@/lib/use-resultado';

export default function EditarProducto() {
  const C = useC();
  const { id } = useLocalSearchParams<{ id: string }>();
  const producto = useAguante((s) => s.productos.find((p) => p.id === id));
  const guardar = useAguante((s) => s.guardarProducto);
  const borrar = useAguante((s) => s.borrarProducto);
  const r = useResultado('normal');

  if (!producto) {
    return (
      <Pantalla>
        <Texto color={C.suave}>Este producto ya no está en la despensa.</Texto>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <ProductoForm
        inicial={producto}
        textoGuardar="Guardar cambios"
        diasPorKcal={r.kcalDia || undefined}
        onGuardar={(p) => {
          guardar(p);
          volver();
        }}
      />
      <Boton
        variante="secundario"
        icono="trash-can-outline"
        onPress={() =>
          confirmar('¿Quitar de la despensa?', producto.nombre, 'Quitar', () => {
            borrar(producto.id);
            volver();
          })
        }>
        Quitar de la despensa
      </Boton>
    </Pantalla>
  );
}
