<?php
/**
 * =========================================================================================
 *  مباشر - پل ارتباطی دیتابیس (PHP & MySQL API Bridge for cPanel / phpMyAdmin)
 * =========================================================================================
 * 
 * راهنمای تنظیم دیتابیس در هاست cPanel:
 * ۱. وارد cPanel شوید و یک دیتابیس MySQL جدید ایجاد کنید (مثلا: karmon_db).
 * ۲. یک کاربر دیتابیس (User) بسازید و تمام دسترسی‌ها (ALL PRIVILEGES) را به آن بدهید.
 * ۳. مقادیر DB_HOST, DB_USER, DB_PASS, DB_NAME را در خطوط پایین ویرایش کنید.
 * ۴. این فایل به صورت خودکار جداول (Tables) را با پشتیبانی کامل از زبان فارسی (utf8mb4) می‌سازد.
 * =========================================================================================
 */

// تنظیم هدرهای CORS برای دسترسی بدون محدودیت کلاینت به API
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// مدیریت درخواسته های Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// -----------------------------------------------------------------------------------------
// ۱. تنظیمات اتصال دیتابیس MySQL (لطفاً اطلاعات cPanel خود را اینجا قرار دهید)
// -----------------------------------------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_USER', 'root');         // نام کاربر MySQL در cPanel
define('DB_PASS', '');             // رمز عبور دیتابیس
define('DB_NAME', 'mobasher_karmon_db'); // نام دیتابیس

// جلوگیری از نمایش خطاهای خام PHP و شکستن ساختار JSON
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
// ۲. اتصال به دیتابیس PDO و ساخت خودکار جداول در صورت عدم وجود
// -----------------------------------------------------------------------------------------
try {
    // ابتدا بدون انتخاب DB متصل می‌شویم تا در صورت عدم وجود دیتابیس، آن را بسازیم
    $pdo = new PDO("mysql:host=" . DB_HOST . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]);

    // ایجاد خودکار دیتابیس در صورت عدم وجود
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `" . DB_NAME . "`");

    // ساخت جدول سرفصل‌ها و حوزه‌ها (category_nodes)
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

    // ساخت جدول کاربران کال‌سنتر (users)
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

    // ساخت جدول سوابق سیستم (audit_logs)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `audit_logs` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `userId` VARCHAR(64) NULL,
        `userName` VARCHAR(128) NULL,
        `action` VARCHAR(64) NOT NULL,
        `details` TEXT NULL,
        `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

} catch (PDOException $e) {
    send_error("خطا در اتصال به MySQL: " . $e->getMessage(), 500);
}

// -----------------------------------------------------------------------------------------
// ۳. پردازش اکشن‌ها و روتهای API
// -----------------------------------------------------------------------------------------
$action = isset($_GET['action']) ? trim($_GET['action']) : '';
$method = $_SERVER['REQUEST_METHOD'];

// دریافت دیتای ارسال شده در بدنه درخواست (JSON)
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?? [];

switch ($action) {

    // -------------------------------------------------------------------------------------
    // وضعیت و تست اتصال API (Health Check)
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
    // دریافت کامل تمامی داده‌ها (گت همه)
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
    // سینک کلی داده‌ها به دیتابیس (Sync All Data with Transactions)
    // -------------------------------------------------------------------------------------
    case 'sync_all':
        if ($method !== 'POST') {
            send_error("روش درخواست باید POST باشد.", 405);
        }

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
                        ':password' => $u['password'] ?? '$2a$10$abcdefghijklmnopqrstuu',
                        ':fullName' => $u['fullName'],
                        ':role' => $u['role'] ?? 'MEMBER',
                        ':isActive' => !empty($u['isActive']) ? 1 : 0,
                        ':createdAt' => $u['createdAt'] ?? date('Y-m-d H:i:s'),
                        ':lastLogin' => $u['lastLogin'] ?? null
                    ]);
                }
            }

            $pdo->commit();
            send_json(['status' => 'success', 'message' => 'تمامی اطلاعات با موفقیت در دیتابیس MySQL سینک شدند.']);

        } catch (Exception $e) {
            $pdo->rollBack();
            send_error("خطا در همگام‌سازی: " . $e->getMessage(), 500);
        }
        break;

    // -------------------------------------------------------------------------------------
    // مدیریت سرفصل‌ها (Nodes GET, POST, PUT, DELETE)
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
        if ($method !== 'POST') send_error("روش باید POST باشد", 405);

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

        // حذف بازگشتی زیرمجموعه‌ها
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
        send_json(['status' => 'success', 'message' => 'بخش و زیرمجموعه‌های آن با موفقیت حذف شدند.']);
        break;

    // -------------------------------------------------------------------------------------
    // مدیریت کاربران
    // -------------------------------------------------------------------------------------
    case 'get_users':
        $stmt = $pdo->query("SELECT id, username, fullName, role, isActive, createdAt, lastLogin FROM users");
        send_json($stmt->fetchAll());
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
            'available_actions' => ['status', 'get_all', 'sync_all', 'get_nodes', 'save_node', 'delete_node', 'get_users', 'delete_user']
        ]);
        break;
}
