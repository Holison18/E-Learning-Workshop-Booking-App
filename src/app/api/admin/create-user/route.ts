import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase client with the service role key to bypass RLS and use Admin API
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: Request) {
  try {
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
    const { email, password, firstName, lastName, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Create user in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bypass email verification
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 4. Insert into participants table (required due to foreign key constraints if they do anything else, and it's good practice)
    const { error: participantError } = await supabaseAdmin.from('participants').insert({
      id: newUserId,
      first_name: firstName || 'Staff',
      last_name: lastName || 'Member',
      email: email,
      phone: '0000000000', // Default placeholder
      organization_name: 'Internal Staff'
    });

    if (participantError) {
      // If this fails, we should ideally rollback, but we'll just log and return error
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Failed to create participant record: ' + participantError.message }, { status: 500 });
    }

    // 5. Insert into admins table
    const { error: adminInsertError } = await supabaseAdmin.from('admins').insert({
      id: newUserId,
      first_name: firstName || 'Staff',
      last_name: lastName || 'Member',
      email: email,
      role: role,
      status: 'active'
    });

    if (adminInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Failed to assign admin role: ' + adminInsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: authData.user });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
