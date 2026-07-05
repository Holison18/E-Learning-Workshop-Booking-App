'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  CalendarCheck,
  Users,
  TrendingUp,
  PieChart as PieChartIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { Avatar } from '@/components/ui/avatar/Avatar';
import styles from './AdminDashboard.module.css';

type WorkshopRow = {
  id: string;
  title: string;
  date: string;
  capacity: number;
  seats_booked: number;
  status: string;
};

type BookingRow = {
  id: string;
  booked_at: string;
  checked_in: boolean;
  participants: { id: string; first_name: string; last_name: string; organization_name: string | null } | null;
  workshops: { id: string; title: string } | null;
};

type DayTrend = { label: string; bookings: number; attendance: number };

function formatTimeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalWorkshops, setTotalWorkshops] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [capacityUtilization, setCapacityUtilization] = useState(0);
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);
  const [trendRangeDays, setTrendRangeDays] = useState(7);
  const [recentWorkshops, setRecentWorkshops] = useState<WorkshopRow[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingRow[]>([]);

  async function fetchDashboardData() {
    const [workshopsRes, participantsRes, bookingsRes] = await Promise.all([
      supabase.from('workshops').select('id, title, date, capacity, seats_booked, status').order('date', { ascending: true }),
      supabase.from('participants').select('id', { count: 'exact', head: true }),
      supabase
        .from('bookings')
        .select('id, booked_at, checked_in, participants(id, first_name, last_name, organization_name), workshops(id, title)')
        .order('booked_at', { ascending: false }),
    ]);

    const workshops = (workshopsRes.data as WorkshopRow[]) || [];
    const bookings = (bookingsRes.data as unknown as BookingRow[]) || [];

    let totalCapacity = 0;
    let totalBooked = 0;
    workshops.forEach((w) => {
      totalCapacity += w.capacity;
      totalBooked += w.seats_booked;
    });

    const today = new Date();
    const upcoming = workshops.filter((w) => new Date(w.date) >= new Date(today.toDateString()));
    setRecentWorkshops((upcoming.length > 0 ? upcoming : workshops).slice(0, 4));

    setTotalWorkshops(workshops.length);
    setCapacityUtilization(totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0);
    setTotalParticipants(participantsRes.count || 0);
    setTotalBookings(bookings.length);
    setAttendanceRate(bookings.length > 0 ? Math.round((bookings.filter((b) => b.checked_in).length / bookings.length) * 100) : 0);
    setRecentBookings(bookings.slice(0, 5));
    setAllBookings(bookings);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await fetchDashboardData();
    })();
  }, []);

  if (loading) return <PageLoader label="Loading dashboard..." />;

  const trend: DayTrend[] = Array.from({ length: trendRangeDays }).map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (trendRangeDays - 1 - i));
    const dayBookings = allBookings.filter((b) => new Date(b.booked_at).toDateString() === d.toDateString());
    return {
      label: trendRangeDays > 14
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { weekday: 'short' }),
      bookings: dayBookings.length,
      attendance: dayBookings.filter((b) => b.checked_in).length,
    };
  });

  const peakDay = trend.reduce((max, t) => (t.bookings > max.bookings ? t : max), trend[0] || { label: '—', bookings: 0, attendance: 0 });
  const avgDaily = trend.length > 0 ? Math.round(trend.reduce((sum, t) => sum + t.bookings, 0) / trend.length) : 0;

  const stats: { label: string; value: string | number; icon: React.ReactNode; href?: string }[] = [
    { label: 'Total Workshops', value: totalWorkshops, icon: <GraduationCap size={18} />, href: '/admin/workshops' },
    { label: 'Total Bookings', value: totalBookings.toLocaleString(), icon: <CalendarCheck size={18} />, href: '/admin/workshops' },
    { label: 'Participants', value: totalParticipants.toLocaleString(), icon: <Users size={18} /> },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: <TrendingUp size={18} />, href: '/admin/workshops' },
    { label: 'Capacity Utilized', value: `${capacityUtilization}%`, icon: <PieChartIcon size={18} />, href: '/admin/workshops' },
  ];

  return (
    <div className={styles.page}>
      <div>
        <h1>Admin Dashboard</h1>
        <p style={{ color: 'var(--secondary-gray)' }}>Overview of the KNUST E-Learning Week conference metrics.</p>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => {
          const cardBody = (
            <Card interactive={Boolean(stat.href)} className={styles.statCard}>
              <span className={styles.statIcon}>{stat.icon}</span>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              {cardBody}
            </Link>
          ) : (
            <div key={stat.label}>{cardBody}</div>
          );
        })}
      </div>

      <div className={styles.splitGrid}>
        <Card>
          <CardContent>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Attendance &amp; Booking Trends</h2>
              <select
                className={styles.select}
                value={trendRangeDays}
                onChange={(e) => setTrendRangeDays(Number(e.target.value))}
                aria-label="Trends time range"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>

            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} barGap={4} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-light)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--secondary-gray)" />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--background-off-white)' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 13 }}
                  />
                  <Bar dataKey="bookings" name="Bookings" fill="var(--primary-red-light)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="attendance" name="Attendance" fill="var(--primary-red)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: 'var(--primary-red-light)' }} /> Bookings
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: 'var(--primary-red)' }} /> Attendance
              </span>
            </div>

            <div className={styles.chartFooter}>
              <div className={styles.chartFooterStat}>
                Peak Day
                <strong>{peakDay.label} · {peakDay.bookings}</strong>
              </div>
              <div className={styles.chartFooterStat}>
                Avg. Daily
                <strong>{avgDaily}</strong>
              </div>
              <Link href="/admin/workshops" className={styles.manageLink}>View Detailed Report</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className={styles.panelTitle}>Capacity Distribution</h2>
            <div className={styles.donutWrapper}>
              <div className={styles.donut}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Booked', value: capacityUtilization },
                        { name: 'Available', value: Math.max(100 - capacityUtilization, 0) },
                      ]}
                      dataKey="value"
                      innerRadius="72%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill="var(--primary-red)" />
                      <Cell fill="var(--primary-red-light)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>{capacityUtilization}%</div>
              </div>
              <div className={styles.donutLegend}>
                <div className={styles.donutLegendRow}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: 'var(--primary-red)' }} /> Booked
                  </span>
                  <span>{capacityUtilization}%</span>
                </div>
                <div className={styles.donutLegendRow}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: 'var(--primary-red-light)' }} /> Available
                  </span>
                  <span>{100 - capacityUtilization}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={styles.splitGrid}>
        <Card>
          <CardHeader>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Workshop Management</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary-gray)', marginTop: '0.25rem' }}>
                  Manage and monitor active workshops.
                </p>
              </div>
              <Link href="/admin/workshops/create">
                <Button>+ Add Workshop</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Workshop</th>
                    <th>Date</th>
                    <th>Seats</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentWorkshops.length === 0 && (
                    <tr><td colSpan={5} className={styles.emptyState}>No workshops yet.</td></tr>
                  )}
                  {recentWorkshops.map((w) => (
                    <tr key={w.id}>
                      <td className={styles.workshopTitle}>{w.title}</td>
                      <td className={styles.workshopMeta}>{new Date(w.date).toLocaleDateString()}</td>
                      <td><ProgressBar value={w.seats_booked} max={w.capacity} /></td>
                      <td>
                        <Badge variant={w.status === 'published' ? 'success' : 'neutral'}>{w.status}</Badge>
                      </td>
                      <td>
                        <Link href={`/admin/workshops/${w.id}`} className={styles.manageLink}>Manage</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.footerRow}>
              <span>Showing {recentWorkshops.length} of {totalWorkshops}</span>
              <Link href="/admin/workshops" className={styles.manageLink}>View all</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className={styles.panelTitle}>Recent Participants</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--secondary-gray)', marginTop: '0.25rem' }}>
              Latest bookings across all workshops.
            </p>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <tbody>
                  {recentBookings.length === 0 && (
                    <tr><td className={styles.emptyState}>No bookings yet.</td></tr>
                  )}
                  {recentBookings.map((b) => {
                    const name = b.participants ? `${b.participants.first_name} ${b.participants.last_name}` : 'Unknown participant';
                    return (
                      <tr key={b.id}>
                        <td>
                          <div className={styles.participantRow}>
                            <Avatar user={{ id: b.participants?.id }} name={name} size={32} />
                            <div>
                              <div className={styles.participantName}>{name}</div>
                              <div className={styles.participantMeta}>
                                {b.participants?.organization_name || 'KNUST'} · {b.workshops?.title || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.workshopMeta}>{formatTimeAgo(b.booked_at)}</td>
                        <td>
                          {b.workshops?.id ? (
                            <Link href={`/admin/workshops/${b.workshops.id}`} className={styles.manageLink}>Manage</Link>
                          ) : (
                            <Link href="/admin/workshops" className={styles.manageLink}>Manage</Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.footerRow}>
              <span>Showing {recentBookings.length} of {totalBookings}</span>
              <div className={styles.pager}>
                <button className={styles.pagerButton} disabled><ChevronLeft size={14} /></button>
                <button className={styles.pagerButton} disabled><ChevronRight size={14} /></button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Link href="/admin/workshops/create" className={styles.fab} aria-label="Add new workshop">
        <Plus size={24} />
      </Link>
    </div>
  );
}
