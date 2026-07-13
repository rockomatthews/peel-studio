ALTER TABLE designs ADD COLUMN IF NOT EXISTS variant_id integer;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS print_canvas_width integer;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS print_canvas_height integer;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS print_area text;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS decoration_method text;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS subject_count integer;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS reference_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE designs DROP CONSTRAINT IF EXISTS designs_subject_count_check;
ALTER TABLE designs ADD CONSTRAINT designs_subject_count_check
  CHECK (subject_count IS NULL OR subject_count IN (1, 2));
