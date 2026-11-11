<?php
/**
 * ADIT CMS - Student Model
 */

class Student extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findByUserId($userId) {
        $stmt = $this->db->prepare(
            "SELECT s.*, d.name as department_name, d.code as department_code 
             FROM students s 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE s.user_id = ?"
        );
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT s.*, d.name as department_name, d.code as department_code 
             FROM students s 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE s.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function findByRollNumber($rollNumber) {
        $stmt = $this->db->prepare(
            "SELECT s.*, u.email, d.name as department_name, d.code as department_code 
             FROM students s 
             LEFT JOIN users u ON s.user_id = u.id 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE s.roll_number = ?"
        );
        $stmt->execute([$rollNumber]);
        return $stmt->fetch();
    }

    public function findByEmail($email) {
        $stmt = $this->db->prepare(
            "SELECT s.*, u.email, d.name as department_name, d.code as department_code 
             FROM students s 
             JOIN users u ON s.user_id = u.id 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE u.email = ?"
        );
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public function findByAnyIdentifier($query) {
        $query = trim($query);
        if (empty($query)) return null;

        // 1. Try by exact numeric student ID
        if (is_numeric($query)) {
            $s = $this->findById((int)$query);
            if ($s) return $s;
        }

        // 2. Try by exact Roll Number
        $s = $this->findByRollNumber($query);
        if ($s) return $s;

        // 3. Try by exact Email
        $s = $this->findByEmail($query);
        if ($s) return $s;

        // 4. Try by partial / full name match or email match
        $stmt = $this->db->prepare(
            "SELECT s.*, u.email, d.name as department_name, d.code as department_code 
             FROM students s 
             LEFT JOIN users u ON s.user_id = u.id 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE s.roll_number = ? 
                OR u.email = ? 
                OR CONCAT(s.first_name, ' ', s.last_name) = ?
                OR s.first_name = ?
                OR s.last_name = ?
             LIMIT 1"
        );
        $stmt->execute([$query, $query, $query, $query, $query]);
        $res = $stmt->fetch();
        if ($res) return $res;

        // 5. Fallback LIKE match
        $stmt = $this->db->prepare(
            "SELECT s.*, u.email, d.name as department_name, d.code as department_code 
             FROM students s 
             LEFT JOIN users u ON s.user_id = u.id 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE s.roll_number LIKE ? 
                OR u.email LIKE ? 
                OR CONCAT(s.first_name, ' ', s.last_name) LIKE ?
             LIMIT 1"
        );
        $like = "%{$query}%";
        $stmt->execute([$like, $like, $like]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO students (user_id, roll_number, first_name, last_name, dob, gender, phone, address, department_id, semester, batch, admission_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['user_id'], $data['roll_number'], $data['first_name'], $data['last_name'],
            $data['dob'] ?? null, $data['gender'] ?? null, $data['phone'] ?? null,
            $data['address'] ?? null, $data['department_id'] ?? null,
            $data['semester'] ?? 1, $data['batch'] ?? null, $data['admission_date'] ?? date('Y-m-d')
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['first_name', 'last_name', 'dob', 'gender', 'phone', 'address', 'photo', 'semester', 'batch'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE students SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function getAll($page = 1, $pageSize = 20, $filters = []) {
        $offset = Validation::offset((int) $page, (int) $pageSize);
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['department_id'])) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }
        if (!empty($filters['semester'])) {
            $where[] = 's.semester = ?';
            $params[] = $filters['semester'];
        }
        if (!empty($filters['batch'])) {
            $where[] = 's.batch = ?';
            $params[] = $filters['batch'];
        }
        if (!empty($filters['id'])) {
            $where[] = 's.id = ?';
            $params[] = $filters['id'];
        }
        if (!empty($filters['user_id'])) {
            $where[] = 's.user_id = ?';
            $params[] = $filters['user_id'];
        }
        if (!empty($filters['search'])) {
            $where[] = "(s.first_name LIKE ? OR s.last_name LIKE ? OR s.roll_number LIKE ? OR u.email LIKE ? OR CONCAT(s.first_name, ' ', s.last_name) LIKE ?)";
            $search = "%{$filters['search']}%";
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        $whereClause = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM students s LEFT JOIN users u ON s.user_id = u.id WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        $params[] = $pageSize;
        $params[] = $offset;

        $stmt = $this->db->prepare(
            "SELECT s.*, u.email, d.name as department_name, d.code as department_code 
             FROM students s 
             LEFT JOIN users u ON s.user_id = u.id 
             LEFT JOIN departments d ON s.department_id = d.id 
             WHERE {$whereClause} 
             ORDER BY s.roll_number ASC 
             LIMIT ? OFFSET ?"
        );
        $stmt->execute($params);
        
        return ['data' => $stmt->fetchAll(), 'total' => $total];
    }

    public function count($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['department_id'])) {
            $where[] = 'department_id = ?';
            $params[] = $filters['department_id'];
        }
        if (!empty($filters['semester'])) {
            $where[] = 'semester = ?';
            $params[] = $filters['semester'];
        }

        $whereClause = implode(' AND ', $where);
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM students WHERE {$whereClause}");
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM students WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Subjects a student is enrolled in.
     *
     * students has no course_id column: a student is placed by
     * (department_id, semester), and that pair maps to semesters via the
     * course that belongs to the student's department. The previous query
     * joined on st.course_id, which raised Unknown column.
     */
    public function getSubjects($studentId) {
        $stmt = $this->db->prepare(
            "SELECT sub.*, s.semester_number
             FROM students st
             INNER JOIN courses c    ON c.department_id = st.department_id
             INNER JOIN semesters s ON s.course_id = c.id AND s.semester_number = st.semester
             INNER JOIN subjects sub ON sub.semester_id = s.id
             WHERE st.id = ?
             ORDER BY sub.name"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }
}
