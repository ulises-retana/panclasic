/* productos.js — Admin: tabla de productos y ventana para crear, editar o activar/desactivar. Requiere utils.js y comun.js. */

const tablaProductos = document.getElementById('tabla-productos');
const formProducto = document.getElementById('form-producto');
const listaCategorias = document.getElementById('categorias');
let productos = [];

function imagenAdmin(imagen) {
  const ruta = rutaImagen(imagen);
  return /^(https?:)?\/\//.test(ruta) || ruta.startsWith('/') ? ruta : '../' + ruta;
}

async function cargarProductos() {
  try {
    const datos = await api('productos.php?todos=1');
    productos = Array.isArray(datos) ? datos : datos.productos;
    pintarTabla();
  } catch (err) {
    tablaProductos.innerHTML = `<tr><td colspan="7" class="admin-vacio">${escaparHTML(err.message)}</td></tr>`;
  }
}

function pintarTabla() {
  listaCategorias.innerHTML = [...new Set(productos.map(p => p.categoria))]
    .map(c => `<option value="${escaparHTML(c)}"></option>`).join('');

  if (!productos.length) {
    tablaProductos.innerHTML = '<tr><td colspan="7" class="admin-vacio">Aún no hay productos.</td></tr>';
    return;
  }

  tablaProductos.innerHTML = productos.map(p => {
    const activo = Number(p.activo) === 1;
    return `
      <tr>
        <td><img class="tabla-miniatura" src="${escaparHTML(imagenAdmin(p.imagen))}" alt="" loading="lazy"></td>
        <td><strong>${escaparHTML(p.nombre)}</strong></td>
        <td><span class="etiqueta">${escaparHTML(p.categoria)}</span></td>
        <td>${formatearPrecio(p.precio)} / ${escaparHTML(p.unidad)}</td>
        <td>${Number(p.stock)}</td>
        <td><span class="etiqueta ${activo ? 'etiqueta-ok' : 'etiqueta-off'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <div class="acciones">
            <button type="button" class="btn btn-chico btn-secundario" data-accion="editar" data-id="${Number(p.id)}">Editar</button>
            <button type="button" class="btn btn-chico ${activo ? 'btn-peligro' : ''}" data-accion="estado" data-id="${Number(p.id)}">${activo ? 'Desactivar' : 'Activar'}</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function abrirFormulario(producto) {
  formProducto.reset();
  document.getElementById('modal-titulo').textContent = producto ? 'Editar producto' : 'Nuevo producto';
  formProducto.elements.id.value = producto ? producto.id : '';

  if (producto) {
    for (const campo of ['nombre', 'descripcion', 'precio', 'stock', 'unidad', 'categoria', 'imagen']) {
      formProducto.elements[campo].value = producto[campo] ?? '';
    }
    formProducto.elements.activo.value = Number(producto.activo) === 1 ? '1' : '0';
  }
  abrirModal('modal-producto');
}

function cuerpoProducto(p, cambios = {}) {
  return {
    id: Number(p.id),
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    precio: Number(p.precio),
    stock: Number(p.stock),
    unidad: p.unidad,
    categoria: p.categoria,
    imagen: p.imagen || '',
    activo: Number(p.activo),
    ...cambios
  };
}

async function guardarProducto(e) {
  e.preventDefault();
  const f = formProducto.elements;
  const id = Number(f.id.value);
  const cuerpo = {
    nombre: f.nombre.value.trim(),
    descripcion: f.descripcion.value.trim(),
    precio: Number(f.precio.value),
    stock: Number(f.stock.value),
    unidad: f.unidad.value.trim(),
    categoria: f.categoria.value.trim(),
    imagen: f.imagen.value.trim(),
    activo: Number(f.activo.value)
  };
  if (id) cuerpo.id = id;

  const boton = formProducto.querySelector('[type="submit"]');
  boton.disabled = true;
  try {
    await api('productos.php', { method: id ? 'PUT' : 'POST', cuerpo });
    cerrarModal('modal-producto');
    mostrarToast(id ? 'Producto actualizado' : 'Producto creado');
    await cargarProductos();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

async function cambiarEstado(producto) {
  const activo = Number(producto.activo) === 1 ? 0 : 1;
  try {
    await api('productos.php', { method: 'PUT', cuerpo: cuerpoProducto(producto, { activo }) });
    mostrarToast(activo ? 'Producto activado' : 'Producto desactivado');
    await cargarProductos();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

tablaProductos.addEventListener('click', e => {
  const boton = e.target.closest('[data-accion]');
  if (!boton) return;
  const producto = productos.find(p => Number(p.id) === Number(boton.dataset.id));
  if (!producto) return;
  if (boton.dataset.accion === 'editar') abrirFormulario(producto);
  if (boton.dataset.accion === 'estado') cambiarEstado(producto);
});

document.getElementById('btn-nuevo').addEventListener('click', () => abrirFormulario(null));
formProducto.addEventListener('submit', guardarProducto);
adminListo.then(cargarProductos);