import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Aviso, Boton, Campo, Interruptor, Pantalla, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { volver } from '@/lib/navegacion';
import { formatoNumero, kcalBase, type Persona, type Sexo } from '@/lib/calculo';
import { numero } from '@/lib/formato';
import { nuevoId, useAguante } from '@/lib/store';
import { useEscenario } from '@/lib/use-resultado';
import { useC } from '@/lib/tema';
import { t } from '@/lib/i18n';

export default function EditarPersona() {
  const C = useC();
  const escenario = useEscenario();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existente = useAguante((s) => s.personas.find((p) => p.id === id));
  const guardar = useAguante((s) => s.guardarPersona);
  const borrar = useAguante((s) => s.borrarPersona);

  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [sexo, setSexo] = useState<Sexo>(existente?.sexo ?? 'mujer');
  const [edad, setEdad] = useState(existente ? String(existente.edadAnios).replace('.', ',') : '');
  const [peso, setPeso] = useState(existente ? String(existente.pesoKg).replace('.', ',') : '');
  const [trimestre, setTrimestre] = useState<0 | 1 | 2 | 3>(existente?.embarazoTrimestre ?? 0);
  const [lactancia, setLactancia] = useState(!!existente?.lactancia);
  const [noRacionar, setNoRacionar] = useState(!!existente?.noRacionar);

  const edadN = numero(edad);
  const pesoN = numero(peso);
  const valida = nombre.trim() !== '' && edadN >= 0 && edadN < 120 && pesoN > 0 && pesoN < 300;
  const puedeEmbarazo = sexo === 'mujer' && edadN >= 12;

  const persona: Persona = {
    id: existente?.id ?? nuevoId(),
    nombre: nombre.trim(),
    sexo,
    edadAnios: edadN,
    pesoKg: pesoN,
    embarazoTrimestre: puedeEmbarazo ? trimestre : 0,
    lactancia: puedeEmbarazo && lactancia,
    noRacionar,
  };

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 14 }}>
        <Campo etiqueta={t('Nombre')} valor={nombre} onChange={setNombre} placeholder={t('Ana')} />
        <View style={{ gap: 6 }}>
          <Texto peso="600">{t('Sexo')}</Texto>
          <Segmentado
            opciones={[
              { valor: 'mujer', etiqueta: 'Mujer' },
              { valor: 'hombre', etiqueta: 'Hombre' },
            ]}
            valor={sexo}
            onChange={setSexo}
          />
          <Texto tam={12} color={C.suave}>
            {t('Las fórmulas de energía son distintas según el sexo biológico.')}
          </Texto>
        </View>
        <Campo
          etiqueta={t('Edad')} sufijo={t('años')}
          valor={edad}
          onChange={setEdad}
          teclado="decimal-pad"
          placeholder="30"
          ayuda={t('Para un bebé usa decimales: 0,5 son 6 meses.')}
        />
        <Campo etiqueta={t('Peso')} sufijo="kg" valor={peso} onChange={setPeso} teclado="decimal-pad" placeholder="70" />
        {puedeEmbarazo && (
          <View style={{ gap: 6 }}>
            <Texto peso="600">{t('Embarazo')}</Texto>
            <Segmentado
              opciones={[
                { valor: 0, etiqueta: 'No' },
                { valor: 1, etiqueta: '1.er' },
                { valor: 2, etiqueta: '2.º' },
                { valor: 3, etiqueta: '3.er' },
              ]}
              valor={trimestre}
              onChange={(v) => setTrimestre(v as 0 | 1 | 2 | 3)}
            />
          </View>
        )}
        {puedeEmbarazo && <Interruptor etiqueta={t('Lactancia')} valor={lactancia} onChange={setLactancia} />}
        <Interruptor
          etiqueta={t('No racionar su comida')}
          valor={noRacionar}
          onChange={setNoRacionar}
          ayuda={t('Para personas mayores, enfermas o que lo necesiten. Menores, embarazo y lactancia ya están protegidos.')}
        />
      </Tarjeta>

      {valida && edadN < 1 && (
        <Aviso texto={t('Un bebé necesita leche materna o de fórmula: su comida no se calcula con la de la despensa. Su agua sí cuenta.')} />
      )}
      {valida && edadN >= 1 && (
        <Texto tam={13} color={C.suave}>
          {t('Necesita unas {kcal} kcal al día sin racionar.', { kcal: formatoNumero(kcalBase(persona, escenario)) })}
        </Texto>
      )}

      <Boton
        deshabilitado={!valida}
        onPress={() => {
          guardar(persona);
          volver();
        }}>
        {t('Guardar')}
      </Boton>
      {existente && (
        <Boton
          variante="secundario"
          onPress={() =>
            confirmar({
              titulo: t('¿Quitar a esta persona?'),
              nombre: existente.nombre,
              mensaje: t('También se borra su ración del reparto manual.'),
              accion: t('Quitar'),
              icono: 'account-outline',
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
