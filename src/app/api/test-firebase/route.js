import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Test Firebase Connection
 * GET /api/test-firebase
 */
export async function GET() {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    // Try to write a test document
    const docRef = await addDoc(collection(db, 'events'), {
      title: 'Firebase Connection Test',
      description: 'This is a test event to verify Firebase is working correctly.',
      date: new Date().toISOString().split('T')[0],
      category: 'Test',
      location: 'System Test',
      verifiedSource: 'Internal Test',
      credibilityScore: 100,
      verifiedSummary: 'Test event created automatically to verify database connection.',
      aiGenerated: true,
      testEvent: true,
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Firebase test successful! Document ID:', docRef.id);
    
    return NextResponse.json({
      success: true,
      message: 'Firebase connection successful!',
      documentId: docRef.id,
      timestamp: new Date().toISOString(),
      database: 'Firestore',
      collection: 'events',
    });
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: 'Failed to write to Firestore. Check Firebase config and permissions.',
      },
      { status: 500 }
    );
  }
}

