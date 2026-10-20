<?php
/* login.php — GET devuelve el usuario de la sesión (401 si no hay).
   POST {email, password} inicia sesión. Límite: 5 fallos por correo+IP o 20 por IP en 15 minutos. */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

const LIMITE_CUENTA = 5;
const LIMITE_IP = 20;
const VENTANA_MINUTOS = 15;
const HASH_FALSO = '$2y$10$usesomesillystringforeOqVfnCqkSbqgXhS4qZ9Y3xHn6u1G2W';

function contar_fallos(PDO $pdo, string $condicion, array $parametros): int
{
    $consulta = $pdo->prepare(
        "SELECT COUNT(*) FROM intentos_login
         WHERE $condicion AND creado_en > (NOW() - INTERVAL " . VENTANA_MINUTOS . ' MINUTE)'
    );
    $consulta->execute($parametros);
    return (int) $consulta->fetchColumn();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $usuario = usuario_actual();
    if (!$usuario) {
        fallar('No autenticado', 401);
    }
    echo json_encode(['usuario' => [
        'id' => (int) $usuario['id'],
        'nombre' => $usuario['nombre'],
        'email' => $usuario['email'],
        'rol' => $usuario['rol']
    ]]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fallar('Método no permitido', 405);
}

$entrada = json_decode(file_get_contents('php://input'), true);
$email = is_array($entrada) ? ($entrada['email'] ?? '') : '';
$password = is_array($entrada) ? ($entrada['password'] ?? '') : '';

if (!is_string($email) || !is_string($password) || $email === '' || $password === ''
    || strlen($email) > 150 || strlen($password) > 72) {
    fallar('Correo o contraseña incorrectos', 401);
}

$email = strtolower(trim($email));
$ip = substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);

if (contar_fallos($pdo, 'email = ? AND ip = ?', [$email, $ip]) >= LIMITE_CUENTA
    || contar_fallos($pdo, 'ip = ?', [$ip]) >= LIMITE_IP) {
    fallar('Demasiados intentos. Espera ' . VENTANA_MINUTOS . ' minutos e inténtalo de nuevo', 429);
}

$consulta = $pdo->prepare('SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = ?');
$consulta->execute([$email]);
$usuario = $consulta->fetch(PDO::FETCH_ASSOC);

$valido = password_verify($password, $usuario['password_hash'] ?? HASH_FALSO) && $usuario;

if (!$valido) {
    $pdo->prepare('INSERT INTO intentos_login (email, ip) VALUES (?, ?)')->execute([$email, $ip]);
    $pdo->exec('DELETE FROM intentos_login WHERE creado_en < (NOW() - INTERVAL 1 DAY)');
    fallar('Correo o contraseña incorrectos', 401);
}

$pdo->prepare('DELETE FROM intentos_login WHERE email = ? AND ip = ?')->execute([$email, $ip]);

if (password_needs_rehash($usuario['password_hash'], PASSWORD_DEFAULT)) {
    $pdo->prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $usuario['id']]);
}

iniciar_sesion_usuario($usuario);

echo json_encode(['ok' => true, 'rol' => $usuario['rol'], 'nombre' => $usuario['nombre']]);