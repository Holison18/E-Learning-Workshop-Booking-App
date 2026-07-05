import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  open: boolean;
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ open, type, message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 99999,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        background: type === 'success' ? '#ECFDF5' : '#FEF2F2',
        border: `1px solid ${type === 'success' ? '#A7F3D0' : '#FECACA'}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        maxWidth: '400px',
        animation: 'slideUp 0.25s ease',
      }}
    >
      {type === 'success' ? (
        <CheckCircle size={20} color="#059669" />
      ) : (
        <XCircle size={20} color="#DC2626" />
      )}
      <span style={{ fontSize: '0.875rem', color: type === 'success' ? '#065F46' : '#991B1B', fontWeight: 500 }}>
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: type === 'success' ? '#6EE7B7' : '#FCA5A5',
          padding: '0.125rem', display: 'flex', marginLeft: '0.25rem',
        }}
      >
        <X size={16} />
      </button>
      <style>{`@keyframes slideUp { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
