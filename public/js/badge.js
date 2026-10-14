/**
 * ============================================
 * Pan Clásico — Badge del Carrito (badge.js)
 * ============================================
 * Cuenta el total de unidades guardadas en localStorage ('carrito')
 * y muestra la cantidad en una burbuja sobre el icono del carrito en el navbar.
 */

// Clave utilizada en localStorage
const CLAVE_CARRITO = 'carrito';

/**
 * Obtiene los productos del carrito desde localStorage
 * @returns {Array} Lista de productos
 */
function obtenerCarritoStorage() {
    try {
        const guardado = localStorage.getItem(CLAVE_CARRITO);
        return guardado ? JSON.parse(guardado) : [];
    } catch (e) {
        console.error('Error al leer el carrito desde localStorage:', e);
        return [];
    }
}

/**
 * Calcula la cantidad total de piezas/unidades en el carrito
 * @returns {number}
 */
function calcularTotalUnidades() {
    const carrito = obtenerCarritoStorage();
    return carrito.reduce((total, item) => total + (Number(item.cantidad) || 1), 0);
}

/**
 * Actualiza o inserta el badge en el enlace del carrito
 */
function actualizarBadgeCarrito() {
    // Buscar el enlace del carrito en la barra de navegación
    const enlaceCarrito = document.querySelector('header .navbar a[href*="carrito.html"]') 
                       || document.querySelector('a[href*="carrito.html"]');

    if (!enlaceCarrito) return;

    // Asegurar posicionamiento relativo en el enlace para que el badge se ubique correctamente
    enlaceCarrito.classList.add('nav-cart-link');

    // Buscar si ya existe el elemento badge, o crearlo
    let badge = enlaceCarrito.querySelector('.cart-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge';
        enlaceCarrito.appendChild(badge);
    }

    const total = calcularTotalUnidades();

    if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = 'inline-flex';
        badge.setAttribute('aria-label', `${total} productos en el carrito`);
    } else {
        badge.textContent = '0';
        badge.style.display = 'none';
        badge.removeAttribute('aria-label');
    }
}

// Hacer disponible la función globalmente para que catalogo.js y carrito.js la invoquen
window.actualizarBadgeCarrito = actualizarBadgeCarrito;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', actualizarBadgeCarrito);
} else {
    actualizarBadgeCarrito();
}

// Escuchar cambios de almacenamiento en otras pestañas
window.addEventListener('storage', (e) => {
    if (e.key === CLAVE_CARRITO) {
        actualizarBadgeCarrito();
    }
});

// Escuchar evento personalizado emitido por el mismo documento
window.addEventListener('carritoActualizado', actualizarBadgeCarrito);
