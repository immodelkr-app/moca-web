-- 1. Create the class-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('class-images', 'class-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if any (to prevent errors when re-running)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- 3. Create policies for the class-images bucket
-- Allow public read access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'class-images' );

-- Allow public upload
CREATE POLICY "Public Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'class-images' );

-- Allow public update
CREATE POLICY "Public Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'class-images' );

-- Allow public delete
CREATE POLICY "Public Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'class-images' );
