'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken, requestApi } from '@/lib/api';
import styles from './Dashboard.module.css';
import { ArrowRight, BookOpen, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatTime } from '@/lib/formatTime';

type Workshop = {
  id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  seats_booked: number;
  facilitator: string;
  facilitator_image_url?: string;
  location: string;
  image_url?: string;
  category?: string | null;
  status?: string | null;
};

type BookingRow = {
  id: string;
  workshop_id: string;
  workshops?: {
    date: string;
    start_time?: string;
    end_time?: string;
  } | null;
};

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ booked: 0, upcoming: 0 });
  const [nextWorkshop, setNextWorkshop] = useState<Workshop | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      try {
        const token = await getSessionToken();
        if (!token) {
          if (active) setLoading(false);
          return;
        }

        const [workshopsResponse, bookingsResponse] = await Promise.all([
          requestApi<{ message: string; user: unknown; result: Workshop[] }>('/api/dashboard', { token }),
          requestApi<{ data: BookingRow[] }>('/api/book', { token }),
        ]);

        const fetchedWorkshops: Workshop[] = workshopsResponse.result || [];
        const bookedRows: BookingRow[] = bookingsResponse.data || [];
        const upcomingCount = bookedRows.filter((booking: BookingRow) => booking.workshops && new Date(booking.workshops.date) > new Date()).length;
        const nextUpcoming = fetchedWorkshops
          .filter((workshop: Workshop) => new Date(workshop.date) >= new Date())
          .sort((left: Workshop, right: Workshop) => {
            const leftDate = new Date(`${left.date}T${left.start_time}`);
            const rightDate = new Date(`${right.date}T${right.start_time}`);
            return leftDate.getTime() - rightDate.getTime();
          })[0] || null;

        if (!active) return;

        setStats({
          booked: bookedRows.length,
          upcoming: upcomingCount,
        });
        setNextWorkshop(nextUpcoming);
      } catch (error) {
        console.error('Failed to load participant dashboard:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>Loading dashboard...</div>;
  }

  return (
    <div className="animate-fade-in">
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Welcome back, {firstName}</h1>
          <h2 className={styles.heroSubtitle}>Browse workshops by day, filter what matters, and manage your bookings here.</h2>
          <div className={styles.heroActions}>
            <Link href="/schedule" className={`${styles.btn} ${styles.buttonWhite}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Open Calendar <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
            </Link>
            <Link href="/bookings" className={`${styles.btn} ${styles.buttonDarkRed}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              View My Bookings
            </Link>
          </div>
        </div>
        <div className={styles.heroGraphic}>
          <div className={styles.graphicCircle}>
            <BookOpen size={64} className={styles.graphicIcon} strokeWidth={1.5} />
          </div>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div className={styles.statLabel}>Workshops Booked</div>
          <div className={styles.statValue}>{stats.booked}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
              <CalendarIcon size={20} />
            </div>
          </div>
          <div className={styles.statLabel}>Upcoming Sessions</div>
          <div className={styles.statValue}>{stats.upcoming}</div>
        </div>

      </section>

      <section className={styles.middleSection}>
        <div className={styles.cardPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Next Workshop</h3>
              <p className={styles.panelSubtitle}>A quick snapshot of your next upcoming session.</p>
            </div>
            <Link href="/schedule" className={styles.panelAction}>Open Calendar</Link>
          </div>

          {nextWorkshop ? (
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineIcon} style={{ backgroundColor: 'var(--primary-red)' }}>
                  <Clock size={16} />
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>{nextWorkshop.title}</div>
                  <div className={styles.timelineDesc}>
                    {new Date(nextWorkshop.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {formatTime(nextWorkshop.start_time)} · {nextWorkshop.location}
                  </div>
                  <div className={styles.timelineTime}>
                    {nextWorkshop.facilitator_image_url && (
                      <img src={nextWorkshop.facilitator_image_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.375rem' }} />
                    )}
                    Facilitator: {nextWorkshop.facilitator}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.timelineDesc}>No upcoming workshops found yet.</div>
          )}
        </div>

        <div className={styles.cardPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Quick Actions</h3>
              <p className={styles.panelSubtitle}>Jump to the calendar or your booking list.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/schedule" className={`${styles.btn} ${styles.buttonWhite}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Open Calendar
            </Link>
            <Link href="/bookings" className={`${styles.btn} ${styles.buttonDarkRed}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Manage Bookings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
