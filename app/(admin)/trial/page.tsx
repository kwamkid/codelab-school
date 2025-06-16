// app/(admin)/trial/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  TestTube, 
  Plus, 
  Phone,
  Mail,
  Users,
  Calendar,
  Clock,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  UserPlus,
  PhoneCall,
  CalendarCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrialBooking } from '@/types/models';
import { getTrialBookings, getTrialBookingStats } from '@/lib/services/trial-bookings';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig = {
  new: { label: 'ใหม่', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  contacted: { label: 'ติดต่อแล้ว', color: 'bg-yellow-100 text-yellow-700', icon: PhoneCall },
  scheduled: { label: 'นัดหมายแล้ว', color: 'bg-purple-100 text-purple-700', icon: CalendarCheck },
  completed: { label: 'เรียนแล้ว', color: 'bg-green-100 text-green-700', icon: Check },
  converted: { label: 'ลงทะเบียนแล้ว', color: 'bg-emerald-100 text-emerald-700', icon: UserPlus },
  cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-700', icon: X }
};

const sourceConfig = {
  online: { label: 'Online', color: 'bg-blue-100 text-blue-700' },
  walkin: { label: 'Walk-in', color: 'bg-green-100 text-green-700' },
  phone: { label: 'โทรศัพท์', color: 'bg-purple-100 text-purple-700' }
};

export default function TrialBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<TrialBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<TrialBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadBookings();
    loadStats();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, selectedStatus]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await getTrialBookings();
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getTrialBookingStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(b => b.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.parentName.toLowerCase().includes(term) ||
        b.parentPhone.includes(term) ||
        b.students.some(s => s.name.toLowerCase().includes(term))
      );
    }

    setFilteredBookings(filtered);
  };

  const getStatusBadge = (status: TrialBooking['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: TrialBooking['source']) => {
    const config = sourceConfig[source];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8 text-red-500" />
            จองทดลองเรียน
          </h1>
          <p className="text-gray-600 mt-2">จัดการการจองทดลองเรียนทั้งหมด</p>
        </div>
        <Button 
          onClick={() => router.push('/trial/new')}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มการจอง (Walk-in)
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-gray-600">ทั้งหมด</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {stats.byStatus.new || 0}
              </div>
              <p className="text-sm text-gray-600">รอติดต่อ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {stats.byStatus.scheduled || 0}
              </div>
              <p className="text-sm text-gray-600">นัดหมายแล้ว</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {stats.byStatus.converted || 0}
              </div>
              <p className="text-sm text-gray-600">ลงทะเบียนแล้ว</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-600">
                {stats.conversionRate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">อัตราการแปลง</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ปกครอง, นักเรียน หรือเบอร์โทร..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList>
          <TabsTrigger value="all">ทั้งหมด ({bookings.length})</TabsTrigger>
          <TabsTrigger value="new">
            ใหม่ ({bookings.filter(b => b.status === 'new').length})
          </TabsTrigger>
          <TabsTrigger value="contacted">
            ติดต่อแล้ว ({bookings.filter(b => b.status === 'contacted').length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            นัดหมายแล้ว ({bookings.filter(b => b.status === 'scheduled').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            เรียนแล้ว ({bookings.filter(b => b.status === 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="converted">
            ลงทะเบียน ({bookings.filter(b => b.status === 'converted').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <Clock className="h-5 w-5 animate-spin" />
                กำลังโหลด...
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีการจองทดลองเรียน'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{booking.parentName}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.parentPhone}
                              </span>
                              {booking.parentEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {booking.parentEmail}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSourceBadge(booking.source)}
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>

                        {/* Students */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Users className="h-4 w-4" />
                            นักเรียน ({booking.students.length} คน)
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {booking.students.map((student, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                                <div className="font-medium">{student.name}</div>
                                {student.schoolName && (
                                  <div className="text-gray-600">
                                    {student.schoolName} {student.gradeLevel && `(${student.gradeLevel})`}
                                  </div>
                                )}
                                {student.subjectInterests.length > 0 && (
                                  <div className="mt-1">
                                    <span className="text-gray-500">สนใจ:</span>{' '}
                                    <span className="text-red-600">
                                      {student.subjectInterests.length} วิชา
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(booking.createdAt)}
                            </span>
                            {booking.contactedAt && (
                              <span className="flex items-center gap-1">
                                <PhoneCall className="h-3 w-3" />
                                ติดต่อเมื่อ {formatDate(booking.contactedAt)}
                              </span>
                            )}
                          </div>
                          <Link href={`/trial/${booking.id}`}>
                            <Button variant="outline" size="sm">
                              ดูรายละเอียด
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}