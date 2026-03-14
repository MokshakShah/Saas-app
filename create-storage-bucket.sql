-- Create the workspace-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos', 
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Create RLS policies for the bucket
CREATE POLICY "Allow authenticated users to upload workspace logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'workspace-logos');

CREATE POLICY "Allow public access to workspace logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'workspace-logos');

CREATE POLICY "Allow users to update their workspace logos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'workspace-logos');

CREATE POLICY "Allow users to delete their workspace logos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'workspace-logos');