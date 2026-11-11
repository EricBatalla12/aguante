import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Boton, BotonIcono, Icono, Miniatura, Pantalla, Pastilla, Segmentado, Tarjeta, Texto, Titulo } from '@/components/ui';
import { normalizar } from '@/constants/genericos';
import { formatoNumero, type Categoria, type Producto } from '@/lib/calculo';
import { textoFecha } from '@/lib/fechas';
import { colorCategoria, coloresCaducidad, ICONO_CATEGORIA, textoCantidad, textoCaducidad } from '@/lib/formato';
import { useAguante } from '@/lib/store';
import { useC, useLetra } from '@/lib/tema';
import { useResultado } from '@/lib/use-resultado';

type Filtro = 'todo' | Categoria;

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'todo', etiqueta: 'Todo' },
  { valor: 'comida', etiqueta: 'Comida' },
  { valor: 'agua', etiqueta: 'Agua' },
  { valor: 'mascota', etiqueta: 'Mascotas' },
];

function detalle(p: Producto): string {
  const n = textoCantidad(p.cantidad);
  if (p.categoria === 'agua') return `${n} × ${textoCantidad(p.litrosPorUnidad ?? 0)} L`;
  const kcal = p.cantidad * (p.kcalPorUnidad ?? 0);
  return `${n} ${p.cantidad === 1 ? 'unidad' : 'unidades'} · ${formatoNumero(kcal)} kcal`;
}

export default function Despensa() {
  const C = useC();
  const letra = useLetra();
  const productos = useAguante((s) => s.productos);
  const r = useResultado();
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [busqueda, setBusqueda] = useState('');

  // Primero lo que hay que gastar antes; lo que no tiene fecha, al final
  const lista = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return productos
      .filter((p) => filtro === 'todo' || p.categoria === filtro)
      .filter((p) => !q || normalizar(p.nombre).includes(q))
      .sort((a, b) => (a.caducidad ?? '9999').localeCompare(b.caducidad ?? '9999'));
  }, [productos, filtro, busqueda]);

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Titulo>Despensa</Titulo>
        <BotonIcono icono="plus" etiqueta="Añadir producto" lleno onPress={() => router.push('/anadir')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Resumen valor={formatoNumero(r.kcalTotal)} etiqueta="kcal" color={C.comida} />
        <Resumen valor={`${formatoNumero(r.litrosTotal, 1)} L`} etiqueta="de agua" color={C.agua} />
        <Resumen valor={String(productos.length)} etiqueta="productos" color={C.tinta} />
      </View>

      {productos.length === 0 ? (
        <Tarjeta>
          <Texto tam={17} peso="700">
            Aún no hay nada aquí
          </Texto>
          <Texto tam={14} color={C.suave}>
            Escanea el código de barras de lo que compres para la reserva. Te rellenamos el nombre, las calorías y la
            foto.
          </Texto>
          <Boton icono="barcode-scan" onPress={() => router.push('/anadir')}>
            Añadir el primero
          </Boton>
        </Tarjeta>
      ) : (
        <>
          {productos.length > 5 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                minHeight: 46,
                borderRadius: 14,
                backgroundColor: C.tarjeta,
                borderWidth: 1,
                borderColor: C.borde,
                paddingHorizontal: 12,
              }}>
              <Icono name="magnify" color={C.suave} />
              <TextInput
                accessibilityLabel="Buscar en la despensa"
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar"
                placeholderTextColor={C.suave}
                maxFontSizeMultiplier={1.3}
                style={[{ flex: 1, minWidth: 0, fontSize: 16, color: C.tinta, paddingVertical: 8 }, letra('500')]}
              />
              {busqueda !== '' && (
                <Pressable accessibilityRole="button" accessibilityLabel="Borrar la búsqueda" onPress={() => setBusqueda('')} hitSlop={10}>
                  <Icono name="close-circle" color={C.suave} />
                </Pressable>
              )}
            </View>
          )}

          <Segmentado opciones={FILTROS} valor={filtro} onChange={setFiltro} />

          {lista.length === 0 ? (
            <Texto tam={14} color={C.suave} centro style={{ paddingVertical: 16 }}>
              Nada coincide con ese filtro.
            </Texto>
          ) : (
            <>
              <Texto tam={13} color={C.suave}>
                Ordenado por caducidad: arriba, lo que hay que gastar antes
              </Texto>
              <View style={{ gap: 8 }}>
                {lista.map((p) => (
                  <Fila key={p.id} p={p} />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </Pantalla>
  );
}

function Fila({ p }: { p: Producto }) {
  const C = useC();
  const cat = colorCategoria(p.categoria, C);
  const cad = coloresCaducidad(p, C);
  const etiqueta = p.cantidad <= 0 ? 'Agotado' : p.necesitaCocinar ? 'Hay que cocinarlo' : p.necesitaFrio ? 'Va en nevera' : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/producto/${p.id}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: C.tarjeta,
        borderWidth: 1,
        borderColor: C.borde,
        borderRadius: 18,
        padding: 10,
        opacity: pressed ? 0.7 : p.cantidad <= 0 ? 0.6 : 1,
      })}>
      <Miniatura uri={p.imagen} icono={ICONO_CATEGORIA[p.categoria]} fondo={cat.fondo} color={cat.color} tam={52} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Texto peso="700" lineas={2}>
          {p.nombre}
        </Texto>
        <Texto tam={13} color={C.suave}>
          {detalle(p)}
        </Texto>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
          <Pastilla texto={textoCaducidad(p)} fondo={cad.fondo} color={cad.color} />
          {p.caducidad && (
            <Texto tam={12} color={C.suave}>
              {textoFecha(p.caducidad, p.caducidadSinDia)}
            </Texto>
          )}
          {etiqueta && (
            <Texto tam={12} peso="600" color={C.suave}>
              · {etiqueta}
            </Texto>
          )}
        </View>
      </View>
      <Icono name="chevron-right" color={C.suave} />
    </Pressable>
  );
}

function Resumen({ valor, etiqueta, color }: { valor: string; etiqueta: string; color: string }) {
  const C = useC();
  return (
    <View style={{ flex: 1, backgroundColor: C.tarjeta, borderWidth: 1, borderColor: C.borde, borderRadius: 16, padding: 12 }}>
      <Texto tam={19} peso="800" color={color} ajustar>
        {valor}
      </Texto>
      <Texto tam={12} color={C.suave} lineas={1}>
        {etiqueta}
      </Texto>
    </View>
  );
}
