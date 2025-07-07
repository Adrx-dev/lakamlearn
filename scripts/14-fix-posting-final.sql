-- Final database optimization script without transaction conflicts
-- This script fixes all posting issues and optimizes performance

-- Drop existing problematic indexes first
DROP INDEX IF EXISTS idx_posts_published_created;
DROP INDEX IF EXISTS idx_posts_author_published;
DROP INDEX IF EXISTS idx_posts_category_published;
DROP INDEX IF EXISTS idx_likes_user_post;
DROP INDEX IF EXISTS idx_comments_post_created;
DROP INDEX IF EXISTS idx_reading_list_user_post;

-- Create optimized indexes (without CONCURRENTLY to avoid transaction issues)
CREATE INDEX idx_posts_published_created ON posts(published, created_at DESC) WHERE published = true;
CREATE INDEX idx_posts_author_published ON posts(author_id, published, created_at DESC);
CREATE INDEX idx_posts_category_published ON posts(category_id, published, created_at DESC) WHERE category_id IS NOT NULL;
CREATE INDEX idx_posts_slug ON posts(slug) WHERE published = true;

-- Optimize likes table
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_post ON likes(user_id, post_id);

-- Optimize comments table  
CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_author ON comments(author_id);

-- Optimize reading list
CREATE INDEX idx_reading_list_user ON reading_list(user_id, created_at DESC);
CREATE INDEX idx_reading_list_post ON reading_list(post_id);
CREATE INDEX idx_reading_list_user_post ON reading_list(user_id, post_id);

-- Create a simple function to get post stats efficiently
CREATE OR REPLACE FUNCTION get_post_stats(post_id_param UUID)
RETURNS TABLE(likes_count BIGINT, comments_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = post_id_param), 0) as likes_count,
    COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = post_id_param), 0) as comments_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Ensure all tables have proper constraints
ALTER TABLE posts 
  ADD CONSTRAINT posts_title_not_empty CHECK (length(trim(title)) > 0),
  ADD CONSTRAINT posts_content_not_empty CHECK (length(trim(content)) > 0),
  ADD CONSTRAINT posts_slug_not_empty CHECK (length(trim(slug)) > 0);

-- Update table statistics for better query planning
ANALYZE posts;
ANALYZE likes;
ANALYZE comments;
ANALYZE reading_list;
ANALYZE profiles;
ANALYZE categories;

-- Grant necessary permissions
GRANT SELECT ON posts TO anon, authenticated;
GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON likes TO anon, authenticated;
GRANT SELECT ON comments TO anon, authenticated;

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
CREATE POLICY "Users can create their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);

-- Optimize database settings for better performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Create a simple view for published posts with basic stats
CREATE OR REPLACE VIEW published_posts_with_stats AS
SELECT 
  p.*,
  pr.full_name as author_name,
  pr.avatar_url as author_avatar,
  c.name as category_name,
  c.slug as category_slug,
  COALESCE(l.likes_count, 0) as likes_count,
  COALESCE(cm.comments_count, 0) as comments_count
FROM posts p
LEFT JOIN profiles pr ON p.author_id = pr.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as likes_count 
  FROM likes 
  GROUP BY post_id
) l ON p.id = l.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as comments_count 
  FROM comments 
  GROUP BY post_id
) cm ON p.id = cm.post_id
WHERE p.published = true;

-- Grant access to the view
GRANT SELECT ON published_posts_with_stats TO anon, authenticated;
