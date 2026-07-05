'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, BookOpen, Search, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    const bookingDate = b.booked_at?.split('T')[0] || '';
    const matchesDateFrom = !dateFrom || bookingDate >= dateFrom;
    const matchesDateTo = !dateTo || bookingDate <= dateTo;
    return matchesSearch && matchesCheckin && matchesApprove && matchesDateFrom && matchesDateTo;
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
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Check In</label>
          <select
            className={styles.filterSelect}
            value={checkinFilter}
            onChange={(e) => setCheckinFilter(e.target.value as typeof checkinFilter)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="checked_in">Checked In</option>
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Approved</label>
          <select
            className={styles.filterSelect}
            value={approveFilter}
            onChange={(e) => setApproveFilter(e.target.value as typeof approveFilter)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>From</label>
          <input
            type="date"
            className={styles.dateInput}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>To</label>
          <input
            type="date"
            className={styles.dateInput}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(checkinFilter !== 'all' || approveFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setCheckinFilter('all'); setApproveFilter('all'); setDateFrom(''); setDateTo(''); }}
          >
            Clear filters
          </Button>
        )}
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
