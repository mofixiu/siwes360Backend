// Internship calendar shared by the supervisor queue, sign-offs and the admin
// and ITF overviews. The app uses the same rules (lib/utils/internship_calendar.dart).
//
// - Dates are plain 'YYYY-MM-DD' strings (the pool returns DATE columns as strings).
// - Internship weeks run Monday to Sunday. Week 1 is the week holding the start date,
//   as on the paper SIWES logbook, so every week has the same Mon-Fri days.
// - Working days are Monday to Friday.
const DAY = 24 * 60 * 60 * 1000;

const toTime = (date) => {
  const [y, m, d] = String(date).slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

const fmt = (time) => new Date(time).toISOString().slice(0, 10);

// Today on the server's calendar (the server runs on Lagos time).
const today = () => {
  const now = new Date();
  return fmt(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const addDays = (date, days) => fmt(toTime(date) + days * DAY);

const isWeekday = (time) => {
  const dow = new Date(time).getUTCDay();
  return dow !== 0 && dow !== 6;
};

const mondayOf = (time) => time - ((new Date(time).getUTCDay() + 6) % 7) * DAY;

// Week number of `date` in an internship that starts on `start`.
const weekNumber = (start, date) =>
  Math.floor((mondayOf(toTime(date)) - mondayOf(toTime(start))) / (7 * DAY)) + 1;

// Monday and Sunday of week `n`.
const weekRange = (start, n) => {
  const monday = mondayOf(toTime(start)) + (n - 1) * 7 * DAY;
  return { week_start: fmt(monday), week_end: fmt(monday + 6 * DAY) };
};

// Working days from `from` to `to`, both included. 0 when `to` is before `from`.
const workingDaysBetween = (from, to) => {
  let count = 0;
  for (let t = toTime(from); t <= toTime(to); t += DAY) {
    if (isWeekday(t)) count += 1;
  }
  return count;
};

// Working days strictly after `from` up to and including `to`.
const workingDaysSince = (from, to) => (toTime(to) <= toTime(from) ? 0 : workingDaysBetween(addDays(from, 1), to));

module.exports = { today, addDays, weekNumber, weekRange, workingDaysBetween, workingDaysSince, toTime };
