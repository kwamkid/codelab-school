// app/liff/schedule/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StudentSchedule {
  studentId: string;
  studentName: string;
  studentNickname: string;
  classes: {
    id: string;
    subjectName: string;
    teacherName: string;
    branchName: string;
    roomName: string;
    nextSession?: {
      date: Date;
      startTime: string;
      endTime: string;
      sessionNumber: number;
    };
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  }[];
  makeupClasses?: {
    id: string;
    subjectName: string;
    originalDate: Date;
    makeupDate: Date;
    startTime: string;
    endTime: string;
    teacherName: string;
    branchName: string;
    roomName: string;
    status: 'scheduled' | 'completed';
  }[];
}

export default function LiffSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<StudentSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      // Get LINE profile from session
      const profileStr = sessionStorage.getItem('lineProfile');
      if (!profileStr) {
        setError('กรุณา Login ผ่าน LINE');
        setLoading(false);
        return;
      }

      const profile = JSON.parse(profileStr);
      
      // TODO: Call API to get schedules by LINE user ID
      // For now, mock data
      const mockSchedules: StudentSchedule[] = [
        {
          studentId: '1',
          studentName: 'ด.ช. ธนกร วิชัยดิษฐ',
          studentNickname: 'น้องบอส',
          classes: [
            {
              id: '1',
              subjectName: 'Scratch Programming',
              teacherName: 'ครูแอน',
              branchName: 'สาขาสุขุมวิท',
              roomName: 'ห้อง A',
              nextSession: {
                date: new Date('2025-01-20'),
                startTime: '10:00',
                endTime: '11:30',
                sessionNumber: 5
              },
              daysOfWeek: [6],
              startTime: '10:00',
              endTime: '11:30'
            }
          ],
          makeupClasses: [
            {
              id: 'm1',
              subjectName: 'Python Programming',
              originalDate: new Date('2025-01-13'),
              makeupDate: new Date('2025-01-21'),
              startTime: '14:00',
              endTime: '15:30',
              teacherName: 'ครูบอล',
              branchName: 'สาขาสุขุมวิท',
              roomName: 'ห้อง B',
              status: 'scheduled'
            }
          ]
        }
      ];

      setSchedules(mockSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">กำลังโหลดตารางเรียน...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">ไม่มีตารางเรียน</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">ตารางเรียน</h2>
      
      {schedules.map((student) => (
        <div key={student.studentId} className="space-y-4">
          <h3 className="font-medium text-gray-700">
            {student.studentNickname} ({student.studentName})
          </h3>
          
          {/* Regular Classes */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-600">คลาสปกติ</h4>
            {student.classes.map((cls) => (
              <Card key={cls.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{cls.subjectName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cls.nextSession && (
                    <div className="bg-red-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm font-medium text-red-700">
                        คลาสถัดไป: ครั้งที่ {cls.nextSession.sessionNumber}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <Calendar className="h-4 w-4" />
                        {formatDate(cls.nextSession.date, 'long')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <Clock className="h-4 w-4" />
                        {cls.nextSession.startTime} - {cls.nextSession.endTime}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {cls.teacherName}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {cls.branchName} - {cls.roomName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      ทุก{getDayName(cls.daysOfWeek[0])} {cls.startTime} - {cls.endTime}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Makeup Classes */}
          {student.makeupClasses && student.makeupClasses.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600">คลาสเรียนชดเชย</h4>
              {student.makeupClasses.map((makeup) => (
                <Card key={makeup.id} className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-purple-700">{makeup.subjectName}</span>
                      <span className="text-xs font-normal text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        Makeup
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="bg-purple-100 p-3 rounded-lg space-y-1">
                      <p className="text-sm font-medium text-purple-700">
                        เรียนชดเชยจากวันที่ {formatDate(makeup.originalDate, 'short')}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-purple-600">
                        <Calendar className="h-4 w-4" />
                        นัดเรียนวันที่ {formatDate(makeup.makeupDate, 'long')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-purple-600">
                        <Clock className="h-4 w-4" />
                        {makeup.startTime} - {makeup.endTime}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {makeup.teacherName}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {makeup.branchName} - {makeup.roomName}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getDayName(day: number): string {
  const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  return days[day] || '';
}