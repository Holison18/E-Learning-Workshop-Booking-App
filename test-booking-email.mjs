import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually for the test script
const envLocal = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const env = {};
envLocal.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace('\r', '');
});

const knustApiKey = env.KNUST_MSG_API_KEY;
const knustChannel = env.KNUST_MSG_CHANNEL;
const knustAppId = env.KNUST_MSG_APP_ID;

const testEmail = 'kobinaakofiholison@gmail.com';
const baseUrl = 'https://elearning.knust.edu.gh';
const calendarLink = `${baseUrl}/api/calendar/download?ids=test-uuid`;

const htmlBody = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
    <div style="border-top: 4px solid #A32020; padding-top: 20px;">
      <h2 style="color: #A32020; margin-top: 0;">Booking Confirmation</h2>
      <p>Hello Kobina,</p>
      <p>You have successfully booked <strong>1</strong> session(s) at the KNUST E-Learning Workshop Portal.</p>
      
      <h3 style="border-bottom: 1px solid #E0E0E0; padding-bottom: 8px;">Your Sessions</h3>
      
        <div style="margin-bottom: 16px; padding: 12px; background-color: #F8F9FA; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #1A1A1A;">Introduction to E-Learning (Test)</h4>
          <p style="margin: 0; font-size: 14px; color: #4A4A4A;">
            <strong>Date:</strong> 2026-08-15<br>
            <strong>Time:</strong> 09:00 - 11:00<br>
            <strong>Location:</strong> Main Auditorium<br>
            <strong>Audience:</strong> Faculty<br>
            <strong>Facilitator:</strong> Dr. Smith
          </p>
        </div>
      
      <p style="margin-top: 24px;">
        <a href="${calendarLink}" style="display: inline-block; padding: 10px 20px; background-color: #A32020; color: #FFFFFF; text-decoration: none; border-radius: 4px; font-weight: bold;">Add to Calendar (.ics)</a>
      </p>
      <p style="margin-top: 16px; font-size: 14px;">
        Click the button above to download the calendar file and add these sessions to your personal calendar.
      </p>
      <p>See you there!</p>
      <p style="font-size: 12px; color: #888888; margin-top: 32px;">
        KNUST E-Learning Centre
      </p>
    </div>
  </div>
`;

const payload = {
  channel: knustChannel,
  subject: 'Workshop Booking Confirmation (Test)',
  recipients: [testEmail],
  appId: knustAppId,
  body: {
    contentType: 'html',
    content: htmlBody,
  },
};

console.log('Sending email test to:', testEmail);
console.log('Using Channel:', knustChannel);

async function run() {
  try {
    const res = await fetch('https://msg-gw.knust.edu.gh/api/v1/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': knustApiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('Response Status:', res.status);
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Error sending request:', err);
  }
}

run();
