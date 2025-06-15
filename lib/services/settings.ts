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
  logoUrl?: string; // เปลี่ยนจาก logo เป็น logoUrl
  
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

// Upload logo
export async function uploadLogo(file: File): Promise<string> {
  try {
    // Validate file type (including SVG)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      throw new Error('ไฟล์ต้องเป็น JPG, PNG หรือ SVG เท่านั้น');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('ขนาดไฟล์ต้องไม่เกิน 5MB');
    }
    
    // Upload to Firebase Storage
    const timestamp = Date.now();
    const fileName = `settings/logo_${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
}

// Delete old logo
export async function deleteOldLogo(logoUrl: string): Promise<void> {
  try {
    if (!logoUrl || !logoUrl.includes('firebase')) return;
    
    // Extract file path from URL
    const urlParts = logoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0];
    const filePath = `settings/${decodeURIComponent(fileName)}`;
    
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting old logo:', error);
    // Don't throw error as this is cleanup
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
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}