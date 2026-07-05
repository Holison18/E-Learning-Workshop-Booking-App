'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken, requestApi } from '@/lib/api';
import styles from '../dashboard/Dashboard.module.css';
import schedStyles from './Schedule.module.css';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { formatTime } from '@/lib/formatTime';

type WorkshopInfo = {
  title: string;
  date: string;
  start_time: string;
  location: string;
};

type BookingWithWorkshop = {
  id: string;
  approved: boolean;
  checked_in: boolean;
  workshops: WorkshopInfo;
};

export default function SchedulePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookingsByDate, setBookingsByDate] = useState<Map<string, BookingWithWorkshop[]>>(new Map());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  const selectedMonthLabel = useMemo(
    () =>
      calendarMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [calendarMonth]
  );

  const calendarWeeks = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const leadingDays = firstDay.getDay();
    const cells: Array<{ date: Date | null; key: string; inMonth: boolean }> = [];

    for (let i = 0; i < leadingDays; i += 1) {
      cells.push({ date: null, key: `pad-start-${i}`, inMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({
        date,
        key: date.toISOString().slice(0, 10),
        inMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, key: `pad-end-${cells.length}`, inMonth: false });
    }

    const weeks: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
  }, [calendarMonth]);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await getSessionToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const bookingsResponse = await requestApi<{ data: BookingWithWorkshop[] }>('/api/book', { token });
        const myBookings = bookingsResponse.data || [];

        const byDate = new Map<string, BookingWithWorkshop[]>();
        myBookings.forEach((booking) => {
          const date = booking.workshops?.date;
          if (!date) return;
          const existing = byDate.get(date) || [];
          existing.push(booking);
          byDate.set(date, existing);
        });

        setBookingsByDate(byDate);
      } catch (error) {
        console.error('Failed to load schedule:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const bookedDates = useMemo(() => new Set(bookingsByDate.keys()), [bookingsByDate]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>Loading schedule...</div>;
  }

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="animate-fade-in">
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Schedule Calendar</h1>
          <h2 className={styles.heroSubtitle}>Welcome back, {firstName}. Booked dates and today are highlighted below.</h2>
        </div>
        <div className={styles.heroGraphic}>
          <div className={styles.graphicCircle}>
            <CalendarIcon size={64} className={styles.graphicIcon} strokeWidth={1.5} />
          </div>
        </div>
      </section>

      <section className={styles.calendarSection}>
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle} style={{ fontSize: '1.5rem' }}>Monthly Calendar</h3>
            <p className={styles.panelSubtitle}>Booked workshop dates are highlighted. Today is marked so you can orient quickly.</p>
          </div>
          <div className={styles.calendarNav}>
            <button
              type="button"
              className={styles.calendarNavButton}
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className={styles.calendarMonthLabel}>{selectedMonthLabel}</div>
            <button
              type="button"
              className={styles.calendarNavButton}
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className={styles.calendarLegend}>
          <span><span className={styles.legendSwatch} data-variant="booked" /> Booked workshop</span>
          <span><span className={styles.legendSwatch} data-variant="today" /> Today</span>
        </div>

        <div className={styles.calendarGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className={styles.calendarWeekday}>{day}</div>
          ))}

          {calendarWeeks.flat().map((cell) => {
            const dateKey = cell.date ? cell.key : '';
            const isToday = dateKey === todayKey;
            const hasBooking = Boolean(dateKey && bookedDates.has(dateKey));
            const dayBookings = dateKey ? bookingsByDate.get(dateKey) : undefined;

            return (
              <div
                key={cell.key}
                className={[
                  styles.calendarDay,
                  schedStyles.cell,
                  !cell.inMonth ? styles.calendarDayMuted : '',
                  hasBooking ? styles.calendarDayBooked : '',
                  isToday ? styles.calendarDayToday : '',
                ].filter(Boolean).join(' ')}
              >
                <span className={styles.calendarDayNumber}>{cell.date ? cell.date.getDate() : ''}</span>
                {cell.inMonth && hasBooking && <span className={styles.calendarDot} />}
                {cell.inMonth && isToday && <span className={styles.calendarBadge}>Today</span>}
                {cell.inMonth && hasBooking && <span className={styles.calendarHint}>Booked</span>}

                {cell.inMonth && hasBooking && dayBookings && (
                  <div className={schedStyles.tooltip}>
                    {dayBookings.map((b) => (
                      <div key={b.id} className={schedStyles.tooltipItem}>
                        <div className={schedStyles.tooltipTitle}>{b.workshops.title}</div>
                        <div className={schedStyles.tooltipInfo}>
                          <span><Clock size={12} /> {formatTime(b.workshops.start_time)} - {formatTime(b.workshops.end_time)}</span>
                          <span><MapPin size={12} /> {b.workshops.location}</span>
                        </div>
                        <div className={schedStyles.tooltipStatus}>
                          {b.approved ? 'Approved' : 'Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
