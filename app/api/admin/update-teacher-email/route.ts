import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Verify request is from admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check if user is admin (super_admin or branch_admin)
    const adminUser = await adminDb
      .collection('adminUsers')
      .doc(decodedToken.uid)
      .get();
    
    if (!adminUser.exists || !['super_admin', 'branch_admin'].includes(adminUser.data()?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get request body
    const { teacherId, newEmail } = await request.json();
    
    if (!teacherId || !newEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    try {
      // Check if new email is already used by another user
      try {
        const existingUser = await adminAuth.getUserByEmail(newEmail);
        if (existingUser && existingUser.uid !== teacherId) {
          return NextResponse.json({ 
            error: 'Email already exists', 
            message: 'อีเมลนี้ถูกใช้งานแล้ว' 
          }, { status: 400 });
        }
      } catch (error: any) {
        // If user not found, that's good - email is available
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Update Firebase Auth email
      await adminAuth.updateUser(teacherId, {
        email: newEmail,
        emailVerified: false // Reset email verification
      });

      // Also update display name if it was the email
      const currentUser = await adminAuth.getUser(teacherId);
      if (currentUser.displayName === currentUser.email || !currentUser.displayName) {
        await adminAuth.updateUser(teacherId, {
          displayName: newEmail
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Email updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating Firebase Auth:', error);
      
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist in Firebase Auth yet
        return NextResponse.json({
          success: false,
          needsAuthCreation: true,
          message: 'ครูยังไม่มี Firebase Auth account'
        });
      }
      
      return NextResponse.json({ 
        error: error.code || 'Failed to update email',
        message: error.message 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Update email error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}