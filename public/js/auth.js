/* auth.js — Inicio de sesión y registro. Cada rol entra a su página. Requiere utils.js. */

const API_LOGIN = '../php/login.php';
const API_REGISTRO = '../php/registro.php';
const DESTINOS = { admin: 'admin/index.html', cliente: 'index.html' };

async function enviarAuth(url, cuerpo, boton) {
  boton.disabled = true;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });
    const respuesta = await res.json();
    if (!res.ok) throw new Error(respuesta.error || 'Ocurrió un error');
    return respuesta;
  } catch (err) {
    mostrarToast(err.message, 'error');
    return null;
  } finally {
    boton.disabled = false;
  }
}

document.querySelectorAll('.btn-toggle-pass').forEach(boton => {
  boton.addEventListener('click', () => {
    const campo = boton.parentElement.querySelector('input');
    if (!campo) return;
    const visible = campo.type === 'text';
    campo.type = visible ? 'password' : 'text';
    boton.textContent = visible ? '👁' : '🙈';
  });
});

const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');

if (formLogin) {
  formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    const datos = new FormData(formLogin);
    const respuesta = await enviarAuth(
      API_LOGIN,
      { email: datos.get('email'), password: datos.get('password') },
      formLogin.querySelector('[type="submit"]')
    );
    if (respuesta) window.location.href = DESTINOS[respuesta.rol] || DESTINOS.cliente;
  });
}

if (formRegistro) {
  formRegistro.addEventListener('submit', async e => {
    e.preventDefault();
    const datos = new FormData(formRegistro);

    if (datos.has('password2') && datos.get('password') !== datos.get('password2')) {
    mostrarToast('Las contraseñas no coinciden', 'error');
      return;
    }

    const respuesta = await enviarAuth(
      API_REGISTRO,
      { nombre: datos.get('nombre'), email: datos.get('email'), password: datos.get('password') },
      formRegistro.querySelector('[type="submit"]')
    );
    if (respuesta) {
      mostrarToast('Cuenta creada. Ya puedes iniciar sesión');
      setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    }
  });
}