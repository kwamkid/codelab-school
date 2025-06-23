// app/api/test/line-direct/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentId } = body;

    if (!parentId) {
      return NextResponse.json(
        { success: false, message: 'Parent ID is required' },
        { status: 400 }
      );
    }

    console.log('=== Direct LINE Test ===');
    console.log('Parent ID:', parentId);

    // Step 1: Get parent directly
    const parentRef = doc(db, 'parents', parentId);
    const parentDoc = await getDoc(parentRef);
    
    if (!parentDoc.exists()) {
      return NextResponse.json({
        success: false,
        message: 'Parent not found'
      });
    }

    const parentData = parentDoc.data();
    console.log('Parent data:', {
      displayName: parentData.displayName,
      hasLineUserId: !!parentData.lineUserId,
      phone: parentData.phone
    });

    if (!parentData.lineUserId) {
      return NextResponse.json({
        success: false,
        message: 'Parent does not have LINE ID',
        parentName: parentData.displayName
      });
    }

    // Step 2: Get LINE settings
    const settingsRef = doc(db, 'settings', 'line');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      return NextResponse.json({
        success: false,
        message: 'LINE settings not found'
      });
    }

    const settings = settingsDoc.data();
    console.log('LINE settings:', {
      hasToken: !!settings.messagingChannelAccessToken,
      tokenLength: settings.messagingChannelAccessToken?.length || 0
    });

    if (!settings.messagingChannelAccessToken) {
      return NextResponse.json({
        success: false,
        message: 'LINE Channel Access Token not configured'
      });
    }

    // Step 3: Send simple test message
    const testMessage = `ทดสอบการส่งข้อความ\n\nสวัสดีคุณ ${parentData.displayName}\nนี่คือข้อความทดสอบจากระบบ\n\nเวลา: ${new Date().toLocaleString('th-TH')}`;

    console.log('Sending message to LINE User:', parentData.lineUserId);
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.messagingChannelAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: parentData.lineUserId,
        messages: [{
          type: 'text',
          text: testMessage
        }]
      })
    });

    console.log('LINE API Response status:', response.status);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully!',
        parentName: parentData.displayName
      });
    }

    // Handle errors
    const errorText = await response.text();
    console.error('LINE API error:', errorText);
    
    let errorMessage = 'Failed to send message';
    if (response.status === 400) {
      errorMessage = 'Invalid request or user has not added bot as friend';
    } else if (response.status === 401) {
      errorMessage = 'Invalid Channel Access Token';
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      status: response.status,
      error: errorText
    });

  } catch (error) {
    console.error('Direct LINE test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}