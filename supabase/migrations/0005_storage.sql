-- =============================================================================
-- 0005_storage.sql
-- Storage bucket for evidence files + RLS policies
-- =============================================================================

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  52428800, -- 50 MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS on storage objects
CREATE POLICY "org_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence' AND
    (storage.foldername(name))[1] = (
      SELECT organisation_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidence' AND
    (storage.foldername(name))[1] = (
      SELECT organisation_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'evidence' AND
    (storage.foldername(name))[1] = (
      SELECT organisation_id::text FROM public.users WHERE id = auth.uid()
    )
  );
