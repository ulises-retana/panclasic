/* sesion.js — Menú público: círculo de cuenta con nombre, correo y cerrar sesión; enlace Admin. Requiere utils.js. */

const API_SESION = '../php/login.php';
const API_SALIR = '../php/logout.php';
const CLAVE_SESION = 'sesion';
const enlaceLogin = document.querySelector('.menu a[href="login.html"]');
const itemLogin = enlaceLogin ? enlaceLogin.closest('li') : null;
let itemCuenta = null;
let itemAdmin = null;

function iniciales(nombre) {
  const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : (partes[0] || '?').slice(0, 2);
  return letras.toUpperCase();
}

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function enlace(href, texto) {
  const a = crear('a', 'cuenta-opcion', texto);
  a.href = href;
  return a;
}

function cerrarMenu() {
  if (!itemCuenta) return;
  itemCuenta.querySelector('.cuenta-menu').hidden = true;
  itemCuenta.querySelector('.cuenta-btn').setAttribute('aria-expanded', 'false');
}

async function cerrarSesion() {
  try { await fetch(API_SALIR, { method: 'POST' }); } catch { /* se redirige igual */ }
  try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* sin almacenamiento */ }
  window.location.href = 'index.html';
}

function pintarCuenta(usuario) {
  quitarCuenta();
  if (!itemLogin) return;

  const admin = usuario.rol === 'admin';
  const boton = crear('button', 'cuenta-btn', iniciales(usuario.nombre));
  boton.type = 'button';
  boton.setAttribute('aria-haspopup', 'true');
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-label', 'Mi cuenta');

  const cabecera = crear('div', 'cuenta-cabecera');
  cabecera.append(
    crear('strong', 'cuenta-nombre', usuario.nombre),
    crear('span', 'cuenta-correo', usuario.email || ''),
    crear('span', 'cuenta-rol', admin ? 'Administrador' : 'Cliente')
  );

  const salir = crear('button', 'cuenta-opcion cuenta-salir', 'Cerrar sesión');
  salir.type = 'button';
  salir.addEventListener('click', cerrarSesion);

  const menu = crear('div', 'cuenta-menu');
  menu.hidden = true;
  menu.append(cabecera, enlace('mis-pedidos.html', 'Mis pedidos'));
  if (admin) menu.append(enlace('admin/index.html', 'Panel de administración'));
  menu.append(salir);

  boton.addEventListener('click', e => {
    e.stopPropagation();
    const abrir = menu.hidden;
    menu.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
  });

  itemCuenta = crear('li', 'cuenta');
  itemCuenta.append(boton, menu);
  itemLogin.hidden = true;
  document.querySelector('.menu').append(itemCuenta);

  const pedidos = document.querySelector('.menu > li > a[href="mis-pedidos.html"]');
  if (admin && pedidos) {
    const a = crear('a', '', 'Admin');
    a.href = 'admin/index.html';
    itemAdmin = crear('li');
    itemAdmin.append(a);
    pedidos.closest('li').after(itemAdmin);
  }
}

function quitarCuenta() {
  if (itemCuenta) itemCuenta.remove();
  if (itemAdmin) itemAdmin.remove();
  itemCuenta = null;
  itemAdmin = null;
  if (itemLogin) itemLogin.hidden = false;
}

function leerGuardada() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION)); } catch { return null; }
}

function guardar(usuario) {
  try {
    if (usuario) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch { /* sin almacenamiento */ }
}

async function iniciarSesionMenu() {
  if (!itemLogin) return;

  const guardada = leerGuardada();
  if (guardada && guardada.nombre) pintarCuenta(guardada);

  try {
    const res = await fetch(API_SESION);
    if (!res.ok) throw new Error('Sin sesión');
    const datos = await res.json();
    if (!datos.usuario) throw new Error('Sin sesión');
    guardar(datos.usuario);
    pintarCuenta(datos.usuario);
  } catch {
    guardar(null);
    quitarCuenta();
  }
}

document.addEventListener('click', e => {
  if (itemCuenta && !itemCuenta.contains(e.target)) cerrarMenu();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarMenu();
});

document.addEventListener('DOMContentLoaded', iniciarSesionMenu);