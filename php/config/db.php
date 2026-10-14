<?php
// ============================================
// Pan Clásico — Conexión PDO a MySQL (XAMPP)
// ============================================
// Incluir en cualquier archivo PHP que necesite
// acceder a la base de datos:
//   require_once __DIR__ . '/../config/db.php';

// --- Configuración de la base de datos ---
$db_host = 'localhost';
$db_name = 'panaderia';
$db_user = 'root';       // Usuario por defecto de XAMPP
$db_pass = '';            // Sin contraseña por defecto en XAMPP
$db_charset = 'utf8mb4';

// --- Headers CORS + JSON ---
// Permitir peticiones desde el frontend (mismo origen en XAMPP)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responder inmediatamente a preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Conexión PDO ---
try {
    $dsn = "mysql:host=$db_host;dbname=$db_name;charset=$db_charset";

    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // Lanzar excepciones en errores
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // Devolver arrays asociativos
        PDO::ATTR_EMULATE_PREPARES   => false,                    // Usar prepared statements nativos
    ];

    $pdo = new PDO($dsn, $db_user, $db_pass, $opciones);

} catch (PDOException $e) {
    // En producción, no mostrar detalles del error
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => 'Error de conexión a la base de datos.'
        // Para debug en desarrollo, descomentar la siguiente línea:
        // 'detalle' => $e->getMessage()
    ]);
    exit();
}
