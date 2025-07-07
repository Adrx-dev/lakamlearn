-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
  ('Technology', 'technology', 'Articles about technology and programming'),
  ('Literature', 'literature', 'Filipino and world literature discussions'),
  ('Study Tips', 'study-tips', 'Tips and tricks for effective studying'),
  ('Events', 'events', 'School and educational events'),
  ('Assignments', 'assignments', 'Assignment guidelines and help'),
  ('Photos', 'photos', 'Photo galleries and visual content');

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Create storage policy for images
CREATE POLICY "Images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
