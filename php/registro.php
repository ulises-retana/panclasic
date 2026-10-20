<?php
/*
 * php/registro.php
 * Crea una cuenta de cliente y abre sesión.
 * POST JSON: { nombre, email, password }
 * El rol siempre es 'cliente': nunca se lee del navegador.
 * Requiere: config/db.php (PDO en $pdo, fallar()) y includes/auth.php (iniciar_sesion_usuario()).
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fallar('Método no permitido', 405);
}

$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) {
    fallar('Datos inválidos', 400);
}

$nombre   = $datos['nombre'] ?? null;
$email    = $datos['email'] ?? null;
$password = $datos['password'] ?? null;

if (!is_string($nombre) || !is_string($email) || !is_string($password)) {
    fallar('Faltan datos obligatorios', 400);
}

$nombre = trim($nombre);
$email  = mb_strtolower(trim($email));

if ($nombre === '' || mb_strlen($nombre) > 100) {
    fallar('El nombre es obligatorio y no puede superar 100 caracteres', 400);
}
if (mb_strlen($email) > 150 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fallar('Correo inválido', 400);
}
if (strlen($password) < 8 || strlen($password) > 72) {
    fallar('La contraseña debe tener entre 8 y 72 caracteres', 400);
}

try {
    $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)');
    $stmt->execute([$nombre, $email, password_hash($password, PASSWORD_DEFAULT), 'cliente']);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        fallar('Ya existe una cuenta con ese correo', 409);
    }
    throw $e;
}

$usuario = [
    'id'     => (int) $pdo->lastInsertId(),
    'nombre' => $nombre,
    'email'  => $email,
    'rol'    => 'cliente',
];

iniciar_sesion_usuario($usuario);

http_response_code(201);
echo json_encode(['ok' => true, 'usuario' => $usuario], JSON_UNESCAPED_UNICODE);