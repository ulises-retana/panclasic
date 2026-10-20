<?php
/**
 * logout.php — POST: cierra la sesión y borra la cookie.
 */
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fallar('Método no permitido', 405);
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$_SESSION = [];

$cookie = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires' => time() - 3600,
    'path' => $cookie['path'],
    'domain' => $cookie['domain'],
    'secure' => $cookie['secure'],
    'httponly' => true,
    'samesite' => $cookie['samesite'] ?: 'Lax',
]);

session_destroy();

echo json_encode(['ok' => true]);