/* catalogo.js — Tarjetas de productos, buscador, filtros por categoría y agregar al carrito. Requiere utils.js y badge.js. */

const API_PRODUCTOS = '../php/productos.php';
const rejilla = document.getElementById('productos');
const filtros = document.getElementById('catalogo-filtros');
const mensajeCarga = document.getElementById('catalogo-mensaje-carga');
const buscador = document.getElementById('input-busqueda');
const botonLimpiar = document.getElementById('btn-limpiar-busqueda');
let productos = [];
let categoriaActiva = 'Todos';
let texto = '';

function normalizar(valor) {
  return String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function cargarProductos() {
  mensajeCarga.style.display = '';
  try {
    const res = await fetch(API_PRODUCTOS);
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error);
    productos = datos;
    pintarFiltros();
    pintarProductos();
  } catch {
    rejilla.innerHTML = `
      <div class="catalogo-error">
        <span class="error-icono">⚠️</span>
        <h3>No se pudo cargar el catálogo</h3>
        <p>Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" class="boton btn-reintentar" data-reintentar>Reintentar</button>
      </div>`;
  } finally {
    mensajeCarga.style.display = 'none';
  }
}

function pintarFiltros() {
  const categorias = ['Todos', ...new Set(productos.map(p => p.categoria))];
  filtros.innerHTML = categorias.map(c =>
    `<button type="button" class="filtro-btn${c === categoriaActiva ? ' activo' : ''}" data-categoria="${escaparHTML(c)}">${escaparHTML(c)}</button>`
  ).join('');
}

function tarjeta(p) {
  const hayStock = Number(p.stock) > 0;
  const imagen = p.imagen
    ? `<img class="producto-img" src="${escaparHTML(rutaImagen(p.imagen))}" alt="${escaparHTML(p.nombre)}" loading="lazy">`
    : '<span class="producto-emoji" aria-hidden="true">🥖</span>';

  return `
    <article class="producto-card${hayStock ? '' : ' producto-agotado'}">
      <div class="producto-img-wrap">${imagen}</div>
      <div class="producto-cuerpo">
        <span class="producto-categoria">${escaparHTML(p.categoria.toUpperCase())}</span>
        <h3 class="producto-titulo">${escaparHTML(p.nombre)}</h3>
        <p class="producto-descripcion">${escaparHTML(p.descripcion || '')}</p>
        <div class="producto-detalles">
          <div class="producto-precio">
            <span class="precio-monto">${formatearPrecio(p.precio)}</span>
            <span class="precio-unidad">/ ${escaparHTML(p.unidad)}</span>
          </div>
          <span class="producto-stock${hayStock ? '' : ' stock-agotado'}">${hayStock ? `${Number(p.stock)} disponibles` : 'Agotado'}</span>
        </div>
        <button type="button" class="btn-agregar-carrito" data-id="${Number(p.id)}"${hayStock ? '' : ' disabled'}>
          ${hayStock ? 'Agregar al carrito' : 'Agotado'}
        </button>
      </div>
    </article>`;
}

function pintarProductos() {
  const busqueda = normalizar(texto.trim());
  const lista = productos.filter(p =>
    (categoriaActiva === 'Todos' || p.categoria === categoriaActiva) &&
    normalizar(p.nombre).includes(busqueda)
  );

  rejilla.innerHTML = lista.length
    ? lista.map(tarjeta).join('')
    : '<div class="catalogo-vacio"><span class="vacio-icono">🔍</span><h3>No encontramos panes con ese filtro</h3></div>';
}

function agregarAlCarrito(id, boton) {
  const producto = productos.find(p => Number(p.id) === id);
  if (!producto) return;

  const carrito = leerCarrito();
  const linea = carrito.find(l => Number(l.id) === id);

  if ((linea ? linea.cantidad : 0) + 1 > Number(producto.stock)) {
    mostrarToast('No hay más existencias de este producto', 'aviso');
    return;
  }

  if (linea) {
    linea.cantidad++;
  } else {
    carrito.push({
      id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      unidad: producto.unidad,
      imagen: producto.imagen,
      cantidad: 1
    });
  }

  guardarCarrito(carrito);
  mostrarToast(`${producto.nombre} agregado al carrito`);
  boton.classList.add('boton-agregado');
  setTimeout(() => boton.classList.remove('boton-agregado'), 700);
}

filtros.addEventListener('click', e => {
  const boton = e.target.closest('[data-categoria]');
  if (!boton) return;
  categoriaActiva = boton.dataset.categoria;
  pintarFiltros();
  pintarProductos();
});

rejilla.addEventListener('click', e => {
  if (e.target.closest('[data-reintentar]')) {
    cargarProductos();
    return;
  }
  const boton = e.target.closest('.btn-agregar-carrito');
  if (boton && !boton.disabled) agregarAlCarrito(Number(boton.dataset.id), boton);
});

buscador.addEventListener('input', () => {
  texto = buscador.value;
  botonLimpiar.style.display = texto ? '' : 'none';
  pintarProductos();
});

botonLimpiar.addEventListener('click', () => {
  buscador.value = '';
  texto = '';
  botonLimpiar.style.display = 'none';
  buscador.focus();
  pintarProductos();
});

document.addEventListener('DOMContentLoaded', cargarProductos);