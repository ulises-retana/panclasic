/* carrito.js — Carrito, cantidades y formulario de compra. Requiere utils.js y badge.js. */

const API_COMPRAS = '../php/compras.php';
const contenedor = document.getElementById('carrito');
const subtotalEl = document.getElementById('checkout-subtotal');
const totalEl = document.getElementById('carrito-total-monto');
const formulario = document.getElementById('form-checkout');
const cajaTarjeta = document.getElementById('datos-tarjeta');
const botonCompra = formulario.querySelector('[type="submit"]');

function filaCarrito(l) {
  const imagen = l.imagen
    ? `<img class="cart-item-img" src="${escaparHTML(rutaImagen(l.imagen))}" alt="${escaparHTML(l.nombre)}">`
    : '<span class="cart-item-emoji" aria-hidden="true">🥖</span>';
  const id = Number(l.id);

  return `
    <div class="carrito-item">
      <div class="cart-item-info">
        <div class="cart-item-img-wrap">${imagen}</div>
        <div>
          <h3 class="cart-item-titulo">${escaparHTML(l.nombre)}</h3>
          <span class="cart-item-unidad">${escaparHTML(l.unidad || '')}</span>
        </div>
      </div>
      <span class="cart-item-precio">${formatearPrecio(l.precio)}</span>
      <div class="cart-item-cantidad col-centrada">
        <div class="cantidad-control">
          <button type="button" class="btn-cant" data-accion="restar" data-id="${id}" aria-label="Quitar una pieza">−</button>
          <span class="cant-numero">${Number(l.cantidad)}</span>
          <button type="button" class="btn-cant" data-accion="sumar" data-id="${id}" aria-label="Agregar una pieza">+</button>
        </div>
      </div>
      <strong class="cart-item-subtotal col-derecha">${formatearPrecio(l.precio * l.cantidad)}</strong>
      <div class="cart-item-accion col-accion">
        <button type="button" class="btn-eliminar-item" data-accion="quitar" data-id="${id}" aria-label="Quitar del carrito">🗑️</button>
      </div>
    </div>`;
}

function pintarCarrito() {
  const carrito = leerCarrito();
  const total = formatearPrecio(totalCarrito(carrito));
  subtotalEl.textContent = total;
  totalEl.textContent = total;
  botonCompra.disabled = !carrito.length;

  if (!carrito.length) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        <span class="vacio-icono">🧺</span>
        <h2>Tu canasta está vacía</h2>
        <p>Agrega tus panes favoritos desde el catálogo.</p>
        <a href="catalogo.html" class="boton btn-ir-catalogo">Ver catálogo</a>
      </div>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="carrito-tabla-header">
      <span>Producto</span>
      <span>Precio</span>
      <span class="col-centrada">Cantidad</span>
      <span class="col-derecha">Subtotal</span>
      <span class="col-accion"></span>
    </div>
    <div class="carrito-lista">${carrito.map(filaCarrito).join('')}</div>
    <div class="carrito-acciones-pie">
      <button type="button" class="btn-vaciar-carrito" data-accion="vaciar">Vaciar canasta</button>
      <a href="catalogo.html" class="enlace-seguir-comprando">← Seguir comprando</a>
    </div>`;
}

function cambiarCarrito(accion, id) {
  let carrito = leerCarrito();

  if (accion === 'vaciar') {
    carrito = [];
  } else {
    const linea = carrito.find(l => Number(l.id) === id);
    if (!linea) return;
    if (accion === 'sumar') linea.cantidad++;
    if (accion === 'restar') linea.cantidad--;
    if (accion === 'quitar' || linea.cantidad < 1) {
      carrito = carrito.filter(l => Number(l.id) !== id);
    }
  }

  guardarCarrito(carrito);
  pintarCarrito();
}

async function enviarCompra(e) {
  e.preventDefault();
  const carrito = leerCarrito();
  if (!carrito.length) return;

  const datos = new FormData(formulario);
  botonCompra.disabled = true;

  try {
    const res = await fetch(API_COMPRAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nombre: datos.get('cliente_nombre'),
        cliente_telefono: datos.get('cliente_telefono'),
        cliente_direccion: datos.get('cliente_direccion'),
        metodo_pago: datos.get('metodo_pago'),
        items: carrito.map(l => ({ id: Number(l.id), cantidad: l.cantidad }))
      })
    });
    const respuesta = await res.json();
    if (!res.ok) throw new Error(respuesta.error || 'No se pudo registrar la compra');

    guardarCarrito([]);
    formulario.reset();
    cajaTarjeta.style.display = 'none';
    mostrarToast(`Pedido #${respuesta.id} registrado por ${formatearPrecio(respuesta.total)}. ¡Gracias!`);
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    pintarCarrito();
  }
}

contenedor.addEventListener('click', e => {
  const boton = e.target.closest('[data-accion]');
  if (boton) cambiarCarrito(boton.dataset.accion, Number(boton.dataset.id));
});

formulario.addEventListener('change', e => {
  if (e.target.name === 'metodo_pago') {
    cajaTarjeta.style.display = e.target.value === 'tarjeta' ? '' : 'none';
  }
});

formulario.addEventListener('submit', enviarCompra);
document.addEventListener('DOMContentLoaded', pintarCarrito);