<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php';
require 'auth_guard.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = isset($_GET['class_id'])
        ? "SELECT * FROM deleted_classes_reports WHERE class_id = :class_id ORDER BY report_id DESC"
        : "SELECT * FROM deleted_classes_reports ORDER BY report_id DESC";
    $stmt = $pdo->prepare($sql);
    if (isset($_GET['class_id'])) {
        $stmt->execute(['class_id' => $_GET['class_id']]);
    } else {
        $stmt->execute();
    }
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['report_id'])) {
        echo json_encode(["error" => "Missing report_id"]);
        exit;
    }
    $total = (int) ($data['tedad_shagerdan'] ?? 0);
    $present = (int) ($data['hazeran'] ?? 0);
    $stmt = $pdo->prepare("UPDATE deleted_classes_reports SET
        tedad_shagerdan = :tedad_shagerdan, hazeran = :hazeran,
        gheir_hazeran = :gheir_hazeran, onvan_dars = :onvan_dars,
        nesab = :nesab, hafta = :hafta, month = :month, month_week = :month_week
        WHERE report_id = :report_id");
    $stmt->execute([
        'tedad_shagerdan' => $total,
        'hazeran' => $present,
        'gheir_hazeran' => max(0, $total - $present),
        'onvan_dars' => $data['onvan_dars'] ?? null,
        'nesab' => $data['nesab'] ?? null,
        'hafta' => $data['hafta'] ?? null,
        'month' => $data['month'] ?? null,
        'month_week' => $data['month_week'] ?? null,
        'report_id' => $data['report_id'],
    ]);
    echo json_encode(["message" => "Deleted report updated successfully"]);
    exit;
}

if ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $data);
    if (!isset($data['report_id'])) {
        echo json_encode(["error" => "Missing report_id"]);
        exit;
    }
    $stmt = $pdo->prepare("DELETE FROM deleted_classes_reports WHERE report_id = :report_id");
    $stmt->execute(['report_id' => $data['report_id']]);
    echo json_encode(["message" => "Deleted report permanently removed"]);
    exit;
}

echo json_encode(["error" => "Unsupported request method"]);
