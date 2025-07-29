'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/liff/liff-provider';
import { useLiffParent } from '@/hooks/useLiffParent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  CreditCard, 
  User, 
  MessageSquare,
  Clock,
  CalendarCheck,
  Sparkles,
  Phone,
  MapPin,
  ChevronRight,
  LogIn,
  Loader2
} from 'lucide-react';
import Image from 'next/image';

export default function LiffHomePage() {
  const router = useRouter();
  const { liff, isLoggedIn, profile, isReady } = useLiff();
  const { parent, students, loading: parentLoading, isRegistered } = useLiffParent();
  const [greeting, setGreeting] = useState('');
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('สวัสดีตอนเช้า');
    else if (hour < 18) setGreeting('สวัสดีตอนบ่าย');
    else setGreeting('สวัสดีตอนเย็น');
  }, []);

  useEffect(() => {
    // Check registration status when ready
    if (isReady && isLoggedIn) {
      if (!parentLoading) {
        setCheckingRegistration(false);
        // ถ้ายังไม่ได้ลงทะเบียน ไปหน้าลงทะเบียน
        if (!isRegistered) {
          router.push('/liff/register');
        }
      }
    } else if (isReady && !isLoggedIn) {
      // ถ้ายังไม่ login ต้อง login ก่อน
      liff?.login();
    }
  }, [isReady, isLoggedIn, parentLoading, isRegistered, router, liff]);

  const menuItems = [
    {
      title: 'ตารางเรียน',
      description: 'ดูตารางเรียนของลูก',
      icon: Calendar,
      href: '/liff/schedule',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      requireLogin: true
    },
    {
      title: 'Events',
      description: 'งานและกิจกรรมของโรงเรียน',
      icon: Sparkles,
      href: '/liff/events',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      requireLogin: false,
      badge: 'NEW'
    },
    {
      title: 'จองทดลองเรียน',
      description: 'จองคอร์สทดลองเรียนฟรี',
      icon: CalendarCheck,
      href: '/liff/trial-booking',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      requireLogin: false
    },
    {
      title: 'ชำระเงิน',
      description: 'ชำระค่าเรียนและดูประวัติ',
      icon: CreditCard,
      href: '/liff/payment',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      requireLogin: true
    },
    {
      title: 'โปรไฟล์',
      description: 'จัดการข้อมูลส่วนตัว',
      icon: User,
      href: '/liff/profile',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      requireLogin: true
    },
    {
      title: 'Makeup Class',
      description: 'ดูตารางเรียนชดเชย',
      icon: Clock,
      href: '/liff/makeup',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      requireLogin: true
    }
  ];

  const quickContacts = [
    {
      title: 'สาขาพระราม 3',
      phone: '02-123-4567',
      address: 'ชั้น 3 อาคาร ABC'
    },
    {
      title: 'สาขาเอกมัย',
      phone: '02-987-6543',
      address: 'ชั้น 2 Gateway เอกมัย'
    }
  ];

  const handleMenuClick = (item: typeof menuItems[0]) => {
    router.push(item.href);
  };

  // Loading state
  if (!isReady || checkingRegistration || parentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-4xl font-bold">CL</span>
          </div>
        </div>
        <Loader2 className="h-12 w-12 animate-spin text-red-500 mb-4" />
        <p className="text-gray-600 text-lg">กำลังตรวจสอบข้อมูล...</p>
      </div>
    );
  }

  // ถ้าผ่านการตรวจสอบแล้ว แสดงหน้า home ปกติ
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">CL</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">CodeLab School</h1>
              <p className="text-red-100 text-sm">โรงเรียนสอนเขียนโปรแกรม</p>
            </div>
          </div>
          {profile?.pictureUrl && (
            <Image
              src={profile.pictureUrl}
              alt={profile.displayName || 'User'}
              width={48}
              height={48}
              className="rounded-full border-2 border-white"
            />
          )}
        </div>
        
        {/* Greeting */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-4">
          <p className="text-xl font-medium mb-1">
            {greeting} 👋
          </p>
          {profile && (
            <p className="text-red-100 text-base">คุณ{profile.displayName}</p>
          )}
        </div>

        {/* Student Summary */}
        {students.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-base text-red-100">นักเรียนในความดูแล</p>
            <div className="flex flex-wrap gap-2">
              {students.map(student => (
                <Badge 
                  key={student.id} 
                  variant="secondary" 
                  className="bg-white/20 text-white border-0 text-sm px-3 py-1"
                >
                  {student.nickname}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu Grid */}
      <div className="p-4 -mt-4">
        <Card className="shadow-lg">
          <div className="grid grid-cols-2 gap-4 p-4">
            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => handleMenuClick(item)}
                className="relative group"
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className={`${item.bgColor} w-14 h-14 rounded-lg flex items-center justify-center mb-3`}>
                      <item.icon className={`h-7 w-7 ${item.color}`} />
                    </div>
                    <h3 className="font-medium text-base mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                    {item.badge && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5">
                        {item.badge}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Announcements */}
      <div className="px-4 pb-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 backdrop-blur p-2 rounded-lg">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg mb-1">ประกาศ</h3>
                <p className="text-base text-blue-100">
                  🎉 เปิดรับสมัครคอร์ส AI for Kids รุ่นใหม่แล้ว! จำนวนจำกัด
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 h-9 text-sm px-4"
                  onClick={() => router.push('/liff/trial-booking')}
                >
                  จองทดลองเรียน
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Contacts */}
      <div className="px-4 pb-6">
        <h2 className="font-medium text-gray-700 text-lg mb-3">ติดต่อเรา</h2>
        <div className="space-y-3">
          {quickContacts.map((contact) => (
            <Card key={contact.title}>
              <CardContent className="p-4">
                <h3 className="font-medium text-base mb-2">{contact.title}</h3>
                <div className="space-y-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 text-base text-blue-600"
                  >
                    <Phone className="h-5 w-5" />
                    {contact.phone}
                  </a>
                  <p className="flex items-center gap-2 text-base text-gray-500">
                    <MapPin className="h-5 w-5" />
                    {contact.address}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <p className="text-center text-sm text-gray-400">
          © 2024 CodeLab School. All rights reserved.
        </p>
      </div>
    </div>
  );
}