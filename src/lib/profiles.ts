import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {}
  return (
    (meta.full_name as string) ||
    (meta.name as string) ||
    [meta.given_name, meta.family_name].filter(Boolean).join(' ') ||
    user.email?.split('@')[0] ||
    'User'
  )
}

function avatarFromUser(user: User): string | null {
  const meta = user.user_metadata ?? {}
  return (meta.avatar_url as string) || (meta.picture as string) || null
}

/** Upsert auth user into public.profiles (email + Google). */
export async function ensureUserProfile(user: User): Promise<Profile> {
  const fallback: Profile = {
    id: user.id,
    email: user.email ?? '',
    full_name: displayNameFromUser(user),
    role: 'staff',
    avatar_url: avatarFromUser(user),
  }

  if (!supabase) return fallback

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: fallback.email,
        full_name: fallback.full_name,
        avatar_url: fallback.avatar_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id, email, full_name, role, avatar_url')
    .single()

  if (error || !data) {
    console.error('Failed to upsert profile:', error?.message)
    return fallback
  }

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: (data.role as UserRole) || 'staff',
    avatar_url: data.avatar_url,
  }
}
