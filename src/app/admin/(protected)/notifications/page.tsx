'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Send, Clock, AlertTriangle, Headphones, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import styles from './AdminNotifications.module.css';

type Broadcast = {
  id: string;
  title: string;
  message: string;
  recipient_group: string;
  recipient_count: number;
  status: 'sent' | 'pending' | 'failed';
  sent_at: string;
};

const PAGE_SIZE = 8;

const badgeVariant: Record<Broadcast['status'], 'success' | 'warning' | 'danger'> = {
  sent: 'success',
  pending: 'warning',
  failed: 'danger',
};

export default function AdminNotifications() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | Broadcast['status']>('all');
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({ title: '', message: '', recipient_group: 'All Participants' });

  async function fetchData() {
    const [broadcastsRes, participantsRes] = await Promise.all([
      supabase.from('broadcasts').select('id, title, message, recipient_group, recipient_count, status, sent_at').order('sent_at', { ascending: false }),
      supabase.from('participants').select('id', { count: 'exact', head: true }),
    ]);
    if (broadcastsRes.data) setBroadcasts(broadcastsRes.data as Broadcast[]);
    setParticipantCount(participantsRes.count || 0);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const adminId = sessionData.session?.user.id;
    if (!adminId) {
      alert('You must be logged in as an admin to send announcements.');
      setSending(false);
      return;
    }

    const { error } = await supabase.from('broadcasts').insert([
      {
        admin_id: adminId,
        title: formData.title,
        message: formData.message,
        recipient_group: formData.recipient_group,
        recipient_count: participantCount,
        status: 'sent',
      },
    ]);

    if (error) {
      alert('Error sending announcement: ' + error.message);
    } else {
      setFormData({ title: '', message: '', recipient_group: 'All Participants' });
      setComposing(false);
      fetchData();
    }
    setSending(false);
  };

  const filtered = useMemo(
    () => broadcasts.filter((b) => statusFilter === 'all' || b.status === statusFilter),
    [broadcasts, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = {
    sent: broadcasts.filter((b) => b.status === 'sent').length,
    pending: broadcasts.filter((b) => b.status === 'pending').length,
    failed: broadcasts.filter((b) => b.status === 'failed').length,
  };

  const handleExport = () => {
    const header = 'Title,Recipients,Recipient Count,Sent Date,Status\n';
    const rows = filtered
      .map((b) => [b.title, b.recipient_group, b.recipient_count, new Date(b.sent_at).toISOString(), b.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','))
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'broadcast-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className={styles.emptyState}>Loading announcements...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Announcements &amp; Notifications</h1>
          <p className={styles.subtitle}>Manage broadcasts and track delivery for the E-Learning Week workshops.</p>
        </div>
        <Button onClick={() => setComposing((v) => !v)}>{composing ? 'Close' : '+ Compose Announcement'}</Button>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <span className={styles.statIcon} style={{ backgroundColor: 'var(--success-green-bg)', color: 'var(--success-green)' }}><Send size={18} /></span>
          <div className={styles.statValue}>{stats.sent}</div>
          <div className={styles.statLabel}>Total Sent</div>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statIcon} style={{ backgroundColor: 'var(--warning-orange-bg)', color: 'var(--warning-orange)' }}><Clock size={18} /></span>
          <div className={styles.statValue}>{stats.pending}</div>
          <div className={styles.statLabel}>Pending</div>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statIcon} style={{ backgroundColor: 'var(--primary-red-light)', color: 'var(--primary-red)' }}><AlertTriangle size={18} /></span>
          <div className={styles.statValue}>{stats.failed}</div>
          <div className={styles.statLabel}>Delivery Failed</div>
        </Card>
        <Card className={styles.statCard}>
          <span className={styles.statIcon} style={{ backgroundColor: 'var(--primary-red-light)', color: 'var(--primary-red)' }}><Headphones size={18} /></span>
          <div className={styles.statValue}>{participantCount.toLocaleString()}</div>
          <div className={styles.statLabel}>Support Reach</div>
          <div className={styles.statCaption}>Registered participants in the workshop portal</div>
        </Card>
      </div>

      {composing && (
        <Card>
          <CardContent>
            <h2 className={styles.sectionTitle} style={{ marginBottom: '1.25rem' }}>Compose Announcement</h2>
            <form onSubmit={handleCompose} className={styles.composeForm}>
              <div className={styles.textareaWrapper}>
                <label className={styles.textareaLabel}>Recipients</label>
                <select name="recipient_group" value={formData.recipient_group} onChange={handleChange}>
                  <option value="All Participants">All Participants ({participantCount.toLocaleString()})</option>
                </select>
              </div>
              <Input
                label="Announcement Title"
                name="title"
                placeholder="e.g. Workshop Rescheduled"
                value={formData.title}
                onChange={handleChange}
                required
              />
              <div className={styles.textareaWrapper}>
                <label className={styles.textareaLabel}>Message</label>
                <textarea
                  name="message"
                  className={styles.textarea}
                  placeholder="Type your announcement here..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={styles.composeActions}>
                <Button type="button" variant="outline" onClick={() => setComposing(false)}>Cancel</Button>
                <Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send Announcement'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent style={{ paddingBottom: 0 }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Broadcast History</h2>
            <div className={styles.sectionActions}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <Button type="button" variant="outline" onClick={handleExport}>
                <Download size={16} style={{ marginRight: '0.5rem' }} /> Export Report
              </Button>
            </div>
          </div>
        </CardContent>
        <CardContent style={{ padding: 0 }}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Announcement Details</th>
                  <th>Recipients</th>
                  <th>Sent Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={4} className={styles.emptyState}>No announcements yet.</td></tr>
                )}
                {paginated.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className={styles.announcementTitle}>{b.title}</div>
                      <div className={styles.announcementMessage}>{b.message}</div>
                    </td>
                    <td>
                      <div className={styles.recipientGroup}>{b.recipient_group}</div>
                      <div className={styles.recipientCount}>{b.recipient_count.toLocaleString()} recipients</div>
                    </td>
                    <td>{new Date(b.sent_at).toLocaleString()}</td>
                    <td><Badge variant={badgeVariant[b.status]}>{b.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.footerRow}>
            <span>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} announcements
            </span>
            <div className={styles.pager}>
              <button className={styles.pageButton} disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.pageButton} ${currentPage === i + 1 ? styles.pageButtonActive : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className={styles.pageButton} disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
