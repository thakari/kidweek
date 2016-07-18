BEGIN;
INSERT INTO users (id) VALUES ('abc123');
INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ('abc123', '2016-01-15', '{"arrives", "present", "present", "leaves"}', now());
INSERT INTO exceptions (user_id, exception_start_date, exception_end_date, status) VALUES ('abc123', '2015-10-15', '2015-10-22', 'away');

INSERT INTO users (id) VALUES ('qwe321');
INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ('qwe321', '2015-10-11', '{"arrives", "present", "leaves", "away", "away", "arrives", "leaves"}', now());

INSERT INTO exceptions (user_id, exception_start_date, exception_end_date, status) VALUES ('qwe321', '2015-12-25', '2016-01-05','present');

INSERT INTO users (id) VALUES ('weekend_dad');
INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ('weekend_dad', '2015-01-05', '{"away", "away", "away", "away", "away", "away", "away", "away", "away", "away", "away", "arrives", "present", "leaves"}', now());

INSERT INTO users (id) VALUES ('week_mom');
INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ('week_mom', '2015-01-05', '{"present", "present", "present", "present", "leaves", "away", "arrives"}', now());
INSERT INTO exceptions (user_id, exception_start_date, exception_end_date, status) VALUES ('week_mom', '2016-06-01', '2016-06-07', 'present');
INSERT INTO exceptions (user_id, exception_start_date, exception_end_date, status) VALUES ('week_mom', '2016-10-01', '2016-11-01', 'present');
COMMIT;
