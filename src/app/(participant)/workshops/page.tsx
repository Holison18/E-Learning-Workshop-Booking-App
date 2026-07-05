'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken, requestApi } from '@/lib/api';
import styles from '../dashboard/Dashboard.module.css';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

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
  location: string;
  image_url?: string;
  category?: string | null;
  status?: string | null;
};

type BookingRow = {
  id: string;
  workshop_id: string;
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
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [bookingIdsByWorkshopId, setBookingIdsByWorkshopId] = useState<Record<string, string>>({});
  const [updatingWorkshopId, setUpdatingWorkshopId] = useState('');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: 'all',
    availability: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    let active = true;

    (async () => {
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      try {
        const token = await getSessionToken();
        if (!token) {
          if (active) setLoading(false);
          return;
        }

        const [workshopsResponse, bookingsResponse] = await Promise.all([
          requestApi<{ message: string; user: unknown; result: Workshop[] }>('/api/dashboard', { token }),
          requestApi<{ data: BookingRow[] }>('/api/book', { token }),
        ]);

        const fetchedWorkshops: Workshop[] = workshopsResponse.result || [];
        const bookedRows: BookingRow[] = bookingsResponse.data || [];

        if (!active) return;

        setWorkshops(fetchedWorkshops);
        setBookedIds(new Set(bookedRows.map((booking: BookingRow) => booking.workshop_id)));
        setBookingIdsByWorkshopId(
          bookedRows.reduce<Record<string, string>>((accumulator: Record<string, string>, booking: BookingRow) => {
            accumulator[booking.workshop_id] = booking.id;
            return accumulator;
          }, {})
        );
      } catch (error) {
        console.error('Failed to load workshops:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
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
  };

  const handleBookWorkshop = async (workshop: Workshop) => {
    if (bookedIds.has(workshop.id) || updatingWorkshopId) return;

    setUpdatingWorkshopId(workshop.id);
    try {
      const token = await getSessionToken();
      if (!token) {
        alert('You must be signed in to book workshops.');
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
      alert(response.message === 'Already booked' ? 'You already booked this workshop.' : 'Workshop booked successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to book workshop.';
      alert(message);
    } finally {
      setUpdatingWorkshopId('');
    }
  };

  const handleCancelBooking = async (workshopId: string) => {
    const bookingId = bookingIdsByWorkshopId[workshopId];
    if (!bookingId) return;

    if (!confirm('Cancel this booking?')) return;

    setUpdatingWorkshopId(workshopId);
    try {
      const token = await getSessionToken();
      if (!token) {
        alert('You must be signed in to cancel a booking.');
        return;
      }

      await requestApi('/api/book', {
        method: 'DELETE',
        token,
        body: { bookId: bookingId },
      });

      setWorkshops((current) =>
        current.map((item) =>
          item.id === workshopId
            ? { ...item, seats_booked: Math.max((item.seats_booked || 1) - 1, 0) }
            : item
        )
      );

      await syncBookings(token);
      alert('Booking cancelled.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel booking.';
      alert(message);
    } finally {
      setUpdatingWorkshopId('');
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
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>Loading workshops...</div>;
  }

  return (
    <div className="animate-fade-in">
      <section className={styles.workshopsSection}>
        <div className={styles.panelHeader} style={{ alignItems: 'flex-end' }}>
          <div>
            <h3 className={styles.panelTitle} style={{ fontSize: '1.5rem' }}>Workshops by Day</h3>
            <p className={styles.panelSubtitle}>Use the filters below to narrow the workshop list, then book or cancel directly from each card.</p>
          </div>
          <div className={styles.panelAction}>{filteredCount} result{filteredCount === 1 ? '' : 's'}</div>
        </div>

        <div className={styles.cardPanel} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.filterGrid}>
            <label className={styles.filterField}>
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
                <option value="available">Available Only</option>
                <option value="booked">Booked Only</option>
              </select>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>From</span>
              <input
                className={styles.filterInput}
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((current) => ({ ...current, dateFrom: e.target.value }))}
              />
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>To</span>
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
                        src={workshop.image_url || `https://source.unsplash.com/random/400x300?education,learning&sig=${index + group.date.charCodeAt(0)}`}
                        alt={workshop.title}
                        className={styles.workshopImage}
                      />
                      <div className={styles.workshopContent}>
                        <div className={styles.workshopCategory}>
                          {workshop.category || 'General'}
                        </div>
                        <h4 className={styles.workshopTitle}>{workshop.title}</h4>
                        <p className={styles.workshopDesc}>{workshop.description}</p>
                        <div className={styles.workshopMeta}>
                          <div className={styles.workshopMetaItem}>
                            <Clock size={14} /> {workshop.start_time.slice(0, 5)} - {workshop.end_time.slice(0, 5)}
                          </div>
                          <div className={styles.workshopMetaItem}>
                            <CalendarIcon size={14} /> {seatsLeft} seat{seatsLeft === 1 ? '' : 's'} left
                          </div>
                        </div>

                        <div className={styles.workshopFooter}>
                          <div className={styles.workshopMetaItem}>
                            <Clock size={14} /> {workshop.facilitator}
                          </div>

                          {isBooked ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className={styles.bookedBadge}>Booked</span>
                              <button
                                type="button"
                                className={styles.buttonCancel}
                                onClick={() => handleCancelBooking(workshop.id)}
                                disabled={updatingWorkshopId === workshop.id}
                              >
                                {updatingWorkshopId === workshop.id ? 'Cancelling...' : 'Cancel Booking'}
                              </button>
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
  );
}
