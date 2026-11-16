<?php
/**
 * ADIT CMS - Exam Model
 */

class Exam extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // Internal Marks
    public function enterInternalMarks($data) {
        // entered_by is a FK to faculty(id) and an admin has no faculty row, so
        // entered_by is omitted for them; entered_by_user records the actor for
        // every role.
        $stmt = $this->db->prepare(
            "INSERT INTO unit_tests (student_id, subject_id, test_number, marks_obtained, max_marks, entered_by, entered_by_user)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained),
                                     max_marks = VALUES(max_marks),
                                     entered_by = VALUES(entered_by),
                                     entered_by_user = VALUES(entered_by_user)"
        );
        $stmt->execute([
            $data['student_id'], $data['subject_id'],
            $data['test_number'], $data['marks_obtained'],
            $data['max_marks'] ?? 30,
            $data['entered_by'] ?? null,
            $data['entered_by_user'] ?? null
        ]);
        return true;
    }

    public function updateInternalMarks($id, $data) {
        $fields = [];
        $params = [];

        foreach ($data as $key => $value) {
            if (in_array($key, ['student_id', 'subject_id', 'test_number', 'marks_obtained', 'max_marks', 'entered_by', 'entered_by_user'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }

        if (empty($fields)) return false;

        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE unit_tests SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    /** One internal-marks row, or null. */
    public function getInternalMarkById($id) {
        $stmt = $this->db->prepare("SELECT * FROM unit_tests WHERE id = ? LIMIT 1");
        $stmt->execute([(int) $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function deleteInternalMarks($id) {
        $stmt = $this->db->prepare("DELETE FROM unit_tests WHERE id = ?");
        return $stmt->execute([(int) $id]);
    }

    public function getInternalMarks($studentId = null, $subjectId = null, $semesterId = null, $departmentId = null, $testNumber = null) {
        $where = ['1=1'];
        $params = [];

        if ($studentId) {
            $where[] = 'ut.student_id = ?';
            $params[] = (int) $studentId;
        }
        if ($subjectId) {
            $where[] = 'ut.subject_id = ?';
            $params[] = (int) $subjectId;
        }
        if ($semesterId) {
            $where[] = 's.semester_id = ?';
            $params[] = (int) $semesterId;
        }
        if ($departmentId) {
            $where[] = 's.department_id = ?';
            $params[] = (int) $departmentId;
        }
        if ($testNumber) {
            $where[] = 'ut.test_number = ?';
            $params[] = (int) $testNumber;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT ut.*, s.name as subject_name, s.code as subject_code, s.credits,
                    st.first_name, st.last_name, st.roll_number, st.semester as student_semester,
                    d.name as department_name, sem.semester_number
             FROM unit_tests ut 
             JOIN subjects s ON ut.subject_id = s.id 
             JOIN students st ON ut.student_id = st.id 
             LEFT JOIN departments d ON s.department_id = d.id
             LEFT JOIN semesters sem ON s.semester_id = sem.id
             WHERE {$whereClause} 
             ORDER BY st.roll_number, ut.test_number, s.code"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // External Marks
    public function enterExternalMarks($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO external_marks (student_id, subject_id, marks_obtained, max_marks, entered_by) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), max_marks = VALUES(max_marks), entered_by = VALUES(entered_by)"
        );
        $stmt->execute([
            $data['student_id'], $data['subject_id'],
            $data['marks_obtained'], $data['max_marks'] ?? 100,
            $data['entered_by']
        ]);
        return true;
    }

    public function updateExternalMarks($id, $data) {
        $fields = [];
        $params = [];
        $allowed = ['student_id', 'subject_id', 'marks_obtained', 'max_marks', 'entered_by'];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $data)) {
                $fields[] = "`$key` = ?";
                $params[] = $data[$key];
            }
        }
        if (empty($fields)) return false;
        $params[] = (int) $id;
        $stmt = $this->db->prepare("UPDATE external_marks SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function deleteExternalMarks($id) {
        $stmt = $this->db->prepare("DELETE FROM external_marks WHERE id = ?");
        return $stmt->execute([(int) $id]);
    }

    public function getExternalMarks($studentId = null, $subjectId = null, $semesterId = null, $departmentId = null) {
        $where = ['1=1'];
        $params = [];

        if ($studentId) {
            $where[] = 'em.student_id = ?';
            $params[] = (int) $studentId;
        }
        if ($subjectId) {
            $where[] = 'em.subject_id = ?';
            $params[] = (int) $subjectId;
        }
        if ($semesterId) {
            $where[] = 's.semester_id = ?';
            $params[] = (int) $semesterId;
        }
        if ($departmentId) {
            $where[] = 's.department_id = ?';
            $params[] = (int) $departmentId;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT em.*, s.name as subject_name, s.code as subject_code, s.credits,
                    st.first_name, st.last_name, st.roll_number, st.semester as student_semester,
                    d.name as department_name, sem.semester_number
             FROM external_marks em 
             JOIN subjects s ON em.subject_id = s.id 
             JOIN students st ON em.student_id = st.id
             LEFT JOIN departments d ON s.department_id = d.id
             LEFT JOIN semesters sem ON s.semester_id = sem.id
             WHERE {$whereClause}
             ORDER BY st.roll_number, s.code"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // Results
    public function generateResults($studentId, $semesterId) {
        $studentId = (int) $studentId;
        $semesterId = (int) $semesterId;

        $stmt = $this->db->prepare(
            "SELECT s.id, s.credits FROM subjects s WHERE s.semester_id = ?"
        );
        $stmt->execute([$semesterId]);
        $subjects = $stmt->fetchAll();

        $totalCredits = 0;
        $totalGradePoints = 0;
        $breakdown = [];

        foreach ($subjects as $subject) {
            $subjectId = (int) $subject['id'];
            $credits = (float) $subject['credits'];

            // Best-of internal assessment.
            //
            // The old code did MAX() plus a correlated "ORDER BY marks DESC
            // LIMIT 1 OFFSET 1" and then divided the sum by 2. With a single
            // unit test the second pick is NULL, so (best1 + NULL) / 2 halved
            // the score instead of using it.
            $stmt = $this->db->prepare(
                "SELECT marks_obtained, max_marks
                 FROM unit_tests
                 WHERE student_id = ? AND subject_id = ?
                 ORDER BY marks_obtained DESC, max_marks DESC
                 LIMIT 1"
            );
            $stmt->execute([$studentId, $subjectId]);
            $internal = $stmt->fetch();

            $stmt = $this->db->prepare(
                "SELECT marks_obtained, max_marks FROM external_marks
                 WHERE student_id = ? AND subject_id = ?"
            );
            $stmt->execute([$studentId, $subjectId]);
            $external = $stmt->fetch();

            // Credit still counts for a subject with no marks recorded yet,
            // otherwise a half-marked semester reports an inflated SGPA.
            $obtained = 0.0;
            $maximum  = 0.0;
            if ($internal) {
                $obtained += (float) $internal['marks_obtained'];
                $maximum  += (float) $internal['max_marks'];
            }
            if ($external) {
                $obtained += (float) $external['marks_obtained'];
                $maximum  += (float) $external['max_marks'];
            }

            $percentage = $maximum > 0 ? ($obtained / $maximum) * 100 : 0.0;
            $gradePoint = $maximum > 0 ? $this->calculateGradePoint($percentage) : 0;

            $totalCredits    += $credits;
            $totalGradePoints += $gradePoint * $credits;

            $breakdown[] = [
                'subject_id' => $subjectId,
                'obtained'   => round($obtained, 2),
                'maximum'    => round($maximum, 2),
                'percentage' => round($percentage, 2),
                'grade_point'=> $gradePoint,
                'credits'    => $credits,
            ];
        }

        $sgpa = $totalCredits > 0 ? round($totalGradePoints / $totalCredits, 2) : 0;

        // Cumulative grade points from every earlier semester.
        //
        // The old line was:
        //     $prevCredits = $prevResult['cgpa'] * 20;  // assuming 20/sem
        //     $prevGradePoints = $prevResult['cgpa'] * $prevCredits;
        // which invented a credit count and then re-derived grade points from
        // the CGPA, so any real course load produced nonsense. The results
        // table now stores real per-semester totals, so sum them.
        $stmt = $this->db->prepare(
            "SELECT COALESCE(SUM(total_credits), 0) AS credits,
                    COALESCE(SUM(total_grade_points), 0) AS grade_points
             FROM results
             WHERE student_id = ? AND semester_id < ?"
        );
        $stmt->execute([$studentId, $semesterId]);
        $prev = $stmt->fetch() ?: ['credits' => 0, 'grade_points' => 0];

        $cumulativeCredits    = (float) $prev['credits'] + $totalCredits;
        $cumulativeGradePoints = (float) $prev['grade_points'] + $totalGradePoints;

        $cgpa = $cumulativeCredits > 0
            ? round($cumulativeGradePoints / $cumulativeCredits, 2)
            : 0;

        $status = $sgpa >= 4.0 ? 'pass' : 'fail';

        $stmt = $this->db->prepare(
            "INSERT INTO results
                (student_id, semester_id, sgpa, cgpa, total_credits, total_grade_points, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                sgpa = VALUES(sgpa),
                cgpa = VALUES(cgpa),
                total_credits = VALUES(total_credits),
                total_grade_points = VALUES(total_grade_points),
                status = VALUES(status)"
        );
        $stmt->execute([
            $studentId, $semesterId, $sgpa, $cgpa,
            $totalCredits, $totalGradePoints, $status,
        ]);

        return [
            'sgpa' => $sgpa,
            'cgpa' => $cgpa,
            'total_credits' => round($totalCredits, 2),
            'total_grade_points' => round($totalGradePoints, 2),
            'status' => $status,
            'breakdown' => $breakdown,
        ];
    }

    private function calculateGradePoint($percentage) {
        if ($percentage >= 90) return 10;  // O
        if ($percentage >= 80) return 9;   // A+
        if ($percentage >= 70) return 8;   // A
        if ($percentage >= 60) return 7;   // B+
        if ($percentage >= 50) return 6;   // B
        if ($percentage >= 40) return 5;   // C
        return 0;                           // F
    }

    public function getResults($studentId = null, $semesterId = null, $departmentId = null, $status = null) {
        $where = ['1=1'];
        $params = [];

        if ($studentId) {
            $where[] = 'r.student_id = ?';
            $params[] = (int) $studentId;
        }
        if ($semesterId) {
            $where[] = 'r.semester_id = ?';
            $params[] = (int) $semesterId;
        }
        if ($departmentId) {
            $where[] = 'st.department_id = ?';
            $params[] = (int) $departmentId;
        }
        if ($status) {
            $where[] = 'r.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT r.*, sem.semester_number, c.name as course_name,
                    st.first_name, st.last_name, st.roll_number, st.batch,
                    d.name as department_name
             FROM results r 
             JOIN semesters sem ON r.semester_id = sem.id 
             JOIN courses c ON sem.course_id = c.id 
             JOIN students st ON r.student_id = st.id 
             LEFT JOIN departments d ON st.department_id = d.id
             WHERE {$whereClause} 
             ORDER BY sem.semester_number, st.roll_number"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getGradeCardDetails($studentId, $semesterId = null) {
        $studentId = (int) $studentId;
        $stmt = $this->db->prepare(
            "SELECT st.*, d.name as department_name, u.email
             FROM students st
             LEFT JOIN departments d ON st.department_id = d.id
             LEFT JOIN users u ON st.user_id = u.id
             WHERE st.id = ? LIMIT 1"
        );
        $stmt->execute([$studentId]);
        $student = $stmt->fetch();
        if (!$student) return null;

        if (!$semesterId) {
            // Pick latest semester result or student's semester
            $stmt = $this->db->prepare("SELECT semester_id FROM results WHERE student_id = ? ORDER BY id DESC LIMIT 1");
            $stmt->execute([$studentId]);
            $latestRes = $stmt->fetch();
            if ($latestRes && !empty($latestRes['semester_id'])) {
                $semesterId = (int) $latestRes['semester_id'];
            } else {
                // Find a semester matching student's current semester number
                $semNum = (int) ($student['semester'] ?? 1);
                $stmt = $this->db->prepare(
                    "SELECT sem.id FROM semesters sem
                     JOIN courses c ON sem.course_id = c.id
                     WHERE c.department_id = ? AND sem.semester_number = ? LIMIT 1"
                );
                $stmt->execute([(int) $student['department_id'], $semNum]);
                $foundSem = $stmt->fetch();
                $semesterId = $foundSem ? (int) $foundSem['id'] : 1;
            }
        }
        $semesterId = (int) $semesterId;

        // Get semester information
        $stmt = $this->db->prepare(
            "SELECT sem.*, c.name as course_name, c.code as course_code
             FROM semesters sem
             JOIN courses c ON sem.course_id = c.id
             WHERE sem.id = ? LIMIT 1"
        );
        $stmt->execute([$semesterId]);
        $semester = $stmt->fetch() ?: [
            'id' => $semesterId,
            'semester_number' => $student['semester'] ?? 1,
            'course_name' => 'B.Tech Engineering'
        ];

        // Ensure results exist or generate them
        $stmt = $this->db->prepare("SELECT * FROM results WHERE student_id = ? AND semester_id = ? LIMIT 1");
        $stmt->execute([$studentId, $semesterId]);
        $result = $stmt->fetch();
        if (!$result) {
            $this->generateResults($studentId, $semesterId);
            $stmt->execute([$studentId, $semesterId]);
            $result = $stmt->fetch();
        }

        // Fetch subjects for this semester (or department matching)
        $stmt = $this->db->prepare(
            "SELECT s.* FROM subjects s 
             WHERE s.semester_id = ? AND (s.department_id = ? OR s.department_id IS NULL)
             ORDER BY s.code"
        );
        $stmt->execute([$semesterId, (int) $student['department_id']]);
        $subjects = $stmt->fetchAll();

        if (empty($subjects)) {
            // Fallback: all subjects for this semester
            $stmt = $this->db->prepare("SELECT s.* FROM subjects s WHERE s.semester_id = ? ORDER BY s.code");
            $stmt->execute([$semesterId]);
            $subjects = $stmt->fetchAll();
        }

        $subjectRows = [];
        $totalCreditsAttempted = 0;
        $totalCreditsEarned = 0;
        $totalGradePoints = 0;

        foreach ($subjects as $sub) {
            $subId = (int) $sub['id'];
            $credits = (float) ($sub['credits'] ?? 3);
            $totalCreditsAttempted += $credits;

            // Unit tests (internal)
            $stmt = $this->db->prepare(
                "SELECT test_number, marks_obtained, max_marks FROM unit_tests
                 WHERE student_id = ? AND subject_id = ? ORDER BY test_number"
            );
            $stmt->execute([$studentId, $subId]);
            $tests = $stmt->fetchAll();

            $internalObtained = 0.0;
            $internalMax = 0.0;
            if (count($tests) >= 2) {
                $sorted = array_column($tests, 'marks_obtained');
                rsort($sorted);
                $internalObtained = (float) $sorted[0] + (float) $sorted[1];
                $internalMax = ((float) ($tests[0]['max_marks'] ?? 30)) + ((float) ($tests[1]['max_marks'] ?? 30));
            } elseif (count($tests) === 1) {
                $internalObtained = (float) $tests[0]['marks_obtained'];
                $internalMax = (float) ($tests[0]['max_marks'] ?? 30);
            }

            // External marks
            $stmt = $this->db->prepare(
                "SELECT marks_obtained, max_marks FROM external_marks
                 WHERE student_id = ? AND subject_id = ? LIMIT 1"
            );
            $stmt->execute([$studentId, $subId]);
            $ext = $stmt->fetch();
            $externalObtained = $ext ? (float) $ext['marks_obtained'] : 0.0;
            $externalMax = $ext ? (float) ($ext['max_marks'] ?? 100) : 100.0;

            $totalObtained = $internalObtained + $externalObtained;
            $totalMax = ($internalMax > 0 ? $internalMax : 30.0) + ($externalMax > 0 ? $externalMax : 100.0);
            $percentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 1) : 0.0;

            $grade = 'F';
            $gp = 0;
            if ($percentage >= 90) { $grade = 'O'; $gp = 10; }
            elseif ($percentage >= 80) { $grade = 'A+'; $gp = 9; }
            elseif ($percentage >= 70) { $grade = 'A'; $gp = 8; }
            elseif ($percentage >= 60) { $grade = 'B+'; $gp = 7; }
            elseif ($percentage >= 50) { $grade = 'B'; $gp = 6; }
            elseif ($percentage >= 40) { $grade = 'C'; $gp = 5; }

            $creditsEarned = ($gp > 0) ? $credits : 0;
            $totalCreditsEarned += $creditsEarned;
            $totalGradePoints += ($gp * $credits);

            $subjectRows[] = [
                'subject_id' => $subId,
                'name' => $sub['name'],
                'code' => $sub['code'],
                'credits' => $credits,
                'type' => $sub['type'] ?? 'theory',
                'internal_obtained' => $internalObtained,
                'internal_max' => $internalMax > 0 ? $internalMax : 30,
                'external_obtained' => $externalObtained,
                'external_max' => $externalMax > 0 ? $externalMax : 100,
                'total_obtained' => round($totalObtained, 2),
                'total_max' => round($totalMax, 2),
                'percentage' => $percentage,
                'grade' => $grade,
                'grade_point' => $gp,
                'credits_earned' => $creditsEarned,
                'tests' => $tests
            ];
        }

        $calculatedSgpa = $totalCreditsAttempted > 0 ? round($totalGradePoints / $totalCreditsAttempted, 2) : 0;
        $sgpa = $result ? (float) $result['sgpa'] : $calculatedSgpa;
        $cgpa = $result ? (float) $result['cgpa'] : $calculatedSgpa;
        $status = $result ? $result['status'] : ($sgpa >= 4.0 ? 'pass' : 'fail');

        return [
            'student' => [
                'id' => $student['id'],
                'first_name' => $student['first_name'],
                'last_name' => $student['last_name'],
                'roll_number' => $student['roll_number'],
                'batch' => $student['batch'] ?? '2024-2028',
                'department_name' => $student['department_name'] ?? 'Engineering',
                'semester' => $semester['semester_number'] ?? $student['semester'],
                'email' => $student['email'] ?? null,
                'phone' => $student['phone'] ?? null,
                'photo' => $student['photo'] ?? null,
            ],
            'semester' => [
                'id' => $semesterId,
                'semester_number' => $semester['semester_number'] ?? 1,
                'course_name' => $semester['course_name'] ?? 'B.Tech',
            ],
            'result' => [
                'id' => $result['id'] ?? null,
                'sgpa' => $sgpa,
                'cgpa' => $cgpa,
                'total_credits' => $totalCreditsAttempted,
                'earned_credits' => $totalCreditsEarned,
                'total_grade_points' => round($totalGradePoints, 2),
                'status' => $status,
                'published_at' => $result['published_at'] ?? null,
                'generated_at' => date('Y-m-d H:i:s')
            ],
            'subjects' => $subjectRows
        ];
    }

    public function getExamMetadata() {
        // Departments
        $stmt = $this->db->query("SELECT id, name, code FROM departments ORDER BY name");
        $departments = $stmt->fetchAll();

        // Semesters with course & department
        $stmt = $this->db->query(
            "SELECT sem.id, sem.semester_number, sem.course_id, c.name as course_name, c.department_id, d.name as department_name
             FROM semesters sem
             JOIN courses c ON sem.course_id = c.id
             LEFT JOIN departments d ON c.department_id = d.id
             ORDER BY sem.course_id, sem.semester_number"
        );
        $semesters = $stmt->fetchAll();

        // Subjects
        $stmt = $this->db->query(
            "SELECT s.id, s.name, s.code, s.semester_id, s.department_id, s.credits, s.type,
                    d.name as department_name, sem.semester_number
             FROM subjects s
             LEFT JOIN departments d ON s.department_id = d.id
             LEFT JOIN semesters sem ON s.semester_id = sem.id
             ORDER BY s.code"
        );
        $subjects = $stmt->fetchAll();

        // Students (id, roll_number, name, semester, department_id)
        $stmt = $this->db->query(
            "SELECT st.id, st.roll_number, st.first_name, st.last_name, st.semester, st.department_id,
                    d.name as department_name
             FROM students st
             LEFT JOIN departments d ON st.department_id = d.id
             ORDER BY st.roll_number ASC"
        );
        $students = $stmt->fetchAll();

        return [
            'departments' => $departments,
            'semesters' => $semesters,
            'subjects' => $subjects,
            'students' => $students
        ];
    }

    public function getPerformanceAnalytics($subjectId) {
        $stmt = $this->db->prepare(
            "SELECT test_number, 
                    ROUND(AVG(marks_obtained), 2) as average_marks,
                    MAX(marks_obtained) as highest_marks,
                    MIN(marks_obtained) as lowest_marks,
                    COUNT(*) as total_students
             FROM unit_tests 
             WHERE subject_id = ? 
             GROUP BY test_number 
             ORDER BY test_number"
        );
        $stmt->execute([$subjectId]);
        $testAverages = $stmt->fetchAll();

        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN marks_obtained >= 40 THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN marks_obtained < 40 THEN 1 ELSE 0 END) as failed
             FROM external_marks 
             WHERE subject_id = ?"
        );
        $stmt->execute([$subjectId]);
        $passFail = $stmt->fetch() ?: ['total' => 0, 'passed' => 0, 'failed' => 0];

        $stmt = $this->db->prepare(
            "SELECT 
                ROUND(AVG(marks_obtained), 2) as class_average,
                MAX(marks_obtained) as highest,
                MIN(marks_obtained) as lowest
             FROM unit_tests 
             WHERE subject_id = ?"
        );
        $stmt->execute([$subjectId]);
        $overall = $stmt->fetch() ?: ['class_average' => 0, 'highest' => 0, 'lowest' => 0];

        $stmt = $this->db->prepare(
            "SELECT ROUND(AVG(marks_obtained), 2) as external_average 
             FROM external_marks 
             WHERE subject_id = ?"
        );
        $stmt->execute([$subjectId]);
        $external = $stmt->fetch();

        return [
            'test_averages' => $testAverages,
            'pass_fail' => $passFail,
            'overall_internal' => $overall,
            'external_average' => $external ? $external['external_average'] : 0,
        ];
    }

    public function publishResults($semesterId) {
        $stmt = $this->db->prepare(
            "UPDATE results SET published_at = NOW() WHERE semester_id = ? AND published_at IS NULL"
        );
        $stmt->execute([$semesterId]);
        return $stmt->rowCount();
    }

    public function getClassPerformance($subjectId, $semesterId) {
        $stmt = $this->db->prepare(
            "SELECT 
                ut.student_id,
                ROUND(COALESCE(AVG(ut.marks_obtained), 0) + COALESCE(MAX(em.marks_obtained), 0), 1) as total_marks
             FROM unit_tests ut
             LEFT JOIN external_marks em ON ut.student_id = em.student_id AND ut.subject_id = em.subject_id
             WHERE ut.subject_id = ?
             GROUP BY ut.student_id"
        );
        $stmt->execute([$subjectId]);
        $rows = $stmt->fetchAll();

        if (empty($rows)) {
            return [
                'highest' => 0, 'lowest' => 0, 'average' => 0,
                'pass_percentage' => 0,
                'grade_distribution' => ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0],
                'total_students' => 0
            ];
        }

        $marks = array_map('floatval', array_column($rows, 'total_marks'));
        $totalStudents = count($marks);
        $highest = max($marks);
        $lowest = min($marks);
        $average = round(array_sum($marks) / $totalStudents, 1);

        $passCount = 0;
        $grades = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0];

        foreach ($marks as $mark) {
            $pct = ($mark / 130) * 100;
            if ($pct >= 80) { $grades['A']++; $passCount++; }
            elseif ($pct >= 60) { $grades['B']++; $passCount++; }
            elseif ($pct >= 40) { $grades['C']++; $passCount++; }
            elseif ($pct >= 20) { $grades['D']++; }
            else { $grades['F']++; }
        }

        return [
            'highest' => $highest,
            'lowest' => $lowest,
            'average' => $average,
            'pass_percentage' => round(($passCount / $totalStudents) * 100, 1),
            'grade_distribution' => $grades,
            'total_students' => $totalStudents
        ];
    }

    // Hall Ticket
    public function getHallTicket($studentId) {
        $stmt = $this->db->prepare(
            "SELECT ht.*, st.first_name, st.last_name, st.roll_number, st.photo,
                    c.name as course_name, sem.semester_number
             FROM hall_tickets ht 
             JOIN students st ON ht.student_id = st.id 
             JOIN semesters sem ON ht.semester_id = sem.id 
             JOIN courses c ON sem.course_id = c.id 
             WHERE ht.student_id = ?
             ORDER BY ht.generated_at DESC LIMIT 1"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetch();
    }

    public function generateHallTicket($studentId, $semesterId) {
        // Check eligibility
        $stmt = $this->db->prepare(
            "SELECT * FROM fee_payments WHERE student_id = ? AND status = 'completed'"
        );
        $stmt->execute([$studentId]);
        $hasFeesPaid = $stmt->rowCount() > 0;

        if (!$hasFeesPaid) {
            return ['eligible' => false, 'reason' => 'Pending fee payment'];
        }

        // Check attendance
        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) / COUNT(*) * 100 as attendance_pct
             FROM attendance WHERE student_id = ?"
        );
        $stmt->execute([$studentId]);
        $attendance = $stmt->fetch();

        if ($attendance && $attendance['attendance_pct'] < 75) {
            return ['eligible' => false, 'reason' => 'Attendance below 75%'];
        }

        // Generate hall ticket
        $hallTicketNumber = 'ADIT' . date('Y') . str_pad($studentId, 4, '0', STR_PAD_LEFT);
        
        $stmt = $this->db->prepare(
            "INSERT INTO hall_tickets (student_id, semester_id, hall_ticket_number, generated_at) 
             VALUES (?, ?, ?, NOW())"
        );
        $stmt->execute([$studentId, $semesterId, $hallTicketNumber]);

        return [
            'eligible' => true,
            'hall_ticket_number' => $hallTicketNumber,
            'student_id' => $studentId,
            'semester_id' => $semesterId
        ];
    }

    // =========================================================
    // EXAM SCHEDULES (CRUD & FILTERS)
    // =========================================================

    public function getSchedules($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['semester_id'])) {
            $where[] = 'es.semester_id = ?';
            $params[] = (int) $filters['semester_id'];
        }
        if (!empty($filters['exam_type'])) {
            $where[] = 'es.exam_type = ?';
            $params[] = $filters['exam_type'];
        }
        if (!empty($filters['subject_id'])) {
            $where[] = 'es.subject_id = ?';
            $params[] = (int) $filters['subject_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'es.status = ?';
            $params[] = $filters['status'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT es.*, 
                    sub.name as subject_name, sub.code as subject_code, sub.credits,
                    sem.semester_number, c.name as course_name, d.name as department_name
             FROM exam_schedules es
             JOIN subjects sub ON es.subject_id = sub.id
             JOIN semesters sem ON es.semester_id = sem.id
             JOIN courses c ON sem.course_id = c.id
             LEFT JOIN departments d ON c.department_id = d.id
             WHERE {$whereClause}
             ORDER BY es.exam_date ASC, es.start_time ASC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getScheduleById($id) {
        $stmt = $this->db->prepare(
            "SELECT es.*, 
                    sub.name as subject_name, sub.code as subject_code, sub.credits,
                    sem.semester_number, c.name as course_name, d.name as department_name
             FROM exam_schedules es
             JOIN subjects sub ON es.subject_id = sub.id
             JOIN semesters sem ON es.semester_id = sem.id
             JOIN courses c ON sem.course_id = c.id
             LEFT JOIN departments d ON c.department_id = d.id
             WHERE es.id = ?
             LIMIT 1"
        );
        $stmt->execute([(int) $id]);
        return $stmt->fetch() ?: null;
    }

    public function createSchedule($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO exam_schedules 
                (title, exam_type, semester_id, subject_id, exam_date, start_time, end_time, room_number, max_marks, passing_marks, instructions, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['title'],
            $data['exam_type'] ?? 'mid_sem',
            $data['semester_id'],
            $data['subject_id'],
            $data['exam_date'],
            $data['start_time'],
            $data['end_time'],
            $data['room_number'] ?? 'Main Exam Hall',
            $data['max_marks'] ?? 70.00,
            $data['passing_marks'] ?? 28.00,
            $data['instructions'] ?? null,
            $data['status'] ?? 'scheduled'
        ]);
        return $this->db->lastInsertId();
    }

    public function updateSchedule($id, $data) {
        $fields = [];
        $params = [];
        $allowed = ['title', 'exam_type', 'semester_id', 'subject_id', 'exam_date', 'start_time', 'end_time', 'room_number', 'max_marks', 'passing_marks', 'instructions', 'status'];

        foreach ($allowed as $key) {
            if (array_key_exists($key, $data)) {
                $fields[] = "`$key` = ?";
                $params[] = $data[$key];
            }
        }

        if (empty($fields)) return false;

        $params[] = (int) $id;
        $stmt = $this->db->prepare("UPDATE exam_schedules SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function deleteSchedule($id) {
        $stmt = $this->db->prepare("DELETE FROM exam_schedules WHERE id = ?");
        return $stmt->execute([(int) $id]);
    }

    // Comprehensive Stats for Admin Exam Control Center
    public function getExamStats() {
        $totalSchedules = 0;
        $upcomingSchedules = 0;
        $completedExams = 0;
        $totalUnitTests = 0;
        $totalExternalMarks = 0;
        $totalPublishedResults = 0;

        try {
            $stmt = $this->db->query("SELECT COUNT(*) FROM exam_schedules");
            $totalSchedules = (int) $stmt->fetchColumn();

            $stmt = $this->db->query("SELECT COUNT(*) FROM exam_schedules WHERE exam_date >= CURDATE() AND status != 'completed'");
            $upcomingSchedules = (int) $stmt->fetchColumn();

            $stmt = $this->db->query("SELECT COUNT(*) FROM exam_schedules WHERE status = 'completed' OR exam_date < CURDATE()");
            $completedExams = (int) $stmt->fetchColumn();
        } catch (Exception $e) {}

        try {
            $stmt = $this->db->query("SELECT COUNT(*) FROM unit_tests");
            $totalUnitTests = (int) $stmt->fetchColumn();

            $stmt = $this->db->query("SELECT COUNT(*) FROM external_marks");
            $totalExternalMarks = (int) $stmt->fetchColumn();

            $stmt = $this->db->query("SELECT COUNT(*) FROM results WHERE published_at IS NOT NULL");
            $totalPublishedResults = (int) $stmt->fetchColumn();
        } catch (Exception $e) {}

        return [
            'total_schedules' => $totalSchedules,
            'upcoming_exams' => $upcomingSchedules,
            'completed_exams' => $completedExams,
            'unit_tests_entered' => $totalUnitTests,
            'external_marks_entered' => $totalExternalMarks,
            'published_results' => $totalPublishedResults
        ];
    }
}
