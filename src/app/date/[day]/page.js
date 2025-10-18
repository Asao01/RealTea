"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getEvents } from "../../../lib/firestoreService";
import TimelineEvent from "../../../components/TimelineEvent";

export default function DayPage() {
  const params = useParams();
  const day = params?.day;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const all = await getEvents();
      setEvents(all.filter((e) => String(e.date) === day));
      setLoading(false);
    })();
  }, [day]);

  const sorted = useMemo(() => {
    const coverageRank = { low: 0, medium: 1, high: 2 };
    return events.slice().sort((a,b) => {
      const af = typeof a.finalScore === 'number' ? a.finalScore : 0;
      const bf = typeof b.finalScore === 'number' ? b.finalScore : 0;
      if (af !== bf) return bf - af;
      const ac = coverageRank[a.coverageLevel] ?? -1;
      const bc = coverageRank[b.coverageLevel] ?? -1;
      if (ac !== bc) return bc - ac;
      const at = a.createdAt?.seconds || 0;
      const bt = b.createdAt?.seconds || 0;
      return bt - at;
    });
  }, [events]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{new Date(String(day)).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}</h1>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="text-sm text-gray-500">No events for this day.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((e, idx) => (
            <TimelineEvent key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}


