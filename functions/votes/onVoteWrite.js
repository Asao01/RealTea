const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.onVoteWrite = functions.firestore
  .document("events/{eventId}/votes/{userId}")
  .onWrite(async (change, context) => {
    const { eventId, userId } = context.params;

    // Recompute communityScore from votes
    const votesSnap = await db.collection("events").doc(eventId).collection("votes").get();
    let up = 0, down = 0;
    for (const d of votesSnap.docs) {
      const v = d.data();
      const weight = v.role === 'admin' || v.role === 'journalist' ? 2 : 1;
      if (v.value > 0) up += weight; else if (v.value < 0) down += weight;
    }
    const total = up + down;
    const communityScore = total > 0 ? (up - down) / total : 0;

    // Get existing aiScore
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) return;
    const aiScore = eventSnap.get('aiScore') || 0;
    const finalScore = 0.7 * aiScore + 0.3 * communityScore;

    await eventRef.update({ communityScore, finalScore });
  });


