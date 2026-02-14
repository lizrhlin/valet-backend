-- Drop views that depend on the columns we're removing
DROP VIEW IF EXISTS professionals CASCADE;
DROP VIEW IF EXISTS clients CASCADE;
DROP VIEW IF EXISTS all_users CASCADE;

-- Drop the unused columns
ALTER TABLE "users" 
  DROP COLUMN IF EXISTS "avg_response_time",
  DROP COLUMN IF EXISTS "last_seen",
  DROP COLUMN IF EXISTS "rg",
  DROP COLUMN IF EXISTS "darkMode";

-- Recreate views without the removed columns
CREATE VIEW professionals AS
SELECT * FROM users WHERE "userType" = 'PROFESSIONAL';

CREATE VIEW clients AS
SELECT * FROM users WHERE "userType" = 'CLIENT';
