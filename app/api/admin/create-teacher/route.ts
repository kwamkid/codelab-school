import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const requestingUserId = decodedToken.uid;

    // Get body
    const body = await request.json();
    const { email, password, teacherData } = body;

    if (!email || !password || !teacherData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if requesting user is admin
    const adminUserDoc = await adminDb
      .collection('adminUsers')
      .doc(requestingUserId)
      .get();

    if (!adminUserDoc.exists) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const adminUser = adminUserDoc.data();
    if (!['super_admin', 'branch_admin'].includes(adminUser?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if email already exists in Firebase Auth
    try {
      await adminAuth.getUserByEmail(email);
      return NextResponse.json(
        { error: 'Email already exists in authentication system' },
        { status: 400 }
      );
    } catch (error: any) {
      // User doesn't exist, continue
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create Firebase Auth user
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: teacherData.name,
      disabled: false,
    });

    const teacherId = authUser.uid;

    try {
      // Create teacher document
      await adminDb.collection('teachers').doc(teacherId).set({
        ...teacherData,
        email: email.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create adminUser document
      await adminDb.collection('adminUsers').doc(teacherId).set({
        email: email.toLowerCase(),
        displayName: teacherData.name,
        role: 'teacher',
        branchIds: teacherData.availableBranches || [],
        permissions: {
          canManageUsers: false,
          canManageSettings: false,
          canViewReports: false,
          canManageAllBranches: false
        },
        isActive: teacherData.isActive !== false,
        authCreated: true,
        createdAt: new Date(),
        createdBy: requestingUserId,
        updatedAt: new Date(),
        updatedBy: requestingUserId
      });

      return NextResponse.json({
        success: true,
        teacherId,
        message: 'Teacher created successfully'
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Rollback: Delete auth user if database operations failed
      try {
        await adminAuth.deleteUser(teacherId);
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      
      throw dbError;
    }

  } catch (error: any) {
    console.error('Create teacher error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'อีเมลนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }
    
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    
    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create teacher' },
      { status: 500 }
    );
  }
}