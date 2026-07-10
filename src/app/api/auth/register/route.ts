import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getConfirmationEmailTemplate } from '@/lib/email-templates';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, organization } = body;

    if (!email || !password || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Create the user in Supabase via Admin API
    // Setting email_confirm: false bypasses Supabase's automatic email dispatch
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone,
      },
    });

    if (authError) {
      // Return a clean error if user already exists or password is too weak
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // 2. Create the participant profile
    const { error: profileError } = await supabaseAdmin.from('participants').insert([
      {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        organization_name: organization || null,
      },
    ]);

    if (profileError) {
      // Ideally we would rollback user creation here, but we'll return an error for now
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { error: 'User created, but profile setup failed. Contact support.' },
        { status: 500 }
      );
    }

    // 3. Generate the manual confirmation link via Supabase Admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate confirmation link. Contact support.' },
        { status: 500 }
      );
    }

    const confirmationUrl = linkData.properties.action_link;

    // 4. Send the email using KNUST Messaging API
    const knustApiKey = process.env.KNUST_MSG_API_KEY;
    const knustChannel = process.env.KNUST_MSG_CHANNEL;
    const knustAppId = process.env.KNUST_MSG_APP_ID;

    if (!knustApiKey || !knustChannel || !knustAppId) {
      console.error('Missing KNUST Messaging API credentials');
      return NextResponse.json(
        { error: 'Internal server configuration error.' },
        { status: 500 }
      );
    }

    const emailHtml = getConfirmationEmailTemplate(confirmationUrl);

    const knustApiPayload = {
      channel: knustChannel,
      subject: 'Please Confirm Your Email Address',
      recipients: [email],
      appId: knustAppId,
      body: {
        contentType: 'html',
        content: emailHtml,
      },
    };

    const emailResponse = await fetch('https://msg-gw.knust.edu.gh/api/v1/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': knustApiKey,
      },
      body: JSON.stringify(knustApiPayload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('KNUST API Error:', emailResponse.status, errorText);
      return NextResponse.json(
        { error: 'Account created, but failed to dispatch confirmation email.' },
        { status: 500 }
      );
    }

    // Success!
    return NextResponse.json({ success: true, message: 'Account created and email dispatched' });
  } catch (err: any) {
    console.error('Unexpected error during registration:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
