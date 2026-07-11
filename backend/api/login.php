<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

// Get JSON input
$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$action = $data['action'] ?? 'login';
$newPassword = $data['newPassword'] ?? '';


// Database connection
$conn = new mysqli("DB host", "DB username", "DB password", "DB name");
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}
// Fetch logged-in and logged-out users (for warden)
if ($action === 'status') {
    $loggedIn = $conn->query("SELECT id, name, email, role FROM users WHERE is_logged_in = 1");
    $loggedOut = $conn->query("SELECT id, name, email, role FROM users WHERE is_logged_in = 0");

    echo json_encode([
        'success' => true,
        'logged_in' => $loggedIn->fetch_all(MYSQLI_ASSOC),
        'logged_out' => $loggedOut->fetch_all(MYSQLI_ASSOC)
    ]);
    exit;
}
// Logout user (mark as logged out)
if ($action === 'logout') {
    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Email required']);
        exit;
    }

    $logout = $conn->prepare("UPDATE users SET is_logged_in = 0 WHERE email = ?");
    $logout->bind_param("s", $email);
    $logout->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
    exit;
}

if ($action === 'forgot') {

    if (empty($email) || empty($newPassword)) {
        echo json_encode(['success' => false, 'message' => 'Email and new password required']);
        exit;
    }

    // check email exists & verified
    $check = $conn->prepare("SELECT id FROM users WHERE email = ? AND verified = 1 LIMIT 1");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();
    if ($check->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Email not found']);
        exit;
    }
    $update = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
    $update->bind_param("ss", $newPassword, $email);
    $update->execute();
    echo json_encode([
        'success' => true,
        'message' => 'Password updated successfully'
    ]);
    exit;
}

// Validate inputs
if ($action === 'login' && (empty($email) || empty($password))) {
    echo json_encode(['success' => false, 'message' => 'Email and password required']);
    exit;
}

// Fetch user by email
$stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND verified = 1  LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$res = $stmt->get_result();
if ($r = $res->fetch_assoc()) {
    if ($r['password'] === $password) {
        $updateLogin = $conn->prepare("UPDATE users SET is_logged_in = 1 WHERE email = ?");
        $updateLogin->bind_param("s", $email);
        $updateLogin->execute();

        // Remove sensitive fields
        unset($r['password'], $r['verification_code'], $r['otp']);
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => $r
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid password']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid email']);
}
$stmt->close();
$conn->close();
exit;
?>
