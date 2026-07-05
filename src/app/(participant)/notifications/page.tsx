'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { Card, CardContent } from '@/components/ui/card/Card';
import { BellOff, Megaphone } from 'lucide-react';
import styles from './Notifications.module.css';

type Broadcast = {
  id: string;
  title: string;
  message: string;
  sent_at: string;
};

export default function ParticipantNotificationsPage() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
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

      const { data } = await supabase
        .from('broadcasts')
        .select('id, title, message, sent_at')
        .in('recipient_group', recipientGroups)
        .order('sent_at', { ascending: false });

      setBroadcasts((data as Broadcast[]) || []);
      setLoading(false);
    }
    fetchNotifications();
  }, [user]);

  if (loading) return <PageLoader label="Loading notifications..." />;

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1>Notifications</h1>
        <p className={styles.subtitle}>Announcements from the E-Learning Week organizers.</p>
      </div>

      {broadcasts.length === 0 ? (
        <Card>
          <CardContent className={styles.emptyState}>
            <BellOff size={40} className={styles.emptyIcon} />
            <p>You&apos;re all caught up. No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.list}>
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <CardContent className={styles.item}>
                <div className={styles.itemIcon}>
                  <Megaphone size={18} />
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>{broadcast.title}</h3>
                    <span className={styles.itemDate}>
                      {new Date(broadcast.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className={styles.itemMessage}>{broadcast.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
