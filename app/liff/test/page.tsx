'use client'

import { useState } from 'react'

export default function LiffTestPage() {
  const [status, setStatus] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  const addLog = (message: string) => {
    setStatus(prev => [...prev, `[${new Date().toTimeString().split(' ')[0]}] ${message}`])
  }

  const loadLiffManually = async () => {
    setLoading(true)
    setStatus([])
    
    try {
      addLog('Starting manual LIFF load...')
      
      // Step 1: Check if LIFF already exists
      if ((window as any).liff) {
        addLog('✅ LIFF already loaded!')
        testLiff()
        return
      }
      
      // Step 2: Load LIFF SDK via script tag
      addLog('Loading LIFF SDK script...')
      
      const script = document.createElement('script')
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
      script.async = true
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          addLog('✅ LIFF script loaded')
          resolve(true)
        }
        script.onerror = (error) => {
          addLog('❌ Failed to load LIFF script')
          reject(error)
        }
        document.head.appendChild(script)
      })
      
      // Step 3: Wait a bit for LIFF to be available
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 4: Check if LIFF is now available
      if ((window as any).liff) {
        addLog('✅ LIFF is now available!')
        testLiff()
      } else {
        addLog('❌ LIFF still not available after loading script')
      }
      
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testLiff = async () => {
    try {
      const liff = (window as any).liff
      
      addLog('Testing LIFF...')
      addLog(`LIFF object type: ${typeof liff}`)
      
      // Try to init
      addLog('Attempting LIFF init...')
      
      const liffId = '2007575627-GmKBZJdo'
      await liff.init({ 
        liffId,
        withLoginOnExternalBrowser: true 
      })
      
      addLog('✅ LIFF init successful!')
      addLog(`Is in client: ${liff.isInClient()}`)
      addLog(`Is logged in: ${liff.isLoggedIn()}`)
      addLog(`OS: ${liff.getOS()}`)
      addLog(`Language: ${liff.getLanguage()}`)
      addLog(`Version: ${liff.getVersion()}`)
      
      if (liff.isLoggedIn()) {
        try {
          const profile = await liff.getProfile()
          addLog('✅ Got profile:')
          addLog(`Name: ${profile.displayName}`)
          addLog(`ID: ${profile.userId}`)
        } catch (e: any) {
          addLog(`❌ Profile error: ${e.message}`)
        }
      } else {
        addLog('Not logged in - click Login button to login')
      }
      
    } catch (error: any) {
      addLog(`❌ LIFF test error: ${error.message}`)
      addLog(`Error code: ${error.code}`)
    }
  }

  const loginLiff = () => {
    if ((window as any).liff) {
      addLog('Triggering LIFF login...')
      ;(window as any).liff.login()
    } else {
      addLog('❌ LIFF not loaded yet')
    }
  }

  const clearAndReload = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Manual LIFF Test</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={loadLiffManually}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Load LIFF Manually'}
        </button>
        
        <button
          onClick={loginLiff}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Login with LINE
        </button>
        
        <button
          onClick={clearAndReload}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Clear & Reload
        </button>
      </div>
      
      <div
        style={{
          backgroundColor: '#000',
          color: '#00ff00',
          padding: '15px',
          fontFamily: 'monospace',
          fontSize: '12px',
          borderRadius: '5px',
          height: '400px',
          overflow: 'auto'
        }}
      >
        {status.length === 0 ? (
          <div>Click "Load LIFF Manually" to start...</div>
        ) : (
          status.map((log, index) => (
            <div key={index}>{log}</div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3 style={{ marginBottom: '10px' }}>Instructions:</h3>
        <ol style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li>Click "Load LIFF Manually" to load LIFF SDK</li>
          <li>Wait for LIFF to initialize</li>
          <li>If not logged in, click "Login with LINE"</li>
          <li>If still have issues, click "Clear & Reload" and try again</li>
        </ol>
      </div>
    </div>
  )
}