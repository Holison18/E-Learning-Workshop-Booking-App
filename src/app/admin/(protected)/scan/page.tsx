'use client';

import React, { useRef, useState } from 'react';
import { Camera, User, BookOpen, CalendarDays, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

type QrData = {
  id: string;
  u: string;
  w: string;
  d: string;
  a: boolean;
};

type BookingInfo = {
  id: string;
  user_name: string;
  user_email: string;
  workshop: { id: string; title: string; date: string; start_time: string; end_time: string; location: string; facilitator: string };
  checked_in: boolean;
  approved: boolean;
};

export default function ScanPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<QrData | null>(null);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [error, setError] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const startScanner = async () => {
    setStarting(true);
    setError('');
    setCameraError('');

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        const msg = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
          ? 'This browser does not support camera access. Try a different browser.'
          : 'Camera access requires HTTPS. When testing on a real device, use an HTTPS tunnel (e.g. ngrok) or test on the machine itself via http://localhost:3000.';
        throw new Error(msg);
      }

      // Pre-flight: directly call getUserMedia in the user gesture context.
      // Without this, html5-qrcode's internal getUserMedia call happens
      // asynchronously and loses the transient activation on mobile browsers,
      // causing the permission prompt to never appear.
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      testStream.getTracks().forEach(t => t.stop());

      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 280 }, formatsToSupport: [0] },
        (decodedText) => {
          try {
            const data: QrData = JSON.parse(decodedText);
            if (!data.id || !data.u || !data.w) {
              setError('Invalid QR code: missing booking data');
              return;
            }
            setScanResult(data);
            scanner.pause(true);
          } catch {
            setError('Invalid QR code: could not parse');
          }
        },
        () => {},
      );
      setCameraStarted(true);
    } catch (err: any) {
      setCameraError(err?.message || 'Camera access denied. Please enable camera permissions in your browser settings and try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!scanResult) return;
    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/admin/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: scanResult.id }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Check-in failed');
      }

      setBookingInfo(body.booking);
      if (body.already_checked_in) {
        setAlreadyCheckedIn(true);
      }
      setCheckedIn(true);
    } catch (err: any) {
      setError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleScanAgain = () => {
    setScanResult(null);
    setBookingInfo(null);
    setCheckedIn(false);
    setAlreadyCheckedIn(false);
    setError('');
    setChecking(false);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  const showCamera = !cameraError && !checkedIn && !scanResult;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Scan QR Code</h1>
        <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Position the QR code inside the frame to check in a participant.</p>
      </div>

      <div id="qr-reader" style={{ width: '100%', maxWidth: 420, margin: '0 auto', borderRadius: 12, overflow: 'hidden', display: showCamera ? 'block' : 'none' }} />

      {!starting && !cameraStarted && !cameraError && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Camera size={28} color="#DC2626" />
          </div>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: 280, margin: '0 auto 1.5rem' }}>
            Tap the button below to activate the camera. Your browser will ask for permission.
          </p>
          <button onClick={startScanner} style={{ padding: '0.75rem 2rem', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={18} /> Start Scanner
          </button>
        </div>
      )}

      {starting && (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#DC2626', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Starting camera...</p>
        </div>
      )}

      {cameraError && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Camera size={28} color="#DC2626" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Camera Access Required</h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>{cameraError}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.625rem 1.5rem', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      )}

      {checkedIn && (
        <div style={{ background: alreadyCheckedIn ? '#FFFBEB' : '#F0FDF4', borderRadius: 16, padding: '2rem', textAlign: 'center', border: alreadyCheckedIn ? '1px solid #FDE68A' : '1px solid #BBF7D0', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: alreadyCheckedIn ? '#FEF3C7' : '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            {alreadyCheckedIn ? <AlertCircle size={28} color="#D97706" /> : <CheckCircle size={28} color="#16A34A" />}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem', color: alreadyCheckedIn ? '#92400E' : '#16A34A' }}>
            {alreadyCheckedIn ? 'Already Checked In' : 'Checked In!'}
          </h2>
          <p style={{ color: alreadyCheckedIn ? '#92400E' : '#15803D', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>{bookingInfo?.user_name} — {bookingInfo?.workshop?.title}</p>
          <button onClick={handleScanAgain} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.5rem', background: alreadyCheckedIn ? '#D97706' : '#16A34A', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={16} /> Scan Next
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1.5rem', background: '#FEF2F2', borderRadius: 16, border: '1px solid #FECACA', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9375rem', fontWeight: 700, color: '#991B1B' }}>Check-in Error</h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#991B1B', lineHeight: 1.5 }}>{error}</p>
            </div>
          </div>
          <button onClick={handleScanAgain} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.5rem', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={16} /> Scan Next
          </button>
        </div>
      )}

      {scanResult && !error && !checkedIn && (
        <div style={{ marginTop: '1.5rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} /> {scanResult.u}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280' }}>
              <BookOpen size={16} /> <span style={{ color: '#1a1a1a' }}>{scanResult.w}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280' }}>
              <CalendarDays size={16} /> <span style={{ color: '#1a1a1a' }}>{new Date(scanResult.d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {scanResult.a ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: 999, background: '#DCFCE7', color: '#16A34A', fontSize: '0.75rem', fontWeight: 700 }}>
                  <CheckCircle size={12} /> Approved
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: 999, background: '#FEF3C7', color: '#D97706', fontSize: '0.75rem', fontWeight: 700 }}>
                  <XCircle size={12} /> Pending
                </span>
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '1rem 0' }} />

          <button
            onClick={handleCheckIn}
            disabled={checking}
            style={{
              width: '100%', padding: '0.75rem', border: 'none', borderRadius: 10,
              background: checking ? '#9CA3AF' : '#DC2626', color: '#fff',
              fontSize: '0.9375rem', fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {checking ? 'Checking in...' : 'Check In'}
          </button>
          <button
            onClick={handleScanAgain}
            style={{
              width: '100%', padding: '0.625rem', border: '1px solid #D1D5DB', borderRadius: 10,
              background: 'transparent', color: '#666',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            <RefreshCw size={14} /> Scan Next
          </button>
        </div>
      )}
    </div>
  );
}
