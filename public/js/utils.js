/**
 * utils.js — Funciones compartidas de las páginas públicas.
 * Se carga antes que badge.js, catalogo.js, carrito.js y contacto.js.
 */

const CLAVE_CARRITO = 'carrito';
const CARPETA_IMAGENES = 'img/';

/* ---------- Seguridad ---------- */

function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ---------- Avisos ---------- */

function mostrarToast(mensaje, tipo = 'exito') {
    let contenedor = document.getElementById('toast-container');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toast-container';
        contenedor.className = 'toast-container';
        document.body.appendChild(contenedor);
    }

    const iconos = { exito: '✅', aviso: '⚠️', error: '❌' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${iconos[tipo] ? tipo : 'exito'}`;

    const icono = document.createElement('span');
    icono.className = 'toast-icono';
    icono.textContent = iconos[tipo] || iconos.exito;

    const texto = document.createElement('span');
    texto.className = 'toast-mensaje';
    texto.textContent = mensaje;

    toast.append(icono, texto);
    contenedor.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('mostrar'));

    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatearPrecio(valor) {
    const numero = Number(valor);
    return '$' + (Number.isFinite(numero) ? numero : 0).toFixed(2);
}
/* ---------- Carrito ---------- */

function leerCarrito() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
}

function guardarCarrito(carrito) {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch {
        mostrarToast('No se pudo guardar el carrito', 'error');
    }
    document.dispatchEvent(new CustomEvent('carrito:actualizado'));
}

function totalPiezas(carrito = leerCarrito()) {
    return carrito.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
}

function totalCarrito(carrito = leerCarrito()) {
    return carrito.reduce((suma, item) => suma + (Number(item.precio) || 0) * (Number(item.cantidad) || 0), 0);
}

/* ---------- Imágenes ---------- */

function rutaImagen(imagen) {
    if (!imagen) return '';
    return /^(https?:)?\/\//.test(imagen) || imagen.startsWith('/') ? imagen : CARPETA_IMAGENES + imagen;
}
