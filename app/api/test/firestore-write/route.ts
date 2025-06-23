// app/api/test/firestore-write/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Test write
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      random: Math.random()
    };
    
    console.log('Writing test data:', testData);
    
    await setDoc(doc(db, 'settings', 'test'), testData);
    
    // Read back
    const docRef = doc(db, 'settings', 'test');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return NextResponse.json({
        success: true,
        message: 'Write and read successful',
        data: docSnap.data()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Write succeeded but read failed'
      });
    }
  } catch (error) {
    console.error('Firestore test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Firestore error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}