/*
  Usage:
    set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccount.json (Windows)
    export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json (macOS/Linux)
    node scripts/importSeeds.js
*/

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function main() {
  const filePath = path.resolve(__dirname, '../seeds/events.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const items = JSON.parse(raw);

  console.log(`Importing ${items.length} events...`);

  const batchSize = 300;
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const batch = db.batch();
    for (const e of slice) {
      const ref = db.collection('events').doc();
      const doc = {
        date: e.date,
        title: e.title,
        description: e.description || '',
        sources: Array.isArray(e.sources) ? e.sources : [],
        author: e.author || 'system',
        status: e.status || 'verified',
        versions: [
          {
            date: e.date,
            title: e.title,
            description: e.description || '',
            sources: Array.isArray(e.sources) ? e.sources : [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: e.author || 'system',
          },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: e.author || 'system',
      };
      batch.set(ref, doc);
    }
    await batch.commit();
    console.log(`Committed ${Math.min(i + batchSize, items.length)} / ${items.length}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


