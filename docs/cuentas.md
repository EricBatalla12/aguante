# Cuentas y casa compartida (Supabase)

Cómo funciona y qué hay que configurar en el proyecto de Supabase
(`dndvwxfnaqdivcttxwku`) para que funcione.

## Cómo funciona

- La cuenta es **opcional**. Sin cuenta la app no hace ninguna petición a
  Supabase y todo sigue en el móvil.
- Se entra con el correo y un **código** que llega por correo (OTP de
  Supabase). No hay contraseñas ni enlaces.
- Una persona crea la **casa** y le sale un código (`K7P-29Q`); las demás lo
  escriben en *Ajustes › Cuenta y casa › Unirme a una casa*.
- Se comparte la despensa, el hogar (personas y mascotas), el kit y el kit
  propio, la energía (fuentes, aparatos, zona y época), el modo y el reparto
  manual. Tema, idioma, avisos, la emergencia en curso, el escenario, el
  objetivo de días y la nota de trueque son de cada móvil.
- **Sin conexión primero**: el store local manda. Cada cambio se apunta como
  pendiente (guardado) y se sube cuando hay red. Lo que cambian los demás llega
  en tiempo real con la app abierta, al volver a ella y, por si acaso, cada
  cinco minutos.
- **Conflictos**: cada producto, persona, casilla del kit… es un elemento, y
  gana el último cambio de cada elemento según la hora del móvil que lo hizo.
  El servidor no acepta horas de más de un minuto en el futuro.
- Al **crear** una casa, lo del móvil pasa a ser lo de la casa. Al **unirse**,
  si la casa ya tiene datos, sustituyen a los del móvil (la app avisa antes);
  si está vacía, sube lo del móvil.
- Al **salir** de la casa, lo del móvil se queda como copia propia. Si era la
  última persona, la casa se borra del servidor.
- **Borrar la cuenta** (*Cuenta y casa*, abajo): la función `borrar_cuenta`
  sale de todas sus casas (las que se quedan sin nadie se borran con lo suyo),
  borra el usuario y su correo de Supabase y cierra la sesión. Lo del móvil se
  queda. Hace falta conexión. Creada en el proyecto el 15/11/2026 desde el SQL
  Editor; se comprobó antes que el rol `postgres` puede borrar en
  `auth.users`.

Código: `src/lib/compartido.ts` (puro, con tests en `tests/compartido.test.mjs`),
`src/lib/sincro.ts` (motor de sincronización), `src/lib/supabase.ts` (cliente)
y `src/app/cuenta.tsx` (pantalla). Servidor: `supabase/esquema.sql`.

## Lo que tiene que hacer Eric en Supabase

### 1. Crear las tablas

En el panel del proyecto, **SQL Editor › New query**, pegar entero
`supabase/esquema.sql` y darle a *Run*. Se puede volver a ejecutar sin romper
nada (por ejemplo, si cambia el esquema).

Crea las tablas `casas`, `miembros` y `elementos`, las reglas RLS (cada cuenta
solo ve lo de sus casas), las funciones con las que se escribe
(`crear_casa`, `unirse_casa`, `salir_casa`, `subir_cambios`, `borrar_cuenta`)
y añade `elementos` al tiempo real.

### 2. Que el correo lleve el código y no un enlace

Hecho el 15/11/2026 en las plantillas **Magic link or OTP** y **Confirm sign
up** (asunto «Tu código para Aguante / Your Aguante code», en español con una
línea en inglés). Ojo: el panel **solo deja editar las plantillas con un SMTP
propio** (paso 3); sin él usa las de serie, que solo llevan el enlace
(`{{ .ConfirmationURL }}`) y la app no podría entrar.

Si hubiera que rehacerlas, en **Authentication › Emails › Templates** el
cuerpo lleva el código, por ejemplo:

```html
<h2>Tu código para Aguante</h2>
<p>Escribe este código en la app: <strong>{{ .Token }}</strong></p>
<p>Caduca en una hora. Si no lo has pedido tú, ignora este correo.</p>
```

La documentación de Supabase dice que el correo manda un enlace o un código
según lleve `{{ .ConfirmationURL }}` o `{{ .Token }}`. Lo de cambiar también
*Confirm signup* es por precaución: no he comprobado cuál de las dos recibe una
cuenta nueva la primera vez, así que conviene que las dos lleven el código.

### 3. Correo propio (SMTP) antes de que lo use alguien más que tú

Según la documentación de Supabase (Auth › SMTP), el servicio de correo que
viene de serie:

- **solo manda correos a las direcciones del equipo del proyecto**; a las
  demás responde *Email address not authorized* (la app lo enseña como «Ese
  correo aún no puede recibir códigos…»);
- manda como mucho **2 correos por hora** y es solo para pruebas.

Como además hace falta para editar las plantillas, se configuró el 15/11/2026
con **Gmail** (Eric no tiene dominio propio; Resend lo exige) en
**Authentication › Emails › SMTP Settings**: servidor `smtp.gmail.com`,
puerto 587, nombre «Aguante». El usuario tiene que ser la dirección completa
de la cuenta de Google y la contraseña, una «contraseña de aplicación» de esa
cuenta (exige la verificación en dos pasos). Al activar el SMTP propio el
límite sube a 30 correos por hora (ajustable en *Rate limits*). Ni el puerto
ni el límite diario de Gmail están comprobados en una página oficial: si falla
el envío, probar el 465.

### 4. Saber que el plan gratuito se pausa

La página de precios de Supabase dice que los proyectos gratuitos se pausan
tras **1 semana de inactividad**. No dice qué cuenta como actividad ni cómo se
reactiva uno pausado por eso. Si se pausa, la app sigue funcionando en local y
la sincronización falla hasta que se reactive desde el panel.

## Publicarlo

`@supabase/supabase-js` y sus dependencias no tienen código nativo (comprobado
en `node_modules`), y la sesión se guarda con `expo-sqlite`, que ya estaba en
el APK. Así que llega con EAS Update (`npm run publicar -- -m "…"`), sin APK
nuevo.

## Lo que está probado y lo que no

- Probado: el SQL en un Postgres 17 con `auth` simulado (crear, unirse con el
  código en minúsculas y sin guion, código malo, bloqueo tras 10 intentos,
  quien no es de la casa no ve ni escribe nada, anon no puede nada, gana el
  último cambio, hora adelantada recortada, salir y borrar la casa al salir la
  última persona). Los tests de `compartido.ts`. Las tres vistas de la pantalla
  en la web y que un cambio local se apunta como pendiente.
- Sin probar: entrar con un código de verdad, la sincronización entre dos
  móviles y el tiempo real contra el proyecto real (faltan los pasos 1 y 2), y
  nada en el móvil.
