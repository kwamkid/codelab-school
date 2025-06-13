'use client';

import { useEffect, useState } from 'react';
import { Holiday, Branch } from '@/types/models';
import { getHolidays, deleteHoliday, deleteAllHolidays } from '@/lib/services/holidays';
import { getActiveBranches } from '@/lib/services/branches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Edit, Trash2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { formatDate } from '@/lib/utils';
import HolidayDialog from '@/components/holidays/holiday-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [rescheduleAllDialogOpen, setRescheduleAllDialogOpen] = useState(false);
  const [rescheduleAllLoading, setRescheduleAllLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      const [holidaysData, branchesData] = await Promise.all([
        getHolidays(selectedYear),
        getActiveBranches()
      ]);
      setHolidays(holidaysData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = () => {
    setSelectedHoliday(null);
    setDialogOpen(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setDialogOpen(true);
  };

  const handleDeleteHoliday = async (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    
    try {
      await deleteHoliday(holidayToDelete.id);
      toast.success('ลบวันหยุดเรียบร้อยแล้ว');
      
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('ไม่สามารถลบวันหยุดได้');
    }
  };

  const handleRescheduleAllClasses = () => {
    setRescheduleAllDialogOpen(true);
  };

  const confirmRescheduleAllClasses = async () => {
    setRescheduleAllLoading(true);
    try {
      const { rescheduleAllClasses } = await import('@/lib/services/reschedule');
      const result = await rescheduleAllClasses();
      
      if (result.processedCount > 0) {
        toast.success(
          `จัดตารางเรียนใหม่เรียบร้อยแล้ว ประมวลผล ${result.processedCount} คลาส`,
          { duration: 5000 }
        );
      } else {
        toast.info('ไม่พบคลาสที่ต้องจัดตารางใหม่');
      }
      
      setRescheduleAllDialogOpen(false);
    } catch (error) {
      console.error('Error rescheduling all classes:', error);
      toast.error('ไม่สามารถจัดตารางเรียนใหม่ได้');
    } finally {
      setRescheduleAllLoading(false);
    }
  };

  const handleDeleteAllHolidays = async () => {
    try {
      const count = await deleteAllHolidays(selectedYear);
      toast.success(`ลบวันหยุดทั้งหมด ${count} วันเรียบร้อยแล้ว`);
      loadData();
    } catch (error) {
      console.error('Error deleting all holidays:', error);
      toast.error('ไม่สามารถลบวันหยุดทั้งหมดได้');
    }
  };

  const handleHolidaySaved = () => {
    loadData();
    setDialogOpen(false);
  };

  // Filter holidays
  const filteredHolidays = holidays.filter(holiday => {
    if (selectedBranch === 'all') return true;
    if (selectedBranch === 'national') return holiday.type === 'national';
    return holiday.branches?.includes(selectedBranch);
  });

  // Group holidays by month
  const holidaysByMonth = filteredHolidays.reduce((acc, holiday) => {
    const month = new Date(holiday.date).getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<number, Holiday[]>);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

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
          <h1 className="text-3xl font-bold text-gray-900">จัดการวันหยุด</h1>
          <p className="text-gray-600 mt-2">กำหนดวันหยุดประจำปีและวันหยุดพิเศษของแต่ละสาขา</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleRescheduleAllClasses}
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            จัดตารางใหม่ทั้งหมด
          </Button>
          {filteredHolidays.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบทั้งหมด
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-xl">
                      ยืนยันการลบวันหยุดทั้งหมด
                    </AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="mt-4">
                    <div className="space-y-2">
                      <p>คุณแน่ใจหรือไม่ที่จะลบวันหยุดทั้งหมดในปี {selectedYear}?</p>
                      <p className="font-medium text-red-600">
                        จะลบวันหยุด {filteredHolidays.length} วัน
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                        <p className="text-sm text-amber-800">
                          <strong>คำเตือน:</strong> หลังจากลบแล้ว ให้ใช้ปุ่ม "จัดตารางใหม่ทั้งหมด" เพื่อปรับตารางเรียน
                        </p>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAllHolidays}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    ยืนยันลบทั้งหมด
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button 
            onClick={handleAddHoliday}
            className="bg-red-500 hover:bg-red-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มวันหยุด
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select 
          value={selectedYear.toString()} 
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="เลือกสาขา" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="national">วันหยุดทุกสาขา</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">วันหยุดทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredHolidays.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">วันหยุดทุกสาขา</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredHolidays.filter(h => h.type === 'national').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">วันหยุดประจำสาขา</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredHolidays.filter(h => h.type === 'branch').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holidays by Month */}
      {Object.keys(holidaysByMonth).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีวันหยุด</h3>
            <p className="text-gray-600 mb-4">เริ่มต้นด้วยการเพิ่มวันหยุดแรก</p>
            <Button 
              onClick={handleAddHoliday}
              className="bg-red-500 hover:bg-red-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มวันหยุด
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(holidaysByMonth)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([month, monthHolidays]) => (
              <Card key={month}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {monthNames[parseInt(month)]} {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ชื่อวันหยุด</TableHead>
                        <TableHead>ประเภท</TableHead>
                        <TableHead>สาขาที่หยุด</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthHolidays
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((holiday) => (
                          <TableRow key={holiday.id}>
                            <TableCell className="font-medium">
                              {formatDate(holiday.date, 'long')}
                            </TableCell>
                            <TableCell>{holiday.name}</TableCell>
                            <TableCell>
                              <Badge className={
                                holiday.type === 'national' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }>
                                {holiday.type === 'national' ? 'ทุกสาขา' : 'ประจำสาขา'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {holiday.type === 'national' ? (
                                <Badge variant="secondary">ทุกสาขา</Badge>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {holiday.branches?.map(branchId => {
                                    const branch = branches.find(b => b.id === branchId);
                                    return branch ? (
                                      <Badge key={branchId} variant="outline" className="text-xs">
                                        {branch.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditHoliday(holiday)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteHoliday(holiday)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Holiday Dialog */}
      <HolidayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        holiday={selectedHoliday}
        branches={branches}
        onSaved={handleHolidaySaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">
                ยืนยันการลบวันหยุด
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4">
              <p>
                คุณแน่ใจหรือไม่ที่จะลบวันหยุด <strong>&quot;{holidayToDelete?.name}&quot;</strong>?
                <br />
                วันที่ {holidayToDelete && formatDate(holidayToDelete.date, 'long')}
              </p>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>หมายเหตุ:</strong> หลังจากลบวันหยุดแล้ว คุณสามารถใช้ปุ่ม &quot;จัดตารางใหม่ทั้งหมด&quot; 
                  เพื่อปรับตารางเรียนให้ถูกต้อง
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <Button
              onClick={confirmDeleteHoliday}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              ยืนยันลบ
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule All Classes Dialog */}
      <AlertDialog open={rescheduleAllDialogOpen} onOpenChange={setRescheduleAllDialogOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <RefreshCw className="h-6 w-6 text-blue-600" />
              </div>
              <AlertDialogTitle className="text-xl">
                จัดตารางเรียนใหม่ทั้งหมด
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4">
              <div className="space-y-3">
                <p>
                  ระบบจะจัดตารางเรียนใหม่ทั้งหมดให้ตรงกับจำนวนครั้งที่กำหนดในแต่ละคลาส
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    ระบบจะดำเนินการ:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• ลบตารางเรียนเดิมทั้งหมด</li>
                    <li>• สร้างตารางเรียนใหม่โดยหลบวันหยุดปัจจุบัน</li>
                    <li>• ปรับวันสิ้นสุดคลาสให้ตรงกับตารางจริง</li>
                    <li>• รับประกันว่าจะได้จำนวนครั้งเรียนตามที่กำหนด</li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>คำเตือน:</strong> การทำงานนี้จะใช้เวลาสักครู่ กรุณาอย่าปิดหน้าจอ
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rescheduleAllLoading}>ยกเลิก</AlertDialogCancel>
            <Button
              onClick={confirmRescheduleAllClasses}
              className="bg-blue-500 hover:bg-blue-600"
              disabled={rescheduleAllLoading}
            >
              {rescheduleAllLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังจัดตารางใหม่...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  เริ่มจัดตารางใหม่
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}