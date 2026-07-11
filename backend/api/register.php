<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$autoload = __DIR__ . '/vendor/autoload.php';

if (!file_exists($autoload)) {
    echo json_encode(['success' => false, 'message' => 'autoload.php NOT FOUND']);
    exit;
}

require $autoload;


try {
    // Database connection
    $conn = new mysqli("DB host", "DB username", "DB password", "DB name");
    if ($conn->connect_error) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit;
    }
    /* ---------------- ACTION ---------------- */
$action = $_POST['action'] ?? '';

/* =========================================================
   =============== STEP 2 : VERIFY OTP =====================
   ========================================================= */
if ($action === 'verify_otp') {

    $email = $_POST['email'] ?? '';
    $otp   = $_POST['otp'] ?? '';

    if (!$email || !$otp) {
        echo json_encode(['success' => false, 'message' => 'Email and OTP required']);
        exit;
    }

    $stmt = $conn->prepare("SELECT otp, verified FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }

    if ((int)$user['verified'] === 1) {
        echo json_encode(['success' => false, 'message' => 'User already verified']);
        exit;
    }

    if ((string)$user['otp'] !== (string)$otp) {
        echo json_encode(['success' => false, 'message' => 'Invalid OTP']);
        exit;
    }

    $update = $conn->prepare("
        UPDATE users 
        SET verified = 1,
            registration_status = 'completed',
            otp = NULL,
            verification_code = NULL
        WHERE email = ?
    ");
    $update->bind_param("s", $email);
    $update->execute();

    echo json_encode([
        'success' => true,
        'message' => 'OTP verified. Registration completed'
    ]);
    exit;
}
/* =========================================================
   =============== STEP 1 : REGISTER =======================
   ========================================================= */

if ($action !== 'register') {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}
    // Check if required POST fields exist
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $phone = $_POST['phone'] ?? '';
    $role = $_POST['role'] ?? '';
    $password = $_POST['password'] ?? '';
    $RollNumber = $_POST['RollNumber'] ?? '';
    $hostelName = $_POST['hostelName'] ?? '';
    $roomNumber = $_POST['roomNumber'] ?? '';
    $parentName = $_POST['parentName'] ?? '';
    $parentPhone = $_POST['parentPhone'] ?? '';
    $aadharNumber = $_POST['aadharNumber'] ?? '';
    $branch = $_POST['branch'] ?? '';
    $bloodGroup = $_POST['bloodGroup'] ?? '';
    $photo = $_POST['photo'] ?? '';
    $gender = $_POST['gender'] ?? '';
    $city = $_POST['city'] ?? '';
    $state = $_POST['state'] ?? '';
    $pincode = $_POST['pincode'] ?? '';
    $year = $_POST['year'] ?? '';
    $section = $_POST['section'] ?? '';
    $address = $_POST['address'] ?? '';
    $Course = $_POST['Course'] ?? '';
    
    // Validate required fields
    if (!$name || !$email || !$password || !$role || !$gender) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    // Password validation
    if (!preg_match("/^[A-Za-z0-9]{6}$/", $password)) {
        echo json_encode(["success" => false, "message" => "Password must be exactly 6 alphanumeric characters"]);
        exit;
    }

    // Aadhaar validation for roles
    $roles_need_aadhaar = ['student', 'parent', 'warden'];
    if (in_array($role, $roles_need_aadhaar)) {
        if (!preg_match("/^[0-9]{12}$/", $aadharNumber)) {
            echo json_encode(["success" => false, "message" => "Aadhaar must be 12 digits"]);
            exit;
        }
    }

    // Hostel validation for students
    if ($role === 'student') {
        $allowedHostels = ['Boys Hostel', 'Girls Hostel'];
        if (!$hostelName || !in_array($hostelName, $allowedHostels)) {
            echo json_encode(['success' => false, 'message' => 'Invalid hostel selected']);
            exit;
        }
    }

    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        exit;
    }

    // Initialize RollNumbers for parent
    $RollNumbers = [];
    if ($role === 'parent' && $RollNumber) {
        $RollNumbers = array_map('trim', explode(',', $RollNumber));
    }

    // Handle Aadhaar photo upload
    $photoNameInDB = null;
    if (isset($_FILES['aadharFile'])) {
        $file = $_FILES['aadharFile'];
        if ($file['error'] === 0) {
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg'])) {
                echo json_encode(["success" => false, "message" => "Only JPG allowed"]);
                exit;
            }
            if ($file['size'] > 512000) {
                echo json_encode(["success" => false, "message" => "Photo must be less than 500 KB"]);
                exit;
            }

            // Determine folder and file name based on role
            switch ($role) {
                case 'student':
                    if (!$RollNumber) {
                        echo json_encode(["success" => false, "message" => "Student Roll Number required for photo"]);
                        exit;
                    }
                    $folder = __DIR__ . "/uploads/student";
                    $photoNameInDB = $RollNumber . ".jpg";
                    break;

                case 'parent':
                    if (empty($RollNumbers[0])) {
                        echo json_encode(["success" => false, "message" => "Parent must have at least one child roll number for photo"]);
                        exit;
                    }
                    $folder = __DIR__ . "/uploads/parent";
                    $photoNameInDB = trim($RollNumbers[0]) . ".jpg"; // first child's roll number
                    break;

                case 'warden':
                    if (!$aadharNumber) {
                        echo json_encode(["success" => false, "message" => "Warden Aadhaar required for photo"]);
                        exit;
                    }
                    $folder = __DIR__ . "/uploads/warden";
                    $photoNameInDB = $aadharNumber . ".jpg";
                    break;

                default:
                    $folder = __DIR__ . "/uploads/others";
                    $photoNameInDB = "unknown_" . time() . ".jpg";
            }

            // Create folder if doesn't exist
            if (!is_dir($folder)) {
                mkdir($folder, 0777, true);
            }

            // Move uploaded file
            $upload_path = $folder . "/" . $photoNameInDB;
            move_uploaded_file($file['tmp_name'], $upload_path);
        }
    }

    // Normal password (no hashing)
    $normalPassword = $password;

    

    // Determine linked_id for parent
    $linked_id = null;
    if ($role === 'parent' && $RollNumber) {
        $linked_ids = [];
        foreach ($RollNumbers as $sid) {
            $stmtStudent = $conn->prepare("SELECT id FROM users WHERE RollNumber=? AND role='student'");
            $stmtStudent->bind_param("s", $sid);
            $stmtStudent->execute();
            $res = $stmtStudent->get_result();
            $student = $res->fetch_assoc();
            if ($student) $linked_ids[] = $student['id'];
        }

        if (!empty($linked_ids)) {
            $linked_id = implode(',', $linked_ids);
        } else {
            echo json_encode(['success' => false, 'message' => "No valid Student's Roll Number found for parent"]);
            exit;
        }
    }

    // Generate OTP and verification code
$otp = rand(100000, 999999);
$verification_code = substr(str_shuffle('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 6);
    $verified = 0; // ALWAYS 0 until OTP verification

    // Insert user
    $stmt = $conn->prepare("INSERT INTO users 
    (name,email,phone,role,password,RollNumber,hostelName,roomNumber,parentName,parentPhone,aadharNumber,branch,bloodGroup,verified,verification_code,otp,linked_id,photo,gender,city,state,pincode,year,section,address,Course)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

$stmt->bind_param(
    "ssssssssssssssssssssssisss",
    $name, $email, $phone, $role, $normalPassword, $RollNumber,
    $hostelName, $roomNumber, $parentName, $parentPhone, $aadharNumber,
    $branch, $bloodGroup, $verified, $verification_code, $otp,
    $linked_id, $photoNameInDB, $gender, $city, $state,
    $pincode, $year, $section, $address, $Course
);
if (!$stmt->execute()) {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
        exit;
    }

// Fetch SMTP credentials from database
$mailStmt = $conn->prepare("
    SELECT smtp_host, smtp_port, smtp_email, smtp_password, smtp_secure 
    FROM mail_settings 
    WHERE is_active = 1 
    LIMIT 1
");
$mailStmt->execute();
$mailConfig = $mailStmt->get_result()->fetch_assoc();

if (!$mailConfig) {
    echo json_encode(['success' => false, 'message' => 'Mail configuration not found']);
    exit;
}


 /* ---------------- SEND OTP EMAIL ---------------- */
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = $mailConfig['smtp_host'];
        $mail->SMTPAuth = true;
        $mail->Username = $mailConfig['smtp_email'];
        $mail->Password = $mailConfig['smtp_password'];
        $mail->SMTPSecure = ($mailConfig['smtp_secure'] === 'tls')
            ? PHPMailer::ENCRYPTION_STARTTLS
            : PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = (int)$mailConfig['smtp_port'];

        $mail->setFrom($mailConfig['smtp_email'], 'SSIPMT HANS');

        $mail->addAddress($email,$name);

        $mail->isHTML(true);
        $mail->Subject = 'Account Verification';
        $mail->Body = "
<div style='font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; padding: 24px;'>
    
    <h2 style='color:#1a73e8; text-align:center; margin-bottom: 10px;'>
        HANS Account Verification
    </h2>

    <p style='font-size:14px; color:#333;'>
        Dear User,
    </p>

    <p style='font-size:14px; color:#333;'>
        Thank you for registering with <b>HANS</b>.
    </p>
    <p style='font-size:14px; color:#333;'>
        Please use the following One-Time Password (OTP) to verify your email address:
    </p>

    <div style='text-align:center; margin: 24px 0;'>
        <span style='font-size:32px; letter-spacing:6px; font-weight:bold; color:#000;'>
            $otp
        </span>
    </div>

    <p style='font-size:14px; color:#333;'>
        This OTP is valid for 10 minutes. 
    </p>
    <p style='font-size:14px; color:#333;'>
        Please do not share it with anyone for security reasons.
    </p>
    <p style='font-size:13px; color:#777;'>
        If you did not request this verification, please ignore this email.
    </p>

    <hr style='margin: 24px 0; border: none; border-top: 1px solid #ddd;'>

</div>
";


        $mail->send();

    } catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'OTP email failed',
        'error' => $mail->ErrorInfo
    ]);
    exit;
}


    echo json_encode([
    'success' => true,
    'message' => 'OTP sent. Please verify to complete registration.'
]);


} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
