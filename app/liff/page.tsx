'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Users, 
  CalendarOff, 
  UserPlus, 
  Link as LinkIcon, 
  Loader2,
  MessageCircle,
  School
} from 'lucide-react'
import { getGeneralSettings } from '@/lib/services/settings'
import { getParentByLineId } from '@/lib/services/parents'
import { LiffProvider } from '@/components/liff/liff-provider'
import { useLiff } from '@/components/liff/liff-provider'
import Image from 'next/image'
import { toast } from 'sonner'

// Component หลักที่แสดงเมนู
function LiffHome() {
  const router = useRouter()
  const { isLoggedIn, profile, isLoading, liff } = useLiff()
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

  // Check parent status when logged in
  useEffect(() => {
    const checkParentStatus = async () => {
      if (!isLoading && isLoggedIn && profile?.userId) {
        try {
          const parent = await getParentByLineId(profile.userId)
          setHasParent(!!parent)
        } catch (error) {
          console.error('Error checking parent:', error)
          setHasParent(false)
        }
      }
      setChecking(false)
    }
    
    checkParentStatus()
  }, [isLoading, isLoggedIn, profile])

  // Handle sending message when connect existing account is clicked
  const handleConnectExistingAccount = async () => {
    if (liff) {
      try {
        // Send message to chat
        if (liff.isInClient()) {
          await liff.sendMessages([{
            type: 'text',
            text: 'ขอเชื่อมต่อบัญชีที่ลงทะเบียนไว้แล้ว'
          }])
          
          // Close LIFF window
          setTimeout(() => {
            liff.closeWindow()
          }, 500)
        } else {
          // If not in LINE app, just show message
          toast.success('กรุณาติดต่อ Admin ผ่าน LINE เพื่อขอลิงก์เชื่อมต่อบัญชี')
        }
      } catch (error) {
        console.error('Error sending message:', error)
        toast.error('ไม่สามารถส่งข้อความได้')
      }
    }
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
      title: 'Profile',
      titleTh: 'ข้อมูลส่วนตัว',
      icon: Users,
      path: '/liff/profile',
      description: 'จัดการข้อมูลผู้ปกครองและนักเรียน',
      color: 'bg-green-500',
      requireAuth: true
    },
    {
      title: 'Leave',
      titleTh: 'ลาเรียน',
      icon: CalendarOff,
      path: '/liff/makeup',
      description: 'ขอลาเรียนและดูตารางเรียนชดเชย',
      color: 'bg-orange-500',
      requireAuth: true
    }
  ]

  // Loading state
  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header with Logo */}
      <div className="bg-white shadow-sm">
        <div className="py-6">
          <div className="flex justify-center mb-2">
            {settings?.logoUrl ? (
              <div className="relative w-[200px] h-[60px]">
                <Image 
                  src={settings.logoUrl} 
                  alt="Logo" 
                  width={200}
                  height={60}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="relative w-[200px] h-[60px]">
                <Image 
                  src="/logo.svg" 
                  alt="Logo" 
                  width={200}
                  height={60}
                  className="object-contain"
                  priority
                />
              </div>
            )}
          </div>
          
          <p className="text-center text-gray-600 text-sm px-4">
            ระบบจัดการโรงเรียนสอนเขียนโปรแกรม
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center p-4">
        {/* Not logged in state */}
        {!isLoggedIn ? (
          <div className="max-w-md mx-auto w-full space-y-4">
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <UserPlus className="h-10 w-10 text-primary" />
                </div>
                
                <h2 className="text-xl font-bold">ยินดีต้อนรับ</h2>
                <p className="text-gray-600">
                  กรุณาเข้าสู่ระบบเพื่อใช้งานระบบ
                </p>
                
                <Button 
                  className="w-full text-base bg-green-600 hover:bg-green-700" 
                  size="lg"
                  onClick={() => liff?.login()}
                >
                  เข้าสู่ระบบด้วย LINE
                </Button>
              </CardContent>
            </Card>
          </div>
        
        // Logged in but not registered
        ) : hasParent === false ? (
          <div className="max-w-md mx-auto w-full space-y-4">
            <Card className="border-2 border-orange-200">
              <CardContent className="pt-6 space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <UserPlus className="h-10 w-10 text-orange-600" />
                  </div>
                  
                  <h2 className="text-2xl font-bold">ยังไม่ได้ลงทะเบียน</h2>
                  <p className="text-gray-600">
                    กรุณาลงทะเบียนเพื่อเริ่มใช้งานระบบ
                  </p>
                </div>
                
                {/* Register button */}
                <Button 
                  className="w-full text-base bg-primary hover:bg-primary/90" 
                  size="lg"
                  onClick={() => router.push('/liff/register')}
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  ลงทะเบียนใหม่
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">หรือ</span>
                  </div>
                </div>
                
                {/* Connect existing account */}
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <LinkIcon className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        เคยลงทะเบียนที่เคาน์เตอร์แล้ว?
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        คลิกปุ่มด้านล่างเพื่อขอลิงก์เชื่อมต่อบัญชี
                      </p>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-gray-400 text-gray-700 hover:bg-gray-50"
                        onClick={handleConnectExistingAccount}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        ติดต่อ Admin เพื่อเชื่อมต่อบัญชี
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        
        // Registered user - show menu
        ) : (
          <div className="max-w-md mx-auto w-full space-y-4">
            {/* Welcome message */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                สวัสดีคุณ {profile?.displayName} 👋
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                เลือกเมนูที่ต้องการใช้งาน
              </p>
            </div>
            
            {/* Menu items */}
            <div className="space-y-3">
              {menuItems.map((item) => {
                const Icon = item.icon
                
                return (
                  <Card
                    key={item.path}
                    className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => router.push(item.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${item.color} text-white shadow-md`}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800">
                            {item.titleTh}
                          </h3>
                          <p className="text-sm text-gray-600 mt-0.5">
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
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-gray-500">
        <p>&copy; 2024 CodeLab School. All rights reserved.</p>
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