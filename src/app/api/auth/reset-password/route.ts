import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPasswordResetEmailTemplate } from '@/lib/email-templates';
import { sendKnustEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Missing email field' }, { status: 400 });
    }

    // 1. Generate the recovery link via Supabase Admin (without triggering their email)
    const { data: linkData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (authError) {
      console.error('Error generating recovery link:', authError.message);
      // For security, do not reveal if an email is registered or not during password reset.
      // Just pretend it succeeded, or return a generic message.
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link was sent.' });
    }

    const resetUrl = linkData.properties.action_link;

    // 2. Format the email
    const emailHtml = getPasswordResetEmailTemplate(resetUrl);

    // 3. Send using KNUST API
    const result = await sendKnustEmail({
      recipients: [email],
      subject: 'Password Reset Request',
      htmlBody: emailHtml
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to dispatch password reset email.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'If an account exists, a reset link was sent.' });
  } catch (err: any) {
    console.error('Unexpected error during password reset:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
