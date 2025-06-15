// app/api/test-webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Test webhook GET called');
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Webhook test endpoint is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('Test webhook POST called');
  
  try {
    const body = await request.text();
    console.log('Request body:', body);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'POST received',
      bodyLength: body.length
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Internal error'
    }, { status: 500 });
  }
}