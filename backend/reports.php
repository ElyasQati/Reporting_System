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
        if (isset($_GET['class_id'])) {
            $stmt = $pdo->prepare("SELECT * FROM reports WHERE class_id = :class_id");
            $stmt->execute(['class_id' => $_GET['class_id']]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } else {
            $stmt = $pdo->query("SELECT * FROM reports");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        // Create a new report
        $rawInput = file_get_contents("php://input");
        $data = json_decode($rawInput, true);

        if (!is_array($data)) {
            parse_str($rawInput, $data);
        }

        if (isset($data['class_id'], $data['tedad_shagerdan'], $data['hazeran'], $data['onvan_dars'], $data['nesab'], $data['hafta'], $data['month'], $data['month_week']) && trim($data['month']) !== '') {
            $monthWeek = (int) $data['month_week'];
            if ($monthWeek < 1 || $monthWeek > 4) {
                echo json_encode(["error" => "Month-week must be between 1 and 4"]);
                break;
            }
            $totalStudents = filter_var($data['tedad_shagerdan'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            $presentStudents = filter_var($data['hazeran'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            if ($totalStudents === false || $presentStudents === false || $presentStudents > $totalStudents) {
                echo json_encode(["error" => "Students and present values must be non-negative integers, and present cannot exceed students"]);
                break;
            }
            $absentStudents = $totalStudents - $presentStudents;
            $curriculumStmt = $pdo->prepare("SELECT curriculum_id FROM curricula WHERE name = :name");
            $curriculumStmt->execute(['name' => trim($data['nesab'])]);
            if (!$curriculumStmt->fetchColumn()) {
                echo json_encode(["error" => "Please choose a curriculum from the curricula list"]);
                break;
            }
            $stmt = $pdo->prepare("INSERT INTO reports 
    (class_id, tedad_shagerdan, hazeran, gheir_hazeran, onvan_dars, nesab, hafta, month, month_week) 
    VALUES (:class_id, :tedad_shagerdan, :hazeran, :gheir_hazeran, :onvan_dars, :nesab, :hafta, :month, :month_week)");

            $stmt->execute([
                'class_id' => $data['class_id'],
                'tedad_shagerdan' => $data['tedad_shagerdan'],
                'hazeran' => $data['hazeran'],
                'gheir_hazeran' => $absentStudents,
                'onvan_dars' => $data['onvan_dars'],
                'nesab' => trim($data['nesab']),
                'hafta' => $data['hafta'],
                'month' => trim($data['month']),
                'month_week' => $monthWeek
            ]);
            echo json_encode(["message" => "Report added successfully"]);
        } else {
            echo json_encode(["error" => "Missing required fields"]);
        }
        break;

    case 'PUT':
        // Update an existing report
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['report_id'], $data['class_id'], $data['tedad_shagerdan'], $data['hazeran'], $data['onvan_dars'], $data['nesab'], $data['hafta'], $data['month'], $data['month_week']) && trim($data['month']) !== '') {
            $monthWeek = (int) ($data['month_week'] ?? 0);
            if ($monthWeek < 1 || $monthWeek > 4) {
                echo json_encode(["error" => "Month-week must be between 1 and 4"]);
                break;
            }
            $totalStudents = filter_var($data['tedad_shagerdan'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            $presentStudents = filter_var($data['hazeran'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            if ($totalStudents === false || $presentStudents === false || $presentStudents > $totalStudents) {
                echo json_encode(["error" => "Students and present values must be non-negative integers, and present cannot exceed students"]);
                break;
            }
            $absentStudents = $totalStudents - $presentStudents;
            $curriculumStmt = $pdo->prepare("SELECT curriculum_id FROM curricula WHERE name = :name");
            $curriculumStmt->execute(['name' => trim($data['nesab'] ?? '')]);
            if (!$curriculumStmt->fetchColumn()) {
                echo json_encode(["error" => "Please choose a curriculum from the curricula list"]);
                break;
            }
            $stmt = $pdo->prepare("UPDATE reports SET 
                class_id = :class_id,
                tedad_shagerdan = :tedad_shagerdan,
                hazeran = :hazeran,
                gheir_hazeran = :gheir_hazeran,
                onvan_dars = :onvan_dars,
                nesab = :nesab,
                hafta = :hafta,
                month = :month,
                month_week = :month_week
                WHERE report_id = :report_id");
            $stmt->execute([
                'class_id' => $data['class_id'],
                'tedad_shagerdan' => $data['tedad_shagerdan'],
                'hazeran' => $data['hazeran'],
                'gheir_hazeran' => $absentStudents,
                'onvan_dars' => $data['onvan_dars'],
                'nesab' => trim($data['nesab']),
                'hafta' => $data['hafta'],
                'month' => trim($data['month'] ?? ''),
                'month_week' => $monthWeek,
                'report_id' => $data['report_id']
            ]);
            echo json_encode(["message" => "Report updated successfully"]);
        } else {
            echo json_encode(["error" => "Missing report_id"]);
        }
        break;

    case 'DELETE':
        // Delete a report
        parse_str(file_get_contents("php://input"), $data);
        if (isset($data['report_id'])) {
            $stmt = $pdo->prepare("DELETE FROM reports WHERE report_id = :report_id");
            $stmt->execute(['report_id' => $data['report_id']]);
            echo json_encode(["message" => "Report deleted successfully"]);
        } else {
            echo json_encode(["error" => "Missing report_id"]);
        }
        break;

    default:
        echo json_encode(["error" => "Unsupported request method"]);
        break;
}
