<?php
// ============================================
// Pan Clásico — API de Compras y Pedidos
// ============================================
// Endpoints:
//   POST php/compras.php          → Registrar compra + descontar stock (transaccional)
//   GET  php/compras.php          → Historial de compras (solo admin)
//   GET  php/compras.php?id=1     → Una compra con su detalle (solo admin)
// ============================================

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

// --------------------------------------------
// POST: validar la petición y registrar el pedido
// --------------------------------------------

/**
 * Lee y valida el JSON recibido. Devuelve:
 *   cliente, telefono, direccion, metodo_pago,
 *   cantidades → [id_producto => cantidad], con las líneas repetidas ya sumadas
 */
function leerPedido(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);

    if (!is_array($datos)) {
        fallar(400, 'Cuerpo de solicitud JSON inválido.');
    }

    // --- Datos del cliente (los límites coinciden con las columnas de la tabla) ---
    $cliente   = is_string($datos['nombre_cliente'] ?? null) ? trim($datos['nombre_cliente']) : '';
    $telefono  = is_string($datos['telefono'] ?? null) ? trim($datos['telefono']) : '';
    $direccion = is_string($datos['direccion'] ?? null) ? trim($datos['direccion']) : '';

    if ($cliente === '' || strlen($cliente) > 150) {
        fallar(400, 'El nombre del cliente es obligatorio (máximo 150 caracteres).');
    }
    if ($direccion === '' || strlen($direccion) > 500) {
        fallar(400, 'La dirección de entrega es obligatoria (máximo 500 caracteres).');
    }
    if (strlen($telefono) > 20) {
        fallar(400, 'El teléfono no puede superar los 20 caracteres.');
    }

    // --- Método de pago ---
    $metodoPago = $datos['metodo_pago'] ?? 'efectivo';
    if ($metodoPago !== 'efectivo') {
        fallar(400, 'Por ahora solo aceptamos pago en efectivo al recibir.');
    }

    // --- Productos: se suman las líneas repetidas para validar el stock real ---
    $productos  = is_array($datos['productos'] ?? null) ? $datos['productos'] : [];
    $cantidades = [];

    foreach ($productos as $item) {
        $item     = is_array($item) ? $item : [];
        $id       = (int) ($item['id'] ?? 0);
        $cantidad = (int) ($item['cantidad'] ?? 0);

        if ($id <= 0 || $cantidad <= 0) {
            fallar(400, 'Cantidad o ID de producto inválido.');
        }
        $cantidades[$id] = ($cantidades[$id] ?? 0) + $cantidad;
    }

    if (count($cantidades) === 0) {
        fallar(400, 'El pedido debe incluir al menos un producto.');
    }

    ksort($cantidades);   // mismo orden de bloqueo en todos los pedidos: evita bloqueos mutuos

    return [
        'cliente'     => $cliente,
        'telefono'    => $telefono !== '' ? $telefono : null,
        'direccion'   => $direccion,
        'metodo_pago' => $metodoPago,
        'cantidades'  => $cantidades,
    ];
}

/**
 * Registra el pedido y descuenta el stock en UNA sola transacción:
 * o se guarda todo, o no se guarda nada. Devuelve [id_compra, total].
 */
function registrarPedido(PDO $pdo, array $pedido): array
{
    $pdo->beginTransaction();

    // 1. Validar con los datos reales de la BD (el precio del navegador no cuenta).
    //    FOR UPDATE bloquea cada fila hasta el commit para que dos pedidos no se pisen el stock.
    $stmtProducto = $pdo->prepare('SELECT id, nombre, precio, stock, activo FROM productos WHERE id = :id FOR UPDATE');
    $lineas = [];
    $total  = 0.0;

    foreach ($pedido['cantidades'] as $id => $cantidad) {
        $stmtProducto->execute([':id' => $id]);
        $producto = $stmtProducto->fetch();

        if (!$producto || (int) $producto['activo'] !== 1) {
            fallar(404, $producto
                ? "El producto '{$producto['nombre']}' ya no se encuentra disponible."
                : 'Un producto de tu carrito ya no se encuentra disponible.');
        }
        if ((int) $producto['stock'] < $cantidad) {
            fallar(409, "Stock insuficiente para '{$producto['nombre']}'. Disponibles: {$producto['stock']}.");
        }

        $precio   = (float) $producto['precio'];
        $total   += $precio * $cantidad;
        $lineas[] = ['id' => $id, 'nombre' => $producto['nombre'], 'precio' => $precio, 'cantidad' => $cantidad];
    }

    $total = round($total, 2);

    // 2. Cabecera de la compra
    $pdo->prepare('
        INSERT INTO compras (nombre_cliente, telefono, direccion, metodo_pago, total)
        VALUES (:nombre, :telefono, :direccion, :metodo_pago, :total)
    ')->execute([
        ':nombre'      => $pedido['cliente'],
        ':telefono'    => $pedido['telefono'],
        ':direccion'   => $pedido['direccion'],
        ':metodo_pago' => $pedido['metodo_pago'],
        ':total'       => $total,
    ]);
    $compraId = (int) $pdo->lastInsertId();

    // 3. Detalle de cada producto + descuento de inventario
    $stmtDetalle = $pdo->prepare('
        INSERT INTO compras_detalle (compra_id, producto_id, nombre, precio, cantidad)
        VALUES (:compra_id, :producto_id, :nombre, :precio, :cantidad)
    ');
    $stmtStock = $pdo->prepare('UPDATE productos SET stock = stock - :cantidad WHERE id = :id');

    foreach ($lineas as $linea) {
        $stmtDetalle->execute([
            ':compra_id'   => $compraId,
            ':producto_id' => $linea['id'],
            ':nombre'      => $linea['nombre'],
            ':precio'      => $linea['precio'],
            ':cantidad'    => $linea['cantidad'],
        ]);
        $stmtStock->execute([':cantidad' => $linea['cantidad'], ':id' => $linea['id']]);
    }

    $pdo->commit();

    return [$compraId, $total];
}

// --------------------------------------------
// Enrutado por método HTTP
// --------------------------------------------

switch ($_SERVER['REQUEST_METHOD']) {

    // ---------- POST: nueva compra (público) ----------
    case 'POST':
        try {
            $pedido = leerPedido();
            [$compraId, $total] = registrarPedido($pdo, $pedido);

            http_response_code(201);
            echo json_encode([
                'ok'      => true,
                'mensaje' => '¡Pedido registrado exitosamente!',
                'id'      => $compraId,
                'total'   => $total,
                'cliente' => $pedido['cliente'],
            ]);
        } catch (PDOException $e) {
            fallar(500, 'Error al procesar el pedido en el servidor.');
        }
        break;

    // ---------- GET: historial o detalle (solo admin) ----------
    case 'GET':
        requerir_rol('admin');
        try {
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare('SELECT * FROM compras WHERE id = :id');
                $stmt->execute([':id' => (int) $_GET['id']]);
                $compra = $stmt->fetch();

                if (!$compra) {
                    fallar(404, 'Compra no encontrada.');
                }

                $stmt = $pdo->prepare('SELECT * FROM compras_detalle WHERE compra_id = :compra_id');
                $stmt->execute([':compra_id' => $compra['id']]);
                $compra['productos'] = $stmt->fetchAll();

                echo json_encode(['ok' => true, 'compra' => $compra]);
            } else {
                $compras = $pdo->query('
                    SELECT c.*, COUNT(cd.id) AS total_items
                    FROM compras c
                    LEFT JOIN compras_detalle cd ON c.id = cd.compra_id
                    GROUP BY c.id
                    ORDER BY c.fecha DESC
                ')->fetchAll();

                echo json_encode(['ok' => true, 'compras' => $compras]);
            }
        } catch (PDOException $e) {
            fallar(500, 'Error al consultar las compras.');
        }
        break;

    default:
        fallar(405, 'Método no permitido.');
}
