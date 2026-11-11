<?php
/**
 * ADIT CMS - Library Model
 * Comprehensive Book Catalog, Issue/Return, Automatic Fine Calculation & Statistics
 */

class Library extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // ==========================================
    // 1. BOOK CATALOG MANAGEMENT
    // ==========================================

    public function getBooks($search = null, $category = null, $status = null, $page = 1, $pageSize = 20) {
        $where = ['1=1'];
        $params = [];

        if (!empty($search)) {
            $where[] = "(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.publisher LIKE ?)";
            $s = "%{$search}%";
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
        }
        if (!empty($category) && $category !== 'all') {
            $where[] = 'b.category = ?';
            $params[] = $category;
        }
        if (!empty($status)) {
            if ($status === 'available') {
                $where[] = 'b.available_copies > 0';
            } elseif ($status === 'issued') {
                $where[] = 'b.available_copies < b.total_copies';
            } elseif ($status === 'out_of_stock') {
                $where[] = 'b.available_copies = 0';
            }
        }

        $whereClause = implode(' AND ', $where);

        // Count query
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM books b WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Paginated query
        $offset = ($page - 1) * $pageSize;
        $stmt = $this->db->prepare(
            "SELECT b.*, 
                    (b.total_copies - b.available_copies) as issued_copies,
                    CASE 
                        WHEN b.available_copies = 0 THEN 'out_of_stock'
                        WHEN b.available_copies < b.total_copies THEN 'partially_available'
                        ELSE 'available'
                    END as stock_status
             FROM books b 
             WHERE {$whereClause} 
             ORDER BY b.title ASC 
             LIMIT ? OFFSET ?"
        );
        $bindIdx = 1;
        foreach ($params as $param) {
            $stmt->bindValue($bindIdx++, $param);
        }
        $stmt->bindValue($bindIdx++, (int) $pageSize, PDO::PARAM_INT);
        $stmt->bindValue($bindIdx++, (int) $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'books' => $stmt->fetchAll(),
            'total' => $total,
            'page' => (int) $page,
            'page_size' => (int) $pageSize,
            'total_pages' => ceil($total / $pageSize)
        ];
    }

    public function getCategories() {
        $stmt = $this->db->prepare(
            "SELECT category, COUNT(*) as count 
             FROM books 
             WHERE category IS NOT NULL AND category != '' 
             GROUP BY category 
             ORDER BY category ASC"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getBookById($id) {
        $stmt = $this->db->prepare(
            "SELECT b.*, (b.total_copies - b.available_copies) as issued_copies 
             FROM books b 
             WHERE b.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function addBook($data) {
        $totalCopies = max(1, (int) ($data['total_copies'] ?? 1));
        $stmt = $this->db->prepare(
            "INSERT INTO books (title, author, isbn, publisher, category, total_copies, available_copies) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            trim($data['title']),
            trim($data['author']),
            !empty($data['isbn']) ? trim($data['isbn']) : null,
            !empty($data['publisher']) ? trim($data['publisher']) : null,
            !empty($data['category']) ? trim($data['category']) : null,
            $totalCopies,
            $totalCopies
        ]);
        return $this->db->lastInsertId();
    }

    public function updateBook($id, $data) {
        $book = $this->getBookById($id);
        if (!$book) return false;

        $fields = [];
        $params = [];
        
        foreach (['title', 'author', 'isbn', 'publisher', 'category'] as $key) {
            if (isset($data[$key])) {
                $fields[] = "{$key} = ?";
                $params[] = trim($data[$key]);
            }
        }

        // Adjust copies carefully without losing track of current issued count
        if (isset($data['total_copies'])) {
            $newTotal = max(1, (int) $data['total_copies']);
            $currentlyIssued = (int) $book['total_copies'] - (int) $book['available_copies'];
            if ($newTotal < $currentlyIssued) {
                // Cannot reduce total copies below currently issued count
                return false;
            }
            $newAvailable = $newTotal - $currentlyIssued;
            $fields[] = "total_copies = ?";
            $params[] = $newTotal;
            $fields[] = "available_copies = ?";
            $params[] = $newAvailable;
        }
        
        if (empty($fields)) return true;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE books SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function deleteBook($id) {
        // Only allow deleting if no active issues
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM book_issues WHERE book_id = ? AND status = 'issued'");
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() > 0) {
            return false;
        }

        $stmt = $this->db->prepare("DELETE FROM books WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // ==========================================
    // 2. ISSUE & RETURN MANAGEMENT
    // ==========================================

    public function issueBook($data) {
        $this->db->beginTransaction();
        try {
            $bookId = (int) $data['book_id'];
            $studentId = (int) $data['student_id'];
            $days = isset($data['duration_days']) ? max(1, (int) $data['duration_days']) : 14;

            // Check if book has available copy
            $stmt = $this->db->prepare("SELECT available_copies FROM books WHERE id = ? FOR UPDATE");
            $stmt->execute([$bookId]);
            $available = $stmt->fetchColumn();

            if ($available === false || (int) $available <= 0) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'No copies currently available for issue.'];
            }

            // Check if student already holds a copy of this book
            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM book_issues 
                 WHERE book_id = ? AND student_id = ? AND status = 'issued'"
            );
            $stmt->execute([$bookId, $studentId]);
            if ($stmt->fetchColumn() > 0) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'This student already holds an active copy of this book.'];
            }

            // Create issue record
            $stmt = $this->db->prepare(
                "INSERT INTO book_issues (book_id, student_id, issue_date, due_date, fine_amount, status) 
                 VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 0.00, 'issued')"
            );
            $stmt->execute([$bookId, $studentId, $days]);
            $issueId = $this->db->lastInsertId();

            // Decrement available copies
            $stmt = $this->db->prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?");
            $stmt->execute([$bookId]);

            $this->db->commit();
            return ['success' => true, 'issue_id' => $issueId];
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Library::issueBook Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Database error while issuing book.'];
        }
    }

    public function returnBook($issueId) {
        $this->db->beginTransaction();
        try {
            // Get issue details
            $stmt = $this->db->prepare(
                "SELECT bi.*, b.title 
                 FROM book_issues bi 
                 JOIN books b ON bi.book_id = b.id 
                 WHERE bi.id = ? FOR UPDATE"
            );
            $stmt->execute([$issueId]);
            $issue = $stmt->fetch();

            if (!$issue) {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'Loan record not found.'];
            }

            if ($issue['status'] === 'returned' || $issue['status'] === 'fine_paid') {
                $this->db->rollBack();
                return ['success' => false, 'message' => 'This book has already been marked as returned.'];
            }

            // Calculate daily fine (₹5 per day overdue)
            $fine = 0.00;
            $dueTimestamp = strtotime($issue['due_date']);
            $todayTimestamp = strtotime(date('Y-m-d'));
            if ($todayTimestamp > $dueTimestamp) {
                $daysOverdue = floor(($todayTimestamp - $dueTimestamp) / 86400);
                $fine = round($daysOverdue * 5.0, 2);
            }

            // Update issue record
            $newStatus = ($fine > 0) ? 'returned' : 'returned';
            $stmt = $this->db->prepare(
                "UPDATE book_issues 
                 SET return_date = CURDATE(), fine_amount = ?, status = ? 
                 WHERE id = ?"
            );
            $stmt->execute([$fine, $newStatus, $issueId]);

            // Increment available copies
            $stmt = $this->db->prepare("UPDATE books SET available_copies = available_copies + 1 WHERE id = ?");
            $stmt->execute([$issue['book_id']]);

            $this->db->commit();
            return [
                'success' => true,
                'fine' => $fine,
                'days_overdue' => isset($daysOverdue) ? $daysOverdue : 0,
                'message' => $fine > 0 
                    ? "Book returned. Overdue fine calculated: ₹{$fine}" 
                    : "Book returned on time with no overdue fines."
            ];
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Library::returnBook Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Database error while returning book.'];
        }
    }

    public function payFine($issueId) {
        $stmt = $this->db->prepare(
            "UPDATE book_issues SET status = 'fine_paid' WHERE id = ? AND fine_amount > 0"
        );
        return $stmt->execute([$issueId]);
    }

    // ==========================================
    // 3. STUDENT & SYSTEM QUERIES
    // ==========================================

    public function getStudentLoans($studentId) {
        // Active issues with dynamic fine computation
        $stmt = $this->db->prepare(
            "SELECT bi.*, b.title, b.author, b.isbn, b.category,
                    DATEDIFF(CURDATE(), bi.due_date) as days_overdue,
                    CASE 
                        WHEN bi.due_date < CURDATE() THEN 1 
                        ELSE 0 
                    END as is_overdue,
                    CASE 
                        WHEN bi.due_date < CURDATE() THEN GREATEST(0, DATEDIFF(CURDATE(), bi.due_date) * 5)
                        ELSE 0
                    END as computed_fine
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             WHERE bi.student_id = ? AND bi.status = 'issued' 
             ORDER BY bi.due_date ASC"
        );
        $stmt->execute([$studentId]);
        $active = $stmt->fetchAll();

        // Recent history (returned / fines)
        $stmt = $this->db->prepare(
            "SELECT bi.*, b.title, b.author, b.isbn, b.category 
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             WHERE bi.student_id = ? AND bi.status != 'issued' 
             ORDER BY bi.return_date DESC, bi.id DESC 
             LIMIT 20"
        );
        $stmt->execute([$studentId]);
        $recent = $stmt->fetchAll();

        // Pending fines
        $stmt = $this->db->prepare(
            "SELECT bi.*, b.title, b.author 
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             WHERE bi.student_id = ? AND bi.fine_amount > 0 AND bi.status = 'returned'
             ORDER BY bi.return_date DESC"
        );
        $stmt->execute([$studentId]);
        $fines = $stmt->fetchAll();

        // Total unpaid fines (including dynamic overdue fines on active books)
        $activeFinesTotal = array_reduce($active, function($s, $item) {
            return $s + (float) ($item['computed_fine'] ?? 0);
        }, 0.0);

        $returnedUnpaidTotal = array_reduce($fines, function($s, $item) {
            return $s + (float) ($item['fine_amount'] ?? 0);
        }, 0.0);

        return [
            'active' => $active,
            'recent' => $recent,
            'fines' => $fines,
            'total_fines' => round($activeFinesTotal + $returnedUnpaidTotal, 2)
        ];
    }

    public function getAllIssues($filters = [], $page = 1, $pageSize = 20) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            if ($filters['status'] === 'overdue') {
                $where[] = "bi.status = 'issued' AND bi.due_date < CURDATE()";
            } else {
                $where[] = 'bi.status = ?';
                $params[] = $filters['status'];
            }
        }

        if (!empty($filters['search'])) {
            $where[] = "(b.title LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.roll_number LIKE ?)";
            $s = "%{$filters['search']}%";
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
        }

        $whereClause = implode(' AND ', $where);

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) 
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             JOIN students s ON bi.student_id = s.id 
             WHERE {$whereClause}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $stmt = $this->db->prepare(
            "SELECT bi.*, b.title as book_title, b.author as book_author, b.isbn,
                    s.first_name, s.last_name, s.roll_number, s.phone,
                    DATEDIFF(CURDATE(), bi.due_date) as days_overdue,
                    CASE 
                        WHEN bi.status = 'issued' AND bi.due_date < CURDATE() 
                        THEN GREATEST(0, DATEDIFF(CURDATE(), bi.due_date) * 5)
                        ELSE bi.fine_amount 
                    END as effective_fine
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             JOIN students s ON bi.student_id = s.id 
             WHERE {$whereClause} 
             ORDER BY bi.id DESC 
             LIMIT ? OFFSET ?"
        );

        $bindIdx = 1;
        foreach ($params as $param) {
            $stmt->bindValue($bindIdx++, $param);
        }
        $stmt->bindValue($bindIdx++, (int) $pageSize, PDO::PARAM_INT);
        $stmt->bindValue($bindIdx++, (int) $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'issues' => $stmt->fetchAll(),
            'total' => $total,
            'page' => (int) $page,
            'page_size' => (int) $pageSize,
            'total_pages' => ceil($total / $pageSize)
        ];
    }

    public function getStatistics() {
        $stmt = $this->db->prepare(
            "SELECT 
                (SELECT COUNT(*) FROM books) as total_titles,
                (SELECT COALESCE(SUM(total_copies), 0) FROM books) as total_inventory,
                (SELECT COALESCE(SUM(total_copies - available_copies), 0) FROM books) as currently_issued,
                (SELECT COALESCE(SUM(available_copies), 0) FROM books) as available_books,
                (SELECT COUNT(*) FROM book_issues WHERE status = 'issued') as active_loans,
                (SELECT COUNT(*) FROM book_issues WHERE status = 'issued' AND due_date < CURDATE()) as overdue_loans,
                (SELECT COALESCE(SUM(fine_amount), 0) FROM book_issues WHERE fine_amount > 0 AND status = 'returned') as pending_fines,
                (SELECT COALESCE(SUM(fine_amount), 0) FROM book_issues WHERE status = 'fine_paid') as collected_fines"
        );
        $stmt->execute();
        return $stmt->fetch();
    }
}
