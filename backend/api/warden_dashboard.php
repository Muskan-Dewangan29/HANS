<?php
error_reporting(0);  // suppress warnings/notices
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

// ✅ Database connection
$conn = new mysqli("DB host", "DB username", "DB password", "DB name");
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit;
}

// ✅ Decode input
$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? '';
$action = $data['action'] ?? 'get_dashboard'; // Add action parameter

if (empty($id)) {
    echo json_encode(["success" => false, "message" => "Missing warden ID"]);
    exit;
}

// 🔹 Handle approve/reject action
if ($action === 'update_request_status') {
    $requestId = $data['request_id'] ?? null;
    $status = $data['status'] ?? null; // 1 = approve, 0 = reject

    if (!$requestId || !isset($status)) {
        echo json_encode(["success" => false, "message" => "Missing parameters"]);
        exit;
    }

    $stmtUpdate = $conn->prepare("UPDATE leave_requests SET warden_approval = ?, status = ? WHERE id = ?");
    $stmtUpdate->bind_param("ssi", $status, $status, $requestId);
    if ($stmtUpdate->execute()) {
        echo json_encode(["success" => true, "message" => "Request updated successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update request"]);
    }
    $stmtUpdate->close();
    $conn->close();
    exit;
}

// ✅ Secure query to fetch warden info
$stmt = $conn->prepare("SELECT id, name, email, phone, hostelName,  photo, city, state, address
                        FROM users 
                        WHERE id = ? AND role = 'warden'");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

// ✅ Return result
if ($result->num_rows > 0) {
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $wardenHostel = $rows[0]['hostelName'] ?? '';
    // ✅ Count Currently IN students
$stmtIn = $conn->prepare("
    SELECT COUNT(*) AS total_in
    FROM users
    WHERE role = 'student'
      AND hostelName = ?
      AND current_status = 'In Hostel'
");
$stmtIn->bind_param("s", $wardenHostel);
$stmtIn->execute();
$inResult = $stmtIn->get_result()->fetch_assoc();
$currentlyIn = (int)($inResult['total_in'] ?? 0);
$stmtIn->close();

// ✅ Count Currently OUT students
$stmtOut = $conn->prepare("
    SELECT COUNT(*) AS total_out
    FROM users
    WHERE role = 'student'
      AND hostelName = ?
      AND current_status = 'Out of Hostel'
");
$stmtOut->bind_param("s", $wardenHostel);
$stmtOut->execute();
$outResult = $stmtOut->get_result()->fetch_assoc();
$currentlyOut = (int)($outResult['total_out'] ?? 0);
$stmtOut->close();
// ✅ Count Logged IN students (for new card)
$stmtLoggedIn = $conn->prepare("
    SELECT COUNT(*) AS total_logged_in
    FROM users
    WHERE role = 'student'
      AND hostelName = ?
      AND is_logged_in = 1
");
$stmtLoggedIn->bind_param("s", $wardenHostel);
$stmtLoggedIn->execute();
$loggedInResult = $stmtLoggedIn->get_result()->fetch_assoc();
$loggedInCount = (int)($loggedInResult['total_logged_in'] ?? 0);
$stmtLoggedIn->close();

// ✅ Count Logged OUT students (for new card)
$stmtLoggedOut = $conn->prepare("
    SELECT COUNT(*) AS total_logged_out
    FROM users
    WHERE role = 'student'
      AND hostelName = ?
      AND is_logged_in = 0
");
$stmtLoggedOut->bind_param("s", $wardenHostel);
$stmtLoggedOut->execute();
$loggedOutResult = $stmtLoggedOut->get_result()->fetch_assoc();
$loggedOutCount = (int)($loggedOutResult['total_logged_out'] ?? 0);
$stmtLoggedOut->close();

// ✅ Inject counts into warden data
$rows[0]['currentlyIn'] = $currentlyIn;
$rows[0]['currentlyOut'] = $currentlyOut;
$rows[0]['loggedIn'] = $loggedInCount;
$rows[0]['loggedOut'] = $loggedOutCount;


// 🔹 If frontend asks for parent-approved requests only
    if ($action === 'get_parent_approved_requests') {
        $stmtReq = $conn->prepare("
            SELECT 
                lr.id, lr.RollNumber, lr.reason,lr.request_type,lr.status, lr.start_date, lr.end_date,
                lr.start_time, lr.end_time, lr.parent_comment, lr.parent_approval,
                lr.warden_comment, lr.warden_approval, lr.created_at, lr.photo AS photo,
                u.name AS student_name, u.hostelName AS hostel
            FROM leave_requests lr
            JOIN users u ON lr.RollNumber = u.id
            WHERE lr.parent_approval = '1'
              AND u.hostelName = ?
            ORDER BY lr.created_at DESC
        ");
        $stmtReq->bind_param("s", $wardenHostel);
        $stmtReq->execute();
        $resReq = $stmtReq->get_result();
        $leaveRequests = $resReq->fetch_all(MYSQLI_ASSOC);
        foreach ($leaveRequests as &$req) {
    if ($req['warden_approval'] === 'approved') {
        $req['status'] = 'approved';
    } elseif ($req['warden_approval'] === 'rejected') {
        $req['status'] = 'rejected';
    } else {
        $req['status'] = 'pending';
    }
}

        echo json_encode([
            "success" => true,
            "leave_requests" => $leaveRequests
        ]);
        exit;
    }

// 🔹 If frontend asks for all students
if ($action === 'get_students_list') {
    $stmtStudents = $conn->prepare("
    SELECT id, name, email, phone, RollNumber, roomNumber, parentName, parentPhone, 
           Course, year, bloodGroup, hostelName, photo, current_status, is_logged_in
    FROM users
    WHERE role = 'student' AND hostelName = ?
    ORDER BY name ASC
");

$stmtStudents->bind_param("s", $wardenHostel);


    if (!$stmtStudents) {
        // debug if prepare failed
        echo json_encode([
            "success" => false,
            "message" => "Prepare failed: " . $conn->error
        ]);
        exit;
    }

    $stmtStudents->execute();
    $resStudents = $stmtStudents->get_result();
    $students = $resStudents->fetch_all(MYSQLI_ASSOC);
    foreach ($students as &$student) {
        $status = strtolower(trim((string)$student['current_status']));

        if (
            $status === '' ||
            $status === 'location off' ||
            $status === 'location_disabled' ||
            $status === 'disabled'
        ) {
            $student['current_status'] = 'Location Disabled';
        }
        // Fetch parent info linked to this student
        $studentId = $student['id'];
        $stmtParent = $conn->prepare("
            SELECT name AS parentName, phone AS parentPhone, email AS parentEmail,
                   address AS parentAddress, city AS parentCity, state AS parentState
            FROM users
            WHERE role = 'parent' AND FIND_IN_SET(?, linked_id)
        ");
        $stmtParent->bind_param("i", $studentId);
        $stmtParent->execute();
        $resParent = $stmtParent->get_result();
        $parent = $resParent->fetch_assoc();

        $student['parentName'] = $parent['parentName'] ?? '';
        $student['parentPhone'] = $parent['parentPhone'] ?? '';
        $student['parentEmail'] = $parent['parentEmail'] ?? '';
        $student['parentAddress'] = $parent['parentAddress'] ?? '';
        $student['parentCity'] = $parent['parentCity'] ?? '';
        $student['parentState'] = $parent['parentState'] ?? '';

        $stmtParent->close();
    }
    unset($student);


    // 🔹 Debug log
    error_log("DEBUG: Students fetched = " . json_encode($students));

    echo json_encode([
        "success" => true,
        "students" => $students
    ]);
    exit;
}



// 🔹 Default: return warden info + leave requests
    $stmtReq = $conn->prepare("
        SELECT 
            lr.id, lr.RollNumber, lr.reason,lr.request_type,lr.status, lr.start_date, lr.end_date,
            lr.start_time, lr.end_time, lr.parent_comment, lr.parent_approval,
            lr.warden_comment, lr.warden_approval, lr.created_at, lr.photo AS photo,
            u.name AS student_name, u.hostelName AS hostel
        FROM leave_requests lr
        JOIN users u ON lr.RollNumber = u.id
        WHERE u.hostelName = ?
        ORDER BY lr.created_at DESC
    ");
    $stmtReq->bind_param("s", $wardenHostel);
    $stmtReq->execute();
    $resReq = $stmtReq->get_result();
    $leaveRequests = $resReq->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $rows,
        "leave_requests" => $leaveRequests
    ]);

} else {
    echo json_encode(["success" => false, "message" => "No warden found"]);
}

// ✅ Cleanup (safe)
if (isset($stmt) && $stmt instanceof mysqli_stmt) {
    $stmt->close();
}
$conn->close();

?>
