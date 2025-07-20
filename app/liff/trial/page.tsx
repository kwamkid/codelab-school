// app/liff/trial-booking/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GradeLevelCombobox } from "@/components/ui/grade-level-combobox"
import { 
  Loader2, 
  Phone, 
  Mail, 
  User,
  MapPin,
  School,
  GraduationCap,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Users,
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { getActiveBranches } from '@/lib/services/branches'
import { getSubjects } from '@/lib/services/subjects'
import { Branch, Subject } from '@/types/models'
import Image from 'next/image'

interface StudentForm {
  name: string
  schoolName: string
  gradeLevel: string
  subjectInterests: string[]
}

export default function TrialBookingPage() {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Form data
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [contactNote, setContactNote] = useState('')
  
  // Students
  const [students, setStudents] = useState<StudentForm[]>([{
    name: '',
    schoolName: '',
    gradeLevel: '',
    subjectInterests: []
  }])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [branchesData, subjectsData] = await Promise.all([
        getActiveBranches(),
        getSubjects()
      ])
      
      setBranches(branchesData.filter(b => b.isActive))
      setSubjects(subjectsData.filter(s => s.isActive))
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const addStudent = () => {
    setStudents([...students, {
      name: '',
      schoolName: '',
      gradeLevel: '',
      subjectInterests: []
    }])
  }

  const removeStudent = (index: number) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index))
    }
  }

  const updateStudent = (index: number, field: keyof StudentForm, value: any) => {
    const updated = [...students]
    updated[index] = { ...updated[index], [field]: value }
    setStudents(updated)
  }

  const toggleSubjectInterest = (studentIndex: number, subjectId: string) => {
    const updated = [...students]
    const interests = updated[studentIndex].subjectInterests
    
    if (interests.includes(subjectId)) {
      updated[studentIndex].subjectInterests = interests.filter(id => id !== subjectId)
    } else {
      updated[studentIndex].subjectInterests = [...interests, subjectId]
    }
    
    setStudents(updated)
  }

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    
    if (cleaned.length <= 3) {
      return cleaned
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setParentPhone(formatted)
  }

  const validateForm = (): boolean => {
    // Validate parent info
    if (!parentName.trim()) {
      toast.error('กรุณากรอกชื่อผู้ปกครอง')
      return false
    }
    
    if (!parentPhone || parentPhone.replace(/-/g, '').length < 10) {
      toast.error('กรุณากรอกเบอร์โทรให้ครบถ้วน')
      return false
    }
    
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      toast.error('รูปแบบอีเมลไม่ถูกต้อง')
      return false
    }
    
    if (!selectedBranch) {
      toast.error('กรุณาเลือกสาขาที่สะดวก')
      return false
    }
    
    // Validate students
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      if (!student.name.trim()) {
        toast.error(`กรุณากรอกชื่อนักเรียนคนที่ ${i + 1}`)
        return false
      }
      if (student.subjectInterests.length === 0) {
        toast.error(`กรุณาเลือกวิชาที่สนใจสำหรับนักเรียนคนที่ ${i + 1}`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setSubmitting(true)
    
    try {
      const bookingData = {
        source: 'online',
        parentName: parentName.trim(),
        parentPhone: parentPhone.replace(/-/g, ''),
        parentEmail: parentEmail.trim() || undefined,
        branchId: selectedBranch,
        students: students.map(s => ({
          name: s.name.trim(),
          schoolName: s.schoolName.trim() || undefined,
          gradeLevel: s.gradeLevel || undefined,
          subjectInterests: s.subjectInterests
        })),
        contactNote: contactNote.trim() || undefined,
        status: 'new'
      }
      
      // ส่งข้อมูลไป API
      const response = await fetch('/api/liff/trial-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'เกิดข้อผิดพลาด')
      }
      
      // แสดงหน้าสำเร็จ
      setShowSuccess(true)
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
    } catch (error: any) {
      console.error('Error submitting booking:', error)
      toast.error(error.message || 'ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-green-800">จองทดลองเรียนสำเร็จ!</h2>
              
              <div className="space-y-2 text-gray-600">
                <p>ข้อมูลของคุณได้ถูกบันทึกเรียบร้อยแล้ว</p>
                <p className="font-medium">เจ้าหน้าที่จะติดต่อกลับภายใน 24 ชั่วโมง</p>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-left">
                  <p className="font-medium mb-1">ขั้นตอนถัดไป:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>เจ้าหน้าที่จะโทรติดต่อเพื่อยืนยันวันเวลา</li>
                    <li>นำบุตรหลานมาทดลองเรียนตามวันเวลาที่นัดหมาย</li>
                    <li>ประเมินความสนใจหลังทดลองเรียน</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="pt-4">
                <Button
                  onClick={() => {
                    // Reset form
                    setShowSuccess(false)
                    setParentName('')
                    setParentPhone('')
                    setParentEmail('')
                    setSelectedBranch('')
                    setContactNote('')
                    setStudents([{
                      name: '',
                      schoolName: '',
                      gradeLevel: '',
                      subjectInterests: []
                    }])
                  }}
                  variant="outline"
                  className="w-full"
                >
                  จองเพิ่ม
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.svg"
              alt="CodeLab School"
              width={150}
              height={50}
              className="object-contain"
              onError={(e) => {
                // Fallback to text if logo not found
                e.currentTarget.style.display = 'none'
                const textLogo = document.getElementById('text-logo')
                if (textLogo) textLogo.style.display = 'block'
              }}
            />
            <h1 id="text-logo" className="text-2xl font-bold hidden">
              CodeLab School
            </h1>
          </div>
          <h2 className="text-xl font-semibold text-center">จองทดลองเรียน</h2>
          <p className="text-sm text-center mt-2 text-white/90">
            ให้บุตรหลานได้ลองเรียน Coding & Robotics กับเรา
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Parent Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                ข้อมูลผู้ปกครอง
              </CardTitle>
              <CardDescription>
                กรุณากรอกข้อมูลเพื่อให้เราติดต่อกลับ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="parentName">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="parentName"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุลผู้ปกครอง"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parentPhone">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="parentPhone"
                      value={parentPhone}
                      onChange={handlePhoneChange}
                      placeholder="08X-XXX-XXXX"
                      className="pl-10"
                      maxLength={12}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="parentEmail">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="parentEmail"
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="branch">
                  สาขาที่สะดวก <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสาขา" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{branch.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Students Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-gray-400" />
                    ข้อมูลนักเรียน
                  </CardTitle>
                  <CardDescription>
                    กรอกข้อมูลนักเรียนที่ต้องการทดลองเรียน
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addStudent}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มนักเรียน
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {students.map((student, idx) => (
                <div key={idx} className="relative p-4 border rounded-lg space-y-4">
                  {students.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeStudent(idx)}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div className="font-medium text-sm text-gray-600">
                    นักเรียนคนที่ {idx + 1}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>
                        ชื่อ-นามสกุล <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={student.name}
                        onChange={(e) => updateStudent(idx, 'name', e.target.value)}
                        placeholder="ชื่อ-นามสกุลนักเรียน"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>โรงเรียน</Label>
                      <div className="relative">
                        <School className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={student.schoolName}
                          onChange={(e) => updateStudent(idx, 'schoolName', e.target.value)}
                          placeholder="ชื่อโรงเรียน"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>ระดับชั้น</Label>
                    <GradeLevelCombobox
                      value={student.gradeLevel}
                      onChange={(value) => updateStudent(idx, 'gradeLevel', value)}
                      placeholder="เลือกหรือพิมพ์ระดับชั้น..."
                    />
                  </div>
                  
                  <div>
                    <Label>
                      วิชาที่สนใจ <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-sm text-gray-500 mb-2">
                      เลือกได้มากกว่า 1 วิชา
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subjects.map((subject) => {
                        const isSelected = student.subjectInterests.includes(subject.id)
                        return (
                          <div
                            key={subject.id}
                            onClick={() => toggleSubjectInterest(idx, subject.id)}
                            className={`
                              p-3 rounded-lg border cursor-pointer transition-all
                              ${isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="font-medium text-sm">{subject.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {subject.category} • {subject.level}
                            </div>
                            {subject.ageRange && (
                              <div className="text-xs text-gray-400 mt-1">
                                อายุ {subject.ageRange.min}-{subject.ageRange.max} ปี
                              </div>
                            )}
                            {isSelected && (
                              <Badge className="mt-2 bg-primary/10 text-primary">
                                เลือกแล้ว
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-gray-400" />
                หมายเหตุเพิ่มเติม
              </CardTitle>
              <CardDescription>
                ระบุข้อมูลเพิ่มเติมหรือความต้องการพิเศษ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="contactNote"
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                placeholder="เช่น ช่วงเวลาที่สะดวกให้ติดต่อ, ความต้องการพิเศษ, วันเวลาที่อยากทดลองเรียน"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Information */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <p className="font-medium mb-2">ข้อมูลเกี่ยวกับการทดลองเรียน:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>ทดลองเรียนฟรี 1 ชั่วโมง</li>
                <li>มีอุปกรณ์ให้ใช้ในชั้นเรียน</li>
                <li>ผู้ปกครองสามารถเข้านั่งดูได้</li>
                <li>ไม่มีค่าใช้จ่ายใดๆ ทั้งสิ้น</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full md:w-auto px-8"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังส่งข้อมูล...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ยืนยันการจองทดลองเรียน
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Contact Info */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">หากมีข้อสงสัยเพิ่มเติม ติดต่อ</p>
              <p className="font-medium flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" />
                090-155-5192
              </p>
              <p className="text-sm text-gray-500">
                เปิดทำการ จันทร์-เสาร์ 09:00-18:00 น.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}