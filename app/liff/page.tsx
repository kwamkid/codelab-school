'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, CalendarOff, UserPlus, Link as LinkIcon, Loader2 } from 'lucide-react'
import { getGeneralSettings } from '@/lib/services/settings'
import { getParentByLineId } from '@/lib/services/parents'
import { LiffProvider } from '@/components/liff/liff-provider'
import { useLiff } from '@/components/liff/liff-provider'
import Image from 'next/image'

// Component หลักที่แสดงเมนู
function LiffHome() {
  const router = useRouter()
  const { isLoggedIn, profile, isLoading } = useLiff()
  const [settings, setSettings] = useState<any>(null)
  const [hasParent, setHasParent] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)
  
  // Clean OAuth parameters from URL
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('code') || url.searchParams.has('state')) {
      console.log('[LiffHome] Cleaning OAuth parameters...')
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      url.searchParams.delete('liffClientId')
      url.searchParams.delete('liffRedirectUri')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [])
  
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

  // Check parent status
  useEffect(() => {
    if (!isLoading && isLoggedIn && profile?.userId) {
      checkParentStatus()
    } else if (!isLoading) {
      setChecking(false)
    }
  }, [isLoading, isLoggedIn, profile])

  const checkParentStatus = async () => {
    try {
      const parent = await getParentByLineId(profile!.userId)
      setHasParent(!!parent)
    } catch (error) {
      console.error('Error checking parent:', error)
      setHasParent(false)
    } finally {
      setChecking(false)
    }
  }

  const menuItems = [
    {
      title: 'Schedule',
      titleTh: 'ตารางเรียน',
      icon: Calendar,
      path: '/liff/schedule',
      description: 'ดูตารางเรียนของนักเรียน',
      color: 'bg-red-500',
      requireAuth: true
    },
    {
      title: 'Parent & Students',
      titleTh: 'ผู้ปกครองและนักเรียน',
      icon: Users,
      path: '/liff/profile',
      description: 'จัดการข้อมูลส่วนตัว',
      color: 'bg-green-500',
      requireAuth: true
    },
    {
      title: 'Leave & Makeup',
      titleTh: 'ลาเรียนและเรียนชดเชย',
      icon: CalendarOff,
      path: '/liff/makeup',
      description: 'ขอลาเรียนและดูตารางเรียนชดเชย',
      color: 'bg-orange-500',
      requireAuth: true
    }
  ]

  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with Logo */}
      <div className="bg-white shadow-sm">
        <div className="py-4">
          <div className="flex justify-center">
            {settings?.logoUrl ? (
              <div className="relative w-[180px] h-[54px]">
                <Image 
                  src={settings.logoUrl} 
                  alt="Logo" 
                  width={180}
                  height={54}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="relative h-[54px]" style={{ width: '180px' }}>
                <Image 
                  src="/logo.svg" 
                  alt="Logo" 
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>
          
          {/* Welcome Message */}
          {isLoggedIn && profile && hasParent && (
            <p className="text-center text-base mt-3 text-gray-700">
              สวัสดีคุณ <span className="font-semibold text-primary">{profile.displayName}</span> 👋
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center p-4">
        {/* Show menu for registered users */}
        {isLoggedIn && hasParent && (
          <div className="grid grid-cols-1 gap-3 max-w-md mx-auto w-full">
            {menuItems.map((item) => {
              const Icon = item.icon
              
              return (
                <Card
                  key={item.path}
                  className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 active:scale-95"
                  onClick={() => router.push(item.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${item.color} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base text-gray-800">
                          {item.titleTh}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Registration CTA */}
        {isLoggedIn && hasParent === false && (
          <div className="max-w-md mx-auto w-full">
            <Card className="border-2 border-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold">ยินดีต้อนรับ!</h2>
                  <p className="text-base text-gray-600 mt-1">
                    ลงทะเบียนเพื่อเริ่มใช้งานระบบ
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full text-base"
                    size="lg"
                    onClick={() => router.push('/liff/register')}
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    ลงทะเบียนออนไลน์
                  </Button>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">ลงทะเบียนที่โรงเรียนแล้ว?</p>
                        <p className="text-blue-700">
                          ติดต่อ Admin เพื่อขอลิงก์
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Login CTA */}
        {!isLoggedIn && (
          <div className="max-w-md mx-auto w-full">
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold">เริ่มต้นใช้งาน</h2>
                  <p className="text-base text-gray-600">
                    เข้าสู่ระบบด้วย LINE
                  </p>
                  <Button 
                    className="w-full text-base" 
                    size="lg"
                    onClick={() => router.push('/liff/profile')}
                  >
                    เข้าสู่ระบบด้วย LINE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 text-center text-xs text-gray-500">
        <p>&copy; 2024 All rights reserved.</p>
      </div>
    </div>
  )
}

// Export with Provider
export default function LiffPage() {
  return (
    <LiffProvider requireLogin={false}>
      <LiffHome />
    </LiffProvider>
  )
}