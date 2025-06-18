'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronLeft, Loader2, Calendar, Users } from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParentScheduleEvents, getStudentScheduleStats } from '@/lib/services/liff-schedule'
import { toast } from 'sonner'
import { DatesSetArg } from '@fullcalendar/core'
import ScheduleCalendar, { ScheduleEvent } from '@/components/liff/schedule-calendar'
import { Badge } from '@/components/ui/badge'

export default function SchedulePage() {
  const router = useRouter()
  const { profile } = useLiff()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)

  const loadSchedules = useCallback(async (start: Date, end: Date) => {
    if (!profile?.userId) return

    try {
      setLoading(true)
      const { events: fetchedEvents, students: studentsData } = await getParentScheduleEvents(
        profile.userId,
        start,
        end
      )
      
      setEvents(fetchedEvents)
      setStudents(studentsData)
      
      // Set default selected student
      if (studentsData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData[0].student.id)
      }
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast.error('ไม่สามารถโหลดตารางเรียนได้')
    } finally {
      setLoading(false)
    }
  }, [profile, selectedStudentId])

  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    setDateRange({ start: dateInfo.start, end: dateInfo.end })
    loadSchedules(dateInfo.start, dateInfo.end)
  }, [loadSchedules])

  // Initial load with current month
  useEffect(() => {
    if (profile?.userId && !dateRange) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setDateRange({ start, end })
      loadSchedules(start, end)
    }
  }, [profile, dateRange, loadSchedules])

  // Get stats for selected student
  const selectedStudentStats = selectedStudentId 
    ? getStudentScheduleStats(events, selectedStudentId)
    : null

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

      <div className="p-4 space-y-4">
        {/* Student Selector */}
        {students.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                เลือกนักเรียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={!selectedStudentId ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStudentId('')}
                  className="whitespace-nowrap"
                >
                  ทุกคน
                </Button>
                {students.map((data) => (
                  <Button
                    key={data.student.id}
                    variant={selectedStudentId === data.student.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStudentId(data.student.id)}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={data.student.profileImage} />
                      <AvatarFallback className="text-xs">
                        {data.student.nickname?.charAt(0) || data.student.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {data.student.nickname || data.student.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {selectedStudentStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{selectedStudentStats.totalClasses}</p>
                <p className="text-xs text-muted-foreground">คลาสทั้งหมด</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{selectedStudentStats.completedClasses}</p>
                <p className="text-xs text-muted-foreground">เรียนแล้ว</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{selectedStudentStats.upcomingClasses}</p>
                <p className="text-xs text-muted-foreground">กำลังจะถึง</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{selectedStudentStats.makeupClasses}</p>
                <p className="text-xs text-muted-foreground">เรียนชดเชย</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              ปฏิทินตารางเรียน
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            
            {students.length === 0 && !loading ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">ไม่มีข้อมูลตารางเรียน</p>
                <Button onClick={() => router.push('/liff/profile')}>
                  กลับไปหน้าโปรไฟล์
                </Button>
              </div>
            ) : (
              <ScheduleCalendar 
                events={events}
                onDatesSet={handleDatesSet}
                loading={loading}
                selectedStudentId={selectedStudentId}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}