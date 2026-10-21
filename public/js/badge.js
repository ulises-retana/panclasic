/* badge.js — Menú público: contador del carrito y enlace Admin para administradores. Requiere utils.js. */

const API_SESION = '../php/login.php';

function actualizarBadge() {
  const insignia = document.querySelector('.cart-badge');
  if (!insignia) return;
  const total = totalPiezas();
  insignia.textContent = total;
  insignia.style.display = total > 0 ? 'flex' : 'none';
}

async function mostrarEnlaceAdmin() {
  const pedidos = document.querySelector('.menu a[href="mis-pedidos.html"]');
  if (!pedidos || document.querySelector('.menu a[href="admin/index.html"]')) return;

  try {
    const res = await fetch(API_SESION);
    if (!res.ok) return;
    const datos = await res.json();
    if (!datos.usuario || datos.usuario.rol !== 'admin') return;
  } catch {
    return;
  }

  const item = document.createElement('li');
  const enlace = document.createElement('a');
  enlace.href = 'admin/index.html';
  enlace.textContent = 'Admin';
  item.appendChild(enlace);
  pedidos.closest('li').after(item);
}

document.addEventListener('DOMContentLoaded', () => {
  actualizarBadge();
  mostrarEnlaceAdmin();
});
document.addEventListener('carrito:actualizado', actualizarBadge);
window.addEventListener('storage', actualizarBadge);