/* productos.js — Admin: tabla de productos y ventana para crear, editar o activar/desactivar, con subida de imagen. Requiere utils.js y comun.js. */

const tablaProductos = document.getElementById('tabla-productos');
const formProducto = document.getElementById('form-producto');
const listaCategorias = document.getElementById('categorias');
const zonaImagen = document.getElementById('zona-imagen');
const zonaPrevia = document.getElementById('zona-previa');
const zonaTexto = document.getElementById('zona-texto');
const entradaArchivo = document.getElementById('p-archivo');
const TEXTO_ZONA = 'Arrastra una imagen aquí o haz clic para seleccionarla';
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;
let productos = [];
let urlTemporal = null;

function imagenAdmin(imagen) {
  const ruta = rutaImagen(imagen);
  return /^(https?:)?\/\//.test(ruta) || ruta.startsWith('/') ? ruta : '../' + ruta;
}

function mostrarPrevia(origen, texto = TEXTO_ZONA) {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
    urlTemporal = null;
  }
  zonaPrevia.hidden = !origen;
  if (origen) zonaPrevia.src = origen;
  zonaTexto.textContent = texto;
}

function elegirArchivo(archivo) {
  if (!archivo) return;
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    mostrarToast('Usa una imagen JPG, PNG o WebP', 'error');
    return;
  }
  if (archivo.size > MAX_BYTES) {
    mostrarToast('La imagen no debe superar 2 MB', 'error');
    return;
  }

  const transferencia = new DataTransfer();
  transferencia.items.add(archivo);
  entradaArchivo.files = transferencia.files;

  mostrarPrevia(null);
  urlTemporal = URL.createObjectURL(archivo);
  zonaPrevia.src = urlTemporal;
  zonaPrevia.hidden = false;
  zonaTexto.textContent = archivo.name;
}

async function subirImagen(archivo) {
  const datos = new FormData();
  datos.append('imagen', archivo);
  const res = await fetch(API_ADMIN + 'subir_imagen.php', { method: 'POST', body: datos });

  let respuesta = null;
  try { respuesta = await res.json(); } catch { respuesta = null; }

  if (res.status === 401 || res.status === 403) {
    window.location.href = URL_LOGIN;
    throw new Error('Sesión no válida');
  }
  if (!res.ok) throw new Error((respuesta && respuesta.error) || 'No se pudo subir la imagen');
  return respuesta.ruta;
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

  if (producto && producto.imagen) {
    mostrarPrevia(imagenAdmin(producto.imagen), 'Arrastra otra imagen o haz clic para cambiarla');
  } else {
    mostrarPrevia(null);
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
  const boton = formProducto.querySelector('[type="submit"]');
  boton.disabled = true;

  try {
    const archivo = f.archivo.files[0];
    const imagen = archivo ? await subirImagen(archivo) : f.imagen.value.trim();

    const cuerpo = {
      nombre: f.nombre.value.trim(),
      descripcion: f.descripcion.value.trim(),
      precio: Number(f.precio.value),
      stock: Number(f.stock.value),
      unidad: f.unidad.value.trim(),
      categoria: f.categoria.value.trim(),
      imagen,
      activo: Number(f.activo.value)
    };
    if (id) cuerpo.id = id;

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

zonaImagen.addEventListener('click', () => entradaArchivo.click());

zonaImagen.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    entradaArchivo.click();
  }
});

zonaImagen.addEventListener('dragover', e => {
  e.preventDefault();
  zonaImagen.classList.add('arrastrando');
});

zonaImagen.addEventListener('dragleave', () => zonaImagen.classList.remove('arrastrando'));

zonaImagen.addEventListener('drop', e => {
  e.preventDefault();
  zonaImagen.classList.remove('arrastrando');
  elegirArchivo(e.dataTransfer.files[0]);
});

entradaArchivo.addEventListener('change', () => elegirArchivo(entradaArchivo.files[0]));

document.getElementById('btn-nuevo').addEventListener('click', () => abrirFormulario(null));
formProducto.addEventListener('submit', guardarProducto);
adminListo.then(cargarProductos);