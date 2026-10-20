/* resumen.js — Admin: tarjetas con totales y enlaces a cada sección. Requiere utils.js y comun.js. */

function lista(datos, clave) {
  return Array.isArray(datos) ? datos : datos[clave];
}

function mostrar(id, valor) {
  document.getElementById(id).textContent = valor;
}

async function cargarResumen() {
  const [productos, compras, mensajes, usuarios] = await Promise.allSettled([
    api('productos.php?todos=1'),
    api('compras.php'),
    api('mensajes.php'),
    api('usuarios.php')
  ]);

  if (productos.status === 'fulfilled') {
    mostrar('r-productos', lista(productos.value, 'productos').filter(p => Number(p.activo) === 1).length);
  }

  if (compras.status === 'fulfilled') {
    const filas = lista(compras.value, 'compras');
    mostrar('r-pedidos', filas.length);
    mostrar('r-ventas', formatearPrecio(filas.reduce((suma, c) => suma + Number(c.total), 0)));
  }

  if (mensajes.status === 'fulfilled') {
    mostrar('r-mensajes', lista(mensajes.value, 'mensajes').length);
  }

  if (usuarios.status === 'fulfilled') {
    mostrar('r-usuarios', lista(usuarios.value, 'usuarios').length);
  }
}

adminListo.then(cargarResumen);