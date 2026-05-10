-- =============================================================
--  Campus ConneKt — Complete MySQL Database
--  Includes: Tables, Indexes, Triggers, Procedures, Views, Events
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE DATABASE IF NOT EXISTS campus_connekt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_connekt;

-- =============================================================
--  1. USERS
-- =============================================================
CREATE TABLE users (
    user_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email            VARCHAR(150)  NOT NULL UNIQUE,
    password_hash    VARCHAR(255)  NOT NULL,
    role             ENUM('student','society_admin','admin') NOT NULL DEFAULT 'student',
    first_name       VARCHAR(80)   NOT NULL,
    last_name        VARCHAR(80)   NOT NULL,
    phone            VARCHAR(20)   NULL,
    bio              TEXT          NULL,
    profile_picture  VARCHAR(500)  NULL,
    department       VARCHAR(120)  NULL,
    batch_year       YEAR          NULL,
    is_active        TINYINT(1)    NOT NULL DEFAULT 1,
    is_verified      TINYINT(1)    NOT NULL DEFAULT 0,
    verification_token     VARCHAR(120)  NULL,
    reset_token            VARCHAR(120)  NULL,
    reset_token_expires    DATETIME      NULL,
    last_login             DATETIME      NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_role       (role),
    INDEX idx_users_department (department),
    INDEX idx_users_batch      (batch_year),
    INDEX idx_users_active     (is_active)
);

INSERT INTO users (
    email,
    password_hash,
    role,
    first_name,
    last_name,
    department,
    batch_year,
    is_active,
    is_verified
) VALUES (
    'admin@nust.edu.pk',
    '$2b$12$fZf9h0OC5R8cCrcNl75gH.JXxGD5js3vYpvmZsXw6Qgk7XZMGt5/a',
    'admin',
    'System',
    'Administrator',
    'IT Administration',
    2026,
    1,
    1
)
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    role = VALUES(role),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    department = VALUES(department),
    batch_year = VALUES(batch_year),
    is_active = VALUES(is_active),
    is_verified = VALUES(is_verified);

-- =============================================================
--  2. SOCIETIES
-- =============================================================
CREATE TABLE societies (
    society_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL UNIQUE,
    description  TEXT         NULL,
    logo         VARCHAR(500) NULL,
    category     ENUM('technical','cultural','sports','literary','social','religious','other') NOT NULL DEFAULT 'other',
    created_by   INT UNSIGNED NOT NULL,
    is_approved  TINYINT(1)   NOT NULL DEFAULT 0,
    approved_by  INT UNSIGNED NULL,
    approved_at  DATETIME     NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY fk_soc_creator  (created_by)  REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY fk_soc_approver (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_soc_category   (category),
    INDEX idx_soc_approved   (is_approved)
);

-- =============================================================
--  3. SOCIETY MEMBERS
-- =============================================================
CREATE TABLE society_members (
    membership_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id    INT UNSIGNED NOT NULL,
    user_id       INT UNSIGNED NOT NULL,
    role          ENUM('member','moderator','president','vice_president','secretary','treasurer') NOT NULL DEFAULT 'member',
    is_active     TINYINT(1)  NOT NULL DEFAULT 1,
    joined_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_soc_member (society_id, user_id),
    FOREIGN KEY fk_sm_society (society_id) REFERENCES societies(society_id) ON DELETE CASCADE,
    FOREIGN KEY fk_sm_user    (user_id)    REFERENCES users(user_id)         ON DELETE CASCADE,
    INDEX idx_sm_user     (user_id),
    INDEX idx_sm_active   (is_active)
);

-- =============================================================
--  4. EVENTS
-- =============================================================
CREATE TABLE events (
    event_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title             VARCHAR(200) NOT NULL,
    description       TEXT         NULL,
    society_id        INT UNSIGNED NULL,
    created_by        INT UNSIGNED NOT NULL,
    location          VARCHAR(200) NULL,
    start_datetime    DATETIME     NOT NULL,
    end_datetime      DATETIME     NOT NULL,
    thumbnail         VARCHAR(500) NULL,
    category          ENUM('workshop','seminar','competition','social','sports','cultural','meetup','other') NOT NULL DEFAULT 'other',
    capacity          INT UNSIGNED NULL,
    registered_count  INT UNSIGNED NOT NULL DEFAULT 0,
    status            ENUM('draft','open','closed','cancelled','completed') NOT NULL DEFAULT 'draft',
    is_approved       TINYINT(1)   NOT NULL DEFAULT 0,
    approved_by       INT UNSIGNED NULL,
    approved_at       DATETIME     NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    registration_deadline DATETIME NULL,
	visibility ENUM('public','society_only') DEFAULT 'public',

    CONSTRAINT chk_event_dates CHECK (end_datetime > start_datetime),
    CONSTRAINT chk_registered_count CHECK (registered_count >= 0),
    FOREIGN KEY fk_ev_society  (society_id)  REFERENCES societies(society_id) ON DELETE SET NULL,
    FOREIGN KEY fk_ev_creator  (created_by)  REFERENCES users(user_id)        ON DELETE RESTRICT,
    FOREIGN KEY fk_ev_approver (approved_by) REFERENCES users(user_id)        ON DELETE SET NULL,
    INDEX idx_ev_status    (status),
    INDEX idx_ev_creator (created_by),
    INDEX idx_ev_start     (start_datetime),
    INDEX idx_ev_category  (category),
    INDEX idx_ev_society   (society_id),
    INDEX idx_ev_approved  (is_approved)
);

-- =============================================================
--  5. EVENT REGISTRATIONS
-- =============================================================
CREATE TABLE event_registrations (
    registration_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id         INT UNSIGNED NOT NULL,
    user_id          INT UNSIGNED NOT NULL,
    status           ENUM('confirmed','waitlisted','cancelled','attended') NOT NULL DEFAULT 'confirmed',
    registered_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at     DATETIME     NULL,

    UNIQUE KEY uq_ev_reg (event_id, user_id),
    FOREIGN KEY fk_er_event (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY fk_er_user  (user_id)  REFERENCES users(user_id)   ON DELETE CASCADE,
    INDEX idx_er_user    (user_id),
    INDEX idx_er_status  (status)
);

-- =============================================================
--  6. RESOURCES
-- =============================================================
CREATE TABLE resources (
    resource_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title          VARCHAR(200) NOT NULL,
    description    TEXT         NULL,
    uploaded_by    INT UNSIGNED NOT NULL,
    subject        VARCHAR(150) NULL,
    course_code    VARCHAR(30)  NULL,
    resource_type  ENUM('notes','book','slides','past_paper','link','other') NOT NULL DEFAULT 'other',
    file_path      VARCHAR(500) NULL,
    external_url   VARCHAR(500) NULL,
    file_size      BIGINT UNSIGNED NULL COMMENT 'bytes',
    status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    approved_by    INT UNSIGNED NULL,
    approved_at    DATETIME     NULL,
    download_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_res_source CHECK (
    (file_path IS NOT NULL AND external_url IS NULL) OR
    (file_path IS NULL AND external_url IS NOT NULL)
		),
    FOREIGN KEY fk_res_uploader (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY fk_res_approver (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_res_status       (status),
    INDEX idx_res_subject      (subject),
    INDEX idx_res_course       (course_code),
    INDEX idx_res_type         (resource_type),
    INDEX idx_res_uploader (uploaded_by),
    FULLTEXT INDEX ft_res_search (title, description, subject)
);

-- =============================================================
--  7. RESOURCE REQUESTS
-- =============================================================
CREATE TABLE resource_requests (
    request_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT         NULL,
    subject       VARCHAR(150) NULL,
    status        ENUM('open','fulfilled','closed') NOT NULL DEFAULT 'open',
    fulfilled_by  INT UNSIGNED NULL,
    resource_id   INT UNSIGNED NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY fk_rr_user      (user_id)     REFERENCES users(user_id)     ON DELETE CASCADE,
    FOREIGN KEY fk_rr_fulfiller (fulfilled_by) REFERENCES users(user_id)    ON DELETE SET NULL,
    FOREIGN KEY fk_rr_resource  (resource_id)  REFERENCES resources(resource_id) ON DELETE SET NULL,
    INDEX idx_rr_status (status),
    INDEX idx_rr_user   (user_id)
);

-- =============================================================
--  7.5. REQUEST RESPONSES
-- =============================================================
CREATE TABLE request_responses (
    response_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id     INT UNSIGNED NOT NULL,
    user_id        INT UNSIGNED NOT NULL,
    response_text  TEXT         NOT NULL,
    file_path      VARCHAR(500) NULL,
    file_size      BIGINT UNSIGNED NULL COMMENT 'bytes',
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY fk_rresp_request (request_id) REFERENCES resource_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY fk_rresp_user    (user_id)    REFERENCES users(user_id)              ON DELETE CASCADE,
    INDEX idx_rresp_request (request_id),
    INDEX idx_rresp_user    (user_id),
    INDEX idx_rresp_created (created_at)
);

-- =============================================================
--  8. ANNOUNCEMENTS
-- =============================================================
CREATE TABLE announcements (
    announcement_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    society_id       INT UNSIGNED NOT NULL,
    created_by       INT UNSIGNED NOT NULL,
    title            VARCHAR(200) NOT NULL,
    content          TEXT         NOT NULL,
    is_pinned        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY fk_ann_society (society_id) REFERENCES societies(society_id) ON DELETE CASCADE,
    FOREIGN KEY fk_ann_creator (created_by) REFERENCES users(user_id)        ON DELETE RESTRICT,
    INDEX idx_ann_society  (society_id),
    INDEX idx_ann_pinned   (is_pinned),
    INDEX idx_ann_created  (created_at)
);

-- =============================================================
--  9. RATINGS
-- =============================================================
CREATE TABLE ratings (
    rating_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    entity_type  ENUM('event','resource') NOT NULL,
    entity_id    INT UNSIGNED NOT NULL,
    stars        TINYINT UNSIGNED NOT NULL,
    review       TEXT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_rating (user_id, entity_type, entity_id),
    CONSTRAINT chk_stars CHECK (stars BETWEEN 1 AND 5),
    FOREIGN KEY fk_rat_user (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_rat_entity (entity_type, entity_id)
);

-- =============================================================
--  10. NOTIFICATIONS
-- =============================================================
CREATE TABLE notifications (
    notification_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          INT UNSIGNED NOT NULL,
    title            VARCHAR(200) NOT NULL,
    message          TEXT         NOT NULL,
    type             ENUM('event_reminder','registration_confirm','resource_approved','resource_rejected','announcement','society_invite','admin_alert','general') NOT NULL DEFAULT 'general',
    reference_id     INT UNSIGNED NULL,
    reference_type   VARCHAR(50)  NULL,
    is_read          TINYINT(1)   NOT NULL DEFAULT 0,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY fk_notif_user (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_notif_user    (user_id),
    INDEX idx_notif_read    (is_read),
    INDEX idx_notif_created (created_at)
);

-- =============================================================
--  11. ADMIN AUDIT LOG
-- =============================================================
CREATE TABLE audit_log (
    log_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id    INT UNSIGNED NULL,
    action      VARCHAR(100) NOT NULL,
    table_name  VARCHAR(60)  NOT NULL,
    record_id   INT UNSIGNED NOT NULL,
    old_data    JSON         NULL,
    new_data    JSON         NULL,
    ip_address  VARCHAR(45)  NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY fk_log_actor (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_log_actor  (actor_id),
    INDEX idx_log_table  (table_name),
    INDEX idx_log_action (action),
    INDEX idx_log_time   (created_at)
);

-- =============================================================
--  12. PASSWORD RESET TOKENS  (forgot-password flow)
-- =============================================================
CREATE TABLE password_resets (
    reset_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    token       VARCHAR(120) NOT NULL UNIQUE,
    expires_at  DATETIME     NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY fk_pr_user (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_pr_token   (token),
    INDEX idx_pr_expires (expires_at)
);

-- =============================================================
--  13. SESSIONS  (if you want server-side session tracking)
-- =============================================================
CREATE TABLE sessions (
    session_id   VARCHAR(128) PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    ip_address   VARCHAR(45)  NULL,
    user_agent   VARCHAR(500) NULL,
    payload      TEXT         NULL,
    last_activity TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at   DATETIME     NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY fk_sess_user (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_sess_user    (user_id),
    INDEX idx_sess_expires (expires_at)
);

-- =============================================================
--  TRIGGERS
-- =============================================================

DELIMITER $$

-- T1: Auto-increment registered_count when a confirmed registration is inserted
CREATE TRIGGER trg_ev_reg_after_insert
AFTER INSERT ON event_registrations
FOR EACH ROW
BEGIN
    IF NEW.status = 'confirmed' THEN
        UPDATE events
        SET registered_count = registered_count + 1
        WHERE event_id = NEW.event_id;
    END IF;

    -- Auto-close event if capacity is now full
    UPDATE events
    SET status = 'closed'
    WHERE event_id = NEW.event_id
      AND capacity IS NOT NULL
      AND registered_count >= capacity
      AND status = 'open';
END$$

-- T2: Decrement registered_count when registration is cancelled
CREATE TRIGGER trg_ev_reg_after_update
AFTER UPDATE ON event_registrations
FOR EACH ROW
BEGIN
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        UPDATE events
        SET registered_count = GREATEST(registered_count - 1, 0)
        WHERE event_id = NEW.event_id;

        -- Re-open event if capacity freed up
        UPDATE events
        SET status = 'open'
        WHERE event_id = NEW.event_id
          AND capacity IS NOT NULL
          AND registered_count < capacity
          AND status = 'closed';
    END IF;
END$$

-- T3: When a registration is confirmed → send notification to the student
CREATE TRIGGER trg_ev_reg_notify
AFTER INSERT ON event_registrations
FOR EACH ROW
BEGIN
    DECLARE v_title VARCHAR(200);
    SELECT title INTO v_title FROM events WHERE event_id = NEW.event_id;

    IF NEW.status = 'confirmed' THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.user_id,
            'Registration Confirmed',
            CONCAT('You are registered for "', v_title, '". See you there!'),
            'registration_confirm',
            NEW.event_id,
            'event'
        );
    END IF;
END$$

-- T4: When resource status changes to approved/rejected → notify uploader
CREATE TRIGGER trg_resource_status_notify
AFTER UPDATE ON resources
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status AND NEW.status IN ('approved','rejected') THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.uploaded_by,
            CASE NEW.status
                WHEN 'approved' THEN 'Resource Approved'
                ELSE 'Resource Rejected'
            END,
            CASE NEW.status
                WHEN 'approved' THEN CONCAT('"', NEW.title, '" has been approved and is now live.')
                ELSE CONCAT('"', NEW.title, '" was not approved. Please review and re-submit.')
            END,
            CASE NEW.status
                WHEN 'approved' THEN 'resource_approved'
                ELSE 'resource_rejected'
            END,
            NEW.resource_id,
            'resource'
        );
    END IF;
END$$

-- T5: When event is approved → notify the creator
CREATE TRIGGER trg_event_approved_notify
AFTER UPDATE ON events
FOR EACH ROW
BEGIN
    IF OLD.is_approved = 0 AND NEW.is_approved = 1 THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.created_by,
            'Event Approved',
            CONCAT('Your event "', NEW.title, '" has been approved and is now visible to students.'),
            'admin_alert',
            NEW.event_id,
            'event'
        );
    END IF;
END$$

-- T6: New announcement → notify all active members of that society
CREATE TRIGGER trg_announcement_notify
AFTER INSERT ON announcements
FOR EACH ROW
BEGIN
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    SELECT
        sm.user_id,
        CONCAT('[', s.name, '] New Announcement'),
        NEW.title,
        'announcement',
        NEW.announcement_id,
        'announcement'
    FROM society_members sm
    JOIN societies s ON s.society_id = NEW.society_id
    WHERE sm.society_id = NEW.society_id
      AND sm.is_active = 1
      AND sm.user_id != NEW.created_by;
END$$

-- T7: Prevent registering for a full event
CREATE TRIGGER trg_prevent_full_event_reg
BEFORE INSERT ON event_registrations
FOR EACH ROW
BEGIN
    DECLARE v_capacity INT UNSIGNED;
    DECLARE v_count    INT UNSIGNED;
    DECLARE v_status   ENUM('draft','open','closed','cancelled','completed');

    SELECT capacity, registered_count, status
    INTO v_capacity, v_count, v_status
    FROM events WHERE event_id = NEW.event_id;

    IF v_status != 'open' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Event is not open for registration.';
    END IF;

    IF v_capacity IS NOT NULL AND v_count >= v_capacity THEN
        SET NEW.status = 'waitlisted';
    END IF;
END$$

-- T8: Audit log for user role changes
CREATE TRIGGER trg_audit_user_role
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.role != NEW.role THEN
        INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data)
        VALUES (
            NULL,
            'role_changed',
            'users',
            NEW.user_id,
            JSON_OBJECT('role', OLD.role),
            JSON_OBJECT('role', NEW.role)
        );
    END IF;
END$$

-- T9: Mark society as needing approval when submitted
CREATE TRIGGER trg_society_submitted
BEFORE INSERT ON societies
FOR EACH ROW
BEGIN
    SET NEW.is_approved = 0;
END$$

-- T10: When a member joins a society → notify the society president
CREATE TRIGGER trg_member_joined_notify
AFTER INSERT ON society_members
FOR EACH ROW
BEGIN
    DECLARE v_president_id INT UNSIGNED;
    DECLARE v_soc_name     VARCHAR(150);
    DECLARE v_member_name  VARCHAR(170);

    SELECT sm.user_id INTO v_president_id
    FROM society_members sm
    WHERE sm.society_id = NEW.society_id
      AND sm.role = 'president'
      AND sm.is_active = 1
    LIMIT 1;

    IF v_president_id IS NOT NULL AND v_president_id != NEW.user_id THEN
        SELECT name INTO v_soc_name FROM societies WHERE society_id = NEW.society_id;
        SELECT CONCAT(first_name, ' ', last_name) INTO v_member_name FROM users WHERE user_id = NEW.user_id;

        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            v_president_id,
            'New Member Joined',
            CONCAT(v_member_name, ' has joined ', v_soc_name, '.'),
            'general',
            NEW.society_id,
            'society'
        );
    END IF;
END$$

DELIMITER ;

-- =============================================================
--  STORED PROCEDURES
-- =============================================================

DELIMITER $$

-- P1: Register user for an event (handles full capacity gracefully)
CREATE PROCEDURE sp_register_for_event(
    IN p_user_id   INT UNSIGNED,
    IN p_event_id  INT UNSIGNED,
    OUT p_status   VARCHAR(50),
    OUT p_message  VARCHAR(200)
)
BEGIN
    DECLARE v_capacity        INT UNSIGNED;
    DECLARE v_count           INT UNSIGNED;
    DECLARE v_event_status    ENUM('draft','open','closed','cancelled','completed');
    DECLARE v_already_exists  INT DEFAULT 0;

    SELECT capacity, registered_count, status
    INTO v_capacity, v_count, v_event_status
    FROM events WHERE event_id = p_event_id;

    IF v_event_status IS NULL THEN
        SET p_status = 'error', p_message = 'Event not found.';
    ELSEIF v_event_status != 'open' THEN
        SET p_status = 'error', p_message = 'Event is not accepting registrations.';
    ELSE
        SELECT COUNT(*) INTO v_already_exists
        FROM event_registrations
        WHERE event_id = p_event_id AND user_id = p_user_id;

        IF v_already_exists > 0 THEN
            SET p_status = 'error', p_message = 'Already registered for this event.';
        ELSE
            IF v_capacity IS NULL OR v_count < v_capacity THEN
                INSERT INTO event_registrations (event_id, user_id, status)
                VALUES (p_event_id, p_user_id, 'confirmed');
                SET p_status = 'confirmed', p_message = 'Registration confirmed.';
            ELSE
                INSERT INTO event_registrations (event_id, user_id, status)
                VALUES (p_event_id, p_user_id, 'waitlisted');
                SET p_status = 'waitlisted', p_message = 'Added to waitlist.';
            END IF;
        END IF;
    END IF;
END$$

-- P2: Cancel event registration
CREATE PROCEDURE sp_cancel_registration(
    IN p_user_id  INT UNSIGNED,
    IN p_event_id INT UNSIGNED,
    OUT p_message VARCHAR(200)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO v_exists
    FROM event_registrations
    WHERE event_id = p_event_id AND user_id = p_user_id AND status = 'confirmed';

    IF v_exists = 0 THEN
        SET p_message = 'No active registration found.';
    ELSE
        UPDATE event_registrations
        SET status = 'cancelled', cancelled_at = NOW()
        WHERE event_id = p_event_id AND user_id = p_user_id;

        -- Promote first waitlisted person if spot freed
        SET @waitlist_user = NULL;
        SELECT user_id INTO @waitlist_user
        FROM event_registrations
        WHERE event_id = p_event_id AND status = 'waitlisted'
        ORDER BY registered_at ASC LIMIT 1;

        IF @waitlist_user IS NOT NULL THEN
            UPDATE event_registrations
            SET status = 'confirmed'
            WHERE event_id = p_event_id AND user_id = @waitlist_user;
        END IF;

        SET p_message = 'Registration cancelled successfully.';
    END IF;
END$$

-- P3: Approve a resource
CREATE PROCEDURE sp_approve_resource(
    IN p_resource_id INT UNSIGNED,
    IN p_admin_id    INT UNSIGNED,
    IN p_approve     TINYINT,      -- 1=approve, 0=reject
    OUT p_message    VARCHAR(200)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO v_exists FROM resources WHERE resource_id = p_resource_id AND status = 'pending';

    IF v_exists = 0 THEN
        SET p_message = 'Resource not found or already processed.';
    ELSE
        UPDATE resources
        SET status      = IF(p_approve = 1, 'approved', 'rejected'),
            approved_by = p_admin_id,
            approved_at = NOW()
        WHERE resource_id = p_resource_id;

        SET p_message = IF(p_approve = 1, 'Resource approved.', 'Resource rejected.');
    END IF;
END$$

-- P4: Approve an event
CREATE PROCEDURE sp_approve_event(
    IN p_event_id INT UNSIGNED,
    IN p_admin_id INT UNSIGNED,
    OUT p_message VARCHAR(200)
)
BEGIN
    UPDATE events
    SET is_approved = 1,
        status      = 'open',
        approved_by = p_admin_id,
        approved_at = NOW()
    WHERE event_id = p_event_id;

    IF ROW_COUNT() = 0 THEN
        SET p_message = 'Event not found.';
    ELSE
        SET p_message = 'Event approved and opened for registration.';
    END IF;
END$$

-- P5: Join a society
CREATE PROCEDURE sp_join_society(
    IN p_user_id    INT UNSIGNED,
    IN p_society_id INT UNSIGNED,
    OUT p_message   VARCHAR(200)
)
BEGIN
    DECLARE v_approved INT DEFAULT 0;
    DECLARE v_member   INT DEFAULT 0;

    SELECT is_approved INTO v_approved FROM societies WHERE society_id = p_society_id;

    IF v_approved = 0 THEN
        SET p_message = 'Society is pending approval.';
    ELSE
        SELECT COUNT(*) INTO v_member
        FROM society_members
        WHERE society_id = p_society_id AND user_id = p_user_id;

        IF v_member > 0 THEN
            UPDATE society_members
            SET is_active = 1
            WHERE society_id = p_society_id AND user_id = p_user_id;
            SET p_message = 'Re-joined society.';
        ELSE
            INSERT INTO society_members (society_id, user_id, role)
            VALUES (p_society_id, p_user_id, 'member');
            SET p_message = 'Joined society successfully.';
        END IF;
    END IF;
END$$

-- P6: Get student dashboard summary
CREATE PROCEDURE sp_student_dashboard(IN p_user_id INT UNSIGNED)
BEGIN
    -- Upcoming registered events
    SELECT e.event_id, e.title, e.start_datetime, e.location, e.category, er.status AS reg_status
    FROM event_registrations er
    JOIN events e ON e.event_id = er.event_id
    WHERE er.user_id = p_user_id
      AND er.status IN ('confirmed','waitlisted')
      AND e.start_datetime >= NOW()
    ORDER BY e.start_datetime ASC
    LIMIT 5;

    -- Societies the student is in
    SELECT s.society_id, s.name, s.category, sm.role
    FROM society_members sm
    JOIN societies s ON s.society_id = sm.society_id
    WHERE sm.user_id = p_user_id AND sm.is_active = 1;

    -- Unread notifications count
    SELECT COUNT(*) AS unread_count
    FROM notifications
    WHERE user_id = p_user_id AND is_read = 0;
END$$

-- P7: Get admin analytics
CREATE PROCEDURE sp_admin_analytics()
BEGIN
    -- User breakdown by role
    SELECT role, COUNT(*) AS total FROM users WHERE is_active = 1 GROUP BY role;

    -- Events by status
    SELECT status, COUNT(*) AS total FROM events GROUP BY status;

    -- Top 5 most registered events
    SELECT e.title, e.registered_count, e.capacity
    FROM events e ORDER BY e.registered_count DESC LIMIT 5;

    -- Resources by type
    SELECT resource_type, COUNT(*) AS total, SUM(download_count) AS total_downloads
    FROM resources WHERE status = 'approved' GROUP BY resource_type;

    -- Most active societies (by member count)
    SELECT s.name, COUNT(sm.user_id) AS member_count
    FROM societies s
    JOIN society_members sm ON sm.society_id = s.society_id AND sm.is_active = 1
    GROUP BY s.society_id ORDER BY member_count DESC LIMIT 5;
END$$

-- P8: Mark all notifications as read for a user
CREATE PROCEDURE sp_mark_notifications_read(IN p_user_id INT UNSIGNED)
BEGIN
    UPDATE notifications SET is_read = 1
    WHERE user_id = p_user_id AND is_read = 0;
END$$

-- P9: Soft-delete user (deactivate)
CREATE PROCEDURE sp_deactivate_user(
    IN p_user_id   INT UNSIGNED,
    IN p_admin_id  INT UNSIGNED,
    OUT p_message  VARCHAR(200)
)
BEGIN
    UPDATE users SET is_active = 0 WHERE user_id = p_user_id;

    INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (p_admin_id, 'user_deactivated', 'users', p_user_id,
            JSON_OBJECT('is_active', 1), JSON_OBJECT('is_active', 0));

    SET p_message = 'User deactivated.';
END$$

-- P10: Increment resource download count
CREATE PROCEDURE sp_download_resource(IN p_resource_id INT UNSIGNED, IN p_user_id INT UNSIGNED)
BEGIN
    UPDATE resources SET download_count = download_count + 1 WHERE resource_id = p_resource_id;
END$$

-- P11: Generate password reset token
CREATE PROCEDURE sp_generate_reset_token(
    IN  p_email    VARCHAR(150),
    OUT p_token    VARCHAR(120),
    OUT p_message  VARCHAR(200)
)
BEGIN
    DECLARE v_user_id INT UNSIGNED;

    SELECT user_id INTO v_user_id FROM users WHERE email = p_email AND is_active = 1;

    IF v_user_id IS NULL THEN
        SET p_token = NULL, p_message = 'No active account found with that email.';
    ELSE
        -- Expire any existing tokens
        UPDATE password_resets SET used = 1 WHERE user_id = v_user_id AND used = 0;

        SET p_token = SHA2(CONCAT(v_user_id, NOW(), RAND()), 256);

        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (v_user_id, p_token, DATE_ADD(NOW(), INTERVAL 1 HOUR));

        SET p_message = 'Reset token generated. Valid for 1 hour.';
    END IF;
END$$

-- P12: Consume reset token and change password
CREATE PROCEDURE sp_reset_password(
    IN  p_token        VARCHAR(120),
    IN  p_new_hash     VARCHAR(255),
    OUT p_message      VARCHAR(200)
)
BEGIN
    DECLARE v_user_id  INT UNSIGNED;
    DECLARE v_expires  DATETIME;

    SELECT user_id, expires_at INTO v_user_id, v_expires
    FROM password_resets
    WHERE token = p_token AND used = 0;

    IF v_user_id IS NULL THEN
        SET p_message = 'Invalid or already-used token.';
    ELSEIF v_expires < NOW() THEN
        SET p_message = 'Token has expired. Please request a new one.';
        UPDATE password_resets SET used = 1 WHERE token = p_token;
    ELSE
        UPDATE users SET password_hash = p_new_hash WHERE user_id = v_user_id;
        UPDATE password_resets SET used = 1 WHERE token = p_token;
        SET p_message = 'Password reset successfully.';
    END IF;
END$$

DELIMITER ;

-- =============================================================
--  VIEWS
-- =============================================================

-- V1: Public event listing (only approved + open/upcoming)
CREATE VIEW vw_public_events AS
SELECT
    e.event_id,
    e.title,
    e.description,
    e.location,
    e.start_datetime,
    e.end_datetime,
    e.thumbnail,
    e.category,
    e.capacity,
    e.registered_count,
    CASE WHEN e.capacity IS NULL THEN NULL
         ELSE e.capacity - e.registered_count END AS spots_left,
    e.status,
    s.name  AS society_name,
    s.logo  AS society_logo,
    CONCAT(u.first_name, ' ', u.last_name) AS organizer_name
FROM events e
LEFT JOIN societies s ON s.society_id = e.society_id
JOIN users u ON u.user_id = e.created_by
WHERE e.is_approved = 1
  AND e.status IN ('open','closed','completed');

-- V2: Approved resources listing
CREATE VIEW vw_public_resources AS
SELECT
    r.resource_id,
    r.title,
    r.description,
    r.subject,
    r.course_code,
    r.resource_type,
    r.file_path,
    r.external_url,
    r.file_size,
    r.download_count,
    r.approved_at,
    CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
    COALESCE(AVG(rt.stars), 0) AS avg_rating,
    COUNT(rt.rating_id) AS rating_count
FROM resources r
JOIN users u ON u.user_id = r.uploaded_by
LEFT JOIN ratings rt ON rt.entity_type = 'resource' AND rt.entity_id = r.resource_id
WHERE r.status = 'approved'
GROUP BY r.resource_id;

-- V3: Society overview with member count
CREATE VIEW vw_societies AS
SELECT
    s.society_id,
    s.name,
    s.description,
    s.logo,
    s.category,
    s.is_approved,
    CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
    COUNT(sm.membership_id) AS member_count
FROM societies s
JOIN users u ON u.user_id = s.created_by
LEFT JOIN society_members sm ON sm.society_id = s.society_id AND sm.is_active = 1
GROUP BY s.society_id;

-- V4: User profile summary
CREATE VIEW vw_user_profile AS
SELECT
    u.user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.department,
    u.batch_year,
    u.bio,
    u.profile_picture,
    u.role,
    u.is_verified,
    u.last_login,
    COUNT(DISTINCT er.registration_id) AS events_joined,
    COUNT(DISTINCT r.resource_id)      AS resources_uploaded,
    COUNT(DISTINCT sm.membership_id)   AS societies_joined
FROM users u
LEFT JOIN event_registrations er ON er.user_id = u.user_id AND er.status = 'confirmed'
LEFT JOIN resources r  ON r.uploaded_by = u.user_id AND r.status = 'approved'
LEFT JOIN society_members sm ON sm.user_id = u.user_id AND sm.is_active = 1
GROUP BY u.user_id;

-- V5: Pending approvals for admin
CREATE VIEW vw_pending_approvals AS
SELECT 'event'    AS item_type,
       e.event_id AS item_id,
       e.title,
       CONCAT(u.first_name,' ',u.last_name) AS submitted_by,
       e.created_at AS submitted_at
FROM events e
JOIN users u ON u.user_id = e.created_by
WHERE e.is_approved = 0 AND e.status = 'draft'

UNION ALL

SELECT 'resource' AS item_type,
       r.resource_id,
       r.title,
       CONCAT(u.first_name,' ',u.last_name),
       r.created_at
FROM resources r
JOIN users u ON u.user_id = r.uploaded_by
WHERE r.status = 'pending'

UNION ALL

SELECT 'society' AS item_type,
       s.society_id,
       s.name,
       CONCAT(u.first_name,' ',u.last_name),
       s.created_at
FROM societies s
JOIN users u ON u.user_id = s.created_by
WHERE s.is_approved = 0

ORDER BY submitted_at ASC;

-- V6: Event ratings summary
CREATE VIEW vw_event_ratings AS
SELECT
    e.event_id,
    e.title,
    COUNT(r.rating_id)   AS total_ratings,
    AVG(r.stars)         AS avg_stars,
    SUM(r.stars = 5)     AS five_star,
    SUM(r.stars = 4)     AS four_star,
    SUM(r.stars = 3)     AS three_star,
    SUM(r.stars = 2)     AS two_star,
    SUM(r.stars = 1)     AS one_star
FROM events e
LEFT JOIN ratings r ON r.entity_type = 'event' AND r.entity_id = e.event_id
GROUP BY e.event_id;

-- =============================================================
--  SCHEDULED EVENTS  (MySQL Event Scheduler must be ON)
-- =============================================================

SET GLOBAL event_scheduler = ON;

DELIMITER $$

-- E1: Every hour — mark past events as 'completed'
CREATE EVENT evt_complete_past_events
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    UPDATE events
    SET status = 'completed'
    WHERE end_datetime < NOW()
      AND status IN ('open','closed');
END$$

-- E2: Daily at midnight — purge expired sessions
CREATE EVENT evt_purge_sessions
ON SCHEDULE EVERY 1 DAY
STARTS (CURDATE() + INTERVAL 1 DAY)
DO
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END$$

-- E3: Daily at midnight — purge expired/used password reset tokens
CREATE EVENT evt_purge_reset_tokens
ON SCHEDULE EVERY 1 DAY
STARTS (CURDATE() + INTERVAL 1 DAY)
DO
BEGIN
    DELETE FROM password_resets
    WHERE used = 1 OR expires_at < NOW();
END$$

-- E4: Every day 8 AM — send event reminders for events starting within 24 hours
CREATE EVENT evt_send_event_reminders
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURDATE(), '08:00:00')
DO
BEGIN
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    SELECT
        er.user_id,
        CONCAT('Reminder: ', e.title, ' starts tomorrow'),
        CONCAT('Don\'t forget: "', e.title, '" on ', DATE_FORMAT(e.start_datetime, '%W %d %M at %h:%i %p'), ' at ', COALESCE(e.location,'TBD'), '.'),
        'event_reminder',
        e.event_id,
        'event'
    FROM event_registrations er
    JOIN events e ON e.event_id = er.event_id
    WHERE er.status = 'confirmed'
      AND e.start_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
      AND e.status = 'open'
      AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = er.user_id
            AND n.reference_id = e.event_id
            AND n.type = 'event_reminder'
            AND n.created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
      );
END$$

-- E5: Weekly — purge read notifications older than 30 days
CREATE EVENT evt_purge_old_notifications
ON SCHEDULE EVERY 1 WEEK
DO
BEGIN
    DELETE FROM notifications
    WHERE is_read = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END$$

DELIMITER ;
