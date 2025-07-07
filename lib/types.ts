export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
}

export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  cover_image_url?: string
  author_id: string
  category_id?: string
  published: boolean
  created_at: string
  updated_at: string
  author?: Profile
  category?: Category
  likes_count?: number
  comments_count?: number
  is_liked?: boolean
  is_saved?: boolean
}

export interface Comment {
  id: string
  content: string
  author_id: string
  post_id: string
  parent_id?: string
  created_at: string
  updated_at: string
  author?: Profile
  replies?: Comment[]
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: "light" | "dark" | "system"
  email_notifications: boolean
  push_notifications: boolean
  newsletter_subscription: boolean
  privacy_profile_public: boolean
  privacy_show_email: boolean
  language: "en" | "fil"
  timezone: string
  created_at: string
  updated_at: string
}
