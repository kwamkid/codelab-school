'use client'

import { useState } from 'react'

export default function LiffDebugPage() {
  const [log, setLog] = useState('')
  const [copied, setCopied] = useState(false)

  const runBasicTest = () => {
    const logs: string[] = []
    
    logs.push('=== LIFF Debug (Simple) ===')
    logs.push(`Time: ${new Date().toISOString()}`)
    logs.push('')
    
    // 1. Basic info
    logs.push('## Basic Info')
    logs.push(`URL: ${window.location.href}`)
    logs.push(`Protocol: ${window.location.protocol}`)
    logs.push(`Host: ${window.location.host}`)
    logs.push(`User Agent: ${navigator.userAgent}`)
    logs.push(`Screen: ${window.innerWidth}x${window.innerHeight}`)
    logs.push(`Platform: ${navigator.platform}`)
    logs.push('')
    
    // 2. Check HTTPS
    logs.push('## HTTPS Check')
    logs.push(`Is HTTPS: ${window.location.protocol === 'https:' ? 'YES ✅' : 'NO ❌'}`)
    logs.push('')
    
    // 3. Device type
    logs.push('## Device Type')
    const ua = navigator.userAgent.toLowerCase()
    logs.push(`Is Mobile: ${/iphone|ipad|ipod|android/.test(ua) ? 'YES' : 'NO'}`)
    logs.push(`Is LINE Browser: ${ua.includes('line') ? 'YES' : 'NO'}`)
    logs.push('')
    
    // 4. Storage
    logs.push('## Storage Check')
    try {
      localStorage.setItem('test', '1')
      localStorage.removeItem('test')
      logs.push('localStorage: OK ✅')
    } catch (e) {
      logs.push('localStorage: FAILED ❌')
    }
    
    try {
      sessionStorage.setItem('test', '1')
      sessionStorage.removeItem('test')
      logs.push('sessionStorage: OK ✅')
    } catch (e) {
      logs.push('sessionStorage: FAILED ❌')
    }
    
    logs.push(`Cookies enabled: ${navigator.cookieEnabled ? 'YES ✅' : 'NO ❌'}`)
    logs.push('')
    
    // 5. Check window.liff
    logs.push('## Window Objects')
    logs.push(`window.liff exists: ${typeof (window as any).liff !== 'undefined' ? 'YES' : 'NO'}`)
    logs.push(`window.Liff exists: ${typeof (window as any).Liff !== 'undefined' ? 'YES' : 'NO'}`)
    logs.push('')
    
    // 6. Try loading LIFF script directly
    logs.push('## LIFF Script Test')
    const scriptTag = document.querySelector('script[src*="liff"]')
    if (scriptTag) {
      logs.push(`Found LIFF script: ${scriptTag.getAttribute('src')}`)
    } else {
      logs.push('No LIFF script tag found')
    }
    logs.push('')
    
    // 7. Network test (simple)
    logs.push('## Network Test')
    fetch('https://api.line.me/v2/health', { 
      method: 'HEAD', 
      mode: 'no-cors' 
    })
      .then(() => {
        logs.push('LINE API reachable: YES ✅')
        updateLog()
      })
      .catch(() => {
        logs.push('LINE API reachable: NO ❌')
        updateLog()
      })
    
    // 8. Get all localStorage keys
    logs.push('## localStorage Keys')
    try {
      const keys = Object.keys(localStorage)
      logs.push(`Total keys: ${keys.length}`)
      keys.forEach(key => {
        if (key.toLowerCase().includes('liff') || key.toLowerCase().includes('line')) {
          logs.push(`- ${key}`)
        }
      })
    } catch (e) {
      logs.push('Cannot read localStorage')
    }
    logs.push('')
    
    // 9. URL params
    logs.push('## URL Parameters')
    const params = new URLSearchParams(window.location.search)
    params.forEach((value, key) => {
      logs.push(`${key}: ${value}`)
    })
    if (params.toString() === '') {
      logs.push('No parameters')
    }
    logs.push('')
    
    logs.push('=== End of Report ===')
    
    const updateLog = () => {
      setLog(logs.join('\n'))
    }
    
    updateLog()
  }

  const copyLog = () => {
    const textarea = document.createElement('textarea')
    textarea.value = log
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    
    try {
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Copy failed, please select and copy manually')
    }
    
    document.body.removeChild(textarea)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>LIFF Debug (Simple)</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runBasicTest}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Run Test
        </button>
        
        {log && (
          <button
            onClick={copyLog}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: copied ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {copied ? 'Copied!' : 'Copy Log'}
          </button>
        )}
      </div>
      
      {log && (
        <div
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '5px',
            padding: '15px',
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '600px',
            overflow: 'auto'
          }}
        >
          {log}
        </div>
      )}
    </div>
  )
}