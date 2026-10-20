/* mis-pedidos.js — Historial de pedidos del cliente con sesión iniciada. Requiere utils.js y badge.js. */

const API_MIS_PEDIDOS = '../php/compras.php?mias=1';
const listaPedidos = document.getElementById('pedidos');

function fechaLegible(valor) {
  const fecha = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(fecha.getTime())
    ? ''
    : fecha.toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
}

function tarjetaPedido(p) {
  return `
    <article class="carrito-caja">
      <div class="ticket-dato">
        <strong>Pedido #${Number(p.id)}</strong>
        <span>${escaparHTML(fechaLegible(p.creado_en))}</span>
      </div>
      <div class="ticket-dato">
        <span>Pago</span>
        <span>${p.metodo_pago === 'tarjeta' ? '💳 Tarjeta' : '💵 Efectivo'}</span>
      </div>
      <div class="ticket-dato">
        <span>Entrega</span>
        <span>${escaparHTML(p.direccion)}</span>
      </div>
      <div class="ticket-separador"></div>
      <div class="ticket-productos">
        ${p.items.map(i => `
          <div class="ticket-fila">
            <span>${Number(i.cantidad)} × ${escaparHTML(i.nombre)}</span>
            <span>${formatearPrecio(i.precio * i.cantidad)}</span>
          </div>`).join('')}
      </div>
      <div class="ticket-separador"></div>
      <div class="ticket-total">
        <span>Total</span>
        <strong>${formatearPrecio(p.total)}</strong>
      </div>
    </article>`;
}

async function cargarPedidos() {
  try {
    const res = await fetch(API_MIS_PEDIDOS);
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error);

    listaPedidos.innerHTML = datos.length
      ? datos.map(tarjetaPedido).join('')
      : `<div class="carrito-vacio">
           <span class="vacio-icono">🧺</span>
           <h2>Aún no tienes pedidos</h2>
           <p>Cuando hagas una compra con tu cuenta, aparecerá aquí.</p>
           <a href="catalogo.html" class="boton btn-ir-catalogo">Ver catálogo</a>
         </div>`;
  } catch (err) {
    listaPedidos.innerHTML = `<div class="carrito-vacio"><h2>No se pudieron cargar tus pedidos</h2><p>${escaparHTML(err.message || 'Inténtalo de nuevo.')}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', cargarPedidos);