BEGIN;

DROP TYPE IF EXISTS kid_status CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS patterns CASCADE;
DROP TABLE IF EXISTS exceptions CASCADE;

CREATE TYPE kid_status AS ENUM ('away', 'arrives', 'present', 'leaves');

CREATE TABLE users (
    id VARCHAR(512) PRIMARY KEY
);

CREATE TABLE patterns (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(512) REFERENCES users ON DELETE CASCADE,
    start_at DATE NOT NULL,
    statuses kid_status[] NOT NULL,
    created_on TIMESTAMP NOT NULL,
    UNIQUE(user_id)
);

CREATE TABLE exceptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(512) REFERENCES users ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    status kid_status NOT NULL,
    UNIQUE (user_id, exception_date)
);

COMMIT;

BEGIN;
INSERT INTO users (id) VALUES ('abc123');
INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ('abc123', '2016-01-15', '{"arrives", "present", "present", "leaves"}', now());
INSERT INTO exceptions (user_id, exception_date, status) VALUES ('abc123', '2015-10-15', 'arrives');

INSERT INTO users (id) VALUES ('qwe321');
INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ('qwe321', '2015-10-11', '{"arrives", "present", "leaves", "away", "away", "arrives", "leaves"}', now());

INSERT INTO exceptions (user_id, exception_date, status) VALUES ('qwe321', '2015-12-25', 'arrives');

COMMIT;
