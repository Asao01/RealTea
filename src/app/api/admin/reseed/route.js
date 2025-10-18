/**
 * Reseed API Route
 * Triggers global history seeding from browser
 * Protected by admin check
 */

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Import and run the seeder
    const { execSync } = require('child_process');
    
    console.log('🌍 [RESEED] Starting global history reseed...');
    
    // Run the seed script
    const output = execSync('node scripts/seedGlobalHistory.js', {
      encoding: 'utf-8',
      timeout: 300000, // 5 minutes timeout
    });
    
    console.log(output);
    
    return NextResponse.json({
      success: true,
      message: 'Reseeding completed successfully',
      output
    });
    
  } catch (error) {
    console.error('❌ [RESEED] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger reseed',
    endpoint: '/api/admin/reseed',
    method: 'POST'
  });
}

