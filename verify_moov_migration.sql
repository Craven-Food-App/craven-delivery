-- Verify Moov migration columns were created
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'restaurants' 
  AND column_name LIKE 'moov%'
ORDER BY column_name;

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'restaurants'
  AND indexname LIKE '%moov%';

