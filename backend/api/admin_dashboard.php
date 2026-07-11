<?php
require __DIR__ . "/../config/db.php"; // ensure this file only defines $db_host, $db_user, $db_pass, $db_name

error_reporting(0);
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Create PDO connection
try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username,$password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $e->getMessage()]);
    exit;
}
$adminId = $_GET['admin_id'] ?? null;

// POST request: update leave request status
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $requestId = $data['requestId'] ?? null;
    $status = $data['status'] ?? null;

    if ($requestId && in_array($status, ['approved', 'rejected'])) {
        $stmt = $pdo->prepare("UPDATE leave_requests SET status = :status WHERE id = :id");
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':id', $requestId, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Status updated"]);
    } else {
        echo json_encode(["success" => false, "message" => "Invalid data"]);
    }
    exit;
}

// GET: fetch users, requests, and counts
try {
    // Fetch all users
    $usersStmt = $pdo->query("SELECT id, name, email, role FROM users");
    $users = $usersStmt ? $usersStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    $totalUsers = count($users);

    // Fetch all leave requests
    $requestsStmt = $pdo->query("SELECT id,  reason, status FROM leave_requests");
    $requests = $requestsStmt ? $requestsStmt->fetchAll(PDO::FETCH_ASSOC) : [];

    // Calculate counts by status
    $pendingRequests = 0;
    $approvedRequests = 0;
    $rejectedRequests = 0;

    foreach ($requests as $req) {
        $status = strtolower($req['status'] ?? '');
        if ($status === 'pending') $pendingRequests++;
        elseif ($status === 'approved') $approvedRequests++;
        elseif ($status === 'rejected') $rejectedRequests++;
    }
    
    echo json_encode([
        "users" => $users,
        "requests" => $requests,
        "totalUsers" => $totalUsers,
        "totalRequests" => count($requests),
        "pendingRequests" => $pendingRequests,
        "approvedRequests" => $approvedRequests,
        "rejectedRequests" => $rejectedRequests
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "users" => [],
        "requests" => [],
        "totalUsers" => 0,
        "totalRequests" => 0,
        "pendingRequests" => 0,
        "approvedRequests" => 0,
        "rejectedRequests" => 0,
        "error" => $e->getMessage()
    ]);
}