/* carrito.js — Carrito, cantidades y formulario de compra. Requiere utils.js y badge.js. */

const API_COMPRAS = '../php/compras.php';
const lista = document.getElementById('lista-carrito');
const totalEl = document.getElementById('total-carrito');
const formulario = document.getElementById('form-compra');

function pintarCarrito() {
  const carrito = leerCarrito();
  const boton = formulario.querySelector('[type="submit"]');

  if (!carrito.length) {
    lista.innerHTML = '<p>Tu carrito está vacío.</p>';
    totalEl.textContent = formatearPrecio(0);
    boton.disabled = true;
    actualizarBadge();
    return;
  }

  lista.innerHTML = carrito.map(l => `
    <div class="linea-carrito">
      <img src="${escaparHTML(rutaImagen(l.imagen))}" alt="${escaparHTML(l.nombre)}">
      <div class="linea-info">
        <h3>${escaparHTML(l.nombre)}</h3>
        <span>${formatearPrecio(l.precio)}</span>
      </div>
      <div class="linea-cantidad">
        <button type="button" data-accion="restar" data-id="${Number(l.id)}">−</button>
        <span>${Number(l.cantidad)}</span>
        <button type="button" data-accion="sumar" data-id="${Number(l.id)}">+</button>
      </div>
      <span class="linea-subtotal">${formatearPrecio(l.precio * l.cantidad)}</span>
      <button type="button" data-accion="quitar" data-id="${Number(l.id)}" aria-label="Quitar">✕</button>
    </div>`).join('');

  totalEl.textContent = formatearPrecio(carrito.reduce((s, l) => s + l.precio * l.cantidad, 0));
  boton.disabled = false;
  actualizarBadge();
}

function cambiarCantidad(id, accion) {
  let carrito = leerCarrito();
  const linea = carrito.find(l => Number(l.id) === id);
  if (!linea) return;

  if (accion === 'sumar') linea.cantidad++;
  if (accion === 'restar') linea.cantidad--;
  if (accion === 'quitar' || linea.cantidad < 1) {
    carrito = carrito.filter(l => Number(l.id) !== id);
  }

  guardarCarrito(carrito);
  pintarCarrito();
}

async function enviarCompra(e) {
  e.preventDefault();
  const carrito = leerCarrito();
  if (!carrito.length) return;

  const datos = new FormData(formulario);
  const boton = formulario.querySelector('[type="submit"]');
  boton.disabled = true;

  try {
    const res = await fetch(API_COMPRAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_cliente: datos.get('nombre_cliente'),
        telefono: datos.get('telefono'),
        direccion: datos.get('direccion'),
        metodo_pago: datos.get('metodo_pago'),
        items: carrito.map(l => ({ producto_id: Number(l.id), cantidad: l.cantidad }))
      })
    });
    const respuesta = await res.json();
    if (!res.ok) throw new Error(respuesta.error || 'No se pudo registrar la compra');

    guardarCarrito([]);
    formulario.reset();
    mostrarToast('¡Compra registrada! Gracias por tu pedido');
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    pintarCarrito();
  }
}

lista.addEventListener('click', e => {
  const boton = e.target.closest('[data-accion]');
  if (boton) cambiarCantidad(Number(boton.dataset.id), boton.dataset.accion);
});

formulario.addEventListener('submit', enviarCompra);
document.addEventListener('DOMContentLoaded', pintarCarrito);