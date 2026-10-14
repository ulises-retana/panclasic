/**
 * =========================================================
 * Pan Clásico — Panel de Administración (admin.js)
 * =========================================================
 * Paso 13: Lógica completa del panel de administración:
 * - Verificación de sesión y logout
 * - CRUD de productos (Crear, Leer, Actualizar, Desactivar)
 * - Historial y desglose detallado de compras/pedidos
 * - Bandeja y eliminación de mensajes de contacto
 * - Métricas KPI en tiempo real
 * =========================================================
 */

// Rutas de API PHP
const API_LOGIN_URL = '../php/login.php';
const API_LOGOUT_URL = '../php/logout.php';
const API_PRODUCTOS_URL = '../php/productos.php';
const API_COMPRAS_URL = '../php/compras.php';
const API_MENSAJES_URL = '../php/mensajes.php';

// Estado global de la aplicación
const state = {
    usuario: null,
    productos: [],
    pedidos: [],
    mensajes: [],
    filtroProd: {
        busqueda: '',
        categoria: 'todas',
        estado: 'todos'
    },
    filtroPedidos: {
        busqueda: ''
    },
    modalConfirmarAccion: null
};

// =========================================================
// 1. INICIALIZACIÓN Y SEGURIDAD (AUTH CHECK)
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
    const sesionValida = await verificarSesionAdmin();
    if (!sesionValida) return;

    inicializarEventos();
    await cargarDatosIniciales();
});

/**
 * Verifica si hay una sesión activa de administrador en PHP.
 * Si no está autenticado, redirige a login.html.
 */
async function verificarSesionAdmin() {
    try {
        const resp = await fetch(API_LOGIN_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!resp.ok) {
            window.location.replace('login.html');
            return false;
        }

        const data = await resp.json();

        if (data.ok && data.autenticado) {
            state.usuario = data.usuario || 'Admin';
            actualizarInterfazUsuario(state.usuario);
            return true;
        } else {
            window.location.replace('login.html');
            return false;
        }
    } catch (err) {
        console.error('Error al comprobar la sesión:', err);
        window.location.replace('login.html');
        return false;
    }
}

/**
 * Actualiza el nombre y avatar del usuario en el topbar
 */
function actualizarInterfazUsuario(usuario) {
    const elNombre = document.getElementById('admin-user-name');
    const elInicial = document.getElementById('admin-user-initial');
    if (elNombre) elNombre.textContent = usuario;
    if (elInicial && usuario) elInicial.textContent = usuario.charAt(0).toUpperCase();
}

/**
 * Cierra la sesión del administrador
 */
async function cerrarSesion() {
    try {
        await fetch(API_LOGOUT_URL, { method: 'POST' });
    } catch (e) {
        console.warn('Error al llamar a logout:', e);
    } finally {
        mostrarToast('Sesión cerrada. Redirigiendo...', 'aviso');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    }
}

// =========================================================
// 2. REGISTRO DE EVENTOS
// =========================================================
function inicializarEventos() {
    // Botón de Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            abrirConfirmacion(
                'Cerrar Sesión',
                '¿Estás seguro de que deseas salir del panel de administración?',
                cerrarSesion
            );
        });
    }

    // Tabs de navegación
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            cambiarPestaña(targetTab);
        });
    });

    // Filtros de Productos
    const inputFiltroProd = document.getElementById('filtro-prod-buscar');
    if (inputFiltroProd) {
        inputFiltroProd.addEventListener('input', (e) => {
            state.filtroProd.busqueda = e.target.value.toLowerCase().trim();
            renderizarTablaProductos();
        });
    }

    const selectFiltroCat = document.getElementById('filtro-prod-categoria');
    if (selectFiltroCat) {
        selectFiltroCat.addEventListener('change', (e) => {
            state.filtroProd.categoria = e.target.value;
            renderizarTablaProductos();
        });
    }

    const selectFiltroEstado = document.getElementById('filtro-prod-estado');
    if (selectFiltroEstado) {
        selectFiltroEstado.addEventListener('change', (e) => {
            state.filtroProd.estado = e.target.value;
            renderizarTablaProductos();
        });
    }

    // Botón Nuevo Producto
    const btnNuevoProd = document.getElementById('btn-nuevo-producto');
    if (btnNuevoProd) {
        btnNuevoProd.addEventListener('click', () => abrirModalProducto());
    }

    // Formulario de Producto (Submit)
    const formProd = document.getElementById('form-producto');
    if (formProd) {
        formProd.addEventListener('submit', guardarProducto);
    }

    // Previsualización de imagen al escribir en input imagen
    const inputImagen = document.getElementById('prod-imagen');
    if (inputImagen) {
        inputImagen.addEventListener('input', (e) => {
            actualizarPreviewImagen(e.target.value.trim());
        });
    }

    // Filtro de Pedidos
    const inputFiltroPed = document.getElementById('filtro-pedidos-buscar');
    if (inputFiltroPed) {
        inputFiltroPed.addEventListener('input', (e) => {
            state.filtroPedidos.busqueda = e.target.value.toLowerCase().trim();
            renderizarTablaPedidos();
        });
    }

    // Botones de Refrescar
    const btnRefrescarPed = document.getElementById('btn-refrescar-pedidos');
    if (btnRefrescarPed) {
        btnRefrescarPed.addEventListener('click', () => cargarPedidos(true));
    }

    const btnRefrescarMsg = document.getElementById('btn-refrescar-mensajes');
    if (btnRefrescarMsg) {
        btnRefrescarMsg.addEventListener('click', () => cargarMensajes(true));
    }

    // Cierre de Modales
    document.querySelectorAll('[data-cerrar]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-cerrar');
            cerrarModal(modalId);
        });
    });

    // Cerrar modal al hacer click fuera del contenido
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cerrarModal(overlay.id);
            }
        });
    });

    // Cerrar modal con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalAbierto = document.querySelector('.modal-overlay.active');
            if (modalAbierto) {
                cerrarModal(modalAbierto.id);
            }
        }
    });

    // Botón de Confirmación de Acción
    const btnConfirmar = document.getElementById('btn-confirmar-accion');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            if (typeof state.modalConfirmarAccion === 'function') {
                state.modalConfirmarAccion();
            }
            cerrarModal('modal-confirmar');
        });
    }
}

/**
 * Cambia la pestaña activa en la interfaz
 */
function cambiarPestaña(tabId) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
        const isActive = b.getAttribute('data-tab') === tabId;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.admin-tab-content').forEach(section => {
        section.classList.toggle('active', section.id === tabId);
    });
}

// =========================================================
// 3. CARGA DE DATOS INICIALES
// =========================================================
async function cargarDatosIniciales() {
    await Promise.all([
        cargarProductos(),
        cargarPedidos(),
        cargarMensajes()
    ]);
    actualizarKPIs();
}

/**
 * Carga todos los productos (incluidos inactivos) desde la API
 */
async function cargarProductos(mostrarNotificacion = false) {
    const tbody = document.getElementById('tbody-productos');
    try {
        const resp = await fetch(`${API_PRODUCTOS_URL}?todos=1`);
        const data = await resp.json();

        if (resp.ok && data.ok) {
            state.productos = data.productos || [];
            renderizarTablaProductos();
            actualizarBadge('badge-tab-productos', state.productos.length);
            actualizarKPIs();
            if (mostrarNotificacion) mostrarToast('Catálogo de productos actualizado', 'exito');
        } else {
            throw new Error(data.error || 'Error al obtener productos.');
        }
    } catch (err) {
        console.error('Error al cargar productos:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <h3>No se pudieron cargar los productos</h3>
                        <p>${escaparHTML(err.message)}</p>
                    </td>
                </tr>
            `;
        }
        mostrarToast('Error al conectar con la base de datos de productos', 'error');
    }
}

/**
 * Carga el historial de compras desde la API
 */
async function cargarPedidos(mostrarNotificacion = false) {
    const tbody = document.getElementById('tbody-pedidos');
    try {
        const resp = await fetch(API_COMPRAS_URL);
        const data = await resp.json();

        if (resp.ok && data.ok) {
            state.pedidos = data.compras || [];
            renderizarTablaPedidos();
            actualizarBadge('badge-tab-pedidos', state.pedidos.length);
            actualizarKPIs();
            if (mostrarNotificacion) mostrarToast('Historial de compras actualizado', 'exito');
        } else {
            throw new Error(data.error || 'Error al consultar compras.');
        }
    } catch (err) {
        console.error('Error al cargar pedidos:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <h3>No se pudieron cargar los pedidos</h3>
                        <p>${escaparHTML(err.message)}</p>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Carga los mensajes de contacto recibidos
 */
async function cargarMensajes(mostrarNotificacion = false) {
    const contenedor = document.getElementById('contenedor-mensajes');
    try {
        const resp = await fetch(API_MENSAJES_URL);
        const data = await resp.json();

        if (resp.ok && data.ok) {
            state.mensajes = data.mensajes || [];
            renderizarMensajes();
            actualizarBadge('badge-tab-mensajes', state.mensajes.length);
            actualizarKPIs();
            if (mostrarNotificacion) mostrarToast('Bandeja de mensajes actualizada', 'exito');
        } else {
            throw new Error(data.error || 'Error al consultar mensajes.');
        }
    } catch (err) {
        console.error('Error al cargar mensajes:', err);
        if (contenedor) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Error al cargar mensajes</h3>
                    <p>${escaparHTML(err.message)}</p>
                </div>
            `;
        }
    }
}

// =========================================================
// 4. GESTIÓN Y RENDERIZADO DE PRODUCTOS (CRUD)
// =========================================================

/**
 * Renderiza la tabla de productos aplicando filtros activos
 */
function renderizarTablaProductos() {
    const tbody = document.getElementById('tbody-productos');
    if (!tbody) return;

    let lista = [...state.productos];

    // Filtro por texto
    if (state.filtroProd.busqueda) {
        const q = state.filtroProd.busqueda;
        lista = lista.filter(p =>
            (p.nombre && p.nombre.toLowerCase().includes(q)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
            (p.id && String(p.id).includes(q))
        );
    }

    // Filtro por categoría
    if (state.filtroProd.categoria !== 'todas') {
        lista = lista.filter(p =>
            p.categoria && p.categoria.toLowerCase() === state.filtroProd.categoria.toLowerCase()
        );
    }

    // Filtro por estado
    if (state.filtroProd.estado === 'activos') {
        lista = lista.filter(p => Number(p.activo) === 1);
    } else if (state.filtroProd.estado === 'inactivos') {
        lista = lista.filter(p => Number(p.activo) === 0);
    } else if (state.filtroProd.estado === 'bajo-stock') {
        lista = lista.filter(p => Number(p.stock) <= 5);
    }

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-icon">🥖</div>
                    <h3>No se encontraron productos</h3>
                    <p>Intenta con otros términos de búsqueda o agrega un nuevo pan al catálogo.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const activo = Number(p.activo) === 1;
        const stock = Number(p.stock);

        let stockBadge = `<span style="font-weight:700;">${stock}</span>`;
        if (stock === 0) {
            stockBadge = `<span class="badge-status badge-out-stock">Agotado (0)</span>`;
        } else if (stock <= 5) {
            stockBadge = `<span class="badge-status badge-low-stock">Bajo (${stock})</span>`;
        }

        const imagenHTML = p.imagen
            ? `<img src="${escaparHTML(p.imagen)}" alt="${escaparHTML(p.nombre)}" onerror="this.onerror=null; this.parentElement.innerHTML='🥖';">`
            : '🥖';

        return `
            <tr data-id="${p.id}">
                <td style="font-weight: 700; color: var(--color-admin-muted);">#${p.id}</td>
                <td>
                    <div class="prod-cell">
                        <div class="prod-thumbnail">${imagenHTML}</div>
                        <div>
                            <div class="prod-info-name">${escaparHTML(p.nombre)}</div>
                            <div class="prod-info-desc">${escaparHTML(p.descripcion || 'Sin descripción')}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge-pill-category">${escaparHTML(p.categoria || 'Pan')}</span>
                </td>
                <td style="font-weight: 800; color: var(--color-admin-accent);">
                    $${formatearDinero(p.precio)} <span style="font-size:11px; font-weight:normal; color:var(--color-admin-muted);">${escaparHTML(p.unidad || 'pza')}</span>
                </td>
                <td>${stockBadge}</td>
                <td>
                    <span class="badge-status ${activo ? 'badge-active' : 'badge-inactive'}">
                        ${activo ? '● Activo' : '○ Inactivo'}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div class="action-buttons" style="justify-content: flex-end;">
                        <button type="button" class="btn-table-action" title="Editar producto" onclick="abrirModalProducto(${p.id})">
                            ✏️
                        </button>
                        <button type="button" class="btn-table-action" title="${activo ? 'Desactivar del catálogo' : 'Activar en catálogo'}" onclick="toggleEstadoProducto(${p.id}, ${activo ? 0 : 1})">
                            ${activo ? '👁️' : '🔒'}
                        </button>
                        <button type="button" class="btn-table-action delete" title="Desactivar/Eliminar" onclick="confirmarEliminarProducto(${p.id}, '${escaparHTML(p.nombre)}')">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Abre el modal para crear o editar un producto
 */
function abrirModalProducto(productoId = null) {
    const form = document.getElementById('form-producto');
    if (!form) return;
    form.reset();

    const txtTitulo = document.getElementById('modal-producto-modo-texto');
    const inputId = document.getElementById('prod-id');
    const inputNombre = document.getElementById('prod-nombre');
    const selectCat = document.getElementById('prod-categoria');
    const inputUnidad = document.getElementById('prod-unidad');
    const inputPrecio = document.getElementById('prod-precio');
    const inputStock = document.getElementById('prod-stock');
    const txtDesc = document.getElementById('prod-descripcion');
    const inputImg = document.getElementById('prod-imagen');
    const checkActivo = document.getElementById('prod-activo');

    if (productoId) {
        const prod = state.productos.find(p => Number(p.id) === Number(productoId));
        if (!prod) return;

        txtTitulo.textContent = `Editar Producto #${prod.id}`;
        inputId.value = prod.id;
        inputNombre.value = prod.nombre || '';
        selectCat.value = (prod.categoria || 'pan dulce').toLowerCase();
        inputUnidad.value = prod.unidad || 'pieza';
        inputPrecio.value = prod.precio;
        inputStock.value = prod.stock;
        txtDesc.value = prod.descripcion || '';
        inputImg.value = prod.imagen || '';
        checkActivo.checked = Number(prod.activo) === 1;

        actualizarPreviewImagen(prod.imagen);
    } else {
        txtTitulo.textContent = 'Nuevo Producto';
        inputId.value = '';
        inputUnidad.value = 'pieza';
        inputStock.value = '20';
        checkActivo.checked = true;
        actualizarPreviewImagen('');
    }

    abrirModal('modal-producto');
}

/**
 * Actualiza la miniatura en tiempo real dentro del modal
 */
function actualizarPreviewImagen(url) {
    const box = document.getElementById('preview-img-box');
    if (!box) return;

    if (!url) {
        box.innerHTML = '🥖';
        return;
    }

    box.innerHTML = `<img src="${escaparHTML(url)}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='🥖';">`;
}

/**
 * Procesa el guardado (Crear o Editar) de un producto
 */
async function guardarProducto(e) {
    e.preventDefault();

    const id = document.getElementById('prod-id').value;
    const esEdicion = Boolean(id);

    const payload = {
        nombre: document.getElementById('prod-nombre').value.trim(),
        categoria: document.getElementById('prod-categoria').value,
        unidad: document.getElementById('prod-unidad').value.trim() || 'pieza',
        precio: parseFloat(document.getElementById('prod-precio').value),
        stock: parseInt(document.getElementById('prod-stock').value, 10),
        descripcion: document.getElementById('prod-descripcion').value.trim(),
        imagen: document.getElementById('prod-imagen').value.trim() || null,
        activo: document.getElementById('prod-activo').checked ? 1 : 0
    };

    if (!payload.nombre || isNaN(payload.precio)) {
        mostrarToast('Nombre y precio válido son requeridos', 'error');
        return;
    }

    const btnSubmit = document.getElementById('btn-guardar-producto');
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '⏳ Guardando...';
    btnSubmit.disabled = true;

    try {
        let url = API_PRODUCTOS_URL;
        let metodo = 'POST';

        if (esEdicion) {
            url += `?id=${encodeURIComponent(id)}`;
            metodo = 'PUT';
        }

        const resp = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (resp.ok && data.ok) {
            mostrarToast(
                esEdicion ? '¡Producto actualizado con éxito!' : '¡Nuevo producto añadido al catálogo!',
                'exito'
            );
            cerrarModal('modal-producto');
            await cargarProductos();
        } else {
            throw new Error(data.error || 'No se pudo guardar el producto.');
        }
    } catch (err) {
        console.error('Error al guardar producto:', err);
        mostrarToast(err.message, 'error');
    } finally {
        btnSubmit.innerHTML = textoOriginal;
        btnSubmit.disabled = false;
    }
}

/**
 * Cambia el estado activo/inactivo rápidamente
 */
async function toggleEstadoProducto(id, nuevoEstado) {
    try {
        const resp = await fetch(`${API_PRODUCTOS_URL}?id=${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: nuevoEstado })
        });
        const data = await resp.json();

        if (resp.ok && data.ok) {
            mostrarToast(nuevoEstado === 1 ? 'Producto activado' : 'Producto ocultado del catálogo', 'exito');
            await cargarProductos();
        } else {
            throw new Error(data.error || 'Error al cambiar estado.');
        }
    } catch (err) {
        mostrarToast(err.message, 'error');
    }
}

/**
 * Solicita confirmación y desactiva el producto
 */
function confirmarEliminarProducto(id, nombre) {
    abrirConfirmacion(
        'Desactivar Producto',
        `¿Deseas retirar "${nombre}" del catálogo público? El producto permanecerá en el historial de administración.`,
        async () => {
            try {
                const resp = await fetch(`${API_PRODUCTOS_URL}?id=${encodeURIComponent(id)}`, {
                    method: 'DELETE'
                });
                const data = await resp.json();

                if (resp.ok && data.ok) {
                    mostrarToast('Producto desactivado correctamente', 'exito');
                    await cargarProductos();
                } else {
                    throw new Error(data.error || 'Error al desactivar el producto.');
                }
            } catch (err) {
                mostrarToast(err.message, 'error');
            }
        }
    );
}

// =========================================================
// 5. GESTIÓN Y RENDERIZADO DE PEDIDOS (HISTORIAL)
// =========================================================

/**
 * Renderiza la tabla de compras
 */
function renderizarTablaPedidos() {
    const tbody = document.getElementById('tbody-pedidos');
    if (!tbody) return;

    let lista = [...state.pedidos];

    if (state.filtroPedidos.busqueda) {
        const q = state.filtroPedidos.busqueda;
        lista = lista.filter(p =>
            (p.nombre_cliente && p.nombre_cliente.toLowerCase().includes(q)) ||
            (p.telefono && p.telefono.includes(q)) ||
            (p.direccion && p.direccion.toLowerCase().includes(q)) ||
            (p.id && String(p.id).includes(q))
        );
    }

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>No hay pedidos registrados</h3>
                    <p>Cuando los clientes completen sus pedidos en el carrito aparecerán aquí.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = lista.map(item => {
        const fechaFormateada = formatearFecha(item.fecha);
        const metodoPago = item.metodo_pago === 'tarjeta' ? '💳 Tarjeta' : '💵 Efectivo';

        return `
            <tr>
                <td style="font-weight: 700; color: var(--color-admin-muted);">#${item.id}</td>
                <td style="white-space: nowrap; font-size: 13px;">${fechaFormateada}</td>
                <td style="font-weight: 700; color: var(--color-admin-primary);">${escaparHTML(item.nombre_cliente)}</td>
                <td style="font-size: 13px;">${escaparHTML(item.telefono || 'Sin teléfono')}</td>
                <td style="font-size: 12.5px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escaparHTML(item.direccion)}">
                    ${escaparHTML(item.direccion)}
                </td>
                <td>
                    <span class="badge-payment">${metodoPago}</span>
                </td>
                <td style="font-weight: 800; font-size: 14.5px; color: var(--color-admin-accent);">
                    $${formatearDinero(item.total)}
                </td>
                <td style="text-align: right;">
                    <button type="button" class="btn-admin btn-admin-secondary" style="padding: 5px 12px; font-size: 12.5px;" onclick="verDetallePedido(${item.id})">
                        <span>🔍</span> Ver Detalle
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Consulta la compra por ID y muestra el desglose completo en modal
 */
async function verDetallePedido(pedidoId) {
    try {
        const resp = await fetch(`${API_COMPRAS_URL}?id=${encodeURIComponent(pedidoId)}`);
        const data = await resp.json();

        if (!resp.ok || !data.ok || !data.compra) {
            throw new Error(data.error || 'No se encontró el detalle del pedido.');
        }

        const compra = data.compra;

        // Llenar campos resumen
        document.getElementById('detalle-pedido-id').textContent = compra.id;
        document.getElementById('detalle-cliente').textContent = compra.nombre_cliente;
        document.getElementById('detalle-telefono').textContent = compra.telefono || 'No registrado';
        document.getElementById('detalle-fecha').textContent = formatearFecha(compra.fecha);
        document.getElementById('detalle-metodo').textContent = compra.metodo_pago === 'tarjeta' ? 'Tarjeta Bancaria' : 'Pago en Efectivo contra Entrega';
        document.getElementById('detalle-direccion').textContent = compra.direccion;

        // Tarjeta de crédito (si aplica)
        const boxTarjeta = document.getElementById('detalle-tarjeta-box');
        const infoTarjeta = document.getElementById('detalle-tarjeta-info');
        if (compra.metodo_pago === 'tarjeta' && compra.tarjeta_ultimos4) {
            boxTarjeta.style.display = 'block';
            infoTarjeta.textContent = `Terminación **** ${compra.tarjeta_ultimos4} | Titular: ${compra.tarjeta_titular || 'N/A'} | Vence: ${compra.tarjeta_vence || 'N/A'}`;
        } else {
            boxTarjeta.style.display = 'none';
        }

        // Llenar productos
        const tbody = document.getElementById('detalle-tbody-productos');
        const productos = compra.productos || [];

        if (productos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:18px;">Sin desglose de productos.</td></tr>`;
        } else {
            tbody.innerHTML = productos.map(item => {
                const subtotal = Number(item.precio) * Number(item.cantidad);
                return `
                    <tr>
                        <td style="font-weight:700; color:var(--color-admin-primary);">
                            ${escaparHTML(item.nombre)}
                        </td>
                        <td style="text-align: right;">$${formatearDinero(item.precio)}</td>
                        <td style="text-align: center; font-weight: 700;">${item.cantidad}</td>
                        <td style="text-align: right; font-weight: 700; color: var(--color-admin-accent);">$${formatearDinero(subtotal)}</td>
                    </tr>
                `;
            }).join('');
        }

        document.getElementById('detalle-total').textContent = `$${formatearDinero(compra.total)}`;

        abrirModal('modal-pedido');
    } catch (err) {
        console.error('Error al ver pedido:', err);
        mostrarToast(err.message, 'error');
    }
}

// =========================================================
// 6. GESTIÓN Y RENDERIZADO DE MENSAJES DE CONTACTO
// =========================================================

/**
 * Renderiza la lista de mensajes en formato de tarjetas
 */
function renderizarMensajes() {
    const contenedor = document.getElementById('contenedor-mensajes');
    if (!contenedor) return;

    if (state.mensajes.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✉️</div>
                <h3>Bandeja de entrada vacía</h3>
                <p>No has recibido nuevos mensajes a través de la página de contacto.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = state.mensajes.map(msg => {
        const inicial = msg.nombre ? msg.nombre.charAt(0).toUpperCase() : '?';
        const fecha = formatearFecha(msg.fecha);

        return `
            <article class="message-card" data-msg-id="${msg.id}">
                <div class="message-top">
                    <div class="message-sender">
                        <div class="message-avatar">${inicial}</div>
                        <div>
                            <div class="message-sender-name">${escaparHTML(msg.nombre)}</div>
                            <a href="mailto:${escaparHTML(msg.email)}" class="message-sender-email">
                                ✉️ ${escaparHTML(msg.email)}
                            </a>
                        </div>
                    </div>
                    <span class="message-date">${fecha}</span>
                </div>

                <div class="message-text">
                    ${escaparHTML(msg.mensaje).replace(/\n/g, '<br>')}
                </div>

                <div class="message-actions">
                    <a href="mailto:${escaparHTML(msg.email)}?subject=Respuesta%20Pan%20Cl%C3%A1sico" class="btn-admin btn-admin-secondary" style="font-size:12.5px; padding:6px 14px;">
                        <span>✉️</span> Responder
                    </a>
                    <button type="button" class="btn-admin btn-admin-danger" style="font-size:12.5px; padding:6px 14px;" onclick="confirmarEliminarMensaje(${msg.id})">
                        <span>🗑️</span> Eliminar
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

/**
 * Solicita confirmación y elimina un mensaje
 */
function confirmarEliminarMensaje(id) {
    abrirConfirmacion(
        'Eliminar Mensaje',
        '¿Estás seguro de que deseas eliminar este mensaje? Esta acción no se puede deshacer.',
        async () => {
            try {
                const resp = await fetch(`${API_MENSAJES_URL}?id=${encodeURIComponent(id)}`, {
                    method: 'DELETE'
                });
                const data = await resp.json();

                if (resp.ok && data.ok) {
                    mostrarToast('Mensaje eliminado correctamente', 'exito');
                    await cargarMensajes();
                } else {
                    throw new Error(data.error || 'Error al eliminar el mensaje.');
                }
            } catch (err) {
                mostrarToast(err.message, 'error');
            }
        }
    );
}

// =========================================================
// 7. CÁLCULO DE KPIS Y BADGES
// =========================================================
function actualizarKPIs() {
    // KPI 1: Productos
    const totalProd = state.productos.length;
    const activosProd = state.productos.filter(p => Number(p.activo) === 1).length;
    const elTotalProd = document.getElementById('kpi-total-productos');
    const elActivosProd = document.getElementById('kpi-productos-activos');
    if (elTotalProd) elTotalProd.textContent = totalProd;
    if (elActivosProd) elActivosProd.textContent = `${activosProd} activos (${totalProd - activosProd} inactivos)`;

    // KPI 2 y 3: Ventas y Pedidos
    const totalPedidos = state.pedidos.length;
    const sumaTotalVentas = state.pedidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
    const promedioTicket = totalPedidos > 0 ? (sumaTotalVentas / totalPedidos) : 0;

    const elTotalVentas = document.getElementById('kpi-total-ventas');
    const elPromedioTicket = document.getElementById('kpi-promedio-ticket');
    const elTotalPedidos = document.getElementById('kpi-total-pedidos');

    if (elTotalVentas) elTotalVentas.textContent = `$${formatearDinero(sumaTotalVentas)}`;
    if (elPromedioTicket) elPromedioTicket.textContent = `$${formatearDinero(promedioTicket)} prom. por pedido`;
    if (elTotalPedidos) elTotalPedidos.textContent = totalPedidos;

    // KPI 4: Mensajes
    const totalMsg = state.mensajes.length;
    const elTotalMsg = document.getElementById('kpi-total-mensajes');
    if (elTotalMsg) elTotalMsg.textContent = totalMsg;
}

function actualizarBadge(badgeId, cantidad) {
    const el = document.getElementById(badgeId);
    if (el) el.textContent = cantidad;
}

// =========================================================
// 8. MANEJO DE MODALES Y CONFIRMACIONES
// =========================================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function abrirConfirmacion(titulo, mensaje, onConfirmar) {
    const modalTitulo = document.getElementById('modal-confirmar-titulo');
    const modalMsg = document.getElementById('modal-confirmar-mensaje');

    if (modalTitulo) modalTitulo.textContent = titulo;
    if (modalMsg) modalMsg.textContent = mensaje;

    state.modalConfirmarAccion = onConfirmar;
    abrirModal('modal-confirmar');
}

// =========================================================
// 9. TOAST NOTIFICATIONS
// =========================================================
function mostrarToast(mensaje, tipo = 'exito') {
    let contenedor = document.getElementById('toast-container');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toast-container';
        contenedor.className = 'toast-container';
        document.body.appendChild(contenedor);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;

    let icono = '✔️';
    if (tipo === 'error') icono = '❌';
    else if (tipo === 'aviso') icono = '⚠️';

    toast.innerHTML = `<span>${icono}</span><span>${escaparHTML(mensaje)}</span>`;
    contenedor.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 320);
    }, 3800);
}

// =========================================================
// 10. UTILIDADES Y FORMATEADORES
// =========================================================
function formatearDinero(num) {
    const val = parseFloat(num) || 0;
    return val.toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return 'N/D';
    try {
        const fecha = new Date(fechaStr.replace(' ', 'T'));
        if (isNaN(fecha.getTime())) return fechaStr;

        return fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return fechaStr;
    }
}

function escaparHTML(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
