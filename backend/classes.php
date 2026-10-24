<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php'; // include database connection
require 'auth_guard.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Read all classes
        $stmt = $pdo->query("SELECT * FROM classes");
        $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($classes);
        break;

    case 'POST':
        // Create a new class
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['shomara'], $data['nam_senf'], $data['ostad_senf'])) {
            $stmt = $pdo->prepare("INSERT INTO classes 
                (shomara, nam_senf, ostad_senf, negaran_senf, mahal_dars, time_senf) 
                VALUES (:shomara, :nam_senf, :ostad_senf, :negaran_senf, :mahal_dars, :time_senf)");
            $stmt->execute([
                'shomara' => $data['shomara'],
                'nam_senf' => $data['nam_senf'],
                'ostad_senf' => $data['ostad_senf'],
                'negaran_senf' => $data['negaran_senf'] ?? null,
                'mahal_dars' => $data['mahal_dars'] ?? null,
                'time_senf' => $data['time_senf'] ?? null
            ]);
            echo json_encode(["message" => "Class added successfully"]);
        } else {
            echo json_encode(["error" => "Missing required fields"]);
        }
        break;

    case 'PUT':
        // Update an existing class
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['class_id'])) {
            $stmt = $pdo->prepare("UPDATE classes SET 
                shomara = :shomara,
                nam_senf = :nam_senf,
                ostad_senf = :ostad_senf,
                negaran_senf = :negaran_senf,
                mahal_dars = :mahal_dars,
                time_senf = :time_senf
                WHERE class_id = :class_id");
            $stmt->execute([
                'shomara' => $data['shomara'],
                'nam_senf' => $data['nam_senf'],
                'ostad_senf' => $data['ostad_senf'],
                'negaran_senf' => $data['negaran_senf'],
                'mahal_dars' => $data['mahal_dars'],
                'time_senf' => $data['time_senf'],
                'class_id' => $data['class_id']
            ]);
            echo json_encode(["message" => "Class updated successfully"]);
        } else {
            echo json_encode(["error" => "Missing class_id"]);
        }
        break;

    case 'DELETE':
        parse_str(file_get_contents("php://input"), $data);
        if (isset($data['class_id'])) {
            try {
                $pdo->beginTransaction();
                $archiveClass = $pdo->prepare("INSERT INTO deleted_classes SELECT * FROM classes WHERE class_id = :class_id");
                $archiveClass->execute(['class_id' => $data['class_id']]);
                if ($archiveClass->rowCount() !== 1) {
                    throw new RuntimeException("Class not found");
                }
                $archiveReports = $pdo->prepare("INSERT INTO deleted_classes_reports SELECT * FROM reports WHERE class_id = :class_id");
                $archiveReports->execute(['class_id' => $data['class_id']]);
                $deleteReports = $pdo->prepare("DELETE FROM reports WHERE class_id = :class_id");
                $deleteReports->execute(['class_id' => $data['class_id']]);
                $deleteClass = $pdo->prepare("DELETE FROM classes WHERE class_id = :class_id");
                $deleteClass->execute(['class_id' => $data['class_id']]);
                $pdo->commit();
                echo json_encode(["message" => "Class and reports moved to deleted tables"]);
            } catch (Throwable $error) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(["error" => $error->getMessage()]);
            }
        } else {
            echo json_encode(["error" => "Missing class_id"]);
        }
        break;

    default:
        echo json_encode(["error" => "Unsupported request method"]);
        break;
}
