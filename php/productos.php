<?php
// ============================================
// Pan Clásico — API de Productos
// ============================================
// Endpoints:
//   GET    productos.php              → Listar todos los productos activos
//   GET    productos.php?id=1         → Obtener un producto por ID
//   POST   productos.php              → Agregar un producto nuevo (admin)
//   PUT    productos.php?id=1         → Editar un producto (admin)
//   DELETE productos.php?id=1         → Eliminar/desactivar un producto (admin)
// ============================================

require_once __DIR__ . '/config/db.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {

    // ========================================
    // GET — Listar productos
    // ========================================
    case 'GET':
        try {
            // Si viene ?id=X, devolver un solo producto
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare('SELECT * FROM productos WHERE id = :id');
                $stmt->execute([':id' => (int) $_GET['id']]);
                $producto = $stmt->fetch();

                if ($producto) {
                    echo json_encode(['ok' => true, 'producto' => $producto]);
                } else {
                    http_response_code(404);
                    echo json_encode(['ok' => false, 'error' => 'Producto no encontrado.']);
                }
            } else {
                // Listar todos los activos (para el catálogo público)
                // Si viene ?todos=1, listar incluso los inactivos (para admin)
                if (isset($_GET['todos']) && $_GET['todos'] == '1') {
                    $stmt = $pdo->query('SELECT * FROM productos ORDER BY id DESC');
                } else {
                    $stmt = $pdo->query('SELECT * FROM productos WHERE activo = 1 ORDER BY id DESC');
                }
                $productos = $stmt->fetchAll();
                echo json_encode(['ok' => true, 'productos' => $productos]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error al consultar productos.']);
        }
        break;

    // ========================================
    // POST — Agregar producto nuevo
    // ========================================
    case 'POST':
        try {
            // Leer datos del body (JSON)
            $datos = json_decode(file_get_contents('php://input'), true);

            // Validar campos obligatorios
            if (empty($datos['nombre']) || !isset($datos['precio'])) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Nombre y precio son obligatorios.']);
                exit();
            }

            $stmt = $pdo->prepare('
                INSERT INTO productos (nombre, precio, unidad, descripcion, imagen, stock, categoria, activo)
                VALUES (:nombre, :precio, :unidad, :descripcion, :imagen, :stock, :categoria, :activo)
            ');

            $stmt->execute([
                ':nombre'      => $datos['nombre'],
                ':precio'      => (float) $datos['precio'],
                ':unidad'      => $datos['unidad']       ?? 'pieza',
                ':descripcion' => $datos['descripcion']  ?? null,
                ':imagen'      => $datos['imagen']       ?? null,
                ':stock'       => (int) ($datos['stock'] ?? 0),
                ':categoria'   => $datos['categoria']    ?? 'pan',
                ':activo'      => (int) ($datos['activo'] ?? 1),
            ]);

            $nuevoId = $pdo->lastInsertId();

            http_response_code(201);
            echo json_encode([
                'ok'      => true,
                'mensaje' => 'Producto creado exitosamente.',
                'id'      => (int) $nuevoId,
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error al crear el producto.']);
        }
        break;

    // ========================================
    // PUT — Editar producto existente
    // ========================================
    case 'PUT':
        try {
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Se requiere el parámetro id.']);
                exit();
            }

            $id = (int) $_GET['id'];
            $datos = json_decode(file_get_contents('php://input'), true);

            // Construir SET dinámicamente solo con los campos que se enviaron
            $camposPermitidos = ['nombre', 'precio', 'unidad', 'descripcion', 'imagen', 'stock', 'categoria', 'activo'];
            $sets = [];
            $params = [':id' => $id];

            foreach ($camposPermitidos as $campo) {
                if (array_key_exists($campo, $datos)) {
                    $sets[] = "$campo = :$campo";
                    $params[":$campo"] = $datos[$campo];
                }
            }

            if (empty($sets)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'No se enviaron campos para actualizar.']);
                exit();
            }

            $sql = 'UPDATE productos SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['ok' => true, 'mensaje' => 'Producto actualizado.']);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Producto no encontrado o sin cambios.']);
            }

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error al actualizar el producto.']);
        }
        break;

    // ========================================
    // DELETE — Desactivar producto (soft delete)
    // ========================================
    case 'DELETE':
        try {
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Se requiere el parámetro id.']);
                exit();
            }

            $id = (int) $_GET['id'];

            // Soft delete: marcar como inactivo (no se borra de la BD)
            $stmt = $pdo->prepare('UPDATE productos SET activo = 0 WHERE id = :id');
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['ok' => true, 'mensaje' => 'Producto desactivado.']);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Producto no encontrado.']);
            }

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error al eliminar el producto.']);
        }
        break;

    // ========================================
    // Método no soportado
    // ========================================
    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Método no permitido.']);
        break;
}
