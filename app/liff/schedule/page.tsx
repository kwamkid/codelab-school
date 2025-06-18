'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronLeft, Calendar, Clock, MapPin, Users, AlertCircle, School } from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParentByLineId, getStudentsByParent } from '@/lib/services/parents'
import { getEnrollmentsByStudent } from '@/lib/services/enrollments'
import { getClassWithSchedules } from '@/lib/services/classes'
import { getBranch } from '@/lib/services/branches'
import { toast } from 'sonner'
import { format, isToday, isTomorrow, isThisWeek, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { th } from 'date-fns/locale'

interface Student {
  id: string
  name: string
  nickname?: string
  profileImage?: string
}

interface ClassSchedule {
  id: string
  className: string
  subjectName: string
  teacherName: string
  branchName: string
  roomName: string
  startTime: string
  endTime: string
  schedules: Array<{
    id: string
    sessionDate: Date
    sessionNumber: number
    status: string
    topic?: string
  }>
}

interface StudentSchedule {
  student: Student
  classes: ClassSchedule[]
}

export default function SchedulePage() {
  const router = useRouter()
  const { profile } = useLiff()
  const [schedules, setSchedules] = useState<StudentSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'all'>('today')

  useEffect(() => {
    if (profile?.userId) {
      loadSchedules(profile.userId)
    }
  }, [profile])

  const loadSchedules = async (lineUserId: string) => {
    try {
      setLoading(true)
      
      // Get parent
      const parent = await getParentByLineId(lineUserId)
      if (!parent) {
        toast.error('ไม่พบข้อมูลผู้ปกครอง')
        return
      }

      // Get students
      const students = await getStudentsByParent(parent.id)
      const activeStudents = students.filter(s => s.isActive)
      
      if (activeStudents.length === 0) {
        setSchedules([])
        return
      }

      // Load schedules for each student
      const studentSchedules: StudentSchedule[] = []
      
      for (const student of activeStudents) {
        const enrollments = await getEnrollmentsByStudent(student.id)
        const activeEnrollments = enrollments.filter(e => e.status === 'active')
        
        const classes: ClassSchedule[] = []
        
        for (const enrollment of activeEnrollments) {
          try {
            const classData = await getClassWithSchedules(enrollment.classId)
            if (classData && classData.status === 'published' || classData.status === 'started') {
              const branch = await getBranch(classData.branchId)
              
              classes.push({
                id: classData.id,
                className: classData.name,
                subjectName: classData.subject?.name || 'ไม่ระบุวิชา',
                teacherName: classData.teacher?.nickname || classData.teacher?.name || 'ไม่ระบุครู',
                branchName: branch?.name || 'ไม่ระบุสาขา',
                roomName: classData.room?.name || 'ไม่ระบุห้อง',
                startTime: classData.startTime,
                endTime: classData.endTime,
                schedules: classData.schedules || []
              })
            }
          } catch (error) {
            console.error('Error loading class:', error)
          }
        }
        
        studentSchedules.push({
          student: {
            id: student.id,
            name: student.name,
            nickname: student.nickname,
            profileImage: student.profileImage
          },
          classes
        })
      }
      
      setSchedules(studentSchedules)
      
      // Set default selected student
      if (studentSchedules.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentSchedules[0].student.id)
      }
      
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast.error('ไม่สามารถโหลดตารางเรียนได้')
    } finally {
      setLoading(false)
    }
  }

  const getSchedulesByDate = (schedules: ClassSchedule[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const allSchedules: Array<{
      date: Date
      class: ClassSchedule
      schedule: ClassSchedule['schedules'][0]
    }> = []
    
    schedules.forEach(classData => {
      classData.schedules.forEach(schedule => {
        if (schedule.status === 'scheduled') {
          allSchedules.push({
            date: new Date(schedule.sessionDate),
            class: classData,
            schedule
          })
        }
      })
    })
    
    // Sort by date and time
    allSchedules.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime()
      if (dateCompare !== 0) return dateCompare
      return a.class.startTime.localeCompare(b.class.startTime)
    })
    
    // Filter based on view mode
    if (viewMode === 'today') {
      return allSchedules.filter(s => isToday(s.date))
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      return allSchedules.filter(s => s.date >= weekStart && s.date <= weekEnd)
    }
    
    return allSchedules
  }

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'วันนี้'
    if (isTomorrow(date)) return 'พรุ่งนี้'
    return format(date, 'EEEE d MMMM', { locale: th })
  }

  const selectedSchedule = schedules.find(s => s.student.id === selectedStudentId)

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
          <h1 className="text-xl font-bold">ตารางเรียน</h1>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">กำลังโหลด...</p>
          </div>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">ไม่มีข้อมูลตารางเรียน</p>
                <Button onClick={() => router.push('/liff/profile')}>
                  กลับไปหน้าโปรไฟล์
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Student Selector */}
            {schedules.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">เลือกนักเรียน</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {schedules.map((schedule) => (
                      <Button
                        key={schedule.student.id}
                        variant={selectedStudentId === schedule.student.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStudentId(schedule.student.id)}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={schedule.student.profileImage} />
                          <AvatarFallback className="text-xs">
                            {schedule.student.nickname?.charAt(0) || schedule.student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {schedule.student.nickname || schedule.student.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="today">วันนี้</TabsTrigger>
                <TabsTrigger value="week">สัปดาห์นี้</TabsTrigger>
                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              </TabsList>

              {selectedSchedule && (
                <TabsContent value={viewMode} className="mt-4 space-y-4">
                  {selectedSchedule.classes.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">
                            {selectedSchedule.student.nickname || selectedSchedule.student.name} ยังไม่มีคลาสเรียน
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {viewMode === 'all' ? (
                        // Show by class
                        selectedSchedule.classes.map((classData) => (
                          <Card key={classData.id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-lg">{classData.className}</CardTitle>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {classData.subjectName} • ครู{classData.teacherName}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {classData.schedules.filter(s => s.status === 'scheduled').length} ครั้ง
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <School className="h-4 w-4" />
                                <span>{classData.branchName} - {classData.roomName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{classData.startTime} - {classData.endTime}</span>
                              </div>
                              
                              {/* Upcoming schedules */}
                              <div className="pt-2 space-y-2">
                                <p className="text-sm font-medium">คาบเรียนที่เหลือ:</p>
                                {classData.schedules
                                  .filter(s => s.status === 'scheduled' && new Date(s.sessionDate) >= new Date())
                                  .slice(0, 3)
                                  .map((schedule) => (
                                    <div key={schedule.id} className="flex items-center justify-between text-sm pl-4">
                                      <span>
                                        ครั้งที่ {schedule.sessionNumber} - {format(new Date(schedule.sessionDate), 'd MMM', { locale: th })}
                                      </span>
                                      {schedule.topic && (
                                        <span className="text-muted-foreground text-xs">{schedule.topic}</span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        // Show by date
                        (() => {
                          const schedulesByDate = getSchedulesByDate(selectedSchedule.classes)
                          const groupedByDate = schedulesByDate.reduce((acc, item) => {
                            const dateKey = format(item.date, 'yyyy-MM-dd')
                            if (!acc[dateKey]) {
                              acc[dateKey] = []
                            }
                            acc[dateKey].push(item)
                            return acc
                          }, {} as Record<string, typeof schedulesByDate>)
                          
                          return Object.entries(groupedByDate).length === 0 ? (
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center py-4">
                                  <p className="text-muted-foreground">
                                    ไม่มีคลาสเรียน{viewMode === 'today' ? 'วันนี้' : 'ในสัปดาห์นี้'}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            Object.entries(groupedByDate).map(([dateKey, items]) => {
                              const date = new Date(dateKey)
                              return (
                                <div key={dateKey} className="space-y-3">
                                  <h3 className="font-medium text-sm text-muted-foreground">
                                    {formatDateHeader(date)}
                                  </h3>
                                  {items.map((item) => (
                                    <Card key={`${item.class.id}-${item.schedule.id}`}>
                                      <CardContent className="pt-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <h4 className="font-medium">{item.class.className}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                              {item.class.subjectName} • ครั้งที่ {item.schedule.sessionNumber}
                                            </p>
                                            {item.schedule.topic && (
                                              <p className="text-sm text-muted-foreground mt-1">
                                                หัวข้อ: {item.schedule.topic}
                                              </p>
                                            )}
                                          </div>
                                          <div className="text-right text-sm">
                                            <p className="font-medium">{item.class.startTime} - {item.class.endTime}</p>
                                            <p className="text-muted-foreground">{item.class.roomName}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            ครู{item.class.teacherName}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {item.class.branchName}
                                          </span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )
                            })
                          )
                        })()
                      )}
                    </>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}