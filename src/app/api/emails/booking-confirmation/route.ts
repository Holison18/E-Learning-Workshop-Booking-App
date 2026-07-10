import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendKnustEmail } from '@/lib/email';
import { buildIcsCalendar, buildEventDescription } from '@/lib/calendar';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase config');
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopIds } = await request.json();
    if (!workshopIds || !Array.isArray(workshopIds) || workshopIds.length === 0) {
      return NextResponse.json({ error: 'No workshopIds provided' }, { status: 400 });
    }

    // Fetch user details for the email
    const { data: participant } = await supabaseAdmin
      .from('participants')
      .select('first_name, email')
      .eq('id', user.id)
      .single();

    if (!participant || !participant.email) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Fetch workshop details
    const { data: workshops } = await supabaseAdmin
      .from('workshops')
      .select('*')
      .in('id', workshopIds);

    if (!workshops || workshops.length === 0) {
      return NextResponse.json({ error: 'Workshops not found' }, { status: 404 });
    }

    const reqUrl = new URL(request.url);
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
    const calendarLink = `${baseUrl}/api/calendar/download?ids=${workshopIds.join(',')}`;

    // Build the HTML email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
        <div style="border-top: 4px solid #A32020; padding-top: 20px;">
          <h2 style="color: #A32020; margin-top: 0;">Booking Confirmation</h2>
          <p>Hello ${participant.first_name},</p>
          <p>You have successfully booked <strong>${workshops.length}</strong> session(s) at the KNUST E-Learning Workshop Portal.</p>
          
          <h3 style="border-bottom: 1px solid #E0E0E0; padding-bottom: 8px;">Your Sessions</h3>
          ${workshops.map(ws => `
            <div style="margin-bottom: 16px; padding: 12px; background-color: #F8F9FA; border-radius: 6px;">
              <h4 style="margin: 0 0 8px 0; color: #1A1A1A;">${ws.title}</h4>
              <p style="margin: 0; font-size: 14px; color: #4A4A4A;">
                <strong>Date:</strong> ${ws.date}<br>
                <strong>Time:</strong> ${ws.start_time.slice(0, 5)} - ${ws.end_time.slice(0, 5)}<br>
                <strong>Location:</strong> ${ws.location || 'TBA'}<br>
                <strong>Audience:</strong> ${ws.audience || 'TBA'}<br>
                <strong>Facilitator:</strong> ${ws.facilitator || 'TBA'}
              </p>
            </div>
          `).join('')}
          
          <p style="margin-top: 24px;">
            <a href="${calendarLink}" style="display: inline-block; padding: 10px 20px; background-color: #A32020; color: #FFFFFF; text-decoration: none; border-radius: 4px; font-weight: bold;">Add to Calendar (.ics)</a>
          </p>
          <p style="margin-top: 16px; font-size: 14px;">
            Click the button above to download the calendar file and add these sessions to your personal calendar.
          </p>
          <p>See you there!</p>
          <p style="font-size: 12px; color: #888888; margin-top: 32px;">
            KNUST E-Learning Centre
          </p>
        </div>
      </div>
    `;

    const result = await sendKnustEmail({
      recipients: [participant.email],
      subject: 'Workshop Booking Confirmation',
      htmlBody
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
