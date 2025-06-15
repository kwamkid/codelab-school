// app/api/line/webhook-logs/route.ts

import { NextRequest, NextResponse } from 'next/server';

// This will get logs from the webhook endpoint
export async function GET(request: NextRequest) {
  try {
    // Get the base URL
    const baseUrl = request.nextUrl.origin;
    
    // Call the webhook GET endpoint to get logs
    const response = await fetch(`${baseUrl}/api/webhooks/line`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({
      logs: [],
      count: 0
    });
    
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    return NextResponse.json({
      logs: [],
      count: 0,
      error: 'Failed to fetch logs'
    });
  }
}