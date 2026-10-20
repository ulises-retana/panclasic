/* catalogo.js — Tarjetas de productos, filtros por categoría y agregar al carrito. Requiere utils.js y badge.js. */

const API_PRODUCTOS = '../php/productos.php';
const rejilla = document.getElementById('productos');
const filtros = document.getElementById('filtros');
let productos = [];
let categoriaActiva = 'Todos';

async function cargarProductos() {
  try {
    const res = await fetch(API_PRODUCTOS);
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error);
    productos = Array.isArray(datos) ? datos : datos.productos;
    pintarFiltros();
    pintarProductos();
  } catch {
    rejilla.innerHTML = '<p>No se pudo cargar el catálogo.</p>';
  }
}

function pintarFiltros() {
  const categorias = ['Todos', ...new Set(productos.map(p => p.categoria))];
  filtros.innerHTML = categorias.map(c =>
    `<button type="button" class="filtro${c === categoriaActiva ? ' activo' : ''}" data-categoria="${escaparHTML(c)}">${escaparHTML(c)}</button>`
  ).join('');
}

function pintarProductos() {
  const lista = categoriaActiva === 'Todos'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  if (!lista.length) {
    rejilla.innerHTML = '<p>No hay productos en esta categoría.</p>';
    return;
  }

  rejilla.innerHTML = lista.map(p => `
    <article class="producto">
      <img src="${escaparHTML(rutaImagen(p.imagen))}" alt="${escaparHTML(p.nombre)}" loading="lazy">
      <h3>${escaparHTML(p.nombre)}</h3>
      <p>${escaparHTML(p.descripcion || '')}</p>
      <span class="precio">${formatearPrecio(p.precio)} / ${escaparHTML(p.unidad)}</span>
      <button type="button" class="btn" data-id="${Number(p.id)}" ${Number(p.stock) > 0 ? '' : 'disabled'}>
        ${Number(p.stock) > 0 ? 'Agregar al carrito' : 'Agotado'}
      </button>
    </article>`).join('');
}

function agregarAlCarrito(id) {
  const producto = productos.find(p => Number(p.id) === id);
  if (!producto) return;

  const carrito = leerCarrito();
  const linea = carrito.find(l => Number(l.id) === id);
  const cantidadActual = linea ? linea.cantidad : 0;

  if (cantidadActual + 1 > Number(producto.stock)) {
    mostrarToast('No hay más existencias de este producto', 'error');
    return;
  }

  if (linea) {
    linea.cantidad++;
  } else {
    carrito.push({
      id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      imagen: producto.imagen,
      cantidad: 1
    });
  }

  guardarCarrito(carrito);
  actualizarBadge();
  mostrarToast(`${producto.nombre} agregado al carrito`);
}

filtros.addEventListener('click', e => {
  const boton = e.target.closest('[data-categoria]');
  if (!boton) return;
  categoriaActiva = boton.dataset.categoria;
  pintarFiltros();
  pintarProductos();
});

rejilla.addEventListener('click', e => {
  const boton = e.target.closest('[data-id]');
  if (boton && !boton.disabled) agregarAlCarrito(Number(boton.dataset.id));
});

document.addEventListener('DOMContentLoaded', cargarProductos);