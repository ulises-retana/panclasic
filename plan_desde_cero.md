# Plan desde cero — Pan Clásico

Repo: `ulises-retana/panclasic` · Actualizado: 2026-10-18

## Punto de partida

| Qué | Estado |
|---|---|
| Base de datos (`sql/database.sql`) | ✅ Hecha y probada |
| HTML y CSS del diseño | Existen. Se ajustan cuando llegue el paso de cada página |
| PHP y JavaScript | Se escriben desde cero, en el orden de abajo |

## Cómo trabajamos

- **Un paso a la vez.** Cada entrega es un archivo (o un par muy pequeño) que se copia al proyecto.
- **Código mínimo y bien estructurado.** Cabecera que explica el archivo, secciones claras y nada que no se use. Si algo se repite, vive en un solo lugar.
- **Todo se prueba** con PHP y MySQL reales antes de entregarlo.
- **Seguridad desde el primer archivo:** consultas preparadas, texto escapado en pantalla y rutas de admin protegidas.
- **Orden por dependencias:** base de datos → PHP → páginas públicas → panel admin → funciones nuevas → publicar.

Leyenda: ✅ hecho · ⏳ siguiente · ⬜ pendiente

---

## Fase A — Base de datos

| # | Estado | Archivo | Qué contiene |
|---|---|---|---|
| 1 | ✅ | `sql/database.sql` | Tablas `usuarios` (con rol), `productos`, `compras`, `compras_detalle` y `mensajes`. Re-ejecutable, con 11 productos de ejemplo. |

## Fase B — Backend en PHP

Todo devuelve JSON. Cada archivo usa lo que hizo el anterior.

| # | Estado | Archivo | Qué contiene |
|---|---|---|---|
| 2 | ⏳ | `php/config/db.php` | Conexión PDO leyendo variables de entorno (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_SSL_CA`). Valores por defecto para XAMPP. Función `fallar()` para responder errores. |
| 3 | ⬜ | `php/includes/auth.php` | Sesión segura y funciones `usuario_actual()`, `es_admin()`, `iniciar_sesion_usuario()` y `requerir_rol()`. |
| 4 | ⬜ | `php/login.php` + `php/logout.php` | Iniciar sesión por correo, consultar la sesión y cerrarla. |
| 5 | ⬜ | `php/registro.php` | Crear cuenta de cliente. El rol nunca viene del navegador. |
| 6 | ⬜ | `php/productos.php` | Catálogo público. Crear, editar y desactivar solo para admin. Valida precio, stock y largos. |
| 7 | ⬜ | `php/compras.php` | Registrar compra con transacción y descuento de stock. Historial solo para admin. |
| 8 | ⬜ | `php/mensajes.php` | Guardar mensajes de contacto. Listar y borrar solo para admin. |
| 9 | ⬜ | `php/usuarios.php` | Solo admin: listar cuentas y cambiar el rol. Nadie cambia su propio rol y siempre queda al menos un admin. |

## Fase C — Páginas públicas

| # | Estado | Archivo | Qué contiene |
|---|---|---|---|
| 10 | ⬜ | `public/js/utils.js` | Lo compartido: escapar HTML, avisos (toast), formato de precio, lectura del carrito y ruta de imágenes. Una sola vez. |
| 11 | ⬜ | `public/js/badge.js` | Contador del carrito en el menú. |
| 12 | ⬜ | `catalogo.html` + `js/catalogo.js` | Tarjetas de productos, filtros por categoría y botón de agregar al carrito. |
| 13 | ⬜ | `index.html` | Página de inicio. Enlace de "Iniciar sesión" en el menú. |
| 14 | ⬜ | `carrito.html` + `js/carrito.js` | Carrito, cantidades y formulario de compra. |
| 15 | ⬜ | `contacto.html` + `js/contacto.js` | Formulario de contacto. |
| 16 | ⬜ | `login.html` + `registro.html` + `js/auth.js` | Pantallas de acceso. Cada rol entra a su página. |

## Fase D — Panel de administración (una página por sección)

```
public/admin/
├── index.html       Resumen con totales
├── productos.html   Crear, editar y activar/desactivar productos
├── compras.html     Historial y detalle de pedidos
├── mensajes.html    Bandeja de contacto
└── usuarios.html    Cuentas y cambio de rol
```

| # | Estado | Archivo | Qué contiene |
|---|---|---|---|
| 17 | ⬜ | `css/admin.css` + `js/admin/comun.js` | Estilos del panel separados del CSS público. Código compartido: comprobar sesión de admin, menú, cerrar sesión, ventanas y avisos. |
| 18 | ⬜ | `admin/productos.html` + `js/admin/productos.js` | Tabla de productos y ventana para crear o editar. |
| 19 | ⬜ | `admin/compras.html` + `js/admin/compras.js` | Tabla de compras y ventana con el detalle. |
| 20 | ⬜ | `admin/mensajes.html` + `js/admin/mensajes.js` | Mensajes recibidos y borrado. |
| 21 | ⬜ | `admin/usuarios.html` + `js/admin/usuarios.js` | Tabla de cuentas con selector de rol. |
| 22 | ⬜ | `admin/index.html` + `js/admin/resumen.js` | Tarjetas de resumen con enlaces a cada sección. |

## Fase E — Funciones nuevas

| # | Estado | Función | Notas |
|---|---|---|---|
| 23 | ⬜ | Límite de intentos en el login | Frena las contraseñas probadas a la fuerza. |
| 24 | ⬜ | Recuperar contraseña | Necesita un servicio de correo por API (Render gratis bloquea el SMTP). Requiere nueva tabla de códigos. |
| 25 | ⬜ | Subir imágenes de productos | El disco gratis de Render no es permanente: Cloudinary o imágenes dentro del repo. |
| 26 | ⬜ | "Mis pedidos" para clientes | Usa la columna opcional `compras.usuario_id`. Si no lo quieres, se quita esa columna. |

## Fase F — Publicar

| # | Estado | Paso | Notas |
|---|---|---|---|
| 27 | ⬜ | Aiven + Render | (a) Crear la base MySQL en Aiven e importar `database.sql` sin las dos primeras líneas. (b) Agregar el `Dockerfile` (Render necesita Docker para PHP). (c) Configurar el servicio en Render con las variables de entorno de Aiven. Los servicios gratis se duermen tras 15 minutos sin visitas. |

---

## Decisiones tomadas

- **Backend en PHP**, con la base de datos en Aiven y el proyecto en Render.
- **Panel admin por páginas**, con una página de Usuarios para cambiar roles.
- **Sin datos de tarjeta:** las compras solo guardan si el pago fue `efectivo` o `tarjeta`.
- **Se reconstruye desde cero:** solo se conservan la base de datos, el HTML y el CSS.

## Decisiones pendientes

1. **Servicio de correo** para recuperar contraseña (paso 24).
2. **Imágenes:** Cloudinary o dentro del repo (paso 25).
3. **"Mis pedidos"** (paso 26): ¿se hace o se quita la columna `usuario_id`?

## Para tener en cuenta con XAMPP

Si una página se ve sin estilos en XAMPP pero bien en Visual Studio Code, casi siempre es una copia vieja del proyecto en `htdocs` o la caché del navegador (se arregla con Ctrl+F5). Lo más seguro es trabajar directamente dentro de `htdocs`.
