-- Add session_type column to distinguish simulation curriculum vs other sessions
ALTER TABLE sessions ADD COLUMN session_type text NOT NULL DEFAULT 'simulation';

-- All existing sessions are simulation type (the "other" sessions were previously deleted)
-- Re-imported "other" sessions will be inserted with session_type = 'other'
