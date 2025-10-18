/**
 * Engagement API Route
 * Handles user interactions: views, likes, comments, shares
 */

import { NextResponse } from "next/server";
import { 
  recordView, 
  recordLike, 
  removeLike,
  recordComment, 
  recordShare,
  getEngagementStats,
  hasUserLiked
} from "@/lib/engagementUtils";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * POST - Record engagement action
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { type, userId, comment, username, platform } = body;

    console.log(`📊 [API] Engagement request: ${type} for event ${id}`);

    let result;

    switch (type) {
      case 'view':
        result = await recordView(id);
        break;

      case 'like':
        if (!userId) {
          return NextResponse.json({ 
            success: false, 
            error: 'User ID required for likes' 
          }, { status: 400 });
        }
        result = await recordLike(id, userId);
        break;

      case 'unlike':
        if (!userId) {
          return NextResponse.json({ 
            success: false, 
            error: 'User ID required for unlikes' 
          }, { status: 400 });
        }
        result = await removeLike(id, userId);
        break;

      case 'comment':
        if (!userId || !comment) {
          return NextResponse.json({ 
            success: false, 
            error: 'User ID and comment text required' 
          }, { status: 400 });
        }
        result = await recordComment(id, userId, comment, username);
        break;

      case 'share':
        result = await recordShare(id, userId, platform);
        break;

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid engagement type' 
        }, { status: 400 });
    }

    // Get updated event data
    const eventSnap = await getDoc(doc(db, "events", id));
    const eventData = eventSnap.exists() ? eventSnap.data() : null;

    return NextResponse.json({
      success: result?.success !== false,
      type,
      result,
      updatedEvent: eventData,
      message: `${type} recorded successfully`
    });

  } catch (error) {
    console.error('❌ [API] Engagement error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

/**
 * GET - Retrieve engagement stats
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const stats = await getEngagementStats(id);
    
    if (!stats) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    // Check if user has liked (if userId provided)
    let userLiked = false;
    if (userId) {
      userLiked = await hasUserLiked(id, userId);
    }

    return NextResponse.json({
      success: true,
      eventId: id,
      stats,
      userLiked
    });

  } catch (error) {
    console.error('❌ [API] Error fetching engagement stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

