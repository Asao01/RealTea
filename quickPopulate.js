/**
 * Quick Population Script
 * Adds historical events to Firestore immediately
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '.env.local') });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔥 Firebase initialized');
console.log('📊 Starting quick population...\n');

// Sample curated historical events
const events = [
  {
    year: 1776,
    month: 7,
    day: 4,
    title: "Declaration of Independence Adopted",
    summary: "The Continental Congress formally adopted the Declaration of Independence in Philadelphia, declaring the thirteen American colonies independent from British rule. This document, primarily authored by Thomas Jefferson, became a foundational text of American democracy.",
    region: "North America",
    category: "Politics",
    sources: ["Wikipedia", "History.com"]
  },
  {
    year: 1969,
    month: 7,
    day: 20,
    title: "Apollo 11 Moon Landing",
    summary: "NASA astronauts Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon, with Armstrong declaring 'That's one small step for man, one giant leap for mankind.' This achievement marked a pivotal moment in the Space Race and human history.",
    region: "Global",
    category: "Space",
    sources: ["NASA", "Wikipedia"]
  },
  {
    year: 1989,
    month: 11,
    day: 9,
    title: "Fall of the Berlin Wall",
    summary: "The Berlin Wall, which had divided East and West Berlin for 28 years, was opened, allowing free passage between East and West Germany. This event symbolized the end of the Cold War and led to German reunification.",
    region: "Europe",
    category: "Politics",
    sources: ["Wikipedia", "BBC History"]
  },
  {
    year: 1945,
    month: 8,
    day: 15,
    title: "End of World War II",
    summary: "Japan announced its surrender to the Allied forces, effectively ending World War II. This came after the atomic bombings of Hiroshima and Nagasaki and marked the beginning of a new era of international relations.",
    region: "Asia",
    category: "War",
    sources: ["Wikipedia", "History Channel"]
  },
  {
    year: 1865,
    month: 4,
    day: 14,
    title: "Assassination of Abraham Lincoln",
    summary: "President Abraham Lincoln was shot by John Wilkes Booth at Ford's Theatre in Washington, D.C., dying the next morning. Lincoln's death came just days after the end of the Civil War.",
    region: "North America",
    category: "Politics",
    sources: ["Wikipedia", "National Archives"]
  },
  {
    year: 1903,
    month: 12,
    day: 17,
    title: "First Powered Flight",
    summary: "Orville and Wilbur Wright achieved the first sustained, powered, heavier-than-air flight in Kitty Hawk, North Carolina. The Wright Flyer flew for 12 seconds covering 120 feet, revolutionizing transportation.",
    region: "North America",
    category: "Technology",
    sources: ["Smithsonian", "Wikipedia"]
  },
  {
    year: 1928,
    month: 9,
    day: 3,
    title: "Discovery of Penicillin",
    summary: "Alexander Fleming discovered penicillin, the world's first antibiotic, at St Mary's Hospital in London. This accidental discovery revolutionized medicine and has saved millions of lives.",
    region: "Europe",
    category: "Medicine",
    sources: ["Nobel Prize", "Wikipedia"]
  },
  {
    year: 1954,
    month: 5,
    day: 17,
    title: "Brown v. Board of Education Decision",
    summary: "The U.S. Supreme Court unanimously ruled that racial segregation in public schools was unconstitutional, overturning the 'separate but equal' doctrine. This landmark decision was a major victory for the Civil Rights Movement.",
    region: "North America",
    category: "Human Rights",
    sources: ["Supreme Court", "Wikipedia"]
  },
  {
    year: 2001,
    month: 9,
    day: 11,
    title: "September 11 Attacks",
    summary: "Coordinated terrorist attacks by al-Qaeda resulted in the destruction of the World Trade Center in New York City and damage to the Pentagon, killing nearly 3,000 people. This event reshaped global politics and security.",
    region: "North America",
    category: "War",
    sources: ["9/11 Commission", "Wikipedia"]
  },
  {
    year: 1991,
    month: 8,
    day: 6,
    title: "World Wide Web Made Public",
    summary: "Tim Berners-Lee made the World Wide Web publicly available, posting the first web page to the internet. This invention transformed global communication and information access.",
    region: "Global",
    category: "Technology",
    sources: ["CERN", "Wikipedia"]
  }
];

async function populateEvents() {
  let saved = 0;
  let errors = 0;

  for (const event of events) {
    try {
      const dateStr = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
      
      const docId = event.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 100) + `-${event.year}`;

      const eventData = {
        title: event.title,
        summary: event.summary,
        description: event.summary,
        date: dateStr,
        year: event.year,
        region: event.region,
        category: event.category,
        sources: event.sources,
        credibilityScore: 95,
        verifiedByAI: true,
        addedBy: 'quick-populate',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        isBreaking: false,
      };

      const docRef = doc(db, 'events', docId);
      await setDoc(docRef, eventData, { merge: true });

      console.log(`✅ Added: ${event.year} - ${event.title}`);
      saved++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`❌ Error adding ${event.title}:`, error.message);
      errors++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Successfully added: ${saved} events`);
  console.log(`❌ Errors: ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🌐 Visit https://realitea.org/timeline to see new events!');
}

populateEvents()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

