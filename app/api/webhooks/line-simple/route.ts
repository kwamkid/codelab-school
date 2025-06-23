// app/api/webhooks/line-simple/route.ts

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== Simple Webhook POST ===');
  
  try {
    const body = await request.text();
    console.log('Body:', body);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    // Always return 200 OK
    return NextResponse.json({ 
      success: true,
      received: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    // Still return 200
    return NextResponse.json({ success: true });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'LINE webhook (simple)',
    timestamp: new Date().toISOString()
  });
}