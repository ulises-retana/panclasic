<?php
// ============================================
// Pan Clásico — Cerrar Sesión Admin
// ============================================

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Vaciar variables de sesión
$_SESSION = [];

// Destruir cookie de sesión si existe
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destruir la sesión
session_destroy();

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok'      => true,
    'mensaje' => 'Sesión cerrada exitosamente.'
]);
