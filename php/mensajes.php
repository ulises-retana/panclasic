<?php
// ============================================
// Pan Clásico — API de Mensajes de Contacto
// ============================================
// Endpoints:
//   POST   php/mensajes.php          → Guardar un mensaje nuevo (público)
//   GET    php/mensajes.php          → Listar mensajes recibidos (solo admin)
//   GET    php/mensajes.php?id=1     → Ver un mensaje (solo admin)
//   DELETE php/mensajes.php?id=1     → Eliminar un mensaje (solo admin)
// ============================================

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

// --------------------------------------------
// POST: validar el formulario
// --------------------------------------------

/** Texto del JSON sin espacios sobrantes ('' si el campo falta o no es texto). */
function texto(array $datos, string $campo): string
{
    return is_string($datos[$campo] ?? null) ? trim($datos[$campo]) : '';
}

/** Valida el JSON del formulario de contacto. Devuelve [nombre, email, mensaje]. */
function leerMensaje(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);

    if (!is_array($datos)) {
        fallar(400, 'Cuerpo de solicitud JSON inválido.');
    }

    // Los límites coinciden con las columnas de la tabla `mensajes`
    $nombre  = texto($datos, 'nombre');
    $email   = texto($datos, 'email');
    $mensaje = texto($datos, 'mensaje');

    if ($nombre === '' || strlen($nombre) > 150) {
        fallar(400, 'Por favor escribe tu nombre (máximo 150 caracteres).');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 200) {
        fallar(400, 'Por favor introduce un correo electrónico válido.');
    }
    if ($mensaje === '' || strlen($mensaje) > 2000) {
        fallar(400, 'Por favor escribe tu mensaje (máximo 2000 caracteres).');
    }

    return [$nombre, $email, $mensaje];
}

// --------------------------------------------
// Enrutado por método HTTP
// --------------------------------------------

switch ($_SERVER['REQUEST_METHOD']) {

    // ---------- POST: guardar mensaje (público) ----------
    case 'POST':
        try {
            [$nombre, $email, $mensaje] = leerMensaje();

            $stmt = $pdo->prepare('INSERT INTO mensajes (nombre, email, mensaje) VALUES (:nombre, :email, :mensaje)');
            $stmt->execute([':nombre' => $nombre, ':email' => $email, ':mensaje' => $mensaje]);

            http_response_code(201);
            echo json_encode([
                'ok'      => true,
                'mensaje' => '¡Tu mensaje ha sido enviado con éxito! Te responderemos muy pronto.',
                'id'      => (int) $pdo->lastInsertId(),
            ]);
        } catch (PDOException $e) {
            fallar(500, 'Ocurrió un error al guardar tu mensaje en el servidor.');
        }
        break;

    // ---------- GET: listar o ver uno (solo admin) ----------
    case 'GET':
        requerir_rol('admin');
        try {
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare('SELECT * FROM mensajes WHERE id = :id');
                $stmt->execute([':id' => (int) $_GET['id']]);
                $mensaje = $stmt->fetch();

                if (!$mensaje) {
                    fallar(404, 'Mensaje no encontrado.');
                }
                echo json_encode(['ok' => true, 'mensaje' => $mensaje]);
            } else {
                $mensajes = $pdo->query('SELECT * FROM mensajes ORDER BY fecha DESC')->fetchAll();
                echo json_encode(['ok' => true, 'mensajes' => $mensajes]);
            }
        } catch (PDOException $e) {
            fallar(500, 'Error al consultar los mensajes.');
        }
        break;

    // ---------- DELETE: eliminar (solo admin) ----------
    case 'DELETE':
        requerir_rol('admin');
        if (!isset($_GET['id'])) {
            fallar(400, 'Se requiere el parámetro id.');
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM mensajes WHERE id = :id');
            $stmt->execute([':id' => (int) $_GET['id']]);

            if ($stmt->rowCount() === 0) {
                fallar(404, 'Mensaje no encontrado.');
            }
            echo json_encode(['ok' => true, 'mensaje' => 'Mensaje eliminado correctamente.']);
        } catch (PDOException $e) {
            fallar(500, 'Error al eliminar el mensaje.');
        }
        break;

    default:
        fallar(405, 'Método no permitido.');
}
