import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildIcsCalendar, buildEventDescription } from '@/lib/calendar';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase config');
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    const workshopIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
    if (workshopIds.length === 0) {
      return NextResponse.json({ error: 'Invalid ids parameter' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: workshops } = await supabaseAdmin
      .from('workshops')
      .select('*')
      .in('id', workshopIds);

    if (!workshops || workshops.length === 0) {
      return NextResponse.json({ error: 'Workshops not found' }, { status: 404 });
    }

    const calendarEvents = workshops.map(ws => ({
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
    }));
    
    const icsContent = buildIcsCalendar(calendarEvents);

    const headers = new Headers();
    headers.set('Content-Type', 'text/calendar; charset=utf-8');
    headers.set('Content-Disposition', 'attachment; filename="knust-workshops.ics"');

    return new NextResponse(icsContent, {
      status: 200,
      headers
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
