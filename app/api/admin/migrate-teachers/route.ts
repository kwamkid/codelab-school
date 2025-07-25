import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';

// Helper function to generate random password
function generatePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

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
    
    // Check if user is super admin
    const adminUser = await adminDb
      .collection('adminUsers')
      .doc(decodedToken.uid)
      .get();
    
    if (!adminUser.exists || adminUser.data()?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get request body
    const { teacherIds } = await request.json();
    
    if (!teacherIds || !Array.isArray(teacherIds)) {
      return NextResponse.json({ error: 'Invalid teacher IDs' }, { status: 400 });
    }

    // Results tracking
    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
      skipped: [] as string[]
    };

    // Process each teacher
    for (const teacherId of teacherIds) {
      try {
        // Get teacher data
        const teacherDoc = await adminDb
          .collection('teachers')
          .doc(teacherId)
          .get();
        
        if (!teacherDoc.exists) {
          results.failed.push({ id: teacherId, error: 'Teacher not found' });
          continue;
        }

        const teacherData = teacherDoc.data();
        
        // Check if auth user already exists
        try {
          await adminAuth.getUser(teacherId);
          // User already exists, skip
          results.skipped.push(teacherId);
          continue;
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            throw error;
          }
          // User not found, continue to create
        }

        // Generate temporary password
        const tempPassword = generatePassword();

        // Create Firebase Auth user
        const userRecord = await adminAuth.createUser({
          uid: teacherId, // Use same ID as teacher document
          email: teacherData.email,
          emailVerified: false,
          password: tempPassword,
          displayName: teacherData.name,
          disabled: !teacherData.isActive
        });

        // Update adminUsers document with auth info
        await adminDb
          .collection('adminUsers')
          .doc(teacherId)
          .update({
            authCreated: true,
            authCreatedAt: new Date(),
            needsPasswordReset: true,
            updatedAt: new Date()
          });

        // Send password reset email
        const resetLink = await adminAuth.generatePasswordResetLink(
          teacherData.email,
          {
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
          }
        );

        // Log success (in production, you might want to send email here)
        console.log(`Teacher ${teacherData.name} (${teacherData.email}): Reset link generated`);
        
        results.success.push(teacherId);

      } catch (error: any) {
        console.error(`Error processing teacher ${teacherId}:`, error);
        results.failed.push({ 
          id: teacherId, 
          error: error.message || 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      results: {
        total: teacherIds.length,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        details: results
      }
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}