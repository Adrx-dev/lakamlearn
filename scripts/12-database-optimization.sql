-- Database optimization and performance improvements

-- Drop existing indexes and recreate optimized ones
DROP INDEX IF EXISTS idx_posts_published_created;
DROP INDEX IF EXISTS idx_posts_author_published;
DROP INDEX IF EXISTS idx_posts_category_published;
DROP INDEX IF EXISTS idx_posts_slug_published;
DROP INDEX IF EXISTS idx_likes_post_user;
DROP INDEX IF EXISTS idx_likes_user_created;
DROP INDEX IF EXISTS idx_comments_post_parent;
DROP INDEX IF EXISTS idx_comments_author_created;
DROP INDEX IF EXISTS idx_reading_list_user_created;

-- Create optimized composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_published_created_desc ON posts(published, created_at DESC) WHERE published = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_created_desc ON posts(author_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_category_published_created ON posts(category_id, published, created_at DESC) WHERE published = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_slug_hash ON posts USING hash(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_post_created ON likes(post_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reading_list_user_post ON reading_list(user_id, post_id);

-- Create materialized view for post statistics (for better performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS post_stats AS
SELECT 
    p.id as post_id,
    COUNT(DISTINCT l.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_stats_post_id ON post_stats(post_id);

-- Create function to refresh post stats
CREATE OR REPLACE FUNCTION refresh_post_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY post_stats;
END;
$$;

-- Create optimized function for getting posts with stats
CREATE OR REPLACE FUNCTION get_posts_with_stats(
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0,
    published_only BOOLEAN DEFAULT true,
    author_filter UUID DEFAULT NULL,
    category_filter UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    slug TEXT,
    content TEXT,
    excerpt TEXT,
    cover_image_url TEXT,
    author_id UUID,
    category_id UUID,
    published BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    author_name TEXT,
    author_email TEXT,
    author_avatar_url TEXT,
    category_name TEXT,
    category_slug TEXT,
    likes_count BIGINT,
    comments_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.content,
        p.excerpt,
        p.cover_image_url,
        p.author_id,
        p.category_id,
        p.published,
        p.created_at,
        p.updated_at,
        pr.full_name as author_name,
        pr.email as author_email,
        pr.avatar_url as author_avatar_url,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(ps.likes_count, 0) as likes_count,
        COALESCE(ps.comments_count, 0) as comments_count
    FROM posts p
    LEFT JOIN profiles pr ON p.author_id = pr.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN post_stats ps ON p.id = ps.post_id
    WHERE 
        (NOT published_only OR p.published = true)
        AND (author_filter IS NULL OR p.author_id = author_filter)
        AND (category_filter IS NULL OR p.category_id = category_filter)
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Create function to get single post with stats
CREATE OR REPLACE FUNCTION get_post_by_slug(post_slug TEXT)
RETURNS TABLE(
    id UUID,
    title TEXT,
    slug TEXT,
    content TEXT,
    excerpt TEXT,
    cover_image_url TEXT,
    author_id UUID,
    category_id UUID,
    published BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    author_name TEXT,
    author_email TEXT,
    author_avatar_url TEXT,
    author_bio TEXT,
    category_name TEXT,
    category_slug TEXT,
    likes_count BIGINT,
    comments_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.content,
        p.excerpt,
        p.cover_image_url,
        p.author_id,
        p.category_id,
        p.published,
        p.created_at,
        p.updated_at,
        pr.full_name as author_name,
        pr.email as author_email,
        pr.avatar_url as author_avatar_url,
        pr.bio as author_bio,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(ps.likes_count, 0) as likes_count,
        COALESCE(ps.comments_count, 0) as comments_count
    FROM posts p
    LEFT JOIN profiles pr ON p.author_id = pr.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN post_stats ps ON p.id = ps.post_id
    WHERE p.slug = post_slug AND p.published = true;
END;
$$;

-- Create trigger to refresh post stats when likes/comments change
CREATE OR REPLACE FUNCTION trigger_refresh_post_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh stats in background
    PERFORM pg_notify('refresh_post_stats', '');
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic stats refresh
DROP TRIGGER IF EXISTS likes_stats_trigger ON likes;
CREATE TRIGGER likes_stats_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_post_stats();

DROP TRIGGER IF EXISTS comments_stats_trigger ON comments;
CREATE TRIGGER comments_stats_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_post_stats();

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW post_stats;

-- Optimize database settings for better performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Create connection pooling optimization
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Analyze all tables for query optimization
ANALYZE profiles;
ANALYZE posts;
ANALYZE likes;
ANALYZE comments;
ANALYZE reading_list;
ANALYZE categories;
ANALYZE user_preferences;
