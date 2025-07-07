-- COMPLETE DATABASE RESET AND REBUILD
-- This script will completely reset the database and rebuild everything from scratch
-- WARNING: This will delete ALL existing data!

-- Step 1: Drop all existing tables and related objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_preferences() CASCADE;
DROP FUNCTION IF EXISTS get_post_comment_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_comment_like_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_post_stats(UUID) CASCADE;

-- Drop all tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS reading_list CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Drop storage policies
DROP POLICY IF EXISTS "Images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Step 2: Create storage bucket and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images', 
  'images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Create storage policies
CREATE POLICY "Images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Step 3: Create all tables with proper structure
-- Categories table (no dependencies)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (length(trim(name)) > 0),
  slug TEXT UNIQUE NOT NULL CHECK (length(trim(slug)) > 0 AND slug ~ '^[a-z0-9-]+$'),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Profiles table (depends on auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name TEXT CHECK (length(trim(full_name)) > 0),
  avatar_url TEXT CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://'),
  bio TEXT CHECK (length(bio) <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')) NOT NULL,
  email_notifications BOOLEAN DEFAULT true NOT NULL,
  push_notifications BOOLEAN DEFAULT true NOT NULL,
  newsletter_subscription BOOLEAN DEFAULT true NOT NULL,
  privacy_profile_public BOOLEAN DEFAULT true NOT NULL,
  privacy_show_email BOOLEAN DEFAULT false NOT NULL,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'fil')) NOT NULL,
  timezone TEXT DEFAULT 'Asia/Manila' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Posts table (depends on profiles and categories)
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 200),
  slug TEXT UNIQUE NOT NULL CHECK (length(trim(slug)) > 0 AND slug ~ '^[a-z0-9-]+$' AND length(slug) <= 100),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  excerpt TEXT CHECK (length(excerpt) <= 500),
  cover_image_url TEXT CHECK (cover_image_url IS NULL OR cover_image_url ~ '^https?://'),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Likes table (depends on profiles and posts)
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Comments table (depends on profiles and posts)
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 2000),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Comment likes table (depends on profiles and comments)
CREATE TABLE comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, comment_id)
);

-- Reading list table (depends on profiles and posts)
CREATE TABLE reading_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Step 4: Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;

-- Step 5: Create comprehensive RLS policies
-- Profiles policies
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User preferences policies
CREATE POLICY "user_preferences_select_own" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_insert_own" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_preferences_update_own" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "posts_select_published_or_own" ON posts FOR SELECT USING (published = true OR auth.uid() = author_id);
CREATE POLICY "posts_insert_own" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Likes policies
CREATE POLICY "likes_select_all" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "comments_select_all" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_own" ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comments_delete_own" ON comments FOR DELETE USING (auth.uid() = author_id);

-- Comment likes policies
CREATE POLICY "comment_likes_select_all" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_insert_own" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_likes_delete_own" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Reading list policies
CREATE POLICY "reading_list_select_own" ON reading_list FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reading_list_insert_own" ON reading_list FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reading_list_delete_own" ON reading_list FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create optimized indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_posts_published_created ON posts(published, created_at DESC);
CREATE INDEX idx_posts_author_published ON posts(author_id, published);
CREATE INDEX idx_posts_category_published ON posts(category_id, published) WHERE published = true;
CREATE INDEX idx_posts_slug_published ON posts(slug, published) WHERE published = true;
CREATE INDEX idx_likes_post_user ON likes(post_id, user_id);
CREATE INDEX idx_likes_user_created ON likes(user_id, created_at DESC);
CREATE INDEX idx_comments_post_parent ON comments(post_id, parent_id);
CREATE INDEX idx_comments_author_created ON comments(author_id, created_at DESC);
CREATE INDEX idx_comments_parent_created ON comments(parent_id, created_at) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comment_likes_comment_user ON comment_likes(comment_id, user_id);
CREATE INDEX idx_reading_list_user_created ON reading_list(user_id, created_at DESC);
CREATE INDEX idx_reading_list_post_user ON reading_list(post_id, user_id);
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- Step 7: Grant proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 8: Create trigger functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = NOW();
    
    -- Create user preferences
    INSERT INTO public.user_preferences (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile/preferences for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 9: Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Step 10: Insert default categories
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
    ('History', 'history', 'Historical topics and discussions');

-- Step 11: Create profiles and preferences for existing users
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    au.created_at,
    au.updated_at
FROM auth.users au
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_preferences (user_id, created_at, updated_at)
SELECT 
    p.id,
    NOW(),
    NOW()
FROM profiles p
ON CONFLICT (user_id) DO NOTHING;

-- Step 12: Create helper functions
CREATE OR REPLACE FUNCTION get_post_stats(post_uuid UUID)
RETURNS TABLE(likes_count BIGINT, comments_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = post_uuid), 0)::BIGINT as likes_count,
        COALESCE((SELECT COUNT(*) FROM comments WHERE post_id = post_uuid), 0)::BIGINT as comments_count;
END;
$$;

-- Step 13: Update table statistics
ANALYZE profiles;
ANALYZE user_preferences;
ANALYZE posts;
ANALYZE likes;
ANALYZE comments;
ANALYZE comment_likes;
ANALYZE reading_list;
ANALYZE categories;

-- Step 14: Final verification
DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'user_preferences', 'posts', 'likes', 'comments', 'comment_likes', 'reading_list', 'categories');
    
    -- Check policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    IF table_count < 8 THEN
        RAISE EXCEPTION 'Not all required tables were created. Found: %', table_count;
    END IF;
    
    IF policy_count < 15 THEN
        RAISE EXCEPTION 'Not all required policies were created. Found: %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Database reset completed successfully!';
    RAISE NOTICE '📊 Tables created: %', table_count;
    RAISE NOTICE '🔒 Policies created: %', policy_count;
    RAISE NOTICE '⚡ Indexes created: %', index_count;
    RAISE NOTICE '🎯 Database is ready for production use!';
END $$;
