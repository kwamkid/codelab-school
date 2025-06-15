// app/api/line/send-message/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getLineSettings } from '@/lib/services/line-settings';

export async function POST(request: NextRequest) {
  console.log('=== Send Message API called ===');
  
  try {
    const body = await request.json();
    const { userId, message } = body;
    
    console.log('Request body:', { userId, messageLength: message?.length });
    
    if (!userId || !message) {
      return NextResponse.json({
        success: false,
        message: 'กรุณาระบุ User ID และข้อความ'
      });
    }
    
    // Get LINE settings
    const settings = await getLineSettings();
    console.log('Has Access Token:', !!settings.messagingChannelAccessToken);
    
    if (!settings.messagingChannelAccessToken) {
      return NextResponse.json({
        success: false,
        message: 'ยังไม่ได้ตั้งค่า Channel Access Token'
      });
    }
    
    // Send message using LINE Messaging API
    console.log('Sending message to LINE API...');
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.messagingChannelAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: userId,
        messages: [{
          type: 'text',
          text: message
        }]
      })
    });
    
    console.log('LINE API Response status:', response.status);
    
    if (response.ok) {
      console.log('Message sent successfully');
      return NextResponse.json({
        success: true,
        message: 'ส่งข้อความสำเร็จ'
      });
    }
    
    // Handle errors
    const errorText = await response.text();
    console.error('LINE API error response:', errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    
    let errorMessage = 'ไม่สามารถส่งข้อความได้';
    
    if (response.status === 400) {
      if (errorData.message?.includes('Invalid user')) {
        errorMessage = 'User ID ไม่ถูกต้อง หรือผู้ใช้ยังไม่ได้เพิ่มเพื่อน';
      } else if (errorData.message?.includes('The property')) {
        errorMessage = 'รูปแบบข้อความไม่ถูกต้อง';
      } else {
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${errorData.message || 'Unknown error'}`;
      }
    } else if (response.status === 401) {
      errorMessage = 'Channel Access Token ไม่ถูกต้อง';
    } else if (response.status === 429) {
      errorMessage = 'ส่งข้อความเกินโควต้าที่กำหนด';
    } else {
      errorMessage = `Error ${response.status}: ${errorData.message || 'Unknown error'}`;
    }
    
    console.error('Error message:', errorMessage);
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      details: errorData
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งข้อความ',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}