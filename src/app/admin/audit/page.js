"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { db } from "../../../lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const qy = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(qy);
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  return (
    <ProtectedRoute>
      <div>
        <h1 className="text-lg font-semibold mb-3">Audit Log</h1>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-500">No logs.</div>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="p-3 border rounded">
                <div className="text-xs text-gray-500">{new Date(l.timestamp?.seconds ? l.timestamp.seconds*1000 : Date.now()).toLocaleString()}</div>
                <div className="text-sm">{l.type} · {l.status} · actor: {l.actor}</div>
                {l.reason && <div className="text-xs text-gray-600">Reason: {l.reason}</div>}
                {l.pendingId && <div className="text-xs text-gray-600">Pending ID: {l.pendingId}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


