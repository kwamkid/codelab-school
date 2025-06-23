// app/api/test/line-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLineSettings } from '@/lib/services/line-settings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const settings = await getLineSettings();
    
    return NextResponse.json({
      hasToken: !!settings.messagingChannelAccessToken,
      tokenLength: settings.messagingChannelAccessToken?.length || 0,
      tokenPreview: settings.messagingChannelAccessToken 
        ? `${settings.messagingChannelAccessToken.substring(0, 20)}...`
        : 'not set',
      allSettings: {
        loginChannelId: !!settings.loginChannelId,
        messagingChannelId: !!settings.messagingChannelId,
        messagingChannelSecret: !!settings.messagingChannelSecret,
        messagingChannelAccessToken: !!settings.messagingChannelAccessToken,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}