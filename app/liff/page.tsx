'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/liff/liff-provider';
import { 
  Calendar, 
  User, 
  CalendarOff, 
  TestTube,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function LiffHomePage() {
  const router = useRouter();
  const { isLoggedIn, isReady, profile } = useLiff();

  useEffect(() => {
    // ถ้ายังไม่ login และพร้อมแล้ว ให้ redirect ไป profile
    if (isReady && !isLoggedIn) {
      router.push('/liff/profile');
    }
  }, [isReady, isLoggedIn, router]);

  if (!isReady || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  const menuItems = [
    {
      title: 'ข้อมูลส่วนตัว',
      description: 'จัดการข้อมูลผู้ปกครองและนักเรียน',
      icon: User,
      href: '/liff/profile',
      color: 'bg-blue-500',
    },
    {
      title: 'ตารางเรียน',
      description: 'ดูตารางเรียนของลูกทุกคน',
      icon: Calendar,
      href: '/liff/schedule',
      color: 'bg-green-500',
    },
    {
      title: 'ขอลาเรียน',
      description: 'ขอลาและดูประวัติการลา',
      icon: CalendarOff,
      href: '/liff/leave',
      color: 'bg-purple-500',
    },
    {
      title: 'ทดลองเรียน',
      description: 'จองคลาสทดลองเรียน',
      icon: TestTube,
      href: '/liff/trial',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-3">
          <img
            src="/logo.svg"
            alt="CodeLab"
            className="w-12 h-12"
          />
        </div>
        <h1 className="text-xl font-bold text-gray-900">CodeLab School</h1>
        <p className="text-sm text-gray-600 mt-1">
          สวัสดีคุณ{profile?.displayName}
        </p>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
            >
              <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600 line-clamp-2">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">ข้อมูลด่วน</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">คลาสถัดไป</span>
            <span className="text-sm font-medium">Python - พรุ่งนี้ 13:00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">โควต้าลาคงเหลือ</span>
            <span className="text-sm font-medium">3/4 ครั้ง</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          ต้องการความช่วยเหลือ?
        </p>
        <a
          href="tel:021234567"
          className="text-sm text-red-500 font-medium"
        >
          โทร 02-123-4567
        </a>
      </div>
    </div>
  );
}