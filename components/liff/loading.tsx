import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export function LiffLoading() {
  const [seconds, setSeconds] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">กำลังโหลด...</p>
      <p className="text-xs text-gray-400 mt-2">({seconds} วินาที)</p>
      
      {seconds > 5 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-red-500">โหลดนานกว่าปกติ</p>
          <p className="text-xs text-gray-500 mt-1">กรุณาตรวจสอบ Console log</p>
        </div>
      )}
      
      {seconds > 10 && (
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-md text-sm"
        >
          โหลดใหม่
        </button>
      )}
    </div>
  )
}