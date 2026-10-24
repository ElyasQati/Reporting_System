<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php';
require 'auth_guard.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Unsupported request method"]);
    exit;
}

if (!class_exists('ZipArchive') && !class_exists('PharData')) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["error" => "PHP ZIP or TAR archive support is required for backups"]);
    exit;
}

try {
    $tableRows = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $zipPath = tempnam(sys_get_temp_dir(), 'reporting_backup_');
    $useZip = class_exists('ZipArchive');
    if ($useZip) {
        $archive = new ZipArchive();
        if ($archive->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException("Unable to create backup archive");
        }
    } else {
        @unlink($zipPath);
        $archive = new PharData($zipPath . '.tar');
        $zipPath .= '.tar';
    }

    foreach ($tableRows as $table) {
        $csvPath = tempnam(sys_get_temp_dir(), 'reporting_csv_');
        $handle = fopen($csvPath, 'wb');
        if ($handle === false) {
            throw new RuntimeException("Unable to create CSV export");
        }

        fwrite($handle, "\xEF\xBB\xBF");
        $quotedTable = '`' . str_replace('`', '``', $table) . '`';
        $columns = $pdo->query("SHOW COLUMNS FROM $quotedTable")->fetchAll(PDO::FETCH_COLUMN);
        fputcsv($handle, $columns);

        $rows = $pdo->query("SELECT * FROM $quotedTable");
        while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($handle, array_map(static fn($column) => $column === null ? '' : $column, $row));
        }
        fclose($handle);

        $archive->addFile($csvPath, "$table.csv");
    }

    $archive->addFromString('README.txt', "Reporting System database backup\r\nGenerated: " . gmdate('c') . "\r\nEach CSV file contains one database table.\r\n");
    if ($useZip) {
        $archive->close();
    }

    $extension = $useZip ? 'zip' : 'tar';
    $filename = 'reporting_system_backup_' . gmdate('Y-m-d_H-i-s') . '.' . $extension;
    header('Content-Type: ' . ($useZip ? 'application/zip' : 'application/x-tar'));
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($zipPath));
    header('Cache-Control: no-store');
    readfile($zipPath);

    foreach (glob(sys_get_temp_dir() . '/reporting_csv_*') ?: [] as $csvPath) {
        @unlink($csvPath);
    }
    @unlink($zipPath);
} catch (Throwable $error) {
    if (isset($archive) && $archive instanceof ZipArchive) {
        $archive->close();
    }
    if (isset($zipPath) && is_file($zipPath)) {
        @unlink($zipPath);
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(["error" => "Backup failed: " . $error->getMessage()]);
}
