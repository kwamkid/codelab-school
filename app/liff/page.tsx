'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, CalendarOff, UserPlus, Link as LinkIcon, Loader2, Code2, Binary, Cpu } from 'lucide-react'
import { getGeneralSettings } from '@/lib/services/settings'
import { getParentByLineId } from '@/lib/services/parents'
import { LiffProvider } from '@/components/liff/liff-provider'
import { useLiff } from '@/components/liff/liff-provider'
import Image from 'next/image'

// Loading Animation Component
function TechLoadingAnimation() {
  const [activeIndex, setActiveIndex] = useState(0)
  const icons = [Code2, Binary, Cpu]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % icons.length)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const ActiveIcon = icons[activeIndex]
  
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping animation-delay-200" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ActiveIcon className="h-12 w-12 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-lg font-medium text-gray-700 animate-pulse">กำลังโหลด...</p>
      </div>
    </div>
  )
}

// Component หลักที่แสดงเมนู
function LiffHome() {
  const router = useRouter()
  const { isLoggedIn, profile, isLoading } = useLiff()
  const [settings, setSettings] = useState<any>(null)
  const [hasParent, setHasParent] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)
  const [navigating, setNavigating] = useState(false)
  
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

  const handleNavigation = (path: string) => {
    setNavigating(true)
    setTimeout(() => {
      router.push(path)
    }, 300)
  }

  const menuItems = [
    {
      title: 'Schedule',
      titleTh: 'ตารางเรียน',
      icon: Calendar,
      path: '/liff/schedule',
      description: 'ดูตารางเรียนของนักเรียน',
      color: 'bg-blue-500',
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
    return <TechLoadingAnimation />
  }

  return (
    <>
      {navigating && <TechLoadingAnimation />}
      
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header with Logo */}
        <div className="bg-white shadow-sm">
          <div className="py-4">
            {/* Logo - ตรงกลาง */}
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
            
            {/* Welcome Message - แสดงใต้ logo เฉพาะคนที่ login และลงทะเบียนแล้ว */}
            {isLoggedIn && profile && hasParent && (
              <p className="text-center text-base mt-3 text-gray-700">
                สวัสดีคุณ <span className="font-semibold text-primary">{profile.displayName}</span> 👋
              </p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center p-4">
          {/* แสดงเมนูเฉพาะคนที่ลงทะเบียนแล้ว */}
          {isLoggedIn && hasParent && (
            <div className="grid grid-cols-1 gap-3 max-w-md mx-auto w-full">
              {menuItems.map((item) => {
                const Icon = item.icon
                
                return (
                  <Card
                    key={item.path}
                    className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 active:scale-95"
                    onClick={() => handleNavigation(item.path)}
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

          {/* Registration CTA - แสดงเมื่อ login แล้วแต่ยังไม่ลงทะเบียน */}
          {isLoggedIn && hasParent === false && (
            <div className="max-w-md mx-auto w-full">
              <Card className="border-2 border-primary">
                <CardHeader className="text-center pb-3 pt-4">
                
                  <h2 className="text-xl font-bold">ยินดีต้อนรับ!</h2>
                  <p className="text-base text-gray-600 mt-1">
                    ลงทะเบียนเพื่อเริ่มใช้งานระบบ
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h3 className="font-semibold text-base mb-2">สิ่งที่คุณจะได้รับ:</h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">ดูตารางเรียน</p>
                          <p className="text-sm text-gray-600">
                            ตรวจสอบตารางเรียนได้ทุกที่
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">จัดการข้อมูลนักเรียน</p>
                          <p className="text-sm text-gray-600">
                            เพิ่มข้อมูลบุตรหลานได้หลายคน
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarOff className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">ขอลาและเรียนชดเชย</p>
                          <p className="text-sm text-gray-600">
                            แจ้งลาและดูตารางเรียนชดเชย
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      className="w-full text-base"
                      size="lg"
                      onClick={() => handleNavigation('/liff/register')}
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

          {/* Login CTA - แสดงเมื่อยังไม่ login */}
          {!isLoggedIn && (
            <div className="max-w-md mx-auto w-full">
              <Card>
                <CardHeader className="text-center pb-3 pt-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <img src="/line-icon.svg" alt="LINE" className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold">เริ่มต้นใช้งาน</h2>
                  <p className="text-base text-gray-600 mt-1">
                    เข้าสู่ระบบด้วย LINE
                  </p>
                </CardHeader>
                <CardContent className="pb-4">
                  <Button 
                    className="w-full text-base" 
                    size="lg"
                    onClick={() => handleNavigation('/liff/profile')}
                  >
                    <img src="/line-icon.svg" alt="LINE" className="w-5 h-5 mr-2 invert" />
                    เข้าสู่ระบบด้วย LINE
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center mt-3">
                    ระบบจะขออนุญาตเข้าถึงข้อมูลพื้นฐานจาก LINE
                  </p>
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

      <style jsx>{`
        @keyframes animation-delay-200 {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </>
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