import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getConfirmationEmailTemplate } from '@/lib/email-templates';
import { sendKnustEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Missing email field' }, { status: 400 });
    }

    // 1. Generate the confirmation link via Supabase Admin (without triggering their email)
    // We use 'magiclink' because 'signup' requires a password, and magiclink will confirm their email and log them in.
    const { data: linkData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (authError) {
      console.error('Error generating signup link:', authError.message);
      // Don't expose internal errors for email scanning, return a generic message
      return NextResponse.json({ error: 'Unable to resend email. Ensure the account exists and is unverified.' }, { status: 400 });
    }

    const confirmationUrl = linkData.properties.action_link;

    // 2. Format the email
    const emailHtml = getConfirmationEmailTemplate(confirmationUrl);

    // 3. Send using KNUST API
    const result = await sendKnustEmail({
      recipients: [email],
      subject: 'Please Confirm Your Email Address',
      htmlBody: emailHtml
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to dispatch confirmation email.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Confirmation email resent successfully' });
  } catch (err: any) {
    console.error('Unexpected error during resend:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
