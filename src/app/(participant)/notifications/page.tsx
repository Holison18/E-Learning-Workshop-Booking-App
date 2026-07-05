'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { Card, CardContent } from '@/components/ui/card/Card';
import { BellOff, Megaphone, Trash2 } from 'lucide-react';
import styles from './Notifications.module.css';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  sent_at: string;
};

import { getSystemNotifications, dismissNotification, getDismissedNotifications } from '@/lib/notifications';

export default function ParticipantNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      if (!user) return;

      const { data: bookings } = await supabase
        .from('bookings')
        .select('workshop_id')
        .eq('participant_id', user.id);

      const workshopGroups = (bookings || []).map((b) => `workshop_${b.workshop_id}`);
      const recipientGroups = ['All Participants', ...workshopGroups];

      const dismissed = await getDismissedNotifications(user);

      let query = supabase
        .from('broadcasts')
        .select('id, title, message, sent_at')
        .in('recipient_group', recipientGroups)
        .order('sent_at', { ascending: false });

      if (dismissed.length > 0) {
        query = query.filter('id', 'not.in', `(${dismissed.map(d => `"${d}"`).join(',')})`);
      }

      const { data } = await query;

      const broadcasts = (data as NotificationItem[]) || [];
      let sysNotifications = await getSystemNotifications(user, false);
      sysNotifications = sysNotifications.filter(n => !dismissed.includes(n.id));
      
      const merged = [...broadcasts, ...sysNotifications].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

      setNotifications(merged);
      setLoading(false);
    }
    fetchNotifications();
  }, [user]);

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await dismissNotification(user!, id);
  };

  if (loading) return <PageLoader label="Loading notifications..." />;

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1>Notifications</h1>
        <p className={styles.subtitle}>Announcements from the E-Learning Week organizers.</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className={styles.emptyState}>
            <BellOff size={40} className={styles.emptyIcon} />
            <p>You&apos;re all caught up. No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.list}>
          {notifications.map((item) => (
            <Card key={item.id}>
              <CardContent className={styles.item}>
                <div className={styles.itemIcon}>
                  <Megaphone size={18} />
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={styles.itemDate}>
                        {new Date(item.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button onClick={() => handleDelete(item.id)} className={styles.deleteButton} title="Delete notification">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className={styles.itemMessage}>{item.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
