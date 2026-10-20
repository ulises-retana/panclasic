/* mensajes.js — Admin: bandeja de mensajes de contacto, lectura y borrado. Requiere utils.js y comun.js. */

const tablaMensajes = document.getElementById('tabla-mensajes');
const botonBorrar = document.getElementById('confirmar-borrar');
let mensajes = [];
let idPorBorrar = null;

async function cargarMensajes() {
  try {
    const datos = await api('mensajes.php');
    mensajes = Array.isArray(datos) ? datos : datos.mensajes;
    pintarTabla();
  } catch (err) {
    tablaMensajes.innerHTML = `<tr><td colspan="5" class="admin-vacio">${escaparHTML(err.message)}</td></tr>`;
  }
}

function resumen(texto) {
  return texto.length > 80 ? texto.slice(0, 80) + '…' : texto;
}

function pintarTabla() {
  if (!mensajes.length) {
    tablaMensajes.innerHTML = '<tr><td colspan="5" class="admin-vacio">No hay mensajes.</td></tr>';
    return;
  }

  tablaMensajes.innerHTML = mensajes.map(m => `
    <tr>
      <td>${escaparHTML(formatearFecha(m.creado_en))}</td>
      <td><strong>${escaparHTML(m.nombre)}</strong></td>
      <td>${escaparHTML(m.email)}</td>
      <td>${escaparHTML(resumen(m.mensaje))}</td>
      <td>
        <div class="acciones">
          <button type="button" class="btn btn-chico btn-secundario" data-accion="ver" data-id="${Number(m.id)}">Ver</button>
          <button type="button" class="btn btn-chico btn-peligro" data-accion="borrar" data-id="${Number(m.id)}">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');
}

function verMensaje(m) {
  document.getElementById('mensaje-titulo').textContent = `Mensaje de ${m.nombre}`;
  document.getElementById('mensaje-detalle').innerHTML = `
    <p><strong>${escaparHTML(m.email)}</strong></p>
    <p>${escaparHTML(formatearFecha(m.creado_en))}</p>
    <p style="margin-top:14px;white-space:pre-wrap">${escaparHTML(m.mensaje)}</p>`;
  abrirModal('modal-mensaje');
}

async function borrarMensaje() {
  if (!idPorBorrar) return;
  botonBorrar.disabled = true;
  try {
    await api(`mensajes.php?id=${idPorBorrar}`, { method: 'DELETE' });
    cerrarModal('modal-borrar');
    mostrarToast('Mensaje eliminado');
    await cargarMensajes();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    botonBorrar.disabled = false;
    idPorBorrar = null;
  }
}

tablaMensajes.addEventListener('click', e => {
  const boton = e.target.closest('[data-accion]');
  if (!boton) return;
  const id = Number(boton.dataset.id);
  const mensaje = mensajes.find(m => Number(m.id) === id);
  if (!mensaje) return;

  if (boton.dataset.accion === 'ver') verMensaje(mensaje);
  if (boton.dataset.accion === 'borrar') {
    idPorBorrar = id;
    abrirModal('modal-borrar');
  }
});

botonBorrar.addEventListener('click', borrarMensaje);
adminListo.then(cargarMensajes);