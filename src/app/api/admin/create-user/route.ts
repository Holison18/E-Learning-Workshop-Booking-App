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
    const { email, password, firstName, lastName, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Try to create user in Supabase Auth via Admin API
    let newUserId;
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
      if (authError.message.includes('already been registered')) {
        // User already exists. Look them up in the participants table to get their ID.
        const { data: existingParticipant } = await supabaseAdmin
          .from('participants')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingParticipant) {
          newUserId = existingParticipant.id;
        } else {
          // Fallback: If they are in auth but not participants, find them in Auth via listUsers
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const authUser = listData?.users?.find(u => u.email === email);
          
          if (authUser) {
            newUserId = authUser.id;
            
            // Try to create the missing participant record for consistency
            await supabaseAdmin.from('participants').insert({
              id: newUserId,
              first_name: firstName || 'Staff',
              last_name: lastName || 'Member',
              email: email,
              phone: '0000000000',
              organization_name: 'Internal Staff'
            });
          } else {
            return NextResponse.json({ error: 'User exists in Auth but could not be located. Cannot promote to admin.' }, { status: 400 });
          }
        }
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      newUserId = authData.user.id;

      // 4. Insert into participants table (only if newly created)
      const { error: participantError } = await supabaseAdmin.from('participants').insert({
        id: newUserId,
        first_name: firstName || 'Staff',
        last_name: lastName || 'Member',
        email: email,
        phone: '0000000000', // Default placeholder
        organization_name: 'Internal Staff'
      });

      if (participantError) {
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return NextResponse.json({ error: 'Failed to create participant record: ' + participantError.message }, { status: 500 });
      }
    }

    // 5. Insert or update admins table (use upsert to handle if they were already an admin but inactive)
    const { error: adminInsertError } = await supabaseAdmin.from('admins').upsert({
      id: newUserId,
      first_name: firstName || 'Staff',
      last_name: lastName || 'Member',
      email: email,
      role: role,
      status: 'active'
    });

    if (adminInsertError) {
      // We don't delete the Auth user if we just promoted an existing participant
      if (authData?.user) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
      }
      return NextResponse.json({ error: 'Failed to assign admin role: ' + adminInsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: authData?.user || { id: newUserId, email } });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
