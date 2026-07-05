import type { User } from '@supabase/supabase-js';

/**
 * Resolves a display first/last name from whatever the auth provider gave us.
 * Email/password signups store first_name/last_name directly (see register page).
 * Google OAuth only gives full_name/name, so that's split as a fallback before
 * ever falling back to the email prefix.
 */
export function getFirstLastName(user: User | null | undefined): { firstName: string; lastName: string } {
  const metadata = user?.user_metadata || {};

  if (metadata.first_name) {
    return { firstName: metadata.first_name, lastName: metadata.last_name || '' };
  }

  const fullName: string | undefined = metadata.full_name || metadata.name;
  if (fullName) {
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    return { firstName, lastName: rest.join(' ') };
  }

  return { firstName: user?.email?.split('@')[0] || 'User', lastName: '' };
}

export function getFirstName(user: User | null | undefined): string {
  return getFirstLastName(user).firstName;
}
