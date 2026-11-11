<?php
/**
 * ADIT CMS - Fee Controller
 */

class FeeController {
    
    private $feeModel;

    public function __construct() {
        $this->feeModel = new Fee();
    }

    public function getStructure() {
        try {
            $courseId  = Validation::id($_GET['course_id'] ?? null);
            $semester  = Validation::id($_GET['semester'] ?? null);
            $studentId = Validation::id($_GET['student_id'] ?? null);

            if ($studentId !== null) {
                if (!RoleMiddleware::canAccessStudent($studentId)) {
                    Response::forbidden('You do not have permission to view that student\'s fee structure');
                }
            }

            if ($studentId !== null && $courseId === null) {
                $student = (new Student())->findById($studentId);
                if ($student) {
                    $semester = $student['semester'] ?? null;
                    $departmentId = $student['department_id'] ?? null;
                    if ($departmentId) {
                        $db = Database::getInstance()->getConnection();
                        $stmt = $db->prepare("SELECT id FROM courses WHERE department_id = ? LIMIT 1");
                        $stmt->execute([$departmentId]);
                        $course = $stmt->fetch();
                        if ($course) {
                            $courseId = $course['id'];
                        }
                    }
                }
            }

            $structure = $this->feeModel->getStructure($courseId, $semester);
            Response::success($structure);
        } catch (Exception $e) {
            error_log("FeeController::getStructure Error: " . $e->getMessage());
            Response::serverError('Failed to load fee structure');
        }
    }

    public function createStructure() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'course_id' => 'required|numeric',
                'semester' => 'required|numeric',
                'fee_type' => 'required|max:100',
                'amount' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // An HOD may only define fees for courses in their own department.
            $course = (new Course())->findById(Validation::id($data['course_id']));
            if (!$course) {
                Response::error('Unknown course', 400);
            }
            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($course['department_id'])) {
                Response::forbidden('That course belongs to another department');
            }

            $id = $this->feeModel->createStructure($data);
            
            if (!$id) {
                Response::serverError('Failed to create fee structure');
            }

            Response::success(['id' => $id], 'Fee structure created successfully', 201);
        } catch (Exception $e) {
            error_log("FeeController::createStructure Error: " . $e->getMessage());
            Response::serverError('Failed to create fee structure');
        }
    }

    public function createOrder() {
        try {
            $data = Validation::getJsonInput();
            $userId = AuthMiddleware::getUserId();

            $studentModel = new Student();
            $student = $studentModel->findByUserId($userId);

            if (!$student) {
                Response::notFound('Student profile not found');
            }

            // `amount` is deliberately NOT accepted from the client. It used to
            // be taken straight from the request body, so a student could open
            // a Rs.1 order against a Rs.50,000 fee structure; verifyPayment
            // then marked it completed and getPendingDues() credited Rs.1
            // against the full amount. The price is now read from the DB.
            $rules = [
                'fee_structure_id' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $structureId = Validation::id($data['fee_structure_id']);
            if ($structureId === null) {
                Response::error('Invalid fee structure id', 400);
            }

            $structure = $this->feeModel->findStructureById($structureId);
            if (!$structure) {
                Response::notFound('Fee structure not found');
            }

            // The structure must be one this student is actually billed for,
            // otherwise a student could pay a single rupee towards a foreign
            // course's fee and have it recorded as settled.
            $mine = array_map('intval', array_column(
                $this->feeModel->getStructuresForStudent($student['id']),
                'id'
            ));
            if (!in_array($structureId, $mine, true)) {
                Response::forbidden('That fee structure does not apply to you');
            }

            $amount   = (float) $structure['amount'];
            $orderId  = 'order_' . uniqid() . '_' . time();

            // Customer details for Cashfree
            $studentUser = (new User())->findById($student['user_id']);
            $customerPhone = !empty($student['phone']) ? preg_replace('/[^0-9]/', '', $student['phone']) : '9999999999';
            if (strlen($customerPhone) < 10) {
                $customerPhone = '9999999999';
            }
            $customerName = trim(($student['first_name'] ?? '') . ' ' . ($student['last_name'] ?? ''));
            if (empty($customerName)) {
                $customerName = 'Student';
            }
            $customerEmail = !empty($studentUser['email']) ? $studentUser['email'] : 'student@adit.ac.in';

            // Return URL must be HTTPS if passed, or omit it if localhost to avoid Cashfree 400 rejection
            $frontendUrl = defined('FRONTEND_URL') ? FRONTEND_URL : '';
            $orderMeta = [];
            if (!empty($frontendUrl) && strpos($frontendUrl, 'https://') === 0) {
                $orderMeta['return_url'] = rtrim($frontendUrl, '/') . '/student/fees?cf_order_id={order_id}';
            }

            $cashfreeOrderData = [
                'order_id'       => $orderId,
                'order_amount'   => round($amount, 2),
                'order_currency' => 'INR',
                'customer_details' => [
                    'customer_id'    => 'student_' . $student['id'],
                    'customer_name'  => $customerName,
                    'customer_email' => $customerEmail,
                    'customer_phone' => $customerPhone
                ],
                'order_note' => 'ADIT CMS Fee Payment - ' . ($structure['fee_type'] ?? 'Tuition Fee')
            ];

            if (!empty($orderMeta)) {
                $cashfreeOrderData['order_meta'] = $orderMeta;
            }

            $cfResult = CashfreeHelper::createOrder($cashfreeOrderData);
            if (!$cfResult || !isset($cfResult['payment_session_id'])) {
                $errDetail = is_array($cfResult) && isset($cfResult['error']) ? ': ' . $cfResult['error'] : '';
                error_log("CashfreeHelper::createOrder failed for student " . $student['id'] . $errDetail);
                Response::serverError('Failed to initiate payment gateway session' . $errDetail);
            }

            $paymentSessionId = $cfResult['payment_session_id'];

            $paymentId = $this->feeModel->createPayment([
                'student_id'        => $student['id'],
                'fee_structure_id'  => $structureId,
                'amount'            => $amount,
                'payment_method'    => 'cashfree',
                'razorpay_order_id' => $orderId,
                'status'            => 'pending'
            ]);

            $cfEnv = defined('CASHFREE_ENV') ? strtolower(CASHFREE_ENV) : 'production';

            Response::success([
                'order_id'           => $orderId,
                'payment_session_id' => $paymentSessionId,
                'amount'             => round($amount, 2),
                'currency'           => 'INR',
                'environment'        => $cfEnv,
                'payment_id'         => $paymentId,
                'fee_type'           => $structure['fee_type'],
            ]);
        } catch (Exception $e) {
            error_log("FeeController::createOrder Error: " . $e->getMessage());
            Response::serverError('Failed to create payment order');
        }
    }

    public function verifyPayment() {
        try {
            $data = Validation::getJsonInput();

            $orderId = $data['order_id'] ?? $data['cf_order_id'] ?? $data['razorpay_order_id'] ?? null;
            if (!$orderId) {
                Response::validationError(['order_id' => 'Order ID is required']);
            }

            // Verify order status directly with Cashfree
            $cfOrder = CashfreeHelper::getOrder($orderId);
            if (!$cfOrder) {
                Response::error('Failed to verify payment with payment gateway', 400);
            }

            $orderStatus = strtoupper($cfOrder['order_status'] ?? '');
            $cfPayments = CashfreeHelper::getOrderPayments($orderId);
            $cfPaymentId = null;

            if (is_array($cfPayments) && !empty($cfPayments)) {
                foreach ($cfPayments as $p) {
                    if (isset($p['payment_status']) && strtoupper($p['payment_status']) === 'SUCCESS') {
                        $cfPaymentId = (string) ($p['cf_payment_id'] ?? '');
                        break;
                    }
                }
                if (!$cfPaymentId && isset($cfPayments[0]['cf_payment_id'])) {
                    $cfPaymentId = (string) $cfPayments[0]['cf_payment_id'];
                }
            }

            if (!$cfPaymentId) {
                $cfPaymentId = (string) ($cfOrder['cf_order_id'] ?? $orderId);
            }

            if ($orderStatus !== 'PAID') {
                Response::error('Payment status is not completed. Current status: ' . ($orderStatus ?: 'PENDING'), 400);
            }

            $userId = AuthMiddleware::getUserId();
            $updated = $this->feeModel->updatePaymentStatus(
                $orderId,
                'completed',
                $cfPaymentId,
                $userId
            );

            if (!$updated) {
                Response::error('Failed to record completed payment', 400);
            }

            Response::success([
                'order_id'      => $orderId,
                'cf_payment_id' => $cfPaymentId,
                'status'        => 'completed'
            ], 'Payment verified successfully');
        } catch (Exception $e) {
            error_log("FeeController::verifyPayment Error: " . $e->getMessage());
            Response::serverError('Payment verification failed');
        }
    }

    public function getPayments($studentId = null) {
        try {
            $role = AuthMiddleware::getUserRole();

            if ($role === 'student' || $studentId === null || $studentId === '') {
                // A student may only ever see their own record. The route has
                // no role list, so the id was previously read verbatim from the
                // URL and any account could enumerate every student's payments,
                // dues, Razorpay ids and timestamps.
                $userId  = AuthMiddleware::getUserId();
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::notFound('Student profile not found');
                }
                $studentId = $student['id'];
            } else {
                $studentId = Validation::id($studentId);
                if ($studentId === null) {
                    Response::error('Invalid student id', 400);
                }
                if (!RoleMiddleware::canAccessStudent($studentId)) {
                    Response::forbidden('You do not have permission to view these payments');
                }
            }

            $payments   = $this->feeModel->getStudentPayments($studentId);
            $pendingDues = $this->feeModel->getPendingDues($studentId);

            Response::success([
                'student_id'    => (int) $studentId,
                'payments'      => $payments,
                'pending_dues'  => $pendingDues
            ]);
        } catch (Exception $e) {
            error_log("FeeController::getPayments Error: " . $e->getMessage());
            Response::serverError('Failed to load payments');
        }
    }

    public function getReceipt($paymentId) {
        try {
            // Same IDOR as getPayments(): the route allows any logged-in user
            // and the payment id came straight off the URL.
            $paymentId = Validation::id($paymentId);
            if ($paymentId === null) {
                Response::error('Invalid payment id', 400);
            }
            $this->assertCanReadPayment($paymentId);

            $receipt = $this->feeModel->getReceipt($paymentId);
            
            if (!$receipt) {
                Response::notFound('Receipt not found');
            }

            Response::success($receipt);
        } catch (Exception $e) {
            error_log("FeeController::getReceipt Error: " . $e->getMessage());
            Response::serverError('Failed to load receipt');
        }
    }

    /**
     * Shared ownership / department check for a fee payment.
     *
     * student  -> only their own payments
     * faculty  -> no access to fee records
     * librarian-> no access to fee records
     * hod      -> payments of students in the department they head
     * admin    -> anything
     */
    private function assertCanReadPayment($paymentId): array {
        $owner = $this->feeModel->getPaymentOwner($paymentId);
        if ($owner === null) {
            Response::notFound('Receipt not found');
        }

        $role   = AuthMiddleware::getUserRole();
        $userId = AuthMiddleware::getUserId();

        if ($role === 'student') {
            if ((int) $owner['user_id'] !== (int) $userId) {
                Response::forbidden('You do not have permission to view this receipt');
            }
        } elseif ($role === 'hod') {
            if (!RoleMiddleware::canAccessDepartment($owner['department_id'])) {
                Response::forbidden('That receipt belongs to another department');
            }
        } elseif ($role !== 'admin') {
            Response::forbidden('You do not have permission to view fee records');
        }

        return $owner;
    }

    public function downloadReceipt($paymentId) {
        try {
            $paymentId = Validation::id($paymentId);
            if ($paymentId === null) {
                http_response_code(400);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Invalid payment id';
                exit;
            }

            // This route used to be registered with auth=false, so anyone who
            // guessed /fees/receipt/1, /fees/receipt/2, ... could read every
            // student's fee receipt (name, roll number, amount, txn id).
            $role   = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            $owner = $this->feeModel->getPaymentOwner($paymentId);
            if ($owner === null) {
                http_response_code(404);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Receipt not found';
                exit;
            }

            if ($role === 'student') {
                if ((int) $owner['user_id'] !== (int) $userId) {
                    http_response_code(403);
                    header('Content-Type: text/plain; charset=utf-8');
                    echo 'You do not have permission to view this receipt';
                    exit;
                }
            } elseif ($role === 'faculty' || $role === 'librarian') {
                http_response_code(403);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'You do not have permission to view fee receipts';
                exit;
            } elseif ($role === 'hod') {
                if (!RoleMiddleware::canAccessDepartment($owner['department_id'])) {
                    http_response_code(403);
                    header('Content-Type: text/plain; charset=utf-8');
                    echo 'This receipt belongs to another department';
                    exit;
                }
            } elseif ($role !== 'admin') {
                http_response_code(403);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Not permitted';
                exit;
            }

            $receipt = $this->feeModel->getReceipt($paymentId);

            if (!$receipt) {
                http_response_code(404);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Receipt not found';
                exit;
            }

            $e = static fn($v) => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $paidAt = $receipt['paid_at'] ?? $receipt['created_at'] ?? date('Y-m-d H:i:s');
            $paidTimestamp = strtotime($paidAt);
            $paidDate = date('d-m-Y', $paidTimestamp);
            $paidTime = date('h:i:s A', $paidTimestamp);
            $studentName = $e(trim(($receipt['first_name'] ?? '') . ' ' . ($receipt['last_name'] ?? '')));
            $email = $e($receipt['email'] ?? '-');
            $phone = $e(!empty($receipt['phone']) ? ('+91-' . $receipt['phone']) : '-');
            $rollNumber = $e($receipt['roll_number'] ?? '-');
            $feeType = $e($receipt['fee_type'] ?? 'Tuition Fees');
            $year = date('Y', $paidTimestamp);
            $nextYearShort = date('y', strtotime('+1 year', $paidTimestamp));
            $paymentTemplate = "ADIT B.Tech {$year}-{$nextYearShort} TUTION/COLLEGE FEE";
            $program = !empty($receipt['course_name']) ? strtoupper($receipt['course_name']) : (!empty($receipt['department_name']) ? ('BACHELOR OF TECHNOLOGY (' . strtoupper($receipt['department_name']) . ')') : 'BACHELOR OF TECHNOLOGY (COMPUTER ENGINEERING)');
            $college = 'A D PATEL INSTITUTE OF TECHNOLOGY (ADIT)';
            $semester = !empty($receipt['semester']) ? ('SEMESTER ' . $receipt['semester']) : 'SEMESTER 3';
            $amountNum = (float)($receipt['amount'] ?? 0);
            $amountFormatted = number_format($amountNum, 1, '.', '') . ' /-';
            
            // Amount in words
            $numToWords = function($num) {
                $num = (int)$num;
                if ($num === 0) return 'Zero';
                $a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
                $b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
                $inWords = function($val) use (&$inWords, $a, $b) {
                    if ($val < 20) return $a[$val];
                    $digit = $val % 10;
                    return $b[(int)($val / 10)] . ($digit ? '-' . $a[$digit] : '');
                };
                $words = '';
                $crore = (int)($num / 10000000); $rem = $num % 10000000;
                $lakh = (int)($rem / 100000); $rem = $rem % 100000;
                $thousand = (int)($rem / 1000); $rem = $rem % 1000;
                $hundred = (int)($rem / 100); $rem = $rem % 100;
                if ($crore) $words .= $inWords($crore) . ' crore ';
                if ($lakh) $words .= $inWords($lakh) . ' lakh ';
                if ($thousand) $words .= $inWords($thousand) . ' thousand ';
                if ($hundred) $words .= $inWords($hundred) . ' hundred ';
                if ($rem) {
                    if ($words) $words .= 'and ';
                    $words .= $inWords($rem);
                }
                return ucfirst(trim($words));
            };
            $amountWords = $numToWords($amountNum);
            
            $rawMethod = strtoupper($receipt['payment_method'] ?? 'Online');
            $paymentMode = $rawMethod === 'CHEQUE' ? 'Cheque' : ($rawMethod === 'CASHFREE' ? 'Online (Cashfree)' : ucfirst($receipt['payment_method'] ?? 'Online'));
            $txnId = $receipt['receipt_no'] ?? $receipt['razorpay_payment_id'] ?? ('REC-' . $receipt['id']);
            $narration = "Amount Received Via {$paymentMode} Ref ({$txnId}) dt {$paidDate} for Application No/ ER No:{$rollNumber}";

            header('Content-Type: text/html; charset=utf-8');
            echo "<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>Receipt - {$rollNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #e2e8f0; padding: 30px 10px; color: #1e293b; }
  .receipt-page { max-width: 780px; margin: 0 auto; background: #ffffff; padding: 40px 48px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 4px; }
  .header-logo { text-align: center; margin-bottom: 12px; }
  .header-logo img { width: 120px; height: auto; }
  .receipt-title { text-align: center; color: #0284c7; font-size: 20px; font-weight: 700; margin-bottom: 12px; }
  .blue-divider { border-top: 2px solid #0284c7; margin-bottom: 18px; }
  table.receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  table.receipt-table td { border: 1px solid #cbd5e1; padding: 9px 14px; vertical-align: top; }
  table.receipt-table td.label-col { font-weight: 700; color: #1e293b; width: 32%; background-color: #fafafa; }
  table.receipt-table td.value-col { color: #334155; }
  .footer-notes { text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; margin-top: 10px; }
  .univ-title { font-weight: 700; color: #334155; font-size: 13px; margin-top: 14px; }
  .print-bar { max-width: 780px; margin: 16px auto 0; text-align: right; }
  .btn-print { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-print:hover { background: #0369a1; }
  @media print {
    body { background: #fff; padding: 0; }
    .receipt-page { box-shadow: none; padding: 20px; }
    .print-bar { display: none; }
  }
</style>
</head>
<body>
<div class='print-bar'>
  <button class='btn-print' onclick='window.print()'>Print / Download PDF</button>
</div>
<div class='receipt-page'>
  <div class='header-logo'>
    <img src='/adit.png' alt='ADIT Logo'>
  </div>
  <div class='receipt-title'>Payment Receipt for {$feeType}</div>
  <div class='blue-divider'></div>
  <table class='receipt-table'>
    <tr><td class='label-col'>Paid Date:</td><td class='value-col'>{$paidDate}</td></tr>
    <tr><td class='label-col'>Paid Time:</td><td class='value-col'>{$paidTime}</td></tr>
    <tr><td class='label-col'>Student Name:</td><td class='value-col'>{$studentName}</td></tr>
    <tr><td class='label-col'>Email:</td><td class='value-col'>{$email}</td></tr>
    <tr><td class='label-col'>Mobile Number:</td><td class='value-col'>{$phone}</td></tr>
    <tr><td class='label-col'>Application / ER No:</td><td class='value-col'>{$rollNumber}</td></tr>
    <tr><td class='label-col'>Payment Type:</td><td class='value-col'>{$feeType}</td></tr>
    <tr><td class='label-col'>Payment Template:</td><td class='value-col'>{$paymentTemplate}</td></tr>
    <tr><td class='label-col'>Program:</td><td class='value-col'>{$program}</td></tr>
    <tr><td class='label-col'>College:</td><td class='value-col'>{$college}</td></tr>
    <tr><td class='label-col'>Program Term:</td><td class='value-col'>{$semester}</td></tr>
    <tr><td class='label-col'>Amount Paid:</td><td class='value-col'>{$amountFormatted}</td></tr>
    <tr><td class='label-col'>Amount in Words:</td><td class='value-col'>{$amountWords}</td></tr>
    <tr><td class='label-col'>Payment Mode:</td><td class='value-col'>{$paymentMode}</td></tr>
    <tr><td class='label-col'>Narration:</td><td class='value-col'>{$narration}</td></tr>
  </table>
  <div class='footer-notes'>
    <div>Generated on {$paidDate} {$paidTime}</div>
    <div>All disputes subject to <strong>Anand, Gujarat</strong> jurisdiction only.</div>
    <div>Fees/Charges are subject to refund as per applicable policies. E. and O.E.</div>
    <div class='univ-title'>The Charutar Vidya Mandal (CVM) University</div>
    <div>Shastri Maidan Walkway, Mota Bazaar,</div>
    <div>Vallabh Vidyanagar, Anand, Gujarat 388120</div>
  </div>
</div>
</body>
</html>";
            exit;
        } catch (Exception $e) {
            error_log("FeeController::downloadReceipt Error: " . $e->getMessage());
            http_response_code(500);
            echo 'Failed to generate receipt';
            exit;
        }
    }

    public function getAllPayments() {
        try {
            // Raw ?page / ?page_size were used here, so ?page_size=1000000
            // dumped the whole fee_payments table and ?page_size=-1 produced
            // LIMIT -1 (a SQL error, hidden by the catch below).
            [$page, $pageSize] = Validation::pagination();
            $filters = [
                'department_id' => Validation::id($_GET['department_id'] ?? null),
                'status'        => in_array($_GET['status'] ?? '', ['pending', 'completed', 'failed'], true)
                                    ? $_GET['status'] : null,
                'from_date'     => self::dateOrNull($_GET['from_date'] ?? null),
                'to_date'       => self::dateOrNull($_GET['to_date'] ?? null),
            ];
            $result = $this->feeModel->getAllPaymentsAdmin($page, $pageSize, $filters);
            Response::success($result);
        } catch (Exception $e) {
            error_log("FeeController::getAllPayments Error: " . $e->getMessage());
            Response::serverError('Failed to load payments');
        }
    }

    public function getAllStructures() {
        try {
            $semester = Validation::id($_GET['semester'] ?? null);
            $courseId = Validation::id($_GET['course_id'] ?? null);

            // An HOD was previously able to read any course's fee schedule by
            // passing ?course_id=N. Non-admins are pinned to their own
            // department's courses instead.
            if (AuthMiddleware::getUserRole() !== 'admin') {
                $deptId = RoleMiddleware::scopeDepartmentId();
                if ($deptId === null || $deptId < 1) {
                    Response::forbidden('No department scope for this account');
                }
                $own = (new Course())->getAll($deptId);
                $ids = array_map('intval', array_column($own, 'id'));
                if ($courseId !== null && !in_array($courseId, $ids, true)) {
                    Response::forbidden('That course belongs to another department');
                }
                $courseId = $courseId ?? ($ids[0] ?? null);
            }

            $structures = $this->feeModel->getAllStructures($courseId, $semester);
            Response::success($structures);
        } catch (Exception $e) {
            error_log("FeeController::getAllStructures Error: " . $e->getMessage());
            Response::serverError('Failed to load fee structures');
        }
    }

    public function updateStructure($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid fee structure id', 400);
            }

            $existing = $this->feeModel->findStructureById($id);
            if (!$existing) {
                Response::notFound('Fee structure not found');
            }

            // Fee::updateStructure's allowlist includes course_id, so without
            // this an HOD could rewrite another department's schedule (or
            // re-point a row at their own course_id) and change what a different
            // department's students are billed.
            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($existing['department_id'])) {
                Response::forbidden('That fee structure belongs to another department');
            }

            $data = Validation::getJsonInput();
            $errors = Validation::validate($data, [
                'course_id' => 'required|numeric',
                'semester'  => 'required|numeric',
                'fee_type'  => 'required|max:100',
                'amount'    => 'required|numeric',
            ]);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // A client-supplied course_id may not cross departments either.
            $targetCourse = (new Course())->findById(Validation::id($data['course_id']));
            if (!$targetCourse) {
                Response::error('Unknown course', 400);
            }            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($targetCourse['department_id'])) {
                Response::forbidden('That course belongs to another department');
            }

            $result = $this->feeModel->updateStructure($id, $data);
            if (!$result) {
                Response::serverError('Failed to update fee structure');
            }
            Response::success(null, 'Fee structure updated successfully');
        } catch (Exception $e) {
            error_log("FeeController::updateStructure Error: " . $e->getMessage());
            Response::serverError('Failed to update fee structure');
        }
    }

    public function deleteStructure($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid fee structure id', 400);
            }
            if (!$this->feeModel->findStructureById($id)) {
                Response::notFound('Fee structure not found');
            }
            $result = $this->feeModel->deleteStructure($id);
            if (!$result) {
                Response::serverError('Failed to delete fee structure');
            }
            Response::success(null, 'Fee structure deleted successfully');
        } catch (Exception $e) {
            error_log("FeeController::deleteStructure Error: " . $e->getMessage());
            Response::serverError('Failed to delete fee structure');
        }
    }

    public function getFeeReport() {
        try {
            // An HOD must not be able to pull the fee report for a department
            // they do not head.
            $departmentId = AuthMiddleware::getUserRole() === 'admin'
                ? Validation::id($_GET['department_id'] ?? null)
                : RoleMiddleware::scopeDepartmentId();
            if ($departmentId !== null && $departmentId < 1) {
                Response::forbidden('No department scope for this account');
            }

            $filters = [
                'department_id' => $departmentId,
                'from_date'     => self::dateOrNull($_GET['from_date'] ?? null),
                'to_date'       => self::dateOrNull($_GET['to_date'] ?? null),
            ];
            $report = $this->feeModel->getFeeReport($filters);
            Response::success($report);
        } catch (Exception $e) {
            error_log("FeeController::getFeeReport Error: " . $e->getMessage());
            Response::serverError('Failed to load fee report');
        }
    }

    /** Accept a YYYY-MM-DD query parameter, or null. */
    private static function dateOrNull($value) {
        if (!is_string($value) || $value === '') {
            return null;
        }
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }
}
