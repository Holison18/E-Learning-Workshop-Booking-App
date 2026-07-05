'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { CheckCircle2, XCircle, Loader2, CalendarDays, Clock, MapPin, Camera } from 'lucide-react';
import { useToast } from '@/components/ui/toast/ToastProvider';

type BookingData = {
  id: string;
  checked_in: boolean;
  participants: {
    first_name: string;
    last_name: string;
    organization_name: string | null;
  } | null;
  workshops: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
  } | null;
};

export function CoordinatorScanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!scanResult) {
      // Initialize scanner only when we're in scanning mode
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        false
      );

      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scanResult]);

  const onScanSuccess = (decodedText: string) => {
    if (scanResult) return; // Prevent multiple scans
    
    // Stop scanning visually
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }

    setScanResult(decodedText);
    handleBookingLookup(decodedText);
  };

  const onScanFailure = (err: any) => {
    // Ignore routine scan failures
  };

  const handleBookingLookup = async (text: string) => {
    setLoading(true);
    setError(null);

    // Extract booking ID. It might be a full URL (.../verify/uuid) or just the uuid
    let bookingId = text;
    if (text.includes('/verify/')) {
      const parts = text.split('/verify/');
      bookingId = parts[1];
    }
    
    // Clean up query params if any
    bookingId = bookingId.split('?')[0];

    const { data, error: dbError } = await supabase
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

    if (dbError || !data) {
      setError("Invalid Booking ID or QR code not recognized.");
    } else {
      // @ts-ignore
      setBooking(data);
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!booking) return;
    
    setUpdating(true);
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ checked_in: true })
      .eq('id', booking.id);

    if (updateError) {
      toast.error("Failed to check in: " + updateError.message);
    } else {
      setBooking((prev) => prev ? { ...prev, checked_in: true } : null);
      toast.success("Check-in successful!");
    }
    setUpdating(false);
  };

  const resetScanner = () => {
    setScanResult(null);
    setBooking(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Camera size={28} color="var(--primary-red)" /> QR Scanner
        </h1>
        <p style={{ color: 'var(--secondary-gray)' }}>Scan attendee QR codes to verify and check them in.</p>
      </div>

      {!scanResult && (
        <Card style={{ overflow: 'hidden', border: '2px solid var(--border-light)' }}>
          <div id="qr-reader" style={{ width: '100%', minHeight: '300px' }} />
        </Card>
      )}

      {loading && (
        <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Loader2 className="animate-spin" size={48} color="var(--primary-red)" style={{ margin: '0 auto 1rem' }} />
          <h3>Looking up booking...</h3>
        </Card>
      )}

      {error && !loading && (
        <Card style={{ textAlign: 'center', borderColor: 'var(--primary-red)' }}>
          <CardContent style={{ padding: '3rem 2rem' }}>
            <XCircle size={64} color="var(--primary-red)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--primary-red)' }}>Verification Failed</h2>
            <p style={{ color: 'var(--secondary-gray)', marginBottom: '2rem' }}>{error}</p>
            <Button onClick={resetScanner} fullWidth style={{ height: '3rem' }}>Scan Another Ticket</Button>
          </CardContent>
        </Card>
      )}

      {booking && !loading && (
        <Card style={{ border: booking.checked_in ? '2px solid var(--success-green)' : '1px solid var(--border-light)' }}>
          <div style={{ 
            backgroundColor: booking.checked_in ? 'var(--success-green)' : 'var(--background-off-white)', 
            color: booking.checked_in ? 'white' : 'inherit', 
            padding: '1.5rem', 
            textAlign: 'center',
            borderBottom: '1px solid var(--border-light)'
          }}>
            {booking.checked_in ? (
              <CheckCircle2 size={56} style={{ margin: '0 auto 0.5rem' }} />
            ) : (
              <CheckCircle2 size={56} color="var(--success-green)" style={{ margin: '0 auto 0.5rem' }} />
            )}
            <h2 style={{ margin: 0 }}>
              {booking.checked_in ? 'Already Checked In' : 'Valid Booking Found'}
            </h2>
          </div>
          
          <CardContent style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participant</p>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                {booking.participants?.first_name} {booking.participants?.last_name}
              </h3>
              {booking.participants?.organization_name && (
                <p style={{ color: 'var(--secondary-gray)', margin: '0.25rem 0 0 0' }}>{booking.participants.organization_name}</p>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshop Details</p>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{booking.workshops?.title}</h4>
              <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarDays size={14} aria-hidden="true" /> {booking.workshops?.date ? new Date(booking.workshops.date).toLocaleDateString() : '—'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} aria-hidden="true" /> {booking.workshops?.start_time?.slice(0, 5)} - {booking.workshops?.end_time?.slice(0, 5)}
                </span>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              {!booking.checked_in && (
                <Button 
                  onClick={handleCheckIn} 
                  disabled={updating}
                  fullWidth
                  style={{ height: '3.5rem', fontSize: '1.125rem' }}
                >
                  {updating ? 'Confirming...' : 'Confirm Check-In'}
                </Button>
              )}
              <Button 
                onClick={resetScanner} 
                variant={booking.checked_in ? 'primary' : 'outline'}
                fullWidth
                style={{ height: '3.5rem', fontSize: '1.125rem' }}
              >
                Scan Next Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
