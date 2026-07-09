// Calendar export helpers - Google Calendar quick-add links plus universal
// .ics files (Apple Calendar, Outlook, and everything else that isn't Google).

export type CalendarEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
};

// Builds a genuinely useful event description - facilitator, category, and
// the workshop's own description - instead of just a bare title/location.
export function buildEventDescription(opts: {
  audience?: string | null;
  category?: string | null;
  description?: string | null;
}): string {
  const parts: string[] = [];
  if (opts.category) parts.push(`Category: ${opts.category}`);
  if (opts.audience) parts.push(`Audience: ${opts.audience}`);
  if (opts.description) parts.push(opts.description);
  parts.push('Booked via the KNUST E-Learning Centre Workshop Portal.');
  return parts.join('\n\n');
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function combineDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
}

// Floating local time (no Z/offset) - the event happens at this clock time
// wherever the attendee is, which is what "9am at CoE Auditorium" means.
function formatFloatingDateTime(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = combineDateTime(event.date, event.startTime);
  const end = combineDateTime(event.date, event.endTime);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatFloatingDateTime(start)}/${formatFloatingDateTime(end)}`,
    details: event.description || '',
    location: event.location || '',
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\;,]/g, (match) => '\\' + match).replace(/\n/g, '\\n');
}

export function buildIcsCalendar(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KNUST E-Learning Centre//Workshop Booking//EN',
    'CALSCALE:GREGORIAN',
  ];

  const stamp = formatFloatingDateTime(new Date());

  for (const event of events) {
    const start = combineDateTime(event.date, event.startTime);
    const end = combineDateTime(event.date, event.endTime);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}@knust-elearning`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatFloatingDateTime(start)}`,
      `DTEND:${formatFloatingDateTime(end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(filename: string, events: CalendarEvent[]) {
  const content = buildIcsCalendar(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
