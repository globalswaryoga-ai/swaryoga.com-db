function workshopSessionCalendar(startDate, holidayDates = [], sessionCount = 14) {
  const key = String(startDate || '').slice(0, 10);
  const cursor = new Date(`${key}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isFinite(cursor.getTime()) || cursor.toISOString().slice(0, 10) !== key) {
    throw new Error('Workshop start date is invalid');
  }
  if (!Number.isInteger(sessionCount) || sessionCount < 1 || sessionCount > 366) throw new Error('Workshop session count is invalid');
  const holidays = new Set(holidayDates.map(value => String(value).slice(0, 10)));
  const rows = [];
  let dayNumber = 0;
  while (dayNumber < sessionCount) {
    const classDate = cursor.toISOString().slice(0, 10);
    const holiday = holidays.has(classDate) || cursor.getUTCDay() === 0;
    if (!holiday) dayNumber++;
    rows.push({ classDate, dayNumber, holiday });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return rows;
}

// Union join intervals: duplicate reports and simultaneous devices must not
// inflate a student's reconnect duration. Retain duration-only evidence.
function attendanceDuration(participants) {
  const intervals = [];
  let fallback = 0;
  const seen = new Set();
  for (const participant of participants) {
    const start = Date.parse(participant.joinTime);
    const end = Date.parse(participant.leaveTime);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) intervals.push([start, end]);
    else {
      const key = JSON.stringify(participant);
      if (!seen.has(key)) fallback += Math.max(0, Number(participant.durationSeconds) || 0);
      seen.add(key);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let duration = 0;
  let current;
  for (const interval of intervals) {
    if (!current) current = [...interval];
    else if (interval[0] <= current[1]) current[1] = Math.max(current[1], interval[1]);
    else { duration += current[1] - current[0]; current = [...interval]; }
  }
  if (current) duration += current[1] - current[0];
  return Math.round(duration / 1000 + fallback);
}

module.exports = { workshopSessionCalendar, attendanceDuration };
