<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$file = 'data.json';
$backupDir = 'backups';

// Optional: Add a simple password check here if needed
// $secret = "YOUR_SECRET_PASSWORD";
// if ($_SERVER['HTTP_X_SECRET'] !== $secret) { http_response_code(403); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        // Check if content is empty or just whitespace
        if (empty($content) || trim($content) == "") {
            echo "null";
        } else {
            echo $content;
        }
    } else {
        echo "null";
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = file_get_contents('php://input');
    if ($data) {
        // Create backup directory if it doesn't exist
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        // Create timestamped backup
        if (file_exists($file)) {
            $timestamp = date('Y-m-d_H-i-s');
            copy($file, "$backupDir/data-$timestamp.json");
        }
        
        // Save new data
        $result = file_put_contents($file, $data);
        
        if ($result === false) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Write permission denied or disk full"]);
        } else {
            echo json_encode(["status" => "success"]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "No data provided"]);
    }
}
?>
