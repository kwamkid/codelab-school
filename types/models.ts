// User Types
export interface Parent {
  id: string;
  lineUserId?: string;
  displayName: string;
  pictureUrl?: string;
  phone: string;
  emergencyPhone?: string; // เพิ่ม field ใหม่
  email?: string;
  address?: { // เพิ่ม field ใหม่
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

export interface Teacher {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  phone: string;
  lineUserId?: string;
  specialties: string[];
  availableBranches: string[];
  profileImage?: string;
  hourlyRate?: number;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  isActive: boolean;
}

// Class & Schedule Types
export interface Class {
  id: string;
  subjectId: string;
  teacherId: string;
  branchId: string;
  roomId: string;
  name: string;
  code: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  totalSessions: number;
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
  }[];
  originalDate?: Date; // เก็บวันเดิมกรณี reschedule
  rescheduledAt?: Date; // วันที่ทำการ reschedule
  rescheduledBy?: string; // ใครเป็นคน reschedule
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
  
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'converted' | 'cancelled';
  
  // Admin จัดการ
  assignedTo?: string; // admin ID ที่รับผิดชอบ
  contactedAt?: Date;
  contactNote?: string;
  
  createdAt: Date;
  updatedAt?: Date;
}

// หา TrialSession interface (ประมาณบรรทัด 241-268)
// แก้ไขเป็น:

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
  
  // Rescheduling history (เพิ่มใหม่)
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
  type: 'reminder' | 'announcement' | 'schedule_change' | 'payment';
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
  type: 'national' | 'branch';  // ลบ 'special' ออก
  branches?: string[]; // Empty for national holidays, branch IDs for branch-specific
  description?: string;
  // ลบ isSchoolClosed และ isRecurring ออก
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

// เพิ่มใน types/models.ts หลังจาก ClassSchedule interface

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