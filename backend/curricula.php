<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php';
require 'auth_guard.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("SELECT curriculum_id, name, pages FROM curricula ORDER BY name");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            if (!isset($data['name'], $data['pages']) || trim($data['name']) === '' || !ctype_digit((string) $data['pages']) || (int) $data['pages'] < 1) {
                echo json_encode(["error" => "Name and a positive page count are required"]);
                break;
            }
            $stmt = $pdo->prepare("INSERT INTO curricula (name, pages) VALUES (:name, :pages)");
            $stmt->execute(['name' => trim($data['name']), 'pages' => (int) $data['pages']]);
            echo json_encode(["message" => "Curriculum added successfully"]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            if (!isset($data['curriculum_id'], $data['name'], $data['pages']) || trim($data['name']) === '' || !ctype_digit((string) $data['pages']) || (int) $data['pages'] < 1) {
                echo json_encode(["error" => "ID, name and a positive page count are required"]);
                break;
            }
            $oldStmt = $pdo->prepare("SELECT name FROM curricula WHERE curriculum_id = :id");
            $oldStmt->execute(['id' => $data['curriculum_id']]);
            $oldName = $oldStmt->fetchColumn();
            $stmt = $pdo->prepare("UPDATE curricula SET name = :name, pages = :pages WHERE curriculum_id = :id");
            $stmt->execute(['name' => trim($data['name']), 'pages' => (int) $data['pages'], 'id' => $data['curriculum_id']]);
            if ($oldName !== false && $oldName !== trim($data['name'])) {
                $renameStmt = $pdo->prepare("UPDATE reports SET nesab = :new_name WHERE nesab = :old_name");
                $renameStmt->execute(['new_name' => trim($data['name']), 'old_name' => $oldName]);
            }
            echo json_encode(["message" => "Curriculum updated successfully"]);
            break;

        case 'DELETE':
            parse_str(file_get_contents("php://input"), $data);
            if (!isset($data['curriculum_id'])) {
                echo json_encode(["error" => "Missing curriculum_id"]);
                break;
            }
            $nameStmt = $pdo->prepare("SELECT name FROM curricula WHERE curriculum_id = :id");
            $nameStmt->execute(['id' => $data['curriculum_id']]);
            $name = $nameStmt->fetchColumn();
            $usedStmt = $pdo->prepare("SELECT COUNT(*) FROM reports WHERE nesab = :name");
            $usedStmt->execute(['name' => $name]);
            if ((int) $usedStmt->fetchColumn() > 0) {
                echo json_encode(["error" => "This curriculum is used by a report and cannot be deleted"]);
                break;
            }
            $stmt = $pdo->prepare("DELETE FROM curricula WHERE curriculum_id = :id");
            $stmt->execute(['id' => $data['curriculum_id']]);
            echo json_encode(["message" => "Curriculum deleted successfully"]);
            break;

        default:
            echo json_encode(["error" => "Unsupported request method"]);
    }
} catch (PDOException $e) {
    http_response_code(400);
    echo json_encode(["error" => $e->getCode() === '23000' ? "A curriculum with this name already exists" : "Database operation failed"]);
}
