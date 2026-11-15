import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Boton, Campo, Pantalla, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { volver } from '@/lib/navegacion';
import { aguaMascota, formatoNumero, kcalMascota, type Especie, type Mascota } from '@/lib/calculo';
import { numero } from '@/lib/formato';
import { nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { t } from '@/lib/i18n';

export default function EditarMascota() {
  const C = useC();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existente = useAguante((s) => s.mascotas.find((m) => m.id === id));
  const guardar = useAguante((s) => s.guardarMascota);
  const borrar = useAguante((s) => s.borrarMascota);

  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [especie, setEspecie] = useState<Especie>(existente?.especie ?? 'perro');
  const [peso, setPeso] = useState(existente ? String(existente.pesoKg).replace('.', ',') : '');

  const pesoN = numero(peso);
  const valida = nombre.trim() !== '' && pesoN > 0 && pesoN < 150;
  const mascota: Mascota = { id: existente?.id ?? nuevoId(), nombre: nombre.trim(), especie, pesoKg: pesoN };

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 14 }}>
        <Campo etiqueta={t('Nombre')} valor={nombre} onChange={setNombre} placeholder={t('Toby')} />
        <View style={{ gap: 6 }}>
          <Texto peso="600">{t('Especie')}</Texto>
          <Segmentado
            opciones={[
              { valor: 'perro', etiqueta: 'Perro' },
              { valor: 'gato', etiqueta: 'Gato' },
            ]}
            valor={especie}
            onChange={setEspecie}
          />
        </View>
        <Campo etiqueta={t('Peso')} sufijo="kg" valor={peso} onChange={setPeso} teclado="decimal-pad" placeholder="18" />
      </Tarjeta>

      {valida && (
        <Texto tam={13} color={C.suave}>
          {t('Unas {kcal} kcal y {l} L de agua al día. Es una estimación general: si tu veterinario te ha dado otra cifra, fíate de la suya.', {
            kcal: formatoNumero(kcalMascota(mascota)),
            l: formatoNumero(aguaMascota(mascota), 1),
          })}
        </Texto>
      )}

      <Boton
        deshabilitado={!valida}
        onPress={() => {
          guardar(mascota);
          volver();
        }}>
        {t('Guardar')}
      </Boton>
      {existente && (
        <Boton
          variante="secundario"
          onPress={() =>
            confirmar({
              titulo: t('¿Quitar esta mascota?'),
              nombre: existente.nombre,
              accion: t('Quitar'),
              icono: 'paw',
              alAceptar: () => {
                borrar(existente.id);
                volver();
              },
            })
          }>
          {t('Quitar del hogar')}
        </Boton>
      )}
    </Pantalla>
  );
}
