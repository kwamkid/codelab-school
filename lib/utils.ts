import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency in Thai Baht
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date to Thai locale - เพิ่ม export
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  }
  
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// Format time (HH:mm)
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes} น.`;
}

// Get day name in Thai
export function getDayName(dayNumber: number): string {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return days[dayNumber];
}

// Calculate age from birthdate
export function calculateAge(birthdate: Date | string): number {
  const birth = typeof birthdate === 'string' ? new Date(birthdate) : birthdate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// Generate class code
export function generateClassCode(branchCode: string, subjectCode: string, date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${branchCode}-${subjectCode}-${year}${month}`;
}

// Check if date is holiday
export function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some(holiday => 
    holiday.toDateString() === date.toDateString()
  );
}

// Get next occurrence of specific day
export function getNextDayOccurrence(dayOfWeek: number, fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  
  if (daysUntilTarget === 0) {
    date.setDate(date.getDate() + 7);
  } else {
    date.setDate(date.getDate() + daysUntilTarget);
  }
  
  return date;
}