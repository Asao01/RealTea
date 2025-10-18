/**
 * AI Event Generator using OpenAI
 * Generates historically relevant timeline events
 */

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Generate a new event using OpenAI
 * @returns {Promise<Object>} The generated event data
 */
export async function generateAIEvent() {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Check your .env.local file.');
  }

  console.log('🤖 Generating AI event...');

  try {
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a historical expert. Generate a real, significant historical event with accurate details. Respond ONLY with valid JSON, no other text.'
          },
          {
            role: 'user',
            content: `Generate a single historically significant event. Return ONLY valid JSON in this exact format:
{
  "title": "Event title (concise, under 100 chars)",
  "description": "Detailed description (2-3 sentences, 150-300 chars)",
  "year": "YYYY",
  "date": "YYYY-MM-DD",
  "category": "one of: Technology, Politics, Science, Culture, War, Discovery, Sports",
  "location": "City, Country"
}

Requirements:
- Must be a real historical event
- Year between 1000-2024
- Accurate date if known
- Engaging description
- Return ONLY the JSON object, no markdown, no explanations`
          }
        ],
        temperature: 0.9,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    console.log('📝 Raw AI response:', content);

    // Parse the JSON response
    let eventData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      eventData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate required fields
    if (!eventData.title || !eventData.description || !eventData.year) {
      throw new Error('AI response missing required fields');
    }

    // Ensure proper format
    const generatedEvent = {
      title: eventData.title,
      description: eventData.description,
      year: String(eventData.year),
      date: eventData.date || `${eventData.year}-01-01`,
      category: eventData.category || 'History',
      location: eventData.location || 'Unknown',
      addedBy: 'AI Assistant',
      aiGenerated: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('✅ Generated event:', generatedEvent);

    return generatedEvent;
  } catch (error) {
    console.error('❌ Error generating AI event:', error);
    throw error;
  }
}

/**
 * Generate an event and save it to Firestore
 * @returns {Promise<string>} The ID of the created event
 */
export async function generateAndSaveEvent() {
  try {
    // Generate the event
    const eventData = await generateAIEvent();

    // Save to Firestore
    console.log('💾 Saving event to Firestore...');
    const eventsRef = collection(db, 'events');
    const docRef = await addDoc(eventsRef, eventData);

    console.log('✅ Event saved with ID:', docRef.id);

    return {
      id: docRef.id,
      ...eventData
    };
  } catch (error) {
    console.error('❌ Error generating and saving event:', error);
    throw error;
  }
}

