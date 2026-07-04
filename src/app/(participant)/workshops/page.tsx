'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';

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
};

export default function DiscoverWorkshops() {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const [workshopsRes, bookingsRes] = await Promise.all([
        supabase.from('workshops').select('*').order('date', { ascending: true }).order('start_time', { ascending: true }),
        supabase.from('bookings').select('workshop_id').eq('participant_id', user.id)
      ]);

      if (workshopsRes.data) setWorkshops(workshopsRes.data);
      if (bookingsRes.data) {
        setBookedIds(new Set(bookingsRes.data.map(b => b.workshop_id)));
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleBook = async (workshop: Workshop) => {
    if (!user) return;

    // Check for time conflicts
    const userBookedWorkshops = workshops.filter(w => bookedIds.has(w.id));
    const hasConflict = userBookedWorkshops.some(w => 
      w.date === workshop.date && 
      (
        (workshop.start_time >= w.start_time && workshop.start_time < w.end_time) ||
        (workshop.end_time > w.start_time && workshop.end_time <= w.end_time)
      )
    );

    if (hasConflict) {
      alert("You already have a booking for this time slot.");
      return;
    }

    const { error } = await supabase.from('bookings').insert([
      { participant_id: user.id, workshop_id: workshop.id }
    ]);

    if (error) {
      alert("Failed to book workshop: " + error.message);
    } else {
      setBookedIds(new Set([...bookedIds, workshop.id]));
      // Optimistically update seats
      setWorkshops(workshops.map(w => w.id === workshop.id ? { ...w, seats_booked: w.seats_booked + 1 } : w));
    }
  };

  if (loading) return <div>Loading workshops...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1>Discover Workshops</h1>
        <p style={{ color: 'var(--secondary-gray)' }}>Browse and book parallel sessions. Note that you cannot book sessions with overlapping times.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {workshops.map((workshop) => {
          const isBooked = bookedIds.has(workshop.id);
          const isFull = workshop.seats_booked >= workshop.capacity;
          
          return (
            <Card key={workshop.id} className="animate-fade-in">
              <CardHeader>
                <CardTitle>{workshop.title}</CardTitle>
                <CardDescription>{new Date(workshop.date).toLocaleDateString()} • {workshop.start_time.slice(0, 5)} - {workshop.end_time.slice(0, 5)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {workshop.description}
                </p>
                <div style={{ fontSize: '0.875rem', color: 'var(--secondary-gray)' }}>
                  <div><strong>Facilitator:</strong> {workshop.facilitator}</div>
                  <div><strong>Location:</strong> {workshop.location}</div>
                  <div><strong>Seats:</strong> {workshop.capacity - workshop.seats_booked} remaining</div>
                </div>
              </CardContent>
              <CardFooter>
                {isBooked ? (
                  <Button variant="secondary" fullWidth disabled>Booked</Button>
                ) : isFull ? (
                  <Button variant="ghost" fullWidth disabled>Full</Button>
                ) : (
                  <Button onClick={() => handleBook(workshop)} fullWidth>Attend</Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
