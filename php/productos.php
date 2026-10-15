<?php
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

function validarProducto(array $datos, bool $completo = true): array
{
    $permitidos = ['nombre', 'precio', 'unidad', 'descripcion', 'imagen', 'stock', 'categoria', 'activo'];
    $resultado = [];
    foreach ($permitidos as $campo) {
        if (array_key_exists($campo, $datos)) {
            $resultado[$campo] = $datos[$campo];
        }
    }
    if ($completo && (!isset($resultado['nombre']) || !array_key_exists('precio', $resultado))) {
        fallar(400, 'Nombre y precio son obligatorios.');
    }
    if (array_key_exists('nombre', $resultado)
        && (!is_string($resultado['nombre']) || trim($resultado['nombre']) === '' || strlen(trim($resultado['nombre'])) > 150)) {
        fallar(400, 'El nombre es obligatorio y no puede superar 150 caracteres.');
    }
    if (array_key_exists('precio', $resultado)
        && (!is_numeric($resultado['precio']) || (float) $resultado['precio'] < 0)) {
        fallar(400, 'El precio debe ser un número mayor o igual a cero.');
    }
    if (array_key_exists('stock', $resultado)
        && (filter_var($resultado['stock'], FILTER_VALIDATE_INT) === false || (int) $resultado['stock'] < 0)) {
        fallar(400, 'El stock debe ser un entero mayor o igual a cero.');
    }
    if (array_key_exists('activo', $resultado)
        && !in_array((string) $resultado['activo'], ['0', '1'], true)) {
        fallar(400, 'El estado del producto no es válido.');
    }
    foreach (['unidad' => 50, 'descripcion' => 5000, 'imagen' => 255, 'categoria' => 100] as $campo => $maximo) {
        if (isset($resultado[$campo]) && (!is_string($resultado[$campo]) || strlen($resultado[$campo]) > $maximo)) {
            fallar(400, "El campo {$campo} supera la longitud permitida.");
        }
    }
    if (isset($resultado['nombre'])) {
        $resultado['nombre'] = trim($resultado['nombre']);
    }
    if (isset($resultado['precio'])) {
        $resultado['precio'] = number_format((float) $resultado['precio'], 2, '.', '');
    }
    if (isset($resultado['stock'])) {
        $resultado['stock'] = (int) $resultado['stock'];
    }
    if (isset($resultado['activo'])) {
        $resultado['activo'] = (int) $resultado['activo'];
    }
    return $resultado;
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $todos = ($_GET['todos'] ?? '') === '1';
        if ($todos) {
            requerir_rol('admin');
        }
        try {
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare($todos
                    ? 'SELECT * FROM productos WHERE id = :id'
                    : 'SELECT * FROM productos WHERE id = :id AND activo = 1');
                $stmt->execute([':id' => filter_var($_GET['id'], FILTER_VALIDATE_INT) ?: 0]);
                $producto = $stmt->fetch();
                if (!$producto) {
                    fallar(404, 'Producto no encontrado.');
                }
                echo json_encode(['ok' => true, 'producto' => $producto], JSON_UNESCAPED_UNICODE);
            } else {
                $sql = $todos
                    ? 'SELECT * FROM productos ORDER BY id DESC'
                    : 'SELECT * FROM productos WHERE activo = 1 ORDER BY id DESC';
                echo json_encode(['ok' => true, 'productos' => $pdo->query($sql)->fetchAll()], JSON_UNESCAPED_UNICODE);
            }
        } catch (PDOException $e) {
            fallar(500, 'Error al consultar productos.');
        }
        break;

    case 'POST':
        requerir_rol('admin');
        $datos = json_decode(file_get_contents('php://input'), true);
        if (!is_array($datos)) {
            fallar(400, 'Cuerpo JSON inválido.');
        }
        $datos = validarProducto($datos);
        $datos += ['unidad' => 'pieza', 'descripcion' => null, 'imagen' => null, 'stock' => 0, 'categoria' => 'pan', 'activo' => 1];
        try {
            $stmt = $pdo->prepare('INSERT INTO productos (nombre, precio, unidad, descripcion, imagen, stock, categoria, activo)
                VALUES (:nombre, :precio, :unidad, :descripcion, :imagen, :stock, :categoria, :activo)');
            $stmt->execute(array_combine(
                array_map(static fn($key) => ':' . $key, array_keys($datos)),
                array_values($datos)
            ));
            http_response_code(201);
            echo json_encode(['ok' => true, 'mensaje' => 'Producto creado.', 'id' => (int) $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            fallar(500, 'Error al crear el producto.');
        }
        break;

    case 'PUT':
        requerir_rol('admin');
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $datos = json_decode(file_get_contents('php://input'), true);
        if (!$id || !is_array($datos)) {
            fallar(400, 'Indica un ID y datos JSON válidos.');
        }
        $datos = validarProducto($datos, false);
        if (!$datos) {
            fallar(400, 'No se enviaron campos para actualizar.');
        }
        $sets = [];
        $params = [':id' => $id];
        foreach ($datos as $campo => $valor) {
            $sets[] = "{$campo} = :{$campo}";
            $params[":{$campo}"] = $valor;
        }
        try {
            $stmt = $pdo->prepare('UPDATE productos SET ' . implode(', ', $sets) . ' WHERE id = :id');
            $stmt->execute($params);
            if ($stmt->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT 1 FROM productos WHERE id = :id');
                $exists->execute([':id' => $id]);
                if (!$exists->fetchColumn()) {
                    fallar(404, 'Producto no encontrado.');
                }
            }
            echo json_encode(['ok' => true, 'mensaje' => 'Producto actualizado.']);
        } catch (PDOException $e) {
            fallar(500, 'Error al actualizar el producto.');
        }
        break;

    case 'DELETE':
        requerir_rol('admin');
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id) {
            fallar(400, 'Se requiere un ID válido.');
        }
        try {
            $stmt = $pdo->prepare('UPDATE productos SET activo = 0 WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if ($stmt->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT 1 FROM productos WHERE id = :id');
                $exists->execute([':id' => $id]);
                if (!$exists->fetchColumn()) {
                    fallar(404, 'Producto no encontrado.');
                }
            }
            echo json_encode(['ok' => true, 'mensaje' => 'Producto desactivado.']);
        } catch (PDOException $e) {
            fallar(500, 'Error al desactivar el producto.');
        }
        break;

    default:
        fallar(405, 'Método no permitido.');
}
