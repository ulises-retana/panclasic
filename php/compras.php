<?php
// ============================================
// Pan Clásico — API de Compras y Pedidos
// ============================================
// Endpoints:
//   POST php/compras.php          → Registrar compra + descontar stock (transaccional)
//   GET  php/compras.php          → Listar historial de compras (admin)
//   GET  php/compras.php?id=1     → Obtener compra específica con su detalle (admin)
// ============================================

require_once __DIR__ . '/config/db.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {

    // ========================================
    // POST — Registrar nueva compra
    // ========================================
    case 'POST':
        try {
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);

            if (!$datos || !is_array($datos)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Cuerpo de solicitud JSON inválido.']);
                exit();
            }

            // Validar campos del cliente
            $nombreCliente = trim($datos['nombre_cliente'] ?? '');
            $telefono      = trim($datos['telefono'] ?? '');
            $direccion     = trim($datos['direccion'] ?? '');
            $metodoPago    = trim($datos['metodo_pago'] ?? 'efectivo');
            $productos     = $datos['productos'] ?? [];

            if (empty($nombreCliente)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'El nombre del cliente es obligatorio.']);
                exit();
            }

            if (empty($direccion)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'La dirección de entrega es obligatoria.']);
                exit();
            }

            if (!is_array($productos) || count($productos) === 0) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'El pedido debe incluir al menos un producto.']);
                exit();
            }

            // Validar datos de tarjeta si aplica
            $tarjetaUltimos4 = null;
            $tarjetaTitular  = null;
            $tarjetaVence    = null;

            if ($metodoPago === 'tarjeta') {
                $tarjetaInfo = $datos['tarjeta'] ?? [];
                $tarjetaUltimos4 = trim($tarjetaInfo['ultimos4'] ?? '');
                $tarjetaTitular  = trim($tarjetaInfo['titular'] ?? '');
                $tarjetaVence    = trim($tarjetaInfo['vence'] ?? '');

                if (empty($tarjetaUltimos4) || empty($tarjetaTitular)) {
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'error' => 'Datos de tarjeta incompletos.']);
                    exit();
                }
            } else {
                $metodoPago = 'efectivo';
            }

            // Iniciar transacción atómica en MySQL
            $pdo->beginTransaction();

            $totalCalculado = 0.0;
            $itemsValidados = [];

            // 1. Validar productos, precios vigentes y stock en la base de datos
            $stmtProducto = $pdo->prepare('SELECT id, nombre, precio, stock, activo FROM productos WHERE id = :id FOR UPDATE');

            foreach ($productos as $item) {
                $productoId = (int) ($item['id'] ?? 0);
                $cantidad   = (int) ($item['cantidad'] ?? 0);

                if ($productoId <= 0 || $cantidad <= 0) {
                    $pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'error' => 'Cantidad o ID de producto inválido.']);
                    exit();
                }

                $stmtProducto->execute([':id' => $productoId]);
                $productoDB = $stmtProducto->fetch();

                if (!$productoDB || (int) $productoDB['activo'] !== 1) {
                    $pdo->rollBack();
                    http_response_code(404);
                    echo json_encode([
                        'ok'    => false,
                        'error' => "El producto '{$item['nombre']}' ya no se encuentra disponible."
                    ]);
                    exit();
                }

                $stockActual = (int) $productoDB['stock'];
                if ($stockActual < $cantidad) {
                    $pdo->rollBack();
                    http_response_code(409);
                    echo json_encode([
                        'ok'    => false,
                        'error' => "Stock insuficiente para '{$productoDB['nombre']}'. Disponibles: {$stockActual}."
                    ]);
                    exit();
                }

                $precioReal = (float) $productoDB['precio'];
                $subtotal   = $precioReal * $cantidad;
                $totalCalculado += $subtotal;

                $itemsValidados[] = [
                    'id'       => $productoId,
                    'nombre'   => $productoDB['nombre'],
                    'precio'   => $precioReal,
                    'cantidad' => $cantidad
                ];
            }

            // 2. Insertar cabecera de la compra
            $stmtCompra = $pdo->prepare('
                INSERT INTO compras (
                    nombre_cliente, telefono, direccion, metodo_pago, total,
                    tarjeta_ultimos4, tarjeta_titular, tarjeta_vence
                ) VALUES (
                    :nombre, :telefono, :direccion, :metodo_pago, :total,
                    :ultimos4, :titular, :vence
                )
            ');

            $stmtCompra->execute([
                ':nombre'      => $nombreCliente,
                ':telefono'    => $telefono,
                ':direccion'   => $direccion,
                ':metodo_pago' => $metodoPago,
                ':total'       => $totalCalculado,
                ':ultimos4'    => $tarjetaUltimos4,
                ':titular'     => $tarjetaTitular,
                ':vence'       => $tarjetaVence
            ]);

            $compraId = (int) $pdo->lastInsertId();

            // 3. Insertar detalle de productos y descontar stock
            $stmtDetalle = $pdo->prepare('
                INSERT INTO compras_detalle (compra_id, producto_id, nombre, precio, cantidad)
                VALUES (:compra_id, :producto_id, :nombre, :precio, :cantidad)
            ');

            $stmtDescontarStock = $pdo->prepare('
                UPDATE productos 
                SET stock = stock - :cantidad 
                WHERE id = :id
            ');

            foreach ($itemsValidados as $itemVal) {
                // Registrar detalle
                $stmtDetalle->execute([
                    ':compra_id'    => $compraId,
                    ':producto_id'  => $itemVal['id'],
                    ':nombre'       => $itemVal['nombre'],
                    ':precio'       => $itemVal['precio'],
                    ':cantidad'     => $itemVal['cantidad']
                ]);

                // Descontar inventario
                $stmtDescontarStock->execute([
                    ':cantidad' => $itemVal['cantidad'],
                    ':id'       => $itemVal['id']
                ]);
            }

            // Confirmar transacción
            $pdo->commit();

            http_response_code(201);
            echo json_encode([
                'ok'      => true,
                'mensaje' => '¡Pedido registrado exitosamente!',
                'id'      => $compraId,
                'total'   => round($totalCalculado, 2),
                'cliente' => $nombreCliente
            ]);

        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode([
                'ok'    => false,
                'error' => 'Error al procesar el pedido en el servidor.',
                'debug' => $e->getMessage()
            ]);
        }
        break;

    // ========================================
    // GET — Listar compras o ver detalle
    // ========================================
    case 'GET':
        try {
            // Si viene ?id=X, devolver una sola compra con su desglose
            if (isset($_GET['id'])) {
                $compraId = (int) $_GET['id'];

                $stmtCompra = $pdo->prepare('SELECT * FROM compras WHERE id = :id');
                $stmtCompra->execute([':id' => $compraId]);
                $compra = $stmtCompra->fetch();

                if (!$compra) {
                    http_response_code(404);
                    echo json_encode(['ok' => false, 'error' => 'Compra no encontrada.']);
                    exit();
                }

                $stmtDetalle = $pdo->prepare('SELECT * FROM compras_detalle WHERE compra_id = :compra_id');
                $stmtDetalle->execute([':compra_id' => $compraId]);
                $detalle = $stmtDetalle->fetchAll();

                $compra['productos'] = $detalle;

                echo json_encode([
                    'ok'     => true,
                    'compra' => $compra
                ]);
            } else {
                // Listar todas las compras ordenadas de la más reciente a la más antigua
                $stmt = $pdo->query('
                    SELECT c.*, COUNT(cd.id) as total_items
                    FROM compras c
                    LEFT JOIN compras_detalle cd ON c.id = cd.compra_id
                    GROUP BY c.id
                    ORDER BY c.fecha DESC
                ');
                $compras = $stmt->fetchAll();

                echo json_encode([
                    'ok'      => true,
                    'compras' => $compras
                ]);
            }

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'ok'    => false,
                'error' => 'Error al consultar las compras.'
            ]);
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
