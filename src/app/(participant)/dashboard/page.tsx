'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css';
import { BookOpen, Calendar as CalendarIcon, UserCheck, User, Clock, Search, X, Check } from 'lucide-react';
import { WorkshopThumbnail } from '@/components/ui/workshop-thumbnail/WorkshopThumbnail';
import { Badge } from '@/components/ui/badge/Badge';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { useToast } from '@/components/ui/toast/ToastProvider';
import { getFirstLastName } from '@/lib/user';
import { subscribeToWorkshopUpdates } from '@/lib/realtime';

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
  location: string;
  image_url?: string;
  category?: string;
};

type MyBooking = {
  id: string;
  workshop_id: string;
  checked_in: boolean;
  workshops: { date: string } | null;
};

function ParticipantDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ booked: number; upcoming: number; attendanceRate: number | null }>({
    booked: 0,
    upcoming: 0,
    attendanceRate: null,
  });
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  // New States for filtering and multi-select
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [stagedBookings, setStagedBookings] = useState<Set<Workshop>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // Live seat counts: reflect other participants' bookings/cancellations
    // immediately instead of only after a reload.
    return subscribeToWorkshopUpdates((updated) => {
      setWorkshops((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
    });
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const [bookingsResponse, workshopsResponse] = await Promise.all([
        supabase.from('bookings').select('id, workshop_id, checked_in, workshops(date)').eq('participant_id', user.id),
        supabase.from('workshops').select('*').eq('status', 'published').order('date', { ascending: true }).order('start_time', { ascending: true })
      ]);

      const myBookings = (bookingsResponse.data || []) as unknown as MyBooking[];
      const now = new Date();
      const upcoming = myBookings.filter((b) => b.workshops && new Date(b.workshops.date) > now).length;
      const pastBookings = myBookings.filter((b) => b.workshops && new Date(b.workshops.date) <= now);
      const attendanceRate = pastBookings.length > 0
        ? Math.round((pastBookings.filter((b) => b.checked_in).length / pastBookings.length) * 100)
        : null;

      setStats({
        booked: myBookings.length,
        upcoming,
        attendanceRate,
      });

      setBookedIds(new Set(myBookings.map((b) => b.workshop_id)));
      
      const fetchedWorkshops = workshopsResponse.data || [];
      setWorkshops(fetchedWorkshops);
      
      // Initialize selected date to the first available date
      if (fetchedWorkshops.length > 0) {
        const uniqueDates = Array.from(new Set(fetchedWorkshops.map(w => w.date)));
        setSelectedDate(uniqueDates[0]);
      }
      
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const hasTimeOverlap = (a: Workshop, b: Workshop) =>
    a.date === b.date &&
    (
      (a.start_time >= b.start_time && a.start_time < b.end_time) ||
      (a.end_time > b.start_time && a.end_time <= b.end_time) ||
      (a.start_time <= b.start_time && a.end_time >= b.end_time)
    );

  // A parallel session (same or overlapping time slot as something already
  // booked or staged) that would block this workshop from being selected.
  const getConflict = (workshop: Workshop) => {
    const allBookedOrStaged = [
      ...workshops.filter(w => bookedIds.has(w.id) && w.id !== workshop.id),
      ...Array.from(stagedBookings).filter(w => w.id !== workshop.id),
    ];
    return allBookedOrStaged.find(w => hasTimeOverlap(workshop, w));
  };

  const toggleSelection = (workshop: Workshop) => {
    const isSelected = Array.from(stagedBookings).some(w => w.id === workshop.id);

    if (isSelected) {
      // Remove from selection
      const newStaged = new Set(stagedBookings);
      for (const w of newStaged) {
        if (w.id === workshop.id) {
          newStaged.delete(w);
          break;
        }
      }
      setStagedBookings(newStaged);
    } else {
      const conflict = getConflict(workshop);
      if (conflict) {
        toast.error(`This overlaps with "${conflict.title}", which you've already booked or selected.`);
        return;
      }

      // Add to selection
      setStagedBookings(new Set([...stagedBookings, workshop]));
    }
  };

  const handleConfirmBookings = async () => {
    if (!user || stagedBookings.size === 0) return;
    setIsConfirming(true);

    // Self-healing check: Ensure the user's participant profile exists
    // (This is necessary if profile creation failed silently on registration due to missing RLS policies)
    const { data: participantData } = await supabase
      .from('participants')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!participantData) {
      const { firstName: fallbackFirstName, lastName: fallbackLastName } = getFirstLastName(user);
      const { error: profileError } = await supabase.from('participants').insert([{
        id: user.id,
        first_name: fallbackFirstName,
        last_name: fallbackLastName || 'Unknown',
        email: user.email || '',
        phone: user.user_metadata?.phone || 'Not provided',
      }]);
      
      if (profileError) {
        toast.error("Your profile is incomplete and could not be auto-created due to database permissions. Please add the INSERT policy to your Supabase SQL editor. Error: " + profileError.message);
        setIsConfirming(false);
        return;
      }
    }

    const inserts = Array.from(stagedBookings).map(w => ({
      participant_id: user.id,
      workshop_id: w.id
    }));

    const { error } = await supabase.from('bookings').insert(inserts);

    if (error) {
      toast.error("Failed to confirm bookings: " + error.message);
      setIsConfirming(false);
    } else {
      // Optimistic update
      const newlyBookedIds = Array.from(stagedBookings).map(w => w.id);
      setBookedIds(new Set([...bookedIds, ...newlyBookedIds]));
      
      setWorkshops(prev => prev.map(w => 
        newlyBookedIds.includes(w.id) ? { ...w, seats_booked: (w.seats_booked || 0) + 1 } : w
      ));
      
      setStats(prev => ({ 
        ...prev, 
        booked: prev.booked + newlyBookedIds.length, 
        upcoming: prev.upcoming + newlyBookedIds.length 
      }));
      
      setStagedBookings(new Set());
      setIsConfirming(false);
      toast.success("Successfully booked " + newlyBookedIds.length + " sessions!");
    }
  };

  if (loading) {
    return <PageLoader label="Loading dashboard..." />;
  }

  const firstName = getFirstLastName(user).firstName;

  const now = new Date();
  const nextSession = workshops
    .filter((w) => bookedIds.has(w.id) && new Date(`${w.date}T${w.start_time}`) > now)
    .sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`))[0];

  const daysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  };

  const formatRelativeDay = (dateStr: string) => {
    const diffDays = daysUntil(dateStr);
    const target = new Date(dateStr);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays < 7) return target.toLocaleDateString('en-US', { weekday: 'long' });
    return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  // Derived state for rendering
  const uniqueDates = Array.from(new Set(workshops.map(w => w.date))).sort();
  const workshopsForSelectedDate = workshops.filter(w => w.date === selectedDate);
  
  // Group by start_time for parallel sessions
  const groupedWorkshops: Record<string, Workshop[]> = {};
  workshopsForSelectedDate.forEach(ws => {
    if (!groupedWorkshops[ws.start_time]) {
      groupedWorkshops[ws.start_time] = [];
    }
    groupedWorkshops[ws.start_time].push(ws);
  });
  
  const sortedTimeSlots = Object.keys(groupedWorkshops).sort();

  const searchResults = query
    ? workshops.filter((ws) => {
        const haystack = `${ws.title} ${ws.facilitator || ''} ${ws.description} ${ws.category || ''}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : [];

  const renderWorkshopCard = (ws: Workshop) => {
    const isBooked = bookedIds.has(ws.id);
    const isStaged = Array.from(stagedBookings).some((w) => w.id === ws.id);
    const seatsBooked = ws.seats_booked || 0;
    const isFull = seatsBooked >= ws.capacity;
    const seatsLeft = ws.capacity - seatsBooked;
    const conflict = !isBooked && !isStaged ? getConflict(ws) : undefined;

    const seatsBadgeVariant: 'success' | 'warning' | 'danger' =
      isFull ? 'danger' : seatsLeft <= Math.max(Math.round(ws.capacity * 0.15), 3) ? 'warning' : 'success';

    return (
      <div key={ws.id} className={`${styles.workshopCard} ${isStaged ? styles.workshopCardSelected : ''}`}>
        <WorkshopThumbnail imageUrl={ws.image_url} title={ws.title} category={ws.category} className={styles.workshopImage} />
        <div className={styles.workshopContent}>
          <div className={styles.workshopMain}>
            <div className={styles.workshopTopRow}>
              <span className={styles.workshopCategory}>{(ws.category || 'General').toUpperCase()}</span>
              {ws.facilitator && (
                <>
                  <span className={styles.workshopDot} aria-hidden="true">&middot;</span>
                  <span className={styles.workshopFacilitator}>
                    <User size={12} aria-hidden="true" /> {ws.facilitator}
                  </span>
                </>
              )}
            </div>
            <h4 className={styles.workshopTitle}>{ws.title}</h4>
            <p className={styles.workshopDesc}>{ws.description}</p>
          </div>

          <div className={styles.workshopSide}>
            <Badge variant={seatsBadgeVariant}>{isFull ? 'Full' : `${seatsLeft} left`}</Badge>
            <div className={styles.workshopFooter}>
              {isBooked ? (
                <Link href="/bookings" className={styles.workshopBtnNeutral}>
                  Booked · Manage
                </Link>
              ) : isFull && !isStaged ? (
                <button className={styles.workshopBtnDisabled} disabled>Full</button>
              ) : conflict ? (
                <button className={styles.workshopBtnDisabled} disabled title={`Conflicts with "${conflict.title}"`}>
                  Unavailable
                </button>
              ) : (
                <button
                  className={isStaged ? styles.workshopBtnSelected : styles.workshopBtnAttend}
                  onClick={() => toggleSelection(ws)}
                >
                  {isStaged ? (
                    <>
                      <Check size={15} aria-hidden="true" /> Selected
                    </>
                  ) : 'Attend'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {!query && (
        <>
          <section className={styles.hero}>
            <Image
              src="/images/logo/kec-mark-white.png"
              alt=""
              width={482}
              height={243}
              className={styles.heroLogoBg}
              aria-hidden="true"
            />
            <div className={styles.heroContent}>
              {nextSession && <span className={styles.heroEyebrow}>Up next · {formatRelativeDay(nextSession.date)}</span>}
              <h1 className={styles.heroTitle}>Welcome back, {firstName}</h1>
              <h2 className={styles.heroSubtitle}>
                {nextSession
                  ? <>&ldquo;{nextSession.title}&rdquo; at {nextSession.start_time.slice(0, 5)}{nextSession.location ? ` · ${nextSession.location}` : ''}</>
                  : `Explore ${workshops.length} open workshop${workshops.length === 1 ? '' : 's'} and reserve your seat below.`}
              </h2>
              <div className={styles.heroActions}>
                <button className={`${styles.btn} ${styles.buttonWhite}`} onClick={() => document.getElementById('workshops-section')?.scrollIntoView({ behavior: 'smooth' })}>Browse Workshops</button>
                <Link href="/schedule" className={`${styles.btn} ${styles.buttonDarkRed}`}>View My Schedule</Link>
              </div>
            </div>
            <div className={styles.heroGraphic}>
              <div className={styles.graphicCountdown}>
                <span className={styles.graphicNumber}>{nextSession ? Math.max(daysUntil(nextSession.date), 0) : workshops.length}</span>
                <span className={styles.graphicCaption}>
                  {nextSession
                    ? (daysUntil(nextSession.date) === 0 ? 'today' : daysUntil(nextSession.date) === 1 ? 'day to go' : 'days to go')
                    : 'open sessions'}
                </span>
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className={styles.statsGrid}>
            <Link href="/bookings" className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrapper} style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                  <BookOpen size={20} />
                </div>
              </div>
              <div className={styles.statLabel}>Workshops Booked</div>
              <div className={styles.statValue}>{stats.booked}</div>
            </Link>

            <Link href="/schedule" className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrapper} style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                  <CalendarIcon size={20} />
                </div>
              </div>
              <div className={styles.statLabel}>Upcoming Sessions</div>
              <div className={styles.statValue}>{stats.upcoming}</div>
            </Link>

            <Link href="/bookings" className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIconWrapper} style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                  <UserCheck size={20} />
                </div>
              </div>
              <div className={styles.statLabel}>Attendance Rate</div>
              <div className={styles.statValue}>{stats.attendanceRate === null ? '—' : `${stats.attendanceRate}%`}</div>
            </Link>
          </section>
        </>
      )}

      {/* Discover Workshops */}
      <section id="workshops-section" className={styles.workshopsSection} style={{ marginTop: '2rem' }}>
        {query ? (
          <>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.panelTitle} style={{ fontSize: '1.5rem' }}>
                  Search results for &ldquo;{query}&rdquo;
                </h3>
                <p className={styles.panelSubtitle}>
                  {searchResults.length} {searchResults.length === 1 ? 'workshop' : 'workshops'} found across the whole event.
                </p>
              </div>
              <Link href="/dashboard" className={styles.clearSearchLink}>
                <X size={14} /> Clear search
              </Link>
            </div>

            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                <Search size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
                No workshops match &ldquo;{query}&rdquo;. Try a different topic, facilitator, or category.
              </div>
            ) : (
              <div className={styles.timeSlotGrid}>
                {searchResults.map((ws) => renderWorkshopCard(ws))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.panelTitle} style={{ fontSize: '1.5rem' }}>Discover Workshops</h3>
                <p className={styles.panelSubtitle}>Browse and book parallel sessions. Select multiple workshops and confirm your bookings below.</p>
              </div>
            </div>

            {/* Day Tabs */}
            {uniqueDates.length > 0 && (
              <div className={styles.tabsContainer}>
                {uniqueDates.map(date => {
                  const dateObj = new Date(date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
                  return (
                    <button
                      key={date}
                      className={`${styles.tabButton} ${selectedDate === date ? styles.tabButtonActive : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {formattedDate}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grouped Time Slots */}
            <div className={styles.timeSlotContainer}>
              {sortedTimeSlots.map(timeSlot => {
                const slotWorkshops = groupedWorkshops[timeSlot];
                const endSlotTime = slotWorkshops[0]?.end_time?.slice(0, 5) || '';
                const formattedTimeRange = `${timeSlot.slice(0, 5)} - ${endSlotTime}`;

                return (
                  <div key={timeSlot} className={styles.timeSlotGroup}>
                    <h4 className={styles.timeSlotHeader}>
                      <Clock size={18} /> {formattedTimeRange}
                    </h4>

                    <div className={styles.timeSlotGrid}>
                      {slotWorkshops.map((ws) => renderWorkshopCard(ws))}
                    </div>
                  </div>
                );
              })}

              {sortedTimeSlots.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                  No workshops scheduled for this date.
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Portaled to document.body: the page root has .animate-fade-in, whose
          fadeIn keyframes animate `transform` - forwards fill-mode keeps a
          resting transform forever, which creates a containing block for any
          position:fixed descendant. Without the portal this bar would be
          pinned to that div's box instead of the viewport, so it'd scroll
          away instead of staying fixed. */}
      {stagedBookings.size > 0 && createPortal(
        <div className={styles.actionBarWrapper}>
          <div className={styles.actionBar}>
            <div className={styles.actionBarIcon}>
              <CalendarIcon size={18} aria-hidden="true" />
            </div>
            <span className={styles.actionBarText}>
              <strong>{stagedBookings.size}</strong> {stagedBookings.size === 1 ? 'session' : 'sessions'} selected
            </span>
            <div className={styles.actionBarButtons}>
              <button
                className={styles.actionBarCancel}
                onClick={() => setStagedBookings(new Set())}
                disabled={isConfirming}
              >
                Clear
              </button>
              <button
                className={styles.actionBarBtn}
                onClick={handleConfirmBookings}
                disabled={isConfirming}
              >
                {isConfirming ? 'Confirming...' : 'Confirm Bookings'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading dashboard..." />}>
      <ParticipantDashboard />
    </Suspense>
  );
}
