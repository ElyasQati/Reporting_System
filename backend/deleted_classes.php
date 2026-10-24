<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php';
require 'auth_guard.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM deleted_classes ORDER BY class_id DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['action'], $data['class_id']) || $data['action'] !== 'unarchive') {
        echo json_encode(["error" => "Invalid unarchive request"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $classId = $data['class_id'];
        $classCheck = $pdo->prepare("SELECT COUNT(*) FROM deleted_classes WHERE class_id = :class_id");
        $classCheck->execute(['class_id' => $classId]);
        if ((int) $classCheck->fetchColumn() !== 1) {
            throw new RuntimeException("Archived class not found");
        }

        $liveClassCheck = $pdo->prepare("SELECT COUNT(*) FROM classes WHERE class_id = :class_id");
        $liveClassCheck->execute(['class_id' => $classId]);
        if ((int) $liveClassCheck->fetchColumn() > 0) {
            throw new RuntimeException("A live class already uses this ID");
        }

        $restoreClass = $pdo->prepare("INSERT INTO classes SELECT * FROM deleted_classes WHERE class_id = :class_id");
        $restoreClass->execute(['class_id' => $classId]);

        $reportIds = $pdo->prepare("SELECT report_id FROM deleted_classes_reports WHERE class_id = :class_id");
        $reportIds->execute(['class_id' => $classId]);
        foreach ($reportIds->fetchAll(PDO::FETCH_COLUMN) as $reportId) {
            $liveReportCheck = $pdo->prepare("SELECT COUNT(*) FROM reports WHERE report_id = :report_id");
            $liveReportCheck->execute(['report_id' => $reportId]);
            if ((int) $liveReportCheck->fetchColumn() > 0) {
                throw new RuntimeException("A live report already uses ID " . $reportId);
            }
        }

        $restoreReports = $pdo->prepare("INSERT INTO reports SELECT * FROM deleted_classes_reports WHERE class_id = :class_id");
        $restoreReports->execute(['class_id' => $classId]);
        $deleteReports = $pdo->prepare("DELETE FROM deleted_classes_reports WHERE class_id = :class_id");
        $deleteReports->execute(['class_id' => $classId]);
        $deleteClass = $pdo->prepare("DELETE FROM deleted_classes WHERE class_id = :class_id");
        $deleteClass->execute(['class_id' => $classId]);

        $pdo->commit();
        echo json_encode(["message" => "Class and reports unarchived successfully"]);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo json_encode(["error" => $error->getMessage()]);
    }
    exit;
}

if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['class_id'])) {
        echo json_encode(["error" => "Missing class_id"]);
        exit;
    }
    $stmt = $pdo->prepare("UPDATE deleted_classes SET
        shomara = :shomara, nam_senf = :nam_senf, ostad_senf = :ostad_senf,
        negaran_senf = :negaran_senf, mahal_dars = :mahal_dars, time_senf = :time_senf
        WHERE class_id = :class_id");
    $stmt->execute([
        'shomara' => $data['shomara'] ?? null,
        'nam_senf' => $data['nam_senf'] ?? null,
        'ostad_senf' => $data['ostad_senf'] ?? null,
        'negaran_senf' => $data['negaran_senf'] ?? null,
        'mahal_dars' => $data['mahal_dars'] ?? null,
        'time_senf' => $data['time_senf'] ?? null,
        'class_id' => $data['class_id'],
    ]);
    echo json_encode(["message" => "Deleted class updated successfully"]);
    exit;
}

if ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $data);
    if (!isset($data['class_id'])) {
        echo json_encode(["error" => "Missing class_id"]);
        exit;
    }
    $pdo->beginTransaction();
    $reportStmt = $pdo->prepare("DELETE FROM deleted_classes_reports WHERE class_id = :class_id");
    $reportStmt->execute(['class_id' => $data['class_id']]);
    $stmt = $pdo->prepare("DELETE FROM deleted_classes WHERE class_id = :class_id");
    $stmt->execute(['class_id' => $data['class_id']]);
    $pdo->commit();
    echo json_encode(["message" => "Deleted class permanently removed"]);
    exit;
}

echo json_encode(["error" => "Unsupported request method"]);
