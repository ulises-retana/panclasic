/* usuarios.js — Admin: tabla de cuentas con selector de rol. Requiere utils.js y comun.js. */

const tablaUsuarios = document.getElementById('tabla-usuarios');
let usuarios = [];
let yo = null;

async function cargarUsuarios() {
  try {
    const datos = await api('usuarios.php');
    usuarios = Array.isArray(datos) ? datos : datos.usuarios;
    pintarTabla();
  } catch (err) {
    tablaUsuarios.innerHTML = `<tr><td colspan="4" class="admin-vacio">${escaparHTML(err.message)}</td></tr>`;
  }
}

function pintarTabla() {
  if (!usuarios.length) {
    tablaUsuarios.innerHTML = '<tr><td colspan="4" class="admin-vacio">No hay usuarios.</td></tr>';
    return;
  }

  tablaUsuarios.innerHTML = usuarios.map(u => {
    const propio = yo && Number(u.id) === Number(yo.id);
    return `
      <tr>
        <td><strong>${escaparHTML(u.nombre)}</strong>${propio ? ' <span class="etiqueta">Tú</span>' : ''}</td>
        <td>${escaparHTML(u.email)}</td>
        <td>${escaparHTML(formatearFecha(u.creado_en))}</td>
        <td>
          <select data-id="${Number(u.id)}" data-rol="${escaparHTML(u.rol)}" ${propio ? 'disabled' : ''}>
            <option value="cliente"${u.rol === 'cliente' ? ' selected' : ''}>Cliente</option>
            <option value="admin"${u.rol === 'admin' ? ' selected' : ''}>Admin</option>
          </select>
        </td>
      </tr>`;
  }).join('');
}

async function cambiarRol(selector) {
  const id = Number(selector.dataset.id);
  const rol = selector.value;
  selector.disabled = true;
  try {
    await api('usuarios.php', { method: 'PUT', cuerpo: { id, rol } });
    mostrarToast('Rol actualizado');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
  await cargarUsuarios();
}

tablaUsuarios.addEventListener('change', e => {
  const selector = e.target.closest('select[data-id]');
  if (selector) cambiarRol(selector);
});

adminListo.then(async usuario => {
  yo = usuario;
  await cargarUsuarios();
});