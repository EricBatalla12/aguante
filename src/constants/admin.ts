// Quién tiene el panel de admin (src/app/admin.tsx): el correo con el que ha
// entrado en la cuenta. El panel solo dispara pruebas en el propio móvil
// (avisos, la tarea en segundo plano, un aviso simulado, un error de prueba):
// no da ningún permiso en el servidor, así que basta con mirarlo en la app.
// Si algún día hace cosas en el servidor, el rol tiene que comprobarse allí
// (una función como `soy_pro()`), no solo aquí.

export const ADMINS = ['ericbatalla16@gmail.com'];
