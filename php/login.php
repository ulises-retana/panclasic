<?php
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        echo json_encode(['ok' => true, 'autenticado' => usuario_actual() !== null, 'usuario' => usuario_actual()]);
        break;

    case 'POST':
        $datos = json_decode(file_get_contents('php://input'), true);
        if (!is_array($datos)) {
            fallar(400, 'Cuerpo JSON inválido.');
        }

        $email = strtolower(trim(is_string($datos['email'] ?? null) ? $datos['email'] : ''));
        $password = is_string($datos['password'] ?? null) ? $datos['password'] : '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            fallar(400, 'Introduce un correo y una contraseña válidos.');
        }

        try {
            $stmt = $pdo->prepare('SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = :email LIMIT 1');
            $stmt->execute([':email' => $email]);
            $usuario = $stmt->fetch();
        } catch (PDOException $e) {
            fallar(500, 'No se pudo procesar el inicio de sesión.');
        }

        if (!$usuario || !password_verify($password, $usuario['password_hash'])) {
            fallar(401, 'Correo o contraseña incorrectos.');
        }

        session_regenerate_id(true);
        $_SESSION['usuario_id'] = (int) $usuario['id'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_email'] = $usuario['email'];
        $_SESSION['usuario_rol'] = $usuario['rol'];
        echo json_encode(['ok' => true, 'mensaje' => 'Inicio de sesión exitoso.', 'usuario' => usuario_actual()]);
        break;

    default:
        fallar(405, 'Método no permitido.');
}
