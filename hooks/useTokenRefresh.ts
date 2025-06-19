import { useEffect, useRef } from 'react'
import { useLiff } from '@/components/liff/liff-provider'
import { refreshTokenIfNeeded } from '@/lib/line/liff-client'

export function useTokenRefresh(intervalMinutes: number = 10) {
  const { liff, isLoggedIn } = useLiff()
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!liff || !isLoggedIn) return

    const checkToken = async () => {
      console.log('[useTokenRefresh] Checking token...')
      try {
        const isValid = await refreshTokenIfNeeded()
        if (!isValid) {
          console.log('[useTokenRefresh] Token invalid, refresh triggered')
        }
      } catch (error) {
        console.error('[useTokenRefresh] Error:', error)
      }
    }

    // Initial check
    checkToken()

    // Set up interval
    intervalRef.current = setInterval(checkToken, intervalMinutes * 60 * 1000)

    // Check on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useTokenRefresh] App became visible, checking token...')
        checkToken()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check on focus
    const handleFocus = () => {
      console.log('[useTokenRefresh] Window focused, checking token...')
      checkToken()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [liff, isLoggedIn, intervalMinutes])
}