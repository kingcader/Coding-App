import { createClient } from '@supabase/supabase-js';

// Supabase client for browser-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Supabase admin client for server-side operations (bypasses RLS)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
}

// Storage bucket name for project files
export const STORAGE_BUCKET = 'ai-app-builder';

// Helper to get storage path for a project file
export function getStoragePath(userId: string, projectId: string, filePath: string): string {
  return `${userId}/${projectId}/${filePath}`;
}
