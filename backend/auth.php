<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode([
        'authenticated' => isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true,
        'username' => $_SESSION['username'] ?? null,
    ]);
    exit;
}

if ($method === 'DELETE') {
    $_SESSION = [];
    session_destroy();
    echo json_encode(['message' => 'Logged out successfully']);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Unsupported request method']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';
$localConfig = is_file(__DIR__ . '/config.local.php')
    ? require __DIR__ . '/config.local.php'
    : [];
$adminUsername = getenv('ADMIN_USERNAME') ?: ($localConfig['admin_username'] ?? 'admin');
$passwordHash = getenv('ADMIN_PASSWORD_HASH') ?: ($localConfig['admin_password_hash'] ?? '');

if ($passwordHash === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Authentication is not configured']);
    exit;
}

if ($username !== $adminUsername || !password_verify($password, $passwordHash)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password']);
    exit;
}

session_regenerate_id(true);
$_SESSION['authenticated'] = true;
$_SESSION['username'] = $username;
echo json_encode(['message' => 'Login successful', 'username' => $username]);
