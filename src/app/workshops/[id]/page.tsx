'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, User, Users, ArrowLeft, CheckCircle, XCircle, Loader2, AlertCircle, X, LogIn, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSessionToken } from '@/lib/api';
import { formatTime } from '@/lib/formatTime';
import styles from './WorkshopDetail.module.css';

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

type BookingRow = {
  id: string;
  workshop_id: string;
  approved: boolean;
  checked_in: boolean;
  workshops?: Workshop | null;
};

const COUNTRY_CODES = [
  { code: '+233', label: 'GH +233' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+234', label: 'NG +234' },
  { code: '+27', label: 'ZA +27' },
  { code: '+254', label: 'KE +254' },
  { code: '+91', label: 'IN +91' },
  { code: '+86', label: 'CN +86' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+61', label: 'AU +61' },
  { code: '+81', label: 'JP +81' },
  { code: '+7', label: 'RU +7' },
  { code: '+55', label: 'BR +55' },
  { code: '+52', label: 'MX +52' },
  { code: '+39', label: 'IT +39' },
  { code: '+34', label: 'ES +34' },
  { code: '+82', label: 'KR +82' },
  { code: '+65', label: 'SG +65' },
  { code: '+60', label: 'MY +60' },
  { code: '+63', label: 'PH +63' },
  { code: '+62', label: 'ID +62' },
  { code: '+66', label: 'TH +66' },
  { code: '+84', label: 'VN +84' },
  { code: '+20', label: 'EG +20' },
  { code: '+212', label: 'MA +212' },
  { code: '+256', label: 'UG +256' },
  { code: '+255', label: 'TZ +255' },
  { code: '+260', label: 'ZM +260' },
  { code: '+263', label: 'ZW +263' },
];

export default function WorkshopDetail() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [bookedWorkshops, setBookedWorkshops] = useState<Workshop[]>([]);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    conflictWorkshop?: Workshop;
    onConfirm?: () => void;
    confirmLabel?: string;
  } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('+233');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const workshopId = params?.id as string;

  useEffect(() => {
    if (!workshopId) return;
    let active = true;

    (async () => {
      try {
        const { data, error: fetchError } = await supabase.from('workshops').select('*').eq('id', workshopId).single();
        if (!active) return;

        if (fetchError || !data) {
          setError('Workshop not found.');
          setLoading(false);
          return;
        }

        setWorkshop(data);

        if (user) {
          const token = await getSessionToken();
          if (token) {
            const bookRes = await fetch('/api/book', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json().catch(() => ({ data: [] }))).catch(() => ({ data: [] as BookingRow[] }));
            const rows: BookingRow[] = bookRes.data || [];
            const userBooking = rows.find((b: BookingRow) => b.workshop_id === workshopId);
            setBooking(userBooking || null);
            setBookedWorkshops(rows.map((b) => b.workshops).filter((w): w is Workshop => !!w));
          }
        }
      } catch (e) {
        if (active) setError('Failed to load workshop. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [user, workshopId]);

  const handleBook = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!workshop || updating) return;

    const conflicting = bookedWorkshops.filter(
      (w) => w.date === workshop.date && w.start_time === workshop.start_time
    );
    if (conflicting.length > 0) {
      setModal({
        title: 'Time Conflict',
        message: `You already have "${conflicting[0].title}" booked at this time.`,
        conflictWorkshop: conflicting[0],
      });
      return;
    }

    if (!user?.phone && !user?.user_metadata?.phone) {
      setPhoneCountry('+233');
      setPhoneNumber('');
      setShowPhoneModal(true);
      return;
    }

    setUpdating(true);
    try {
      const token = await getSessionToken();
      if (!token) {
        setModal({ title: 'Sign In Required', message: 'Please sign in to book a workshop.' });
        setUpdating(false);
        return;
      }

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId: workshop.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setModal({ title: 'Booking Failed', message: data?.error || 'Booking failed.' });
        return;
      }

      if (data.data) {
        const newBooking = Array.isArray(data.data) ? data.data[0] : data.data;
        setBooking(newBooking);
        setWorkshop((w) => w ? { ...w, seats_booked: w.seats_booked + 1 } : w);
      }
    } catch (err) {
      setModal({ title: 'Booking Failed', message: 'Booking failed. Please try again.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!booking || updating) return;
    setModal({
      title: 'Cancel Booking?',
      message: `Are you sure you want to cancel your booking for "${workshop?.title}"?`,
      confirmLabel: 'Yes, Cancel',
      onConfirm: async () => {
        setModal(null);
        setUpdating(true);
        try {
          const token = await getSessionToken();
          if (!token) {
            setModal({ title: 'Sign In Required', message: 'Please sign in.' });
            setUpdating(false);
            return;
          }

          const res = await fetch('/api/book', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: booking.id }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            setModal({ title: 'Cancel Failed', message: errData?.error || 'Cancel failed.' });
            return;
          }

          setBooking(null);
          setWorkshop((w) => w ? { ...w, seats_booked: Math.max(w.seats_booked - 1, 0) } : w);
          setToast({ type: 'success', message: 'Booking cancelled successfully.' });
        } catch (err) {
          setModal({ title: 'Cancel Failed', message: 'Cancel failed. Please try again.' });
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  const handleSavePhone = async () => {
    const full = phoneCountry + phoneNumber.replace(/\s/g, '');
    if (full.length < 8 || !phoneNumber.trim()) return;
    setSavingPhone(true);
    try {
      const token = await getSessionToken();
      if (!token) { setSavingPhone(false); return; }
      const res = await fetch('/api/account/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: full }),
      });
      if (!res.ok) throw new Error();
      await supabase.auth.updateUser({ phone: full, data: { phone: full } });
      setShowPhoneModal(false);
      await handleBook();
    } catch {
      setModal({ title: 'Error', message: 'Failed to save phone number.' });
    } finally {
      setSavingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.center}>
        <Loader2 size={32} className={styles.spinner} />
        <p>Loading workshop...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.backBtn} onClick={() => router.push('/workshops')}>
          <ArrowLeft size={16} /> Back to Workshops
        </button>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>Workshop not found.</p>
        <button className={styles.backBtn} onClick={() => router.push('/workshops')}>
          <ArrowLeft size={16} /> Back to Workshops
        </button>
      </div>
    );
  }

  const seatsLeft = Math.max(workshop.capacity - (workshop.seats_booked || 0), 0);
  const isFull = seatsLeft === 0;

  return (
    <div className="animate-fade-in">
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => router.push('/workshops')}>
          <ArrowLeft size={16} /> Back to Workshops
        </button>

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
                      {workshop.start_time ? formatTime(workshop.start_time) : ''} - {workshop.end_time ? formatTime(workshop.end_time) : ''}
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
                      <User size={18} />
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
              <h3 className={styles.stickyTitle}>Booking</h3>

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

              <div className={styles.divider} />

              {!user ? (
                <button
                  className={`${styles.actionBtn} ${styles.bookBtn}`}
                  onClick={() => router.push('/auth/login')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <LogIn size={16} /> Sign in to Book
                </button>
              ) : booking ? (
                <div className={styles.statusSection}>
                  <div className={`${styles.statusBadge} ${booking.approved ? styles.statusApproved : styles.statusPending}`}>
                    {booking.approved ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    <div>
                      <span className={styles.statusLabel}>Status</span>
                      <span className={styles.statusValue}>{booking.approved ? 'Approved' : 'Pending Approval'}</span>
                    </div>
                  </div>
                  <button
                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                    onClick={handleCancel}
                    disabled={updating}
                  >
                    {updating ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                </div>
              ) : isFull ? (
                <div className={styles.statusSection}>
                  <div className={`${styles.statusBadge} ${styles.statusFull}`}>
                    <XCircle size={18} />
                    <div>
                      <span className={styles.statusLabel}>Availability</span>
                      <span className={styles.statusValue}>Workshop Full</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.statusSection}>
                  <div className={`${styles.statusBadge} ${styles.statusAvailable}`}>
                    <CheckCircle size={18} />
                    <div>
                      <span className={styles.statusLabel}>Availability</span>
                      <span className={styles.statusValue}>{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} available</span>
                    </div>
                  </div>
                  <button
                    className={`${styles.actionBtn} ${styles.bookBtn}`}
                    onClick={handleBook}
                    disabled={updating}
                  >
                    {updating ? 'Booking...' : 'Book Now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => { if (!modal.onConfirm) setModal(null); }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px',
              width: '100%', maxWidth: '420px',
              padding: '1.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: '#FEF2F2', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <AlertCircle size={22} color="#DC2626" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.375rem', fontSize: '1.05rem', fontWeight: 700 }}>
                  {modal.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', lineHeight: 1.5 }}>
                  {modal.message}
                </p>
                {modal.conflictWorkshop && (
                  <div
                    style={{
                      marginTop: '0.75rem', padding: '0.75rem',
                      background: '#F9FAFB', borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#111' }}>
                      {modal.conflictWorkshop.title}
                    </div>
                    <div style={{ color: '#666', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span>
                        📅 {new Date(modal.conflictWorkshop.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span>
                        ⏰ {formatTime(modal.conflictWorkshop.start_time)} - {formatTime(modal.conflictWorkshop.end_time)}
                      </span>
                      {modal.conflictWorkshop.location && (
                        <span>📍 {modal.conflictWorkshop.location}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.25rem', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', gap: '0.75rem' }}>
              {modal.onConfirm ? (
                <>
                  <button
                    onClick={() => setModal(null)}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: 'transparent', color: '#666', border: '1px solid #D1D5DB',
                      borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={() => { modal.onConfirm!(); }}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: '#DC2626', color: '#fff', border: 'none',
                      borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {modal.confirmLabel || 'OK'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModal(null)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: '#DC2626', color: '#fff', border: 'none',
                    borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPhoneModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => { if (!savingPhone) { setShowPhoneModal(false); } }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px',
              width: '100%', maxWidth: '420px',
              padding: '1.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: '#EFF6FF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Phone size={22} color="#3B82F6" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 700 }}>
                  Phone Number Required
                </h3>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#666', lineHeight: 1.4 }}>
                  Please provide your phone number so we can send you SMS notifications about your bookings.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={phoneCountry}
                    onChange={(e) => setPhoneCountry(e.target.value)}
                    style={{
                      width: 'auto', padding: '0.5rem 0.5rem',
                      border: '1px solid #D1D5DB', borderRadius: '8px',
                      fontSize: '0.8125rem', background: '#fff',
                      flexShrink: 0, maxWidth: '120px',
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSavePhone(); }}
                    style={{
                      flex: 1, padding: '0.5rem 0.75rem',
                      border: '1px solid #D1D5DB', borderRadius: '8px',
                      fontSize: '0.875rem', outline: 'none',
                    }}
                    autoFocus
                  />
                </div>
              </div>
              <button
                onClick={() => { if (!savingPhone) setShowPhoneModal(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.25rem', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.75rem' }}>
              <button
                onClick={() => setShowPhoneModal(false)}
                disabled={savingPhone}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'transparent', color: '#666', border: '1px solid #D1D5DB',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                  cursor: savingPhone ? 'not-allowed' : 'pointer',
                  opacity: savingPhone ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#3B82F6', color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                  cursor: savingPhone ? 'not-allowed' : 'pointer',
                  opacity: savingPhone ? 0.7 : 1,
                }}
              >
                {savingPhone ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 99999,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            borderRadius: '10px',
            background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${toast.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: toast.type === 'success' ? '#065F46' : '#991B1B',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            cursor: 'pointer',
          }}
          onClick={() => setToast(null)}
        >
          {toast.message}
          <X size={16} style={{ flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}
