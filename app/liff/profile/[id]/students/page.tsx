'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronLeft, Users, Plus, ChevronRight, User, Calendar, School } from 'lucide-react'
import { getStudentsByParent } from '@/lib/services/parents'
import { toast } from 'sonner'
import type { Student } from '@/types/models'
import AuthWrapper from '@/components/liff/auth-wrapper'

function StudentsListContent() {
  const router = useRouter()
  const params = useParams()
  const parentId = params.id as string
  
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [parentId])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const studentsList = await getStudentsByParent(parentId)
      setStudents(studentsList)
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthdate: any) => {
    let birth: Date
    
    if (birthdate?.toDate && typeof birthdate.toDate === 'function') {
      birth = birthdate.toDate()
    } else if (birthdate instanceof Date) {
      birth = birthdate
    } else if (typeof birthdate === 'string') {
      birth = new Date(birthdate)
    } else {
      return 0
    }
    
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/liff/profile')}
              className="text-white hover:text-white/80 -ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">จัดการข้อมูลนักเรียน</h1>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/liff/profile/${parentId}/students/new`)}
          >
            <Plus className="h-4 w-4 mr-1" />
            เพิ่ม
          </Button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">กำลังโหลด...</p>
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">ยังไม่มีข้อมูลนักเรียน</p>
                <Button 
                  onClick={() => router.push(`/liff/profile/${parentId}/students/new`)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มนักเรียน
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Active Students */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">นักเรียนปัจจุบัน</h2>
              {students.filter(s => s.isActive).map((student) => (
                <Card 
                  key={student.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/liff/profile/${parentId}/students/${student.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={student.profileImage} />
                          <AvatarFallback>
                            {student.nickname?.charAt(0) || student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {student.nickname || student.name}
                            {student.nickname && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({student.name})
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {student.gradeLevel || 'ไม่ระบุชั้นเรียน'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              อายุ {calculateAge(student.birthdate)} ปี
                            </span>
                            {student.schoolName && (
                              <span className="flex items-center gap-1">
                                <School className="h-3 w-3" />
                                {student.schoolName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Inactive Students */}
            {students.filter(s => !s.isActive).length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">นักเรียนที่ไม่ได้เรียนแล้ว</h2>
                {students.filter(s => !s.isActive).map((student) => (
                  <Card 
                    key={student.id}
                    className="cursor-pointer hover:shadow-md transition-shadow opacity-60"
                    onClick={() => router.push(`/liff/profile/${parentId}/students/${student.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={student.profileImage} />
                            <AvatarFallback>
                              {student.nickname?.charAt(0) || student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {student.nickname || student.name}
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">
                                ไม่ได้เรียน
                              </span>
                            </p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{student.gradeLevel || 'ไม่ระบุชั้นเรียน'}</span>
                              <span>อายุ {calculateAge(student.birthdate)} ปี</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentsListPage() {
  return (
    <AuthWrapper>
      <StudentsListContent />
    </AuthWrapper>
  );
}