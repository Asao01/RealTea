/**
 * API Route: /api/expandEvents
 * Expands short event descriptions into detailed one-page summaries using OpenAI
 * Runs automatically once a day via cron
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes for Vercel

export async function GET(request) {
  try {
    console.log('📝 [EXPAND] Starting event expansion job...');
    
    const startTime = Date.now();
    let checked = 0;
    let expanded = 0;
    let skipped = 0;
    let errors = 0;

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY not configured'
      }, { status: 500 });
    }

    // Check for Firestore
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firestore not initialized'
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Get all events
    const eventsRef = collection(db, 'events');
    const snapshot = await getDocs(eventsRef);

    if (snapshot.empty) {
      console.log('✅ [EXPAND] No events to process');
      return NextResponse.json({
        success: true,
        message: 'No events to expand',
        checked: 0
      });
    }

    console.log(`📊 [EXPAND] Found ${snapshot.size} events to check`);

    // Process each event
    for (const eventDoc of snapshot.docs) {
      try {
        checked++;
        const eventData = eventDoc.data();
        
        // Check if description is short (< 300 chars) or longDescription is missing
        const description = eventData.description || '';
        const longDescription = eventData.longDescription || '';
        
        const needsExpansion = (
          (description.length < 300 && longDescription.length < 500) ||
          longDescription.length < 500
        );

        if (!needsExpansion) {
          skipped++;
          console.log(`  ⏭️ [EXPAND] Skipping (already detailed): ${eventData.title?.substring(0, 50)}...`);
          continue;
        }

        console.log(`  📝 [EXPAND] Expanding: ${eventData.title?.substring(0, 60)}...`);
        console.log(`     Current length: ${longDescription.length || description.length} chars`);

        // Generate detailed summary with OpenAI
        const prompt = `You are RealTea, a professional historian and journalist.

Expand this event into a comprehensive, detailed one-page summary (500-800 words):

Title: ${eventData.title}
Current Summary: ${longDescription || description}
Date: ${eventData.date || 'Unknown'}
Location: ${eventData.location || 'Unknown'}
Category: ${eventData.category || 'Unknown'}
Sources: ${(eventData.sources || []).join(', ') || 'None'}

Create a detailed article that includes:
1. Background context and historical significance
2. What happened and why it matters
3. Key people, organizations, or places involved
4. Immediate consequences and impact
5. Long-term implications
6. Connections to related events or trends

Write in a clear, engaging style for a general audience. Be factual and neutral.
Make it exactly 500-800 words - a complete, informative article.

Return ONLY the expanded article text (no JSON, no formatting, just the article).`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a professional historian and journalist who writes comprehensive, engaging articles about historical and current events."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.4
        });

        const expandedText = completion.choices[0].message.content.trim();
        const wordCount = expandedText.split(/\s+/).length;

        console.log(`     ✅ Generated: ${expandedText.length} chars, ${wordCount} words`);

        // Update Firestore document
        const eventRef = doc(db, 'events', eventDoc.id);
        await updateDoc(eventRef, {
          longDescription: expandedText,
          description: expandedText.substring(0, 250) + '...', // Update short description too
          expandedAt: serverTimestamp(),
          expandedBy: 'RealTea AI Expander'
        });

        expanded++;
        console.log(`     💾 Saved to Firestore: ${eventDoc.id}`);

        // Rate limiting - 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ❌ [EXPAND] Error processing ${eventDoc.id}:`, error.message);
        errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ EVENT EXPANSION JOB COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Checked: ${checked} | Expanded: ${expanded} | Skipped: ${skipped}`);
    console.log(`⏱️  Duration: ${duration}s`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`);
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      message: 'Event expansion completed',
      results: {
        checked,
        expanded,
        skipped,
        errors,
        durationSeconds: parseFloat(duration)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [EXPAND] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

