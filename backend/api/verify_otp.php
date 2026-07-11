<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

$conn = new mysqli("DB host", "DB username", "DB password", "DB name");
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed']);
    exit;
}

$email = $_POST['email'] ?? '';
$otp   = $_POST['otp'] ?? '';

if (!$email || !$otp) {
    echo json_encode(['success' => false, 'message' => 'Email and OTP required']);
    exit;
}

/* -------- FETCH USER -------- */
$stmt = $conn->prepare("SELECT otp, verified FROM users WHERE email=?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

if ($user['verified'] == 1) {
    echo json_encode(['success' => false, 'message' => 'User already verified']);
    exit;
}

/* -------- OTP CHECK -------- */
if ((string)$user['otp'] !== (string)$otp){
    echo json_encode(['success' => false, 'message' => 'Invalid OTP']);
    exit;
}

/* -------- VERIFY USER -------- */
$update = $conn->prepare("
    UPDATE users 
    SET verified = 1,
        registration_status = 'completed',
        otp = NULL
        verification_code = NULL
    WHERE email = ?
");
$update->bind_param("s", $email);
$update->execute();

echo json_encode([
    'success' => true,
    'message' => 'OTP verified. Registration completed'
]);
