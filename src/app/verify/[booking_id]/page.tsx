import React from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/Card';
import { CheckCircle2, XCircle } from 'lucide-react';
import styles from '@/components/layout/DashboardLayout.module.css'; // Reuse some basic layout

export default async function VerifyBookingPage({ params }: { params: { booking_id: string } }) {
  // Server Component: fetch data directly
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      checked_in,
      participants (
        first_name,
        last_name,
        organization_name
      ),
      workshops (
        title,
        date,
        start_time,
        end_time,
        location
      )
    `)
    .eq('id', params.booking_id)
    .single();

  if (error || !booking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background-off-white)' }}>
        <Card style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <CardContent style={{ padding: '3rem' }}>
            <XCircle size={64} color="var(--primary-red)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '0.5rem' }}>Invalid Booking</h2>
            <p style={{ color: 'var(--secondary-gray)' }}>This QR code does not match any valid booking in our system.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine if workshop is happening today (basic check for demo)
  // @ts-ignore
  const isToday = new Date(booking.workshops.date).toDateString() === new Date().toDateString();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background-off-white)', padding: '1rem' }}>
      <Card style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ 
          backgroundColor: booking.checked_in ? 'var(--success-green)' : 'var(--primary-red)', 
          color: 'white', 
          padding: '2rem', 
          textAlign: 'center',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          {booking.checked_in ? (
            <CheckCircle2 size={64} style={{ margin: '0 auto 1rem' }} />
          ) : (
            <CheckCircle2 size={64} style={{ margin: '0 auto 1rem', opacity: 0.9 }} />
          )}
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'white' }}>
            {booking.checked_in ? 'Already Checked In' : 'Valid Booking'}
          </h1>
        </div>
        
        <CardContent style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participant</p>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              {/* @ts-ignore */}
              {booking.participants.first_name} {booking.participants.last_name}
            </h2>
            {/* @ts-ignore */}
            {booking.participants.organization_name && (
              /* @ts-ignore */
              <p style={{ color: 'var(--secondary-gray)', margin: '0.25rem 0 0 0' }}>{booking.participants.organization_name}</p>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshop Details</p>
            {/* @ts-ignore */}
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{booking.workshops.title}</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {/* @ts-ignore */}
              <span>📅 {new Date(booking.workshops.date).toLocaleDateString()} {isToday && <strong style={{ color: 'var(--success-green)' }}>(Today)</strong>}</span>
              {/* @ts-ignore */}
              <span>⏰ {booking.workshops.start_time.slice(0, 5)} - {booking.workshops.end_time.slice(0, 5)}</span>
              {/* @ts-ignore */}
              <span>📍 {booking.workshops.location}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
