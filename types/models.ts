// User Types
export interface Parent {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  phone?: string;
  email?: string;
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
  status: 'scheduled' | 'completed' | 'cancelled';
  actualTeacherId?: string;
  note?: string;
  attendance?: {
    studentId: string;
    status: 'present' | 'absent' | 'late';
    note?: string;
  }[];
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
}

// Trial & Booking Types
export interface TrialBooking {
  id: string;
  parentLineId: string;
  parentName: string;
  parentPhone: string;
  studentName: string;
  studentAge: number;
  studentGrade?: string;
  subjectInterest: string;
  branchId: string;
  preferredDate: Date;
  preferredTime: string;
  alternativeDate?: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'converted';
  assignedTeacher?: string;
  assignedRoom?: string;
  feedback?: string;
  conversionStatus?: 'interested' | 'not-interested' | 'enrolled';
  followUpDate?: Date;
  createdAt: Date;
  notes?: string;
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
  type: 'national' | 'branch' | 'special';
  isSchoolClosed: boolean;
  branches?: string[]; // Empty for national holidays, branch IDs for branch-specific
  description?: string;
  isRecurring?: boolean;
  recurringFromId?: string; // Reference to original recurring holiday
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