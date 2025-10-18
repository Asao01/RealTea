/*
  Usage:
    NODE_ENV=production \
    GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
    node scripts/seed/import.js scripts/seed/events.sample.json

  Notes:
  - Requires a Firebase service account JSON with proper Firestore access.
  - Firestore security rules do not apply to Admin SDK; writes go through.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is required (path to service account JSON).');
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node scripts/seed/import.js <path-to-events.json>');
    process.exit(1);
  }
  const fullPath = path.resolve(inputPath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const events = JSON.parse(raw);
  if (!Array.isArray(events) || events.length === 0) {
    console.error('Input JSON must be a non-empty array.');
    process.exit(1);
  }

  console.log(`Importing ${events.length} events from ${fullPath} ...`);
  const batch = db.bulkWriter();
  const now = admin.firestore.FieldValue.serverTimestamp();

  let count = 0;
  for (const e of events) {
    const payload = {
      date: e.date,
      title: e.title,
      description: e.description || '',
      sources: Array.isArray(e.sources) ? e.sources : [],
      status: e.status || 'verified',
      author: e.author || 'system',
      createdAt: now,
      createdBy: e.author || 'system',
      versions: [
        {
          date: e.date,
          title: e.title,
          description: e.description || '',
          sources: Array.isArray(e.sources) ? e.sources : [],
          createdAt: now,
          createdBy: e.author || 'system',
        },
      ],
    };
    const ref = db.collection('events').doc();
    batch.create(ref, payload);
    count += 1;
  }

  await batch.close();
  console.log(`Done. Imported ${count} events.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


