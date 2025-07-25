'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Edit,
  Trash2,
  BookOpen,
  Clock,
  Copy,
  GripVertical,
  Eye,
  EyeOff,
  Play,
  Loader2
} from 'lucide-react';
import { getSubject } from '@/lib/services/subjects';
import { 
  getTeachingMaterials, 
  deleteTeachingMaterial,
  reorderTeachingMaterials,
  duplicateTeachingMaterial 
} from '@/lib/services/teaching-materials';
import { Subject, TeachingMaterial } from '@/types/models';
import { toast } from 'sonner';
import { ActionButton } from '@/components/ui/action-button';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function SubjectMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const subjectId = params.subjectId as string;
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<TeachingMaterial | null>(null);

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    try {
      const [subjectData, materialsData] = await Promise.all([
        getSubject(subjectId),
        getTeachingMaterials(subjectId)
      ]);
      
      setSubject(subjectData);
      setMaterials(materialsData.sort((a, b) => a.sessionNumber - b.sessionNumber));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    
    try {
      await deleteTeachingMaterial(materialToDelete.id);
      toast.success('ลบสื่อการสอนเรียบร้อยแล้ว');
      loadData();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('ไม่สามารถลบสื่อการสอนได้');
    } finally {
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
    }
  };

  const handleDuplicate = async (materialId: string) => {
    try {
      await duplicateTeachingMaterial(materialId, user?.uid || '');
      toast.success('คัดลอกสื่อการสอนเรียบร้อยแล้ว');
      loadData();
    } catch (error) {
      console.error('Error duplicating material:', error);
      toast.error('ไม่สามารถคัดลอกสื่อการสอนได้');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const items = [...materials];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    
    setMaterials(items);
    setReordering(true);
    
    try {
      const materialIds = items.map(item => item.id);
      await reorderTeachingMaterials(subjectId, materialIds);
      toast.success('จัดเรียงลำดับเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error reordering materials:', error);
      toast.error('ไม่สามารถจัดเรียงลำดับได้');
      loadData();
    } finally {
      setReordering(false);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === materials.length - 1) return;
    
    const items = [...materials];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    
    setMaterials(items);
    setReordering(true);
    
    try {
      const materialIds = items.map(item => item.id);
      await reorderTeachingMaterials(subjectId, materialIds);
      toast.success('จัดเรียงลำดับเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error reordering materials:', error);
      toast.error('ไม่สามารถจัดเรียงลำดับได้');
      loadData();
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto" />
          <p className="text-gray-600 mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">ไม่พบข้อมูลวิชา</p>
        <Link href="/teaching-materials">
          <Button className="mt-4">กลับไปหน้าหลัก</Button>
        </Link>
      </div>
    );
  }

  const activeMaterials = materials.filter(m => m.isActive);
  const inactiveMaterials = materials.filter(m => !m.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Link href="/teaching-materials">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{subject.name}</h1>
          <p className="text-gray-600 mt-1">จัดการสื่อการสอนและ Slides</p>
        </div>
        <ActionButton
          action="create"
          onClick={() => router.push(`/teaching-materials/${subjectId}/new`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มบทเรียน
        </ActionButton>
      </div>

      {/* Subject Info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">รหัสวิชา</p>
              <p className="font-medium">{subject.code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">หมวดหมู่</p>
              <Badge>{subject.category}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">ระดับ</p>
              <Badge variant="outline">{subject.level}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">อายุ</p>
              <p className="font-medium">{subject.ageRange.min}-{subject.ageRange.max} ปี</p>
            </div>
          </div>
          {subject.description && (
            <p className="text-gray-600 mt-4">{subject.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">บทเรียนทั้งหมด</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">พร้อมใช้งาน</p>
                <p className="text-2xl font-bold">{activeMaterials.length}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">เวลารวม</p>
                <p className="text-2xl font-bold">
                  {Math.floor(materials.reduce((sum, m) => sum + m.duration, 0) / 60)} ชม.
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ยังไม่มีสื่อการสอน</p>
            <ActionButton
              action="create"
              onClick={() => router.push(`/teaching-materials/${subjectId}/new`)}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มบทเรียนแรก
            </ActionButton>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Materials */}
          {activeMaterials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>บทเรียนที่ใช้งาน</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ครั้งที่</TableHead>
                    <TableHead>ชื่อบทเรียน</TableHead>
                    <TableHead>แท็ก</TableHead>
                    <TableHead className="text-center">ระยะเวลา</TableHead>
                    <TableHead className="text-center">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMaterials.map((material, index) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">
                          #{material.sessionNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.title}</p>
                          {material.description && (
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {material.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {material.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{material.duration} นาที</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0 || reordering}
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === activeMaterials.length - 1 || reordering}
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Preview functionality
                              toast.info('กำลังพัฒนาฟีเจอร์ Preview');
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/teaching-materials/${subjectId}/${material.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                แก้ไข
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(material.id)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                คัดลอก
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => {
                                  setMaterialToDelete(material);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                ลบ
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Inactive Materials */}
          {inactiveMaterials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeOff className="h-5 w-5" />
                  บทเรียนที่ไม่ใช้งาน
                </CardTitle>
              </CardHeader>
              <Table>
                <TableBody>
                  {inactiveMaterials.map((material) => (
                    <TableRow key={material.id} className="opacity-60">
                      <TableCell className="font-medium">
                        <Badge variant="secondary">
                          #{material.sessionNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>{material.title}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/teaching-materials/${subjectId}/${material.id}/edit`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          แก้ไข
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสื่อการสอน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ "{materialToDelete?.title}" ใช่หรือไม่? 
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบสื่อการสอน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}