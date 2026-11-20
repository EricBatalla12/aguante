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

-- Cambia el código de invitación, por ejemplo si se ha compartido de más.
-- Puede hacerlo cualquiera de la casa; el código viejo deja de valer. Los que
-- ya están dentro siguen dentro.
create or replace function public.cambiar_codigo(p_casa uuid)
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
  if not exists (select 1 from public.miembros where casa_id = p_casa and usuario = yo) then
    raise exception 'no_eres_de_la_casa' using errcode = '42501';
  end if;
  loop
    begin
      update public.casas set codigo = privado.nuevo_codigo() where id = p_casa returning * into casa;
      exit;
    exception when unique_violation then
      -- El código nuevo ya existía: se prueba con otro
    end;
  end loop;
  return casa;
end;
$$;

-- Saca a alguien de la casa. Puede hacerlo quien la creó; si esa persona ya
-- no está en la casa, cualquiera de la casa. Para irse uno mismo está
-- salir_casa. Lo que tenía en su móvil se le queda como copia propia.
create or replace function public.echar_de_casa(p_casa uuid, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  creador uuid;
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  if not exists (select 1 from public.miembros where casa_id = p_casa and usuario = yo) then
    raise exception 'no_eres_de_la_casa' using errcode = '42501';
  end if;
  if p_usuario = yo then
    raise exception 'usa_salir' using errcode = 'P0001';
  end if;
  select creada_por into creador from public.casas where id = p_casa;
  if creador is not null and creador <> yo
     and exists (select 1 from public.miembros where casa_id = p_casa and usuario = creador) then
    raise exception 'solo_quien_la_creo' using errcode = '42501';
  end if;
  delete from public.miembros where casa_id = p_casa and usuario = p_usuario;
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

-- Borra la cuenta de quien llama: sale de sus casas (las que se quedan sin
-- nadie se borran con todo lo suyo) y se borra el usuario, con su correo. Lo
-- que hay en el móvil no se toca.
create or replace function public.borrar_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  casa uuid;
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  for casa in select casa_id from public.miembros where usuario = yo loop
    delete from public.miembros where casa_id = casa and usuario = yo;
    if not exists (select 1 from public.miembros where casa_id = casa) then
      delete from public.casas where id = casa;
    end if;
  end loop;
  delete from privado.intentos where usuario = yo;
  delete from auth.users where id = yo;
end;
$$;

revoke all on function public.crear_casa(text), public.unirse_casa(text), public.salir_casa(uuid),
  public.cambiar_codigo(uuid), public.echar_de_casa(uuid, uuid),
  public.subir_cambios(uuid, jsonb), public.borrar_cuenta() from public, anon;
grant execute on function public.crear_casa(text), public.unirse_casa(text), public.salir_casa(uuid),
  public.cambiar_codigo(uuid), public.echar_de_casa(uuid, uuid),
  public.subir_cambios(uuid, jsonb), public.borrar_cuenta() to authenticated;
revoke all on function privado.nuevo_codigo() from public, anon, authenticated;

-- ------------------------------------------------------------------ Planes (Pro)

-- Quién tiene Pro. Lo rellena Eric a mano en el Table Editor del panel: el
-- correo de la cuenta, el plan y, si caduca, hasta cuándo (vacío = siempre).
-- Si alguien de una casa tiene Pro, lo tiene toda la casa. La app no puede
-- leer ni escribir esta tabla: solo pregunta con soy_pro().
create table if not exists public.planes (
  correo text primary key,
  plan text not null default 'pro' check (plan in ('gratis', 'pro')),
  hasta date,
  nota text,
  creado timestamptz not null default now()
);

alter table public.planes enable row level security;
revoke all on table public.planes from anon, authenticated;

-- Devuelve {pro, hasta, deCasa}: si quien llama tiene Pro, hasta cuándo (null
-- si no caduca) y si le viene de otra persona de su casa.
create or replace function public.soy_pro()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  mi_correo text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  mejor record;
begin
  if yo is null then
    raise exception 'sin_sesion' using errcode = '28000';
  end if;
  -- El plan vigente que más dura: el propio o el de alguien de mis casas
  select lower(p.correo) = mi_correo as propio, p.hasta into mejor
  from public.planes p
  where p.plan = 'pro'
    and (p.hasta is null or p.hasta >= current_date)
    and (
      lower(p.correo) = mi_correo
      or lower(p.correo) in (
        select lower(u.email) from auth.users u
        join public.miembros m on m.usuario = u.id
        where m.casa_id in (select privado.mis_casas())
      )
    )
  order by p.hasta is not null, p.hasta desc, (lower(p.correo) = mi_correo) desc
  limit 1;
  if not found then
    return jsonb_build_object('pro', false, 'hasta', null, 'deCasa', false);
  end if;
  return jsonb_build_object('pro', true, 'hasta', mejor.hasta, 'deCasa', not mejor.propio);
end;
$$;

revoke all on function public.soy_pro() from public, anon;
grant execute on function public.soy_pro() to authenticated;

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

-- ------------------------------------------------------------------ Precios de las tiendas (quitados)

-- Del 20/11/2026 hubo una copia semanal de productos y precios de la tienda
-- online de Mercadona para proponer la lista de la compra. Se quitó ese mismo
-- día por la noche: la lista la hace ahora cada uno. Esto borra lo que quedaba
-- en el proyecto (la tabla, la función que la cargaba y la huella del token).
drop function if exists public.cargar_precios(text, text, jsonb);
drop table if exists public.precios_tienda;
drop table if exists privado.claves;

-- ------------------------------------------------------------------ Errores de la app

-- Lo que falla en los móviles (src/lib/errores.ts): el mensaje, la pila, la
-- versión y la plataforma; nada de la persona. Nadie lo puede leer desde la
-- app: se mira en el panel (Table Editor). Se borra lo de más de 90 días.
create table if not exists public.errores (
  id bigint generated always as identity primary key,
  momento timestamptz not null default now(),
  mensaje text not null check (char_length(mensaje) <= 500),
  pila text check (char_length(pila) <= 4000),
  fatal boolean not null default false,
  version text check (char_length(version) <= 20),
  actualizacion text check (char_length(actualizacion) <= 60),
  plataforma text check (char_length(plataforma) <= 40)
);
alter table public.errores enable row level security;
revoke all on table public.errores from anon, authenticated;

create or replace function public.apuntar_error(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tope para que nadie llene la tabla: 500 por hora entre todos
  if (select count(*) from public.errores where momento > now() - interval '1 hour') >= 500 then
    return;
  end if;
  delete from public.errores where momento < now() - interval '90 days';
  insert into public.errores (mensaje, pila, fatal, version, actualizacion, plataforma)
  values (
    left(coalesce(p ->> 'mensaje', '?'), 500),
    left(p ->> 'pila', 4000),
    coalesce((p ->> 'fatal')::boolean, false),
    left(p ->> 'version', 20),
    left(p ->> 'actualizacion', 60),
    left(p ->> 'plataforma', 40)
  );
end;
$$;

revoke all on function public.apuntar_error(jsonb) from public;
grant execute on function public.apuntar_error(jsonb) to anon, authenticated;
