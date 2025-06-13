'use client';

import { useState, useCallback, useEffect } from 'react';
import DashboardCalendar from '@/components/dashboard/dashboard-calendar';
import { getCalendarEvents, CalendarEvent } from '@/lib/services/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

interface TodaySession {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  subjectName: string;
  subjectColor: string;
  teacherName: string;
  roomName: string;
  branchName: string;
  startTime: string;
  endTime: string;
  enrolledCount: number;
  maxStudents: number;
  sessionNumber: number;
  status: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  
  // State สำหรับ Dialog
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEventInfo, setSelectedEventInfo] = useState<any>(null);

  // โหลด sessions ของวันนี้
  useEffect(() => {
    loadTodaySessions();
  }, []);

  const loadTodaySessions = async () => {
    setLoadingToday(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // ดึงคลาสที่ active ทั้งหมด
      const classesQuery = query(
        collection(db, 'classes'),
        where('status', 'in', ['published', 'started'])
      );
      const classesSnapshot = await getDocs(classesQuery);
      
      const sessionsToday: TodaySession[] = [];

      // ดึงข้อมูลที่จำเป็นสำหรับ lookup
      const [subjectsSnap, teachersSnap, branchesSnap] = await Promise.all([
        getDocs(collection(db, 'subjects')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'branches'))
      ]);

      const subjectMap = new Map(subjectsSnap.docs.map(doc => [doc.id, doc.data()]));
      const teacherMap = new Map(teachersSnap.docs.map(doc => [doc.id, doc.data()]));
      const branchMap = new Map(branchesSnap.docs.map(doc => [doc.id, doc.data()]));

      // วนลูปแต่ละคลาส
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        
        // ดึง schedules ของคลาสนี้ที่ตรงกับวันนี้
        const schedulesQuery = query(
          collection(db, 'classes', classDoc.id, 'schedules'),
          where('sessionDate', '>=', Timestamp.fromDate(today)),
          where('sessionDate', '<', Timestamp.fromDate(tomorrow))
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);

        if (!schedulesSnapshot.empty) {
          // ดึงข้อมูลห้อง
          const roomDoc = await getDocs(collection(db, 'branches', classData.branchId, 'rooms'));
          const room = roomDoc.docs.find(r => r.id === classData.roomId)?.data();

          for (const scheduleDoc of schedulesSnapshot.docs) {
            const scheduleData = scheduleDoc.data();
            const subject = subjectMap.get(classData.subjectId);
            const teacher = teacherMap.get(classData.teacherId);
            const branch = branchMap.get(classData.branchId);

            sessionsToday.push({
              id: scheduleDoc.id,
              classId: classDoc.id,
              className: classData.name,
              classCode: classData.code,
              subjectName: subject?.name || 'N/A',
              subjectColor: subject?.color || '#gray',
              teacherName: teacher?.nickname || teacher?.name || 'N/A',
              roomName: room?.name || 'N/A',
              branchName: branch?.name || 'N/A',
              startTime: classData.startTime,
              endTime: classData.endTime,
              enrolledCount: classData.enrolledCount,
              maxStudents: classData.maxStudents,
              sessionNumber: scheduleData.sessionNumber,
              status: scheduleData.status
            });
          }
        }
      }

      // เรียงตามเวลา
      sessionsToday.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTodaySessions(sessionsToday);
    } catch (error) {
      console.error('Error loading today sessions:', error);
      toast.error('ไม่สามารถโหลดตารางเรียนวันนี้ได้');
    } finally {
      setLoadingToday(false);
    }
  };

  const handleDatesSet = useCallback(async (dateInfo: any) => {
    setLoading(true);
    try {
      const fetchedEvents = await getCalendarEvents(dateInfo.start, dateInfo.end);
      setEvents(fetchedEvents);
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลตารางเรียนได้');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleEventClick = (clickInfo: any) => {
    // TODO: เปิด Dialog แสดงรายละเอียดนักเรียนในคลาส
    toast.info(`คลิกที่คลาส: ${clickInfo.event.title}`, {
      description: `Class ID: ${clickInfo.event.extendedProps.classId}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">ภาพรวมตารางเรียนและข้อมูลสำคัญ</p>
      </div>

      {/* Today's Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            ตารางเรียนวันนี้ ({formatDate(new Date(), 'long')})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingToday ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>ไม่มีคลาสเรียนในวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <Link
                  key={`${session.classId}-${session.id}`}
                  href={`/classes/${session.classId}`}
                  className="block"
                >
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: session.subjectColor }}
                          />
                          <h4 className="font-medium">{session.className}</h4>
                          <Badge variant="outline" className="text-xs">
                            ครั้งที่ {session.sessionNumber}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.startTime} - {session.endTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.branchName} ({session.roomName})
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            ครู{session.teacherName}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm">
                          <span className={session.enrolledCount >= session.maxStudents ? 'text-red-600 font-medium' : ''}>
                            {session.enrolledCount}/{session.maxStudents}
                          </span>
                          <span className="text-gray-500"> คน</span>
                        </div>
                        {session.status === 'completed' && (
                          <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                            เรียนแล้ว
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>ตารางเรียนทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
            </div>
          )}
          
          <DashboardCalendar 
            events={events} 
            onDatesSet={handleDatesSet}
            onEventClick={handleEventClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}