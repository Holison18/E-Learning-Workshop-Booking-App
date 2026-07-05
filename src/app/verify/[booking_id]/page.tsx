'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { CheckCircle2, XCircle, Loader2, CalendarDays, Clock, MapPin } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast/ToastProvider';

export default function VerifyBookingPage() {
  const params = useParams();
  const bookingId = params.booking_id as string;
  const toast = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
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
        .eq('id', bookingId)
        .single();

      if (error || !data) {
        setError(true);
      } else {
        setBooking(data);
      }
      setLoading(false);
    }
    
    if (bookingId) fetchBooking();
  }, [bookingId]);

  const handleCheckIn = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from('bookings')
      .update({ checked_in: true })
      .eq('id', bookingId);

    if (error) {
      toast.error("Failed to check in: " + error.message);
      setUpdating(false);
    } else {
      setBooking((prev: any) => ({ ...prev, checked_in: true }));
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background-off-white)' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary-red)" />
      </div>
    );
  }

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

  const isToday = booking.workshops?.date
    ? new Date(booking.workshops.date).toDateString() === new Date().toDateString()
    : false;

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
              {booking.participants?.first_name} {booking.participants?.last_name}
            </h2>
            {booking.participants?.organization_name && (
              <p style={{ color: 'var(--secondary-gray)', margin: '0.25rem 0 0 0' }}>{booking.participants.organization_name}</p>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshop Details</p>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{booking.workshops?.title}</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={14} aria-hidden="true" /> {booking.workshops?.date ? new Date(booking.workshops.date).toLocaleDateString() : '—'} {isToday && <strong style={{ color: 'var(--success-green)' }}>(Today)</strong>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={14} aria-hidden="true" /> {booking.workshops?.start_time?.slice(0, 5)} - {booking.workshops?.end_time?.slice(0, 5)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={14} aria-hidden="true" /> {booking.workshops?.location}
              </span>
            </div>
          </div>
          
          {!booking.checked_in && (
            <div style={{ marginTop: '2rem' }}>
              <Button 
                onClick={handleCheckIn} 
                disabled={updating}
                fullWidth
                style={{ height: '3rem', fontSize: '1.125rem' }}
              >
                {updating ? 'Confirming...' : 'Confirm Check-In'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
