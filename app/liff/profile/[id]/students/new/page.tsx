'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GradeLevelCombobox } from "@/components/ui/grade-level-combobox"
import { ChevronLeft, User, Calendar, School, AlertCircle, Loader2 } from 'lucide-react'
import { createStudent } from '@/lib/services/parents'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AuthWrapper from '@/components/liff/auth-wrapper'

// Form schema
const formSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อ-นามสกุล'),
  nickname: z.string().min(1, 'กรุณาระบุชื่อเล่น'),
  birthdate: z.string().min(1, 'กรุณาเลือกวันเกิด'),
  gender: z.enum(['M', 'F'], { required_error: 'กรุณาเลือกเพศ' }),
  gradeLevel: z.string().optional(),
  schoolName: z.string().optional(),
  allergies: z.string().optional(),
  specialNeeds: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

function AddStudentContent() {
  const router = useRouter()
  const params = useParams()
  const parentId = params.id as string
  
  const [saving, setSaving] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      setSaving(true)
      
      const birthdate = new Date(data.birthdate)
      
      await createStudent(parentId, {
        name: data.name,
        nickname: data.nickname,
        birthdate,
        gender: data.gender,
        gradeLevel: data.gradeLevel,
        schoolName: data.schoolName || '',
        allergies: data.allergies || '',
        specialNeeds: data.specialNeeds || '',
        emergencyContact: data.emergencyContact || '',
        emergencyPhone: data.emergencyPhone || '',
        isActive: true
      })
      
      toast.success('เพิ่มข้อมูลนักเรียนเรียบร้อย')
      router.push(`/liff/profile/${parentId}/students`)
      
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  // Calculate max date (today)
  const today = new Date().toISOString().split('T')[0]
  
  // Calculate min date (18 years ago)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 18)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/liff/profile/${parentId}/students`)}
            className="text-white hover:text-white/80 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">เพิ่มข้อมูลนักเรียน</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              ข้อมูลพื้นฐาน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="ระบุชื่อ-นามสกุลภาษาไทย"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nickname">ชื่อเล่น *</Label>
                <Input
                  id="nickname"
                  {...register('nickname')}
                  placeholder="ชื่อเล่น"
                />
                {errors.nickname && (
                  <p className="text-sm text-red-500 mt-1">{errors.nickname.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gender">เพศ *</Label>
                <Select
                  value={watch('gender')}
                  onValueChange={(value) => setValue('gender', value as 'M' | 'F')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเพศ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">ชาย</SelectItem>
                    <SelectItem value="F">หญิง</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-red-500 mt-1">{errors.gender.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="birthdate">วันเกิด *</Label>
              <Input
                id="birthdate"
                type="date"
                {...register('birthdate')}
                max={today}
                min={minDateStr}
              />
              {errors.birthdate && (
                <p className="text-sm text-red-500 mt-1">{errors.birthdate.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* School Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              ข้อมูลการศึกษา
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="schoolName">โรงเรียน</Label>
              <Input
                id="schoolName"
                {...register('schoolName')}
                placeholder="ชื่อโรงเรียน (ไม่บังคับ)"
              />
            </div>
            
            <div>
              <Label htmlFor="gradeLevel">ระดับชั้น</Label>
              <GradeLevelCombobox
                value={watch('gradeLevel') || ''}
                onChange={(value) => setValue('gradeLevel', value)}
                placeholder="เลือกหรือพิมพ์ระดับชั้น..."
              />
              <p className="text-xs text-gray-500 mt-1">
                เริ่มพิมพ์เพื่อค้นหา เช่น "ป", "ประถม", "Grade", "Year"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Health & Emergency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ข้อมูลสุขภาพและฉุกเฉิน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="allergies">ประวัติการแพ้</Label>
              <Textarea
                id="allergies"
                {...register('allergies')}
                placeholder="ระบุอาหาร/ยา/สิ่งที่แพ้ (ถ้ามี)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="specialNeeds">ข้อควรระวังพิเศษ</Label>
              <Textarea
                id="specialNeeds"
                {...register('specialNeeds')}
                placeholder="โรคประจำตัว หรือข้อควรระวังอื่นๆ (ถ้ามี)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContact">ผู้ติดต่อฉุกเฉิน</Label>
                <Input
                  id="emergencyContact"
                  {...register('emergencyContact')}
                  placeholder="ชื่อผู้ติดต่อ"
                />
              </div>

              <div>
                <Label htmlFor="emergencyPhone">เบอร์ฉุกเฉิน</Label>
                <Input
                  id="emergencyPhone"
                  {...register('emergencyPhone')}
                  placeholder="0812345678"
                  maxLength={10}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              'เพิ่มนักเรียน'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/liff/profile/${parentId}/students`)}
            disabled={saving}
          >
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function AddStudentPage() {
  return (
    <AuthWrapper>
      <AddStudentContent />
    </AuthWrapper>
  );
}