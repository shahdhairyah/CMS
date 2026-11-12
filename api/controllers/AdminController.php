<?php
/**
 * ADIT CMS - Admin Controller
 */

class AdminController {

    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    public function dashboard() {
        try {
            $studentModel = new Student();
            $facultyModel = new Faculty();
            $feeModel = new Fee();
            $libraryModel = new Library();

            $recentPayments = $feeModel->getAllPayments(1, 5);
            $libraryStats = $libraryModel->getStatistics();

            $stats = [
                'total_students' => (int) $studentModel->count(),
                'total_faculty' => (int) $facultyModel->count(),
                'total_users' => (int) $this->userModel->count(),
                'students_by_department' => $this->getStudentsByDepartment(),
                // getAllPayments() already returns the envelope, so unwrap it
                // here; the previous ['data'] lookup produced undefined-index
                // notices and an empty list.
                'recent_payments' => is_array($recentPayments)
                    ? ($recentPayments['data'] ?? [])
                    : $recentPayments,
                'library_stats' => is_array($libraryStats)
                    ? ($libraryStats['data'] ?? $libraryStats)
                    : $libraryStats,
            ];

            Response::success($stats);
        } catch (Throwable $e) {
            error_log('AdminController::dashboard Error: ' . $e->getMessage());
            Response::serverError('Failed to load dashboard');
        }
    }

    public function getUsers() {
        try {
            [$page, $pageSize] = Validation::pagination();
            $role = $_GET['role'] ?? null;
            if ($role !== null && !in_array($role, ['admin', 'hod', 'faculty', 'librarian', 'student'], true)) {
                $role = null;
            }

            $result = $this->userModel->getAll($page, $pageSize, $role);
            Response::paginated($result['data'], $result['total'], $page, $pageSize);
        } catch (Throwable $e) {
            error_log('AdminController::getUsers Error: ' . $e->getMessage());
            Response::serverError('Failed to load users');
        }
    }

    /**
     * Create a database backup.
     *
     * The previous version:
     *  - referenced BACKUP_PATH with `??`, which is a fatal Error for an
     *    undefined constant in PHP 8 (`??` does not apply to constants),
     *  - built "mysqldump -u USER -pPASSWORD ..." as a shell string, putting
     *    the database password in the process list,
     *  - assumed exec() exists, which shared hosts such as InfinityFree
     *    disable, so it failed with a confusing error,
     *  - wrote the dump inside the web root where it could be downloaded,
     *  - and returned mysqldump's raw output to the client.
     */
    public function backup() {
        $backupDir = defined('BACKUP_PATH') ? BACKUP_PATH : (dirname(__DIR__) . '/backups/');
        $backupDir = rtrim(str_replace('\\', '/', $backupDir), '/');

        if (!is_dir($backupDir) && !@mkdir($backupDir, 0750, true) && !is_dir($backupDir)) {
            Response::serverError('Backup directory is not writable on this server');
        }
        if (!is_writable($backupDir)) {
            Response::serverError('Backup directory is not writable on this server');
        }

        // Refuse to run inside the document root.
        $docRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
        if ($docRoot && strpos($backupDir . '/', $docRoot . '/') === 0) {
            Response::serverError('Refusing to write backups inside the web root. Set BACKUP_PATH to a directory outside it.');
        }

        // proc_open() is what is actually used below; exec() is never called, so
        // it was removed from this gate - requiring it rejected backups on
        // hosts that disable exec() but allow proc_open(), which is the
        // combination this check was meant to support.
        $disabled = array_values(array_filter(
            ['proc_open', 'escapeshellarg'],
            static fn($fn) => !function_exists($fn)
        ));
        if ($disabled) {
            Response::error(
                'This host disables ' . implode(', ', $disabled) . ', so server-side backups are unavailable. '
                . 'Use your hosting control panel to export the database instead.',
                501
            );
        }

        $filename = 'adit_cms_backup_' . date('Ymd_His') . '.sql';
        $filepath = $backupDir . '/' . $filename;
        $lockFile = $backupDir . '/.backup.lock';

        $lock = @fopen($lockFile, 'c');
        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            Response::error('Another backup is already running. Try again shortly.', 409);
        }

        // Pass the credentials through a temporary defaults file rather than
        // --password=..., so the secret never appears in the process list.
        $defaults = $backupDir . '/.my.cnf.' . bin2hex(random_bytes(8));
        if (@file_put_contents($defaults, "[client]\nhost=" . DB_HOST . "\nuser=" . DB_USER . "\npassword=\"" . addcslashes(DB_PASS, "\\\"") . "\"\n") === false) {
            flock($lock, LOCK_UN);
            fclose($lock);
            @unlink($lockFile);
            Response::serverError('Could not prepare the temporary credentials file');
        }
        @chmod($defaults, 0600);

        $descriptors = [1 => ['file', $filepath, 'w'], 2 => ['pipe', 'w']];
        $command = sprintf(
            '%s --defaults-extra-file=%s --single-transaction --no-tablespaces --result-file=%s %s',
            $this->mysqldumpBinary(),
            escapeshellarg($defaults),
            escapeshellarg($filepath),
            escapeshellarg(DB_NAME)
        );

        $pipes = [];
        $proc  = @proc_open($command, $descriptors, $pipes);
        if (!is_resource($proc)) {
            @unlink($defaults);
            flock($lock, LOCK_UN);
            fclose($lock);
            @unlink($lockFile);
            Response::serverError('Could not start the backup process');
        }

        $stderr = stream_get_contents($pipes[2]) ?? '';
        fclose($pipes[2]);
        $exitCode = proc_close($proc);

        @unlink($defaults);
        flock($lock, LOCK_UN);
        fclose($lock);
        @unlink($lockFile);

        if ($exitCode !== 0 || !is_file($filepath) || filesize($filepath) === 0) {
            error_log('ADIT CMS: mysqldump failed (' . $exitCode . '): ' . trim((string) $stderr));
            @unlink($filepath);
            // Diagnostics go to the log, not to the browser.
            Response::serverError('Backup failed. Check the server error log for details.');
        }

        $size = filesize($filepath);

        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare(
                "INSERT INTO system_backups (filename, file_path, size, created_by, created_at)
                 VALUES (?, ?, ?, ?, NOW())"
            );
            $stmt->execute([$filename, $filepath, $size, AuthMiddleware::getUserId()]);
        } catch (Throwable $e) {
            // The dump itself succeeded; failing to log it is not fatal.
            error_log('ADIT CMS: could not record backup in system_backups: ' . $e->getMessage());
        }

        Response::success([
            'filename' => $filename,
            'size' => $size,
        ], 'Backup created successfully');
    }

    /** Locate a usable mysqldump, or fail early with a clear message. */
    private function mysqldumpBinary() {
        foreach (['/usr/bin/mysqldump', '/usr/local/bin/mysqldump', 'mysqldump'] as $candidate) {
            if (strpos($candidate, '/') === 0) {
                if (is_executable($candidate)) {
                    return $candidate;
                }
            } else {
                return $candidate; // resolved via PATH by the shell
            }
        }
        return 'mysqldump';
    }

    public function getAuditLogs() {
        try {
            [$page, $pageSize] = Validation::pagination();
            $offset = Validation::offset($page, $pageSize);

            $db = Database::getInstance()->getConnection();

            $countStmt = $db->prepare("SELECT COUNT(*) FROM audit_logs");
            $countStmt->execute();
            $total = (int) $countStmt->fetchColumn();

            $stmt = $db->prepare(
                "SELECT al.*, u.email AS user_email
                 FROM audit_logs al
                 LEFT JOIN users u ON al.user_id = u.id
                 ORDER BY al.created_at DESC
                 LIMIT ? OFFSET ?"
            );
            $stmt->bindValue(1, $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(2, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $logs = $stmt->fetchAll();

            Response::paginated($logs, $total, $page, $pageSize);
        } catch (Throwable $e) {
            error_log('AdminController::getAuditLogs Error: ' . $e->getMessage());
            Response::serverError('Failed to load audit logs');
        }
    }

    public function getSettings() {
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("SELECT * FROM system_settings ORDER BY setting_key");
            $stmt->execute();
            $settings = $stmt->fetchAll();

            $settingsMap = [];
            foreach ($settings as $setting) {
                $settingsMap[$setting['setting_key']] = $setting['setting_value'];
            }

            Response::success($settingsMap);
        } catch (Throwable $e) {
            error_log('AdminController::getSettings Error: ' . $e->getMessage());
            Response::serverError('Failed to load settings');
        }
    }

    public function updateSettings() {
        try {
            $data = Validation::getJsonInput();
            $userId = AuthMiddleware::getUserId();

            if (empty($data)) {
                Response::error('No settings supplied', 400);
            }

            $db = Database::getInstance()->getConnection();

            $allowed = [
                'college_name', 'college_address', 'college_phone', 'college_email',
                'college_website', 'college_code', 'principal_name',
                'academic_year', 'current_semester_type', 'min_attendance_percentage',
                'passing_marks_percentage', 'grading_system',
                'library_fine_per_day', 'max_books_issue', 'book_issue_duration_days',
                'razorpay_key_id', 'currency_symbol', 'fee_due_days_grace', 'enable_online_payment',
                'enable_student_registrations', 'maintenance_mode', 'session_timeout_minutes',
                'system_timezone', 'portal_notice_banner'
            ];

            $unknown = array_diff(array_keys($data), $allowed);
            if ($unknown) {
                Response::error('Unknown setting(s): ' . implode(', ', $unknown), 400);
            }
            $data = array_intersect_key($data, array_flip($allowed));

            $numeric = [
                'min_attendance_percentage'   => [0, 100],
                'passing_marks_percentage'    => [0, 100],
                'library_fine_per_day'        => [0, 100000],
                'max_books_issue'             => [0, 50],
                'book_issue_duration_days'    => [1, 365],
                'fee_due_days_grace'          => [0, 180],
                'session_timeout_minutes'     => [5, 1440],
            ];
            foreach ($numeric as $key => [$min, $max]) {
                if (!array_key_exists($key, $data) || $data[$key] === null) {
                    continue;
                }
                $value = $data[$key];
                if (!is_numeric($value) || (float) $value < $min || (float) $value > $max) {
                    Response::error("Setting \"$key\" must be a number between $min and $max", 400);
                }
                $data[$key] = (string) (int) $value;
            }

            $booleanFields = ['enable_online_payment', 'enable_student_registrations', 'maintenance_mode'];
            foreach ($booleanFields as $bf) {
                if (array_key_exists($bf, $data) && $data[$bf] !== null) {
                    $data[$bf] = ($data[$bf] == 1 || $data[$bf] === '1' || $data[$bf] === true || $data[$bf] === 'true') ? '1' : '0';
                }
            }

            $stringFields = [
                'college_name', 'college_address', 'college_phone', 'college_email',
                'college_website', 'college_code', 'principal_name',
                'academic_year', 'current_semester_type', 'grading_system',
                'razorpay_key_id', 'currency_symbol', 'system_timezone', 'portal_notice_banner'
            ];
            foreach ($stringFields as $key) {
                if (array_key_exists($key, $data) && $data[$key] !== null) {
                    $data[$key] = trim((string) $data[$key]);
                    if (strlen($data[$key]) > 1000) {
                        Response::error("Setting \"$key\" exceeds maximum allowed length", 400);
                    }
                }
            }

            if (array_key_exists('college_email', $data) && $data['college_email'] !== ''
                && !filter_var($data['college_email'], FILTER_VALIDATE_EMAIL)) {
                Response::error('Setting "college_email" must be a valid email address', 400);
            }

            $stmt = $db->prepare(
                "INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
                 VALUES (?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
                                         updated_by = VALUES(updated_by),
                                         updated_at = NOW()"
            );

            $db->beginTransaction();
            try {
                foreach ($data as $key => $value) {
                    if (!is_string($key) || $key === '' || strlen($key) > 100) {
                        continue;
                    }
                    if (is_array($value)) {
                        Response::error("Setting \"$key\" must be a single value", 400);
                    }
                    $stmt->execute([$key, (string) $value, $userId]);
                }
                $db->commit();
            } catch (Throwable $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                throw $e;
            }

            try {
                $auditStmt = $db->prepare(
                    "INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, created_at)
                     VALUES (?, 'UPDATE_SETTINGS', 'system_settings', NULL, ?, NOW())"
                );
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $auditStmt->execute([$userId, $ip]);
            } catch (Throwable $ignore) {}

            Response::success(null, 'System settings updated successfully');
        } catch (Throwable $e) {
            error_log('AdminController::updateSettings Error: ' . $e->getMessage());
            Response::serverError('Failed to update settings');
        }
    }

    public function getBackups() {
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare(
                "SELECT b.*, u.email AS created_by_email, u.role AS created_by_role
                 FROM system_backups b
                 LEFT JOIN users u ON b.created_by = u.id
                 ORDER BY b.created_at DESC
                 LIMIT 50"
            );
            $stmt->execute();
            $backups = $stmt->fetchAll();
            Response::success($backups ?: []);
        } catch (Throwable $e) {
            error_log('AdminController::getBackups Error: ' . $e->getMessage());
            Response::serverError('Failed to load backups');
        }
    }

    public function getSystemInfo() {
        try {
            $db = Database::getInstance()->getConnection();
            $serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? 'PHP CLI / Built-in Server';
            $phpVersion = PHP_VERSION;
            $dbVersion = 'MySQL 8.0';
            try {
                $dbVersion = $db->query('SELECT VERSION()')->fetchColumn();
            } catch (Throwable $e) {}

            // Counts
            $studentCount = 0;
            $facultyCount = 0;
            $userCount = 0;
            $deptCount = 0;
            $courseCount = 0;
            $auditCount = 0;
            $backupCount = 0;

            try { $studentCount = (int) $db->query('SELECT COUNT(*) FROM students')->fetchColumn(); } catch (Throwable $e) {}
            try { $facultyCount = (int) $db->query('SELECT COUNT(*) FROM faculty')->fetchColumn(); } catch (Throwable $e) {}
            try { $userCount = (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn(); } catch (Throwable $e) {}
            try { $deptCount = (int) $db->query('SELECT COUNT(*) FROM departments')->fetchColumn(); } catch (Throwable $e) {}
            try { $courseCount = (int) $db->query('SELECT COUNT(*) FROM courses')->fetchColumn(); } catch (Throwable $e) {}
            try { $auditCount = (int) $db->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn(); } catch (Throwable $e) {}
            try { $backupCount = (int) $db->query('SELECT COUNT(*) FROM system_backups')->fetchColumn(); } catch (Throwable $e) {}

            $info = [
                'php_version' => $phpVersion,
                'mysql_version' => $dbVersion,
                'server_software' => $serverSoftware,
                'os' => PHP_OS,
                'server_time' => date('Y-m-d H:i:s T'),
                'timezone' => date_default_timezone_get(),
                'upload_max_filesize' => ini_get('upload_max_filesize') ?: '64M',
                'post_max_size' => ini_get('post_max_size') ?: '64M',
                'memory_limit' => ini_get('memory_limit') ?: '256M',
                'max_execution_time' => (ini_get('max_execution_time') ?: '30') . 's',
                'counts' => [
                    'students' => $studentCount,
                    'faculty' => $facultyCount,
                    'users' => $userCount,
                    'departments' => $deptCount,
                    'courses' => $courseCount,
                    'audit_logs' => $auditCount,
                    'backups' => $backupCount,
                ]
            ];
            Response::success($info);
        } catch (Throwable $e) {
            error_log('AdminController::getSystemInfo Error: ' . $e->getMessage());
            Response::serverError('Failed to load system info');
        }
    }

    private function getStudentsByDepartment() {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT d.id AS department_id, d.name AS department, d.code AS code,
                    COUNT(s.id) AS count
             FROM departments d
             LEFT JOIN students s ON d.id = s.department_id
             GROUP BY d.id, d.name, d.code
             ORDER BY d.name"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
