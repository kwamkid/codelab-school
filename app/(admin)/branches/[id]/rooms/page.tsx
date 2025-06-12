'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Room, Branch } from '@/types/models';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { getBranch } from '@/lib/services/branches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Users, ChevronLeft, Building } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import RoomDialog from '@/components/rooms/room-dialog';

export default function RoomsPage() {
  const params = useParams();
  const branchId = params.id as string;
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (branchId) {
      loadData();
    }
  }, [branchId]);

  const loadData = async () => {
    try {
      const [branchData, roomsData] = await Promise.all([
        getBranch(branchId),
        getRoomsByBranch(branchId)
      ]);
      
      setBranch(branchData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = () => {
    setSelectedRoom(null);
    setDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedRoom(null);
  };

  const handleRoomSaved = () => {
    loadData();
    handleDialogClose();
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

  if (!branch) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">ไม่พบข้อมูลสาขา</p>
        <Link href="/branches" className="text-red-500 hover:text-red-600 mt-4 inline-block">
          กลับไปหน้ารายการสาขา
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/branches" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          กลับไปหน้ารายการสาขา
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">จัดการห้องเรียน</h1>
          <p className="text-gray-600 mt-2">
            สาขา{branch.name} ({branch.code})
          </p>
        </div>
        <Button 
          onClick={handleAddRoom}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มห้องเรียน
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ห้องเรียนทั้งหมด</CardTitle>
            <Building className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ห้องที่ใช้งานได้</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rooms.filter(r => r.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ความจุรวม</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rooms.reduce((sum, room) => sum + (room.isActive ? room.capacity : 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการห้องเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีห้องเรียน</h3>
              <p className="text-gray-600 mb-4">เริ่มต้นด้วยการเพิ่มห้องเรียนแรก</p>
              <Button 
                onClick={handleAddRoom}
                className="bg-red-500 hover:bg-red-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มห้องเรียน
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อห้อง</TableHead>
                  <TableHead>ชั้น</TableHead>
                  <TableHead className="text-center">ความจุ</TableHead>
                  <TableHead className="text-center">อุปกรณ์</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id} className={!room.isActive ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>{room.floor || '-'}</TableCell>
                    <TableCell className="text-center">{room.capacity} คน</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        {room.hasProjector && (
                          <Badge variant="secondary" className="text-xs">
                            Projector
                          </Badge>
                        )}
                        {room.hasWhiteboard && (
                          <Badge variant="secondary" className="text-xs">
                            Whiteboard
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {room.isActive ? (
                        <Badge className="bg-green-100 text-green-700">ใช้งานได้</Badge>
                      ) : (
                        <Badge variant="destructive">ปิดใช้งาน</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRoom(room)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Room Dialog */}
      <RoomDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        branchId={branchId}
        room={selectedRoom}
        onSaved={handleRoomSaved}
      />
    </div>
  );
}