// Plan familiar de emergencia: lo que hará cada uno si pasa algo, a mano
// aunque no haya conexión. Los apartados siguen el plan de Ready.gov
// («Make a Plan» y su formulario de comunicación familiar, consultados el
// 21/11/2026; ver docs/fuentes-y-reglas.md). Se guarda en el móvil y, con
// casa compartida, se comparte entero como un ajuste (src/lib/compartido.ts).

import type { ReactNode } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';

import { Aviso, Boton, Campo, Icono, Pantalla, Seccion, Tarjeta, Texto } from '@/components/ui';
import { textoFecha } from '@/lib/fechas';
import { t } from '@/lib/i18n';
import { useSincro } from '@/lib/sincro';
import { nuevoId, useAguante, type PlanFamiliar } from '@/lib/store';
import { useC } from '@/lib/tema';

type Listas = 'encuentro' | 'contactos' | 'centros';

export default function Plan() {
  const C = useC();
  const plan = useAguante((s) => s.planFamiliar);
  const setPlan = useAguante((s) => s.setPlanFamiliar);
  const casa = useSincro((s) => s.casa);

  /** Cambia un campo de un elemento de una de las listas. */
  const cambiar = <K extends Listas>(lista: K, id: string, cambio: Partial<PlanFamiliar[K][number]>) =>
    setPlan({ [lista]: (plan[lista] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...cambio } : x)) } as Partial<PlanFamiliar>);
  const quitar = (lista: Listas, id: string) =>
    setPlan({ [lista]: (plan[lista] as { id: string }[]).filter((x) => x.id !== id) } as Partial<PlanFamiliar>);
  const llamar = (telefono: string) => Linking.openURL(`tel:${telefono.replace(/[^\d+]/g, '')}`).catch(() => {});

  const compartir = () => {
    const bloque = (titulo: string, lineas: string[]) => (lineas.length ? [`${titulo.toUpperCase()}`, ...lineas, ''] : []);
    const texto = [
      t('Nuestro plan familiar de emergencia'),
      '',
      ...bloque(t('Puntos de encuentro'), plan.encuentro.filter((e) => e.lugar.trim()).map((e) => `• ${e.lugar}${e.nota ? ` (${e.nota})` : ''}`)),
      ...bloque(t('Contactos'), plan.contactos.filter((c) => c.nombre.trim() || c.telefono.trim()).map((c) => `• ${c.nombre}: ${c.telefono}${c.nota ? ` (${c.nota})` : ''}`)),
      ...bloque(
        t('Colegios, trabajos y cuidadores'),
        plan.centros.filter((c) => c.nombre.trim()).map((c) => `• ${c.nombre}${c.telefono ? `, ${c.telefono}` : ''}${c.recogida ? `: ${c.recogida}` : ''}`),
      ),
      ...bloque(t('Avisos y dónde quedarnos'), plan.refugio ? [plan.refugio] : []),
      ...bloque(t('Si hay que irse de casa'), plan.salida ? [plan.salida] : []),
      ...bloque(t('Información médica'), plan.medica ? [plan.medica] : []),
      ...bloque(t('Documentos'), plan.documentos ? [plan.documentos] : []),
      ...bloque(t('Notas'), plan.notas ? [plan.notas] : []),
      t('Emergencias: 112.'),
      t('Hecho con Aguante.'),
    ].join('\n');
    Share.share({ message: texto }).catch(() => {});
  };

  const texto = (campo: 'refugio' | 'salida' | 'medica' | 'documentos' | 'notas') => ({
    valor: plan[campo] ?? '',
    onChange: (v: string) => setPlan({ [campo]: v }),
  });

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 8 }}>
        <Texto tam={13} color={C.suave}>
          {t('Lo que hará cada uno si pasa algo: dónde os encontráis, a quién llamáis y quién recoge a los niños. Se guarda en el móvil y se lee sin conexión.')}
        </Texto>
        <Texto tam={13} color={C.suave}>
          {casa ? t('Se comparte con tu casa: si dos lo cambian a la vez, se queda el último cambio.') : t('Con una casa compartida, lo veréis todos.')}
        </Texto>
        {plan.actualizado && (
          <Texto tam={12} color={C.suave}>
            {t('Cambiado por última vez el {fecha}.', { fecha: textoFecha(plan.actualizado) })}
          </Texto>
        )}
      </Tarjeta>

      <Seccion>{t('Puntos de encuentro')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={13} color={C.suave}>
          {t('Un sitio conocido y fácil de encontrar donde reuniros si no podéis volver a casa o no os localizáis.')}
        </Texto>
        {plan.encuentro.map((e, i) => (
          <Fila key={e.id} primera={i === 0} alQuitar={() => quitar('encuentro', e.id)} etiquetaQuitar={t('Quitar este punto de encuentro')}>
            <Campo etiqueta={t('Lugar')} valor={e.lugar} onChange={(v) => cambiar('encuentro', e.id, { lugar: v })} placeholder={t('La puerta del colegio, la plaza…')} />
            <Campo etiqueta={t('Cómo llegar o cuándo ir (opcional)')} valor={e.nota ?? ''} onChange={(v) => cambiar('encuentro', e.id, { nota: v })} />
          </Fila>
        ))}
        <Boton pequeno variante="suave" icono="map-marker-plus-outline" onPress={() => setPlan({ encuentro: [...plan.encuentro, { id: nuevoId(), lugar: '' }] })}>
          {t('Añadir punto de encuentro')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Contactos')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={13} color={C.suave}>
          {t('La familia y alguien de fuera de casa a quien avisar. Apúntalos aquí aunque estén en la agenda: si el móvil se queda sin batería, otro puede leerlos.')}
        </Texto>
        {plan.contactos.map((c, i) => (
          <Fila key={c.id} primera={i === 0} alQuitar={() => quitar('contactos', c.id)} etiquetaQuitar={t('Quitar este contacto')}>
            <Campo etiqueta={t('Nombre')} valor={c.nombre} onChange={(v) => cambiar('contactos', c.id, { nombre: v })} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Campo etiqueta={t('Teléfono')} valor={c.telefono} onChange={(v) => cambiar('contactos', c.id, { telefono: v })} teclado="numeric" />
              </View>
              {c.telefono.replace(/\D/g, '').length >= 3 && (
                <Boton pequeno variante="secundario" icono="phone" onPress={() => llamar(c.telefono)}>
                  {t('Llamar')}
                </Boton>
              )}
            </View>
            <Campo etiqueta={t('Nota (opcional)')} valor={c.nota ?? ''} onChange={(v) => cambiar('contactos', c.id, { nota: v })} placeholder={t('La tía de Valencia, el vecino del 2.º…')} />
          </Fila>
        ))}
        <Boton pequeno variante="suave" icono="account-plus-outline" onPress={() => setPlan({ contactos: [...plan.contactos, { id: nuevoId(), nombre: '', telefono: '' }] })}>
          {t('Añadir contacto')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Colegios, trabajos y cuidadores')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={13} color={C.suave}>
          {t('Su teléfono y quién recoge a quién si pasa algo.')}
        </Texto>
        {plan.centros.map((c, i) => (
          <Fila key={c.id} primera={i === 0} alQuitar={() => quitar('centros', c.id)} etiquetaQuitar={t('Quitar este sitio')}>
            <Campo etiqueta={t('Nombre')} valor={c.nombre} onChange={(v) => cambiar('centros', c.id, { nombre: v })} placeholder={t('Colegio de Lucía, trabajo de Javi…')} />
            <Campo etiqueta={t('Teléfono (opcional)')} valor={c.telefono ?? ''} onChange={(v) => cambiar('centros', c.id, { telefono: v })} teclado="numeric" />
            <Campo etiqueta={t('Quién recoge y cómo (opcional)')} valor={c.recogida ?? ''} onChange={(v) => cambiar('centros', c.id, { recogida: v })} multilinea />
          </Fila>
        ))}
        <Boton pequeno variante="suave" icono="school-outline" onPress={() => setPlan({ centros: [...plan.centros, { id: nuevoId(), nombre: '' }] })}>
          {t('Añadir colegio, trabajo o cuidador')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Qué hacer')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Campo
          etiqueta={t('Avisos y dónde quedarnos')}
          {...texto('refugio')}
          multilinea
          ayuda={t('Cómo os enteraréis (ES-Alert llega sola al móvil; la radio, Actualidad…) y en qué parte de casa os quedáis si no se puede salir.')}
        />
        <Campo etiqueta={t('Si hay que irse de casa')} {...texto('salida')} multilinea ayuda={t('Por dónde salís de casa y del barrio, y adónde vais.')} />
      </Tarjeta>

      <Seccion>{t('Para tenerlo a mano')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Campo
          etiqueta={t('Información médica')}
          {...texto('medica')}
          multilinea
          ayuda={t('Alergias, medicinas, médico y pediatra, seguro, aparatos médicos, veterinario. Con casa compartida, la ve la gente de tu casa.')}
        />
        <Campo etiqueta={t('Dónde están los documentos')} {...texto('documentos')} multilinea ayuda={t('DNI, tarjetas sanitarias, seguros, escrituras: dónde están y si hay copias.')} />
        <Campo etiqueta={t('Notas')} {...texto('notas')} multilinea />
      </Tarjeta>

      <Boton icono="share-variant" onPress={compartir}>
        {t('Compartir el plan')}
      </Boton>
      <Aviso tono="ambar" texto={t('En una emergencia, llama al 112. Revisad el plan juntos y practicadlo de vez en cuando.')} />
    </Pantalla>
  );
}

/** Un elemento de una lista del plan, con su botón de quitar. */
function Fila({ children, primera, alQuitar, etiquetaQuitar }: { children: ReactNode; primera: boolean; alQuitar: () => void; etiquetaQuitar: string }) {
  const C = useC();
  return (
    <View style={{ gap: 8, paddingTop: primera ? 0 : 12, borderTopWidth: primera ? 0 : 1, borderTopColor: C.linea }}>
      {children}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiquetaQuitar}
        onPress={alQuitar}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, alignSelf: 'flex-start' }}>
        <Icono name="trash-can-outline" color={C.suave} size={18} />
        <Texto tam={13} color={C.suave}>
          {t('Quitar')}
        </Texto>
      </Pressable>
    </View>
  );
}
