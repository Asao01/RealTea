"use client";

function getCentury(year) {
  const y = Number(year);
  if (!y) return null;
  return Math.ceil(y / 100);
}

export default function PeriodFilter({ period, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={period}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
      >
        <option value="">All periods</option>
        <option value="1900s">1900s</option>
        <option value="1910s">1910s</option>
        <option value="1920s">1920s</option>
        <option value="1930s">1930s</option>
        <option value="1940s">1940s</option>
        <option value="1950s">1950s</option>
        <option value="1960s">1960s</option>
        <option value="1970s">1970s</option>
        <option value="1980s">1980s</option>
        <option value="1990s">1990s</option>
        <option value="2000s">2000s</option>
        <option value="2010s">2010s</option>
        <option value="2020s">2020s</option>
      </select>
    </div>
  );
}

export function matchesPeriod(event, period) {
  if (!period) return true;
  const decadeStart = Number(period.slice(0, 4));
  if (!event?.date) return false;
  const year = Number(String(event.date).slice(0, 4));
  return year >= decadeStart && year < decadeStart + 10;
}


