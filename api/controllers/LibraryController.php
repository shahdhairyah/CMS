<?php
/**
 * ADIT CMS - Library Controller
 * Secure, Role-Guarded API Controller for Library Operations
 */

class LibraryController {
    
    private $libraryModel;

    public function __construct() {
        $this->libraryModel = new Library();
    }

    // ==========================================
    // 1. CATALOG BROWSING & MANAGEMENT
    // ==========================================

    public function getBooks() {
        try {
            $search   = !empty($_GET['search']) ? trim($_GET['search']) : null;
            $category = !empty($_GET['category']) ? trim($_GET['category']) : null;
            $status   = !empty($_GET['status']) ? trim($_GET['status']) : null;
            $page     = max(1, (int) ($_GET['page'] ?? 1));
            $pageSize = min(100, max(1, (int) ($_GET['page_size'] ?? 20)));

            $result = $this->libraryModel->getBooks($search, $category, $status, $page, $pageSize);
            Response::success($result);
        } catch (Exception $e) {
            error_log("LibraryController::getBooks Error: " . $e->getMessage());
            Response::serverError('Failed to load books catalog');
        }
    }

    public function getCategories() {
        try {
            $categories = $this->libraryModel->getCategories();
            Response::success($categories);
        } catch (Exception $e) {
            error_log("LibraryController::getCategories Error: " . $e->getMessage());
            Response::serverError('Failed to load book categories');
        }
    }

    public function getBookById($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid book ID', 400);
            }

            $book = $this->libraryModel->getBookById($id);
            if (!$book) {
                Response::notFound('Book not found in library catalog');
            }

            Response::success($book);
        } catch (Exception $e) {
            error_log("LibraryController::getBookById Error: " . $e->getMessage());
            Response::serverError('Failed to load book details');
        }
    }

    public function addBook() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'title' => 'required|max:255',
                'author' => 'required|max:255',
                'total_copies' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $id = $this->libraryModel->addBook($data);
            if (!$id) {
                Response::serverError('Failed to catalog book');
            }

            Response::success(['id' => $id], 'Book added to catalog successfully', 201);
        } catch (Exception $e) {
            error_log("LibraryController::addBook Error: " . $e->getMessage());
            Response::serverError('Failed to add book');
        }
    }

    public function updateBook($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid book ID', 400);
            }

            $data = Validation::getJsonInput();
            $book = $this->libraryModel->getBookById($id);
            if (!$book) {
                Response::notFound('Book not found');
            }

            $success = $this->libraryModel->updateBook($id, $data);
            if (!$success) {
                Response::error('Failed to update book. Please verify total copies is not below currently issued count.', 400);
            }

            Response::success(['id' => $id], 'Book updated successfully');
        } catch (Exception $e) {
            error_log("LibraryController::updateBook Error: " . $e->getMessage());
            Response::serverError('Failed to update book');
        }
    }

    public function deleteBook($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid book ID', 400);
            }

            $deleted = $this->libraryModel->deleteBook($id);
            if (!$deleted) {
                Response::error('Cannot delete book while copies are currently issued to students', 400);
            }

            Response::success(null, 'Book removed from catalog');
        } catch (Exception $e) {
            error_log("LibraryController::deleteBook Error: " . $e->getMessage());
            Response::serverError('Failed to delete book');
        }
    }

    // ==========================================
    // 2. ISSUE & RETURN CIRCULATION
    // ==========================================

    public function issueBook() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'book_id' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $bookId = Validation::id($data['book_id']);
            if ($bookId === null) {
                Response::error('Invalid book ID', 400);
            }

            // Accept student by Database ID, Roll Number, Email, or Name
            $studentModel = new Student();
            $student = null;

            if (!empty($data['student_id'])) {
                $student = $studentModel->findById(Validation::id($data['student_id']));
            }
            
            if (!$student && !empty($data['student_identifier'])) {
                $student = $studentModel->findByAnyIdentifier($data['student_identifier']);
            } elseif (!$student && !empty($data['student_id'])) {
                $student = $studentModel->findByAnyIdentifier((string)$data['student_id']);
            }

            if (!$student) {
                Response::notFound('Student not found. Please verify the Name, Email, or Roll Number.');
            }

            $studentId = (int)$student['id'];

            // Verify book existence and stock
            $book = $this->libraryModel->getBookById($bookId);
            if (!$book) {
                Response::notFound('Book record not found');
            }
            if ((int) $book['available_copies'] <= 0) {
                Response::error('All copies of this title are currently on loan', 400);
            }

            $result = $this->libraryModel->issueBook([
                'book_id' => $bookId,
                'student_id' => $studentId,
                'duration_days' => $data['duration_days'] ?? 14
            ]);

            if (!$result['success']) {
                Response::error($result['message'], 400);
            }

            $studentName = trim($student['first_name'] . ' ' . $student['last_name']);
            Response::success([
                'issue_id' => $result['issue_id'],
                'student_name' => $studentName,
                'roll_number' => $student['roll_number']
            ], "Book successfully issued to {$studentName} ({$student['roll_number']})", 201);
        } catch (Exception $e) {
            error_log("LibraryController::issueBook Error: " . $e->getMessage());
            Response::serverError('Failed to process book checkout');
        }
    }

    public function returnBook() {
        try {
            $data = Validation::getJsonInput();

            $rules = ['issue_id' => 'required|numeric'];
            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $issueId = Validation::id($data['issue_id']);
            if ($issueId === null) {
                Response::error('Invalid loan record ID', 400);
            }

            $result = $this->libraryModel->returnBook($issueId);
            if (!$result['success']) {
                Response::error($result['message'], 400);
            }

            Response::success($result, $result['message']);
        } catch (Exception $e) {
            error_log("LibraryController::returnBook Error: " . $e->getMessage());
            Response::serverError('Failed to process book return');
        }
    }

    public function payFine() {
        try {
            $data = Validation::getJsonInput();
            $issueId = Validation::id($data['issue_id'] ?? null);
            if ($issueId === null) {
                Response::error('Invalid loan issue ID', 400);
            }

            $updated = $this->libraryModel->payFine($issueId);
            if (!$updated) {
                Response::error('No outstanding fine found for this record', 400);
            }

            Response::success(null, 'Fine payment recorded successfully');
        } catch (Exception $e) {
            error_log("LibraryController::payFine Error: " . $e->getMessage());
            Response::serverError('Failed to record fine payment');
        }
    }

    public function getAllIssues() {
        try {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'search' => $_GET['search'] ?? null,
            ];
            $page = max(1, (int) ($_GET['page'] ?? 1));
            $pageSize = min(100, max(1, (int) ($_GET['page_size'] ?? 20)));

            $result = $this->libraryModel->getAllIssues($filters, $page, $pageSize);
            Response::success($result);
        } catch (Exception $e) {
            error_log("LibraryController::getAllIssues Error: " . $e->getMessage());
            Response::serverError('Failed to load issue records');
        }
    }

    public function getStatistics() {
        try {
            $stats = $this->libraryModel->getStatistics();
            Response::success($stats);
        } catch (Exception $e) {
            error_log("LibraryController::getStatistics Error: " . $e->getMessage());
            Response::serverError('Failed to load library statistics');
        }
    }

    // ==========================================
    // 3. STUDENT SELF-SERVICE LOANS & FINES
    // ==========================================

    public function getMyLoans() {
        try {
            $userId = AuthMiddleware::getUserId();
            $student = (new Student())->findByUserId($userId);
            if (!$student) {
                Response::notFound('Student profile not found');
            }

            $data = $this->libraryModel->getStudentLoans($student['id']);
            Response::success($data);
        } catch (Exception $e) {
            error_log("LibraryController::getMyLoans Error: " . $e->getMessage());
            Response::serverError('Failed to load student loan records');
        }
    }

    public function getHistory($studentId) {
        try {
            $studentId = Validation::id($studentId);
            if ($studentId === null) {
                Response::error('Invalid student ID', 400);
            }
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('Access denied for student library records');
            }

            $data = $this->libraryModel->getStudentLoans($studentId);
            Response::success($data['recent'] ?? []);
        } catch (Exception $e) {
            error_log("LibraryController::getHistory Error: " . $e->getMessage());
            Response::serverError('Failed to load history');
        }
    }

    public function getFines($studentId) {
        try {
            $studentId = Validation::id($studentId);
            if ($studentId === null) {
                Response::error('Invalid student ID', 400);
            }
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('Access denied for student fines');
            }

            $data = $this->libraryModel->getStudentLoans($studentId);
            Response::success($data['fines'] ?? []);
        } catch (Exception $e) {
            error_log("LibraryController::getFines Error: " . $e->getMessage());
            Response::serverError('Failed to load fines');
        }
    }
}
