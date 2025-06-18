'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User,
  CalendarOff,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParentByLineId, getStudentsByParent } from '@/lib/services/parents'
import { getMakeupClassesByStudent } from '@/lib/services/makeup'
import { getClass } from '@/lib/services/classes'
import { getSubject } from '@/lib/services/subjects'
import { getTeacher } from '@/lib/services/teachers'
import { getBranch } from '@/lib/services/branches'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface MakeupData {
  makeup: any
  originalClass: any
  subject: any
  originalTeacher: any
  makeupTeacher?: any
  branch?: any
}

export default function MakeupPage() {
  const router = useRouter()
  const { profile } = useLiff()
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [makeupData, setMakeupData] = useState<Record<string, MakeupData[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.userId) {
      loadData(profile.userId)
    }
  }, [profile])

  const loadData = async (lineUserId: string) => {
    try {
      setLoading(true)
      
      // Get parent and students
      const parent = await getParentByLineId(lineUserId)
      if (!parent) {
        toast.error('ไม่พบข้อมูลผู้ปกครอง')
        return
      }

      const studentsList = await getStudentsByParent(parent.id)
      const activeStudents = studentsList.filter(s => s.isActive)
      setStudents(activeStudents)
      
      if (activeStudents.length > 0) {
        setSelectedStudentId(activeStudents[0].id)
        
        // Load makeup data for all students
        const allMakeupData: Record<string, MakeupData[]> = {}
        
        for (const student of activeStudents) {
          const makeups = await getMakeupClassesByStudent(student.id)
          
          // Load additional data for each makeup
          const makeupWithData: MakeupData[] = []
          
          for (const makeup of makeups) {
            try {
              const [originalClass, originalTeacher] = await Promise.all([
                getClass(makeup.originalClassId),
                getTeacher(makeup.requestedBy) // This might be wrong field, adjust as needed
              ])
              
              if (!originalClass) continue
              
              const subject = await getSubject(originalClass.subjectId)
              
              let makeupTeacher, branch
              if (makeup.makeupSchedule) {
                [makeupTeacher, branch] = await Promise.all([
                  getTeacher(makeup.makeupSchedule.teacherId),
                  getBranch(makeup.makeupSchedule.branchId)
                ])
              }
              
              makeupWithData.push({
                makeup,
                originalClass,
                subject,
                originalTeacher,
                makeupTeacher,
                branch
              })
            } catch (error) {
              console.error('Error loading makeup data:', error)
            }
          }
          
          // Sort by request date (newest first)
          makeupWithData.sort((a, b) => 
            b.makeup.requestDate.getTime() - a.makeup.requestDate.getTime()
          )
          
          allMakeupData[student.id] = makeupWithData
        }
        
        setMakeupData(allMakeupData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const formatThaiDate = (date: Date) => {
    return format(date, 'EEEE dd MMMM yyyy', { locale: th })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            รอจัดตารางเรียนชดเชย
          </Badge>
        )
      case 'scheduled':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Calendar className="h-3 w-3 mr-1" />
            นัดเรียนชดเชยแล้ว
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            เรียนชดเชยแล้ว
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            ยกเลิก
          </Badge>
        )
      default:
        return null
    }
  }

  const selectedStudentMakeups = selectedStudentId ? (makeupData[selectedStudentId] || []) : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/liff')}
            className="text-white hover:text-white/80 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">ลาเรียนและเรียนชดเชย</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">ไม่พบข้อมูลนักเรียน</p>
                <Button onClick={() => router.push('/liff/profile')}>
                  กลับไปหน้าโปรไฟล์
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Student Selector */}
            {students.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">เลือกนักเรียน</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {students.map((student) => (
                      <Button
                        key={student.id}
                        variant={selectedStudentId === student.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStudentId(student.id)}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={student.profileImage} />
                          <AvatarFallback className="text-xs">
                            {student.nickname?.charAt(0) || student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {student.nickname || student.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Makeup List */}
            {selectedStudentMakeups.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">ไม่มีประวัติการลาเรียน</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedStudentMakeups.map((data) => (
                  <Card key={data.makeup.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {data.subject?.name || 'ไม่ระบุวิชา'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {data.originalClass?.name || 'ไม่ระบุคลาส'}
                          </p>
                        </div>
                        {getStatusBadge(data.makeup.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Original Schedule */}
                      <div className="bg-red-50 p-3 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                          <CalendarOff className="h-4 w-4" />
                          ลาเรียน
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            คลาส: {data.originalClass?.name} ครั้งที่ {data.makeup.originalScheduleId}
                          </p>
                          <p>
                            วันที่: {formatThaiDate(data.makeup.requestDate)}
                          </p>
                          <p>
                            เวลา: {data.originalClass?.startTime} - {data.originalClass?.endTime}
                          </p>
                        </div>
                      </div>

                      {/* Makeup Schedule */}
                      {data.makeup.makeupSchedule && (
                        <div className="bg-green-50 p-3 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                            <Calendar className="h-4 w-4" />
                            เรียนชดเชย
                          </div>
                          <div className="text-sm space-y-1">
                            <p>
                              วันที่: {formatThaiDate(new Date(data.makeup.makeupSchedule.date))}
                            </p>
                            <p>
                              เวลา: {data.makeup.makeupSchedule.startTime} - {data.makeup.makeupSchedule.endTime}
                            </p>
                            {data.makeupTeacher && (
                              <p className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                ครู{data.makeupTeacher.nickname || data.makeupTeacher.name}
                              </p>
                            )}
                            {data.branch && (
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {data.branch.name}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reason */}
                      {data.makeup.reason && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">เหตุผล:</p>
                          <p>{data.makeup.reason}</p>
                        </div>
                      )}

                      {/* Request Info */}
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <p>ขอลาเมื่อ: {format(data.makeup.requestDate, 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 space-y-1">
                    <p className="font-medium">การขอลาเรียน</p>
                    <p>กรุณาติดต่อเจ้าหน้าที่เพื่อขอลาเรียนล่วงหน้าอย่างน้อย 24 ชั่วโมง</p>
                    <p>สิทธิ์การเรียนชดเชย: 4 ครั้ง/คอร์ส</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}