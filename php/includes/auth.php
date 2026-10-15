<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
    ]);
    session_start();
}

function usuario_actual(): ?array
{
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['usuario_email'])) {
        return null;
    }

    return [
        'id' => (int) $_SESSION['usuario_id'],
        'nombre' => (string) $_SESSION['usuario_nombre'],
        'email' => (string) $_SESSION['usuario_email'],
        'rol' => (string) $_SESSION['usuario_rol'],
    ];
}

function es_admin(): bool
{
    return (usuario_actual()['rol'] ?? null) === 'admin';
}

function requerir_rol(string $rol): void
{
    $usuario = usuario_actual();
    if (!$usuario) {
        fallar(401, 'Debes iniciar sesión para realizar esta acción.');
    }
    if ($rol === 'admin' && !es_admin()) {
        fallar(403, 'No tienes permisos para realizar esta acción.');
    }
}
