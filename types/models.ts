// User Types
export interface Parent {
  id: string;
  lineUserId?: string;
  displayName: string;
  pictureUrl?: string;
  phone: string;
  emergencyPhone?: string;
  email?: string;
  address?: {
    houseNumber: string;
    street?: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  preferredBranchId?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

// Admin User - สำหรับ Authentication และ Permissions
export interface AdminUser {
  id: string; // uid จาก Firebase Auth
  email: string;
  displayName: string;
  role: 'super_admin' | 'branch_admin' | 'teacher';
  branchIds: string[]; // สาขาที่ดูแลได้ (empty array = ทุกสาขา)
  permissions?: {
    canManageUsers?: boolean;
    canManageSettings?: boolean;
    canViewReports?: boolean;
    canManageAllBranches?: boolean;
  };
  teacherId?: string; // เพิ่ม: reference ไปยัง teachers collection (สำหรับ role='teacher')
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface Student {
  id: string;
  parentId: string;
  name: string;
  nickname: string;
  birthdate: Date;
  gender: 'M' | 'F';
  schoolName?: string;
  gradeLevel?: string;
  profileImage?: string;
  allergies?: string;
  specialNeeds?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  isActive: boolean;
}

// Branch & Location Types
export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  location?: {
    lat: number;
    lng: number;
  };
  openTime: string;
  closeTime: string;
  openDays: number[];
  isActive: boolean;
  managerName?: string;
  managerPhone?: string;
  lineGroupUrl?: string;
  createdAt: Date;
}

export interface Room {
  id: string;
  branchId: string;
  name: string;
  capacity: number;
  floor?: string;
  hasProjector: boolean;
  hasWhiteboard: boolean;
  isActive: boolean;
}

// Academic Types
export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  category: 'Coding' | 'Robotics' | 'AI' | 'Other';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  ageRange: {
    min: number;
    max: number;
  };
  color: string;
  icon?: string;
  prerequisites?: string[];
  isActive: boolean;
}

// Teacher - ข้อมูลครูแบบละเอียด (ใช้สำหรับระบบการสอน)
export interface Teacher {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  phone: string;
  lineUserId?: string;
  specialties: string[]; // subject IDs
  availableBranches: string[]; // branch IDs
  profileImage?: string;
  hourlyRate?: number;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  isActive: boolean;
  hasLogin?: boolean; // เพิ่ม: flag บอกว่ามี adminUser หรือยัง
  createdAt?: Date; // เพิ่ม: วันที่สร้าง
  updatedAt?: Date; // เพิ่ม: วันที่อัปเดต
}

export interface Class {
  id: string;
  subjectId: string; // ใช้แบบเดิม ไม่ต้องแก้
  teacherId: string;
  branchId: string;
  roomId: string;
  name: string; // ชื่อคลาส เช่น "VEX Beginner - Sat Morning A"
  code: string; // รหัสคลาส เช่น "BKK01-VEXG01-2501-A"
  description?: string;
  startDate: Date;
  endDate: Date;
  totalSessions: number; // ดึงมาจาก curriculum หรือกำหนดเอง
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  maxStudents: number;
  minStudents: number;
  enrolledCount: number;
  pricing: {
    pricePerSession: number;
    totalPrice: number;
    materialFee?: number;
    registrationFee?: number;
  };
  status: 'draft' | 'published' | 'started' | 'completed' | 'cancelled';
  createdAt: Date;
}
export interface ClassSchedule {
  id: string;
  classId: string;
  sessionDate: Date;
  sessionNumber: number;
  topic?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  actualTeacherId?: string;
  note?: string;
  attendance?: {
    studentId: string;
    status: 'present' | 'absent' | 'late';
    note?: string;
    checkedAt?: Date;      // เพิ่ม: เวลาที่เช็ค
    checkedBy?: string;    // เพิ่ม: ใครเช็ค
  }[];
  originalDate?: Date;
  rescheduledAt?: Date;
  rescheduledBy?: string;
}

// Enrollment & Payment Types
export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  parentId: string;
  branchId: string;
  enrolledAt: Date;
  status: 'active' | 'completed' | 'dropped' | 'transferred';
  pricing: {
    originalPrice: number;
    discount: number;
    discountType: 'percentage' | 'fixed';
    finalPrice: number;
    promotionCode?: string;
  };
  payment: {
    method: 'cash' | 'transfer' | 'credit';
    status: 'pending' | 'partial' | 'paid';
    paidAmount: number;
    paidDate?: Date;
    receiptNumber?: string;
  };
  transferredFrom?: string;
  droppedReason?: string;
  transferHistory?: Array<{
    fromClassId: string;
    toClassId: string;
    transferredAt: Date;
    reason: string;
  }>;
}

// Trial & Booking Types
export interface TrialBooking {
  id: string;
  source: 'online' | 'walkin' | 'phone';
  
  // Parent Info (ยังไม่เป็น Parent จริง)
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  
  // Students (รองรับหลายคน)
  students: {
    name: string;
    schoolName?: string;
    gradeLevel?: string;
    subjectInterests: string[]; // วิชาที่สนใจ (subject IDs)
  }[];

  branchId?: string; // สาขาที่ติดต่อ/จอง
  
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'converted' | 'cancelled';
  
  // Admin จัดการ
  assignedTo?: string; // admin ID ที่รับผิดชอบ
  contactedAt?: Date;
  contactNote?: string;
  
  createdAt: Date;
  updatedAt?: Date;
}

export interface TrialSession {
  id: string;
  bookingId: string;
  studentName: string;
  
  // Schedule
  subjectId: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  
  // Resources
  teacherId: string;
  branchId: string;
  roomId: string;
  roomName?: string;
  
  status: 'scheduled' | 'attended' | 'absent' | 'cancelled';
  
  // After trial
  attended?: boolean;
  feedback?: string;
  teacherNote?: string;
  interestedLevel?: 'high' | 'medium' | 'low' | 'not_interested';
  
  // Conversion
  converted?: boolean;
  convertedToClassId?: string;
  conversionNote?: string;
  
  // Rescheduling history
  rescheduleHistory?: Array<{
    originalDate: Date;
    originalTime: string;
    newDate: Date;
    newTime: string;
    reason?: string;
    rescheduledBy: string;
    rescheduledAt: Date;
  }>;
  
  createdAt: Date;
  completedAt?: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'reminder' | 'announcement' | 'schedule_change' | 'payment' | 'makeup' | 'system';
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  data?: { [key: string]: unknown };
  sentAt: Date;
  readAt?: Date;
  isRead: boolean;
}

// Promotion Types
export interface Promotion {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'package';
  value: number;
  conditions: {
    minPurchase?: number;
    applicableTo: ('subjects' | 'branches' | 'all')[];
    validBranches?: string[];
    validSubjects?: string[];
  };
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

// Holiday Types
export interface Holiday {
  id: string;
  name: string;
  date: Date;
  type: 'national' | 'branch';
  branches?: string[]; // Empty for national holidays, branch IDs for branch-specific
  description?: string;
}

// Room Availability Check Result
export interface RoomAvailabilityResult {
  available: boolean;
  conflicts?: {
    classId: string;
    className: string;
    classCode: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
  }[];
}

// Makeup Class Types
export interface MakeupClass {
  id: string;
  type: 'scheduled' | 'ad-hoc'; // ขอล่วงหน้า หรือ ขอหลังขาดเรียน
  originalClassId: string; // คลาสเดิม
  originalScheduleId: string; // คาบเรียนเดิม (schedule id)
  studentId: string; // นักเรียนที่ขอ makeup
  parentId: string; // ผู้ปกครอง
  requestDate: Date; // วันที่ขอ
  requestedBy: string; // user id ของคนที่สร้าง request
  reason: string; // เหตุผลที่ขาด
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  
  // เพิ่ม fields ที่หายไป
  originalSessionNumber?: number; // ครั้งที่ของคลาสเดิม
  originalSessionDate?: Date; // วันที่เรียนเดิม
  
  makeupSchedule?: { // ข้อมูลการนัด makeup (อาจยังไม่มีถ้า status = pending)
    date: Date;
    startTime: string;
    endTime: string;
    teacherId: string; // ครูที่สอน (อาจไม่ใช่คนเดิม)
    branchId: string;
    roomId: string;
    confirmedAt?: Date;
    confirmedBy?: string;
  };
  attendance?: { // ผลการเข้าเรียน
    status: 'present' | 'absent';
    checkedBy: string;
    checkedAt: Date;
    note?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  notes?: string; // หมายเหตุเพิ่มเติม
}

export interface LinkToken {
  id: string;                    // Document ID ใน Firestore
  token: string;                 // Token 32 ตัวอักษร สำหรับ QR Code
  parentId: string;              // ID ของผู้ปกครองที่จะเชื่อมต่อ
  createdAt: Date;               // วันเวลาที่สร้าง token
  expiresAt: Date;               // วันเวลาที่หมดอายุ (24 ชม.)
  used: boolean;                 // สถานะการใช้งาน
  usedAt?: Date;                 // วันเวลาที่ใช้ (optional - มีค่าเมื่อใช้แล้ว)
  linkedLineUserId?: string;     // LINE User ID ที่เชื่อมต่อ (optional - มีค่าเมื่อใช้แล้ว)
}

// Utility Types for Migration
export interface MigrationResult {
  success: number;
  failed: number;
  errors: string[];
  details?: {
    teacherId: string;
    teacherName: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }[];
}

// Teaching Materials - สื่อการสอนที่ผูกกับวิชา
export interface TeachingMaterial {
  id: string;
  subjectId: string; // ผูกกับวิชาโดยตรง
  sessionNumber: number; // ครั้งที่
  title: string; // ชื่อบทเรียน
  description?: string; // คำอธิบายสั้นๆ
  objectives: string[]; // จุดประสงค์การเรียนรู้
  materials: string[]; // อุปกรณ์ที่ใช้
  preparation: string[]; // การเตรียมตัวก่อนสอน
  canvaUrl: string; // Canva share URL
  embedUrl: string; // Auto-generated embed URL
  thumbnailUrl?: string; // รูป thumbnail
  duration: number; // ระยะเวลา (นาที)
  teachingNotes?: string; // บันทึกสำหรับครู
  tags?: string[]; // แท็ก เช่น ["hands-on", "group-work", "assessment"]
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}