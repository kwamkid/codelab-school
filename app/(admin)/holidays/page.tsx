'use client';

import { useEffect, useState } from 'react';
import { Holiday, Branch } from '@/types/models';
import { getHolidays, addHoliday, updateHoliday, deleteHoliday } from '@/lib/services/holidays';
import { getActiveBranches } from '@/lib/services/branches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Edit, Trash2, Building } from 'lucide-react';
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

  const handleDeleteHoliday = async (id: string) => {
    try {
      const revertedCount = await deleteHoliday(id);
      
      if (revertedCount > 0) {
        toast.success(
          `ลบวันหยุดเรียบร้อยแล้ว และได้คืนตารางเรียน ${revertedCount} คลาสกลับวันเดิม`,
          { duration: 5000 }
        );
      } else {
        toast.success('ลบวันหยุดเรียบร้อยแล้ว');
      }
      
      loadData();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('ไม่สามารถลบวันหยุดได้');
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
        <Button 
          onClick={handleAddHoliday}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มวันหยุด
        </Button>
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
            <SelectItem value="national">วันหยุดนักขัตฤกษ์</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
            <CardTitle className="text-sm font-medium">วันหยุดนักขัตฤกษ์</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredHolidays.filter(h => h.type === 'national').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">วันหยุดสาขา</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredHolidays.filter(h => h.type === 'branch').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">วันหยุดพิเศษ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredHolidays.filter(h => h.type === 'special').length}
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
                        <TableHead className="text-center">ปิดโรงเรียน</TableHead>
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
                                holiday.type === 'branch' ? 'bg-green-100 text-green-700' :
                                'bg-orange-100 text-orange-700'
                              }>
                                {holiday.type === 'national' ? 'นักขัตฤกษ์' :
                                 holiday.type === 'branch' ? 'วันหยุดสาขา' : 'วันหยุดพิเศษ'}
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
                            <TableCell className="text-center">
                              {holiday.isSchoolClosed ? (
                                <Badge className="bg-red-100 text-red-700">ปิด</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700">เปิด</Badge>
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
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>ยืนยันการลบวันหยุด</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        คุณแน่ใจหรือไม่ที่จะลบวันหยุด "{holiday.name}"?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteHoliday(holiday.id)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        ลบ
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
    </div>
  );
}