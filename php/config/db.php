<?php
/**
 * php/config/db.php
 * Conexión PDO a MySQL y respuesta de errores en JSON.
 * Lee las variables de entorno DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
 * y DB_SSL_CA; sin ellas usa los valores de XAMPP.
 */

header('Content-Type: application/json; charset=utf-8');

function fallar(string $mensaje, int $codigo = 400): never
{
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

function entorno(string $nombre, string $defecto): string
{
    $valor = getenv($nombre);
    return $valor === false || $valor === '' ? $defecto : $valor;
}

set_exception_handler(function (Throwable $e): void {
    error_log($e->getMessage());
    fallar('Error interno del servidor', 500);
});

$opciones = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$certificado = entorno('DB_SSL_CA', '');
if ($certificado !== '') {
    $opciones[PDO::MYSQL_ATTR_SSL_CA] = $certificado;
}

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    entorno('DB_HOST', '127.0.0.1'),
    entorno('DB_PORT', '3306'),
    entorno('DB_NAME', 'panaderia')
);

try {
    $pdo = new PDO($dsn, entorno('DB_USER', 'root'), entorno('DB_PASS', ''), $opciones);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fallar('No se pudo conectar con la base de datos', 500);
}