import { Reminder } from '../types';

const ICS_DAY_MAP: Record<string, string> = {
  dom: 'SU',
  seg: 'MO',
  ter: 'TU',
  qua: 'WE',
  qui: 'TH',
  sex: 'FR',
  sab: 'SA',
};

const JS_DAY_TO_CODE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIcsLocalDateTime(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`;
}

function escapeIcsText(text: string): string {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function getNextOccurrence(timeStr: string, daysMask: string[]): Date {
  const [hh, mm] = String(timeStr || '09:00').split(':').map(Number);
  const now = new Date();
  const allowed = Array.isArray(daysMask) && daysMask.length > 0 ? daysMask : JS_DAY_TO_CODE;

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(Number.isFinite(hh) ? hh : 9, Number.isFinite(mm) ? mm : 0, 0, 0);
    const code = JS_DAY_TO_CODE[candidate.getDay()];
    if (allowed.includes(code) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }

  const fallback = new Date(now);
  fallback.setHours(Number.isFinite(hh) ? hh : 9, Number.isFinite(mm) ? mm : 0, 0, 0);
  fallback.setDate(fallback.getDate() + 1);
  return fallback;
}

export function downloadRemindersIcs(reminders: Reminder[]): number {
  const activeReminders = reminders.filter((r) => r.is_active);
  if (activeReminders.length === 0) return 0;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vocalis Fonoaudiologia//Lembretes Vocais//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Vocalis - Exercícios Vocais',
  ];

  const stamp = formatIcsLocalDateTime(new Date());

  for (const rem of activeReminders) {
    const start = getNextOccurrence(rem.time_str, rem.days_mask);
    const end = new Date(start.getTime() + 10 * 60 * 1000);
    const byDays = (Array.isArray(rem.days_mask) && rem.days_mask.length > 0
      ? rem.days_mask
      : ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    )
      .map((d) => ICS_DAY_MAP[d])
      .filter(Boolean)
      .join(',');

    lines.push(
      'BEGIN:VEVENT',
      `UID:vocalis-reminder-${rem.id}@vocalis.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsLocalDateTime(start)}`,
      `DTEND:${formatIcsLocalDateTime(end)}`,
      `SUMMARY:${escapeIcsText(`Vocalis: ${rem.title}`)}`,
      `DESCRIPTION:${escapeIcsText('Horário programado de terapia e higiene vocal no aplicativo Vocalis.')}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDays || 'MO,TU,WE,TH,FR'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(`Hora do seu exercício vocal: ${rem.title}`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vocalis-lembretes-vocais.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return activeReminders.length;
}
