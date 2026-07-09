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

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // In production, we must protect this endpoint using a secret token
    // For local dev, we might bypass it or provide the secret.
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch workshops happening tomorrow
    const { data: workshops, error: workshopsError } = await supabaseAdmin
      .from('workshops')
      .select('id, title, date, start_time, end_time, location, audience, description, category')
      .eq('date', tomorrowStr)
      .eq('status', 'published');

    if (workshopsError || !workshops || workshops.length === 0) {
      return NextResponse.json({ message: 'No workshops scheduled for tomorrow.', date: tomorrowStr });
    }

    let totalEmailsSent = 0;

    // We process each workshop individually to customize the email per workshop
    for (const ws of workshops) {
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('participants(email, first_name)')
        .eq('workshop_id', ws.id);
        
      if (!bookings || bookings.length === 0) continue;

      const emails = bookings.map((b: any) => b.participants?.email).filter(Boolean);
      
      if (emails.length > 0) {
        // Build the HTML email
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
            <div style="border-top: 4px solid #A32020; padding-top: 20px;">
              <h2 style="color: #A32020; margin-top: 0;">Workshop Reminder</h2>
              <p>Hello,</p>
              <p>This is a quick reminder that your registered workshop is happening <strong>tomorrow</strong>!</p>
              
              <div style="margin-bottom: 16px; padding: 12px; background-color: #F8F9FA; border-radius: 6px; border-left: 4px solid #A32020;">
                <h3 style="margin: 0 0 8px 0; color: #1A1A1A;">${ws.title}</h3>
                <p style="margin: 0; font-size: 14px; color: #4A4A4A;">
                  <strong>Time:</strong> ${ws.start_time.slice(0, 5)} - ${ws.end_time.slice(0, 5)}<br>
                  <strong>Venue:</strong> ${ws.location || 'TBA'}<br>
                  <strong>Audience:</strong> ${ws.audience || 'TBA'}
                </p>
              </div>
              
              <p style="margin-top: 24px;">
                Please try to arrive at least 10 minutes early so we can check you in promptly.
                See you there!
              </p>
              
              <p style="font-size: 12px; color: #888888; margin-top: 32px;">
                KNUST E-Learning Centre
              </p>
            </div>
          </div>
        `;

        // Generate ICS Calendar File
        const calendarEvent = {
          uid: ws.id,
          title: ws.title,
          description: buildEventDescription({
            description: ws.description,
            audience: ws.audience,
            category: ws.category
          }),
          location: ws.location,
          date: ws.date,
          startTime: ws.start_time,
          endTime: ws.end_time
        };
        
        const icsContent = buildIcsCalendar([calendarEvent]);
        const base64Ics = Buffer.from(icsContent).toString('base64');

        await sendKnustEmail({
          recipients: ['noreply@knust.edu.gh'],
          bcc: emails,
          subject: `Reminder: ${ws.title} is tomorrow!`,
          htmlBody,
          attachments: [{
            fileName: 'workshop-reminder.ics',
            contentType: 'text/calendar',
            bytes: base64Ics
          }]
        });

        totalEmailsSent += emails.length;
      }
    }

    return NextResponse.json({ success: true, emailsSent: totalEmailsSent, date: tomorrowStr });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
