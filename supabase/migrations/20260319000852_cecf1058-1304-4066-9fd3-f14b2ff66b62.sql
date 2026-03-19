-- Create Kansas City, MO region
INSERT INTO regions (name, zip_prefix, status)
VALUES ('Kansas City, MO', '641', 'active')
ON CONFLICT DO NOTHING;

-- Assign Diontae Scott to the new region
UPDATE craver_applications
SET region_id = (SELECT id FROM regions WHERE zip_prefix = '641' LIMIT 1)
WHERE id = '20bbdca3-8237-49ee-97e9-f4e3cd429b32';