'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Armchair, UserCheck, Pencil, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { useToast } from '@/components/ui/toast/ToastProvider';
import { useConfirm } from '@/components/ui/confirm-dialog/ConfirmDialogProvider';
import { subscribeToWorkshopUpdates } from '@/lib/realtime';
import styles from './AdminWorkshops.module.css';

type Workshop = {
  id: string;
  title: string;
  audience: string | null;
  location: string | null;
  category: string | null;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  seats_booked: number;
};

const PAGE_SIZE = 6;

function AdminWorkshops() {
  const toast = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [checkedInCounts, setCheckedInCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  async function fetchWorkshops() {
    const [workshopsRes, bookingsRes] = await Promise.all([
      supabase
        .from('workshops')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase.from('bookings').select('workshop_id, checked_in'),
    ]);

    if (workshopsRes.data) setWorkshops(workshopsRes.data as Workshop[]);

    if (bookingsRes.data) {
      const counts: Record<string, number> = {};
      for (const b of bookingsRes.data as { workshop_id: string; checked_in: boolean }[]) {
        if (b.checked_in) counts[b.workshop_id] = (counts[b.workshop_id] || 0) + 1;
      }
      setCheckedInCounts(counts);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await fetchWorkshops();
    })();
  }, []);

  useEffect(() => {
    // Live seat counts so admins see bookings/cancellations as they happen.
    return subscribeToWorkshopUpdates((updated) => {
      setWorkshops((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
    });
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete workshop?',
      message: 'This will also delete all associated bookings. This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;

    await supabase.from('bookings').delete().eq('workshop_id', id);

    const { error } = await supabase.from('workshops').delete().eq('id', id);
    if (!error) {
      setWorkshops(workshops.filter((w) => w.id !== id));
      toast.success('Workshop deleted.');
    } else {
      toast.error('Error deleting workshop: ' + error.message);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(workshops.map((w) => w.category).filter(Boolean))) as string[],
    [workshops]
  );

  const filtered = useMemo(() => {
    return workshops.filter((w) => {
      if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
      if (dateFrom && w.date < dateFrom) return false;
      if (dateTo && w.date > dateTo) return false;
      if (query) {
        const haystack = `${w.title} ${w.audience || ''} ${w.category || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [workshops, categoryFilter, dateFrom, dateTo, query]);

  const totalSeats = filtered.reduce((sum, w) => sum + w.capacity, 0);
  const bookedSeats = filtered.reduce((sum, w) => sum + w.seats_booked, 0);
  const totalCheckedIn = filtered.reduce((sum, w) => sum + (checkedInCounts[w.id] || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) return <PageLoader label="Loading workshops..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Workshop Management</h1>
          <p className={styles.subtitle}>
            Create, monitor, and organize upcoming university workshops. You are currently viewing the KNUST E-Learning Week academic schedule.
          </p>
        </div>
        <Link href="/admin/workshops/create">
          <Button>+ Add New Workshop</Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          <div className={styles.filtersRow}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                className={styles.filterSelect}
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} id="date-range-label">Date Range</label>
              <div className={styles.dateRangeGroup} role="group" aria-labelledby="date-range-label">
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  aria-label="From date"
                />
                <span>to</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  aria-label="To date"
                />
              </div>
            </div>
            {(categoryFilter !== 'all' || dateFrom || dateTo) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setCategoryFilter('all'); setDateFrom(''); setDateTo(''); setPage(1); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className={styles.statsRow}>
        <Card className={styles.seatCard}>
          <span className={styles.seatIcon}><Armchair size={20} /></span>
          <div>
            <div className={styles.seatLabel}>Total Active Seats</div>
            <div className={styles.seatValue}>{bookedSeats.toLocaleString()} / {totalSeats.toLocaleString()}</div>
          </div>
        </Card>
        <Card className={styles.seatCard}>
          <span className={styles.seatIcon} style={{ backgroundColor: 'var(--success-green-bg)', color: 'var(--success-green)' }}><UserCheck size={20} /></span>
          <div>
            <div className={styles.seatLabel}>Checked In</div>
            <div className={styles.seatValue}>
              {totalCheckedIn.toLocaleString()} / {bookedSeats.toLocaleString()}
              {bookedSeats > 0 && (
                <span className={styles.seatSubvalue}> ({Math.round((totalCheckedIn / bookedSeats) * 100)}%)</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardContent style={{ paddingBottom: 0 }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Active Workshops <span className={styles.countBadge}>{filtered.length}</span>
            </h2>
            {query && (
              <Link href="/admin/workshops" className={styles.clearSearchLink}>
                Clear search for &ldquo;{searchParams.get('q')}&rdquo;
              </Link>
            )}
          </div>
        </CardContent>
        <CardContent style={{ padding: 0 }}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Workshop Details</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Seats Filled</th>
                  <th>Checked In</th>
                  <th>Audience</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={7} className={styles.emptyState}>No workshops match these filters.</td></tr>
                )}
                {paginated.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <Link href={`/admin/workshops/${w.id}`} className={styles.workshopTitle} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {w.title}
                      </Link>
                      <div className={styles.workshopMeta}>
                        {new Date(w.date).toLocaleDateString()} · {w.start_time.slice(0, 5)}–{w.end_time.slice(0, 5)} · {w.location || 'TBA'}
                      </div>
                    </td>
                    <td>
                      <Badge variant={w.status === 'published' ? 'success' : 'neutral'}>{w.status}</Badge>
                    </td>
                    <td>
                      {w.category ? <Badge variant="info">{w.category}</Badge> : <span className={styles.workshopMeta}>—</span>}
                    </td>
                    <td><ProgressBar value={w.seats_booked} max={w.capacity} /></td>
                    <td>
                      {w.seats_booked > 0 ? (
                        <span className={styles.workshopMeta}>
                          {checkedInCounts[w.id] || 0} / {w.seats_booked} ({Math.round(((checkedInCounts[w.id] || 0) / w.seats_booked) * 100)}%)
                        </span>
                      ) : (
                        <span className={styles.workshopMeta}>—</span>
                      )}
                    </td>
                    <td>{w.audience || '—'}</td>
                    <td>
                      <div className={styles.actionCell}>
                        <Link href={`/admin/workshops/${w.id}`} className={styles.iconButton} aria-label="View workshop details">
                          <Eye size={15} />
                        </Link>
                        <Link href={`/admin/workshops/${w.id}/edit`} className={styles.iconButton} aria-label="Edit workshop">
                          <Pencil size={15} />
                        </Link>
                        <button
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          onClick={() => handleDelete(w.id)}
                          aria-label="Delete workshop"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.footerRow}>
            <span>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} results
            </span>
            <div className={styles.pager}>
              <button
                className={styles.pageButton}
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.pageButton} ${currentPage === i + 1 ? styles.pageButtonActive : ''}`}
                  onClick={() => setPage(i + 1)}
                  aria-label={`Go to page ${i + 1}`}
                  aria-current={currentPage === i + 1 ? 'page' : undefined}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={styles.pageButton}
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminWorkshopsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading workshops..." />}>
      <AdminWorkshops />
    </Suspense>
  );
}
