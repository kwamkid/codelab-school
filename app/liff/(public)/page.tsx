'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/components/liff/liff-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, CalendarOff } from 'lucide-react'
import { getGeneralSettings } from '@/lib/services/settings'
import Image from 'next/image'

export default function LiffPage() {
  const router = useRouter()
  const { isLoggedIn, profile } = useLiff()
  const [settings, setSettings] = useState<any>(null)
  
  // Load settings for logo
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getGeneralSettings()
        setSettings(data)
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  const menuItems = [
    {
      title: 'Schedule',
      titleTh: 'ตารางเรียน',
      icon: Calendar,
      path: '/liff/schedule',
      description: 'ดูตารางเรียนของนักเรียน',
      color: 'bg-blue-500'
    },
    {
      title: 'Parent & Students',
      titleTh: 'ผู้ปกครองและนักเรียน',
      icon: Users,
      path: '/liff/profile',
      description: 'จัดการข้อมูลส่วนตัว',
      color: 'bg-green-500'
    },
    {
      title: 'Leave & Makeup',
      titleTh: 'ลาเรียนและเรียนชดเชย',
      icon: CalendarOff,
      path: '/liff/makeup',
      description: 'ขอลาเรียนและดูตารางเรียนชดเชย',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <div className="bg-white shadow-sm">
        <div className="p-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            {settings?.logoUrl ? (
              <div className="relative w-[200px] h-[60px]">
                <Image 
                  src={settings.logoUrl} 
                  alt={settings.schoolName || 'School Logo'} 
                  width={200}
                  height={60}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="relative h-[60px]" style={{ width: '200px' }}>
                <Image 
                  src="/logo.svg" 
                  alt="CodeLab Logo" 
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            {settings?.schoolName || 'CodeLab School'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">ระบบจัดการเรียนออนไลน์</p>
        </div>
      </div>

      {/* Welcome Message */}
      {isLoggedIn && profile && (
        <div className="p-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-1">
              <p className="text-center text-gray-700">
                สวัสดีคุณ <span className="font-semibold text-primary">{profile.displayName}</span> 👋
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Menu Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.path}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => router.push(item.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${item.color} text-white`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-800">
                        {item.titleTh}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
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
        <div className="p-4 max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600 mb-4">
                กรุณาเข้าสู่ระบบเพื่อใช้งาน
              </p>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => router.push('/liff/profile')}
              >
                เข้าสู่ระบบด้วย LINE
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto p-4 text-center text-xs text-gray-500">
        <p>&copy; 2024 {settings?.schoolName || 'CodeLab School'}. All rights reserved.</p>
      </div>
    </div>
  )
}