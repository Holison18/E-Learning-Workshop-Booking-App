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

    const body = await req.json();
    const { phone, first_name, last_name, institution } = body;

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });
    }

    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      return NextResponse.json({ error: 'Phone number must be 8-15 digits.' }, { status: 400 });
    }

    const user_metadata = {
      ...user.user_metadata,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone,
      institution: institution?.trim() || '',
    };

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata,
    });

    if (updateError) {
      console.error('Admin updateUser error:', updateError);
      return NextResponse.json({ error: 'Failed to update account.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user_metadata });
  } catch (error) {
    console.error('Account update error:', error);
    return NextResponse.json({ error: 'Failed to update account.' }, { status: 500 });
  }
}
