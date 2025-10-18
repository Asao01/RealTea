/**
 * API Route: /api/ai
 * Server-side OpenAI API proxy to avoid CORS issues
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/ai - Call OpenAI from server-side
 */
export async function POST(request) {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'OpenAI API key not configured'
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }

  try {
    const body = await request.json();
    const { messages, temperature = 0.7, max_tokens = 300 } = body;

    console.log('🤖 [AI API] OpenAI request received');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature,
        max_tokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI error: ${response.status} - ${errorData.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    console.log('✅ [AI API] OpenAI response received');

    return NextResponse.json({
      success: true,
      data
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ [AI API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

export async function GET(request) {
  return NextResponse.json({
    message: 'POST to this endpoint with OpenAI request body'
  }, { headers: corsHeaders });
}

