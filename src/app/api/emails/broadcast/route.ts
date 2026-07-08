import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendKnustEmail } from '@/lib/email';

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
    
    // Verify admin calling this
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: adminRole } = await supabaseAdmin.from('admins').select('role').eq('id', user.id).single();
    if (!adminRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { title, message, recipient_group } = await request.json();
    if (!title || !message || !recipient_group) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let emails: string[] = [];

    if (recipient_group === 'All Participants') {
      const { data: participants } = await supabaseAdmin.from('participants').select('email');
      if (participants) emails = participants.map(p => p.email).filter(Boolean);
    } else if (recipient_group.startsWith('workshop_')) {
      const workshopId = recipient_group.replace('workshop_', '');
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('participants(email)')
        .eq('workshop_id', workshopId);
      
      if (bookings) {
        emails = bookings
          .map((b: any) => b.participants?.email)
          .filter(Boolean);
      }
    }

    if (emails.length === 0) {
      return NextResponse.json({ message: 'No recipients found' });
    }

    // Build the HTML email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
        <div style="border-top: 4px solid #A32020; padding-top: 20px;">
          <h2 style="color: #A32020; margin-top: 0;">${title}</h2>
          <div style="font-size: 16px; line-height: 1.6; color: #4A4A4A; white-space: pre-wrap;">${message}</div>
          
          <p style="font-size: 12px; color: #888888; margin-top: 32px; border-top: 1px solid #E0E0E0; padding-top: 16px;">
            This is an automated announcement from the KNUST E-Learning Centre.<br>
            Please do not reply directly to this email.
          </p>
        </div>
      </div>
    `;

    const result = await sendKnustEmail({
      recipients: ['noreply@knust.edu.gh'], // A dummy to address
      bcc: emails,
      subject: title,
      htmlBody,
    });

    // We will actually just pass it all as recipients. The KNUST API docs say 
    // we can pass bcc. Wait, let's look at lib/email.ts to see if it supports bcc.
    // I didn't add bcc. Let's add it to lib/email.ts!
    
    return NextResponse.json({ success: true, count: emails.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
