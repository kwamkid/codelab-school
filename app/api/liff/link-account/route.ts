// app/api/liff/link-account/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyLinkToken, markTokenAsUsed } from '@/lib/services/link-tokens';
import { updateParent } from '@/lib/services/parents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, phone, lineUserId, lineDisplayName, linePictureUrl } = body;

    if (!token || !phone || !lineUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify token and phone again
    const result = await verifyLinkToken(token, phone);

    if (!result.valid || !result.tokenDoc) {
      return NextResponse.json(
        { error: 'Invalid token or phone number' },
        { status: 400 }
      );
    }

    // Update parent with LINE info
    await updateParent(result.parent.id, {
      lineUserId,
      displayName: lineDisplayName || result.parent.displayName,
      pictureUrl: linePictureUrl
    });

    // Mark token as used
    await markTokenAsUsed(result.tokenDoc.id, lineUserId);

    return NextResponse.json({
      success: true,
      message: 'เชื่อมต่อ LINE สำเร็จ',
      parentId: result.parent.id
    });
  } catch (error) {
    console.error('Error linking account:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}