/* badge.js — Contador del carrito en el menú. Requiere utils.js. */

function actualizarBadge() {
  const el = document.getElementById('contador-carrito');
  if (!el) return;
  const total = leerCarrito().reduce((suma, linea) => suma + linea.cantidad, 0);
  el.textContent = total;
  el.hidden = total === 0;
}

document.addEventListener('DOMContentLoaded', actualizarBadge);
window.addEventListener('storage', actualizarBadge);