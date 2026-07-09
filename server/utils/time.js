// Time helpers — MedDrop only operates in India, so time-of-day logic must use IST
// regardless of the server host's own OS timezone (e.g. Render's containers default to
// UTC, while a local dev machine is typically already IST) — reading the hour via the
// server process's local timezone would otherwise pick the wrong time band in production.

const getISTHour = () => {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  // Some ICU versions format midnight as "24" with hour12:false — normalize to 0.
  return parseInt(hourStr, 10) % 24;
};

module.exports = { getISTHour };
