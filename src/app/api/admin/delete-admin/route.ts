import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify the caller is a super_admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized token' }, { status: 401 });
    }

    // Check if the caller is a super_admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData || adminData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Requires super_admin role' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json({ error: 'Missing adminId' }, { status: 400 });
    }

    if (adminId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // 3. Delete from admins table
    const { error: deleteError } = await supabaseAdmin
      .from('admins')
      .delete()
      .eq('id', adminId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove admin role: ' + deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
