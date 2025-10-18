/**
 * Auth Ping Endpoint
 * Verifies Firebase configuration
 */

import { NextResponse } from "next/server";
import env from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    success: true,
    environment: env.isDevelopment ? 'development' : 'production',
    firebase: {
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING',
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'MISSING',
      configured: env.isValid()
    },
    timestamp: new Date().toISOString()
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

