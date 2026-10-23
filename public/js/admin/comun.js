/* comun.js — Base del panel admin: sesión, menú, cierre de sesión, API, ventanas y fechas. Requiere utils.js. */

const API_ADMIN = '../../php/';
const URL_LOGIN = '../login.html';
const SECCIONES = [
  ['index.html', 'Resumen', '📊'],
  ['productos.html', 'Productos', '🥖'],
  ['compras.html', 'Compras', '🧾'],
  ['mensajes.html', 'Mensajes', '✉️'],
  ['usuarios.html', 'Usuarios', '👥']
];

async function api(archivo, { cuerpo, ...opciones } = {}) {
  const res = await fetch(API_ADMIN + archivo, {
    ...opciones,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });

  let datos = null;
  try { datos = await res.json(); } catch { datos = null; }

  if (res.status === 401 || res.status === 403) {
    window.location.href = URL_LOGIN;
    throw new Error('Sesión no válida');
  }
  if (!res.ok) throw new Error((datos && datos.error) || 'No se pudo completar la solicitud');
  return datos;
}

function formatearFecha(valor) {
  const fecha = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(fecha.getTime())
    ? ''
    : fecha.toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
}

function abrirModal(id) {
  document.getElementById(id).showModal();
}

function cerrarModal(id) {
  document.getElementById(id).close();
}

function pintarMenu(usuario) {
  const menu = document.getElementById('admin-menu');
  if (!menu) return;

  const actual = location.pathname.split('/').pop() || 'index.html';
  menu.innerHTML = `
    <div class="admin-marca"><img src="../img/logo-cursiva.png" alt="Pan Clásico" height="40"><small>Administración</small></div>
    <nav class="admin-nav">
      ${SECCIONES.map(([archivo, texto, icono]) =>
        `<a href="${archivo}"${archivo === actual ? ' class="activo"' : ''}><span>${icono}</span>${texto}</a>`
      ).join('')}
      <a href="../index.html"><span>🏠</span>Volver al sitio</a>
    </nav>
    <div class="admin-usuario">
      <div><strong>${escaparHTML(usuario.nombre || 'Administrador')}</strong>${escaparHTML(usuario.email || '')}</div>
      <button type="button" id="admin-salir">Cerrar sesión</button>
    </div>`;

  document.getElementById('admin-salir').addEventListener('click', async () => {
    try { await api('logout.php', { method: 'POST' }); } catch { /* se redirige igual */ }
    window.location.href = URL_LOGIN;
  });
}

async function iniciarAdmin() {
  try {
    const datos = await api('login.php');
    const usuario = datos.usuario || datos;
    if (usuario.rol !== 'admin') throw new Error('Acceso denegado');
    pintarMenu(usuario);
    document.body.classList.add('admin-listo');
    return usuario;
  } catch {
    window.location.href = URL_LOGIN;
    return new Promise(() => {});
  }
}

document.addEventListener('click', e => {
  const cerrar = e.target.closest('[data-cerrar]');
  if (cerrar) {
    cerrar.closest('dialog').close();
  } else if (e.target.matches('dialog')) {
    e.target.close();
  }
});

const adminListo = iniciarAdmin();
