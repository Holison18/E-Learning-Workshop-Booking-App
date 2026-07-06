'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken, requestApi } from '@/lib/api';
import { formatTime } from '@/lib/formatTime';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { AlertCircle, X } from 'lucide-react';

const generateQRUrl = (data: string) => {
  return `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=200`;
};

const qrData = (booking: Booking, userName: string) => JSON.stringify({
  id: booking.id,
  u: userName,
  w: booking.workshops.title,
  d: booking.workshops.date,
  a: booking.approved,
});

type Booking = {
  id: string;
  checked_in: boolean;
  approved: boolean;
  workshops: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    facilitator: string;
    facilitator_image_url?: string;
  };
};

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertConfirm, setAlertConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handlePrintSchedule = () => {
    if (bookings.length === 0) {
      setAlertMsg('You don\'t have any bookings to print. Get booking!');
      return;
    }

    const approved = bookings.filter(b => b.approved);
    const pending = bookings.filter(b => !b.approved);

    if (approved.length === 0 && pending.length === 0) {
      setAlertMsg('You don\'t have any bookings to print. Get booking!');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setAlertMsg('Please allow pop-ups to print the schedule.');
      return;
    }

    const userName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
      ? `${escapeHtml(user.user_metadata.first_name)} ${escapeHtml(user.user_metadata.last_name)}`
      : user?.email || 'Participant';

    const qrUrl = (booking: Booking) => `https://quickchart.io/qr?text=${encodeURIComponent(qrData(booking, userName))}&size=200`;

    const renderCard = (b: Booking, badge: string, badgeBg: string) => {
      const workshop = b.workshops;
      const timeRange = workshop.end_time
        ? `${formatTime(workshop.start_time)} - ${formatTime(workshop.end_time)}`
        : formatTime(workshop.start_time);

      return `
        <div class="card">
          <div class="card-left">
            <div class="qr-wrapper">
              <img src="${qrUrl(b)}" alt="QR" />
            </div>
          </div>
          <div class="card-body">
            <div class="card-header">
              <h3>${escapeHtml(workshop.title)}</h3>
              <span class="badge" style="background:${badgeBg}">${badge}</span>
            </div>
            <table class="details">
              <tr><td class="icon">📅</td><td class="label">Date</td><td>${new Date(workshop.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
              <tr><td class="icon">⏰</td><td class="label">Time</td><td>${timeRange}</td></tr>
              <tr><td class="icon">📍</td><td class="label">Location</td><td>${escapeHtml(workshop.location)}</td></tr>
              ${workshop.facilitator ? `<tr><td class="icon">${workshop.facilitator_image_url ? `<img src="${escapeHtml(workshop.facilitator_image_url)}" alt="" style="width:18px;height:18px;border-radius:50%;object-fit:cover;vertical-align:middle" />` : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}</td><td class="label">Facilitator</td><td>${escapeHtml(workshop.facilitator)}</td></tr>` : ''}
            </table>
            ${b.checked_in ? '<div class="checked-in">✓ Checked In</div>' : ''}
          </div>
        </div>
      `;
    };

    const approvedCards = approved.map(b => renderCard(b, 'Approved', '#059669')).join('');
    const pendingCards = pending.map(b => renderCard(b, 'Pending', '#D97706')).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>My Schedule</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #1a1a1a; }
        .page-header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #059669; }
        .page-header h1 { font-size: 1.75rem; color: #059669; }
        .page-header .meta { margin-top: 0.5rem; color: #666; font-size: 0.875rem; display: flex; justify-content: space-between; }
        .section-header { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: #1a1a1a; }
        .section-header .count { font-weight: 400; color: #666; font-size: 0.9rem; }
        .section + .section { margin-top: 2rem; }
        .grid { display: flex; flex-wrap: wrap; gap: 1.25rem; }
        .card { display: flex; gap: 1.5rem; padding: 1.5rem; border: 1px solid #d1d5db; border-radius: 12px; flex: 1 1 400px; max-width: 100%; break-inside: avoid; }
        .card-left { flex-shrink: 0; }
        .qr-wrapper { width: 130px; height: 130px; border: 1px solid #e5e7eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 4px; }
        .qr-wrapper img { width: 100%; height: 100%; object-fit: contain; }
        .card-body { flex: 1; min-width: 0; }
        .card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .card-header h3 { font-size: 1.125rem; font-weight: 700; margin: 0; }
        .badge { display: inline-flex; align-items: center; padding: 0.2rem 0.6rem; border-radius: 999px; color: #fff; font-size: 0.7rem; font-weight: 700; white-space: nowrap; }
        .details { width: 100%; border-collapse: collapse; }
        .details td { padding: 0.35rem 0; vertical-align: top; }
        .details td:first-child { width: 1.5rem; font-size: 1rem; }
        .details td.label { width: 5.5rem; font-size: 0.8rem; color: #666; font-weight: 500; }
        .details td:last-child { font-size: 0.9rem; }
        .checked-in { margin-top: 0.75rem; color: #059669; font-size: 0.875rem; font-weight: 600; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head>
      <body>
        <div class="page-header">
          <h1>My Schedule</h1>
          <div class="meta">
            <span>Participant: ${userName}</span>
            <span>Printed: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        ${approvedCards ? `<div class="section"><div class="section-header">Approved <span class="count">(${approved.length})</span></div><div class="grid">${approvedCards}</div></div>` : ''}
        ${pendingCards ? `<div class="section"><div class="section-header">Pending <span class="count">(${pending.length})</span></div><div class="grid">${pendingCards}</div></div>` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  useEffect(() => {
    async function fetchBookings() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await getSessionToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await requestApi<{ data: Booking[] }>('/api/book', { token });
        setBookings(response.data || []);
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, [user]);

  const handleCancelBooking = async (bookId: string) => {
    setAlertConfirm({
      message: 'Are you sure you want to cancel this booking? This cannot be undone.',
      onConfirm: async () => {
        setAlertConfirm(null);
        try {
          const token = await getSessionToken();
          if (!token) {
            setAlertMsg('You must be signed in to cancel a booking.');
            return;
          }

          setCancellingId(bookId);
          await requestApi('/api/book', {
            method: 'DELETE',
            token,
            body: { bookId },
          });

          setBookings((current) => current.filter((booking) => booking.id !== bookId));
          setAlertMsg('Your booking has been cancelled.');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel booking.';
          setAlertMsg(message);
        } finally {
          setCancellingId('');
        }
      },
    });
  };

  if (loading) return <div>Loading your bookings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>My Bookings</h1>
          <p style={{ color: 'var(--secondary-gray)' }}>View your schedule and generate your check-in QR codes.</p>
        </div>
        <Button variant="outline" onClick={handlePrintSchedule}>Print Schedule</Button>
      </div>



      {bookings.length === 0 ? (
        <Card>
          <CardContent style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--secondary-gray)' }}>You haven&apos;t booked any workshops yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {['approved', 'pending'].map((status) => {
            const filtered = bookings.filter((b) => status === 'approved' ? b.approved : !b.approved);
            if (filtered.length === 0) return null;

            return (
              <div key={status}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {status === 'approved' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '999px', background: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>Approved</span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '999px', background: '#D97706', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>Pending</span>
                  )}
                  <span style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', fontWeight: 400 }}>{filtered.length} booking{filtered.length === 1 ? '' : 's'}</span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  {filtered.map((booking) => {
                    const userName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
                      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                      : user?.email || 'You';
                    const qrUrl = generateQRUrl(qrData(booking, userName));

                    const statusBadge = booking.approved
                      ? { bg: '#059669', label: 'Approved' }
                      : { bg: '#D97706', label: 'Pending' };

                    return (
                      <Card key={booking.id} className="animate-fade-in">
                        <CardContent style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', alignItems: 'center' }}>
                          <img src={qrUrl} alt="Check-in QR Code" style={{ width: '120px', height: '120px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{booking.workshops.title}</h3>
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.5rem', borderRadius: '999px', background: statusBadge.bg, color: '#fff', fontSize: '0.675rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{statusBadge.label}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span>📅 {new Date(booking.workshops.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              <span>⏰ {formatTime(booking.workshops.start_time)} - {formatTime(booking.workshops.end_time)}</span>
                              <span>📍 {booking.workshops.location}</span>
                            </div>
                            {booking.checked_in ? (
                              <div style={{ marginTop: '0.75rem' }}>
                                <div style={{ color: 'var(--success-green)', fontSize: '0.875rem', fontWeight: 600 }}>✓ Checked In</div>
                                <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: '0.25rem' }}>Checked-in bookings cannot be cancelled.</div>
                              </div>
                            ) : (
                              <div style={{ marginTop: '1rem' }}>
                                <Button
                                  variant="outline"
                                  type="button"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={cancellingId === booking.id}
                                >
                                  {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {alertMsg && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setAlertMsg('')}
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
                <p style={{ margin: 0, fontSize: '0.9375rem', color: '#333', lineHeight: 1.5 }}>
                  {alertMsg}
                </p>
              </div>
              <button
                onClick={() => setAlertMsg('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.25rem', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={() => setAlertMsg('')}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: '#DC2626', color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {alertConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setAlertConfirm(null)}
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
                <p style={{ margin: 0, fontSize: '0.9375rem', color: '#333', lineHeight: 1.5 }}>
                  {alertConfirm.message}
                </p>
              </div>
              <button
                onClick={() => setAlertConfirm(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.25rem', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.75rem' }}>
              <button
                onClick={() => setAlertConfirm(null)}
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
                onClick={alertConfirm.onConfirm}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#DC2626', color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
