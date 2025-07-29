'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event, EventSchedule, EventRegistration } from '@/types/models';
import { getEvents, getAvailableSchedules, getUserRegistrations, isRegistrationOpen } from '@/lib/services/events';
import { useLiff } from '@/components/liff/liff-provider';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  ChevronRight,
  AlertCircle,
  Sparkles,
  CheckCircle,
  XCircle,
  CalendarX,
  Loader2
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import Image from 'next/image';

export default function LiffEventsPage() {
  const router = useRouter();
  const { profile, isLoggedIn } = useLiff();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-events'>('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<EventRegistration[]>([]);
  const [eventSchedules, setEventSchedules] = useState<Record<string, EventSchedule[]>>({});

  useEffect(() => {
    loadData();
  }, [isLoggedIn, profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load upcoming events
      const events = await getEvents();
      const upcoming = events.filter(event => 
        event.status === 'published' && 
        new Date(event.registrationEndDate) >= new Date()
      );
      setUpcomingEvents(upcoming);

      // Load schedules for each event
      const schedulesMap: Record<string, EventSchedule[]> = {};
      for (const event of upcoming) {
        const schedules = await getAvailableSchedules(event.id);
        schedulesMap[event.id] = schedules;
      }
      setEventSchedules(schedulesMap);

      // Load user registrations if logged in
      if (isLoggedIn && profile?.userId) {
        const registrations = await getUserRegistrations(profile.userId, true);
        setMyRegistrations(registrations);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'open-house': 'bg-blue-100 text-blue-700',
      'parent-meeting': 'bg-green-100 text-green-700',
      'showcase': 'bg-purple-100 text-purple-700',
      'workshop': 'bg-orange-100 text-orange-700',
      'other': 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'open-house': 'Open House',
      'parent-meeting': 'Parent Meeting',
      'showcase': 'Showcase',
      'workshop': 'Workshop',
      'other': 'อื่นๆ'
    };
    return types[type] || type;
  };

  const getRegistrationStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'confirmed': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
      'attended': 'bg-blue-100 text-blue-700',
      'no-show': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getRegistrationStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'confirmed': 'ยืนยันแล้ว',
      'cancelled': 'ยกเลิก',
      'attended': 'เข้าร่วมแล้ว',
      'no-show': 'ไม่มา'
    };
    return texts[status] || status;
  };

  const getRegistrationStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'attended':
        return <CheckCircle className="h-4 w-4" />;
      case 'no-show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleRegister = (eventId: string) => {
    router.push(`/liff/events/register/${eventId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold">Events & กิจกรรม</h1>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'my-events')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                กำลังจะมาถึง
                {upcomingEvents.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    {upcomingEvents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="my-events" disabled={!isLoggedIn}>
                งานที่ลงทะเบียน
                {myRegistrations.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    {myRegistrations.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} className="mt-0">
          {/* Upcoming Events */}
          <TabsContent value="upcoming" className="mt-0 space-y-4">
            {upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CalendarX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ไม่มีงานที่กำลังจะมาถึง
                  </h3>
                  <p className="text-gray-600">
                    เราจะแจ้งให้คุณทราบเมื่อมีงานใหม่
                  </p>
                </CardContent>
              </Card>
            ) : (
              upcomingEvents.map(event => {
                const schedules = eventSchedules[event.id] || [];
                const isOpen = isRegistrationOpen(event);
                
                return (
                  <Card key={event.id} className="overflow-hidden">
                    {event.imageUrl && (
                      <div className="h-48 w-full relative">
                        <Image
                          src={event.imageUrl}
                          alt={event.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className={getEventTypeColor(event.eventType)}>
                            {getEventTypeLabel(event.eventType)}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">{event.name}</h3>
                        {!event.imageUrl && (
                          <Badge className={getEventTypeColor(event.eventType)}>
                            {getEventTypeLabel(event.eventType)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Location */}
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{event.location}</p>
                          {event.locationUrl && (
                            <a 
                              href={event.locationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-xs"
                            >
                              ดูแผนที่
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* Schedules */}
                      {schedules.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            รอบเวลา ({schedules.length} รอบ)
                          </p>
                          <div className="grid gap-2">
                            {schedules.slice(0, 3).map((schedule, idx) => {
                              const available = schedule.maxAttendees - 
                                Object.values(schedule.attendeesByBranch).reduce((sum, count) => sum + count, 0);
                              
                              return (
                                <div key={schedule.id} className="text-xs bg-gray-50 p-2 rounded">
                                  <div className="flex justify-between items-center">
                                    <span>
                                      {formatDate(schedule.date, 'short')} • {schedule.startTime}-{schedule.endTime}
                                    </span>
                                    <Badge 
                                      variant={available > 0 ? "outline" : "secondary"}
                                      className="text-xs"
                                    >
                                      {available > 0 ? `${available} ที่ว่าง` : 'เต็ม'}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                            {schedules.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">
                                และอีก {schedules.length - 3} รอบ
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Registration Status */}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <div>
                            <p className="text-gray-500">รับลงทะเบียน</p>
                            <p className="font-medium">
                              {formatDate(event.registrationStartDate, 'short')} - {formatDate(event.registrationEndDate, 'short')}
                            </p>
                          </div>
                          {isOpen ? (
                            <Badge className="bg-green-100 text-green-700">
                              เปิดรับสมัคร
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              ปิดรับสมัคร
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      {isOpen && (
                        <Button 
                          className="w-full bg-red-500 hover:bg-red-600"
                          onClick={() => handleRegister(event.id)}
                        >
                          ลงทะเบียน
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* My Events */}
          <TabsContent value="my-events" className="mt-0 space-y-4">
            {!isLoggedIn ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    กรุณาเข้าสู่ระบบ
                  </h3>
                  <p className="text-gray-600">
                    เข้าสู่ระบบเพื่อดูงานที่คุณลงทะเบียนไว้
                  </p>
                </CardContent>
              </Card>
            ) : myRegistrations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CalendarX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ยังไม่มีการลงทะเบียน
                  </h3>
                  <p className="text-gray-600 mb-4">
                    คุณยังไม่ได้ลงทะเบียนงานใดๆ
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('upcoming')}
                  >
                    ดูงานที่กำลังจะมาถึง
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myRegistrations.map(registration => (
                <Card key={registration.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{registration.eventName}</h3>
                      <Badge className={getRegistrationStatusColor(registration.status)}>
                        <span className="flex items-center gap-1">
                          {getRegistrationStatusIcon(registration.status)}
                          {getRegistrationStatusText(registration.status)}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Schedule Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {formatDate(registration.scheduleDate, 'long')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{registration.scheduleTime}</span>
                      </div>
                    </div>
                    
                    {/* Attendee Info */}
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p className="font-medium mb-1">ผู้เข้าร่วม ({registration.attendeeCount} คน)</p>
                      {registration.students.length > 0 && (
                        <div className="text-gray-600">
                          {registration.students.map((student, idx) => (
                            <p key={idx}>• {student.name} ({student.nickname})</p>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Registration Info */}
                    <div className="pt-2 border-t text-xs text-gray-500">
                      <p>ลงทะเบียนเมื่อ: {formatDate(registration.registeredAt, 'full')}</p>
                      {registration.specialRequest && (
                        <p className="mt-1">หมายเหตุ: {registration.specialRequest}</p>
                      )}
                    </div>
                    
                    {/* Actions based on status */}
                    {registration.status === 'confirmed' && 
                     new Date(registration.scheduleDate) > new Date() && (
                      <div className="pt-2">
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          หากไม่สามารถเข้าร่วมได้ กรุณาติดต่อเจ้าหน้าที่
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}