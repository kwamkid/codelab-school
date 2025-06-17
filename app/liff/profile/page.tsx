'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/liff/liff-provider';
import { useLiffParent } from '@/hooks/useLiffParent';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Edit,
  ChevronLeft,
  Loader2,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, calculateAge } from '@/lib/utils';

export default function LiffProfilePage() {
  const router = useRouter();
  const { profile, isLoggedIn, login, logout } = useLiff();
  const { parent, students, loading, isRegistered } = useLiffParent();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    // ถ้ายังไม่ login ให้ login ก่อน
    if (!isLoggedIn) {
      login();
    }
  }, [isLoggedIn, login]);

  // ถ้ายังไม่ลงทะเบียน ให้ไปหน้าลงทะเบียน
  useEffect(() => {
    if (!loading && isLoggedIn && !isRegistered) {
      router.push('/liff/register');
    }
  }, [loading, isLoggedIn, isRegistered, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!isLoggedIn || !parent) {
    return null;
  }

  const activeStudents = students.filter(s => s.isActive);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-red-500 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/liff" className="flex items-center text-white">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>กลับ</span>
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center text-white/80 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="text-sm">ออกจากระบบ</span>
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {profile?.pictureUrl ? (
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-16 h-16 rounded-full border-2 border-white"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{parent.displayName}</h1>
            <p className="text-sm text-white/80">
              สมาชิกตั้งแต่ {formatDate(parent.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">ข้อมูลติดต่อ</h2>
            <Link href="/liff/profile/edit">
              <Button size="sm" variant="ghost">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">เบอร์โทร</p>
                <p className="font-medium">{parent.phone}</p>
                {parent.emergencyPhone && (
                  <p className="text-sm text-gray-600 mt-1">
                    ฉุกเฉิน: {parent.emergencyPhone}
                  </p>
                )}
              </div>
            </div>
            
            {parent.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">อีเมล</p>
                  <p className="font-medium break-all">{parent.email}</p>
                </div>
              </div>
            )}
            
            {parent.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">ที่อยู่</p>
                  <p className="text-sm">
                    {parent.address.houseNumber} {parent.address.street && `ถ.${parent.address.street}`}
                  </p>
                  <p className="text-sm">
                    แขวง{parent.address.subDistrict} เขต{parent.address.district}
                  </p>
                  <p className="text-sm">
                    {parent.address.province} {parent.address.postalCode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Students */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">
              ข้อมูลนักเรียน ({activeStudents.length})
            </h2>
            <Link href="/liff/profile/students/new">
              <Button size="sm" className="bg-red-500 hover:bg-red-600">
                <Plus className="h-4 w-4 mr-1" />
                เพิ่ม
              </Button>
            </Link>
          </div>

          {activeStudents.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">ยังไม่มีข้อมูลนักเรียน</p>
              <Link href="/liff/profile/students/new">
                <Button className="bg-red-500 hover:bg-red-600">
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มนักเรียน
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/liff/profile/students/${student.id}`}
                  className="block bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {student.profileImage ? (
                        <img
                          src={student.profileImage}
                          alt={student.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">
                          {student.nickname || student.name}
                        </h3>
                        <p className="text-sm text-gray-600">{student.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {calculateAge(student.birthdate)} ปี
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                            {student.gender === 'M' ? 'ชาย' : 'หญิง'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
                  </div>
                  
                  {student.allergies && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      ⚠️ แพ้: {student.allergies}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">ออกจากระบบ?</h3>
            <p className="text-gray-600 mb-4">
              คุณต้องการออกจากระบบใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLogoutConfirm(false)}
              >
                ยกเลิก
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                }}
              >
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}