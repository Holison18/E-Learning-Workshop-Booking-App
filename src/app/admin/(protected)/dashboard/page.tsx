'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  CalendarCheck,
  Users,
  TrendingUp,
  UserCheck,
  Building2,
  BadgeCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';
import styles from './AdminDashboard.module.css';

type WorkshopRow = {
  id: string;
  title: string;
  date: string;
  capacity: number;
  overbooking_limit: number;
  seats_booked: number;
  status: string;
};

type BookingRow = {
  id: string;
  booked_at: string;
  checked_in: boolean;
  approved: boolean;
  participants: { first_name: string; last_name: string; organization_name: string | null } | null;
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
  const [totalBookings, setTotalBookings] = useState(0);
  const [remainingSeats, setRemainingSeats] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [capacityUtilization, setCapacityUtilization] = useState(0);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [totalSeats, setTotalSeats] = useState(0);
  const [verifiedPeople, setVerifiedPeople] = useState(0);
  const [trend, setTrend] = useState<DayTrend[]>([]);
  const [recentWorkshops, setRecentWorkshops] = useState<WorkshopRow[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingRow[]>([]);

  async function fetchDashboardData() {
    const res = await fetch('/api/admin/dashboard');
    const json = await res.json();

    const workshops: WorkshopRow[] = json.workshops || [];
    const bookings: BookingRow[] = json.bookings || [];

    let totalCapacity = 0;
    let totalBookingLimit = 0;
    let totalBooked = 0;
    workshops.forEach((w) => {
      totalCapacity += w.capacity;
      totalBookingLimit += w.overbooking_limit ?? w.capacity;
      totalBooked += w.seats_booked;
    });

    setRemainingSeats(totalBookingLimit - totalBooked);

    const today = new Date();
    const upcoming = workshops.filter((w) => new Date(w.date) >= new Date(today.toDateString()));
    setRecentWorkshops((upcoming.length > 0 ? upcoming : workshops).slice(0, 4));

    setTotalWorkshops(workshops.length);
    setTotalSeats(totalCapacity);
    setCapacityUtilization(totalBookingLimit > 0 ? Math.round((totalBooked / totalBookingLimit) * 100) : 0);
    setTotalBookings(bookings.length);
    const checkedIn = bookings.filter((b) => b.checked_in);
    setTotalCheckins(checkedIn.length);
    setVerifiedPeople(bookings.filter((b) => b.approved).length);
    setAttendanceRate(bookings.length > 0 ? Math.round((checkedIn.length / bookings.length) * 100) : 0);
    setRecentBookings(bookings.slice(0, 5));

    const dayBuckets: DayTrend[] = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dayBookings = bookings.filter((b) => new Date(b.booked_at).toDateString() === d.toDateString());
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        bookings: dayBookings.length,
        attendance: dayBookings.filter((b) => b.checked_in).length,
      };
    });
    setTrend(dayBuckets);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await fetchDashboardData();
    })();
  }, []);

  if (loading) return <div className={styles.emptyState}>Loading dashboard...</div>;

  const maxTrendValue = Math.max(...trend.map((t) => t.bookings), 1);
  const peakDay = trend.reduce((max, t) => (t.bookings > max.bookings ? t : max), trend[0] || { label: '—', bookings: 0, attendance: 0 });
  const avgDaily = trend.length > 0 ? Math.round(trend.reduce((sum, t) => sum + t.bookings, 0) / trend.length) : 0;

  const stats = [
    { label: 'Total Workshops', value: totalWorkshops, icon: <GraduationCap size={18} /> },
    { label: 'Total Bookings', value: totalBookings.toLocaleString(), icon: <CalendarCheck size={18} /> },
    { label: 'Total Seats', value: totalSeats.toLocaleString(), icon: <Building2 size={18} /> },
    { label: 'Remaining Seats', value: remainingSeats.toLocaleString(), icon: <Users size={18} /> },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: <TrendingUp size={18} /> },
    { label: 'Check-ins', value: totalCheckins.toLocaleString(), icon: <UserCheck size={18} /> },
    { label: 'Verified Bookings', value: verifiedPeople.toLocaleString(), icon: <BadgeCheck size={18} /> },
  ];

  return (
    <div className={styles.page}>
      <div>
        <h1>Admin Dashboard</h1>
        <p style={{ color: 'var(--secondary-gray)' }}>Overview of the KNUST E-Learning Week conference metrics.</p>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <Card key={stat.label} className={styles.statCard}>
            <span className={styles.statIcon}>{stat.icon}</span>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </Card>
        ))}
      </div>

      <div className={styles.splitGrid}>
        <Card>
          <CardContent>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Attendance &amp; Booking Trends</h2>
              <select className={styles.select} defaultValue="7">
                <option value="7">Last 7 days</option>
              </select>
            </div>

            <div className={styles.chart}>
              {trend.map((day) => (
                <div key={day.label} className={styles.chartCol}>
                  <div className={styles.bars}>
                    <div
                      className={`${styles.bar} ${styles.barBookings} ${day.label === peakDay.label ? styles.peak : ''}`}
                      style={{ height: `${(day.bookings / maxTrendValue) * 100}%` }}
                    />
                    <div
                      className={`${styles.bar} ${styles.barAttendance} ${day.label === peakDay.label ? styles.peak : ''}`}
                      style={{ height: `${(day.attendance / maxTrendValue) * 100}%` }}
                    />
                  </div>
                  <span className={styles.chartDayLabel}>{day.label}</span>
                </div>
              ))}
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
              <div
                className={styles.donut}
                style={{
                  background: `conic-gradient(var(--primary-red) 0% ${capacityUtilization}%, var(--primary-red-light) ${capacityUtilization}% 100%)`,
                }}
              >
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
                        <td><ProgressBar value={w.seats_booked} max={w.overbooking_limit ?? w.capacity} /></td>
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
                    const initials = b.participants ? `${b.participants.first_name[0] ?? ''}${b.participants.last_name[0] ?? ''}` : '?';
                    return (
                      <tr key={b.id}>
                        <td>
                          <div className={styles.participantRow}>
                            <span className={styles.participantAvatar}>{initials}</span>
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
