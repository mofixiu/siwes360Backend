-- Password reset by emailed code (POST /api/auth/forgot-password, /verify-reset-otp, /reset-password).
-- Run once against an existing database:
--   mysql -u root -p siwes360 < database/002_password_resets.sql
-- Codes and tokens are stored only as hashes; one pending reset per user.
CREATE TABLE IF NOT EXISTS password_resets (
    user_id INT UNSIGNED PRIMARY KEY,
    otp_hash VARCHAR(255) NOT NULL,
    otp_expires_at DATETIME NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    reset_token_hash CHAR(64) NULL,
    reset_token_expires_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_resets_token (reset_token_hash)
);
