// สร้างไฟล์นี้ที่ scripts/seed-subjects.ts
// รันด้วย: npx ts-node scripts/seed-subjects.ts

import { createSubject } from '@/lib/services/subjects';

const sampleSubjects = [
  // VEX Robotics Series
  {
    name: 'VEX GO',
    code: 'VEXGO',
    description: 'หุ่นยนต์ VEX GO สำหรับเด็กเล็ก เรียนรู้พื้นฐานการต่อหุ่นยนต์ การเขียนโปรแกรมด้วยบล็อก และแก้ปัญหาผ่านกิจกรรมสนุกๆ เหมาะสำหรับนักเรียนชั้นประถม',
    category: 'Robotics' as const,
    level: 'Beginner' as const,
    ageRange: { min: 6, max: 10 },
    color: '#10b981',
    prerequisites: [],
    isActive: true,
  },
  {
    name: 'VEX IQ',
    code: 'VEXIQ',
    description: 'หุ่นยนต์ VEX IQ สำหรับนักเรียนชั้นประถมปลายถึงมัธยมต้น เรียนรู้การสร้างหุ่นยนต์ที่ซับซ้อนขึ้น การเขียนโปรแกรมควบคุม และเตรียมความพร้อมสำหรับการแข่งขัน',
    category: 'Robotics' as const,
    level: 'Intermediate' as const,
    ageRange: { min: 9, max: 14 },
    color: '#3b82f6',
    prerequisites: [],
    isActive: true,
  },
  {
    name: 'VEX V5',
    code: 'VEXV5',
    description: 'หุ่นยนต์ VEX V5 ระดับสูง สำหรับนักเรียนมัธยม เรียนรู้การออกแบบเชิงวิศวกรรม การเขียนโปรแกรมขั้นสูง และเทคนิคการแข่งขันหุ่นยนต์ระดับนานาชาติ',
    category: 'Robotics' as const,
    level: 'Advanced' as const,
    ageRange: { min: 13, max: 18 },
    color: '#dc2626',
    prerequisites: ['VEXIQ'],
    isActive: true,
  },

  // Drone & Coding
  {
    name: 'Drone Coding',
    code: 'DRONE',
    description: 'เรียนรู้การควบคุมโดรนด้วยการเขียนโปรแกรม ฝึกการคิดเชิง 3 มิติ การวางแผนเส้นทางบิน และการแก้ปัญหาผ่านภารกิจต่างๆ ใช้โดรนการศึกษาที่ปลอดภัย',
    category: 'Robotics' as const,
    level: 'Intermediate' as const,
    ageRange: { min: 10, max: 16 },
    color: '#06b6d4',
    prerequisites: [],
    isActive: true,
  },

  // Innovation & Making
  {
    name: 'Little Innovator',
    code: 'INNO',
    description: 'หลักสูตรสำหรับนักประดิษฐ์น้อย เรียนรู้กระบวนการคิดเชิงออกแบบ (Design Thinking) การสร้างต้นแบบ และการนำเสนอไอเดีย ผ่านโปรเจคที่หลากหลาย',
    category: 'Other' as const,
    level: 'Beginner' as const,
    ageRange: { min: 7, max: 12 },
    color: '#f59e0b',
    prerequisites: [],
    isActive: true,
  },
  {
    name: 'Maker',
    code: 'MAKER',
    description: 'เวิร์คช็อปการสร้างสรรค์ผลงาน รวมทั้งการใช้เครื่องมือต่างๆ เช่น 3D Printer, Laser Cutter, Arduino และอุปกรณ์อิเล็กทรอนิกส์ สร้างโปรเจคจากจินตนาการสู่ความเป็นจริง',
    category: 'Other' as const,
    level: 'Intermediate' as const,
    ageRange: { min: 12, max: 18 },
    color: '#8b5cf6',
    prerequisites: [],
    isActive: true,
  },

  // Programming
  {
    name: 'Python Programming',
    code: 'PYTHON',
    description: 'เรียนรู้การเขียนโปรแกรมด้วยภาษา Python ตั้งแต่พื้นฐานจนถึงการสร้างโปรเจค เช่น เกม, เว็บแอพพลิเคชัน และการวิเคราะห์ข้อมูล เหมาะสำหรับผู้เริ่มต้นที่ต้องการก้าวสู่โลกการเขียนโปรแกรม',
    category: 'Coding' as const,
    level: 'Beginner' as const,
    ageRange: { min: 11, max: 18 },
    color: '#22c55e',
    prerequisites: [],
    isActive: true,
  },

  // เพิ่มวิชาอื่นๆ ที่อาจมีในอนาคต
  {
    name: 'AI & Machine Learning',
    code: 'AI',
    description: 'รู้จักกับปัญญาประดิษฐ์และ Machine Learning ผ่านโปรเจคที่น่าสนใจ เช่น การจำแนกรูปภาพ, Chatbot และการทำนายข้อมูล ใช้ Python และเครื่องมือ AI ที่เหมาะสำหรับเด็ก',
    category: 'AI' as const,
    level: 'Intermediate' as const,
    ageRange: { min: 13, max: 18 },
    color: '#a855f7',
    prerequisites: ['PYTHON'],
    isActive: true,
  },
  {
    name: 'Game Development',
    code: 'GAME',
    description: 'สร้างเกมของตัวเองด้วย Unity หรือ Godot Engine เรียนรู้การออกแบบเกม การเขียนโปรแกรม และการสร้างกราฟิก พร้อมเผยแพร่ผลงานจริง',
    category: 'Coding' as const,
    level: 'Intermediate' as const,
    ageRange: { min: 12, max: 18 },
    color: '#ec4899',
    prerequisites: ['PYTHON'],
    isActive: true,
  },
  {
    name: 'Scratch Programming',
    code: 'SCRATCH',
    description: 'เริ่มต้นการเขียนโปรแกรมด้วย Scratch การเขียนโปรแกรมแบบลากวางบล็อก สร้างเกม แอนิเมชัน และเรื่องราวแบบ interactive สำหรับผู้เริ่มต้น',
    category: 'Coding' as const,
    level: 'Beginner' as const,
    ageRange: { min: 6, max: 10 },
    color: '#f97316',
    prerequisites: [],
    isActive: true,
  },
];

// Function to seed subjects
export async function seedSubjects() {
  console.log('🌱 Starting to seed subjects...');
  
  for (const subject of sampleSubjects) {
    try {
      const id = await createSubject(subject);
      console.log(`✅ Created subject: ${subject.name} (${subject.code}) with ID: ${id}`);
    } catch (error) {
      console.error(`❌ Error creating subject ${subject.code}:`, error);
    }
  }
  
  console.log('✨ Seeding completed!');
}

// หากต้องการรันไฟล์นี้โดยตรง
// seedSubjects();