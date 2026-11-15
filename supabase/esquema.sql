-- Aguante: cuentas y casa compartida.
--
-- Se pega entero en el SQL Editor de Supabase y se ejecuta. Se puede volver a
-- ejecutar sin romper nada: crea lo que falte y sustituye funciones y reglas.
-- Los pasos de alrededor (plantilla del correo, SMTP) están en docs/cuentas.md.
--
-- Cómo está pensado:
-- - Una casa tiene miembros (cuentas) y elementos: cada producto, persona,
--   mascota, fuente, aparato, casilla del kit… es una fila. Así un cambio solo
--   pisa el elemento que se ha tocado y no la despensa entera.
-- - Gana el último cambio, por elemento: cada fila lleva cuándo se cambió en
--   el móvil (`cambiado`, milisegundos) y solo se sustituye por otra más nueva.
--   Lo borrado se queda como «borrado» para que los demás móviles se enteren.
-- - Los móviles solo leen las tablas. Escribir se hace siempre con las
--   funciones de abajo, que comprueban quién llama y si es de la casa.

create schema if not exists privado;

-- ------------------------------------------------------------------ Tablas

create table if not exists public.casas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Casa' check (char_length(nombre) between 1 and 60),
  -- Código de invitación, del estilo K7P-29Q
  codigo text not null unique,
  creada_por uuid references auth.users (id) on delete set null,
  creada timestamptz not null default now()
);

create table if not exists public.miembros (
  casa_id uuid not null references public.casas (id) on delete cascade,
  usuario uuid not null references auth.users (id) on delete cascade,
  -- Copia del correo para enseñar quién está en la casa
  correo text,
  unido timestamptz not null default now(),
  primary key (casa_id, usuario)
);
create index if not exists miembros_usuario on public.miembros (usuario);

create table if not exists public.elementos (
  casa_id uuid not null references public.casas (id) on delete cascade,
  tipo text not null check (
    tipo in ('persona', 'mascota', 'producto', 'kitPropio', 'kit', 'manual', 'fuente', 'aparato', 'ajuste')
  ),
  id text not null check (char_length(id) between 1 and 100),
  datos jsonb check (datos is null or octet_length(datos::text) < 50000),
  borrado boolean not null default false,
  cambiado bigint not null, -- cuándo se cambió en el móvil, en ms
  autor uuid references auth.users (id) on delete set null,
  -- Cuándo llegó al servidor: los móviles piden «lo llegado desde X»
  recibido timestamptz not null default clock_timestamp(),
  primary key (casa_id, tipo, id)
);
create index if not exists elementos_recibido on public.elementos (casa_id, recibido);

-- Intentos fallidos de unirse a una casa, para que no se puedan probar
-- códigos a ciegas
create table if not exists privado.intentos (
  usuario uuid not null,
  momento timestamptz not null default now()
);
create index if not exists intentos_usuario on privado.intentos (usuario, momento);

-- ------------------------------------------------------------------ Lectura (RLS)

-- Casas de quien llama. Es security definer para que las reglas de
-- `miembros` puedan usarla sin leerse a sí mismas (eso da recursión infinita).
create or replace function privado.mis_casas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select casa_id from public.miembros where usuario = (select auth.uid())
$$;

grant usage on schema privado to authenticated;
revoke all on function privado.mis_casas() from public, anon;
grant execute on function privado.mis_casas() to authenticated;

alter table public.casas enable row level security;
alter table public.miembros enable row level security;
alter table public.elementos enable row level security;

revoke all on table public.casas, public.miembros, public.elementos from anon, authenticated;
grant select on table public.casas, public.miembros, public.elementos to authenticated;

drop policy if exists "Ver mis casas" on public.casas;
create policy "Ver mis casas" on public.casas
  for select to authenticated
  using (id in (select privado.mis_casas()));

drop policy if exists "Ver quién está en mis casas" on public.miembros;
create policy "Ver quién está en mis casas" on public.miembros
  for select to authenticated
  using (casa_id in (select privado.mis_casas()));

drop policy if exists "Ver lo de mis casas" on public.elementos;
create policy "Ver lo de mis casas" on public.elementos
  for select to authenticated
  using (casa_id in (select privado.mis_casas()));

-- ------------------------------------------------------------------ Escritura

-- Código de 6 caracteres sin los que se confunden (0/O, 1/I/L): 31^6, unos
-- 887 millones. Sale de gen_random_uuid, que usa un generador seguro.
create or replace function privado.nuevo_codigo()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  letras constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := uuid_send(gen_random_uuid());
  codigo text := '';
begin
  -- Los primeros 6 bytes del uuid v4 son todos aleatorios
  for i in 0..5 loop
    codigo := codigo || substr(letras, 1 + get_byte(bytes, i) % 31, 1);
  end loop;
  return substr(codigo, 1, 3) || '-' || substr(codigo, 4, 3);
end;
$$;

create or replace function public.crear_casa(p_nombre text)
returns public.casas
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  casa public.casas;
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  if (select count(*) from public.miembros where usuario = yo) >= 5 then
    raise exception 'demasiadas_casas' using errcode = 'P0001';
  end if;
  loop
    begin
      insert into public.casas (nombre, codigo, creada_por)
      values (coalesce(nullif(left(trim(p_nombre), 60), ''), 'Casa'), privado.nuevo_codigo(), yo)
      returning * into casa;
      exit;
    exception when unique_violation then
      -- El código ya existía: se prueba con otro
    end;
  end loop;
  insert into public.miembros (casa_id, usuario, correo)
  values (casa.id, yo, (select auth.jwt() ->> 'email'));
  return casa;
end;
$$;

create or replace function public.unirse_casa(p_codigo text)
returns public.casas
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  limpio text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  casa public.casas;
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  if (select count(*) from privado.intentos where usuario = yo and momento > now() - interval '1 hour') >= 10 then
    raise exception 'demasiados_intentos' using errcode = 'P0001';
  end if;
  select * into casa from public.casas c
  where c.codigo = substr(limpio, 1, 3) || '-' || substr(limpio, 4, 3) and char_length(limpio) = 6;
  if casa.id is null then
    insert into privado.intentos (usuario) values (yo);
    -- Hace falta que el intento quede apuntado: se devuelve null en vez de
    -- lanzar un error, que desharía el insert
    return null;
  end if;
  if (select count(*) from public.miembros where usuario = yo and casa_id <> casa.id) >= 5 then
    raise exception 'demasiadas_casas' using errcode = 'P0001';
  end if;
  insert into public.miembros (casa_id, usuario, correo)
  values (casa.id, yo, (select auth.jwt() ->> 'email'))
  on conflict (casa_id, usuario) do nothing;
  return casa;
end;
$$;

-- Sale de la casa. Si era la última persona, la casa y sus datos se borran.
create or replace function public.salir_casa(p_casa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  delete from public.miembros where casa_id = p_casa and usuario = yo;
  if not exists (select 1 from public.miembros where casa_id = p_casa) then
    delete from public.casas where id = p_casa;
  end if;
end;
$$;

-- Sube cambios: [{tipo, id, datos, borrado, cambiado}, …]. Cada uno solo
-- sustituye al del servidor si es más nuevo. Devuelve cómo ha quedado cada
-- elemento en el servidor, para que el móvil vea cuáles ha perdido.
create or replace function public.subir_cambios(p_casa uuid, p_cambios jsonb)
returns setof public.elementos
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  -- Un móvil con la hora adelantada ganaría siempre: no se acepta más de un
  -- minuto por delante del servidor
  tope bigint := (extract(epoch from now()) * 1000)::bigint + 60000;
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  if not exists (select 1 from public.miembros where casa_id = p_casa and usuario = yo) then
    raise exception 'no_eres_de_la_casa' using errcode = '42501';
  end if;
  if jsonb_typeof(p_cambios) <> 'array' or jsonb_array_length(p_cambios) > 500 then
    raise exception 'cambios_no_validos' using errcode = '22023';
  end if;

  insert into public.elementos as e (casa_id, tipo, id, datos, borrado, cambiado, autor, recibido)
  select distinct on (c ->> 'tipo', c ->> 'id')
    p_casa,
    c ->> 'tipo',
    c ->> 'id',
    case when coalesce((c ->> 'borrado')::boolean, false) then null else c -> 'datos' end,
    coalesce((c ->> 'borrado')::boolean, false),
    least((c ->> 'cambiado')::bigint, tope),
    yo,
    clock_timestamp()
  from jsonb_array_elements(p_cambios) c
  order by c ->> 'tipo', c ->> 'id', (c ->> 'cambiado')::bigint desc
  on conflict (casa_id, tipo, id) do update
    set datos = excluded.datos,
        borrado = excluded.borrado,
        cambiado = excluded.cambiado,
        autor = excluded.autor,
        recibido = excluded.recibido
    where excluded.cambiado > e.cambiado;

  return query
    select e.* from public.elementos e
    where e.casa_id = p_casa
      and (e.tipo, e.id) in (select c ->> 'tipo', c ->> 'id' from jsonb_array_elements(p_cambios) c);
end;
$$;

revoke all on function public.crear_casa(text), public.unirse_casa(text), public.salir_casa(uuid),
  public.subir_cambios(uuid, jsonb) from public, anon;
grant execute on function public.crear_casa(text), public.unirse_casa(text), public.salir_casa(uuid),
  public.subir_cambios(uuid, jsonb) to authenticated;
revoke all on function privado.nuevo_codigo() from public, anon, authenticated;

-- ------------------------------------------------------------------ Tiempo real

-- Los móviles de la casa se enteran al momento de lo que cambia otro. Se
-- respeta la regla de lectura de arriba: cada uno solo recibe lo de su casa.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'elementos'
     ) then
    alter publication supabase_realtime add table public.elementos;
  end if;
end;
$$;
