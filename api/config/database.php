<?php
/**
 * ADIT College Management System - Database Connection
 */

class Database {
    private static $instance = null;
    protected $connection;

    private function __construct() {
        $host     = defined('DB_HOST') ? DB_HOST : '127.0.0.1';
        $port     = defined('DB_PORT') ? DB_PORT : '3306';
        $dbname   = defined('DB_NAME') ? DB_NAME : 'adit_cms';
        $username = defined('DB_USER') ? DB_USER : 'root';
        $password = defined('DB_PASS') ? DB_PASS : '';

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
        ];

        // 1. First attempt: Use configured host with explicit port (TCP/IP)
        $targetHost = ($host === 'localhost') ? '127.0.0.1' : $host;
        $dsn = "mysql:host={$targetHost};port={$port};dbname={$dbname};charset=utf8mb4";

        try {
            $this->connection = new PDO($dsn, $username, $password, $options);
            $this->connection->exec("SET NAMES utf8mb4");
            return;
        } catch (PDOException $e1) {
            error_log("ADIT CMS: Primary DB connection attempt ({$targetHost}:{$port}) failed: " . $e1->getMessage());

            // 2. Fallbacks for hosting environments (InfinityFree / ByetHost DNS or socket variations)
            $fallbacks = [];
            if (strpos($host, 'infinityfree.com') !== false) {
                // InfinityFree often maps sqlXXX.infinityfree.com or sqlXXX.epizy.com / sqlXXX.byetcluster.com
                $fallbacks[] = "mysql:host=" . str_replace('infinityfree.com', 'epizy.com', $host) . ";port={$port};dbname={$dbname};charset=utf8mb4";
                $fallbacks[] = "mysql:host=" . str_replace('infinityfree.com', 'byetcluster.com', $host) . ";port={$port};dbname={$dbname};charset=utf8mb4";
            }
            if ($targetHost !== $host) {
                $fallbacks[] = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
            }

            // Common Linux/Unix MySQL socket paths
            $commonSockets = [
                '/tmp/mysql.sock',
                '/var/run/mysqld/mysqld.sock',
                '/var/lib/mysql/mysql.sock',
                '/opt/lampp/var/mysql/mysql.sock'
            ];
            foreach ($commonSockets as $socket) {
                if (file_exists($socket)) {
                    $fallbacks[] = "mysql:unix_socket={$socket};dbname={$dbname};charset=utf8mb4";
                }
            }

            $lastError = $e1;
            foreach ($fallbacks as $fbDsn) {
                try {
                    $this->connection = new PDO($fbDsn, $username, $password, $options);
                    $this->connection->exec("SET NAMES utf8mb4");
                    return;
                } catch (PDOException $e2) {
                    $lastError = $e2;
                }
            }

            // If all connection attempts failed, provide clear diagnostic message
            $msg = $lastError->getMessage();
            if (strpos($msg, '2002') !== false || strpos($msg, 'No such file or directory') !== false) {
                $msg .= " (Hint: Database server could not be reached at '{$host}'. Please verify DB_HOST, DB_NAME, DB_USER, DB_PASS in api/config/config.php)";
            }
            throw new PDOException($msg, (int)$lastError->getCode());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    /**
     * Run a closure inside a transaction, rolling back on any throwable.
     */
    public function transaction(callable $fn) {
        $conn = $this->connection;
        $conn->beginTransaction();
        try {
            $result = $fn($conn);
            $conn->commit();
            return $result;
        } catch (Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    protected function __clone() {}

    public function __wakeup() {
        throw new \Exception("Cannot unserialize singleton");
    }
}
