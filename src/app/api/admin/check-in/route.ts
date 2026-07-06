import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import verifyAdmin from '@/lib/verify_admin';

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, workshops(id, title, date, start_time, end_time, location, facilitator)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const { data: { user: authUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);

    const userName = authUser && !userError
      ? [authUser.user_metadata?.first_name, authUser.user_metadata?.last_name].filter(Boolean).join(' ') || authUser.email || 'Unknown'
      : 'Unknown';

    if (booking.checked_in) {
      return NextResponse.json({
        already_checked_in: true,
        booking: {
          id: booking.id,
          user_name: userName,
          user_email: authUser?.email || '',
          workshop: booking.workshops,
          checked_in: true,
          approved: booking.approved,
        },
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ checked_in: true })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Check-in update error:', updateError);
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        user_name: userName,
        user_email: authUser?.email || '',
        workshop: booking.workshops,
        checked_in: true,
        approved: booking.approved,
      },
    });
  } catch (err) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
