<?php
/*
 * php/usuarios.php — Gestión de cuentas (solo admin).
 *   GET            Lista las cuentas (sin contraseñas).
 *   PUT ?id=N      Cambia el rol: {"rol": "cliente" | "admin"}.
 * Reglas: nadie cambia su propio rol, por lo que siempre queda al menos un admin.
 * Requiere $pdo y fallar() de config/db.php.
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

requerir_rol('admin');

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $filas = $pdo->query('SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($filas as &$fila) {
        $fila['id'] = (int) $fila['id'];
    }
    echo json_encode($filas, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($metodo === 'PUT') {
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        fallar('ID inválido', 400);
    }

    $datos = json_decode(file_get_contents('php://input'), true);
    $rol = is_array($datos) ? ($datos['rol'] ?? null) : null;
    if (!in_array($rol, ['cliente', 'admin'], true)) {
        fallar('Rol inválido', 400);
    }

    if ($id === (int) usuario_actual()['id']) {
        fallar('No puedes cambiar tu propio rol', 403);
    }

    $stmt = $pdo->prepare('SELECT 1 FROM usuarios WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) {
        fallar('Usuario no encontrado', 404);
    }

    $stmt = $pdo->prepare('UPDATE usuarios SET rol = ? WHERE id = ?');
    $stmt->execute([$rol, $id]);
    echo json_encode(['ok' => true]);
    exit;
}

fallar('Método no permitido', 405);