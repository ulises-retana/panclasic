/**
 * ============================================
 * Pan Clásico — Contacto (contacto.js)
 * ============================================
 * Paso 10: Enviar el formulario de contacto vía fetch() a php/mensajes.php,
 * validación en frontend y notificaciones de éxito/error.
 */

const API_MENSAJES_URL = '../php/mensajes.php';

/**
 * Muestra notificación toast emergente
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
        <span class="toast-icono">${tipo === 'exito' ? '✉️' : tipo === 'aviso' ? '⚠️' : '❌'}</span>
        <span class="toast-mensaje">${mensaje}</span>
    `;

    contenedor.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('mostrar'));

    setTimeout(() => {
        toast.classList.remove('mostrar');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3500);
}

/**
 * Procesa el envío del formulario de contacto
 * @param {Event} e 
 */
async function enviarMensajeContacto(e) {
    e.preventDefault();

    const form = e.target;
    const inputNombre = form.querySelector('#nombre') || form.querySelector('input[name="nombre"]');
    const inputCorreo = form.querySelector('#correo') || form.querySelector('input[name="correo"]') || form.querySelector('input[name="email"]');
    const inputMensaje = form.querySelector('#mensaje') || form.querySelector('textarea[name="mensaje"]');
    const btnSubmit = form.querySelector('button[type="submit"]');

    const nombre = (inputNombre?.value || '').trim();
    const email = (inputCorreo?.value || '').trim();
    const mensaje = (inputMensaje?.value || '').trim();

    // Validaciones básicas
    if (!nombre) {
        mostrarToast('Por favor escribe tu nombre.', 'aviso');
        inputNombre?.focus();
        return;
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !regexEmail.test(email)) {
        mostrarToast('Por favor escribe un correo electrónico válido.', 'aviso');
        inputCorreo?.focus();
        return;
    }

    if (!mensaje) {
        mostrarToast('Por favor escribe tu mensaje o consulta.', 'aviso');
        inputMensaje?.focus();
        return;
    }

    const textoOriginalBoton = btnSubmit ? btnSubmit.innerHTML : 'Enviar mensaje';

    try {
        if (btnSubmit) {
            btnSubmit.innerHTML = '⏳ Enviando mensaje...';
            btnSubmit.disabled = true;
        }

        const respuesta = await fetch(API_MENSAJES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: nombre,
                email: email,
                mensaje: mensaje
            })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.ok) {
            mostrarToast(resultado.mensaje || '¡Tu mensaje ha sido enviado con éxito!', 'exito');
            form.reset();

            if (btnSubmit) {
                btnSubmit.innerHTML = '✓ ¡Mensaje Enviado!';
                setTimeout(() => {
                    btnSubmit.innerHTML = textoOriginalBoton;
                    btnSubmit.disabled = false;
                }, 2000);
            }
        } else {
            throw new Error(resultado.error || 'No se pudo enviar el mensaje.');
        }

    } catch (error) {
        console.error('Error al enviar formulario de contacto:', error);
        mostrarToast(error.message || 'Error al conectar con el servidor. Verifica que Apache y MySQL estén activos.', 'error');

        if (btnSubmit) {
            btnSubmit.innerHTML = textoOriginalBoton;
            btnSubmit.disabled = false;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-contacto') || document.querySelector('.formulario form');
    if (form) {
        form.addEventListener('submit', enviarMensajeContacto);
    }
});
