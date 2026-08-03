<?php
/**
 * =========================================================================================
 *  مباشر - پل ارتباطی کامل دیتابیس MySQL و API کامل برای هوسپینگ و cPanel / phpMyAdmin
 * =========================================================================================
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// -----------------------------------------------------------------------------------------
// ۱. تنظیمات اتصال دیتابیس MySQL (میتوانید در cPanel این مقادیر را تغییر دهید)
// -----------------------------------------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_USER', 'root');         // نام کاربر MySQL در cPanel
define('DB_PASS', '');             // رمز عبور دیتابیس
define('DB_NAME', 'mobasher_karmon_db'); // نام دیتابیس

error_reporting(0);
ini_set('display_errors', '0');

function send_json($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

function send_error($message, $statusCode = 400) {
    send_json(['status' => 'error', 'error' => $message], $statusCode);
}

// -----------------------------------------------------------------------------------------
// ۲. اتصال به دیتابیس PDO و ایجاد خودکار جداول و کاربر مدیر
// -----------------------------------------------------------------------------------------
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]);

    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `" . DB_NAME . "`");

    // جدول سرفصل‌ها (category_nodes)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `category_nodes` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `parentId` VARCHAR(64) NULL,
        `title` VARCHAR(255) NOT NULL,
        `subtitle` VARCHAR(255) NULL,
        `description` TEXT NULL,
        `icon` VARCHAR(64) DEFAULT 'Folder',
        `order_num` INT DEFAULT 0,
        `isPublished` TINYINT(1) DEFAULT 1,
        `requiredDocuments` LONGTEXT NULL,
        `processSteps` LONGTEXT NULL,
        `faqs` LONGTEXT NULL,
        `costsAndDeadlines` LONGTEXT NULL,
        `tags` LONGTEXT NULL,
        `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (`parentId`),
        INDEX (`isPublished`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // جدول کاربران (users)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `username` VARCHAR(64) NOT NULL UNIQUE,
        `password` VARCHAR(255) NOT NULL,
        `fullName` VARCHAR(128) NOT NULL,
        `role` VARCHAR(32) DEFAULT 'MEMBER',
        `isActive` TINYINT(1) DEFAULT 1,
        `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `lastLogin` DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // جدول لاگ‌ها (audit_logs)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `audit_logs` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `userId` VARCHAR(64) NULL,
        `userName` VARCHAR(128) NULL,
        `action` VARCHAR(64) NOT NULL,
        `details` TEXT NULL,
        `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // ایجاد یا بروزرسانی کاربر مدیر ارشد (admin / 13781378mM@)
    $adminCheck = $pdo->prepare("SELECT id FROM users WHERE username = 'admin'");
    $adminCheck->execute();
    $adminExists = $adminCheck->fetch();

    $hashedPass = password_hash('13781378mM@', PASSWORD_BCRYPT);
    if (!$adminExists) {
        $stmt = $pdo->prepare("INSERT INTO users (id, username, password, fullName, role, isActive, createdAt) VALUES (:id, :username, :password, :fullName, :role, 1, NOW())");
        $stmt->execute([
            ':id' => 'usr_admin_01',
            ':username' => 'admin',
            ':password' => $hashedPass,
            ':fullName' => 'ادمین ارشد',
            ':role' => 'ADMIN'
        ]);
    } else {
        $stmt = $pdo->prepare("UPDATE users SET fullName = 'ادمین ارشد', role = 'ADMIN', password = :password WHERE username = 'admin'");
        $stmt->execute([':password' => $hashedPass]);
    }

} catch (PDOException $e) {
    send_error("خطا در اتصال به MySQL: " . $e->getMessage(), 500);
}

// -----------------------------------------------------------------------------------------
// ۳. پردازش درخواست‌های API
// -----------------------------------------------------------------------------------------
$action = isset($_GET['action']) ? trim($_GET['action']) : '';
$method = $_SERVER['REQUEST_METHOD'];

// استخراج هلپر روت /api/... در صورت استفاده از .htaccess
if (empty($action)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (strpos($uri, '/api/auth/login') !== false) $action = 'login';
    elseif (strpos($uri, '/api/auth/public-users') !== false) $action = 'get_users';
    elseif (strpos($uri, '/api/auth/me') !== false) $action = 'me';
    elseif (strpos($uri, '/api/nodes') !== false) {
        if ($method === 'DELETE') $action = 'delete_node';
        elseif ($method === 'POST' || $method === 'PUT') $action = 'save_node';
        else $action = 'get_nodes';
    } elseif (strpos($uri, '/api/users') !== false) {
        if ($method === 'DELETE') $action = 'delete_user';
        elseif ($method === 'POST' || $method === 'PUT') $action = 'save_user';
        else $action = 'get_users';
    }
}

$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?? [];

switch ($action) {

    // -------------------------------------------------------------------------------------
    // وضعیت سیستم
    // -------------------------------------------------------------------------------------
    case 'status':
        send_json([
            'status' => 'ok',
            'database' => 'connected',
            'db_name' => DB_NAME,
            'server_time' => date('Y-m-d H:i:s'),
            'charset' => 'utf8mb4_unicode_ci',
            'message' => 'اتصال پایگاه داده MySQL با موفقیت برقرار است.'
        ]);
        break;

    // -------------------------------------------------------------------------------------
    // احراز هویت و ورود (Login)
    // -------------------------------------------------------------------------------------
    case 'login':
        $username = trim($inputData['username'] ?? $_POST['username'] ?? '');
        $password = trim($inputData['password'] ?? $_POST['password'] ?? '');

        if (!$username || !$password) {
            send_error("نام کاربری و رمز عبور الزامی است.", 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(:u) AND isActive = 1");
        $stmt->execute([':u' => $username]);
        $user = $stmt->fetch();

        if (!$user) {
            send_error("نام کاربری یا رمز عبور اشتباه است.", 401);
        }

        $isPasswordCorrect = false;
        if (password_verify($password, $user['password'])) {
            $isPasswordCorrect = true;
        } elseif ($password === $user['password']) { // پشتیبانی از رمزهای هش‌نشده متنی
            $isPasswordCorrect = true;
        } elseif ($username === 'admin' && ($password === '13781378mM@' || password_verify('13781378mM@', $user['password']))) {
            $isPasswordCorrect = true;
        }

        if (!$isPasswordCorrect) {
            send_error("نام کاربری یا رمز عبور اشتباه است.", 401);
        }

        // به روزرسانی زمان آخرین ورود
        $upd = $pdo->prepare("UPDATE users SET lastLogin = NOW() WHERE id = :id");
        $upd->execute([':id' => $user['id']]);

        $token = "token_mysql_" . bin2hex(random_bytes(16));
        $userData = [
            'id' => $user['id'],
            'username' => $user['username'],
            'fullName' => $user['fullName'],
            'role' => $user['role'],
            'isActive' => (bool)$user['isActive'],
            'createdAt' => $user['createdAt'],
            'lastLogin' => date('Y-m-d H:i:s')
        ];

        send_json([
            'user' => $userData,
            'token' => $token
        ]);
        break;

    // -------------------------------------------------------------------------------------
    // دریافت مشخصات کاربر جاری
    // -------------------------------------------------------------------------------------
    case 'me':
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        $stmt = $pdo->prepare("SELECT id, username, fullName, role, isActive, createdAt, lastLogin FROM users WHERE username = 'admin' LIMIT 1");
        $stmt->execute();
        $adminUser = $stmt->fetch();
        
        send_json(['user' => $adminUser]);
        break;

    // -------------------------------------------------------------------------------------
    // دریافت همه داده‌ها
    // -------------------------------------------------------------------------------------
    case 'get_all':
        $nodesStmt = $pdo->query("SELECT * FROM category_nodes ORDER BY order_num ASC, createdAt ASC");
        $rawNodes = $nodesStmt->fetchAll();

        $formattedNodes = array_map(function($node) {
            return [
                'id' => $node['id'],
                'parentId' => $node['parentId'],
                'title' => $node['title'],
                'subtitle' => $node['subtitle'] ?? '',
                'description' => $node['description'] ?? '',
                'icon' => $node['icon'] ?? 'Folder',
                'order' => (int)$node['order_num'],
                'isPublished' => (bool)$node['isPublished'],
                'requiredDocuments' => json_decode($node['requiredDocuments'] ?? '[]', true) ?? [],
                'processSteps' => json_decode($node['processSteps'] ?? '[]', true) ?? [],
                'faqs' => json_decode($node['faqs'] ?? '[]', true) ?? [],
                'costsAndDeadlines' => json_decode($node['costsAndDeadlines'] ?? '{}', true) ?? [],
                'tags' => json_decode($node['tags'] ?? '[]', true) ?? []
            ];
        }, $rawNodes);

        $usersStmt = $pdo->query("SELECT id, username, fullName, role, isActive, createdAt, lastLogin FROM users");
        $users = $usersStmt->fetchAll();

        $logsStmt = $pdo->query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100");
        $logs = $logsStmt->fetchAll();

        send_json([
            'nodes' => $formattedNodes,
            'users' => $users,
            'auditLogs' => $logs
        ]);
        break;

    // -------------------------------------------------------------------------------------
    // همگام‌سازی کامل داده‌ها (Sync All)
    // -------------------------------------------------------------------------------------
    case 'sync_all':
        try {
            $pdo->beginTransaction();

            if (isset($inputData['nodes']) && is_array($inputData['nodes'])) {
                $pdo->exec("DELETE FROM category_nodes");
                $insertNode = $pdo->prepare("INSERT INTO category_nodes 
                    (id, parentId, title, subtitle, description, icon, order_num, isPublished, requiredDocuments, processSteps, faqs, costsAndDeadlines, tags) 
                    VALUES (:id, :parentId, :title, :subtitle, :description, :icon, :order_num, :isPublished, :requiredDocuments, :processSteps, :faqs, :costsAndDeadlines, :tags)");

                foreach ($inputData['nodes'] as $node) {
                    $insertNode->execute([
                        ':id' => $node['id'],
                        ':parentId' => $node['parentId'] ?? null,
                        ':title' => $node['title'],
                        ':subtitle' => $node['subtitle'] ?? '',
                        ':description' => $node['description'] ?? '',
                        ':icon' => $node['icon'] ?? 'Folder',
                        ':order_num' => $node['order'] ?? 0,
                        ':isPublished' => !empty($node['isPublished']) ? 1 : 0,
                        ':requiredDocuments' => json_encode($node['requiredDocuments'] ?? [], JSON_UNESCAPED_UNICODE),
                        ':processSteps' => json_encode($node['processSteps'] ?? [], JSON_UNESCAPED_UNICODE),
                        ':faqs' => json_encode($node['faqs'] ?? [], JSON_UNESCAPED_UNICODE),
                        ':costsAndDeadlines' => json_encode($node['costsAndDeadlines'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
                        ':tags' => json_encode($node['tags'] ?? [], JSON_UNESCAPED_UNICODE)
                    ]);
                }
            }

            if (isset($inputData['users']) && is_array($inputData['users'])) {
                $pdo->exec("DELETE FROM users");
                $insertUser = $pdo->prepare("INSERT INTO users 
                    (id, username, password, fullName, role, isActive, createdAt, lastLogin) 
                    VALUES (:id, :username, :password, :fullName, :role, :isActive, :createdAt, :lastLogin)");

                foreach ($inputData['users'] as $u) {
                    $insertUser->execute([
                        ':id' => $u['id'],
                        ':username' => $u['username'],
                        ':password' => password_hash($u['password'] ?? '123456', PASSWORD_BCRYPT),
                        ':fullName' => $u['fullName'],
                        ':role' => $u['role'] ?? 'MEMBER',
                        ':isActive' => !empty($u['isActive']) ? 1 : 0,
                        ':createdAt' => $u['createdAt'] ?? date('Y-m-d H:i:s'),
                        ':lastLogin' => $u['lastLogin'] ?? null
                    ]);
                }
            }

            $pdo->commit();
            send_json(['status' => 'success', 'message' => 'اطلاعات با موفقیت در دیتابیس MySQL همگام شد.']);

        } catch (Exception $e) {
            $pdo->rollBack();
            send_error("خطا در همگام‌سازی: " . $e->getMessage(), 500);
        }
        break;

    // -------------------------------------------------------------------------------------
    // سرفصل‌ها (Category Nodes)
    // -------------------------------------------------------------------------------------
    case 'get_nodes':
        $stmt = $pdo->query("SELECT * FROM category_nodes ORDER BY order_num ASC, createdAt ASC");
        $rawNodes = $stmt->fetchAll();

        $nodes = array_map(function($node) {
            return [
                'id' => $node['id'],
                'parentId' => $node['parentId'],
                'title' => $node['title'],
                'subtitle' => $node['subtitle'] ?? '',
                'description' => $node['description'] ?? '',
                'icon' => $node['icon'] ?? 'Folder',
                'order' => (int)$node['order_num'],
                'isPublished' => (bool)$node['isPublished'],
                'requiredDocuments' => json_decode($node['requiredDocuments'] ?? '[]', true) ?? [],
                'processSteps' => json_decode($node['processSteps'] ?? '[]', true) ?? [],
                'faqs' => json_decode($node['faqs'] ?? '[]', true) ?? [],
                'costsAndDeadlines' => json_decode($node['costsAndDeadlines'] ?? '{}', true) ?? [],
                'tags' => json_decode($node['tags'] ?? '[]', true) ?? []
            ];
        }, $rawNodes);

        send_json($nodes);
        break;

    case 'save_node':
        $id = $inputData['id'] ?? ('node_' . time() . '_' . rand(100, 999));
        $stmt = $pdo->prepare("REPLACE INTO category_nodes 
            (id, parentId, title, subtitle, description, icon, order_num, isPublished, requiredDocuments, processSteps, faqs, costsAndDeadlines, tags) 
            VALUES (:id, :parentId, :title, :subtitle, :description, :icon, :order_num, :isPublished, :requiredDocuments, :processSteps, :faqs, :costsAndDeadlines, :tags)");

        $stmt->execute([
            ':id' => $id,
            ':parentId' => $inputData['parentId'] ?? null,
            ':title' => $inputData['title'] ?? '',
            ':subtitle' => $inputData['subtitle'] ?? '',
            ':description' => $inputData['description'] ?? '',
            ':icon' => $inputData['icon'] ?? 'Folder',
            ':order_num' => $inputData['order'] ?? 0,
            ':isPublished' => !isset($inputData['isPublished']) || $inputData['isPublished'] ? 1 : 0,
            ':requiredDocuments' => json_encode($inputData['requiredDocuments'] ?? [], JSON_UNESCAPED_UNICODE),
            ':processSteps' => json_encode($inputData['processSteps'] ?? [], JSON_UNESCAPED_UNICODE),
            ':faqs' => json_encode($inputData['faqs'] ?? [], JSON_UNESCAPED_UNICODE),
            ':costsAndDeadlines' => json_encode($inputData['costsAndDeadlines'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
            ':tags' => json_encode($inputData['tags'] ?? [], JSON_UNESCAPED_UNICODE)
        ]);

        send_json(['status' => 'success', 'id' => $id, 'message' => 'سرفصل با موفقیت ذخیره شد.']);
        break;

    case 'delete_node':
        $id = $_GET['id'] ?? $inputData['id'] ?? '';
        if (!$id) send_error("شناسه id ارسال نشده است.");

        function deleteNodeRecursive($pdo, $nodeId) {
            $childStmt = $pdo->prepare("SELECT id FROM category_nodes WHERE parentId = :pid");
            $childStmt->execute([':pid' => $nodeId]);
            $children = $childStmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($children as $cid) {
                deleteNodeRecursive($pdo, $cid);
            }

            $delStmt = $pdo->prepare("DELETE FROM category_nodes WHERE id = :id");
            $delStmt->execute([':id' => $nodeId]);
        }

        deleteNodeRecursive($pdo, $id);
        send_json(['status' => 'success', 'message' => 'بخش با موفقیت حذف شد.']);
        break;

    // -------------------------------------------------------------------------------------
    // مدیریت کاربران
    // -------------------------------------------------------------------------------------
    case 'get_users':
        $stmt = $pdo->query("SELECT id, username, fullName, role, isActive, createdAt, lastLogin FROM users");
        $users = $stmt->fetchAll();
        send_json($users);
        break;

    case 'save_user':
        $username = trim($inputData['username'] ?? '');
        $fullName = trim($inputData['fullName'] ?? '');
        $role = $inputData['role'] ?? 'MEMBER';
        $password = $inputData['password'] ?? '';
        $id = $inputData['id'] ?? ('usr_' . time());

        if (!$username || !$fullName) {
            send_error("نام کاربری و نام کامل الزامی است.");
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE username = :u AND id != :id");
        $check->execute([':u' => $username, ':id' => $id]);
        if ($check->fetch()) {
            send_error("این نام کاربری قبلاً ثبت شده است.");
        }

        if (!empty($password)) {
            $hashed = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("REPLACE INTO users (id, username, password, fullName, role, isActive, createdAt) VALUES (:id, :u, :p, :f, :r, 1, NOW())");
            $stmt->execute([':id' => $id, ':u' => $username, ':p' => $hashed, ':f' => $fullName, ':r' => $role]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET username = :u, fullName = :f, role = :r WHERE id = :id");
            $stmt->execute([':id' => $id, ':u' => $username, ':f' => $fullName, ':r' => $role]);
        }

        send_json(['status' => 'success', 'message' => 'اطلاعات کاربر ذخیره گردید.']);
        break;

    case 'delete_user':
        $id = $_GET['id'] ?? $inputData['id'] ?? '';
        if (!$id) send_error("شناسه کاربر ارسال نشده است.");

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        send_json(['status' => 'success', 'message' => 'کاربر با موفقیت حذف گردید.']);
        break;

    default:
        send_json([
            'status' => 'online',
            'api_name' => 'مباشر MySQL PHP API Bridge',
            'admin_seeded' => 'admin / 13781378mM@',
            'available_actions' => ['status', 'login', 'me', 'get_all', 'sync_all', 'get_nodes', 'save_node', 'delete_node', 'get_users', 'save_user', 'delete_user']
        ]);
        break;
}
