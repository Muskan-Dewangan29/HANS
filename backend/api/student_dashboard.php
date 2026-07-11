<?php
header("Content-Type: application/json");
require __DIR__ . '/../config/db.php'; // Your DB connection

$input = json_decode(file_get_contents("php://input"), true);
$RollNumber = $input['RollNumber'] ?? $input['id'] ?? null;
$action = $input['action'] ?? 'get_dashboard';

if (!$RollNumber) {
    echo json_encode(["success" => false, "message" => "Student ID missing"]);
    exit;
}

try {
    switch($action) {
 // ===================== 🔹 Serve Student Image =====================
        case 'get_student_image':
            $roll = $_GET['roll'] ?? null;
            if (!$roll) {
                http_response_code(400);
                echo "Roll number missing";
                exit;
            }

            $filepath = __DIR__ . "/uploads/student/$roll.jpg";

            if (!file_exists($filepath)) {
                http_response_code(404);
                echo "Image not found";
                exit;
            }

            header("Content-Type: image/jpeg");
            readfile($filepath);
            exit; // Important to stop further execution
            // ===================== 🔹 Update Student Live Status (Geofencing) =====================
case 'update_status':

    if (!isset($input['status']) || $input['status'] === null) {
        $status = "Location Disabled";
    } else {
        $status = $input['status']; // "In Hostel" or "Out of Hostel"
    }


    $stmt = $conn->prepare("
        UPDATE users 
        SET current_status = ?, last_updated = NOW()
        WHERE id = ? AND role = 'student'
    ");
    $stmt->execute([$status, $RollNumber]);

    echo json_encode(["success" => true, "current_status" => $status]);
    exit;

    // ===================== 🔹 Update Student Profile =====================
case 'update_profile':
    $year = $input['year'] ?? null;
    $branch = $input['branch'] ?? null;
    $room = $input['room'] ?? null;

    if (!$year || !$branch || !$room) {
        echo json_encode(["success" => false, "message" => "All fields are required"]);
        exit;
    }

    $stmtUpdate = $conn->prepare("
        UPDATE users 
        SET year = ?, branch = ?, roomNumber = ? 
        WHERE id = ? AND role = 'student'
    ");
    $stmtUpdate->execute([$year, $branch, $room, $RollNumber]);

    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully",
        "updatedData" => [
            "year" => $year,
            "branch" => $branch,
            "room" => $room
        ]
    ]);
    exit;

        // ===================== 1️⃣ Fetch Student Dashboard =====================
        case 'get_dashboard':
    // 1️⃣ Fetch student info
    $stmt = $conn->prepare("
        SELECT id, name, email, phone, year, branch, bloodGroup,
       hostelName AS hostel, roomNumber AS room,
       parentName, parentPhone, photo,
       current_status
FROM users
WHERE id=? AND role='student'
    ");
        // 🔹 Fetch hostel geofence location from DB
$hostelStmt = $conn->prepare("
    SELECT latitude, longitude, radius
    FROM hostel_location
    WHERE hostel_name = ?
      AND is_active = 1
    LIMIT 1
");
    $stmt->execute([$RollNumber]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    

    if (!$user) {
        echo json_encode(["success"=>false, "message"=>"Student not found"]);
        exit;
    }
    $hostelStmt->execute([$user['hostel']]);
$hostelLocation = $hostelStmt->fetch(PDO::FETCH_ASSOC);

    // 2️⃣ Fetch leave history
    $stmt2 = $conn->prepare("SELECT * FROM leave_requests WHERE RollNumber=? ORDER BY created_at DESC");
    $stmt2->execute([$RollNumber]);
    $leaves = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // 3️⃣ Process leaves and generate QR codes for fully approved leaves
    $approvedLeaves = [];
    $pendingLeaves = [];

    foreach ($leaves as &$leave) {
        // Format dates
        $leave['created_at_formatted'] = date("d M Y, h:i A", strtotime($leave['created_at']));
        $leave['start_date_formatted'] = date("d M Y", strtotime($leave['start_date']));
        $leave['end_date_formatted'] = date("d M Y", strtotime($leave['end_date']));
        $leave['start_time_formatted'] = $leave['start_time'] ? date("h:i A", strtotime($leave['start_time'])) : null;
        $leave['end_time_formatted'] = $leave['end_time'] ? date("h:i A", strtotime($leave['end_time'])) : null;

        // Check approvals
        $parentApproved = $leave['parent_approval'] == 1 || strtolower($leave['parent_approval']) === 'approved';
        $wardenApproved = $leave['warden_approval'] == 1 || strtolower($leave['warden_approval']) === 'approved';


        if ($parentApproved && $wardenApproved) {
            // Generate QR code URL using Google Charts
            $qrData = json_encode([
                "RollNumber" => $leave['RollNumber'],
                "request_id" => $leave['id'],
                "hostel" => $leave['hostelName'],
                "reason" => $leave['reason'],
                "start_date" => $leave['start_date'],
                "end_date" => $leave['end_date']
            ]);
            $leave['qr_code'] = "https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=" . urlencode($qrData);
            $leave['qr_code_data'] = $qrData;
            $leave['fromDate'] = $leave['start_date'];
    $leave['toDate'] = $leave['end_date'];
    $leave['fromTime'] = $leave['start_time'];
    $leave['toTime'] = $leave['end_time'];
            $approvedLeaves[] = $leave;
        } else {
            $leave['qr_code'] = null;
            $leave['qr_code_data'] = null;

            if (strtolower($leave['status'] ?? 'pending') === 'pending') {
                $pendingLeaves[] = $leave;
            }
        }
    }

    // 4️⃣ Prepare final response
    $user['leaves'] = $leaves; // full list
    $user['approvedLeaves'] = array_values($approvedLeaves);
    $user['pendingLeaves'] = array_values($pendingLeaves);
$user['status'] = $user['current_status'] ??"In Hostel";

// 5️⃣ Generate notifications for student dashboard
$notifications = [];

foreach ($leaves as $leave) {
    $start = $leave['start_date'];
    $end = $leave['end_date'];

    // Normalize approval values (handles 1, 0, Approved, Rejected, Pending)
    $parentApproval = strtolower(trim($leave['parent_approval'] ?? ''));
    $wardenApproval = strtolower(trim($leave['warden_approval'] ?? ''));

    // 👨‍👩‍👧 Parent approved
    if ($parentApproval == '1' || $parentApproval === 'approved') {
        $notifications[] = [
            "type" => "info",
            "message" => "👨‍👩‍👧 Your parent approved your leave request (from {$start} to {$end}).",
            "time" => isset($leave['updated_at'])
    ? date("d M Y, h:i A", strtotime($leave['updated_at']))
    : null

        ];
    }

    // ❌ Parent rejected
    if ($parentApproval === 'rejected' || $parentApproval == '0') {
        $notifications[] = [
            "type" => "error",
            "message" => "❌ Your parent rejected your leave request (from {$start} to {$end}).",
            "time" => isset($leave['updated_at'])
    ? date("d M Y, h:i A", strtotime($leave['updated_at']))
    : date("d M Y, h:i A")

        ];
    }

    // ✅ Warden approved
    if ($wardenApproval == '1' || $wardenApproval === 'approved') {
        $notifications[] = [
            "type" => "success",
            "message" => "✅ Your warden approved your leave request (from {$start} to {$end}).",
            "time" => isset($leave['updated_at'])
    ? date("d M Y, h:i A", strtotime($leave['updated_at']))
    : date("d M Y, h:i A")

        ];
    }

    // 🚫 Warden rejected
    if ($wardenApproval === 'rejected' || $wardenApproval == '0') {
        $notifications[] = [
            "type" => "error",
            "message" => "🚫 Your warden rejected your leave request (from {$start} to {$end}).",
            "time" => isset($leave['updated_at'])
    ? date("d M Y, h:i A", strtotime($leave['updated_at']))
    : date("d M Y, h:i A")

        ];
    }
}



$user['notifications'] = $notifications;

// 6️⃣ Fetch latest leave request (to control cancel button in frontend)
$stmtLatest = $conn->prepare("
    SELECT * FROM leave_requests 
    WHERE RollNumber = ? 
    ORDER BY id DESC 
    LIMIT 1
");
$stmtLatest->execute([$RollNumber]);
$latestLeave = $stmtLatest->fetch(PDO::FETCH_ASSOC);

if ($latestLeave) {
    $now = date("Y-m-d H:i:s");
    $leaveEndDateTime = $latestLeave['end_date'] . ' ' . ($latestLeave['end_time'] ?? '23:59:59');

    // Check if leave has expired or is cancelled
    if ($latestLeave['status'] === 'cancelled' || strtotime($leaveEndDateTime) < strtotime($now)) {
        $latestLeave['is_active'] = false;  // leave expired or cancelled
    } else {
        $latestLeave['is_active'] = true;   // leave is ongoing
    }
} else {
    $latestLeave['is_active'] = false;
}

$user['hostel_latitude']  = isset($hostelLocation['latitude']) 
    ? (float)$hostelLocation['latitude'] 
    : null;

$user['hostel_longitude'] = isset($hostelLocation['longitude']) 
    ? (float)$hostelLocation['longitude'] 
    : null;

$user['hostel_tolerance'] = isset($hostelLocation['radius']) 
    ? (float)$hostelLocation['radius'] 
    : 0.003;







    echo json_encode([
    "success" => true,
    "user" => $user,
    "notifications" => $user['notifications']
]);

    break;


       // ===================== 2️⃣ Submit Leave Request =====================
case 'submit_leave':
    // LIVE PHOTO (BASE64)
    $photoBase64 = $input['photo'] ?? null;
    $photoPath = null;

    if ($photoBase64) {

        // Extract the base64 string (remove 'data:image/jpeg;base64,')
        if (strpos($photoBase64, ',') !== false) {
            $photoBase64 = explode(',', $photoBase64)[1];
        }

        // Ensure temp folder exists
        $tempDir = __DIR__ . '/../temp/live_photos/';
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        // File name
        $filename = 'photo_' . $RollNumber . '_' . time() . '.jpg';
        $filePath = $tempDir . $filename;

        // Save file
        file_put_contents($filePath, base64_decode($photoBase64));

        // Relative path to store in DB
        $photoPath = 'temp/live_photos/' . $filename;
    }
    $requestType = $input['requestType'] ?? '';  
    $reason = $input['reason'] ?? '';
    $destination = $input['destination'] ?? '';
    $contact_number = $input['contactNumber'] ?? '';
    $fromDate = $input['fromDate'] ?? '';
    $toDate = $input['toDate'] ?? '';
    $fromTime = $input['fromTime'] ?? '';
    $toTime = $input['toTime'] ?? '';
    $latitude = $input['latitude'] ?? null;
    $longitude = $input['longitude'] ?? null;

    if (!$reason) {
        echo json_encode(["success" => false, "message" => "Reason is required"]);
        exit;
    }

    // Fetch parent_id and hostelName of the student 👇
    $stmtParent = $conn->prepare("SELECT id, hostelName FROM users WHERE id=? AND role='student'");
    $stmtParent->execute([$RollNumber]);
    $studentData = $stmtParent->fetch(PDO::FETCH_ASSOC);
    $hostelName = $studentData['hostelName'] ?? null;

    // Find parent linked to this student
    $stmtParent2 = $conn->prepare("SELECT id FROM users WHERE role='parent' AND RollNumber=?");
    $stmtParent2->execute([$RollNumber]);
    $parent = $stmtParent2->fetch(PDO::FETCH_ASSOC);
    $parent_id = $parent['id'] ?? null;

    // ✅ Insert leave request with latitude & longitude
    $stmt = $conn->prepare("
    INSERT INTO leave_requests
    (RollNumber, reason, destination, contact_number, start_date, end_date, start_time, end_time, latitude, longitude, photo, request_type, status, created_at, parent_id, parent_approval, warden_approval, hostelName)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), ?, NULL, NULL, ?)
");

$stmt->execute([
    $RollNumber, $reason, $destination, $contact_number,
    $fromDate, $toDate, $fromTime, $toTime,
    $latitude, $longitude,
    $photoPath,
    $requestType,      // <-- add this
    $parent_id, $hostelName
]);


    echo json_encode(["success" => true, "message" => "Leave request submitted successfully with location data."]);
    break;
    // ===================== 4️⃣ Cancel Leave Request =====================
case 'cancel_leave':
   // Cancel latest active leave for this student
$stmtFind = $conn->prepare("
    SELECT id, parent_id, hostelName 
    FROM leave_requests 
    WHERE RollNumber = ? 
      AND status != 'cancelled'
    ORDER BY id DESC 
    LIMIT 1
");
$stmtFind->execute([$RollNumber]);
$leave = $stmtFind->fetch(PDO::FETCH_ASSOC);

if (!$leave) {
    echo json_encode([
        "success" => false,
        "message" => "No active leave found to cancel"
    ]);
    exit;
}

$leaveId = $leave['id'];
$parentId = $leave['parent_id'];
$hostelName = $leave['hostelName'];

    // 1️⃣ Mark request as cancelled
    $stmtCancel = $conn->prepare("
    UPDATE leave_requests 
    SET status = 'cancelled', 
        parent_approval = NULL   -- optional, ensures parent approval is reset
    WHERE id = ? AND RollNumber = ?
");
$stmtCancel->execute([$leaveId, $RollNumber]);


    // 2️⃣ Fetch parent & warden linked to the leave
    $stmtFetch = $conn->prepare("
        SELECT parent_id, hostelName 
        FROM leave_requests 
        WHERE id=? LIMIT 1
    ");
    $stmtFetch->execute([$leaveId]);
    $details = $stmtFetch->fetch(PDO::FETCH_ASSOC);

    $parentId = $details['parent_id'];
    $hostelName = $details['hostelName'];

    // 3️⃣ Fetch warden from hostelName
    $stmtWarden = $conn->prepare("SELECT id FROM users WHERE role='warden' AND hostelName=? LIMIT 1");
    $stmtWarden->execute([$hostelName]);
    $warden = $stmtWarden->fetch(PDO::FETCH_ASSOC);
    $wardenId = $warden['id'] ?? null;

    // //4️⃣ Send cancellation notifications to BOTH parent and warden
    // if ($parentId) {
    //     $conn->prepare("
    //         INSERT INTO notifications (user_id, message, type)
    //         VALUES (?, 'Student cancelled the leave request', 'leave_cancelled')
    //     ")->execute([$parentId]);
    // }

    // if ($wardenId) {
    //     $conn->prepare("
    //         INSERT INTO notifications (user_id, message, type)
    //         VALUES (?, 'Student cancelled the leave request', 'leave_cancelled')
    //     ")->execute([$wardenId]);
    // }

    echo json_encode([
        "success" => true,
        "message" => "Leave cancelled and notifications sent"
    ]);
    break;

 // ===================== 5️⃣ Extend Leave Request =====================
    case 'extend_leave':
        $leaveId = $input['leave_id'] ?? null;
        $newToDate = $input['new_to_date'] ?? null;
        $newToTime = $input['new_to_time'] ?? null;

        if (!$leaveId || !$newToDate || !$newToTime) {
            echo json_encode(["success" => false, "message" => "Leave ID, new date, and new time are required"]);
            exit;
        }

        // Update the leave request with new end date/time
        $stmt = $conn->prepare("UPDATE leave_requests SET end_date=?, end_time=?, status='Pending' WHERE id=?");
        $stmt->execute([$newToDate, $newToTime, $leaveId]);

        echo json_encode([
            "success" => true,
            "message" => "Leave request extended successfully",
            "new_to_date" => $newToDate,
            "new_to_time" => $newToTime
        ]);
        break;
        // ===================== 3️⃣ Fetch Leave History =====================
        case 'get_leave_history':
            $stmt = $conn->prepare("SELECT * FROM leave_requests WHERE RollNumber=? ORDER BY created_at DESC");
            $stmt->execute([$RollNumber]);
            $leaves = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 🔹 Generate QR code for fully approved leaves in history
foreach ($leaves as &$leave) {
    // Format created_at, start_date, end_date
    $leave['created_at_formatted'] = date("d M Y, h:i A", strtotime($leave['created_at']));
    
    // 🕒 Add human-readable formatted dates
    $leave['start_date_formatted'] = date("d M Y", strtotime($leave['start_date']));
    $leave['end_date_formatted'] = date("d M Y", strtotime($leave['end_date']));
    $leave['start_time_formatted'] = $leave['start_time'] ? date("h:i A", strtotime($leave['start_time'])) : null;
    $leave['end_time_formatted'] = $leave['end_time'] ? date("h:i A", strtotime($leave['end_time'])) : null;
    $leave['photo'] = $leave['photo'];
    if (
        ($leave['parent_approval'] == 1 || strtolower($leave['parent_approval']) === 'approved') &&
        ($leave['warden_approval'] == 1 || strtolower($leave['warden_approval']) === 'approved')
    ) {
        $qrData = json_encode([
            "RollNumber" => $leave['RollNumber'],
            "request_id" => $leave['id'],
            "hostel" => $leave['hostelName'],
            "reason" => $leave['reason'],
            "start_date" => $leave['start_date'],
            "end_date" => $leave['end_date']
        ]);
        $leave['qr_code'] = "https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=" . urlencode($qrData);
        $leave['qr_code_data'] = $qrData;
    } else {
        $leave['qr_code'] = null;
        $leave['qr_code_data'] = null;
    }
}


            echo json_encode([
                "success" => true,
                "leave_requests" => $leaves
            ]);
            break;

            // ===================== 6️⃣ View Student QR Page =====================
        case 'view_qr':
            // Fetch student info
            $stmt = $conn->prepare("
                SELECT id, name, email, phone, year, branch, bloodGroup, hostelName AS hostel, roomNumber AS room,
                       parentName, parentPhone
                FROM users
                WHERE id=? AND role='student'
            ");
            $stmt->execute([$RollNumber]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                echo "Student not found";
                exit;
            }

            // Fetch leave requests
            $stmt2 = $conn->prepare("SELECT * FROM leave_requests WHERE RollNumber=? ORDER BY created_at DESC");
            $stmt2->execute([$RollNumber]);
            $leaves = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            // Separate approved leaves
            $approvedLeaves = [];
            foreach ($leaves as $leave) {
                $parentApproved = $leave['parent_approval'] == 1 || strtolower($leave['parent_approval']) === 'approved';
                $wardenApproved = $leave['warden_approval'] == 1 || strtolower($leave['warden_approval']) === 'approved';
                if ($parentApproved && $wardenApproved) {
                    $approvedLeaves[] = $leave;
                }
            }

            // Render HTML
            header("Content-Type: text/html");
            echo "<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>Student QR Details - {$user['name']}</title>
<style>
body { font-family: Arial, sans-serif; background: #f4f4f4; margin:0; padding:0; }
.container { max-width:800px; margin:50px auto; background:#fff; padding:20px; border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.1);}
h1 { text-align:center; }
table { width:100%; border-collapse:collapse; margin-top:20px; }
th, td { border:1px solid #ccc; padding:8px; text-align:left; }
th { background:#eee; }
.qr { text-align:center; margin-top:10px; }
</style>
</head>
<body>
<div class='container'>
<h1>Student Details</h1>
<p><strong>Name:</strong> {$user['name']}</p>
<p><strong>Roll Number:</strong> {$RollNumber}</p>
<p><strong>Email:</strong> {$user['email']}</p>
<p><strong>Phone:</strong> {$user['phone']}</p>
<p><strong>Branch:</strong> {$user['branch']}, Year: {$user['year']}</p>
<p><strong>Hostel:</strong> {$user['hostel']}, Room: {$user['room']}</p>
<p><strong>Parent Name:</strong> {$user['parentName']}, Phone: {$user['parentPhone']}</p>

<h2>Approved Leave Requests</h2>
<table>
<tr>
<th>Reason</th><th>Destination</th><th>Start</th><th>End</th><th>QR Code</th>
</tr>";
            foreach ($approvedLeaves as $leave) {
                $startDate = date("d M Y", strtotime($leave['start_date']));
                $endDate = date("d M Y", strtotime($leave['end_date']));
                $qrData = json_encode([
                    "RollNumber" => $leave['RollNumber'],
                    "request_id" => $leave['id'],
                    "hostel" => $leave['hostelName'],
                    "reason" => $leave['reason'],
                    "start_date" => $leave['start_date'],
                    "end_date" => $leave['end_date']
                ]);
                $qrUrl = "https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=" . urlencode($qrData);
                echo "<tr>
<td>{$leave['reason']}</td>
<td>{$leave['destination']}</td>
<td>{$startDate} ".($leave['start_time'] ? date("h:i A", strtotime($leave['start_time'])) : '')."</td>
<td>{$endDate} ".($leave['end_time'] ? date("h:i A", strtotime($leave['end_time'])) : '')."</td>
<td class='qr'><img src='{$qrUrl}' alt='QR Code'></td>
</tr>";
            }
            echo "</table>
</div>
</body>
</html>";
            break;


        // ===================== Default =====================
        default:
            echo json_encode(["success"=>false, "message"=>"Invalid action"]);
            break;
    }
} catch(PDOException $e) {
    echo json_encode(["success"=>false, "message"=>"Database error: ".$e->getMessage()]);
}
?>