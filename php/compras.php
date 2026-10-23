<?php
/*
 * php/compras.php
 * POST            Registra una compra (público): valida el carrito, toma precios y
 *                 stock de la base de datos, todo dentro de una transacción.
 * GET             Historial de compras (solo admin).
 * GET ?id=N       Detalle de una compra con sus productos (solo admin).
 * No recibe ni guarda datos de tarjeta; solo el método de pago elegido.
 * Requiere de db.php: $pdo (PDO con ERRMODE_EXCEPTION) y fallar($mensaje, $codigo).
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

const MAX_LINEAS = 50;
const MAX_CANTIDAD = 1000;
const MAX_HISTORIAL = 500;

function leerJson(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        fallar('Datos inválidos', 400);
    }
    return $datos;
}

function texto($valor, int $max): string
{
    if (!is_string($valor)) {
        fallar('Faltan datos obligatorios', 400);
    }
    $valor = trim($valor);
    if ($valor === '' || mb_strlen($valor) > $max) {
        fallar('Datos inválidos o demasiado largos', 400);
    }
    return $valor;
}

function leerLineas($items): array
{
    if (!is_array($items) || !$items || count($items) > MAX_LINEAS) {
        fallar('Carrito inválido', 400);
    }

    $lineas = [];
    foreach ($items as $item) {
        $item = is_array($item) ? $item : [];
        $id = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $cantidad = filter_var($item['cantidad'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_CANTIDAD]]);
        if ($id === false || $cantidad === false) {
            fallar('Carrito inválido', 400);
        }
        $lineas[$id] = ($lineas[$id] ?? 0) + $cantidad;
        if ($lineas[$id] > MAX_CANTIDAD) {
            fallar('Cantidad demasiado grande', 400);
        }
    }

    ksort($lineas);
    return $lineas;
}

function registrarCompra(PDO $pdo, array $d): array
{
    $nombre = texto($d['cliente_nombre'] ?? null, 100);
    $telefono = texto($d['cliente_telefono'] ?? null, 20);
    $direccion = texto($d['cliente_direccion'] ?? null, 255);
    $metodo = $d['metodo_pago'] ?? 'efectivo';
    if (!in_array($metodo, ['efectivo', 'tarjeta'], true)) {
        fallar('Método de pago inválido', 400);
    }
    $lineas = leerLineas($d['items'] ?? null);
    $usuarioId = usuario_actual()['id'] ?? null;

    $ids = array_keys($lineas);
    $marcas = implode(',', array_fill(0, count($ids), '?'));

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT id, nombre, precio, stock FROM productos WHERE activo = 1 AND id IN ($marcas) ORDER BY id FOR UPDATE");
        $stmt->execute($ids);
        $productos = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
            $productos[(int) $p['id']] = $p;
        }

        $centavos = 0;
        $detalle = [];
        foreach ($lineas as $id => $cantidad) {
            $p = $productos[$id] ?? null;
            if (!$p) {
                throw new RuntimeException('Un producto de tu carrito ya no está disponible', 409);
            }
            if ((int) $p['stock'] < $cantidad) {
                throw new RuntimeException('Stock insuficiente de ' . $p['nombre'], 409);
            }
            $precio = (float) $p['precio'];
            $centavos += (int) round($precio * 100) * $cantidad;
            $detalle[] = ['id' => $id, 'nombre' => $p['nombre'], 'precio' => $precio, 'cantidad' => $cantidad];
        }
        $total = $centavos / 100;

        $pdo->prepare('INSERT INTO compras (usuario_id, nombre_cliente, telefono, direccion, metodo_pago, total) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$usuarioId, $nombre, $telefono, $direccion, $metodo, $total]);
        $compraId = (int) $pdo->lastInsertId();

        $insertar = $pdo->prepare('INSERT INTO compras_detalle (compra_id, producto_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?, ?)');
        $descontar = $pdo->prepare('UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?');
        foreach ($detalle as $l) {
            $insertar->execute([$compraId, $l['id'], $l['nombre'], $l['precio'], $l['cantidad']]);
            $descontar->execute([$l['cantidad'], $l['id'], $l['cantidad']]);
            if ($descontar->rowCount() !== 1) {
                throw new RuntimeException('Stock insuficiente de ' . $l['nombre'], 409);
            }
        }

        $pdo->commit();
    } catch (RuntimeException $e) {
        $pdo->rollBack();
        fallar($e->getMessage(), (int) $e->getCode() ?: 400);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return [
        'ok' => true,
        'id' => $compraId,
        'total' => $total,
        'metodo_pago' => $metodo,
        'items' => $detalle,
    ];
}

function listarCompras(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT c.id, c.nombre_cliente, c.telefono, c.metodo_pago, c.total, c.creado_en,
                COALESCE(SUM(d.cantidad), 0) AS articulos
         FROM compras c
         LEFT JOIN compras_detalle d ON d.compra_id = c.id
         GROUP BY c.id
         ORDER BY c.id DESC
         LIMIT ' . MAX_HISTORIAL
    );
    $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($filas as &$f) {
        $f['id'] = (int) $f['id'];
        $f['total'] = (float) $f['total'];
        $f['articulos'] = (int) $f['articulos'];
    }
    return $filas;
}

function detalleCompra(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare('SELECT id, usuario_id, nombre_cliente, telefono, direccion, metodo_pago, total, creado_en FROM compras WHERE id = ?');
    $stmt->execute([$id]);
    $compra = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$compra) {
        fallar('Compra no encontrada', 404);
    }
    $compra['id'] = (int) $compra['id'];
    $compra['usuario_id'] = $compra['usuario_id'] === null ? null : (int) $compra['usuario_id'];
    $compra['total'] = (float) $compra['total'];

    $stmt = $pdo->prepare('SELECT producto_id, nombre, precio, cantidad FROM compras_detalle WHERE compra_id = ? ORDER BY id');
    $stmt->execute([$id]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$i) {
        $i['producto_id'] = $i['producto_id'] === null ? null : (int) $i['producto_id'];
        $i['precio'] = (float) $i['precio'];
        $i['cantidad'] = (int) $i['cantidad'];
    }
    $compra['items'] = $items;

    return $compra;
}

function misCompras(PDO $pdo, int $usuarioId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, direccion, metodo_pago, total, creado_en FROM compras
         WHERE usuario_id = ? ORDER BY id DESC LIMIT ' . MAX_HISTORIAL
    );
    $stmt->execute([$usuarioId]);
    $compras = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$compras) {
        return [];
    }

    $ids = array_column($compras, 'id');
    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT compra_id, nombre, precio, cantidad FROM compras_detalle WHERE compra_id IN ($marcas) ORDER BY id");
    $stmt->execute($ids);

    $items = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $i) {
        $items[(int) $i['compra_id']][] = [
            'nombre' => $i['nombre'],
            'precio' => (float) $i['precio'],
            'cantidad' => (int) $i['cantidad'],
        ];
    }

    return array_map(fn($c) => [
        'id' => (int) $c['id'],
        'direccion' => $c['direccion'],
        'metodo_pago' => $c['metodo_pago'],
        'total' => (float) $c['total'],
        'creado_en' => $c['creado_en'],
        'items' => $items[(int) $c['id']] ?? [],
    ], $compras);
}

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'POST') {
    http_response_code(201);
    echo json_encode(registrarCompra($pdo, leerJson()), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($metodo === 'GET') {
    if (isset($_GET['mias'])) {
        $usuario = usuario_actual();
        if (!$usuario) {
            fallar('Debes iniciar sesión', 401);
        }
        echo json_encode(misCompras($pdo, (int) $usuario['id']), JSON_UNESCAPED_UNICODE);
        exit;
    }

    requerir_rol('admin');
    if (isset($_GET['id'])) {
        $id = filter_var($_GET['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            fallar('ID inválido', 400);
        }
        echo json_encode(detalleCompra($pdo, $id), JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(listarCompras($pdo), JSON_UNESCAPED_UNICODE);
    }
    exit;
}

if ($metodo === 'DELETE') {
    requerir_rol('admin');

    if (isset($_GET['todas'])) {
        $pdo->exec('DELETE FROM compras');
        echo json_encode(['ok' => true]);
        exit;
    }

    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        fallar('ID inválido', 400);
    }

    $stmt = $pdo->prepare('DELETE FROM compras WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        fallar('Compra no encontrada', 404);
    }

    echo json_encode(['ok' => true]);
    exit;
}

fallar('Método no permitido', 405);