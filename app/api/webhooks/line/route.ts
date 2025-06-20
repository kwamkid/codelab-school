// app/api/webhooks/line/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getLineSettings } from '@/lib/services/line-settings';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Simple in-memory storage for webhook logs (for development)
const webhookLogs: any[] = [];
const MAX_LOGS = 20;

// Store webhook logs
async function storeWebhookLogs(events: any[]) {
  for (const event of events) {
    const log = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: event.type,
      userId: event.source?.userId || 'unknown',
      message: event.message?.text || '',
      data: event
    };
    
    webhookLogs.unshift(log); // Add to beginning
    
    // Keep only recent logs
    if (webhookLogs.length > MAX_LOGS) {
      webhookLogs.pop();
    }
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

// LINE Webhook endpoint
export async function POST(request: NextRequest) {
  console.log('=== Webhook POST received ===');
  
  try {
    // Get LINE settings first
    const settings = await getLineSettings();
    
    if (!settings.messagingChannelSecret) {
      console.error('LINE channel secret not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }
    
    // Get request body as text for signature validation
    const body = await request.text();
    console.log('Webhook body:', body);
    
    const signature = request.headers.get('x-line-signature') || '';
    console.log('Signature:', signature);
    
    // Skip signature validation in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Skipping signature validation');
    } else {
      // Validate signature in production
      const channelSecret = settings.messagingChannelSecret;
      const hash = crypto
        .createHmac('sha256', channelSecret)
        .update(body)
        .digest('base64');
      
      if (hash !== signature) {
        console.log('Invalid signature');
        console.log('Expected:', hash);
        console.log('Received:', signature);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // Parse webhook body
    const webhookBody = JSON.parse(body);
    console.log('Parsed events:', webhookBody.events?.length || 0);
    
    // Store webhook events in memory for viewing
    if (webhookBody.events && webhookBody.events.length > 0) {
      await storeWebhookLogs(webhookBody.events);
      console.log('Stored logs, total:', webhookLogs.length);
    }
    
    // Mark webhook as verified if we receive events
    if (webhookBody.events && webhookBody.events.length > 0) {
      await updateWebhookStatus(true);
    }
    
    // Process each event
    for (const event of (webhookBody.events || [])) {
      console.log('Processing event:', event.type, 'from user:', event.source?.userId);
      
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
    
    console.log('=== Webhook processing complete ===');
    
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

// GET request for webhook verification and logs
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
    
    // Return webhook logs (for viewing)
    return NextResponse.json({
      status: 'ok',
      message: 'LINE webhook endpoint is active',
      timestamp: new Date().toISOString(),
      logs: webhookLogs,
      count: webhookLogs.length
    });
    
  } catch (error) {
    console.error('Webhook GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}