# Plan de mejoras — Pan Clásico

Repo: `ulises-retana/panclasic` · Actualizado: 2026-10-15 (paso 2: `mensajes.php`)

## Cómo trabajamos

- **Un archivo a la vez.** Cada entrega es un archivo (o un grupo muy pequeño) que se copia sobre el del proyecto.
- **Código mínimo y limpio.** Si algo sobra, se borra; si algo se repite, se une.
- **Todo se prueba** con PHP y MySQL reales antes de entregarlo.
- **Seguridad primero**, limpieza después, funciones nuevas al final.

Leyenda: ✅ hecho y probado · ⏳ siguiente · ⬜ pendiente

---

## Fase 1 — Seguridad y cuentas ✅

| Estado | Archivo | Qué se hizo |
|---|---|---|
| ✅ | `sql/database.sql` | La tabla `admins` pasó a `usuarios` con rol `cliente` o `admin`. Se quitó el admin `admin123` del repo. |
| ✅ | `php/includes/auth.php` | Ahora son funciones: `usuario_actual()`, `es_admin()`, `requerir_rol()`. Cookie de sesión con `httponly` y `samesite`. |
| ✅ | `php/login.php` | Inicio de sesión por correo. Devuelve el rol y ya no recorta la contraseña. |
| ✅ | `php/registro.php` *(nuevo)* | Crea cuentas siempre como `cliente`. El rol nunca viene del navegador. |
| ✅ | `public/js/auth.js` *(nuevo)* | Lógica compartida de login y registro. |
| ✅ | `public/login.html`, `public/registro.html` | Formularios nuevos. Se quitó el recuadro con la clave por defecto. |
| ✅ | `php/config/db.php` | Se quitó el CORS abierto (`*`). Ahora también tiene la función `fallar()` que usan todos los endpoints para responder errores. |
| ✅ | `public/js/utils.js` *(nuevo)* | Función `escaparHTML()` contra XSS. |
| ✅ | `catalogo.js`, `carrito.js`, `contacto.js` | Textos escapados antes de mostrarlos. |
| ✅ | `public/js/admin.js` | Solo deja entrar a usuarios con rol `admin`. |
| ✅ | `productos.php`, `mensajes.php`, `compras.php` | Crear, editar, borrar y listar datos privados exigen ser admin. |

## Fase 2 — Revisión archivo por archivo

### Backend (PHP)

| Estado | Archivo | Qué se revisa o corrige |
|---|---|---|
| ✅ | `php/compras.php` | Se corrigió el error de `$item['nombre']`. Las líneas repetidas se suman para validar el stock. Se validan longitudes y datos de tarjeta. Usa la función `fallar()` de `db.php`. |
| ✅ | `php/mensajes.php` | Valida longitudes (nombre 150, correo 200, mensaje 2000) y que cada campo sea texto. Se quitó el código sobrante (soporte de `$_POST` y el alias `correo`, que ningún archivo usaba). Usa `fallar()`. |
| ⏳ | `php/productos.php` | Rechazar precios o stock negativos y nombres vacíos. Convertir tipos en el `PUT`. Usar `fallar()`. |
| ⬜ | `php/logout.php` | Revisión corta. |
| ⬜ | `login.php` y `registro.php` | Usar `fallar()` para quitar los bloques de error repetidos. |
| ⬜ | Archivos vacíos | Borrar `php/config.php` y `php/includes/nav.php`. |

### Frontend (JavaScript)

| Estado | Archivo | Qué se revisa o corrige |
|---|---|---|
| ⬜ | `public/js/utils.js` | Reunir aquí lo repetido: `mostrarToast()` (hoy copiada 4 veces), formato de precios, lectura del carrito, ruta de imágenes. |
| ⬜ | `public/js/badge.js` | Revisión. |
| ⬜ | `public/js/catalogo.js` | Quitar duplicados y los `onclick` en línea. Usar `utils.js`. |
| ⬜ | `public/js/carrito.js` | Quitar duplicados. Decidir qué hacer con los datos de tarjeta. Usar `utils.js`. |
| ⬜ | `public/js/contacto.js` | Quitar duplicados. Usar `utils.js`. |
| ⬜ | `public/js/admin.js` | El más grande (unas 1000 líneas). Quitar duplicados y simplificar. |
| ⬜ | Archivos vacíos | Borrar `public/js/app.js` y `public/js/inicio.js`. |

### Páginas y estilos

| Estado | Archivo | Qué se revisa o corrige |
|---|---|---|
| ⬜ | `public/index.html`, `catalogo.html`, `carrito.html`, `contacto.html` | Quitar estilos en línea. Agregar enlace de "Iniciar sesión" en el menú. |
| ⬜ | `public/admin.html` | Quitar los 17 estilos en línea y los `onclick`. |
| ⬜ | `public/css/styles.css` | Hoy son 2812 líneas para todo. Separar `styles.css` (público) y `admin.css` (panel). Quitar selectores duplicados. |

### Base de datos

| Estado | Archivo | Qué se revisa o corrige |
|---|---|---|
| ⬜ | `sql/database.sql` | Hacerlo re-ejecutable (hoy duplica los productos de ejemplo). Decidir si se guardan titular y vencimiento de tarjeta. Opcional: ligar `compras` a `usuarios`. |

---

## Fase 3 — Funciones nuevas

| Estado | Función | Notas |
|---|---|---|
| ⬜ | Recuperar contraseña | Render gratis bloquea el correo por SMTP; habría que usar un servicio por API web (por ejemplo Brevo o Mailgun). |
| ⬜ | Subir imágenes de productos | El disco gratis de Render no es permanente; las imágenes tendrían que guardarse en un servicio externo (por ejemplo Cloudinary) o dentro del repo. |
| ⬜ | Qué ganan las cuentas de cliente | Por ejemplo, ver su historial de pedidos. Hoy existen, pero todavía no hacen nada extra. |
| ⬜ | Límite de intentos en el login | Frena las contraseñas probadas a la fuerza. |

## Fase 4 — Publicar en Render + Aiven

| Estado | Paso | Notas |
|---|---|---|
| ⬜ | Crear la base MySQL en Aiven | Plan gratis. Copiar host, puerto, usuario, contraseña y nombre de la base. |
| ⬜ | Importar `database.sql` en Aiven | Desde MySQL Workbench o DBeaver. Ejecutar ahí el `UPDATE` que convierte tu cuenta en admin. |
| ⬜ | Cambiar `php/config/db.php` | Leer los datos de variables de entorno y conectar con cifrado. |
| ⬜ | Agregar un `Dockerfile` | Solo si el backend sigue en PHP (Render lo necesita para PHP). |
| ⬜ | Configurar Render | Variables de entorno con los datos de Aiven. Los servicios gratis se duermen tras 15 minutos sin visitas. |

---

## Decisiones pendientes

1. **PHP o Node/Express** para el backend final. Hoy seguimos en PHP. Si eliges Node, se conserva la base de datos y todo el frontend, pero cambia el backend.
2. **Tarjeta:** guardar solo los últimos 4 dígitos, o no guardar nada y dejar solo efectivo hasta tener un pago real.
3. **Recuperación de contraseña:** confirmar el servicio de correo por API.
4. **Imágenes:** Cloudinary o dentro del repo.

## Nota sobre XAMPP y los estilos del login

Si el login se ve sin estilos en XAMPP pero bien en Visual Studio Code, casi siempre hay dos causas posibles:

- La carpeta `htdocs` tiene una copia vieja del proyecto. Lo más seguro es trabajar directamente dentro de `htdocs`.
- La caché del navegador sigue usando un CSS anterior. Se arregla refrescando con Ctrl+F5.

Para comprobar cuál es: abre `localhost/panclasico/public/css/styles.css` y busca el texto "PANTALLA DE LOGIN".
