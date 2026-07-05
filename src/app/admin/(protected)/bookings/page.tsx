'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, BookOpen, Search, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import styles from './AdminBookings.module.css';

type Booking = {
  id: string;
  user_id: string;
  workshop_id: string;
  booked_at: string;
  checked_in: boolean;
  approved: boolean;
  workshops: { id: string; title: string; date: string; status: string } | null;
  participants: { id: string; first_name: string; last_name: string; email: string } | null;
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkinFilter, setCheckinFilter] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [approveFilter, setApproveFilter] = useState<'all' | 'approved' | 'pending'>('all');

  async function fetchBookings() {
    const res = await fetch('/api/admin/bookings');
    const json = await res.json();
    setBookings(json.bookings || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  const toggleCheckIn = async (booking: Booking) => {
    const res = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, checked_in: !booking.checked_in }),
    });
    if (res.ok) {
      setBookings(bookings.map((b) => b.id === booking.id ? { ...b, checked_in: !b.checked_in } : b));
    }
  };

  const toggleApproved = async (booking: Booking) => {
    const res = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, approved: !booking.approved }),
    });
    if (res.ok) {
      setBookings(bookings.map((b) => b.id === booking.id ? { ...b, approved: !b.approved } : b));
    }
  };

  const filtered = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const userName = [b.participants?.first_name, b.participants?.last_name].filter(Boolean).join(' ').toLowerCase();
    const workshopTitle = b.workshops?.title?.toLowerCase() || '';
    const email = b.participants?.email?.toLowerCase() || '';
    const matchesSearch = userName.includes(q) || workshopTitle.includes(q) || email.includes(q);
    const matchesCheckin =
      checkinFilter === 'all' ? true :
      checkinFilter === 'checked_in' ? b.checked_in :
      !b.checked_in;
    const matchesApprove =
      approveFilter === 'all' ? true :
      approveFilter === 'approved' ? b.approved :
      !b.approved;
    return matchesSearch && matchesCheckin && matchesApprove;
  });

  if (loading) return <div className={styles.emptyState}>Loading bookings...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Bookings</h1>
          <p className={styles.subtitle}>View and manage all workshop bookings.</p>
        </div>
        <div className={styles.totalBadge}>
          <BookOpen size={16} />
          {bookings.length} Total Bookings
        </div>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.searchField}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by user or workshop..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.statusFilters}>
          <span className={styles.filterLabel}>Check In:</span>
          {(['all', 'pending', 'checked_in'] as const).map((s) => (
            <button
              key={s}
              className={`${styles.statusBtn} ${checkinFilter === s ? styles.statusBtnActive : ''}`}
              onClick={() => setCheckinFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'checked_in' ? 'Checked In' : 'Pending'}
            </button>
          ))}
        </div>
        <div className={styles.statusFilters}>
          <span className={styles.filterLabel}>Approved:</span>
          {(['all', 'pending', 'approved'] as const).map((s) => (
            <button
              key={s}
              className={`${styles.statusBtn} ${approveFilter === s ? styles.statusBtnActive : ''}`}
              onClick={() => setApproveFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'approved' ? 'Approved' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent style={{ padding: 0 }}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Workshop</th>
                  <th>Booked At</th>
                  <th>Checked In</th>
                  <th>Approved</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className={styles.emptyState}>No bookings found.</td></tr>
                )}
                {filtered.map((b) => {
                  const name = [b.participants?.first_name, b.participants?.last_name].filter(Boolean).join(' ') || b.participants?.email?.split('@')[0] || 'Unknown';
                  const initials = (b.participants?.first_name?.[0] || b.participants?.email?.[0] || '?').toUpperCase();
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className={styles.userRow}>
                          <span className={styles.userAvatar}>{initials}</span>
                          <div>
                            <div className={styles.userName}>{name}</div>
                            <div className={styles.userEmail}>{b.participants?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.workshopCell}>
                          <BookOpen size={14} />
                          <span>{b.workshops?.title || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.dateCell}>
                          <Calendar size={14} />
                          {new Date(b.booked_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        {b.checked_in ? (
                          <Badge variant="success">Checked In</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td>
                        <button
                          className={`${styles.toggleBtn} ${b.approved ? styles.toggleOn : styles.toggleOff}`}
                          onClick={() => toggleApproved(b)}
                          aria-label={b.approved ? 'Unapprove' : 'Approve'}
                        >
                          {b.approved ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          {b.approved ? 'Approved' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
