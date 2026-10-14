<?php
// ============================================
// Pan Clásico — API de Autenticación Admin
// ============================================
// Endpoints:
//   POST php/login.php   → Iniciar sesión (verificar usuario y password_hash)
//   GET  php/login.php   → Verificar si hay una sesión activa
// ============================================

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/config/db.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {

    // ========================================
    // POST — Iniciar sesión
    // ========================================
    case 'POST':
        try {
            // Leer body en JSON o FormData
            $inputJSON = json_decode(file_get_contents('php://input'), true);
            $datos = is_array($inputJSON) ? $inputJSON : $_POST;

            $usuario  = trim($datos['usuario'] ?? '');
            $password = trim($datos['password'] ?? $datos['clave'] ?? '');

            if (empty($usuario) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'ok'    => false,
                    'error' => 'Por favor introduce usuario y contraseña.'
                ]);
                exit();
            }

            // Consultar usuario en la base de datos
            $stmt = $pdo->prepare('SELECT id, usuario, password_hash FROM admins WHERE usuario = :usuario LIMIT 1');
            $stmt->execute([':usuario' => $usuario]);
            $admin = $stmt->fetch();

            if (!$admin || !password_verify($password, $admin['password_hash'])) {
                http_response_code(401);
                echo json_encode([
                    'ok'    => false,
                    'error' => 'Usuario o contraseña incorrectos.'
                ]);
                exit();
            }

            // Regenerar ID de sesión para prevenir Session Fixation
            session_regenerate_id(true);

            // Guardar datos en la sesión de PHP
            $_SESSION['admin_id']      = (int) $admin['id'];
            $_SESSION['admin_usuario'] = $admin['usuario'];

            http_response_code(200);
            echo json_encode([
                'ok'      => true,
                'mensaje' => 'Inicio de sesión exitoso.',
                'usuario' => $admin['usuario']
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'ok'    => false,
                'error' => 'Error al procesar el inicio de sesión en el servidor.'
            ]);
        }
        break;

    // ========================================
    // GET — Verificar estado de la sesión
    // ========================================
    case 'GET':
        if (isset($_SESSION['admin_id']) && !empty($_SESSION['admin_usuario'])) {
            echo json_encode([
                'ok'           => true,
                'autenticado'  => true,
                'usuario'      => $_SESSION['admin_usuario'],
                'admin_id'     => $_SESSION['admin_id']
            ]);
        } else {
            echo json_encode([
                'ok'          => true,
                'autenticado' => false
            ]);
        }
        break;

    // ========================================
    // Método no permitido
    // ========================================
    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Método no permitido.']);
        break;
}
