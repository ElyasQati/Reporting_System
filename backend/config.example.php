<?php
// Copy to config.local.php for the legacy PHP backend only.
// Generate a hash with PHP password_hash(); never commit real credentials.
return [
    'admin_username' => 'admin',
    'admin_password_hash' => '',
];
