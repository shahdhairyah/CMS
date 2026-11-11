<?php
// ---- Database ---------------------------------------------------------
define('DB_HOST', getenv('DB_HOST') ?: 'sql306.infinityfree.com');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'if0_41037297_adit');
define('DB_USER', getenv('DB_USER') ?: 'if0_41037297');
define('DB_PASS', getenv('DB_PASS') ?: 'QWZJ6jsdiOszKdA');

// ---- Auth -------------------------------------------------------------
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'adit-cms-super-secret-jwt-key-2026-secure-random-key-1234567890');
define('JWT_ISSUER', 'adit-cms');
define('JWT_EXPIRY', 60 * 60 * 24);             // 24 hours

// ---- Web / CORS -------------------------------------------------------
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'https://adit.shahdhairyah.in');
define('CORS_ORIGINS', [getenv('FRONTEND_URL') ?: 'https://adit.shahdhairyah.in', 'http://localhost:3000', 'http://localhost:5173']);
define('IS_PRODUCTION', false);

// ---- Uploads & paging -------------------------------------------------
define('UPLOAD_PATH', __DIR__ . '/../uploads');
define('MAX_FILE_SIZE', 5 * 1024 * 1024);       // 5 MB
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE', 100);

// ---- Cashfree Payments ------------------------------------------------
define('CASHFREE_APP_ID', getenv('CASHFREE_APP_ID') ?: '1219053e1fbf2ae1616bb4ec8f33509121');
define('CASHFREE_SECRET_KEY', getenv('CASHFREE_SECRET_KEY') ?: 'cfsk_ma_prod_849c9e640286b0f582e3a74d9477aebb_fcd52f6f');
define('CASHFREE_ENV', getenv('CASHFREE_ENV') ?: 'production'); // 'production' or 'sandbox'
define('CASHFREE_API_VERSION', '2023-08-01');

// Backward compatibility if needed
define('RAZORPAY_KEY_ID', '');
define('RAZORPAY_KEY_SECRET', '');

// ---- Email (Resend) ---------------------------------------------------
define('RESEND_API_KEY', getenv('RESEND_API_KEY') ?: 're_A9erCTDz_AF6ZryddVQ28TAuerQ4GUDf6');
define('EMAIL_FROM', 'password@adit.shahdhairyah.in');
define('EMAIL_FROM_NAME', 'ADIT CMS');

// ---- Installer guard --------------------------------------------------
define('INSTALL_KEY', getenv('ADIT_INSTALL_KEY') ?: 'adit-cms-install-key-2026');
