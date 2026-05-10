-- Run this manually if your current database does not already include these tables.

USE campus_connekt;

CREATE TABLE IF NOT EXISTS audit_log (
    log_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id    INT UNSIGNED NULL,
    action      VARCHAR(100) NOT NULL,
    table_name  VARCHAR(60)  NOT NULL,
    record_id   INT UNSIGNED NOT NULL,
    old_data    JSON         NULL,
    new_data    JSON         NULL,
    ip_address  VARCHAR(45)  NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_log_actor FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_log_actor  (actor_id),
    INDEX idx_log_table  (table_name),
    INDEX idx_log_action (action),
    INDEX idx_log_time   (created_at)
);

CREATE TABLE IF NOT EXISTS security_questions (
    question_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_text  VARCHAR(255) NOT NULL,
    is_active      TINYINT(1) NOT NULL DEFAULT 1,
    display_order  INT UNSIGNED NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_security_question_text (question_text),
    INDEX idx_security_question_active_order (is_active, display_order)
);

CREATE TABLE IF NOT EXISTS user_security_questions (
    user_security_question_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id                   INT UNSIGNED NOT NULL,
    question_id               INT UNSIGNED NOT NULL,
    answer_hash               VARCHAR(255) NOT NULL,
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_usq_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_usq_question FOREIGN KEY (question_id) REFERENCES security_questions(question_id) ON DELETE RESTRICT,
    UNIQUE KEY uq_user_question (user_id, question_id),
    INDEX idx_usq_user (user_id),
    INDEX idx_usq_question (question_id)
);

INSERT INTO security_questions (question_text, is_active, display_order)
VALUES
  ('What was your childhood nickname?', 1, 1),
  ('What is the name of your first school?', 1, 2),
  ('What city were you born in?', 1, 3),
  ('What is your favorite teacher''s last name?', 1, 4),
  ('What was your first pet''s name?', 1, 5),
  ('What is your mother''s middle name?', 1, 6)
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  display_order = VALUES(display_order);
