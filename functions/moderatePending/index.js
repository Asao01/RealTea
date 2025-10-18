const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.onPendingEventCreate = functions.firestore
  .document("pendingEvents/{id}")
  .onCreate(async (snap, context) => {
    const data = snap.data();

    try {
      const result = await callAIModerationAPI(data);

      // Write audit log of decision
      await db.collection("auditLogs").add({
        type: "moderation",
        pendingId: context.params.id,
        status: result.status || (result.approved ? "verified" : "rejected"),
        reason: result.reason || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: "ai-moderation",
      });

      if (result.approved) {
        // Determine status based on AI decision and conflicting claims
        let status = result.status || "verified"; // verified | disputed
        if (Array.isArray(data.disputedClaims) && data.disputedClaims.length > 0) {
          status = "disputed";
        }

        // Write revision snapshot
        await db.collection("eventRevisions").add({
          eventId: result.targetEventId || null,
          status,
          ...data,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Compute initial AI credibility score based on sources
        const uniqueSources = Array.isArray(data.sources) ? Array.from(new Set(data.sources)) : [];
        const num = uniqueSources.length;
        // Heuristic: base 0.4 + 0.25 per independent source up to 1.0; disputed caps at 0.7
        let aiScore = Math.max(0, Math.min(1, 0.4 + 0.25 * Math.min(num, 3)));
        if (status === 'disputed') aiScore = Math.min(aiScore, 0.7);
        const communityScore = 0; // starts at 0 until votes arrive
        const finalScore = 0.7 * aiScore + 0.3 * communityScore;

        // Append-only create in events
        await db.collection("events").add({
          date: data.date,
          title: data.title,
          description: data.description,
          sources: data.sources || [],
          disputedClaims: Array.isArray(data.disputedClaims) ? data.disputedClaims : [],
          author: data.author || "",
          status, // verified or disputed
          aiScore,
          communityScore,
          finalScore,
          versions: [
            {
              date: data.date,
              title: data.title,
              description: data.description,
              sources: data.sources || [],
              disputedClaims: Array.isArray(data.disputedClaims) ? data.disputedClaims : [],
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: data.author || "",
            },
          ],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: data.author || "",
        });

        await snap.ref.update({ status: status });
      } else {
        await snap.ref.update({ status: "rejected" });
      }
    } catch (err) {
      console.error("Moderation error", err);
      await snap.ref.update({ status: "rejected" });
    }
  });

async function callAIModerationAPI(payload) {
  const endpoint = process.env.MODERATION_ENDPOINT;
  const apiKey = process.env.MODERATION_API_KEY;
  if (!endpoint || !apiKey) {
    // default allow in dev if not configured
    return { approved: true };
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      date: payload.date,
      title: payload.title,
      description: payload.description,
      sources: payload.sources,
      author: payload.author,
    }),
  });
  const json = await res.json();
  // Expected: { approved: boolean, reason?: string }
  return json;
}


