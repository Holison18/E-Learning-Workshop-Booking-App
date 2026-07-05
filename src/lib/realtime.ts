import { supabase } from '@/lib/supabase';

type WorkshopRow = {
  id: string;
  seats_booked: number;
  capacity: number;
  [key: string]: unknown;
};

/**
 * Subscribes to live changes on the workshops table so every connected
 * client sees seat counts update the moment anyone books or cancels -
 * without needing to reload the page.
 */
export function subscribeToWorkshopUpdates(onUpdate: (row: WorkshopRow) => void) {
  const channel = supabase
    .channel('workshops-seat-updates')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'workshops' },
      (payload) => onUpdate(payload.new as WorkshopRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
