import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // ตรวจสอบว่าเป็น super admin
    const adminDoc = await adminDb
      .collection('adminUsers')
      .doc(decodedToken.uid)
      .get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // รับข้อมูลจาก request
    const { email, password, userData, createdBy } = await request.json();

    // สร้าง user ใน Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: userData.displayName,
    });

    // สร้าง document ใน adminUsers
    await adminDb.collection('adminUsers').doc(userRecord.uid).set({
      ...userData,
      email,
      createdAt: new Date(),
      createdBy,
      updatedAt: new Date(),
      updatedBy: createdBy
    });

    return NextResponse.json({ 
      success: true, 
      userId: userRecord.uid 
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'อีเมลนี้มีผู้ใช้งานแล้ว' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' }, 
      { status: 500 }
    );
  }
}