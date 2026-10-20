/* compras.js — Admin: historial de compras y ventana con el detalle de cada pedido. Requiere utils.js y comun.js. */

const tablaCompras = document.getElementById('tabla-compras');
const detalleCompra = document.getElementById('compra-detalle');
let compras = [];

async function cargarCompras() {
  try {
    const datos = await api('compras.php');
    compras = Array.isArray(datos) ? datos : datos.compras;
    pintarTabla();
  } catch (err) {
    tablaCompras.innerHTML = `<tr><td colspan="6" class="admin-vacio">${escaparHTML(err.message)}</td></tr>`;
  }
}

function pintarTabla() {
  if (!compras.length) {
    tablaCompras.innerHTML = '<tr><td colspan="6" class="admin-vacio">Aún no hay compras.</td></tr>';
    return;
  }

  tablaCompras.innerHTML = compras.map(c => `
    <tr>
      <td>${Number(c.id)}</td>
      <td>${escaparHTML(formatearFecha(c.creado_en))}</td>
      <td><strong>${escaparHTML(c.nombre_cliente)}</strong></td>
      <td><span class="etiqueta">${c.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</span></td>
      <td class="derecha">${formatearPrecio(c.total)}</td>
      <td>
        <div class="acciones">
          <button type="button" class="btn btn-chico btn-secundario" data-id="${Number(c.id)}">Ver</button>
        </div>
      </td>
    </tr>`).join('');
}

function pintarDetalle(c) {
  const items = c.items || c.detalle || [];
  document.getElementById('compra-titulo').textContent = `Compra #${Number(c.id)}`;

  detalleCompra.innerHTML = `
    <p><strong>${escaparHTML(c.nombre_cliente)}</strong></p>
    <p>${escaparHTML(c.telefono || 'Sin teléfono')}</p>
    <p>${escaparHTML(c.direccion)}</p>
    <p>${escaparHTML(formatearFecha(c.creado_en))} · ${c.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</p>
    <div class="tabla-caja" style="margin-top:16px">
      <table class="tabla">
        <thead>
          <tr><th>Producto</th><th>Cant.</th><th class="derecha">Precio</th><th class="derecha">Subtotal</th></tr>
        </thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td>${escaparHTML(i.nombre)}</td>
              <td>${Number(i.cantidad)}</td>
              <td class="derecha">${formatearPrecio(i.precio)}</td>
              <td class="derecha">${formatearPrecio(i.precio * i.cantidad)}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="derecha"><strong>Total</strong></td>
            <td class="derecha"><strong>${formatearPrecio(c.total)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

async function verDetalle(id) {
  try {
    const datos = await api(`compras.php?id=${id}`);
    pintarDetalle(datos.compra || datos);
    abrirModal('modal-compra');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

tablaCompras.addEventListener('click', e => {
  const boton = e.target.closest('[data-id]');
  if (boton) verDetalle(Number(boton.dataset.id));
});

adminListo.then(cargarCompras);