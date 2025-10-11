-- Add image_url column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create a storage bucket for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for project images
CREATE POLICY "Anyone can view project images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own project images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own project images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
