<?php
$host = "localhost";       // هاست (برای XAMPP معمولاً localhost)
$user = "root";            // یوزرنیم (پیش‌فرض XAMPP: root)
$password = "";            // پسورد (پیش‌فرض XAMPP خالی است)
$dbname = "gozaresh_db";   // نام دیتابیس که قبلاً ساخته‌ای

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("خطا در اتصال به دیتابیس: " . $e->getMessage());
}
