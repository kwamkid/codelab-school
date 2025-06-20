'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Room, Branch } from '@/types/models';
import { getRoomsByBranch } from '@/lib/services/rooms';
import { getBranches } from '@/lib/services/branches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Edit, 
  DoorOpen, 
  MapPin,
  Search
} from 'lucide-react';
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoomDialog from '@/components/rooms/room-dialog';

interface RoomWithBranch extends Room {
  branchName: string;
  branchCode: string;
}

export default function RoomsPage() {
  const searchParams = useSearchParams();
  const initialBranchId = searchParams.get('branch');
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allRooms, setAllRooms] = useState<RoomWithBranch[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<RoomWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
const [selectedRoom, setSelectedRoom] = useState<RoomWithBranch | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Set initial filter if branch ID is provided
    if (initialBranchId && branches.length > 0) {
      setFilterBranch(initialBranchId);
    }
  }, [initialBranchId, branches]);

  useEffect(() => {
    filterData();
  }, [allRooms, filterBranch, searchTerm]);

  const loadData = async () => {
    try {
      const branchesData = await getBranches();
      setBranches(branchesData);

      // Load rooms from all branches
      const roomsPromises = branchesData.map(async (branch) => {
        const rooms = await getRoomsByBranch(branch.id);
        return rooms.map(room => ({
          ...room,
          branchName: branch.name,
          branchCode: branch.code
        }));
      });

      const roomsArrays = await Promise.all(roomsPromises);
      const allRoomsData = roomsArrays.flat();
      setAllRooms(allRoomsData);
      setFilteredRooms(allRoomsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...allRooms];

    // Filter by branch
    if (filterBranch !== 'all') {
      filtered = filtered.filter(room => room.branchId === filterBranch);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(room => 
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.floor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRooms(filtered);
  };

const handleAddRoom = () => {
  if (branches.length === 0) {
    toast.error('กรุณาสร้างสาขาก่อน');
    return;
  }
  setSelectedRoom(null);
  // ตั้งค่า branch ID ให้ถูกต้อง
  const defaultBranchId = filterBranch !== 'all' ? filterBranch : branches[0].id;
  setSelectedBranchId(defaultBranchId);
  setDialogOpen(true);
};

  const handleEditRoom = (room: RoomWithBranch) => {
    // แปลง RoomWithBranch เป็น Room โดยตัดฟิลด์ที่เพิ่มมาออก
    const { branchName, branchCode, ...roomData } = room;
    setSelectedRoom(roomData);
    setSelectedBranchId(room.branchId);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedRoom(null);
    setSelectedBranchId('');
  };

  const handleRoomSaved = () => {
    loadData();
    handleDialogClose();
  };

  // Count branches without rooms
  const branchesWithoutRooms = branches.filter(branch => 
    !allRooms.some(room => room.branchId === branch.id && room.isActive)
  ).length;

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
          <h1 className="text-3xl font-bold text-gray-900">จัดการห้องเรียน</h1>
          <p className="text-gray-600 mt-2">จัดการห้องเรียนทุกสาขา</p>
        </div>
        <Button 
          onClick={handleAddRoom}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มห้องเรียน
        </Button>
      </div>

      {/* Warning if branches without rooms */}
      {branchesWithoutRooms > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            <span className="font-medium">⚠️ มี {branchesWithoutRooms} สาขาที่ยังไม่มีห้องเรียน</span>
            {' - '}คลิกปุ่ม "เพิ่มห้องเรียน" เพื่อสร้างห้องให้สาขาเหล่านั้น
          </p>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ค้นหาชื่อห้อง, สาขา, ชั้น..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสาขา</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการห้องเรียน ({filteredRooms.length} ห้อง)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              {allRooms.length === 0 ? (
                <>
                  <DoorOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีห้องเรียน</h3>
                  <p className="text-gray-600 mb-4">เริ่มต้นด้วยการเพิ่มห้องเรียนแรก</p>
                  <Button 
                    onClick={handleAddRoom}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มห้องเรียน
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูลที่ค้นหา</h3>
                  <p className="text-gray-600">ลองปรับเงื่อนไขการค้นหาใหม่</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สาขา</TableHead>
                  <TableHead>ชื่อห้อง</TableHead>
                  <TableHead>ชั้น</TableHead>
                  <TableHead className="text-center">ความจุ</TableHead>
                  <TableHead className="text-center">อุปกรณ์</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => (
                  <TableRow key={`${room.branchId}-${room.id}`} className={!room.isActive ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{room.branchName}</div>
                          <div className="text-xs text-gray-500">{room.branchCode}</div>
                        </div>
                      </div>
                    </TableCell>
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
        branchId={selectedBranchId}
        room={selectedRoom}
        onSaved={handleRoomSaved}
        branches={branches}
        onBranchChange={(branchId: string) => setSelectedBranchId(branchId)}
      />
    </div>
  );
}