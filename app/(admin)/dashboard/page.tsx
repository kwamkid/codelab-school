'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calendar, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  // ข้อมูลตัวอย่าง - ในอนาคตจะดึงจาก Firebase
  const stats = [
    {
      title: 'สาขาทั้งหมด',
      value: '2',
      icon: Building2,
      color: 'bg-red-500',
    },
    {
      title: 'นักเรียนทั้งหมด',
      value: '0',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'คลาสที่เปิดสอน',
      value: '0',
      icon: Calendar,
      color: 'bg-purple-500',
    },
    {
      title: 'รายได้เดือนนี้',
      value: '฿0',
      icon: DollarSign,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">ภาพรวมระบบจัดการโรงเรียน</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>การดำเนินการด่วน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                <p className="font-medium">+ เพิ่มนักเรียนใหม่</p>
                <p className="text-sm text-gray-600">ลงทะเบียนนักเรียนเข้าสู่ระบบ</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                <p className="font-medium">+ สร้างคลาสเรียน</p>
                <p className="text-sm text-gray-600">เปิดคลาสเรียนใหม่</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                <p className="font-medium">+ จัดการทดลองเรียน</p>
                <p className="text-sm text-gray-600">ดูรายการจองทดลองเรียน</p>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>ยังไม่มีกิจกรรม</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}