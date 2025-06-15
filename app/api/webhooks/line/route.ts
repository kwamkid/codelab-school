// app/api/webhooks/line/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getLineSettings } from '@/lib/services/line-settings';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// LINE Webhook endpoint
export async function POST(request: NextRequest) {
  try {
    // Get LINE settings first
    const settings = await getLineSettings();
    
    if (!settings.messagingChannelSecret) {
      console.error('LINE channel secret not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }
    
    // Get request body as text for signature validation
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    
    // Validate signature manually
    const channelSecret = settings.messagingChannelSecret;
    
    // Create HMAC-SHA256 hash
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');
    
    // Compare signatures
    if (hash !== signature) {
      console.log('Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Parse webhook body
    const webhookBody = JSON.parse(body);
    
    // Mark webhook as verified if we receive events
    if (webhookBody.events && webhookBody.events.length > 0) {
      await updateWebhookStatus(true);
    }
    
    // Process each event
    for (const event of webhookBody.events) {
      console.log('Received LINE event:', event.type);
      
      switch (event.type) {
        case 'message':
          await handleMessage(event);
          break;
          
        case 'follow':
          await handleFollow(event);
          break;
          
        case 'unfollow':
          await handleUnfollow(event);
          break;
          
        case 'postback':
          await handlePostback(event);
          break;
          
        default:
          console.log('Unhandled event type:', event.type);
      }
    }
    
    // Return 200 OK
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET request for webhook verification
export async function GET(request: NextRequest) {
  try {
    // LINE sends a verification request with these parameters
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');
    
    // For LINE webhook verification
    if (mode && challenge) {
      console.log('Webhook verification request received');
      // Mark webhook as verified
      await updateWebhookStatus(true);
      // Return the challenge to verify the webhook
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // For manual testing
    return NextResponse.json({
      status: 'ok',
      message: 'LINE webhook endpoint is active',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update webhook verification status
async function updateWebhookStatus(verified: boolean) {
  try {
    const settingsRef = doc(db, 'settings', 'line');
    await updateDoc(settingsRef, {
      webhookVerified: verified,
      webhookVerifiedAt: new Date()
    });
    console.log('Webhook status updated:', verified);
  } catch (error) {
    console.error('Error updating webhook status:', error);
  }
}

// Handle message events
async function handleMessage(event: any) {
  const userId = event.source.userId;
  const message = event.message;
  
  console.log(`Message from ${userId}:`, message.text);
  
  // Get LINE settings for auto-reply
  const settings = await getLineSettings();
  
  if (!settings.enableAutoReply) {
    return;
  }
  
  // TODO: Implement auto-reply logic based on message content
  // For now, just log the message
  console.log('Auto-reply is enabled but not implemented yet');
}

// Handle follow (friend add) events
async function handleFollow(event: any) {
  const userId = event.source.userId;
  console.log(`New follower: ${userId}`);
  
  // TODO: Send welcome message
  // TODO: Create or update parent profile
}

// Handle unfollow events
async function handleUnfollow(event: any) {
  const userId = event.source.userId;
  console.log(`Unfollowed by: ${userId}`);
  
  // TODO: Update parent status
}

// Handle postback events (from Rich Menu or buttons)
async function handlePostback(event: any) {
  const userId = event.source.userId;
  const data = event.postback.data;
  
  console.log(`Postback from ${userId}:`, data);
  
  // TODO: Handle different postback actions
}