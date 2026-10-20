<?php
/*
 * php/includes/auth.php
 * Sesión segura y control de acceso por rol.
 * Funciones: usuario_actual(), es_admin(), iniciar_sesion_usuario(), requerir_rol().
 */

require_once __DIR__ . '/../config/db.php';

if (session_status() === PHP_SESSION_NONE) {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function usuario_actual(): ?array
{
    $u = $_SESSION['usuario'] ?? null;
    return is_array($u) ? $u : null;
}

function es_admin(): bool
{
    $u = usuario_actual();
    return $u !== null && $u['rol'] === 'admin';
}

function iniciar_sesion_usuario(array $usuario): void
{
    session_regenerate_id(true);
    $_SESSION['usuario'] = [
        'id'     => (int) $usuario['id'],
        'nombre' => (string) $usuario['nombre'],
        'rol'    => (string) $usuario['rol'],
    ];
}

function requerir_rol(string $rol): array
{
    $u = usuario_actual();
    if ($u === null) {
        fallar('Debes iniciar sesión', 401);
    }
    if ($u['rol'] !== $rol) {
        fallar('No tienes permiso para esta acción', 403);
    }
    return $u;
}