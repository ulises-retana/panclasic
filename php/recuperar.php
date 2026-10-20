<?php
/* recuperar.php — Recuperar contraseña. POST {accion:'solicitar', email} envía un código por correo;
   POST {accion:'cambiar', email, codigo, password} lo valida y cambia la contraseña.
   Correo por API de Resend (RESEND_API_KEY, MAIL_FROM). Sin clave, el código se escribe en el log de PHP. */

require_once __DIR__ . '/config/db.php';

const CODIGO_MINUTOS = 15;
const CODIGO_INTENTOS = 5;
const CODIGO_ESPERA = 60;

function enviar_correo(string $para, string $codigo): void
{
    $clave = getenv('RESEND_API_KEY');
    if (!$clave) {
        error_log("Código de recuperación para $para: $codigo");
        return;
    }

    $contexto = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Authorization: Bearer $clave\r\nContent-Type: application/json\r\n",
        'content' => json_encode([
            'from' => getenv('MAIL_FROM') ?: 'Pan Clásico <onboarding@resend.dev>',
            'to' => [$para],
            'subject' => 'Código para recuperar tu contraseña',
            'text' => "Tu código es $codigo. Caduca en " . CODIGO_MINUTOS . " minutos.\nSi no lo pediste, ignora este mensaje."
        ]),
        'ignore_errors' => true,
        'timeout' => 10
    ]]);
    @file_get_contents('https://api.resend.com/emails', false, $contexto);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fallar('Método no permitido', 405);
}

$entrada = json_decode(file_get_contents('php://input'), true);
if (!is_array($entrada)) {
    fallar('Datos inválidos');
}

$accion = $entrada['accion'] ?? '';
$email = $entrada['email'] ?? '';
if (!is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    fallar('Correo inválido');
}

$consulta = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
$consulta->execute([$email]);
$usuarioId = $consulta->fetchColumn();

if ($accion === 'solicitar') {
    if ($usuarioId) {
        $reciente = $pdo->prepare(
            'SELECT 1 FROM recuperaciones WHERE usuario_id = ? AND creado_en > (NOW() - INTERVAL ' . CODIGO_ESPERA . ' SECOND)'
        );
        $reciente->execute([$usuarioId]);

        if (!$reciente->fetchColumn()) {
            $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $pdo->prepare('DELETE FROM recuperaciones WHERE usuario_id = ?')->execute([$usuarioId]);
            $pdo->prepare(
                'INSERT INTO recuperaciones (usuario_id, codigo_hash, expira_en)
                 VALUES (?, ?, NOW() + INTERVAL ' . CODIGO_MINUTOS . ' MINUTE)'
            )->execute([$usuarioId, password_hash($codigo, PASSWORD_DEFAULT)]);
            enviar_correo($email, $codigo);
        }
    }
    echo json_encode(['ok' => true]);
    exit;
}

if ($accion === 'cambiar') {
    $codigo = $entrada['codigo'] ?? '';
    $password = $entrada['password'] ?? '';

    if (!is_string($codigo) || !preg_match('/^\d{6}$/', $codigo)) {
        fallar('Código inválido');
    }
    if (!is_string($password) || strlen($password) < 8 || strlen($password) > 72) {
        fallar('La contraseña debe tener entre 8 y 72 caracteres');
    }
    if (!$usuarioId) {
        fallar('Código inválido o vencido');
    }

    $consulta = $pdo->prepare(
        'SELECT id, codigo_hash FROM recuperaciones
         WHERE usuario_id = ? AND expira_en > NOW() AND intentos < ' . CODIGO_INTENTOS . '
         ORDER BY id DESC LIMIT 1'
    );
    $consulta->execute([$usuarioId]);
    $registro = $consulta->fetch(PDO::FETCH_ASSOC);

    if (!$registro) {
        fallar('Código inválido o vencido');
    }

    if (!password_verify($codigo, $registro['codigo_hash'])) {
        $pdo->prepare('UPDATE recuperaciones SET intentos = intentos + 1 WHERE id = ?')->execute([$registro['id']]);
        fallar('Código inválido o vencido');
    }

    $pdo->beginTransaction();
    $pdo->prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $usuarioId]);
    $pdo->prepare('DELETE FROM recuperaciones WHERE usuario_id = ?')->execute([$usuarioId]);
    $pdo->commit();

    echo json_encode(['ok' => true]);
    exit;
}

fallar('Acción no válida');