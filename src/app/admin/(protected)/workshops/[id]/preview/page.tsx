'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, MapPin, User as UserIcon, Users, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog/ConfirmDialog';
import { Toast } from '@/components/ui/toast/Toast';
import { formatTime } from '@/lib/formatTime';
import styles from './Preview.module.css';

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
  facilitator_image_url?: string;
  location: string;
  image_url?: string;
  category?: string | null;
  status?: string | null;
};

export default function AdminWorkshopPreview() {
  const params = useParams();
  const router = useRouter();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const workshopId = params?.id as string;

  useEffect(() => {
    if (!workshopId) return;

    (async () => {
      try {
        const res = await fetch(`/api/admin/workshop?id=${workshopId}`);
        const data = await res.json();
        const found = data.data?.[0];
        if (!found) {
          setError('Workshop not found.');
        } else {
          setWorkshop(found);
        }
      } catch {
        setError('Failed to load workshop.');
      } finally {
        setLoading(false);
      }
    })();
  }, [workshopId]);

  const handleDelete = async () => {
    if (!workshop) return;
    setDeleting(true);

    const res = await fetch('/api/admin/workshop', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: workshop.id }),
    });

    if (res.ok) {
      setToast({ type: 'success', message: `"${workshop.title}" deleted successfully.` });
      setTimeout(() => router.push('/admin/workshops'), 1000);
    } else {
      const data = await res.json();
      setToast({ type: 'error', message: data.error || 'Failed to delete workshop.' });
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Loading workshop...</p>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{error || 'Workshop not found.'}</p>
        <button className={styles.backBtn} onClick={() => router.push('/admin/workshops')}>
          <ArrowLeft size={16} /> Back to Workshops
        </button>
      </div>
    );
  }

  const seatsLeft = Math.max(workshop.capacity - (workshop.seats_booked || 0), 0);
  const isFull = seatsLeft === 0;

  return (
    <><div className="animate-fade-in">
      <div className={styles.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button className={styles.backLink} onClick={() => router.push('/admin/workshops')}>
            <ArrowLeft size={16} /> Back to Workshops
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href={`/admin/workshops/${workshop.id}/edit`}>
              <Button variant="outline"><Pencil size={14} /> Edit</Button>
            </Link>
            <Button variant="outline" onClick={() => setDeleteOpen(true)} style={{ color: 'var(--primary-red)' }}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>

        <div className={styles.bannerWrap}>
          <img
            src={workshop.image_url || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360"><rect width="900" height="360" fill="#F3F4F6"/><text x="450" y="190" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="20">No Image</text></svg>')}
            alt={workshop.title}
            className={styles.banner}
          />
          <div className={styles.bannerOverlay}>
            {workshop.category && <span className={styles.category}>{workshop.category}</span>}
            <h1 className={styles.title}>{workshop.title}</h1>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.mainCol}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>About This Workshop</h2>
              <p className={styles.description}>{workshop.description}</p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Date & Time</h2>
              <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <Calendar size={18} />
                  <div>
                    <span className={styles.infoLabel}>Date</span>
                    <span className={styles.infoValue}>
                      {new Date(workshop.date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className={styles.divider} />
                <div className={styles.infoRow}>
                  <Clock size={18} />
                  <div>
                    <span className={styles.infoLabel}>Time</span>
                    <span className={styles.infoValue}>
                      {formatTime(workshop.start_time)} - {formatTime(workshop.end_time)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {workshop.facilitator && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Facilitator</h2>
                <div className={styles.infoCard}>
                  <div className={styles.infoRow}>
                    {workshop.facilitator_image_url ? (
                      <img src={workshop.facilitator_image_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <UserIcon size={18} />
                    )}
                    <div>
                      <span className={styles.infoLabel}>Led by</span>
                      <span className={styles.infoValue} style={{ whiteSpace: 'nowrap' }}>{workshop.facilitator}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.sideCol}>
            <div className={styles.stickyCard}>
              <h3 className={styles.stickyTitle}>Details</h3>

              <div className={styles.statRow}>
                <Users size={16} />
                <span>Capacity: <strong>{workshop.capacity}</strong></span>
              </div>
              <div className={styles.statRow}>
                <Users size={16} />
                <span>Booked: <strong>{workshop.seats_booked}</strong></span>
              </div>
              <div className={styles.statRow}>
                <Users size={16} />
                <span>Remaining: <strong className={isFull ? styles.textDanger : styles.textSuccess}>{seatsLeft}</strong></span>
              </div>

              {workshop.location && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.statRow}>
                    <MapPin size={16} />
                    <span>{workshop.location}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Workshop"
        message={workshop ? `Are you sure you want to delete "${workshop.title}"? This will also delete all associated bookings and cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteOpen(false); setDeleting(false); }}
      />

      <Toast
        open={toast !== null}
        type={toast?.type || 'success'}
        message={toast?.message || ''}
        onClose={() => { if (toast?.type === 'success') router.push('/admin/workshops'); setToast(null); }}
      />
  </>);
}
