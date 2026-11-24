export function localDay(value = Date.now()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid date');
  return `${date.getFullYear().toString().padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dayDate(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new RangeError('Invalid day');
  const [year, month, date] = day.split('-').map(Number);
  const result = new Date(year, month - 1, date, 12);
  result.setFullYear(year);
  if (localDay(result) !== day) throw new RangeError('Invalid calendar day');
  return result;
}

export function addDays(day, amount) {
  const date = dayDate(day);
  date.setDate(date.getDate() + amount);
  return localDay(date);
}

/** Calendar arithmetic preserves local midnight boundaries, including DST changes. */
export function splitActiveDuration(startMs, durationMs) {
  if (!Number.isFinite(startMs) || !Number.isFinite(durationMs) || durationMs < 0) throw new RangeError('Invalid duration');
  const parts = [];
  let cursor = startMs, remaining = durationMs;
  while (remaining > 0) {
    const date = new Date(cursor);
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const length = Math.min(remaining, midnight - cursor);
    if (!(length > 0)) throw new RangeError('Invalid time interval');
    parts.push({ day: localDay(cursor), durationMs: length });
    cursor += length;
    remaining -= length;
  }
  return parts;
}

export function periodBounds(period, now = Date.now(), firstDay = localDay(now)) {
  const end = localDay(now);
  if (period === 'all') return { start: firstDay < end ? firstDay : end, end };
  const length = { today: 1, '7': 7, '30': 30 }[period];
  if (!length) throw new RangeError('Invalid period');
  return { start: addDays(end, 1 - length), end };
}
export const withinDays = (day, bounds) => day >= bounds.start && day <= bounds.end;
