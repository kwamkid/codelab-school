'use client';

import { useEffect, useState } from 'react';
import { Branch } from '@/types/models';
import { getBranches } from '@/lib/services/branches';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, MapPin, Phone, Clock, Users, MoreVertical, DoorOpen } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDayName } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

interface BranchWithRoomCount extends Branch {
  roomCount: number;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchWithRoomCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      
      // Load room count for each branch
      const branchesWithRoomCount = await Promise.all(
        data.map(async (branch) => {
          const rooms = await getRoomsByBranch(branch.id);
          const activeRooms = rooms.filter(room => room.isActive);
          return {
            ...branch,
            roomCount: activeRooms.length
          };
        })
      );
      
      setBranches(branchesWithRoomCount);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('ไม่สามารถโหลดข้อมูลสาขาได้');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">จัดการสาขา</h1>
          <p className="text-gray-600 mt-2">จัดการข้อมูลสาขาทั้งหมด</p>
        </div>
        <Link href="/branches/new">
          <Button className="bg-red-500 hover:bg-red-600">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มสาขาใหม่
          </Button>
        </Link>
      </div>

      {branches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีสาขา</h3>
            <p className="text-gray-600 mb-4">เริ่มต้นด้วยการเพิ่มสาขาแรกของคุณ</p>
            <Link href="/branches/new">
              <Button className="bg-red-500 hover:bg-red-600">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มสาขาใหม่
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id} className={!branch.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {branch.name}
                      {!branch.isActive && (
                        <span className="ml-2 text-sm font-normal text-red-500">(ปิดชั่วคราว)</span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">รหัสสาขา: {branch.code}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/branches/${branch.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          แก้ไข
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/rooms?branch=${branch.id}`}>
                          <DoorOpen className="h-4 w-4 mr-2" />
                          ดูห้องเรียน
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Room Count - แสดงเด่นชัด */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <DoorOpen className="h-5 w-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      ห้องเรียน: {branch.roomCount > 0 ? (
                        <span className="text-green-600">{branch.roomCount} ห้อง</span>
                      ) : (
                        <span className="text-red-600">ยังไม่มีห้อง</span>
                      )}
                    </p>
                    {branch.roomCount === 0 && (
                      <Link 
                        href={`/rooms?branch=${branch.id}`}
                        className="text-xs text-red-500 hover:text-red-600 underline"
                      >
                        คลิกเพื่อเพิ่มห้อง
                      </Link>
                    )}
                  </div>
                  {branch.roomCount === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      ต้องสร้าง
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-sm text-gray-600">{branch.address}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600">{branch.phone}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {branch.openTime} - {branch.closeTime} น.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    ผู้จัดการ: {branch.managerName || '-'}
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    เปิดทำการ: {branch.openDays.map(day => getDayName(day)).join(', ')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}