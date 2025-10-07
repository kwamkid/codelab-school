# 🗄️ Firestore Backup & Restore System

ระบบสำรองข้อมูลและกู้คืนข้อมูลจาก Firestore สำหรับ CodeLab School Management System

## 📋 คุณสมบัติ

- ✅ Backup ข้อมูลทั้งหมดหรือเฉพาะ collections ที่ต้องการ
- ✅ รองรับ Subcollections (เช่น rooms ใน branches, students ใน parents)
- ✅ แปลงข้อมูล Firestore Types (Timestamp, GeoPoint) ให้เป็น JSON
- ✅ Restore 3 โหมด: Safe / Overwrite / Clean
- ✅ Dry Run Mode (ทดสอบก่อนจริง)

## 🚀 เริ่มต้นใช้งาน

### ติดตั้ง tsx

```bash
npm install -D tsx
```

### แก้ไข package.json

เพิ่ม scripts (ถ้ายังไม่มี):

```json
{
  "scripts": {
    "backup": "tsx --env-file=.env.local backup/scripts/backup.ts",
    "restore": "tsx --env-file=.env.local backup/scripts/restore.ts"
  }
}
```

## 📦 การใช้งาน Backup

### Backup ทั้งหมด

```bash
npm run backup
```

ไฟล์จะถูกสร้างที่: `backup/data/backup-YYYY-MM-DD-HH-MM-SS/`

**ตัวอย่างผลลัพธ์:**

```
✅ Backup completed successfully!
📁 Backup location: ./backup/data/backup-2024-01-15-10-30-00
💾 Backup name: backup-2024-01-15-10-30-00
```

### Backup เฉพาะ collections

```bash
npm run backup -- --collections branches,subjects,teachers
```

## 🔄 การใช้งาน Restore (3 โหมด)

### 🛡️ โหมดที่ 1: Safe Mode (Default - ปลอดภัยที่สุด)

```bash
npm run restore backup-2024-01-15-10-30-00
```

**ทำอะไร:**

- ✅ เพิ่มข้อมูลที่หายไป
- ⏭️ ข้ามข้อมูลที่มีอยู่แล้ว (ไม่เขียนทับ)
- ✅ เก็บข้อมูลใหม่ไว้

**ใช้เมื่อ:** ต้องการกู้คืนข้อมูลที่หาย แต่ไม่อยากเสี่ยงสูญเสียข้อมูลใหม่

---

### ⚠️ โหมดที่ 2: Overwrite Mode (เขียนทับ)

```bash
npm run restore backup-2024-01-15-10-30-00 --overwrite
```

**ทำอะไร:**

- ✅ เขียนทับข้อมูลเก่าที่มี ID ซ้ำกัน
- ✅ เพิ่มข้อมูลที่หายไป
- ✅ เก็บข้อมูลใหม่ไว้ (ถ้าไม่มีใน backup)

**ใช้เมื่อ:** ต้องการกู้คืนข้อมูลเดิม แต่ยังอยากเก็บข้อมูลใหม่

---

### 🔴 โหมดที่ 3: Clean Mode (ย้อนกลับจุด backup จริงๆ)

```bash
npm run restore backup-2024-01-15-10-30-00 --clean
```

**ทำอะไร:**

- 🗑️ **ลบข้อมูลทั้งหมดใน collection**
- ✅ Restore ข้อมูลจาก backup
- ❌ **ข้อมูลใหม่จะหายไป**

**ใช้เมื่อ:** ต้องการย้อนกลับไปจุด backup ที่แน่นอน (ไม่สนใจข้อมูลใหม่)

⚠️ **ระวัง:** โหมดนี้จะลบข้อมูลที่เพิ่มหลัง backup ทิ้งหมด!

---

## 🔍 Dry Run (ทดสอบก่อน - แนะนำ)

```bash
# ทดสอบ Safe Mode
npm run restore backup-2024-01-15-10-30-00 --dry-run

# ทดสอบ Overwrite Mode
npm run restore backup-2024-01-15-10-30-00 --overwrite --dry-run

# ทดสอบ Clean Mode
npm run restore backup-2024-01-15-10-30-00 --clean --dry-run
```

จะแสดงว่าจะทำอะไรบ้าง **โดยไม่เปลี่ยนแปลงข้อมูลจริง**

---

## 📊 ตารางเปรียบเทียบโหมด

| โหมด       | ข้อมูลเดิม  | ข้อมูลใหม่ | เขียนทับ | ลบก่อน restore |
| ---------- | ----------- | ---------- | -------- | -------------- |
| Safe Mode  | ข้าม        | ✅ เก็บ    | ❌       | ❌             |
| Overwrite  | ✅ เขียนทับ | ✅ เก็บ    | ✅       | ❌             |
| Clean Mode | ✅ เขียนทับ | ❌ หาย     | ✅       | ✅             |

---

## 🎯 ตัวอย่าง Use Cases

### Use Case 1: แก้ไขข้อมูลผิด ต้องการกู้คืน

```bash
# 1. Backup ก่อน
npm run backup

# 2. แก้ไขข้อมูล... โอ๊ะ! แก้ผิด 😱

# 3. Dry run ดูก่อน
npm run restore backup-2024-01-15-10-30-00 --overwrite --dry-run

# 4. Restore กลับ
npm run restore backup-2024-01-15-10-30-00 --overwrite
```

---

### Use Case 2: ย้อนระบบกลับไปจุด backup (ไม่สนใจข้อมูลใหม่)

```bash
# 1. มีข้อมูล backup เมื่อ 3 วันก่อน
# 2. มีการเพิ่มข้อมูลใหม่มาเยอะ แต่มีปัญหา
# 3. ต้องการย้อนกลับไปตอน backup ที่ทุกอย่างยังปกติ

# Dry run ดูก่อน
npm run restore backup-2024-01-12-10-00-00 --clean --dry-run

# Restore แบบ Clean (ลบข้อมูลใหม่ทิ้ง)
npm run restore backup-2024-01-12-10-00-00 --clean
```

---

### Use Case 3: ย้ายข้อมูลระหว่าง Environment

```bash
# Production
npm run backup

# Development (คัดลอกไฟล์ backup มา)
npm run restore backup-2024-01-15-10-30-00 --clean
```

---

### Use Case 4: Restore เฉพาะบาง collections

```bash
# Restore เฉพาะ branches และ subjects
npm run restore backup-2024-01-15-10-30-00 --collections branches,subjects --clean
```

---

## 📝 คำสั่งทั้งหมด

### Backup Commands

```bash
# Backup ทั้งหมด
npm run backup

# Backup เฉพาะ collections
npm run backup -- --collections branches,subjects,teachers

# Backup โดยไม่รวม subcollections
npm run backup -- --no-subcollections
```

### Restore Commands

```bash
# Safe Mode (ไม่เขียนทับ, เก็บข้อมูลใหม่)
npm run restore backup-2024-01-15-10-30-00

# Overwrite Mode (เขียนทับ, เก็บข้อมูลใหม่)
npm run restore backup-2024-01-15-10-30-00 --overwrite

# Clean Mode (ลบทิ้ง + restore จุดเดิม)
npm run restore backup-2024-01-15-10-30-00 --clean

# Dry Run ทุกโหมด
npm run restore backup-2024-01-15-10-30-00 --dry-run
npm run restore backup-2024-01-15-10-30-00 --overwrite --dry-run
npm run restore backup-2024-01-15-10-30-00 --clean --dry-run

# Restore เฉพาะ collections
npm run restore backup-2024-01-15-10-30-00 --collections branches,subjects

# Restore ด้วย batch size กำหนดเอง
npm run restore backup-2024-01-15-10-30-00 --batch-size 1000
```

---

## 📁 โครงสร้างไฟล์

```
backup/
├── data/
│   ├── backup-2024-01-15-10-30-00/
│   │   ├── _metadata.json          # ข้อมูลสรุป
│   │   ├── branches.json           # Collection + subcollections
│   │   ├── parents.json
│   │   ├── subjects.json
│   │   └── ...
│   └── backup-2024-01-16-14-20-00/
│       └── ...
├── scripts/
│   ├── backup.ts
│   └── restore.ts
└── README.md
```

---

## ⚠️ ข้อควรระวัง

1. **Clean Mode**: จะลบข้อมูลใหม่ทิ้งหมด ใช้ด้วยความระมัดระวัง!
2. **Subcollections**: ถ้าลบ parent document, subcollections จะไม่ถูกลบอัตโนมัติ
3. **Timestamp**: จะถูกแปลงเป็น ISO string และกลับเป็น Firestore Timestamp
4. **GeoPoint**: จะถูกเก็บเป็น `{ latitude, longitude }` และกลับเป็น GeoPoint
5. **Rate Limits**: Firestore มี rate limits ถ้าข้อมูลเยอะอาจใช้เวลานาน
6. **Countdown**: มี 5 วินาทีให้กด Ctrl+C ยกเลิกก่อน restore จริง

---

## 🔧 Troubleshooting

### ปัญหา: Permission denied

```bash
# ตรวจสอบว่ามี environment variables ครบ
FIREBASE_ADMIN_PROJECT_ID=xxx
FIREBASE_ADMIN_CLIENT_EMAIL=xxx
FIREBASE_ADMIN_PRIVATE_KEY=xxx
```

### ปัญหา: Backup not found

```bash
# ตรวจสอบชื่อ backup ให้ถูกต้อง
ls backup/data/

# หรือใช้ path เต็ม
npm run restore ./backup/data/backup-2024-01-15-10-30-00
```

### ปัญหา: Out of memory

```bash
# Backup แยกทีละ collection
npm run backup -- --collections branches
npm run backup -- --collections parents
npm run backup -- --collections classes
```

### ปัญหา: Rate limit exceeded

```bash
# ลด batch size
npm run restore backup-2024-01-15-10-30-00 --batch-size 100
```

---

## 💡 Best Practices

1. **Backup สม่ำเสมอ**: Backup ก่อนทุกครั้งที่ deploy หรือแก้ไขข้อมูลใหญ่
2. **ทดสอบ Restore**: ใช้ `--dry-run` ทุกครั้งก่อน restore จริง
3. **เลือกโหมดให้เหมาะสม**:
   - กู้คืนข้อมูลหาย → Safe Mode
   - แก้ไขข้อมูลผิด → Overwrite Mode
   - ย้อนระบบทั้งหมด → Clean Mode
4. **เก็บหลายเวอร์ชัน**: เก็บ backup ย้อนหลังอย่างน้อย 7 วัน
5. **ลบ Backup เก่า**: ลบ backup ที่เก่าเกิน 30 วันเป็นระยะ

---

## 📞 ต้องการความช่วยเหลือ?

ติดต่อทีม Dev หรือดูตัวอย่างใน README นี้ครับ!
