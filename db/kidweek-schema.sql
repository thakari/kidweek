BEGIN;

DROP TYPE IF EXISTS kid_status CASCADE;
DROP TYPE IF EXISTS kid_status2 CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS patterns CASCADE;
DROP TABLE IF EXISTS exceptions CASCADE;

CREATE TYPE kid_status AS ENUM ('away', 'arrives', 'present', 'leaves');
CREATE TYPE kid_status2 AS ENUM ('away', 'present');

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
    exception_start_date DATE NOT NULL,
    exception_end_date DATE NOT NULL,
    status kid_status2 NOT NULL
);


CREATE OR REPLACE FUNCTION status (user1 VARCHAR(512), date1 DATE) RETURNS kid_status AS $$
  DECLARE 
    position INTEGER := 0;
    start_at1 DATE;
    statuses1 kid_status[];
    status1 kid_status;
    exception_status kid_status2;
    exception_start_date1 DATE;
    exception_end_date1 DATE;
  BEGIN
    SELECT start_at, statuses INTO start_at1, statuses1 FROM patterns WHERE user_id=user1 AND start_at<=date1 ORDER BY start_at DESC LIMIT 1;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
    position := MOD (date1 - start_at1, array_length (statuses1, 1));
    status1 := statuses1[position+1];

    SELECT exception_start_date, exception_end_date, status INTO exception_start_date1, exception_end_date1, exception_status FROM exceptions WHERE user_id=user1 AND exception_start_date<=date1 AND exception_end_date>=date1 ORDER BY id DESC LIMIT 1;
    IF NOT FOUND THEN
      RETURN status1;
    END IF;
    IF exception_status = 'present' THEN
      IF exception_start_date1 = date1 AND status1 = 'away' THEN
        status1 := 'arrives';
      ELSIF exception_start_date1 = date1 AND status1 = 'leaves' THEN
        status1 := 'present';
      ELSIF exception_end_date1 = date1 AND status1 = 'away' THEN
        status1 := 'leaves';
      ELSIF exception_end_date1 = date1 AND status1 = 'arrives' THEN
        status1 := 'present';
      ELSE 
        status1 := 'present';
      END IF;
    ELSE
      IF exception_start_date1 = date1 AND status1 = 'present' THEN
        status1 := 'leaves';
      ELSIF exception_start_date1 = date1 AND status1 = 'arrives' THEN
        status1 := 'away';
      ELSIF exception_end_date1 = date1 AND status1 = 'present' THEN
        status1 := 'arrives';
      ELSIF exception_end_date1 = date1 AND status1 = 'leaves' THEN
        status1 := 'away';
      ELSE 
        status1 := 'away';
      END IF;
    END IF;
      RETURN status1;
  END; $$
LANGUAGE plpgsql;

COMMIT;
