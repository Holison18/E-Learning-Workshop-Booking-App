'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ArrowLeft, Mail, Users, CheckCircle } from 'lucide-react';
import { formatTime } from '@/lib/formatTime';
import { ReminderModal } from '@/components/admin/ReminderModal';
import Link from 'next/link';
import { requestApi } from '@/lib/api';
import styles from './WorkshopDetails.module.css';

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization_name: string;
};

type Booking = {
  id: string;
  checked_in: boolean;
  created_at: string;
  participants: Participant;
};

type Workshop = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  capacity: number;
  seats_booked: number;
};

export default function WorkshopDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      const [workshopRes, bookingsRes] = await Promise.all([
        requestApi<{ data: Workshop[] }>('/api/admin/workshop'),
        supabase.from('bookings').select(`
          id,
          checked_in,
          created_at,
          participants (
            id,
            first_name,
            last_name,
            email,
            organization_name
          )
        `).eq('workshop_id', id)
      ]);

      setWorkshop(workshopRes.data.find((row) => row.id === id) || null);
      if (bookingsRes.data) {
        // @ts-expect-error Supabase join typing is narrower than the response payload here
        setBookings(bookingsRes.data as Booking[]);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading workshop details...</div>;
  }

  if (!workshop) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Workshop not found.</div>;
  }

  const checkedInCount = bookings.filter(b => b.checked_in).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <Link href="/admin/workshops">
          <Button variant="ghost" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>{workshop.title}</h1>
          <p style={{ color: 'var(--secondary-gray)', margin: 0 }}>
            {new Date(workshop.date).toLocaleDateString()} | {formatTime(workshop.start_time)}
          </p>
        </div>
        <Button onClick={() => setShowReminder(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Mail size={16} /> Send Reminder
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <Card>
          <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--background-off-white)', padding: '1rem', borderRadius: '50%' }}>
              <Users size={24} color="var(--primary-red)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)' }}>Registered</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{bookings.length} / {workshop.capacity}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--background-off-white)', padding: '1rem', borderRadius: '50%' }}>
              <CheckCircle size={24} color="var(--success-green)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)' }}>Checked In</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{checkedInCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent style={{ padding: 0 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Participant Roster</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Organization</th>
                  <th>Registered On</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary-gray)' }}>No participants registered yet.</td></tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                          {booking.participants?.first_name} {booking.participants?.last_name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)' }}>
                          {booking.participants?.email}
                        </div>
                      </td>
                      <td>{booking.participants?.organization_name || 'N/A'}</td>
                      <td>{new Date(booking.created_at).toLocaleDateString()}</td>
                      <td>
                        {booking.checked_in ? (
                          <Badge variant="success">Attended</Badge>
                        ) : (
                          <Badge variant="neutral">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showReminder && (
        <ReminderModal
          workshopId={workshop.id}
          workshopTitle={workshop.title}
          onClose={() => setShowReminder(false)}
        />
      )}
    </div>
  );
}
