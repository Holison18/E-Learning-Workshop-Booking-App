'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { AddToCalendar } from '@/components/ui/add-to-calendar/AddToCalendar';
import { MapPin, User, CalendarX, Download, CalendarDays, Clock3 } from 'lucide-react';
import { downloadIcsFile, buildEventDescription, type CalendarEvent } from '@/lib/calendar';
import Link from 'next/link';
import styles from './Schedule.module.css';

type ScheduleEntry = {
  id: string;
  checked_in: boolean;
  workshops: {
    title: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    facilitator: string | null;
    category: string | null;
  } | null;
};

function formatDuration(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
}

export default function SchedulePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedule() {
      if (!user) return;

      const { data } = await supabase
        .from('bookings')
        .select('id, checked_in, workshops (title, description, date, start_time, end_time, location, facilitator, category)')
        .eq('participant_id', user.id);

      setEntries((data as unknown as ScheduleEntry[]) || []);
      setLoading(false);
    }
    fetchSchedule();
  }, [user]);

  if (loading) return <PageLoader label="Loading your schedule..." />;

  const withWorkshop = entries.filter((entry) => entry.workshops);
  const byDate = new Map<string, ScheduleEntry[]>();
  withWorkshop.forEach((entry) => {
    const date = entry.workshops!.date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(entry);
  });

  const sortedDates = Array.from(byDate.keys()).sort();
  sortedDates.forEach((date) => {
    byDate.get(date)!.sort((a, b) => a.workshops!.start_time.localeCompare(b.workshops!.start_time));
  });

  const toCalendarEvent = (entry: ScheduleEntry): CalendarEvent => ({
    uid: entry.id,
    title: entry.workshops!.title,
    location: entry.workshops!.location || undefined,
    description: buildEventDescription(entry.workshops!),
    date: entry.workshops!.date,
    startTime: entry.workshops!.start_time,
    endTime: entry.workshops!.end_time,
  });

  const handleExportAll = () => {
    downloadIcsFile('my-knust-elearning-schedule', withWorkshop.map(toCalendarEvent));
  };

  const now = new Date();
  const nextEntry = withWorkshop
    .filter((e) => new Date(`${e.workshops!.date}T${e.workshops!.start_time}`) > now)
    .sort((a, b) => `${a.workshops!.date}T${a.workshops!.start_time}`.localeCompare(`${b.workshops!.date}T${b.workshops!.start_time}`))[0];

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1>My Schedule</h1>
            <p className={styles.subtitle}>Your personal itinerary across the E-Learning Week, day by day.</p>
          </div>
          {withWorkshop.length > 0 && (
            <Button variant="outline" onClick={handleExportAll}>
              <Download size={16} style={{ marginRight: '0.5rem' }} /> Export All (.ics)
            </Button>
          )}
        </div>

        {withWorkshop.length > 0 && (
          <div className={styles.summaryRow}>
            <div className={styles.summaryChip}>
              <CalendarDays size={16} aria-hidden="true" />
              <span><strong>{withWorkshop.length}</strong> {withWorkshop.length === 1 ? 'session' : 'sessions'}</span>
            </div>
            <div className={styles.summaryChip}>
              <Clock3 size={16} aria-hidden="true" />
              <span><strong>{sortedDates.length}</strong> {sortedDates.length === 1 ? 'day' : 'days'}</span>
            </div>
            {nextEntry && (
              <div className={styles.summaryChip}>
                <span className={styles.summaryChipHighlight}>
                  Next: {nextEntry.workshops!.title} · {new Date(nextEntry.workshops!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className={styles.emptyState}>
            <CalendarX size={40} className={styles.emptyIcon} />
            <p>You haven&apos;t booked any workshops yet.</p>
            <Link href="/dashboard" className={styles.emptyLink}>Browse workshops</Link>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.days}>
          {sortedDates.map((date) => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });
            const dayEntries = byDate.get(date)!;

            return (
              <section key={date} className={styles.day}>
                <div className={styles.dayHeadingRow}>
                  <h2 className={styles.dayHeading}>{formattedDate}</h2>
                  <span className={styles.dayCount}>{dayEntries.length} {dayEntries.length === 1 ? 'session' : 'sessions'}</span>
                </div>
                <div className={styles.timeline}>
                  {dayEntries.map((entry) => {
                    const ws = entry.workshops!;
                    const duration = formatDuration(ws.start_time, ws.end_time);
                    return (
                      <div key={entry.id} className={styles.timelineItem}>
                        <div className={styles.timeColumn}>
                          <span className={styles.timeStart}>{ws.start_time.slice(0, 5)}</span>
                          <span className={styles.timeEnd}>{ws.end_time.slice(0, 5)}</span>
                        </div>
                        <div className={styles.timelineMarker} aria-hidden="true" />
                        <Card className={styles.entryCard}>
                          <CardContent className={styles.entryContent}>
                            <div className={styles.entryHeader}>
                              <div className={styles.entryHeaderText}>
                                {ws.category && <span className={styles.entryCategory}>{ws.category.toUpperCase()}</span>}
                                <h3 className={styles.entryTitle}>{ws.title}</h3>
                              </div>
                              {entry.checked_in && <Badge variant="success">Checked in</Badge>}
                            </div>
                            <div className={styles.entryMeta}>
                              {duration && (
                                <span className={styles.entryMetaItem}>
                                  <Clock3 size={14} aria-hidden="true" /> {duration}
                                </span>
                              )}
                              {ws.location && (
                                <span className={styles.entryMetaItem}>
                                  <MapPin size={14} aria-hidden="true" /> {ws.location}
                                </span>
                              )}
                              {ws.facilitator && (
                                <span className={styles.entryMetaItem}>
                                  <User size={14} aria-hidden="true" /> {ws.facilitator}
                                </span>
                              )}
                            </div>
                            <div className={styles.entryFooter}>
                              <AddToCalendar event={toCalendarEvent(entry)} />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
