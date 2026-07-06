'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken, requestApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/toast/Toast';
import { formatTime } from '@/lib/formatTime';
import { Calendar as CalendarIcon, Clock, MapPin, User, AlertCircle, X, LogIn } from 'lucide-react';
import styles from './Workshops.module.css';

const FALLBACK_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">' +
  '<rect width="400" height="200" fill="#F3F4F6"/>' +
  '<text x="200" y="105" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="14">No Image</text>' +
  '</svg>'
);

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
  workshops?: {
    date: string;
    start_time?: string;
    end_time?: string;
  } | null;
};

type Filters = {
  search: string;
  category: string;
  availability: 'all' | 'booked' | 'available';
  dateFrom: string;
  dateTo: string;
};

type WorkshopGroup = {
  date: string;
  workshops: Workshop[];
};

export default function WorkshopsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [bookingIdsByWorkshopId, setBookingIdsByWorkshopId] = useState<Record<string, string>>({});
  const [approvalByWorkshopId, setApprovalByWorkshopId] = useState<Record<string, boolean>>({});
  const [checkedInByWorkshopId, setCheckedInByWorkshopId] = useState<Record<string, boolean>>({});
  const [updatingWorkshopId, setUpdatingWorkshopId] = useState('');
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    conflictWorkshop?: Workshop;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: 'all',
    availability: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data, error } = await supabase.from('workshops').select('*');
        if (error) throw error;
        if (!active) return;
        setWorkshops(data || []);
      } catch (err) {
        console.error('Failed to load workshops:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) {
      setBookedIds(new Set());
      setBookingIdsByWorkshopId({});
      setApprovalByWorkshopId({});
      setCheckedInByWorkshopId({});
      return;
    }

    let active = true;

    (async () => {
      try {
        const token = await getSessionToken();
        if (!token) return;

        const response = await requestApi<{ data: BookingRow[] }>('/api/book', { token });
        const bookedRows: BookingRow[] = response.data || [];

        if (!active) return;

        setBookedIds(new Set(bookedRows.map((booking: BookingRow) => booking.workshop_id)));
        setBookingIdsByWorkshopId(
          bookedRows.reduce<Record<string, string>>((acc, booking: BookingRow) => {
            acc[booking.workshop_id] = booking.id;
            return acc;
          }, {})
        );
        setApprovalByWorkshopId(
          bookedRows.reduce<Record<string, boolean>>((acc, booking: BookingRow) => {
            acc[booking.workshop_id] = !!booking.approved;
            return acc;
          }, {})
        );
        setCheckedInByWorkshopId(
          bookedRows.reduce<Record<string, boolean>>((acc, booking: BookingRow) => {
            acc[booking.workshop_id] = !!booking.checked_in;
            return acc;
          }, {})
        );
      } catch (err) {
        console.error('Failed to load bookings:', err);
      }
    })();

    return () => { active = false; };
  }, [user]);

  const syncBookings = async (token: string) => {
    const response = await requestApi<{ data: BookingRow[] }>('/api/book', { token });
    const bookedRows: BookingRow[] = response.data || [];

    setBookedIds(new Set(bookedRows.map((booking: BookingRow) => booking.workshop_id)));
    setBookingIdsByWorkshopId(
      bookedRows.reduce<Record<string, string>>((accumulator: Record<string, string>, booking: BookingRow) => {
        accumulator[booking.workshop_id] = booking.id;
        return accumulator;
      }, {})
    );
    setApprovalByWorkshopId(
      bookedRows.reduce<Record<string, boolean>>((accumulator, booking: BookingRow) => {
        accumulator[booking.workshop_id] = !!booking.approved;
        return accumulator;
      }, {})
    );
    setCheckedInByWorkshopId(
      bookedRows.reduce<Record<string, boolean>>((accumulator, booking: BookingRow) => {
        accumulator[booking.workshop_id] = !!booking.checked_in;
        return accumulator;
      }, {})
    );
  };

  const handleBookWorkshop = async (workshop: Workshop) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (bookedIds.has(workshop.id) || updatingWorkshopId) return;

    const conflicting = workshops.filter(
      (w) => bookedIds.has(w.id) && w.date === workshop.date && w.start_time === workshop.start_time
    );
    if (conflicting.length > 0) {
      setAlertModal({
        title: 'Time Conflict',
        message: `You already have "${conflicting[0].title}" booked at this time.`,
        conflictWorkshop: conflicting[0],
      });
      return;
    }

    if (!user?.phone && !user?.user_metadata?.phone) {
      router.push('/account?missing=contact');
      return;
    }

    if (!user?.user_metadata?.institution) {
      router.push('/account?missing=contact');
      return;
    }

    await proceedBooking(workshop);
  };

  const proceedBooking = async (workshop: Workshop) => {
    setUpdatingWorkshopId(workshop.id);
    try {
      const token = await getSessionToken();
      if (!token) {
        setAlertModal({ title: 'Sign In Required', message: 'You must be signed in to book workshops.' });
        return;
      }

      const response = await requestApi<{ message?: string; data?: unknown }>('/api/book', {
        method: 'POST',
        token,
        body: { workshopId: workshop.id },
      });

      if (response.message !== 'Already booked') {
        setWorkshops((current) =>
          current.map((item) =>
            item.id === workshop.id
              ? { ...item, seats_booked: (item.seats_booked || 0) + 1 }
              : item
          )
        );
      }

      await syncBookings(token);
      if (response.message === 'Already booked') {
        setAlertModal({ title: 'Already Booked', message: 'You already booked this workshop.' });
      } else {
        setToast({ type: 'success', message: 'Workshop booked successfully!' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to book workshop.';
      setAlertModal({ title: 'Error', message });
    } finally {
      setUpdatingWorkshopId('');
    }
  };

  const handleCancelBooking = async (targetId?: string) => {
    const id = targetId || cancelTarget;
    if (!id) return;
    const bookingId = bookingIdsByWorkshopId[id];
    if (!bookingId) return;

    setUpdatingWorkshopId(id);
    try {
      const token = await getSessionToken();
      if (!token) {
        setAlertModal({ title: 'Sign In Required', message: 'You must be signed in to cancel a booking.' });
        return;
      }

      await requestApi('/api/book', {
        method: 'DELETE',
        token,
        body: { bookId: bookingId },
      });

      setWorkshops((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, seats_booked: Math.max((item.seats_booked || 1) - 1, 0) }
            : item
        )
      );

      await syncBookings(token);
      setAlertModal({ title: 'Cancelled', message: 'Your booking has been cancelled.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel booking.';
      setAlertModal({ title: 'Error', message });
    } finally {
      setUpdatingWorkshopId('');
      setCancelTarget(null);
    }
  };

  const categoryOptions = useMemo(
    () => Array.from(new Set(workshops.map((workshop) => workshop.category).filter((category): category is string => Boolean(category)))),
    [workshops]
  );

  const filteredWorkshops = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return workshops.filter((workshop) => {
      if (filters.category !== 'all' && workshop.category !== filters.category) return false;
      if (filters.availability === 'booked' && !bookedIds.has(workshop.id)) return false;
      if (filters.availability === 'available' && bookedIds.has(workshop.id)) return false;
      if (filters.dateFrom && workshop.date < filters.dateFrom) return false;
      if (filters.dateTo && workshop.date > filters.dateTo) return false;

      if (query) {
        const searchable = [workshop.title, workshop.description, workshop.facilitator, workshop.location, workshop.category || '']
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [workshops, filters, bookedIds]);

  const workshopGroups = useMemo<WorkshopGroup[]>(() => {
    const grouped = new Map<string, Workshop[]>();

    filteredWorkshops.forEach((workshop) => {
      const existing = grouped.get(workshop.date) || [];
      existing.push(workshop);
      grouped.set(workshop.date, existing);
    });

    return Array.from(grouped.entries())
      .sort(([leftDate], [rightDate]) => new Date(leftDate).getTime() - new Date(rightDate).getTime())
      .map(([date, items]) => ({
        date,
        workshops: items.sort((left, right) => {
          const leftDate = new Date(`${left.date}T${left.start_time}`);
          const rightDate = new Date(`${right.date}T${right.start_time}`);
          return leftDate.getTime() - rightDate.getTime();
        }),
      }));
  }, [filteredWorkshops]);

  const filteredCount = filteredWorkshops.length;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#999' }}>Loading workshops...</div>;
  }

  return (
    <>
    <div className="animate-fade-in">
      <section className={styles.workshopsSection}>
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle} style={{ fontSize: '1.5rem' }}>Discovery Hub</h3>
            <p className={styles.panelSubtitle}>Use the filters below to narrow the workshop listings.</p>
          </div>
          <div className={styles.panelAction}>{filteredCount} result{filteredCount === 1 ? '' : 's'}</div>
        </div>

        <div className={styles.cardPanel} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.filterGrid}>
            <label className={styles.filterField} style={{ gridColumn: 'span 3' }}>
              <span className={styles.filterLabel}>Search</span>
              <input
                className={styles.filterInput}
                type="search"
                placeholder="Title, facilitator, location"
                value={filters.search}
                onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
              />
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Category</span>
              <select
                className={styles.filterSelect}
                value={filters.category}
                onChange={(e) => setFilters((current) => ({ ...current, category: e.target.value }))}
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Availability</span>
              <select
                className={styles.filterSelect}
                value={filters.availability}
                onChange={(e) => setFilters((current) => ({ ...current, availability: e.target.value as Filters['availability'] }))}
              >
                <option value="all">All Workshops</option>
                {user && <option value="available">Available Only</option>}
                {user && <option value="booked">Booked Only</option>}
              </select>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>From Date</span>
              <input
                className={styles.filterInput}
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((current) => ({ ...current, dateFrom: e.target.value }))}
              />
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>To Date</span>
              <input
                className={styles.filterInput}
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((current) => ({ ...current, dateTo: e.target.value }))}
              />
            </label>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span className={styles.filterMeta}>Showing {filteredCount} workshop{filteredCount === 1 ? '' : 's'}</span>
            <button
              type="button"
              className={styles.filterReset}
              onClick={() => setFilters({ search: '', category: 'all', availability: 'all', dateFrom: '', dateTo: '' })}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {workshopGroups.length === 0 ? (
          <div className={styles.cardPanel} style={{ textAlign: 'center', color: 'var(--secondary-gray)', padding: '2.5rem' }}>
            No workshops match your filters.
          </div>
        ) : (
          workshopGroups.map((group) => (
            <div key={group.date} className={styles.timeSlotGroup}>
              <h4 className={styles.timeSlotHeader}>
                <CalendarIcon size={18} />
                {new Date(group.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                <span className={styles.dayCount}>{group.workshops.length}</span>
              </h4>

              <div className={styles.timeSlotGrid}>
                {group.workshops.map((workshop, index) => {
                  const isBooked = bookedIds.has(workshop.id);
                  const seatsLeft = Math.max(workshop.capacity - (workshop.seats_booked || 0), 0);
                  const isFull = seatsLeft === 0;

                  return (
                    <div key={workshop.id} className={styles.workshopCard}>
                      <img
                        src={workshop.image_url || FALLBACK_IMAGE}
                        alt={workshop.title}
                        className={styles.workshopImage}
                        onError={(e) => { if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                      <div className={styles.workshopContent}>
                        <div className={styles.workshopCategory}>
                          {workshop.category || 'General'}
                        </div>
                        <h4 className={styles.workshopTitle}>{workshop.title}</h4>
                        <div className={styles.workshopMeta}>
                          <div className={styles.workshopMetaItem}>
                            <CalendarIcon size={14} /> {new Date(workshop.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                          <div className={styles.workshopMetaItem}>
                            <Clock size={14} /> {formatTime(workshop.start_time)} - {formatTime(workshop.end_time)}
                          </div>
                        </div>
                        <div className={styles.workshopMeta} style={{ marginBottom: '0.75rem' }}>
                          {workshop.location && (
                            <div className={styles.workshopMetaItem}>
                              <MapPin size={14} /> {workshop.location}
                            </div>
                          )}
                          {workshop.facilitator && (
                            <div className={styles.workshopMetaItem}>
                              {workshop.facilitator_image_url ? (
                                <img src={workshop.facilitator_image_url} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <User size={14} />
                              )} {workshop.facilitator}
                            </div>
                          )}
                        </div>

                        <div className={styles.workshopFooter}>
                          <div className={styles.workshopMetaItem}>
                            <CalendarIcon size={14} /> {seatsLeft} seat{seatsLeft === 1 ? '' : 's'} left
                          </div>

                          {!user ? (
                            <button
                              className={styles.buttonAttend}
                              onClick={() => router.push('/auth/login')}
                              style={{ background: '#DC2626' }}
                            >
                              <LogIn size={14} /> Sign in to Book
                            </button>
                          ) : isBooked ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {approvalByWorkshopId[workshop.id] ? (
                                <span className={styles.statusApproved}>Approved</span>
                              ) : (
                                <span className={styles.statusPending}>Pending</span>
                              )}
                              {checkedInByWorkshopId[workshop.id] ? (
                                <div>
                                  <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>✓ Checked In</span>
                                  <div style={{ color: '#9CA3AF', fontSize: '0.65rem', lineHeight: 1.3 }}>Cannot cancel</div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.buttonCancel}
                                  onClick={() => {
                                    const wid = workshop.id;
                                    setAlertModal({ title: 'Cancel Booking', message: 'Are you sure you want to cancel this booking? This cannot be undone.', confirmLabel: 'Yes, Cancel', onConfirm: () => { setAlertModal(null); handleCancelBooking(wid); } });
                                  }}
                                  disabled={updatingWorkshopId === workshop.id}
                                >
                                  {updatingWorkshopId === workshop.id ? 'Cancelling...' : 'Cancel Booking'}
                                </button>
                              )}
                            </div>
                          ) : isFull ? (
                            <button className={styles.buttonAttend} style={{ backgroundColor: '#FCA5A5', color: '#991B1B', cursor: 'not-allowed' }} disabled>
                              Full
                            </button>
                          ) : (
                            <button
                              className={styles.buttonAttend}
                              onClick={() => handleBookWorkshop(workshop)}
                              disabled={updatingWorkshopId === workshop.id}
                            >
                              {updatingWorkshopId === workshop.id ? 'Booking...' : 'Book Workshop'}
                            </button>
                          )}
                        </div>

                        <Link href={`/workshops/${workshop.id}`} className={styles.detailsBtn}>
                          Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>

      {alertModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setAlertModal(null)}
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
                  {alertModal.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', lineHeight: 1.5 }}>
                  {alertModal.message}
                </p>
                {alertModal.conflictWorkshop && (
                  <div
                    style={{
                      marginTop: '0.75rem', padding: '0.75rem',
                      background: '#F9FAFB', borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#111' }}>
                      {alertModal.conflictWorkshop.title}
                    </div>
                    <div style={{ color: '#666', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span>
                        📅 {new Date(alertModal.conflictWorkshop.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span>
                        ⏰ {formatTime(alertModal.conflictWorkshop.start_time)} - {formatTime(alertModal.conflictWorkshop.end_time)}
                      </span>
                      {alertModal.conflictWorkshop.location && (
                        <span>📍 {alertModal.conflictWorkshop.location}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setAlertModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.25rem', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', gap: '0.75rem' }}>
              {alertModal.onConfirm ? (
                <>
                  <button
                    onClick={() => setAlertModal(null)}
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
                    onClick={() => { alertModal.onConfirm!(); }}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: '#DC2626', color: '#fff', border: 'none',
                      borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {alertModal.confirmLabel || 'OK'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAlertModal(null)}
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

      <Toast
        open={!!toast}
        type={toast?.type || 'success'}
        message={toast?.message || ''}
        onClose={() => setToast(null)}
      />

    </>
  );
}
