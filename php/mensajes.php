<?php
/*
 * php/mensajes.php — Mensajes del formulario de contacto.
 *   POST   público   Guarda un mensaje {nombre, email, mensaje}.
 *   GET    admin     Lista los mensajes, del más reciente al más antiguo.
 *   DELETE admin     Borra un mensaje (?id=).
 * Requiere $pdo (config/db.php), fallar() y requerir_rol() (includes/auth.php).
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

function campoTexto($valor, int $max): string
{
    if (!is_string($valor)) {
        fallar('Datos inválidos', 400);
    }
    $valor = trim($valor);
    if ($valor === '') {
        fallar('Faltan datos obligatorios', 400);
    }
    if (mb_strlen($valor) > $max) {
        fallar('Algún campo es demasiado largo', 400);
    }
    return $valor;
}

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'POST') {
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        fallar('Datos inválidos', 400);
    }

    $nombre  = campoTexto($datos['nombre'] ?? null, 100);
    $email   = campoTexto($datos['email'] ?? null, 150);
    $mensaje = campoTexto($datos['mensaje'] ?? null, 2000);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fallar('Correo inválido', 400);
    }

    $stmt = $pdo->prepare('INSERT INTO mensajes (nombre, email, mensaje) VALUES (?, ?, ?)');
    $stmt->execute([$nombre, $email, $mensaje]);

    http_response_code(201);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

requerir_rol('admin');

if ($metodo === 'GET') {
    $filas = $pdo->query('SELECT id, nombre, email, mensaje, creado_en FROM mensajes ORDER BY creado_en DESC, id DESC')
        ->fetchAll(PDO::FETCH_ASSOC);
    foreach ($filas as &$fila) {
        $fila['id'] = (int) $fila['id'];
    }
    echo json_encode($filas, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($metodo === 'DELETE') {
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        fallar('ID inválido', 400);
    }

    $stmt = $pdo->prepare('DELETE FROM mensajes WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        fallar('Mensaje no encontrado', 404);
    }

    echo json_encode(['ok' => true]);
    exit;
}

fallar('Método no permitido', 405);