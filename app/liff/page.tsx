'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/components/liff/liff-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, User, Phone, BookOpen } from 'lucide-react'

export default function LiffPage() {
  const router = useRouter()
  const { isLoggedIn, profile, isLoading } = useLiff()
  
  console.log('[LiffPage] Render state:', { isLoading, isLoggedIn, profile })

  const menuItems = [
    {
      title: 'ตารางเรียน',
      icon: Calendar,
      path: '/liff/schedule',
      description: 'ดูตารางเรียนของนักเรียน',
      color: 'bg-blue-500'
    },
    {
      title: 'จองทดลองเรียน',
      icon: BookOpen,
      path: '/liff/booking',
      description: 'จองคลาสทดลองเรียน',
      color: 'bg-green-500'
    },
    {
      title: 'โปรไฟล์',
      icon: User,
      path: '/liff/profile',
      description: 'จัดการข้อมูลส่วนตัว',
      color: 'bg-orange-500'
    },
    {
      title: 'Makeup Class',
      icon: Users,
      path: '/liff/makeup',
      description: 'ดูตารางเรียนชดเชย',
      color: 'bg-pink-500'
    },
    {
      title: 'ติดต่อเรา',
      icon: Phone,
      path: '/liff/contact',
      description: 'ข้อมูลการติดต่อ',
      color: 'bg-gray-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">CodeLab School</h1>
          <p className="text-sm opacity-90 mt-1">ระบบจัดการเรียนออนไลน์</p>
        </div>
      </div>

      {/* Welcome Message */}
      {isLoggedIn && profile && (
        <div className="p-4">
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <p className="text-center">
                สวัสดีคุณ <span className="font-semibold">{profile.displayName}</span> 👋
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Menu Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.path}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(item.path)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-3 rounded-full ${item.color} text-white`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      {!isLoggedIn && (
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">เริ่มต้นใช้งาน</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => router.push('/liff/profile')}
              >
                เข้าสู่ระบบด้วย LINE
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}