-- Weekly sign-off: the supervisor's signature under a week of the logbook, as on
-- the paper SIWES logbook. Used by POST /api/signoffs and the admin and ITF overviews.
-- Run once against an existing database:
--   mysql -u root -p siwes360 < database/003_weekly_signoffs.sql
-- Until it is run, sign-off endpoints answer 503 and the overviews show no sign-offs.
--
-- supervisor_name keeps the signature readable if the supervisor's account is
-- later removed (supervisor_id then becomes NULL).
CREATE TABLE IF NOT EXISTS weekly_signoffs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id INT UNSIGNED NOT NULL,
    supervisor_id INT UNSIGNED NULL,
    supervisor_name VARCHAR(255) NOT NULL,
    week_number INT UNSIGNED NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    comment TEXT NULL,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_signoff_student_week (student_id, week_number),
    FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(user_id) ON DELETE SET NULL
);
