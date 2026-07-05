import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await req.json();
    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      phone,
      user_metadata: { ...user.user_metadata, phone },
    });
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, phone });
  } catch (error) {
    console.error('Failed to save phone:', error);
    return NextResponse.json({ error: 'Failed to save phone number.' }, { status: 500 });
  }
}
