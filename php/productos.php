<?php
/*
 * php/productos.php — Catálogo de productos.
 *   GET           Público: productos activos.
 *   GET ?todos=1  Admin: todos, incluidos los inactivos.
 *   POST          Admin: crea un producto.
 *   PUT           Admin: actualiza un producto (el id va en el cuerpo JSON).
 * Un producto no se borra: se desactiva (activo = 0).
 * Requiere de db.php: $pdo y fallar(); de auth.php: requerir_rol().
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

const PRECIO_MAX = 999999.99;
const STOCK_MAX = 1000000;

function leerJson(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        fallar('Datos inválidos', 400);
    }
    return $datos;
}

function textoObligatorio($valor, int $max, string $campo): string
{
    if (!is_string($valor) || trim($valor) === '') {
        fallar("El campo $campo es obligatorio", 400);
    }
    $valor = trim($valor);
    if (mb_strlen($valor) > $max) {
        fallar("El campo $campo no puede superar $max caracteres", 400);
    }
    return $valor;
}

function textoOpcional($valor, int $max, string $campo): ?string
{
    if ($valor === null || $valor === '') {
        return null;
    }
    if (!is_string($valor) || mb_strlen(trim($valor)) > $max) {
        fallar("El campo $campo no es válido o supera $max caracteres", 400);
    }
    return trim($valor) === '' ? null : trim($valor);
}

function leerProducto(array $d): array
{
    $precio = filter_var($d['precio'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($precio === false || $precio < 0 || $precio > PRECIO_MAX) {
        fallar('El precio debe ser un número entre 0 y ' . PRECIO_MAX, 400);
    }

    $stock = filter_var($d['stock'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => STOCK_MAX]]);
    if ($stock === false) {
        fallar('El stock debe ser un entero entre 0 y ' . STOCK_MAX, 400);
    }

    $activo = $d['activo'] ?? 1;
    if (!in_array($activo, [0, 1, '0', '1', true, false], true)) {
        fallar('Estado inválido', 400);
    }

    $imagen = textoOpcional($d['imagen'] ?? null, 255, 'imagen');
    if ($imagen !== null
        && (str_contains($imagen, '..') || !preg_match('#^(https://[^\s"\'<>]+|[A-Za-z0-9_\-./]+)$#', $imagen))) {
        fallar('La ruta de la imagen no es válida', 400);
    }

    return [
        'nombre'      => textoObligatorio($d['nombre'] ?? null, 100, 'nombre'),
        'descripcion' => textoOpcional($d['descripcion'] ?? null, 1000, 'descripción'),
        'precio'      => round($precio, 2),
        'unidad'      => textoObligatorio($d['unidad'] ?? null, 30, 'unidad'),
        'categoria'   => textoObligatorio($d['categoria'] ?? null, 50, 'categoría'),
        'imagen'      => $imagen,
        'stock'       => $stock,
        'activo'      => (int) $activo,
    ];
}

function listarProductos(PDO $pdo, bool $todos): array
{
    $sql = 'SELECT id, nombre, descripcion, precio, unidad, categoria, imagen, stock, activo FROM productos'
         . ($todos ? '' : ' WHERE activo = 1')
         . ' ORDER BY categoria, nombre';
    $filas = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    foreach ($filas as &$f) {
        $f['id'] = (int) $f['id'];
        $f['precio'] = (float) $f['precio'];
        $f['stock'] = (int) $f['stock'];
        $f['activo'] = (int) $f['activo'];
    }
    return $filas;
}

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $todos = isset($_GET['todos']);
    if ($todos) {
        requerir_rol('admin');
    }
    echo json_encode(listarProductos($pdo, $todos), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($metodo === 'POST') {
    requerir_rol('admin');
    $p = leerProducto(leerJson());

    $stmt = $pdo->prepare(
        'INSERT INTO productos (nombre, descripcion, precio, unidad, categoria, imagen, stock, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$p['nombre'], $p['descripcion'], $p['precio'], $p['unidad'], $p['categoria'], $p['imagen'], $p['stock'], $p['activo']]);

    http_response_code(201);
    echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    exit;
}

if ($metodo === 'PUT') {
    requerir_rol('admin');
    $datos = leerJson();

    $id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        fallar('ID inválido', 400);
    }
    $p = leerProducto($datos);

    $existe = $pdo->prepare('SELECT 1 FROM productos WHERE id = ?');
    $existe->execute([$id]);
    if (!$existe->fetchColumn()) {
        fallar('Producto no encontrado', 404);
    }

    $stmt = $pdo->prepare(
        'UPDATE productos
         SET nombre = ?, descripcion = ?, precio = ?, unidad = ?, categoria = ?, imagen = ?, stock = ?, activo = ?
         WHERE id = ?'
    );
    $stmt->execute([$p['nombre'], $p['descripcion'], $p['precio'], $p['unidad'], $p['categoria'], $p['imagen'], $p['stock'], $p['activo'], $id]);

    echo json_encode(['ok' => true]);
    exit;
}

fallar('Método no permitido', 405);