'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronLeft, Loader2, Calendar, Users } from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParentScheduleEvents, getStudentOverallStats, StudentStats } from '@/lib/services/liff-schedule'
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
  const [overallStats, setOverallStats] = useState<Record<string, StudentStats>>({})
  const [loadingStats, setLoadingStats] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Load all data for the current year
  const loadYearData = useCallback(async () => {
    if (!profile?.userId || dataLoaded) return

    try {
      setLoading(true)
      
      // Load data for the whole year
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1) // January 1st
      const yearEnd = new Date(now.getFullYear(), 11, 31) // December 31st
      
      console.log(`Loading data from ${yearStart.toDateString()} to ${yearEnd.toDateString()}`)
      
      const { events: fetchedEvents, students: studentsData } = await getParentScheduleEvents(
        profile.userId,
        yearStart,
        yearEnd
      )
      
      setEvents(fetchedEvents)
      setStudents(studentsData)
      setDataLoaded(true)
      
      // Set default selected student
      if (studentsData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData[0].student.id)
      }
      
      console.log(`Loaded ${fetchedEvents.length} events for the year`)
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast.error('ไม่สามารถโหลดตารางเรียนได้')
    } finally {
      setLoading(false)
    }
  }, [profile, selectedStudentId, dataLoaded])

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    setDataLoaded(false)
    await loadYearData()
  }, [loadYearData])

  // Load overall stats for all students
  const loadOverallStats = useCallback(async () => {
    if (!profile?.userId || students.length === 0) return

    try {
      setLoadingStats(true)
      const statsPromises = students.map(async (studentData) => {
        const stats = await getStudentOverallStats(profile.userId, studentData.student.id)
        return { studentId: studentData.student.id, stats }
      })

      const results = await Promise.all(statsPromises)
      const statsMap: Record<string, StudentStats> = {}
      results.forEach(({ studentId, stats }) => {
        statsMap[studentId] = stats
      })
      
      setOverallStats(statsMap)
    } catch (error) {
      console.error('Error loading overall stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [profile, students])

  // Calendar dates set handler (no need to load data anymore)
  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    // Just let the calendar update its view
    // Data is already loaded for the whole year
  }, [])

  // Initial load
  useEffect(() => {
    if (profile?.userId) {
      loadYearData()
    }
  }, [profile?.userId, loadYearData])

  // Load overall stats when students data is available
  useEffect(() => {
    if (students.length > 0) {
      loadOverallStats()
    }
  }, [students, loadOverallStats])

  // Get stats for selected student
  const selectedStudentStats = selectedStudentId && overallStats[selectedStudentId]
    ? overallStats[selectedStudentId]
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

        {/* Overall Statistics */}
        {selectedStudentStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {loadingStats ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    selectedStudentStats.totalClasses
                  )}
                </p>
                <p className="text-xs text-muted-foreground">คลาสทั้งหมด</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {loadingStats ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    selectedStudentStats.completedClasses
                  )}
                </p>
                <p className="text-xs text-muted-foreground">เรียนแล้ว</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {loadingStats ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    selectedStudentStats.upcomingClasses
                  )}
                </p>
                <p className="text-xs text-muted-foreground">กำลังจะถึง</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {loadingStats ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    selectedStudentStats.makeupClasses
                  )}
                </p>
                <p className="text-xs text-muted-foreground">เรียนชดเชย</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Show overall stats for all students when no student is selected */}
        {!selectedStudentId && students.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">สรุปรายนักเรียน</p>
            {students.map((data) => {
              const stats = overallStats[data.student.id]
              return (
                <Card key={data.student.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={data.student.profileImage} />
                          <AvatarFallback>
                            {data.student.nickname?.charAt(0) || data.student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{data.student.nickname || data.student.name}</p>
                          <p className="text-sm text-muted-foreground">{data.student.name}</p>
                        </div>
                      </div>
                      {stats && (
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <p className="text-sm font-bold">{stats.totalClasses}</p>
                            <p className="text-xs text-muted-foreground">ทั้งหมด</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-green-600">{stats.completedClasses}</p>
                            <p className="text-xs text-muted-foreground">เรียนแล้ว</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-blue-600">{stats.upcomingClasses}</p>
                            <p className="text-xs text-muted-foreground">จะถึง</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-purple-600">{stats.makeupClasses}</p>
                            <p className="text-xs text-muted-foreground">ชดเชย</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
                onRefreshNeeded={forceRefresh}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}