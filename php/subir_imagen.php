<?php
/* subir_imagen.php — Solo admin. POST multipart con el campo "imagen" (jpg, png o webp, máx. 2 MB).
   Con CLOUDINARY_URL (cloudinary://clave:secreto@nombre) sube a Cloudinary; sin ella guarda en public/img/productos/.
   Responde {ruta}: URL completa (Cloudinary) o ruta relativa a public/ (local). */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

const MAX_BYTES = 2097152;
const TIPOS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fallar('Método no permitido', 405);
}

requerir_rol('admin');

$archivo = $_FILES['imagen'] ?? null;
if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($archivo['tmp_name'])) {
    fallar('No se recibió la imagen');
}
if ($archivo['size'] > MAX_BYTES) {
    fallar('La imagen no debe superar 2 MB');
}

$tipo = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
if (!isset(TIPOS[$tipo]) || !getimagesize($archivo['tmp_name'])) {
    fallar('Formato no permitido. Usa JPG, PNG o WebP');
}

$nombre = bin2hex(random_bytes(12)) . '.' . TIPOS[$tipo];
$cloudinary = getenv('CLOUDINARY_URL');

if ($cloudinary) {
    $partes = parse_url($cloudinary);
    if (!$partes || empty($partes['user']) || empty($partes['pass']) || empty($partes['host']) || !function_exists('curl_init')) {
        fallar('Cloudinary no está configurado correctamente', 500);
    }

    $marca = time();
    $firma = sha1("timestamp=$marca" . $partes['pass']);
    $curl = curl_init("https://api.cloudinary.com/v1_1/{$partes['host']}/image/upload");
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_POSTFIELDS => [
            'file' => new CURLFile($archivo['tmp_name'], $tipo, $nombre),
            'api_key' => $partes['user'],
            'timestamp' => $marca,
            'signature' => $firma
        ]
    ]);
    $respuesta = json_decode((string) curl_exec($curl), true);
    curl_close($curl);

    if (empty($respuesta['secure_url'])) {
        fallar('No se pudo subir la imagen', 502);
    }
    echo json_encode(['ruta' => $respuesta['secure_url']]);
    exit;
}

$carpeta = __DIR__ . '/../public/img/productos';
if (!is_dir($carpeta) && !mkdir($carpeta, 0755, true)) {
    fallar('No se pudo crear la carpeta de imágenes', 500);
}
if (!move_uploaded_file($archivo['tmp_name'], "$carpeta/$nombre")) {
    fallar('No se pudo guardar la imagen', 500);
}

echo json_encode(['ruta' => "img/productos/$nombre"]);