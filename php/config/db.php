<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function fallar(int $codigo, string $mensaje): void
{
    global $pdo;

    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit();
}

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$name = getenv('DB_NAME') ?: 'panaderia';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$charset = 'utf8mb4';

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

$sslCa = getenv('DB_SSL_CA');
if ($sslCa) {
    $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
}

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$name};charset={$charset}",
        $user,
        $pass,
        $options
    );
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    fallar(500, 'Error de conexión a la base de datos.');
}
