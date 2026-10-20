/* contacto.js — Formulario de contacto. Requiere utils.js. */

const API_MENSAJES = '../php/mensajes.php';
const formularioContacto = document.getElementById('form-contacto');

formularioContacto.addEventListener('submit', async e => {
  e.preventDefault();
  const datos = new FormData(formularioContacto);
  const boton = formularioContacto.querySelector('[type="submit"]');
  boton.disabled = true;

  try {
    const res = await fetch(API_MENSAJES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: datos.get('nombre'),
        email: datos.get('email'),
        mensaje: datos.get('mensaje')
      })
    });
    const respuesta = await res.json();
    if (!res.ok) throw new Error(respuesta.error || 'No se pudo enviar el mensaje');

    formularioContacto.reset();
    mostrarToast('Mensaje enviado. ¡Gracias por escribirnos!');
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
});