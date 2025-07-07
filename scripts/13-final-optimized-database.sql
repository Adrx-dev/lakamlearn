-- Final optimized database setup (Transaction-safe version)
-- This script fixes all issues and creates an optimized, production-ready database

-- Step 1: Ensure all tables exist with proper structure
DO $$ 
BEGIN
    -- Create profiles table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Create categories table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories') THEN
        CREATE TABLE categories (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Create posts table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'posts') THEN
        CREATE TABLE posts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT NOT NULL,
            excerpt TEXT,
            cover_image_url TEXT,
            author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
            published BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Create likes table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'likes') THEN
        CREATE TABLE likes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, post_id)
        );
    END IF;

    -- Create comments table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
        CREATE TABLE comments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            content TEXT NOT NULL CHECK (length(trim(content)) > 0),
            author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
            parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Create reading_list table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reading_list') THEN
        CREATE TABLE reading_list (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, post_id)
        );
    END IF;
END $$;

-- Step 2: Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop all existing policies to recreate them
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'posts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON posts';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'likes') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON likes';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON comments';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'reading_list') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON reading_list';
    END LOOP;
END $$;

-- Step 4: Create optimized RLS policies
-- Profiles policies
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "posts_select_policy" ON posts FOR SELECT USING (published = true OR auth.uid() = author_id);
CREATE POLICY "posts_insert_policy" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update_policy" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete_policy" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Likes policies
CREATE POLICY "likes_select_policy" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_policy" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_policy" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "comments_select_policy" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_policy" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_policy" ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comments_delete_policy" ON comments FOR DELETE USING (auth.uid() = author_id);

-- Reading list policies
CREATE POLICY "reading_list_select_policy" ON reading_list FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reading_list_insert_policy" ON reading_list FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reading_list_delete_policy" ON reading_list FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Create basic indexes (without CONCURRENTLY for transaction safety)
CREATE INDEX IF NOT EXISTS idx_posts_published_created ON posts(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_reading_list_user_id ON reading_list(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_post_id ON reading_list(post_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Step 6: Grant proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 7: Insert default categories
INSERT INTO categories (name, slug, description) VALUES
    ('Technology', 'technology', 'Articles about technology and programming'),
    ('Literature', 'literature', 'Filipino and world literature discussions'),
    ('Study Tips', 'study-tips', 'Tips and tricks for effective studying'),
    ('Events', 'events', 'School and educational events'),
    ('Assignments', 'assignments', 'Assignment guidelines and help'),
    ('Photos', 'photos', 'Photo galleries and visual content'),
    ('Memories', 'memories', 'Memorable moments and experiences from Grade XI'),
    ('Science', 'science', 'Science topics and experiments'),
    ('Mathematics', 'mathematics', 'Math problems, solutions, and tutorials'),
    ('History', 'history', 'Historical topics and discussions')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Step 8: Create optimized functions for better performance
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            NOW(),
            NOW()
        );
    EXCEPTION WHEN unique_violation THEN
        UPDATE public.profiles 
        SET 
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
            updated_at = NOW()
        WHERE id = NEW.id;
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Step 9: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Step 10: Create profiles for existing users
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 11: Create lightweight helper functions
CREATE OR REPLACE FUNCTION get_post_stats(post_uuid UUID)
RETURNS TABLE(likes_count BIGINT, comments_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = post_uuid), 0) as likes_count,
        COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = post_uuid), 0) as comments_count;
END;
$$;

-- Step 12: Create simple view for post statistics (lightweight alternative to materialized view)
CREATE OR REPLACE VIEW post_stats_view AS
SELECT 
    p.id as post_id,
    COUNT(DISTINCT l.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id;

-- Step 13: Analyze tables for better query planning
ANALYZE profiles;
ANALYZE posts;
ANALYZE likes;
ANALYZE comments;
ANALYZE reading_list;
ANALYZE categories;

-- Step 14: Final verification and success message
DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'posts', 'likes', 'comments', 'reading_list', 'categories');
    
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'posts', 'likes', 'comments', 'reading_list', 'categories');
    
    IF table_count < 6 THEN
        RAISE EXCEPTION 'Not all required tables were created. Found: %', table_count;
    END IF;
    
    RAISE NOTICE '✅ Final database setup completed successfully!';
    RAISE NOTICE '📊 Tables: % | Policies: % | Indexes: %', table_count, policy_count, index_count;
    RAISE NOTICE '🚀 Database is optimized and ready for production!';
END $$;
