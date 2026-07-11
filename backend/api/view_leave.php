<?php
include("../config.php");  
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/html");

$conn = new mysqli("DB host", "DB username", "DB password", "DB name");
if ($conn->connect_error) {
    die("Database connection failed");
}
if (!isset($_GET['token'])) {
    die("Invalid request");
}

$leave_id = base64_decode($_GET['token']);

if (!$leave_id || !is_numeric($leave_id)) {
    die("Invalid request");
}


$sql = "SELECT l.*, s.name, s.RollNumber, s.hostelName ,s.photo AS registration_photo,l.parent_approval, l.warden_approval
        FROM leave_requests l 
        JOIN users s ON l.RollNumber = s.id
        WHERE l.id = $leave_id";
$result = $conn->query($sql);

if ($result->num_rows === 0) {
    die("<h2>No leave details found</h2>");
}

$data = $result->fetch_assoc();

$parent_raw = $data['parent_approval'] ?? '';
$warden_raw = $data['warden_approval'] ?? '';

$parent = strtolower(trim($parent_raw));
$warden = strtolower(trim($warden_raw));
if ($parent === '1') $parent = 'approved';

$final_status = "Pending"; 
if ($parent === 'approved' && $warden === 'approved') {
    $final_status = "Approved";
} elseif ($parent === 'rejected' || $warden === 'rejected') {
    $final_status = "Rejected";
}

$photo_url = '';
if (!empty($data['registration_photo'])) {
    $photo_url = $STUDENT_PHOTO_URL . $data['registration_photo'];
}


$startDateFormatted = date("d M Y", strtotime($data['start_date']));
$endDateFormatted = date("d M Y", strtotime($data['end_date']));
$startTimeFormatted = !empty($data['start_time']) ? date("h:i A", strtotime($data['start_time'])) : '';
$endTimeFormatted = !empty($data['end_time']) ? date("h:i A", strtotime($data['end_time'])) : '';
?>

<!DOCTYPE html>
<html>
<head>
<title>Leave Details</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html, body {
    margin: 0;
    padding: 10px;
    font-family: Arial, sans-serif;
    background: #f9f9f9;
    color: #222;
    overflow: hidden; /* prevent scroll */
}
.container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
}
.logo {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: block;
    margin: 10px auto 10px auto;
}
h2 {
    font-size: 28px;
    text-align: center;
    margin: 5px 0 10px 0;
}
.leave-details {
    flex: 1 1 250px;
    max-width: 400px;
    margin: 5px;
    font-size: 14px;
    line-height: 1.8; /* increased line spacing */
}
.leave-details p {
    margin: 6px 0; /* increased spacing between lines */
}
hr {
    border: none;
    height: 1px;
    background: #ddd;
    margin: 10px 0;
}
.student-photo {
    flex: 0 0 150px;
    text-align: center;
    margin: 5px;
}
.student-photo img {
    width: 150px;
    height: 150px;
    border: 2px solid #333;
    border-radius: 50%;
    object-fit: cover;
}
.student-photo hr {
    border: 1px solid #333;
    width: 50%;
    margin: 5px auto 3px auto;
}
.student-photo span {
    font-weight: bold;
    font-size: 14px;
    color: #333;
}
.date-time-container {
    display: flex;
    justify-content: space-between;
}
.date-time-box {
    flex: 1;
    margin-right: 5px;
}
.date-time-box:last-child {
    margin-right: 0;
}
.status {
    font-weight: bold;
}
</style>
</head>
<body>

<img src="<?= $LOGO_URL ?>" class="logo" alt="College Logo">
<h2>Leave Details</h2>

<div class="container">

    <?php if (!empty($photo_url)): ?>
    <div class="student-photo">
        <img src="<?= $photo_url ?>" alt="Student Photo">
        <hr>
        <span>Student Photo</span>
    </div>
    <?php endif; ?>

    <div class="leave-details">
        <p><b>Name:</b> <?= $data['name'] ?></p>
        <p><b>Roll Number:</b> <?= $data['RollNumber'] ?></p>
        <p><b>Hostel:</b> <?= $data['hostelName'] ?></p>
        <hr>

        <div class="date-time-container">
            <div class="date-time-box">
                <p><b>From:</b> <?= $startDateFormatted ?></p>
                <?php if($startTimeFormatted): ?><p><b>Time:</b> <?= $startTimeFormatted ?></p><?php endif; ?>
            </div>
            <div class="date-time-box">
                <p><b>To:</b> <?= $endDateFormatted ?></p>
                <?php if($endTimeFormatted): ?><p><b>Time:</b> <?= $endTimeFormatted ?></p><?php endif; ?>
            </div>
        </div>

        <p><b>Destination:</b> <?= $data['destination'] ?></p>
        <p><b>Reason:</b> <?= $data['reason'] ?></p>
        <p><b>Contact:</b> <?= $data['contact_number'] ?></p>
        <hr>
        <?php
        $status_color = "#FFA500";
        if ($final_status == "Approved") $status_color = "#28a745";
        if ($final_status == "Rejected") $status_color = "#dc3545";
        ?>
        <p><b>Status:</b> <span class="status" style="color:<?= $status_color ?>;"><?= $final_status ?></span></p>
    </div>

</div>

</body>
</html>
