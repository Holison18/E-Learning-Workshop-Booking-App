'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';

// Using QuickChart API for reliable QR code generation
const generateQRUrl = (data: string) => {
  return `https://quickchart.io/qr?text=${encodeURIComponent(data)}&size=200`;
};

type Booking = {
  id: string;
  checked_in: boolean;
  workshops: {
    title: string;
    date: string;
    start_time: string;
    location: string;
  };
};

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          checked_in,
          workshops (
            title,
            date,
            start_time,
            location
          )
        `)
        .eq('participant_id', user.id);

      if (data) {
        // @ts-ignore - Supabase types can be tricky with joins
        setBookings(data as Booking[]);
      }
      setLoading(false);
    }
    fetchBookings();
  }, [user]);

  if (loading) return <div>Loading your bookings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>My Bookings</h1>
          <p style={{ color: 'var(--secondary-gray)' }}>View your schedule and generate your check-in QR codes.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>Print Schedule</Button>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--secondary-gray)' }}>You haven't booked any workshops yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {bookings.map((booking) => {
            const verificationUrl = `${window.location.origin}/verify/${booking.id}`;
            const qrUrl = generateQRUrl(verificationUrl);

            return (
              <Card key={booking.id} className="animate-fade-in">
                <CardContent style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', alignItems: 'center' }}>
                  <img src={qrUrl} alt="Check-in QR Code" style={{ width: '120px', height: '120px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{booking.workshops.title}</h3>
                    <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span>📅 {new Date(booking.workshops.date).toLocaleDateString()}</span>
                      <span>⏰ {booking.workshops.start_time.slice(0, 5)}</span>
                      <span>📍 {booking.workshops.location}</span>
                    </div>
                    {booking.checked_in && (
                      <div style={{ marginTop: '0.75rem', color: 'var(--success-green)', fontSize: '0.875rem', fontWeight: 600 }}>
                        ✓ Checked In
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
