import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  sent_at: string;
};

function lastSeenKey(user: User) {
  return `knust_notifications_seen_${user.id}`;
}

export function getLastSeenNotifications(user: User): string {
  if (typeof window === 'undefined') return new Date(0).toISOString();
  return localStorage.getItem(lastSeenKey(user)) || new Date(0).toISOString();
}

export function markNotificationsSeen(user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(lastSeenKey(user), new Date().toISOString());
}

/** Participants only see broadcasts aimed at everyone or at workshops they've booked. */
async function getRelevantRecipientGroups(user: User): Promise<string[]> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('workshop_id')
    .eq('participant_id', user.id);

  return ['All Participants', ...(bookings || []).map((b) => `workshop_${b.workshop_id}`)];
}

/** Counts broadcasts relevant to this user (or all, for admins) sent since they last opened Notifications. */
export async function countUnreadNotifications(user: User, isAdmin: boolean): Promise<number> {
  const since = getLastSeenNotifications(user);

  if (isAdmin) {
    const { count } = await supabase
      .from('broadcasts')
      .select('id', { count: 'exact', head: true })
      .gt('sent_at', since);
    return count || 0;
  }

  const recipientGroups = await getRelevantRecipientGroups(user);
  const { count } = await supabase
    .from('broadcasts')
    .select('id', { count: 'exact', head: true })
    .in('recipient_group', recipientGroups)
    .gt('sent_at', since);

  return count || 0;
}

/** Fetches the most recent broadcasts relevant to this user, for the notification dropdown. */
export async function fetchRecentNotifications(user: User, isAdmin: boolean, limit = 5): Promise<NotificationItem[]> {
  if (isAdmin) {
    const { data } = await supabase
      .from('broadcasts')
      .select('id, title, message, sent_at')
      .order('sent_at', { ascending: false })
      .limit(limit);
    return (data as NotificationItem[]) || [];
  }

  const recipientGroups = await getRelevantRecipientGroups(user);
  const { data } = await supabase
    .from('broadcasts')
    .select('id, title, message, sent_at')
    .in('recipient_group', recipientGroups)
    .order('sent_at', { ascending: false })
    .limit(limit);

  return (data as NotificationItem[]) || [];
}
