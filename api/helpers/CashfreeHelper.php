<?php
/**
 * ADIT CMS - Cashfree Payment Gateway Helper
 */

class CashfreeHelper {

    private static function getBaseUrl() {
        $env = defined('CASHFREE_ENV') ? strtolower(CASHFREE_ENV) : 'production';
        return ($env === 'sandbox')
            ? 'https://sandbox.cashfree.com/pg'
            : 'https://api.cashfree.com/pg';
    }

    private static function getAppId() {
        return defined('CASHFREE_APP_ID') ? CASHFREE_APP_ID : '';
    }

    private static function getSecretKey() {
        return defined('CASHFREE_SECRET_KEY') ? CASHFREE_SECRET_KEY : '';
    }

    private static function getApiVersion() {
        return defined('CASHFREE_API_VERSION') ? CASHFREE_API_VERSION : '2023-08-01';
    }

    /**
     * Create an order on Cashfree PG
     *
     * @param array $orderData [order_id, order_amount, order_currency, customer_details, order_meta]
     * @return array|false Returns decoded response array on success, false on failure
     */
    public static function createOrder($orderData) {
        $url = self::getBaseUrl() . '/orders';
        $appId = self::getAppId();
        $secretKey = self::getSecretKey();
        $apiVersion = self::getApiVersion();

        if (empty($appId) || empty($secretKey)) {
            error_log("CashfreeHelper: Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY");
            return ['error' => 'Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY'];
        }

        $payload = json_encode($orderData);

        // Prefer cURL, fallback to file_get_contents with stream context
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    'x-api-version: ' . $apiVersion,
                    'x-client-id: ' . $appId,
                    'x-client-secret: ' . $secretKey
                ],
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_SSL_VERIFYPEER => false // Ensure compatibility across shared hosting CA bundles
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                error_log("CashfreeHelper createOrder cURL Error: " . $curlError);
                return ['error' => 'cURL error: ' . $curlError];
            }
        } else {
            $context = stream_context_create([
                'http' => [
                    'method'  => 'POST',
                    'header'  => "Content-Type: application/json\r\n" .
                                 "x-api-version: " . $apiVersion . "\r\n" .
                                 "x-client-id: " . $appId . "\r\n" .
                                 "x-client-secret: " . $secretKey . "\r\n",
                    'content' => $payload,
                    'timeout' => 30,
                    'ignore_errors' => true
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false
                ]
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                $err = error_get_last();
                error_log("CashfreeHelper createOrder stream Error: " . ($err['message'] ?? 'unknown'));
                return ['error' => 'Stream error: ' . ($err['message'] ?? 'unknown')];
            }
        }

        $data = json_decode($response, true);
        if (!$data || !isset($data['payment_session_id'])) {
            $msg = is_array($data) ? ($data['message'] ?? json_encode($data)) : $response;
            error_log("CashfreeHelper createOrder Failed: " . $msg);
            return ['error' => $msg];
        }

        return $data;
    }

    /**
     * Get order details and status from Cashfree
     *
     * @param string $orderId
     * @return array|false Returns order data array or false
     */
    public static function getOrder($orderId) {
        $url = self::getBaseUrl() . '/orders/' . urlencode($orderId);
        $appId = self::getAppId();
        $secretKey = self::getSecretKey();
        $apiVersion = self::getApiVersion();

        if (empty($appId) || empty($secretKey)) {
            error_log("CashfreeHelper: Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY");
            return false;
        }

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_HTTPGET        => true,
                CURLOPT_HTTPHEADER     => [
                    'accept: application/json',
                    'x-api-version: ' . $apiVersion,
                    'x-client-id: ' . $appId,
                    'x-client-secret: ' . $secretKey
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_SSL_VERIFYPEER => true
            ]);

            $response = curl_exec($ch);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                error_log("CashfreeHelper getOrder cURL Error: " . $curlError);
                return false;
            }
        } else {
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => "accept: application/json\r\n" .
                                "x-api-version: " . $apiVersion . "\r\n" .
                                "x-client-id: " . $appId . "\r\n" .
                                "x-client-secret: " . $secretKey . "\r\n",
                    'timeout' => 30,
                    'ignore_errors' => true
                ]
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                error_log("CashfreeHelper getOrder stream Error");
                return false;
            }
        }

        $data = json_decode($response, true);
        return $data ?: false;
    }

    /**
     * Get payments for an order from Cashfree
     *
     * @param string $orderId
     * @return array|false Returns array of payment attempts
     */
    public static function getOrderPayments($orderId) {
        $url = self::getBaseUrl() . '/orders/' . urlencode($orderId) . '/payments';
        $appId = self::getAppId();
        $secretKey = self::getSecretKey();
        $apiVersion = self::getApiVersion();

        if (empty($appId) || empty($secretKey)) {
            return false;
        }

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_HTTPGET        => true,
                CURLOPT_HTTPHEADER     => [
                    'accept: application/json',
                    'x-api-version: ' . $apiVersion,
                    'x-client-id: ' . $appId,
                    'x-client-secret: ' . $secretKey
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_SSL_VERIFYPEER => true
            ]);

            $response = curl_exec($ch);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                error_log("CashfreeHelper getOrderPayments cURL Error: " . $curlError);
                return false;
            }
        } else {
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => "accept: application/json\r\n" .
                                "x-api-version: " . $apiVersion . "\r\n" .
                                "x-client-id: " . $appId . "\r\n" .
                                "x-client-secret: " . $secretKey . "\r\n",
                    'timeout' => 30,
                    'ignore_errors' => true
                ]
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return false;
            }
        }

        $data = json_decode($response, true);
        return is_array($data) ? $data : false;
    }
}

