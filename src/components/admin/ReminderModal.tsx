'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Send, X } from 'lucide-react';

export function ReminderModal({
  workshopId,
  workshopTitle,
  onClose,
}: {
  workshopId: string;
  workshopTitle: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(`Reminder: ${workshopTitle}`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);

    const { error } = await supabase.from('broadcasts').insert([
      {
        title,
        message,
        recipient_group: `workshop_${workshopId}`,
        created_at: new Date().toISOString(),
      },
    ]);

    setSending(false);

    if (error) {
      alert('Error sending reminder: ' + error.message);
    } else {
      alert('Reminder sent successfully!');
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Send Reminder</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-gray)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSend}>
          <div style={{ marginBottom: '1rem' }}>
            <Input
              label="Subject / Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Message Body
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              placeholder="e.g. Please remember to bring your laptop..."
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Send size={16} />
              {sending ? 'Sending...' : 'Send Reminder'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
