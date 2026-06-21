PRAGMA defer_foreign_keys = TRUE;

ALTER TABLE courses ADD COLUMN unit_index INTEGER;
ALTER TABLE lessons ADD COLUMN remix_modules_json TEXT;
