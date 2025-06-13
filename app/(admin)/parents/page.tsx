'use client';

import { useEffect, useState } from 'react';
import type { Parent } from '@/types/models';
import { getParents, getStudentsByParent } from '@/lib/services/parents';
import { getActiveBranches } from '@/lib/services/branches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Phone, Mail, Eye, Edit } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from '@/lib/utils';

interface ParentWithCount extends Parent {
  studentCount?: number;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<ParentWithCount[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [parentsData, branchesData] = await Promise.all([
        getParents(),
        getActiveBranches()
      ]);
      
      // สร้าง branch map สำหรับ lookup ชื่อสาขา
      const branchMapping: Record<string, string> = {};
      branchesData.forEach(branch => {
        branchMapping[branch.id] = branch.name;
      });
      setBranchMap(branchMapping);
      
      // Load student count for each parent
      const parentsWithCount = await Promise.all(
        parentsData.map(async (parent) => {
          const students = await getStudentsByParent(parent.id);
          return {
            ...parent,
            studentCount: students.filter(s => s.isActive).length
          };
        })
      );
      
      setParents(parentsWithCount);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // Filter parents based on search
  const filteredParents = parents.filter(parent => {
    const term = searchTerm.toLowerCase();
    return (
      parent.displayName.toLowerCase().includes(term) ||
      parent.phone?.toLowerCase().includes(term) ||
      parent.email?.toLowerCase().includes(term)
    );
  });

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

  const stats = {
    totalParents: parents.length,
    totalStudents: parents.reduce((sum, p) => sum + (p.studentCount || 0), 0),
    withLineId: parents.filter(p => p.lineUserId).length,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ปกครอง</h1>
          <p className="text-gray-600 mt-2">จัดการข้อมูลผู้ปกครองและนักเรียน</p>
        </div>
        <Link href="/parents/new">
          <Button className="bg-red-500 hover:bg-red-600">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มผู้ปกครองใหม่
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ผู้ปกครองทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">นักเรียนทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">เชื่อมต่อ LINE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withLineId}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ลงทะเบียนด้วยตนเอง</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.totalParents - stats.withLineId}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Parents Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ปกครอง</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีผู้ปกครอง'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'ลองค้นหาด้วยคำค้นอื่น' : 'เริ่มต้นด้วยการเพิ่มผู้ปกครองคนแรก'}
              </p>
              {!searchTerm && (
                <Link href="/parents/new">
                  <Button className="bg-red-500 hover:bg-red-600">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มผู้ปกครองใหม่
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อผู้ปกครอง</TableHead>
                    <TableHead>ติดต่อ</TableHead>
                    <TableHead className="text-center">จำนวนลูก</TableHead>
                    <TableHead className="text-center">LINE</TableHead>
                    <TableHead>สาขาหลัก</TableHead>
                    <TableHead>วันที่ลงทะเบียน</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {parent.pictureUrl ? (
                            <img
                              src={parent.pictureUrl}
                              alt={parent.displayName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{parent.displayName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {parent.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {parent.phone}
                            </div>
                          )}
                          {parent.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {parent.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {parent.studentCount || 0} คน
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {parent.lineUserId ? (
                          <Badge className="bg-green-100 text-green-700">
                            เชื่อมต่อแล้ว
                          </Badge>
                        ) : (
                          <Badge variant="outline">ยังไม่เชื่อมต่อ</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {parent.preferredBranchId ? (
                          <Badge variant="outline">
                            {branchMap[parent.preferredBranchId] || parent.preferredBranchId}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(parent.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/parents/${parent.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/parents/${parent.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}