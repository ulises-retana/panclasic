<?php
// ============================================
// Pan Clásico — API de Mensajes de Contacto
// ============================================
// Endpoints:
//   POST   php/mensajes.php          → Guardar un mensaje nuevo (cliente)
//   GET    php/mensajes.php          → Listar mensajes recibidos (admin)
//   GET    php/mensajes.php?id=1     → Ver mensaje específico (admin)
//   DELETE php/mensajes.php?id=1     → Eliminar mensaje (admin)
// ============================================

require_once __DIR__ . '/config/db.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {

    // ========================================
    // POST — Guardar nuevo mensaje
    // ========================================
    case 'POST':
        try {
            // Soportar JSON y FormData
            $inputJSON = json_decode(file_get_contents('php://input'), true);
            $datos = is_array($inputJSON) ? $inputJSON : $_POST;

            $nombre  = trim($datos['nombre'] ?? '');
            $email   = trim($datos['email'] ?? $datos['correo'] ?? '');
            $mensaje = trim($datos['mensaje'] ?? '');

            // Validar campos obligatorios
            if (empty($nombre)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Por favor escribe tu nombre.']);
                exit();
            }

            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Por favor introduce un correo electrónico válido.']);
                exit();
            }

            if (empty($mensaje)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Por favor escribe el contenido de tu mensaje.']);
                exit();
            }

            // Insertar en la base de datos
            $stmt = $pdo->prepare('
                INSERT INTO mensajes (nombre, email, mensaje)
                VALUES (:nombre, :email, :mensaje)
            ');

            $stmt->execute([
                ':nombre'  => $nombre,
                ':email'   => $email,
                ':mensaje' => $mensaje,
            ]);

            $nuevoId = (int) $pdo->lastInsertId();

            http_response_code(201);
            echo json_encode([
                'ok'      => true,
                'mensaje' => '¡Tu mensaje ha sido enviado con éxito! Te responderemos muy pronto.',
                'id'      => $nuevoId
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'ok'    => false,
                'error' => 'Ocurrió un error al guardar tu mensaje en el servidor.'
            ]);
        }
        break;

    // ========================================
    // GET — Listar mensajes o ver uno por ID
    // ========================================
    case 'GET':
        try {
            if (isset($_GET['id'])) {
                $id = (int) $_GET['id'];
                $stmt = $pdo->prepare('SELECT * FROM mensajes WHERE id = :id');
                $stmt->execute([':id' => $id]);
                $mensaje = $stmt->fetch();

                if ($mensaje) {
                    echo json_encode(['ok' => true, 'mensaje' => $mensaje]);
                } else {
                    http_response_code(404);
                    echo json_encode(['ok' => false, 'error' => 'Mensaje no encontrado.']);
                }
            } else {
                $stmt = $pdo->query('SELECT * FROM mensajes ORDER BY fecha DESC');
                $mensajes = $stmt->fetchAll();

                echo json_encode([
                    'ok'       => true,
                    'mensajes' => $mensajes
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'ok'    => false,
                'error' => 'Error al consultar los mensajes.'
            ]);
        }
        break;

    // ========================================
    // DELETE — Eliminar mensaje por ID (admin)
    // ========================================
    case 'DELETE':
        try {
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Se requiere el parámetro id.']);
                exit();
            }

            $id = (int) $_GET['id'];
            $stmt = $pdo->prepare('DELETE FROM mensajes WHERE id = :id');
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['ok' => true, 'mensaje' => 'Mensaje eliminado correctamente.']);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Mensaje no encontrado.']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'ok'    => false,
                'error' => 'Error al eliminar el mensaje.'
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
