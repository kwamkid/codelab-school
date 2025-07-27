// lib/services/settings.ts

import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

// Types
export interface GeneralSettings {
  // ข้อมูลโรงเรียน
  schoolName: string;
  schoolNameEn?: string;
  logoUrl?: string; // URL ของ logo (external URL)
  
  // ที่อยู่
  address: {
    houseNumber: string;
    street?: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
    country: string;
  };
  
  // ข้อมูลติดต่อ
  contactPhone: string;
  contactEmail: string;
  lineOfficialId?: string;
  lineOfficialUrl?: string;
  facebook?: string;
  website?: string;
  
  // Metadata
  updatedAt?: Date;
  updatedBy?: string;
}

const SETTINGS_DOC_ID = 'general';
const SETTINGS_COLLECTION = 'settings';

// Get general settings
export async function getGeneralSettings(): Promise<GeneralSettings | null> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as GeneralSettings;
    }
    
    // Return default settings if not exists
    return getDefaultSettings();
  } catch (error) {
    console.error('Error getting general settings:', error);
    return getDefaultSettings();
  }
}

// Update general settings
export async function updateGeneralSettings(
  settings: Partial<GeneralSettings>,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    }, { merge: true });
    
  } catch (error) {
    console.error('Error updating general settings:', error);
    throw error;
  }
}

// Get default settings
export function getDefaultSettings(): GeneralSettings {
  return {
    schoolName: 'CodeLab School',
    schoolNameEn: 'CodeLab School',
    address: {
      houseNumber: '',
      street: '',
      subDistrict: '',
      district: '',
      province: 'กรุงเทพมหานคร',
      postalCode: '',
      country: 'ประเทศไทย'
    },
    contactPhone: '',
    contactEmail: ''
  };
}

// Validate settings
export function validateSettings(settings: Partial<GeneralSettings>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  
  // Validate school name
  if (settings.schoolName !== undefined) {
    if (!settings.schoolName.trim()) {
      errors.schoolName = 'กรุณาระบุชื่อโรงเรียน';
    }
  }
  
  // Validate contact phone
  if (settings.contactPhone !== undefined) {
    if (!settings.contactPhone.trim()) {
      errors.contactPhone = 'กรุณาระบุเบอร์โทรติดต่อ';
    } else if (!/^[0-9-]+$/.test(settings.contactPhone.replace(/\s/g, ''))) {
      errors.contactPhone = 'เบอร์โทรไม่ถูกต้อง';
    }
  }
  
  // Validate email
  if (settings.contactEmail !== undefined) {
    if (!settings.contactEmail.trim()) {
      errors.contactEmail = 'กรุณาระบุอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
      errors.contactEmail = 'อีเมลไม่ถูกต้อง';
    }
  }
  
  // Validate address
  if (settings.address) {
    if (!settings.address.province) {
      errors.province = 'กรุณาระบุจังหวัด';
    }
    if (!settings.address.district) {
      errors.district = 'กรุณาระบุเขต/อำเภอ';
    }
    if (!settings.address.subDistrict) {
      errors.subDistrict = 'กรุณาระบุแขวง/ตำบล';
    }
  }
  
  // Validate logo URL if provided
  if (settings.logoUrl && settings.logoUrl.trim()) {
    try {
      new URL(settings.logoUrl);
    } catch {
      errors.logoUrl = 'URL ของ logo ไม่ถูกต้อง';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// เพิ่มใน lib/services/settings.ts หลัง GeneralSettings interface

export interface MakeupSettings {
  // การสร้าง Makeup อัตโนมัติ
  autoCreateMakeup: boolean; // สร้างอัตโนมัติเมื่อขาดเรียน
  makeupLimitPerCourse: number; // จำนวนครั้งสูงสุดต่อคอร์ส (0 = ไม่จำกัด)
  
  // กฎการขอ Makeup
  allowMakeupForStatuses: ('absent' | 'sick' | 'leave')[]; // สถานะที่สร้าง makeup ให้
  makeupRequestDeadlineDays: number; // จำนวนวันที่ขอได้หลังขาด
  makeupValidityDays: number; // จำนวนวันที่ต้องมา makeup หลังคอร์สจบ
  
  // การแจ้งเตือน
  sendLineNotification: boolean; // แจ้งเตือนผ่าน LINE
  notifyParentOnAutoCreate: boolean; // แจ้งผู้ปกครองเมื่อสร้างอัตโนมัติ
  
  // Metadata
  updatedAt?: Date;
  updatedBy?: string;
}

// Get makeup settings
export async function getMakeupSettings(): Promise<MakeupSettings> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'makeup');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate()
      } as MakeupSettings;
    }
    
    // Return default settings
    return getDefaultMakeupSettings();
  } catch (error) {
    console.error('Error getting makeup settings:', error);
    return getDefaultMakeupSettings();
  }
}

// Update makeup settings
export async function updateMakeupSettings(
  settings: Partial<MakeupSettings>,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'makeup');
    
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    }, { merge: true });
    
  } catch (error) {
    console.error('Error updating makeup settings:', error);
    throw error;
  }
}

// Get default makeup settings
export function getDefaultMakeupSettings(): MakeupSettings {
  return {
    autoCreateMakeup: true,
    makeupLimitPerCourse: 4, // Default 4 ครั้งต่อคอร์ส
    allowMakeupForStatuses: ['absent', 'sick', 'leave'],
    makeupRequestDeadlineDays: 7,
    makeupValidityDays: 30,
    sendLineNotification: true,
    notifyParentOnAutoCreate: true
  };
}