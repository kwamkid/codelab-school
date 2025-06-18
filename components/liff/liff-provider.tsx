'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Liff, Profile as LiffProfile } from '@line/liff'
import { initializeLiff } from '@/lib/line/liff-client'
import { LiffLoading } from '@/components/liff/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface LiffContextType {
  liff: Liff | null
  profile: LiffProfile | null
  isLoading: boolean
  error: Error | null
  isLoggedIn: boolean
  isInClient: boolean
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  profile: null,
  isLoading: true,
  error: null,
  isLoggedIn: false,
  isInClient: false,
})

export function useLiff() {
  const context = useContext(LiffContext)
  if (!context) {
    throw new Error('useLiff must be used within LiffProvider')
  }
  return context
}

interface LiffProviderProps {
  children: React.ReactNode
  requireLogin?: boolean
}

export function LiffProvider({ children, requireLogin = true }: LiffProviderProps) {
  const [liff, setLiff] = useState<Liff | null>(null)
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isInClient, setIsInClient] = useState(false)

  // Debug log
  console.log('[LiffProvider] Current state:', { isLoading, isLoggedIn, error, profile })

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[LiffProvider] Starting initialization...')
        setIsLoading(true)
        setError(null)
        
        const liffInstance = await initializeLiff()
        console.log('[LiffProvider] LIFF instance received')
        setLiff(liffInstance)
        setIsInClient(liffInstance.isInClient())
        
        const loggedIn = liffInstance.isLoggedIn()
        console.log('[LiffProvider] Login status:', loggedIn)
        setIsLoggedIn(loggedIn)
        
        if (loggedIn) {
          console.log('[LiffProvider] Getting user profile...')
          const userProfile = await liffInstance.getProfile()
          console.log('[LiffProvider] User profile:', userProfile)
          setProfile(userProfile)
          
          // Check or create parent document
          try {
            const { getParentByLineId, createParent, updateParent } = await import('@/lib/services/parents')
            
            // Check if parent exists
            let parent = await getParentByLineId(userProfile.userId)
            console.log('[LiffProvider] Existing parent:', parent)
            
            if (!parent) {
              // Create new parent
              console.log('[LiffProvider] Creating new parent')
              const parentId = await createParent({
                lineUserId: userProfile.userId,
                displayName: userProfile.displayName,
                pictureUrl: userProfile.pictureUrl,
                phone: '-', // ใส่ค่า default ไปก่อน
              })
              console.log('[LiffProvider] Parent created with ID:', parentId)
            } else {
              // Update last login and profile picture
              console.log('[LiffProvider] Updating parent last login')
              await updateParent(parent.id, {
                displayName: userProfile.displayName,
                pictureUrl: userProfile.pictureUrl,
              })
            }
          } catch (error) {
            console.error('[LiffProvider] Error managing parent:', error)
          }
        } else if (requireLogin) {
          console.log('[LiffProvider] Not logged in, redirecting to login...')
          // Redirect to login if required
          liffInstance.login()
          return
        }
        
        console.log('[LiffProvider] Initialization complete')
      } catch (err) {
        console.error('[LiffProvider] Initialization error:', err)
        setError(err instanceof Error ? err : new Error('Failed to initialize LIFF'))
      } finally {
        console.log('[LiffProvider] Setting isLoading to false')
        setIsLoading(false)
      }
    }

    init()
  }, [requireLogin])

  if (isLoading) {
    console.log('[LiffProvider] Rendering loading state')
    return <LiffLoading />
  }

  if (error) {
    console.log('[LiffProvider] Rendering error state:', error)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2>
              <p className="text-sm text-muted-foreground">
                {error.message}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()}>
                  ลองใหม่
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  ย้อนกลับ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('[LiffProvider] Rendering children, isLoading:', isLoading)
  return (
    <LiffContext.Provider 
      value={{ 
        liff, 
        profile, 
        isLoading, 
        error, 
        isLoggedIn,
        isInClient 
      }}
    >
      {children}
    </LiffContext.Provider>
  )
}