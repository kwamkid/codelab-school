'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, Loader2, Calendar, CalendarOff, AlertCircle, CheckCircle, Clock, MapPin, User, Info } from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParentByLineId, getStudentsByParent } from '@/lib/services/parents'
import { getMakeupClassesByStudent } from '@/lib/services/makeup'
import { getClass } from '@/lib/services/classes'
import { getTeacher } from '@/lib/services/teachers'
import { getBranch } from '@/lib/services/branches'
import { getRoom } from '@/lib/services/rooms'
import { getSubject } from '@/lib/services/subjects'
import { toast } from 'sonner'
import { LiffProvider } from '@/components/liff/liff-provider'
import { PageLoading } from '@/components/ui/loading'
import { formatDate, formatTime, getDayName } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MakeupData {
  student: {
    id: string
    name: string
    nickname?: string
  }
  makeups: any[]
  stats: {
    total: number
    pending: number
    scheduled: number
    completed: number
    selfRequested: number // จำนวนที่ลาเอง
  }
}

function MakeupContent() {
  const router = useRouter()
  const { profile, isLoggedIn, isLoading: liffLoading, liff } = useLiff()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [makeupData, setMakeupData] = useState<Record<string, MakeupData>>({})
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('leave')

  // Makeup quota limit
  const MAKEUP_QUOTA = 4

  // Load data
  useEffect(() => {
    if (!liffLoading && isLoggedIn && profile?.userId) {
      loadData()
    } else if (!liffLoading && !isLoggedIn && liff) {
      liff.login()
    }
  }, [liffLoading, isLoggedIn, profile, liff])

  const loadData = async () => {
    if (!profile?.userId) return

    try {
      setLoading(true)

      // Get parent
      const parent = await getParentByLineId(profile.userId)
      if (!parent) {
        toast.error('ไม่พบข้อมูลผู้ปกครอง')
        return
      }

      // Get students
      const studentsData = await getStudentsByParent(parent.id)
      const activeStudents = studentsData.filter(s => s.isActive)
      setStudents(activeStudents)

      // Set default selected student
      if (activeStudents.length === 1) {
        setSelectedStudentId(activeStudents[0].id)
      }

      // Load makeup data for each student
      const makeupDataMap: Record<string, MakeupData> = {}
      
      for (const student of activeStudents) {
        const makeups = await getMakeupClassesByStudent(student.id)
        
        // Count self-requested makeups
        const selfRequested = makeups.filter(m => 
          m.requestedBy === 'parent-liff' || 
          m.reason?.includes('ลาผ่านระบบ LIFF')
        ).length

        // Load additional data for each makeup
        const makeupsWithDetails = await Promise.all(
          makeups.map(async (makeup) => {
            try {
              const [classData, originalClass] = await Promise.all([
                getClass(makeup.originalClassId),
                makeup.makeupSchedule?.teacherId ? getTeacher(makeup.makeupSchedule.teacherId) : null,
              ])

              let subject = null
              let originalTeacher = null
              let branch = null
              let room = null
              let makeupBranch = null
              let makeupRoom = null

              if (classData) {
                [subject, originalTeacher, branch, room] = await Promise.all([
                  getSubject(classData.subjectId),
                  getTeacher(classData.teacherId),
                  getBranch(classData.branchId),
                  getRoom(classData.branchId, classData.roomId)
                ])
              }

              if (makeup.makeupSchedule) {
                [makeupBranch, makeupRoom] = await Promise.all([
                  getBranch(makeup.makeupSchedule.branchId),
                  getRoom(makeup.makeupSchedule.branchId, makeup.makeupSchedule.roomId)
                ])
              }

              return {
                ...makeup,
                className: classData?.name,
                subjectName: subject?.name,
                subjectColor: subject?.color,
                originalTeacherName: originalTeacher?.nickname || originalTeacher?.name,
                branchName: branch?.name,
                roomName: room?.name,
                makeupBranchName: makeupBranch?.name,
                makeupRoomName: makeupRoom?.name,
                makeupTeacher: makeup.makeupSchedule?.teacherId ? 
                  await getTeacher(makeup.makeupSchedule.teacherId) : null
              }
            } catch (error) {
              console.error('Error loading makeup details:', error)
              return makeup
            }
          })
        )

        makeupDataMap[student.id] = {
          student: {
            id: student.id,
            name: student.name,
            nickname: student.nickname
          },
          makeups: makeupsWithDetails,
          stats: {
            total: makeups.length,
            pending: makeups.filter(m => m.status === 'pending').length,
            scheduled: makeups.filter(m => m.status === 'scheduled').length,
            completed: makeups.filter(m => m.status === 'completed').length,
            selfRequested: selfRequested
          }
        }
      }

      setMakeupData(makeupDataMap)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  // Get selected student data
  const selectedData = selectedStudentId ? makeupData[selectedStudentId] : null
  const canRequestMore = selectedData ? 
    selectedData.stats.selfRequested < MAKEUP_QUOTA : true

  if (liffLoading || loading) {
    return <PageLoading />
  }

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
          <h1 className="text-xl font-bold">ข้อมูลการลาและเรียนชดเชย</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Student Selector */}
        {students.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {students.map((student) => (
              <Button
                key={student.id}
                variant={selectedStudentId === student.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStudentId(student.id)}
                className="whitespace-nowrap"
              >
                {student.nickname || student.name}
              </Button>
            ))}
          </div>
        )}

        {/* Quota Info */}
        {selectedData && (
          <Alert className={cn(
            "border",
            canRequestMore ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"
          )}>
            <Info className={cn(
              "h-4 w-4",
              canRequestMore ? "text-blue-600" : "text-orange-600"
            )} />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className={canRequestMore ? "text-blue-700" : "text-orange-700"}>
                  สิทธิ์ลาเรียนผ่านระบบ: ใช้ไป {selectedData.stats.selfRequested} จาก {MAKEUP_QUOTA} ครั้ง
                </span>
                {!canRequestMore && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    เต็มแล้ว
                  </Badge>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* No data */}
        {students.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">ไม่พบข้อมูลนักเรียน</p>
                <Button onClick={() => router.push('/liff')}>
                  กลับหน้าหลัก
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !selectedData || selectedData.makeups.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">ไม่มีประวัติการลาเรียน</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedData.stats.total}</p>
                  <p className="text-xs text-muted-foreground">ลาทั้งหมด</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{selectedData.stats.pending}</p>
                  <p className="text-xs text-muted-foreground">รอนัด</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedData.stats.scheduled}</p>
                  <p className="text-xs text-muted-foreground">นัดแล้ว</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedData.stats.completed}</p>
                  <p className="text-xs text-muted-foreground">เรียนแล้ว</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leave">วันที่ลา</TabsTrigger>
                <TabsTrigger value="makeup">ตารางเรียนชดเชย</TabsTrigger>
              </TabsList>

              {/* Leave History Tab */}
              <TabsContent value="leave" className="space-y-3">
                {selectedData.makeups.map((makeup) => (
                  <Card key={makeup.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {makeup.subjectColor && (
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: makeup.subjectColor }}
                            />
                          )}
                          <div>
                            <p className="font-medium">{makeup.className}</p>
                            <p className="text-sm text-muted-foreground">
                              ครั้งที่ {makeup.originalSessionNumber}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            makeup.status === 'completed' ? 'default' :
                            makeup.status === 'scheduled' ? 'secondary' :
                            makeup.status === 'cancelled' ? 'destructive' : 'outline'
                          }
                          className="text-xs"
                        >
                          {makeup.status === 'pending' ? 'รอนัด' :
                           makeup.status === 'scheduled' ? 'นัดแล้ว' :
                           makeup.status === 'completed' ? 'เรียนแล้ว' : 
                           'ยกเลิก'}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>วันที่ลา: {formatDate(makeup.originalSessionDate, 'long')}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span>เหตุผล: {makeup.reason}</span>
                        </div>

                        {makeup.requestedBy === 'parent-liff' && (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Info className="h-4 w-4" />
                            <span className="text-xs">ลาผ่านระบบ</span>
                          </div>
                        )}

                        {makeup.status === 'scheduled' && makeup.makeupSchedule && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="font-medium text-green-600 mb-1">นัดเรียนชดเชย:</p>
                            <p className="text-muted-foreground">
                              {formatDate(makeup.makeupSchedule.date, 'long')} 
                              {' '}เวลา {formatTime(makeup.makeupSchedule.startTime)} - {formatTime(makeup.makeupSchedule.endTime)}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Makeup Schedule Tab */}
              <TabsContent value="makeup" className="space-y-3">
                {selectedData.makeups
                  .filter(m => m.status === 'scheduled' || m.status === 'completed')
                  .sort((a, b) => {
                    // Sort by makeup date
                    const dateA = a.makeupSchedule?.date?.toDate ? 
                      a.makeupSchedule.date.toDate() : new Date(a.makeupSchedule?.date)
                    const dateB = b.makeupSchedule?.date?.toDate ? 
                      b.makeupSchedule.date.toDate() : new Date(b.makeupSchedule?.date)
                    return dateA - dateB
                  })
                  .map((makeup) => {
                    const makeupDate = makeup.makeupSchedule?.date?.toDate ? 
                      makeup.makeupSchedule.date.toDate() : new Date(makeup.makeupSchedule?.date)
                    const isPast = makeupDate < new Date()
                    
                    return (
                      <Card key={makeup.id} className={isPast ? 'opacity-75' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium">{makeup.className}</p>
                              <p className="text-sm text-muted-foreground">
                                แทนครั้งที่ {makeup.originalSessionNumber}
                              </p>
                            </div>
                            <Badge 
                              variant={makeup.status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {makeup.status === 'completed' ? 'เรียนแล้ว' : 'นัดแล้ว'}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="font-medium">
                                {getDayName(makeupDate.getDay())}, {formatDate(makeupDate, 'long')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(makeup.makeupSchedule.startTime)} - {formatTime(makeup.makeupSchedule.endTime)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {makeup.makeupBranchName} - ห้อง {makeup.makeupRoomName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>
                                ครู{makeup.makeupTeacher?.nickname || makeup.makeupTeacher?.name}
                              </span>
                            </div>

                            {makeup.attendance && (
                              <div className="mt-3 pt-3 border-t">
                                {makeup.attendance.status === 'present' ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>เข้าเรียนแล้ว</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>ขาดเรียน</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  
                {selectedData.makeups.filter(m => m.status === 'scheduled' || m.status === 'completed').length === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">ยังไม่มีตารางเรียนชดเชย</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}

export default function MakeupPage() {
  return (
    <LiffProvider requireLogin={true}>
      <MakeupContent />
    </LiffProvider>
  )
}