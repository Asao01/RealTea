/**
 * API Route: Generate Diverse Events
 * Creates unique, varied events from multiple categories and time periods
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore";

// Diverse event templates for variety
const EVENT_TEMPLATES = {
  'Science': [
    { title: 'DNA Structure Discovery', year: 1953, location: 'Cambridge, England', description: 'Watson and Crick discover the double helix structure of DNA, revolutionizing biology.' },
    { title: 'First Human Genome Sequenced', year: 2003, location: 'Bethesda, Maryland', description: 'Human Genome Project completes first full human DNA sequence.' },
    { title: 'CRISPR Gene Editing Breakthrough', year: 2012, location: 'Berkeley, California', description: 'Scientists develop revolutionary gene-editing technology.' },
    { title: 'Higgs Boson Particle Discovered', year: 2012, location: 'Geneva, Switzerland', description: 'CERN confirms existence of the God Particle at Large Hadron Collider.' },
    { title: 'Gravitational Waves Detected', year: 2016, location: 'Livingston, Louisiana', description: 'First direct observation of gravitational waves confirms Einstein theory.' }
  ],
  'Technology': [
    { title: 'First Computer Mouse Invented', year: 1964, location: 'Stanford, California', description: 'Doug Engelbart invents the computer mouse, changing human-computer interaction.' },
    { title: 'World Wide Web Goes Public', year: 1991, location: 'Geneva, Switzerland', description: 'Tim Berners-Lee releases WWW to public, starting internet revolution.' },
    { title: 'iPhone Revolutionizes Smartphones', year: 2007, location: 'Cupertino, California', description: 'Steve Jobs unveils iPhone, transforming mobile computing forever.' },
    { title: 'Bitcoin Cryptocurrency Created', year: 2009, location: 'Online', description: 'Satoshi Nakamoto launches Bitcoin, first decentralized cryptocurrency.' },
    { title: 'ChatGPT AI Released', year: 2022, location: 'San Francisco, California', description: 'OpenAI releases ChatGPT, bringing AI to mainstream users worldwide.' }
  ],
  'Politics': [
    { title: 'French Revolution Begins', year: 1789, location: 'Paris, France', description: 'Storming of Bastille marks start of French Revolution, changing European politics.' },
    { title: 'Berlin Wall Falls', year: 1989, location: 'Berlin, Germany', description: 'Berlin Wall demolished, symbolizing end of Cold War and German reunification.' },
    { title: 'Nelson Mandela Elected President', year: 1994, location: 'Johannesburg, South Africa', description: 'First democratic election in South Africa ends apartheid era.' },
    { title: 'Brexit Referendum', year: 2016, location: 'London, England', description: 'United Kingdom votes to leave European Union in historic referendum.' },
    { title: 'Arab Spring Uprisings', year: 2011, location: 'Tunis, Tunisia', description: 'Pro-democracy movements sweep across Middle East and North Africa.' }
  ],
  'Conflict': [
    { title: 'D-Day Normandy Invasion', year: 1944, location: 'Normandy, France', description: 'Allied forces land in France, beginning liberation of Western Europe.' },
    { title: 'Vietnam War Ends', year: 1975, location: 'Saigon, Vietnam', description: 'Fall of Saigon marks end of Vietnam War after decades of conflict.' },
    { title: 'Gulf War Operation Desert Storm', year: 1991, location: 'Kuwait', description: 'Coalition forces liberate Kuwait from Iraqi occupation.' },
    { title: 'Rwandan Genocide', year: 1994, location: 'Kigali, Rwanda', description: 'Mass killings result in 800,000 deaths in 100 days of horror.' },
    { title: 'September 11 Terrorist Attacks', year: 2001, location: 'New York City, New York', description: 'Coordinated attacks kill nearly 3,000, changing global security forever.' }
  ],
  'Culture': [
    { title: 'Woodstock Music Festival', year: 1969, location: 'Bethel, New York', description: 'Iconic music festival defines counterculture movement of 1960s.' },
    { title: 'Live Aid Concert', year: 1985, location: 'London & Philadelphia', description: 'Global charity concert raises millions for Ethiopian famine relief.' },
    { title: 'Fall of Saigon Photos', year: 1975, location: 'Saigon, Vietnam', description: 'Pulitzer Prize photos capture dramatic helicopter evacuations.' },
    { title: 'Harry Potter Book Released', year: 1997, location: 'London, England', description: 'J.K. Rowling launches global phenomenon with first Harry Potter book.' },
    { title: 'Avatar Becomes Highest-Grossing Film', year: 2009, location: 'Los Angeles, California', description: 'James Cameron film revolutionizes 3D cinema technology.' }
  ],
  'Environment': [
    { title: 'Chernobyl Nuclear Disaster', year: 1986, location: 'Pripyat, Ukraine', description: 'Nuclear reactor explodes, worst nuclear accident in history.' },
    { title: 'Exxon Valdez Oil Spill', year: 1989, location: 'Alaska', description: 'Massive oil spill devastates Alaskan coastline and wildlife.' },
    { title: 'Kyoto Protocol Signed', year: 1997, location: 'Kyoto, Japan', description: 'International treaty commits nations to reducing greenhouse gases.' },
    { title: 'Paris Climate Agreement', year: 2015, location: 'Paris, France', description: '196 nations agree to limit global warming to under 2°C.' },
    { title: 'Amazon Rainforest Fires', year: 2019, location: 'Amazon Basin, Brazil', description: 'Record wildfires devastate worlds largest rainforest.' }
  ]
};

export async function GET(request) {
  console.log('\n🎨 ===== GENERATING DIVERSE EVENTS =====');
  
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const eventsRef = collection(db, 'events');
    let saved = 0;
    let skipped = 0;

    // Generate events from all categories
    for (const [category, events] of Object.entries(EVENT_TEMPLATES)) {
      for (const eventTemplate of events) {
        try {
          // Check if already exists
          const titleQuery = query(
            eventsRef, 
            where('title', '==', eventTemplate.title),
            limit(1)
          );
          const existing = await getDocs(titleQuery);

          if (!existing.empty) {
            console.log(`  ⏭️  Skipped: ${eventTemplate.title}`);
            skipped++;
            continue;
          }

          // Create event
          const event = {
            title: eventTemplate.title,
            description: eventTemplate.description,
            category: category,
            location: eventTemplate.location,
            region: eventTemplate.location.split(',')[1]?.trim() || 'Global',
            year: eventTemplate.year.toString(),
            date: `${eventTemplate.year}-01-01`,
            verifiedSource: `https://en.wikipedia.org/wiki/${eventTemplate.title.replace(/ /g, '_')}`,
            verifiedSources: [`https://en.wikipedia.org/wiki/${eventTemplate.title.replace(/ /g, '_')}`],
            source: { 
              name: 'Wikipedia', 
              url: `https://en.wikipedia.org/wiki/${eventTemplate.year}` 
            },
            imageUrl: '',
            aiGenerated: false,
            newsGenerated: false,
            addedBy: 'System',
            upvotes: 0,
            downvotes: 0,
            credibilityScore: 65, // Historical events get higher default
            verified: true, // Pre-verified historical events
            contested: false,
            isBreaking: false,
            urgency: 30,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await addDoc(eventsRef, event);
          console.log(`  ✅ Added: ${eventTemplate.year} - ${eventTemplate.title}`);
          saved++;

          // Small delay
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`  ❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n📊 ===== GENERATION COMPLETE =====');
    console.log(`✅ Saved: ${saved} diverse events`);
    console.log(`⏭️  Skipped: ${skipped} duplicates`);
    console.log('🎨 ===== DIVERSE EVENTS READY =====\n');

    return NextResponse.json({
      success: true,
      message: 'Diverse events generated',
      saved,
      skipped
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('❌ Error generating diverse events:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate events', details: error.message },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

