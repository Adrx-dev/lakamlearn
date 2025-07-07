-- Final comprehensive database fixes to eliminate all errors (Transaction-safe version)

-- Ensure all tables exist with proper structure and constraints
DO $$ 
BEGIN
    -- Create profiles table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
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

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to recreate them properly
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
    
    -- Drop all policies on posts
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'posts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON posts';
    END LOOP;
    
    -- Drop all policies on likes
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'likes') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON likes';
    END LOOP;
    
    -- Drop all policies on comments
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON comments';
    END LOOP;
    
    -- Drop all policies on reading_list
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'reading_list') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON reading_list';
    END LOOP;
END $$;

-- Create comprehensive RLS policies
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

-- Grant proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Create optimized indexes (without CONCURRENTLY for transaction safety)
CREATE INDEX IF NOT EXISTS idx_posts_published_created ON posts(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_published ON posts(author_id, published);
CREATE INDEX IF NOT EXISTS idx_posts_category_published ON posts(category_id, published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_posts_slug_published ON posts(slug, published) WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_likes_post_user ON likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_created ON likes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_parent ON comments(post_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_created ON comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_created ON comments(parent_id, created_at) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reading_list_user_created ON reading_list(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_list_post_user ON reading_list(post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Insert default categories with conflict handling
INSERT INTO categories (name, slug, description) VALUES
    ('Technology', 'technology', 'Articles about technology and programming'),
    ('Literature', 'literature', 'Filipino and world literature discussions'),
    ('Study Tips', 'study-tips', 'Tips and tricks for effective studying'),
    ('Events', 'events', 'School and educational events'),
    ('Assignments', 'assignments', 'Assignment guidelines and help'),
    ('Photos', 'photos', 'Photo galleries and visual content'),
    ('Event', 'event', 'School events, activities, and announcements'),
    ('Assignment', 'assignment', 'Assignment guidelines, submissions, and academic tasks'),
    ('Memories', 'memories', 'Memorable moments, experiences, and reflections from Grade XI')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Create or replace the trigger function for new users with error handling
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
        -- Profile already exists, update it
        UPDATE public.profiles 
        SET 
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
            updated_at = NOW()
        WHERE id = NEW.id;
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Create trigger with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users who don't have one
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

-- Create helper functions for better performance
CREATE OR REPLACE FUNCTION get_post_stats(post_uuid UUID)
RETURNS TABLE(likes_count BIGINT, comments_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = post_uuid), 0) as likes_count,
        COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = post_uuid), 0) as comments_count;
END;
$$;

-- Analyze tables for better query planning
ANALYZE profiles;
ANALYZE posts;
ANALYZE likes;
ANALYZE comments;
ANALYZE reading_list;
ANALYZE categories;

-- Final verification
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name IN ('profiles', 'posts', 'likes', 'comments', 'reading_list', 'categories');
    
    IF table_count < 6 THEN
        RAISE EXCEPTION 'Not all required tables were created successfully';
    END IF;
    
    RAISE NOTICE 'Database setup completed successfully. All % tables are ready.', table_count;
END $$;
