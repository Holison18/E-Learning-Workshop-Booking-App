interface KnustEmailOptions {
  recipients: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  attachments?: {
    fileName: string;
    contentType: string;
    bytes: string; // Base64 encoded string
  }[];
}

export async function sendKnustEmail({ recipients, bcc = [], subject, htmlBody, attachments = [] }: KnustEmailOptions) {
  const apiKey = process.env.KNUST_MSG_API_KEY;
  const channel = process.env.KNUST_MSG_CHANNEL || 'workshop-portal';
  const appId = process.env.KNUST_MSG_APP_ID || 'knust-elearning-booking';
  const apiUrl = 'https://msg-gw.knust.edu.gh/api/v1/email/send';

  if (!apiKey) {
    console.error('KNUST_MSG_API_KEY is not set. Email will not be sent.');
    return { success: false, error: 'API key not configured' };
  }

  const payload = {
    channel,
    subject,
    recipients,
    ...(bcc.length > 0 && { bcc }),
    appId,
    body: {
      contentType: 'html',
      content: htmlBody,
    },
    ...(attachments.length > 0 && { attachments }),
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to send email:', result);
      return { success: false, error: result.message || 'API request failed' };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error calling KNUST Messaging API:', error);
    return { success: false, error: error.message };
  }
}
