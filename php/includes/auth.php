<?php
// ============================================
// Pan Clásico — Middleware de Autenticación
// ============================================
// Incluir al inicio de cualquier endpoint que requiera permisos de administrador:
//   require_once __DIR__ . '/includes/auth.php';
// ============================================

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Si no hay sesión activa de admin, rechazar petición
if (empty($_SESSION['admin_id']) || empty($_SESSION['admin_usuario'])) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok'    => false,
        'error' => 'No autorizado. Debe iniciar sesión como administrador para realizar esta acción.'
    ]);
    exit();
}
