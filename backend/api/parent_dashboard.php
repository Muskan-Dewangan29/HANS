<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

require __DIR__ . "/../config/db.php";

$input = json_decode(file_get_contents("php://input"), true);
$parent_id = $input["id"] ?? "";
$action = $input["action"] ?? "get_dashboard"; // default action

if (empty($parent_id)) {
    echo json_encode(["success" => false, "message" => "Parent ID missing"]);
    exit;
}

try {
    // ================= Step 1: Fetch parent info =================
    $stmt = $conn->prepare("
        SELECT id, name, email, phone, linked_id 
        FROM users 
        WHERE id = ? AND role = 'parent'
    ");
    $stmt->execute([$parent_id]);
    $parent = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$parent) {
        echo json_encode(["success" => false, "message" => "Parent not found"]);
        exit;
    }

    // Split linked_id into array of student IDs
    $linked_ids = array_map('trim', explode(',', $parent['linked_id'])); // remove spaces
    $linked_ids = array_filter($linked_ids, fn($id) => $id !== ''); // remove empty strings

    if (empty($linked_ids)) {
        echo json_encode(["success" => false, "message" => "No linked students found"]);
        exit;
    }

    // ================= Step 2: Fetch student info =================
    $inQuery = implode(',', array_fill(0, count($linked_ids), '?'));
    $stmt2 = $conn->prepare("
        SELECT id, name, RollNumber, hostelName, roomNumber, branch, year, current_status
        FROM users 
        WHERE id IN ($inQuery)
    ");

    $stmt2->execute($linked_ids);
    $students = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    foreach ($students as &$student) {
        if (
            $student['current_status'] === null ||
            $student['current_status'] === '' ||
            strtolower($student['current_status']) === 'location off'
        ) {
            $student['current_status'] = 'Location Disabled';
        }
    }
    unset($student);

    if (!$students) {
        echo json_encode(["success" => false, "message" => "Linked students not found"]);
        exit;
    }

    // ================= Step 3: Handle actions =================
    switch ($action) {
        // --------- Check parent location ---------
        case "check_parent_location":
            $lat = $input["latitude"] ?? null;
            $lng = $input["longitude"] ?? null;

            if ($lat === null || $lng === null) {
                echo json_encode(["success" => false, "message" => "Coordinates missing"]);
                exit;
            }

            // Fetch hostel location from DB
            $stmt = $conn->prepare("
                SELECT latitude, longitude, radius 
                FROM hostel_location
                WHERE id = 1
                LIMIT 1
            ");
            $stmt->execute();
            $hostel = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$hostel) {
                echo json_encode(["success" => false, "message" => "Hostel location not found"]);
                exit;
            }

            // Calculate distance as before
            $earthRadius = 6371000; // meters
            $dLat = deg2rad($hostel["latitude"] - $lat);
            $dLon = deg2rad($hostel["longitude"] - $lng);
            $a = sin($dLat/2) * sin($dLat/2) +
                cos(deg2rad($lat)) * cos(deg2rad($hostel["latitude"])) *
                sin($dLon/2) * sin($dLon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = $earthRadius * $c;

            $insideHostel = $distance <= $hostel["radius"];

            echo json_encode([
                "success" => true,
                "insideHostel" => $insideHostel,
                "distance" => $distance,
                "radius" => $hostel["radius"]
            ]);
            exit;

        // --------- Get dashboard data ---------
        case "get_dashboard":
            $requests = [];
            $checkInOuts = [];

            // Fetch leave requests for all linked students
            $stmt3 = $conn->prepare("
                SELECT id, RollNumber, reason,request_type, start_date, end_date, start_time, end_time,
                       parent_comment, parent_approval, warden_comment, warden_approval, created_at, photo,status
                FROM leave_requests
                WHERE RollNumber IN ($inQuery)
                ORDER BY created_at DESC
            ");
            $stmt3->execute($linked_ids);
            $requestsRaw = $stmt3->fetchAll(PDO::FETCH_ASSOC);

           foreach ($requestsRaw as $r) {
                // Determine status with cancelled priority
                if (isset($r["status"]) && $r["status"] === "cancelled") {
                    $status = "cancelled"; // will be moved to leaveHistory
                } elseif ($r["parent_approval"] === null || $r["parent_approval"] === '') {
                    $status = "pending";   // pending approval
                } elseif ($r["parent_approval"] == 1) {
                    $status = "parent_approved"; // approved
                } elseif ($r["parent_approval"] == 0) {
                    $status = "rejected"; // rejected
                } else {
                    $status = "pending";
                }




                // Map student name
                $studentName = "";
                foreach ($students as $s) {
                    if ($s['id'] == $r['RollNumber']) {
                        $studentName = $s['name'];
                        break;
                    }
                }

                $requests[] = [
                    "id" => $r["id"],
                    "RollNumber" => $r["RollNumber"],
                    "reason" => $r["reason"],
                    "requestType" => $r["request_type"], // <-- ADD THIS
                    "start_date" => $r["start_date"],
                    "end_date" => $r["end_date"],
                    "start_time" => $r["start_time"],
                    "end_time" => $r["end_time"],
                    "parent_comment" => $r["parent_comment"],
                    "warden_comment" => $r["warden_comment"],
                    "parent_approval" => $r["parent_approval"],
                    "status" => $status,
                    "rejectComment" => ($r["parent_approval"] === 0 ? $r["parent_comment"] : ""),
                    "created_at" => $r["created_at"],
                    "photo" => $r["photo"],
                    "studentName" => $studentName
                ];
            }

            // // Fetch last 5 entry/exit logs
            // $tableExists = $conn->query("SHOW TABLES LIKE 'checkinout_logs'")->rowCount() > 0;
            // if ($tableExists) {
            //     $stmt4 = $conn->prepare("
            //         SELECT id, RollNumber, type, timestamp, securityName
            //         FROM checkinout_logs
            //         WHERE RollNumber IN ($inQuery)
            //         ORDER BY timestamp DESC
            //         LIMIT 5
            //     ");
            //     $stmt4->execute($linked_ids);
            //     $checkInOuts = $stmt4->fetchAll(PDO::FETCH_ASSOC);
            // }

            $pendingApprovals = [];
            $leaveHistory = [];

            foreach ($requests as $req) {
                if ($req["status"] === "pending") {
                    $pendingApprovals[] = $req;
                } else {
                    // approved, rejected, cancelled → history
                    $leaveHistory[] = $req;
                }
            }


            echo json_encode([
                "success" => true,
                "user" => [
                    "id" => $parent['id'],
                    "name" => $parent['name'],  // <-- This is the key the frontend will read
                    "email" => $parent['email']
                ],
                "children" => $students,
                "pendingApprovals" => $pendingApprovals,
                "leaveHistory" => $leaveHistory,
                "checkInOuts" => $checkInOuts
            ]);
            break;

        // --------- Approve a leave request ---------
        case "approve_request":
            $requestId = $input["requestId"] ?? 0;
            if (!$requestId) {
                echo json_encode(["success" => false, "message" => "Request ID missing"]);
                exit;
            }
            // Fetch hostel location from DB
            $stmtHostel = $conn->prepare("SELECT latitude, longitude, radius FROM hostel_location WHERE id = 1 LIMIT 1");
            $stmtHostel->execute();
            $hostel = $stmtHostel->fetch(PDO::FETCH_ASSOC);
            if (!$hostel) {
                echo json_encode(["success" => false, "message" => "Hostel location not found"]);
                exit;
            }

            // Check parent's coordinates from input
            $lat = $input["latitude"] ?? null;
            $lng = $input["longitude"] ?? null;
            if ($lat === null || $lng === null) {
                echo json_encode(["success" => false, "message" => "Parent coordinates missing"]);
                exit;
            }

            // Calculate distance to hostel
            $earthRadius = 6371000;
            $dLat = deg2rad($hostel["latitude"] - $lat);
            $dLon = deg2rad($hostel["longitude"] - $lng);
            $a = sin($dLat/2) * sin($dLat/2) +
                cos(deg2rad($lat)) * cos(deg2rad($hostel["latitude"])) *
                sin($dLon/2) * sin($dLon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = $earthRadius * $c;

            if ($distance <= $hostel["radius"]) {
                echo json_encode(["success" => false, "message" => "You are inside the hostel. Cannot approve requests."]);
                exit;
            }
            $stmtCheck = $conn->prepare("SELECT RollNumber, status FROM leave_requests WHERE id = ?");
            $stmtCheck->execute([$requestId]);
            $reqData = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$reqData || !in_array($reqData['RollNumber'], $linked_ids)) {
                echo json_encode(["success" => false, "message" => "Request not found or not linked to you"]);
                exit;
            }
            if ($reqData["status"] === "cancelled") {
                echo json_encode(["success" => false, "message" => "This request has already been cancelled by the student."]);
                exit;
            }

            $stmt = $conn->prepare("
                UPDATE leave_requests
                SET parent_approval = 1, parent_comment = 'approved'
                WHERE id = ? AND RollNumber = ?
            ");
            $stmt->execute([$requestId, $reqData['RollNumber']]);

            echo json_encode(["success" => true, "message" => "Request approved successfully."]);
            break;

        // --------- Reject a leave request ---------
        case "reject_request":
            $requestId = $input["requestId"] ?? 0;
            $reason = $input["reason"] ?? "";
            if (!$requestId) {
                echo json_encode(["success" => false, "message" => "Request ID missing"]);
                exit;
            }
            // Fetch hostel location from DB
            $stmtHostel = $conn->prepare("SELECT latitude, longitude, radius FROM hostel_location WHERE id = 1 LIMIT 1");
            $stmtHostel->execute();
            $hostel = $stmtHostel->fetch(PDO::FETCH_ASSOC);

            if (!$hostel) {
                echo json_encode(["success" => false, "message" => "Hostel location not found"]);
                exit;
            }

            // Check parent's coordinates from input
            $lat = $input["latitude"] ?? null;
            $lng = $input["longitude"] ?? null;
            if ($lat === null || $lng === null) {
                echo json_encode(["success" => false, "message" => "Parent coordinates missing"]);
                exit;
            }

            // Calculate distance to hostel
            $earthRadius = 6371000;
            $dLat = deg2rad($hostel["latitude"] - $lat);
            $dLon = deg2rad($hostel["longitude"] - $lng);
            $a = sin($dLat/2) * sin($dLat/2) +
                cos(deg2rad($lat)) * cos(deg2rad($hostel["latitude"])) *
                sin($dLon/2) * sin($dLon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = $earthRadius * $c;

            if ($distance <= $hostel["radius"]) {
                echo json_encode(["success" => false, "message" => "You are inside the hostel. Cannot reject requests."]);
                exit;
            }
            $stmtCheck = $conn->prepare("SELECT RollNumber, status FROM leave_requests WHERE id = ?");
            $stmtCheck->execute([$requestId]);
            $reqData = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$reqData || !in_array($reqData['RollNumber'], $linked_ids)) {
                echo json_encode(["success" => false, "message" => "Request not found or not linked to you"]);
                exit;
            }

            if ($reqData["status"] === "cancelled") {
                echo json_encode(["success" => false, "message" => "This request has already been cancelled by the student."]);
                exit;
            }

            $stmt = $conn->prepare("
                UPDATE leave_requests
                SET parent_approval = 0,
                    parent_comment = ?,
                    status = 'rejected'
                WHERE id = ? AND RollNumber = ?
            ");
            $stmt->execute([$reason, $requestId, $reqData['RollNumber']]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(["success" => true, "message" => "Request rejected successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Request not found or already processed."]);
            }
            break;

        default:
            echo json_encode(["success" => false, "message" => "Invalid action"]);
            break;
    }

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>