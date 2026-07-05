'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ArrowLeft, Mail, Pencil, Users, CheckCircle, Armchair, Download } from 'lucide-react';
import { ReminderModal } from '@/components/admin/ReminderModal';
import { PageLoader } from '@/components/ui/spinner/PageLoader';
import { subscribeToWorkshopUpdates } from '@/lib/realtime';
import Link from 'next/link';
import styles from './WorkshopDetails.module.css';

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization_name: string;
  phone: string;
};

type Booking = {
  id: string;
  checked_in: boolean;
  booked_at: string;
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
        supabase.from('workshops').select('*').eq('id', id).single(),
        supabase.from('bookings').select(`
          id,
          checked_in,
          booked_at,
          participants (
            id,
            first_name,
            last_name,
            email,
            organization_name,
            phone
          )
        `).eq('workshop_id', id)
      ]);

      if (workshopRes.data) setWorkshop(workshopRes.data);
      if (bookingsRes.data) {
        setBookings(bookingsRes.data as unknown as Booking[]);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    return subscribeToWorkshopUpdates((updated) => {
      if (updated.id === id) {
        setWorkshop((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    });
  }, [id]);

  if (loading) {
    return <PageLoader label="Loading workshop details..." />;
  }

  if (!workshop) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Workshop not found.</div>;
  }

  const checkedInCount = bookings.filter(b => b.checked_in).length;

  const handleDownloadCSV = () => {
    if (bookings.length === 0) return;
    const headers = ['First Name', 'Last Name', 'Email', 'Contact Number', 'Registered On', 'Attendance'];
    const csvContent = [
      headers.join(','),
      ...bookings.map(b => [
        `"${b.participants?.first_name || ''}"`,
        `"${b.participants?.last_name || ''}"`,
        `"${b.participants?.email || ''}"`,
        `"${b.participants?.phone || ''}"`,
        `"${new Date(b.booked_at).toLocaleDateString()}"`,
        `"${b.checked_in ? 'Attended' : 'Pending'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `workshop_${workshop.title.replace(/\s+/g, '_')}_participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            {new Date(workshop.date).toLocaleDateString()} | {workshop.start_time.slice(0, 5)}
          </p>
        </div>
        <Link href={`/admin/workshops/${workshop.id}/edit`}>
          <Button variant="outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Pencil size={16} /> Edit
          </Button>
        </Link>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{workshop.seats_booked} / {workshop.capacity}</div>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{checkedInCount} / {workshop.seats_booked}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--background-off-white)', padding: '1rem', borderRadius: '50%' }}>
              <Armchair size={24} color="var(--secondary-gray)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)' }}>Seats Remaining</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{Math.max(workshop.capacity - workshop.seats_booked, 0)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent style={{ padding: 0 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Participant Roster</h2>
            <Button variant="outline" onClick={handleDownloadCSV} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Download size={16} />
              Download CSV
            </Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Contact</th>
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
                        <div style={{ fontWeight: 500, color: 'var(--secondary-black)' }}>
                          {booking.participants?.first_name} {booking.participants?.last_name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)' }}>
                          {booking.participants?.email}
                        </div>
                      </td>
                      <td>{booking.participants?.phone || '—'}</td>
                      <td>{new Date(booking.booked_at).toLocaleDateString()}</td>
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
