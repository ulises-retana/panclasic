/* badge.js — Contador del carrito en el menú. Requiere utils.js. */

function actualizarBadge() {
  const insignia = document.querySelector('.cart-badge');
  if (!insignia) return;
  const total = totalPiezas();
  insignia.textContent = total;
  insignia.style.display = total > 0 ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', actualizarBadge);
document.addEventListener('carrito:actualizado', actualizarBadge);
window.addEventListener('storage', actualizarBadge);