/**
 * ============================================
 * Pan Clásico — Catálogo (catalogo.js)
 * ============================================
 * Paso 5: Consultar la API de productos (php/productos.php),
 * renderizar las tarjetas de productos y permitir agregarlos al carrito
 * guardando los datos en localStorage ('carrito').
 */

// Configuración
const API_URL = '../php/productos.php';
const CLAVE_CARRITO = 'carrito';

// Estado en memoria
let productosEnMemoria = [];
let categoriaActual = 'todas';
let busquedaActual = '';

/**
 * Obtener carrito desde localStorage
 * @returns {Array}
 */
function obtenerCarrito() {
    try {
        const data = localStorage.getItem(CLAVE_CARRITO);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error al leer el carrito:', e);
        return [];
    }
}

/**
 * Guardar carrito en localStorage y notificar actualización
 * @param {Array} carrito 
 */
function guardarCarrito(carrito) {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
        
        // Notificar al badge del nav
        if (typeof window.actualizarBadgeCarrito === 'function') {
            window.actualizarBadgeCarrito();
        }
        window.dispatchEvent(new Event('carritoActualizado'));
    } catch (e) {
        console.error('Error al guardar el carrito:', e);
    }
}

/**
 * Determinar icono o imagen de respaldo según nombre o categoría
 * @param {Object} producto 
 * @returns {string} Emoji temático
 */
function obtenerIconoRespaldo(producto) {
    const nombre = (producto.nombre || '').toLowerCase();
    const cat = (producto.categoria || '').toLowerCase();

    if (nombre.includes('cuerno') || nombre.includes('croissant')) return '🥐';
    if (nombre.includes('baguette') || nombre.includes('francés') || nombre.includes('frances')) return '🥖';
    if (nombre.includes('bolillo') || nombre.includes('blanco')) return '🍞';
    if (nombre.includes('polvorón') || nombre.includes('polvoron') || cat.includes('galleta')) return '🍪';
    if (nombre.includes('concha') || cat.includes('dulce') || nombre.includes('oreja') || nombre.includes('rosca')) return '🥯';
    if (nombre.includes('empanada') || cat.includes('relleno')) return '🥟';
    return '🥖';
}

/**
 * Muestra una notificación emergente (Toast)
 * @param {string} mensaje 
 * @param {'exito'|'aviso'|'error'} tipo 
 */
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
    toast.innerHTML = `
        <span class="toast-icono">${tipo === 'exito' ? '🛒' : tipo === 'aviso' ? '⚠️' : '❌'}</span>
        <span class="toast-mensaje">${mensaje}</span>
    `;

    contenedor.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => toast.classList.add('mostrar'));

    // Desaparecer después de 3.2s
    setTimeout(() => {
        toast.classList.remove('mostrar');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3200);
}

/**
 * Agrega un producto al carrito de compras
 * @param {number|string} idProducto 
 * @param {HTMLElement} [boton] 
 */
function agregarAlCarrito(idProducto, boton = null) {
    const id = Number(idProducto);
    const producto = productosEnMemoria.find(p => Number(p.id) === id);

    if (!producto) {
        mostrarToast('No se encontró la información del producto.', 'error');
        return;
    }

    const stock = Number(producto.stock);
    if (stock <= 0) {
        mostrarToast(`"${producto.nombre}" está agotado.`, 'aviso');
        return;
    }

    const carrito = obtenerCarrito();
    const itemExistente = carrito.find(item => Number(item.id) === id);
    const cantidadEnCarrito = itemExistente ? Number(itemExistente.cantidad) : 0;

    if (cantidadEnCarrito + 1 > stock) {
        mostrarToast(`No puedes agregar más. Solo hay ${stock} disponible(s) de "${producto.nombre}".`, 'aviso');
        return;
    }

    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({
            id: Number(producto.id),
            nombre: producto.nombre,
            precio: parseFloat(producto.precio),
            unidad: producto.unidad || 'pieza',
            imagen: producto.imagen || null,
            categoria: producto.categoria || 'pan',
            stock: stock,
            cantidad: 1
        });
    }

    guardarCarrito(carrito);
    mostrarToast(`¡"${producto.nombre}" agregado al carrito!`, 'exito');

    // Feedback visual en el botón
    if (boton) {
        const textoOriginal = boton.innerHTML;
        boton.innerHTML = '✓ ¡Agregado!';
        boton.classList.add('boton-agregado');
        boton.disabled = true;

        setTimeout(() => {
            boton.innerHTML = textoOriginal;
            boton.classList.remove('boton-agregado');
            boton.disabled = false;
        }, 1100);
    }
}

/**
 * Renderiza los filtros por categoría si hay categorías disponibles
 * @param {Array} productos 
 */
function renderizarFiltrosCategorias(productos) {
    const contenedorFiltros = document.getElementById('catalogo-filtros');
    if (!contenedorFiltros) return;

    // Extraer categorías únicas
    const categorias = ['todas', ...new Set(productos.map(p => p.categoria).filter(Boolean))];

    if (categorias.length <= 2) {
        contenedorFiltros.innerHTML = '';
        return;
    }

    contenedorFiltros.innerHTML = categorias.map(cat => {
        const etiqueta = cat === 'todas' 
            ? 'Todos' 
            : cat.charAt(0).toUpperCase() + cat.slice(1);
        const activo = cat === categoriaActual ? 'activo' : '';
        return `<button type="button" class="filtro-btn ${activo}" data-categoria="${cat}">${etiqueta}</button>`;
    }).join('');

    // Asignar eventos de click
    contenedorFiltros.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            contenedorFiltros.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            categoriaActual = btn.dataset.categoria;
            filtrarYRenderizar();
        });
    });
}

/**
 * Filtra los productos según la categoría activa y los dibuja
 */
function filtrarYRenderizar() {
    const contenedor = document.getElementById('productos');
    if (!contenedor) return;

    const termino = busquedaActual.trim().toLowerCase();

    const filtrados = productosEnMemoria.filter(p => {
        const coincideCategoria = categoriaActual === 'todas' || 
            (p.categoria || '').toLowerCase() === categoriaActual.toLowerCase();

        const coincideBusqueda = termino === '' || 
            (p.nombre || '').toLowerCase().includes(termino) ||
            (p.descripcion || '').toLowerCase().includes(termino) ||
            (p.categoria || '').toLowerCase().includes(termino);

        return coincideCategoria && coincideBusqueda;
    });

    if (filtrados.length === 0) {
        const mensajeVacio = termino !== '' 
            ? `No encontramos ningún pan que coincida con "<strong>${termino}</strong>".`
            : 'No hay productos en esta categoría por el momento.';

        contenedor.innerHTML = `
            <div class="catalogo-vacio">
                <span class="vacio-icono">🥖</span>
                <p>${mensajeVacio}</p>
                ${termino !== '' ? '<button type="button" class="boton btn-reintentar" onclick="limpiarBusqueda()">Mostrar todos los panes</button>' : ''}
            </div>
        `;
        return;
    }

    contenedor.innerHTML = filtrados.map(producto => {
        const stock = Number(producto.stock);
        const agotado = stock <= 0;
        const precio = parseFloat(producto.precio).toFixed(2);
        const unidad = producto.unidad || 'pieza';
        const categoria = producto.categoria ? producto.categoria.toUpperCase() : 'PAN';
        const respaldo = obtenerIconoRespaldo(producto);

        // Si hay ruta de imagen válida
        let bloqueImagen = '';
        if (producto.imagen && producto.imagen.trim() !== '') {
            // Manejar si viene con prefijo img/ o ruta completa o relativa
            const imgSrc = producto.imagen.startsWith('http') || producto.imagen.startsWith('/') 
                ? producto.imagen 
                : (producto.imagen.startsWith('../') ? producto.imagen : `../${producto.imagen}`);
            bloqueImagen = `
                <div class="producto-img-wrap">
                    <img src="${imgSrc}" alt="${producto.nombre}" class="producto-img" onerror="this.parentElement.innerHTML='<span class=\\'producto-emoji\\'>${respaldo}</span>'">
                </div>
            `;
        } else {
            bloqueImagen = `
                <div class="producto-img-wrap">
                    <span class="producto-emoji">${respaldo}</span>
                </div>
            `;
        }

        return `
            <article class="producto-card ${agotado ? 'producto-agotado' : ''}" data-id="${producto.id}">
                ${bloqueImagen}
                <div class="producto-cuerpo">
                    <span class="producto-categoria">${categoria}</span>
                    <h3 class="producto-titulo">${producto.nombre}</h3>
                    <p class="producto-descripcion">${producto.descripcion || 'Elaborado diariamente con ingredientes selectos y receta tradicional.'}</p>
                    
                    <div class="producto-detalles">
                        <div class="producto-precio">
                            <span class="precio-monto">$${precio}</span>
                            <span class="precio-unidad">/ ${unidad}</span>
                        </div>
                        <span class="producto-stock ${agotado ? 'stock-agotado' : ''}">
                            ${agotado ? 'Agotado' : `Disponibles: ${stock}`}
                        </span>
                    </div>

                    <button 
                        type="button" 
                        class="boton btn-agregar-carrito ${agotado ? 'btn-deshabilitado' : ''}" 
                        data-id="${producto.id}"
                        ${agotado ? 'disabled aria-disabled="true"' : ''}
                    >
                        ${agotado ? 'Agotado' : '🛒 Agregar al Carrito'}
                    </button>
                </div>
            </article>
        `;
    }).join('');

    // Asignar listeners a los botones de agregar
    contenedor.querySelectorAll('.btn-agregar-carrito').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            agregarAlCarrito(id, btn);
        });
    });
}

/**
 * Consulta la API y carga los productos en pantalla
 */
async function cargarProductos() {
    const contenedor = document.getElementById('productos');
    const mensajeCarga = document.getElementById('catalogo-mensaje-carga');

    if (!contenedor) return;

    try {
        if (mensajeCarga) {
            mensajeCarga.style.display = 'block';
            mensajeCarga.textContent = 'Cargando panes recién horneados...';
        }

        const respuesta = await fetch(API_URL);

        if (!respuesta.ok) {
            throw new Error(`Error en el servidor HTTP: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!datos.ok || !Array.isArray(datos.productos)) {
            throw new Error(datos.error || 'Respuesta inválida de la API de productos.');
        }

        productosEnMemoria = datos.productos;

        if (mensajeCarga) {
            mensajeCarga.style.display = 'none';
        }

        if (productosEnMemoria.length === 0) {
            contenedor.innerHTML = `
                <div class="catalogo-vacio">
                    <span class="vacio-icono">🥖</span>
                    <p>No hay productos disponibles en este momento.</p>
                </div>
            `;
            return;
        }

        // Renderizar filtros de categoría y tarjetas
        renderizarFiltrosCategorias(productosEnMemoria);
        iniciarBuscador();
        filtrarYRenderizar();

    } catch (error) {
        console.error('Error al cargar productos:', error);
        if (mensajeCarga) {
            mensajeCarga.style.display = 'none';
        }
        contenedor.innerHTML = `
            <div class="catalogo-error">
                <span class="error-icono">⚠️</span>
                <h3>No se pudieron cargar los productos</h3>
                <p>Verifica que el servicio de MySQL y Apache en XAMPP estén encendidos.</p>
                <button type="button" class="boton btn-reintentar" onclick="cargarProductos()">Reintentar</button>
            </div>
        `;
    }
}

/**
 * Inicializa el buscador en tiempo real
 */
function iniciarBuscador() {
    const input = document.getElementById('input-busqueda');
    const btnLimpiar = document.getElementById('btn-limpiar-busqueda');

    if (!input) return;

    input.addEventListener('input', (e) => {
        busquedaActual = e.target.value;
        if (btnLimpiar) {
            btnLimpiar.style.display = busquedaActual.length > 0 ? 'block' : 'none';
        }
        filtrarYRenderizar();
    });

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            limpiarBusqueda();
        });
    }
}

/**
 * Limpia el texto de búsqueda y restaura el listado
 */
function limpiarBusqueda() {
    const input = document.getElementById('input-busqueda');
    const btnLimpiar = document.getElementById('btn-limpiar-busqueda');

    if (input) {
        input.value = '';
        input.focus();
    }
    if (btnLimpiar) {
        btnLimpiar.style.display = 'none';
    }
    busquedaActual = '';
    filtrarYRenderizar();
}

window.limpiarBusqueda = limpiarBusqueda;

// Inicializar al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarProductos);
} else {
    cargarProductos();
}
