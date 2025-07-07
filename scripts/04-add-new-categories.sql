-- Add the new categories
INSERT INTO categories (name, slug, description) VALUES
  ('Event', 'event', 'School events, activities, and announcements'),
  ('Assignment', 'assignment', 'Assignment guidelines, submissions, and academic tasks'),
  ('Memories', 'memories', 'Memorable moments, experiences, and reflections from Grade XI');

-- Update existing categories if needed
UPDATE categories SET description = 'Technology, programming, and digital learning' WHERE slug = 'technology';
UPDATE categories SET description = 'Filipino and world literature discussions and analysis' WHERE slug = 'literature';
UPDATE categories SET description = 'Study techniques, tips, and academic strategies' WHERE slug = 'study-tips';
UPDATE categories SET description = 'Photo galleries, visual content, and memorable images' WHERE slug = 'photos';
