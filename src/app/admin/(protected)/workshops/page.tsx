'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Armchair, Pencil, Trash2, Eye } from 'lucide-react';
import { requestApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { formatTime } from '@/lib/formatTime';
import { ProgressBar } from '@/components/ui/progress/ProgressBar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog/ConfirmDialog';
import { Toast } from '@/components/ui/toast/Toast';
import styles from './AdminWorkshops.module.css';

type Workshop = {
  id: string;
  title: string;
  facilitator: string | null;
  facilitator_image_url?: string;
  location: string | null;
  category: string | null;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  overbooking_limit: number;
  seats_booked: number;
  description?: string;
  image_url?: string;
};

const PAGE_SIZE = 6;

export default function AdminWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Workshop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function fetchWorkshops() {
    const response = await requestApi<{ data: Workshop[] }>('/api/admin/workshop');
    setWorkshops(response.data || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await fetchWorkshops();
    })();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const res = await fetch('/api/admin/workshop', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.id }),
    });

    if (res.ok) {
      setWorkshops(workshops.filter((w) => w.id !== deleteTarget.id));
      setToast({ type: 'success', message: `"${deleteTarget.title}" deleted successfully.` });
    } else {
      const data = await res.json();
      setToast({ type: 'error', message: data.error || 'Failed to delete workshop.' });
    }

    setDeleting(false);
    setDeleteTarget(null);
  };

  const categories = useMemo(
    () => Array.from(new Set(workshops.map((w) => w.category).filter(Boolean))) as string[],
    [workshops]
  );

  const filtered = useMemo(() => {
    return workshops.filter((w) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !w.title.toLowerCase().includes(q) &&
          !(w.facilitator || '').toLowerCase().includes(q) &&
          !(w.location || '').toLowerCase().includes(q) &&
          !(w.category || '').toLowerCase().includes(q)
        ) return false;
      }
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
      if (dateFrom && w.date < dateFrom) return false;
      if (dateTo && w.date > dateTo) return false;
      return true;
    });
  }, [workshops, searchQuery, statusFilter, categoryFilter, dateFrom, dateTo]);

  const totalSeats = filtered.reduce((sum, w) => sum + w.capacity, 0);
  const bookedSeats = filtered.reduce((sum, w) => sum + w.seats_booked, 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) return <div className={styles.emptyState}>Loading workshops...</div>;

  return (
    <><div className={styles.page}>
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
            <div className={styles.searchField}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search workshops..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Status</label>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Category</label>
              <select
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
              <label className={styles.filterLabel}>From</label>
              <input
                type="date"
                className={styles.dateInput}
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>To</label>
              <input
                type="date"
                className={styles.dateInput}
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
            {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); setDateFrom(''); setDateTo(''); setPage(1); }}
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
      </div>

      <Card>
        <CardContent style={{ paddingBottom: 0 }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Active Workshops <span className={styles.countBadge}>{filtered.length}</span>
            </h2>
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
                  <th>Facilitator</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={6} className={styles.emptyState}>No workshops match these filters.</td></tr>
                )}
                {paginated.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <Link href={`/admin/workshops/${w.id}`} className={styles.workshopTitle} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {w.title}
                      </Link>
                      <div className={styles.workshopMeta}>
                        {new Date(w.date).toLocaleDateString()} · {formatTime(w.start_time)}–{formatTime(w.end_time)} · {w.location || 'TBA'}
                      </div>
                    </td>
                    <td>
                      <Badge variant={w.status === 'published' ? 'success' : 'neutral'}>{w.status}</Badge>
                    </td>
                    <td>
                      {w.category ? <Badge variant="info">{w.category}</Badge> : <span className={styles.workshopMeta}>—</span>}
                    </td>
                    <td><ProgressBar value={w.seats_booked} max={w.overbooking_limit ?? w.capacity} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {w.facilitator_image_url ? (
                        <img src={w.facilitator_image_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.375rem' }} />
                      ) : null}
                      {w.facilitator || '—'}
                    </td>
                    <td>
                      <div className={styles.actionCell}>
                        <Link href={`/admin/workshops/${w.id}/preview`} className={styles.iconButton} aria-label="Preview workshop">
                          <Eye size={15} />
                        </Link>
                        <Link href={`/admin/workshops/${w.id}/edit`} className={styles.iconButton} aria-label="Edit workshop">
                          <Pencil size={15} />
                        </Link>
                        <button
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          onClick={() => setDeleteTarget(w)}
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
              >
                ‹
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.pageButton} ${currentPage === i + 1 ? styles.pageButtonActive : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={styles.pageButton}
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Workshop"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.title}"? This will also delete all associated bookings and cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleting(false); }}
      />

      <Toast
        open={toast !== null}
        type={toast?.type || 'success'}
        message={toast?.message || ''}
        onClose={() => setToast(null)}
      />
  </>);
}
