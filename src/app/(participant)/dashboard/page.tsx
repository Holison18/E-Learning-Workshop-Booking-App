'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css';
import { Zap, BookOpen, Calendar as CalendarIcon, UserCheck, User, Clock } from 'lucide-react';

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
};

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ booked: 0, upcoming: 0 });
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  
  // New States for filtering and multi-select
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [stagedBookings, setStagedBookings] = useState<Set<Workshop>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const [bookingsResponse, workshopsResponse] = await Promise.all([
        supabase.from('bookings').select('id, workshop_id, workshops(date)').eq('participant_id', user.id),
        supabase.from('workshops').select('*').order('date', { ascending: true }).order('start_time', { ascending: true })
      ]);

      const myBookings = bookingsResponse.data || [];
      const upcoming = myBookings.filter((b: any) => b.workshops && new Date(b.workshops.date) > new Date()).length;

      setStats({
        booked: myBookings.length,
        upcoming: upcoming
      });

      setBookedIds(new Set(myBookings.map((b: any) => b.workshop_id)));
      
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
      // Check for time conflicts against already booked AND currently staged
      const allBookedOrStaged = [
        ...workshops.filter(w => bookedIds.has(w.id)),
        ...Array.from(stagedBookings)
      ];

      const hasConflict = allBookedOrStaged.some(w => 
        w.date === workshop.date && 
        (
          (workshop.start_time >= w.start_time && workshop.start_time < w.end_time) ||
          (workshop.end_time > w.start_time && workshop.end_time <= w.end_time) ||
          (workshop.start_time <= w.start_time && workshop.end_time >= w.end_time)
        )
      );

      if (hasConflict) {
        alert("You already have a booked or selected session for this time slot.");
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
      const { error: profileError } = await supabase.from('participants').insert([{
        id: user.id,
        first_name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Unknown',
        last_name: user.user_metadata?.last_name || 'User',
        email: user.email || '',
        phone: user.user_metadata?.phone || 'Not provided',
      }]);
      
      if (profileError) {
        alert("Your profile is incomplete and could not be auto-created due to database permissions. Please add the INSERT policy to your Supabase SQL editor. Error: " + profileError.message);
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
      alert("Failed to confirm bookings: " + error.message);
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
      alert("Successfully booked " + newlyBookedIds.length + " sessions!");
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>Loading dashboard...</div>;
  }

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

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

  return (
    <div className="animate-fade-in" style={{ paddingBottom: stagedBookings.size > 0 ? '80px' : '0' }}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Welcome back, {firstName}</h1>
          <h2 className={styles.heroSubtitle}>Explore and book upcoming sessions below.</h2>
          <div className={styles.heroActions}>
            <button className={`${styles.btn} ${styles.buttonWhite}`} onClick={() => document.getElementById('workshops-section')?.scrollIntoView({ behavior: 'smooth' })}>Browse Workshops</button>
            <a href="/bookings" className={`${styles.btn} ${styles.buttonDarkRed}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>View My Schedule</a>
          </div>
        </div>
        <div className={styles.heroGraphic}>
          <div className={styles.graphicCircle}>
            <Zap size={64} className={styles.graphicIcon} strokeWidth={1.5} />
          </div>
        </div>
      </section>

      {/* Stats Grid */}
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

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
              <UserCheck size={20} />
            </div>
          </div>
          <div className={styles.statLabel}>Attendance Rate</div>
          <div className={styles.statValue}>100%</div>
        </div>
      </section>

      {/* Discover Workshops */}
      <section id="workshops-section" className={styles.workshopsSection} style={{ marginTop: '2rem' }}>
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
                  {slotWorkshops.map((ws, i) => {
                    const isBooked = bookedIds.has(ws.id);
                    const isStaged = Array.from(stagedBookings).some(w => w.id === ws.id);
                    const seatsBooked = ws.seats_booked || 0;
                    const isFull = seatsBooked >= ws.capacity;
                    const seatsLeft = ws.capacity - seatsBooked;

                    return (
                      <div key={ws.id} className={styles.workshopCard} style={isStaged ? { borderColor: '#10B981', boxShadow: '0 0 0 1px #10B981' } : {}}>
                        <img src={ws.image_url || `https://source.unsplash.com/random/400x300?education,tech&sig=${i + timeSlot.charCodeAt(0)}`} alt={ws.title} className={styles.workshopImage} />
                        <div className={styles.workshopContent}>
                          <div className={styles.workshopCategory}>{ws.title.length % 3 === 0 ? 'TECHNOLOGY' : ws.title.length % 3 === 1 ? 'PEDAGOGY' : 'RESEARCH'}</div>
                          <h4 className={styles.workshopTitle}>{ws.title}</h4>
                          <p className={styles.workshopDesc}>{ws.description}</p>
                          <div className={styles.workshopMeta}>
                            <div className={styles.workshopMetaItem}>
                              <User size={14} /> {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left
                            </div>
                          </div>
                          
                          <div className={styles.workshopFooter}>
                            <div className={styles.attendees}>
                              <div className={styles.attendeeAvatar}></div>
                              <div className={styles.attendeeAvatar}></div>
                              <div className={styles.attendeesCount}>+{seatsBooked}</div>
                            </div>
                            
                            {isBooked ? (
                              <button className={styles.bookButton} style={{ backgroundColor: '#E5E7EB', color: '#6B7280', cursor: 'not-allowed', padding: '0.5rem 1rem', borderRadius: '6px' }} disabled>Booked</button>
                            ) : isFull && !isStaged ? (
                              <button className={styles.bookButton} style={{ backgroundColor: '#FCA5A5', color: '#991B1B', cursor: 'not-allowed', padding: '0.5rem 1rem', borderRadius: '6px' }} disabled>Full</button>
                            ) : (
                              <button 
                                className={isStaged ? styles.buttonSelected : styles.buttonAttend} 
                                onClick={() => toggleSelection(ws)}
                              >
                                {isStaged ? 'Selected' : 'Attend'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
      </section>

      {/* Floating Action Bar for Multi-Select Confirmation */}
      {stagedBookings.size > 0 && (
        <div className={styles.actionBar}>
          <span className={styles.actionBarText}>
            {stagedBookings.size} {stagedBookings.size === 1 ? 'session' : 'sessions'} selected for booking
          </span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              style={{ background: 'transparent', border: 'none', color: '#6B7280', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setStagedBookings(new Set())}
              disabled={isConfirming}
            >
              Cancel
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
      )}
    </div>
  );
}
