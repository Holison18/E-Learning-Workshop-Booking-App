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

export async function dismissNotification(user: User, notificationId: string) {
  try {
    await supabase.from('dismissed_notifications').insert({
      user_id: user.id,
      notification_id: notificationId,
    });
  } catch (e) {
    console.error('Failed to dismiss notification:', e);
  }
}

export async function getDismissedNotifications(user: User): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('dismissed_notifications')
      .select('notification_id')
      .eq('user_id', user.id);
    if (error) throw error;
    return (data || []).map((d: any) => d.notification_id);
  } catch (e) {
    console.warn('Failed to get dismissed notifications (table might not exist yet):', e);
    return [];
  }
}

export async function getSystemNotifications(user: User, isAdmin: boolean): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];
  const now = new Date();
  const nowMs = now.getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  if (isAdmin) {
    const [bookingsRes, workshopsRes] = await Promise.all([
      supabase.from('bookings').select(`
        id, 
        booked_at, 
        participants(first_name, last_name), 
        workshops(title)
      `).order('booked_at', { ascending: false }).limit(50),
      supabase.from('workshops').select('id, title, date, start_time').eq('status', 'published')
    ]);

    if (bookingsRes.data) {
      bookingsRes.data.forEach((b: any) => {
        notifications.push({
          id: `sys-book-${b.id}`,
          title: 'New Booking',
          message: `${b.participants?.first_name} ${b.participants?.last_name} booked ${b.workshops?.title}`,
          sent_at: b.booked_at
        });
      });
    }

    if (workshopsRes.data) {
      workshopsRes.data.forEach((w) => {
        const eventDate = new Date(`${w.date}T${w.start_time}`);
        const timeDiff = eventDate.getTime() - nowMs;
        if (timeDiff > 0 && timeDiff <= 24 * ONE_HOUR_MS) {
          notifications.push({
            id: `sys-admin-1d-${w.id}`,
            title: 'Workshop Tomorrow',
            message: `"${w.title}" is scheduled to happen tomorrow.`,
            sent_at: new Date(eventDate.getTime() - 24 * ONE_HOUR_MS).toISOString()
          });
        }
      });
    }
  } else {
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id,
        workshops (
          id, title, date, start_time, end_time
        )
      `)
      .eq('participant_id', user.id);

    if (bookings) {
      bookings.forEach((b: any) => {
        const w = b.workshops;
        if (!w) return;
        const eventDate = new Date(`${w.date}T${w.start_time}`);
        const eventEnd = new Date(`${w.date}T${w.end_time}`);
        const timeDiff = eventDate.getTime() - nowMs;
        const eventEnded = nowMs > eventEnd.getTime();

        if (eventEnded) return;

        if (timeDiff > 0 && timeDiff <= ONE_HOUR_MS) {
          notifications.push({
            id: `sys-1h-${w.id}`,
            title: 'Workshop Starting Soon',
            message: `"${w.title}" is starting in less than an hour!`,
            sent_at: new Date(eventDate.getTime() - ONE_HOUR_MS).toISOString()
          });
        } else if (timeDiff > ONE_HOUR_MS && timeDiff <= TWO_DAYS_MS) {
          notifications.push({
            id: `sys-2d-${w.id}`,
            title: 'Upcoming Workshop Reminder',
            message: `"${w.title}" is happening in 2 days.`,
            sent_at: new Date(eventDate.getTime() - TWO_DAYS_MS).toISOString()
          });
        }
      });
    }
  }

  return notifications;
}

/** Counts broadcasts relevant to this user (or all, for admins) sent since they last opened Notifications. */
export async function countUnreadNotifications(user: User, isAdmin: boolean): Promise<number> {
  const since = getLastSeenNotifications(user);
  let count = 0;
  const dismissed = await getDismissedNotifications(user);

  if (isAdmin) {
    let query = supabase.from('broadcasts').select('id', { count: 'exact', head: true }).gt('sent_at', since);
    if (dismissed.length > 0) query = query.filter('id', 'not.in', `(${dismissed.map(d => `"${d}"`).join(',')})`);
    const { count: bCount } = await query;
    count += bCount || 0;
  } else {
    const recipientGroups = await getRelevantRecipientGroups(user);
    let query = supabase.from('broadcasts').select('id', { count: 'exact', head: true }).in('recipient_group', recipientGroups).gt('sent_at', since);
    if (dismissed.length > 0) query = query.filter('id', 'not.in', `(${dismissed.map(d => `"${d}"`).join(',')})`);
    const { count: bCount } = await query;
    count += bCount || 0;
  }

  const sys = await getSystemNotifications(user, isAdmin);
  const unreadSys = sys.filter(n => n.sent_at > since && !dismissed.includes(n.id)).length;
  return count + unreadSys;
}

/** Fetches the most recent broadcasts relevant to this user, for the notification dropdown. */
export async function fetchRecentNotifications(user: User, isAdmin: boolean, limit = 5): Promise<NotificationItem[]> {
  let broadcasts: NotificationItem[] = [];
  const dismissed = await getDismissedNotifications(user);
  
  if (isAdmin) {
    let query = supabase.from('broadcasts').select('id, title, message, sent_at').order('sent_at', { ascending: false }).limit(limit);
    if (dismissed.length > 0) query = query.filter('id', 'not.in', `(${dismissed.map(d => `"${d}"`).join(',')})`);
    const { data } = await query;
    broadcasts = (data as NotificationItem[]) || [];
  } else {
    const recipientGroups = await getRelevantRecipientGroups(user);
    let query = supabase.from('broadcasts').select('id, title, message, sent_at').in('recipient_group', recipientGroups).order('sent_at', { ascending: false }).limit(limit);
    if (dismissed.length > 0) query = query.filter('id', 'not.in', `(${dismissed.map(d => `"${d}"`).join(',')})`);
    const { data } = await query;
    broadcasts = (data as NotificationItem[]) || [];
  }

  let sys = await getSystemNotifications(user, isAdmin);
  sys = sys.filter(n => !dismissed.includes(n.id));
  
  const all = [...broadcasts, ...sys].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  
  return all.slice(0, limit);
}
