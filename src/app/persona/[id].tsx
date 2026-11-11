import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Aviso, Boton, Campo, Interruptor, Pantalla, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { volver } from '@/lib/navegacion';
import { formatoNumero, kcalBase, type Persona, type Sexo } from '@/lib/calculo';
import { numero } from '@/lib/formato';
import { nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';

export default function EditarPersona() {
  const C = useC();
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
        <Campo etiqueta="Nombre" valor={nombre} onChange={setNombre} placeholder="Ana" />
        <View style={{ gap: 6 }}>
          <Texto peso="600">Sexo</Texto>
          <Segmentado
            opciones={[
              { valor: 'mujer', etiqueta: 'Mujer' },
              { valor: 'hombre', etiqueta: 'Hombre' },
            ]}
            valor={sexo}
            onChange={setSexo}
          />
          <Texto tam={12} color={C.suave}>
            Las fórmulas de energía son distintas según el sexo biológico.
          </Texto>
        </View>
        <Campo
          etiqueta="Edad" sufijo="años"
          valor={edad}
          onChange={setEdad}
          teclado="decimal-pad"
          placeholder="30"
          ayuda="Para un bebé usa decimales: 0,5 son 6 meses."
        />
        <Campo etiqueta="Peso" sufijo="kg" valor={peso} onChange={setPeso} teclado="decimal-pad" placeholder="70" />
        {puedeEmbarazo && (
          <View style={{ gap: 6 }}>
            <Texto peso="600">Embarazo</Texto>
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
        {puedeEmbarazo && <Interruptor etiqueta="Lactancia" valor={lactancia} onChange={setLactancia} />}
        <Interruptor
          etiqueta="No racionar su comida"
          valor={noRacionar}
          onChange={setNoRacionar}
          ayuda="Para personas mayores, enfermas o que lo necesiten. Menores, embarazo y lactancia ya están protegidos."
        />
      </Tarjeta>

      {valida && edadN < 1 && (
        <Aviso texto="Un bebé necesita leche materna o de fórmula: su comida no se calcula con la de la despensa. Su agua sí cuenta." />
      )}
      {valida && edadN >= 1 && (
        <Texto tam={13} color={C.suave}>
          Necesita unas {formatoNumero(kcalBase(persona))} kcal al día sin racionar.
        </Texto>
      )}

      <Boton
        deshabilitado={!valida}
        onPress={() => {
          guardar(persona);
          volver();
        }}>
        Guardar
      </Boton>
      {existente && (
        <Boton
          variante="secundario"
          onPress={() =>
            confirmar('¿Quitar a esta persona?', existente.nombre, 'Quitar', () => {
              borrar(existente.id);
              volver();
            })
          }>
          Quitar del hogar
        </Boton>
      )}
    </Pantalla>
  );
}
