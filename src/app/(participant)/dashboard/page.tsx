'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css';
import { Zap, BookOpen, Calendar as CalendarIcon, UserCheck, Plus, User, CheckCircle2, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { name: 'Mon', bookings: 200 },
  { name: 'Tue', bookings: 450 },
  { name: 'Wed', bookings: 300 },
  { name: 'Thu', bookings: 600 },
  { name: 'Fri', bookings: 400 },
  { name: 'Sat', bookings: 750 },
  { name: 'Sun', bookings: 350 },
];

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ booked: 0, upcoming: 0 });
  const [workshops, setWorkshops] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const [bookingsResponse, workshopsResponse] = await Promise.all([
        supabase.from('bookings').select('id, workshops(date)').eq('participant_id', user.id),
        supabase.from('workshops').select('*').order('date', { ascending: true }).limit(3)
      ]);

      const myBookings = bookingsResponse.data || [];
      const upcoming = myBookings.filter((b: any) => new Date(b.workshops?.date) > new Date()).length;

      setStats({
        booked: myBookings.length,
        upcoming: upcoming
      });

      setWorkshops(workshopsResponse.data || []);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>Loading dashboard...</div>;
  }

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Welcome back, {firstName}</h1>
          <h2 className={styles.heroSubtitle}>KNUST E-Learning Week begins in 5 days.</h2>
          <div className={styles.heroActions}>
            <button className={`${styles.btn} ${styles.buttonWhite}`}>Browse Workshops</button>
            <button className={`${styles.btn} ${styles.buttonDarkRed}`}>View My Schedule</button>
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
            <span className={styles.statTrend}>+12%↑</span>
          </div>
          <div className={styles.statLabel}>Workshops Booked</div>
          <div className={styles.statValue}>{stats.booked > 0 ? stats.booked : '24'}</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
              <CalendarIcon size={20} />
            </div>
            <span className={styles.statTrend} style={{ color: '#6B7280' }}>This Week</span>
          </div>
          <div className={styles.statLabel}>Upcoming Sessions</div>
          <div className={styles.statValue}>08</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
              <UserCheck size={20} />
            </div>
            <span className={styles.statTrend}>Target 95%</span>
          </div>
          <div className={styles.statLabel}>Attendance Rate</div>
          <div className={styles.statValue}>92.4%</div>
        </div>
      </section>

      {/* Middle Section: Chart & Timeline */}
      <section className={styles.middleSection}>
        {/* Chart Panel */}
        <div className={styles.cardPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Booking Analytics</h3>
              <p className={styles.panelSubtitle}>Workshop trends and user engagement over time</p>
            </div>
            <div className={styles.toggleGroup}>
              <button className={`${styles.toggleButton} ${styles.active}`}>Bookings</button>
              <button className={styles.toggleButton}>Popularity</button>
            </div>
          </div>
          
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis hide={true} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="bookings" fill="#E5E7EB" radius={[4, 4, 4, 4]} activeBar={{ fill: '#A32020' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Total Bookings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>1,605</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Conversion Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>64.2%</div>
            </div>
          </div>
        </div>

        {/* Timeline Panel */}
        <div className={styles.cardPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Recent Activity</h3>
            <a href="#" className={styles.panelAction}>View All</a>
          </div>
          
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon} style={{ backgroundColor: '#A32020' }}><Plus size={16} /></div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>New Workshop Published</div>
                <div className={styles.timelineDesc}>"AI in Modern Pedagogies" by Prof. Arhin</div>
                <div className={styles.timelineTime}>2 mins ago</div>
              </div>
            </div>
            
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon} style={{ backgroundColor: '#1E3A8A' }}><User size={16} /></div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>User Registration Surge</div>
                <div className={styles.timelineDesc}>45 new students joined the "Canvas Mastery" workshop</div>
                <div className={styles.timelineTime}>1 hour ago</div>
              </div>
            </div>
            
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon} style={{ backgroundColor: '#10B981' }}><CheckCircle2 size={16} /></div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>Certification Distributed</div>
                <div className={styles.timelineDesc}>Batch A certificates for pre-week sessions generated</div>
                <div className={styles.timelineTime}>5 hours ago</div>
              </div>
            </div>
            
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon} style={{ backgroundColor: '#B91C1C' }}><Megaphone size={16} /></div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>Announcement Sent</div>
                <div className={styles.timelineDesc}>Reminder: Keynote speaker profile updated</div>
                <div className={styles.timelineTime}>Yesterday</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Workshops */}
      <section className={styles.workshopsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.panelTitle} style={{ fontSize: '1.25rem' }}>Upcoming Workshops</h3>
            <p className={styles.panelSubtitle}>Highest engagement sessions starting soon</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
            <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer' }}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className={styles.workshopsGrid}>
          {workshops.map((ws, i) => (
            <div key={ws.id} className={styles.workshopCard}>
              <img src={ws.image_url || `https://source.unsplash.com/random/400x300?education,tech&sig=${i}`} alt={ws.title} className={styles.workshopImage} />
              <div className={styles.workshopContent}>
                <div className={styles.workshopCategory}>{i === 0 ? 'TECHNOLOGY' : i === 1 ? 'PEDAGOGY' : 'RESEARCH'}</div>
                <h4 className={styles.workshopTitle}>{ws.title}</h4>
                <div className={styles.workshopMeta}>
                  <div className={styles.workshopMetaItem}>
                    <CalendarIcon size={14} /> {new Date(ws.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className={styles.workshopMetaItem}>
                    <User size={14} /> {ws.capacity} limit
                  </div>
                </div>
                
                <div className={styles.workshopFooter}>
                  <div className={styles.attendees}>
                    <div className={styles.attendeeAvatar}></div>
                    <div className={styles.attendeeAvatar}></div>
                    <div className={styles.attendeesCount}>+{Math.floor(Math.random() * 50) + 10}</div>
                  </div>
                  <button className={styles.bookButton}>Book Session</button>
                </div>
              </div>
            </div>
          ))}
          {/* Fallback mock cards if DB has less than 3 */}
          {workshops.length === 0 && [1, 2, 3].map((i) => (
            <div key={i} className={styles.workshopCard}>
              <img src={`https://source.unsplash.com/random/400x300?lecture,students&sig=${i+10}`} alt="Workshop" className={styles.workshopImage} />
              <div className={styles.workshopContent}>
                <div className={styles.workshopCategory}>PLACEHOLDER</div>
                <h4 className={styles.workshopTitle}>Sample Workshop {i}</h4>
                <div className={styles.workshopMeta}>
                  <div className={styles.workshopMetaItem}><CalendarIcon size={14} /> Oct {12 + i}</div>
                  <div className={styles.workshopMetaItem}><User size={14} /> 50 limit</div>
                </div>
                <div className={styles.workshopFooter}>
                  <div className={styles.attendees}>
                    <div className={styles.attendeeAvatar}></div>
                    <div className={styles.attendeeAvatar}></div>
                    <div className={styles.attendeesCount}>+12</div>
                  </div>
                  <button className={styles.bookButton}>Book Session</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
