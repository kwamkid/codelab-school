// This file is for client-side LIFF operations only
import type { Liff } from '@line/liff'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client' // แก้ path ให้ตรงกับที่มีจริง

let liffInstance: Liff | null = null
let liffId: string | null = null

// Get LIFF ID from Firestore
async function getLiffId(): Promise<string> {
  if (liffId) return liffId
  
  try {
    // ถ้ามี env variable ให้ใช้ก่อน (สำหรับ development)
    const envLiffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (envLiffId) {
      console.log('Using LIFF ID from environment variable')
      liffId = envLiffId
      return liffId
    }

    // ดึงจาก Firestore - path ที่ถูกต้องคือ settings/line
    const settingsDoc = await getDoc(doc(db, 'settings', 'line'))
    if (settingsDoc.exists()) {
      const data = settingsDoc.data()
      liffId = data.liffId
      
      if (!liffId) {
        throw new Error('LIFF ID is not configured in settings')
      }
      
      console.log('Using LIFF ID from Firestore:', liffId)
      return liffId
    }
    throw new Error('LINE settings not found in Firestore')
  } catch (error) {
    console.error('Failed to get LIFF ID:', error)
    
    // ใช้ LIFF ID ที่คุณมี (temporary fix)
    const hardcodedLiffId = '2007575627-GmKBZJdo'
    console.warn(`Using hardcoded LIFF ID: ${hardcodedLiffId}`)
    return hardcodedLiffId
  }
}

export async function initializeLiff(): Promise<Liff> {
  console.log('[LIFF] Starting initialization...')
  
  // Check if already initialized
  if (liffInstance && (window as any).liff) {
    console.log('[LIFF] Already initialized, returning instance')
    return liffInstance
  }

  // Check if running in browser
  if (typeof window === 'undefined') {
    throw new Error('LIFF can only be initialized in browser')
  }

  try {
    console.log('[LIFF] Getting LIFF ID...')
    // Get LIFF ID from Firestore
    const liffIdFromDb = await getLiffId()
    console.log('[LIFF] Got LIFF ID:', liffIdFromDb)
    
    console.log('[LIFF] Importing LIFF SDK...')
    // Dynamically import LIFF SDK
    const liff = (await import('@line/liff')).default
    console.log('[LIFF] LIFF SDK imported successfully')
    
    console.log('[LIFF] Initializing with ID:', liffIdFromDb)
    // Initialize LIFF with ID from Firestore
    await liff.init({ 
      liffId: liffIdFromDb,
      withLoginOnExternalBrowser: true // Allow login on external browsers
    })
    console.log('[LIFF] Init completed')

    // Check if init was successful
    const inClient = liff.isInClient()
    const loggedIn = liff.isLoggedIn()
    console.log('[LIFF] Status - In LINE app:', inClient, 'Logged in:', loggedIn)
    
    if (!inClient && !loggedIn) {
      console.warn('[LIFF] Not in LINE app and not logged in')
    }

    liffInstance = liff
    return liff
  } catch (error) {
    console.error('[LIFF] Initialization failed:', error)
    throw error
  }
}

export function getLiffInstance(): Liff | null {
  return liffInstance
}

// Helper functions for common LIFF operations
export async function getLiffProfile() {
  const liff = await initializeLiff()
  
  if (!liff.isLoggedIn()) {
    throw new Error('User is not logged in')
  }
  
  return await liff.getProfile()
}

export async function sendLiffMessage(messages: any[]) {
  const liff = await initializeLiff()
  
  if (!liff.isInClient()) {
    throw new Error('This feature is only available in LINE app')
  }
  
  return await liff.sendMessages(messages)
}

export async function closeLiffWindow() {
  const liff = await initializeLiff()
  
  if (liff.isInClient()) {
    liff.closeWindow()
  } else {
    window.close()
  }
}

export function isLiffInClient(): boolean {
  if (!liffInstance) return false
  return liffInstance.isInClient()
}

export function isLiffLoggedIn(): boolean {
  if (!liffInstance) return false
  return liffInstance.isLoggedIn()
}

// Clear cache when settings change
export function clearLiffCache() {
  liffId = null
  liffInstance = null
}