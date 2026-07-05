'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { useToast } from '@/components/ui/toast/ToastProvider';
import { useConfirm } from '@/components/ui/confirm-dialog/ConfirmDialogProvider';
import { AddToCalendar } from '@/components/ui/add-to-calendar/AddToCalendar';
import { CalendarDays, Clock, MapPin, CheckCircle2, XCircle, Ticket, CalendarCheck } from 'lucide-react';
import { buildEventDescription, type CalendarEvent } from '@/lib/calendar';
import styles from './Bookings.module.css';

// Using QuickChart API for reliable QR code generation
const generateQRUrl = (data: string) => {
  return `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=200`;
};

type Booking = {
  id: string;
  checked_in: boolean;
  workshops: {
    title: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    category: string | null;
    facilitator: string | null;
  };
};

export default function MyBookings() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      if (!user) return;

      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          checked_in,
          workshops (
            title,
            description,
            date,
            start_time,
            end_time,
            location,
            category,
            facilitator
          )
        `)
        .eq('participant_id', user.id);

      if (data) {
        setBookings(data as unknown as Booking[]);
      }
      setLoading(false);
    }
    fetchBookings();
  }, [user]);

  const handleCancel = async (booking: Booking) => {
    const confirmed = await confirm({
      title: 'Cancel this booking?',
      message: `You'll give up your seat in "${booking.workshops?.title}". This can't be undone, but you can rebook later if seats are still available.`,
      confirmLabel: 'Cancel booking',
      danger: true,
    });
    if (!confirmed) return;

    setCancellingId(booking.id);
    // .select() after delete() so we get back the rows actually removed - if
    // this comes back empty with no error, RLS silently blocked the delete
    // (e.g. the "participants can cancel their own unchecked bookings" policy
    // isn't applied yet) and we must not pretend it worked.
    const { data, error } = await supabase.from('bookings').delete().eq('id', booking.id).select();
    setCancellingId(null);

    if (error) {
      toast.error('Failed to cancel booking: ' + error.message);
    } else if (!data || data.length === 0) {
      toast.error("Couldn't cancel this booking - you may not have permission to. Please contact support.");
    } else {
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      toast.success('Booking cancelled.');
    }
  };

  if (loading) return <PageLoader label="Loading your bookings..." />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = bookings.filter((b) => b.workshops && new Date(b.workshops.date) >= today);
  const past = bookings.filter((b) => b.workshops && new Date(b.workshops.date) < today);
  const checkedInCount = bookings.filter((b) => b.checked_in).length;

  const renderCard = (booking: Booking) => {
    const verificationUrl = `${window.location.origin}/verify/${booking.id}`;
    const qrUrl = generateQRUrl(verificationUrl);
    const calendarEvent: CalendarEvent = {
      uid: booking.id,
      title: booking.workshops?.title,
      location: booking.workshops?.location,
      description: buildEventDescription(booking.workshops || {}),
      date: booking.workshops?.date,
      startTime: booking.workshops?.start_time,
      endTime: booking.workshops?.end_time,
    };

    return (
      <Card key={booking.id} className={`animate-fade-in ${styles.card}`}>
        <CardContent className={styles.cardBody} style={{ padding: 0 }}>
          <img src={qrUrl} alt="Check-in QR Code" className={styles.qr} />
          <div className={styles.details}>
            {booking.workshops?.category && <span className={styles.category}>{booking.workshops.category.toUpperCase()}</span>}
            <h3 className={styles.title}>{booking.workshops?.title}</h3>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <CalendarDays size={14} aria-hidden="true" /> {booking.workshops?.date ? new Date(booking.workshops.date).toLocaleDateString() : '—'}
              </span>
              <span className={styles.metaItem}>
                <Clock size={14} aria-hidden="true" /> {booking.workshops?.start_time?.slice(0, 5)}
              </span>
              <span className={styles.metaItem}>
                <MapPin size={14} aria-hidden="true" /> {booking.workshops?.location}
              </span>
            </div>
            {booking.checked_in && (
              <Badge variant="success" className={styles.checkedInBadge}>
                <CheckCircle2 size={13} aria-hidden="true" /> Checked In
              </Badge>
            )}
          </div>
        </CardContent>

        <div className={`${styles.footer} no-print`}>
          {!booking.checked_in ? (
            <Button
              variant="ghost"
              onClick={() => handleCancel(booking)}
              disabled={cancellingId === booking.id}
              className={styles.cancelButton}
            >
              <XCircle size={16} />
              {cancellingId === booking.id ? 'Cancelling...' : 'Cancel booking'}
            </Button>
          ) : <span />}
          <AddToCalendar event={calendarEvent} />
        </div>
      </Card>
    );
  };

  return (
    <div>
      <div className={`${styles.header} no-print`}>
        <div className={styles.headerRow}>
          <div>
            <h1>My Bookings</h1>
            <p className={styles.subtitle}>View your schedule and generate your check-in QR codes.</p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>Print Schedule</Button>
        </div>

        {bookings.length > 0 && (
          <div className={styles.summaryRow}>
            <div className={styles.summaryChip}>
              <Ticket size={16} aria-hidden="true" />
              <span><strong>{bookings.length}</strong> total {bookings.length === 1 ? 'booking' : 'bookings'}</span>
            </div>
            <div className={styles.summaryChip}>
              <CalendarCheck size={16} aria-hidden="true" />
              <span><strong>{checkedInCount}</strong> checked in</span>
            </div>
          </div>
        )}
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className={styles.emptyState}>
            <p>You haven&apos;t booked any workshops yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className={styles.section}>
              <h2 className={`${styles.sectionHeading} no-print`}>
                Upcoming <span className={styles.sectionCount}>({upcoming.length})</span>
              </h2>
              <div className={styles.grid}>
                {upcoming.map(renderCard)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className={styles.section}>
              <h2 className={`${styles.sectionHeading} no-print`}>
                Past <span className={styles.sectionCount}>({past.length})</span>
              </h2>
              <div className={styles.grid}>
                {past.map(renderCard)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
