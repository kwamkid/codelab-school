'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Parent, Branch } from '@/types/models';
import { createParent, updateParent, checkParentPhoneExists } from '@/lib/services/parents';
import { getActiveBranches } from '@/lib/services/branches';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';
import Link from 'next/link';

interface ParentFormProps {
  parent?: Parent;
  isEdit?: boolean;
}

export default function ParentForm({ parent, isEdit = false }: ParentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  const [formData, setFormData] = useState({
    displayName: parent?.displayName || '',
    phone: parent?.phone || '',
    email: parent?.email || '',
    lineUserId: parent?.lineUserId || '',
    pictureUrl: parent?.pictureUrl || '',
    preferredBranchId: parent?.preferredBranchId || '',
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await getActiveBranches();
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.displayName || !formData.phone) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    // Validate phone format
    const phoneRegex = /^[0-9]{9,10}$/;
    const cleanPhone = formData.phone.replace(/-/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('เบอร์โทรศัพท์ไม่ถูกต้อง');
      return;
    }

    // Validate email format if provided
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('อีเมลไม่ถูกต้อง');
        return;
      }
    }

    setLoading(true);

    try {
      // Check if phone already exists
      const phoneExists = await checkParentPhoneExists(
        cleanPhone,
        isEdit ? parent?.id : undefined
      );

      if (phoneExists) {
        toast.error('เบอร์โทรศัพท์นี้มีอยู่ในระบบแล้ว');
        setLoading(false);
        return;
      }

      const parentData: Omit<Parent, 'id' | 'createdAt' | 'lastLoginAt'> = {
        displayName: formData.displayName,
        phone: cleanPhone,
        ...(formData.email && { email: formData.email }),
        ...(formData.lineUserId && { lineUserId: formData.lineUserId }),
        ...(formData.pictureUrl && { pictureUrl: formData.pictureUrl }),
        ...(formData.preferredBranchId && { preferredBranchId: formData.preferredBranchId }),
      };

      if (isEdit && parent?.id) {
        await updateParent(parent.id, parentData);
        toast.success('อัปเดตข้อมูลผู้ปกครองเรียบร้อยแล้ว');
        router.push(`/parents/${parent.id}`);
      } else {
        const newParentId = await createParent(parentData);
        toast.success('เพิ่มผู้ปกครองใหม่เรียบร้อยแล้ว');
        router.push(`/parents/${newParentId}`);
      }
    } catch (error) {
      console.error('Error saving parent:', error);
      toast.error(isEdit ? 'ไม่สามารถอัปเดตข้อมูลได้' : 'ไม่สามารถเพิ่มผู้ปกครองได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลผู้ปกครอง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">ชื่อ-นามสกุล *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="ชื่อ-นามสกุล"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08x-xxx-xxxx"
                    required
                  />
                  <p className="text-xs text-gray-500">กรอกเบอร์โทร 9-10 หลัก</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="parent@example.com"
                  />
                </div>
              </div>
            </div>

            {/* LINE Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">ข้อมูล LINE (ถ้ามี)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lineUserId">LINE User ID</Label>
                  <Input
                    id="lineUserId"
                    value={formData.lineUserId}
                    onChange={(e) => setFormData({ ...formData, lineUserId: e.target.value })}
                    placeholder="U1234567890abcdef"
                  />
                  <p className="text-xs text-gray-500">จะได้มาเมื่อผู้ปกครองลงทะเบียนผ่าน LINE</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pictureUrl">รูปโปรไฟล์ URL</Label>
                  <Input
                    id="pictureUrl"
                    value={formData.pictureUrl}
                    onChange={(e) => setFormData({ ...formData, pictureUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Preferred Branch */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">สาขาที่สะดวก</h3>
              
              <div className="space-y-2">
                <Label htmlFor="preferredBranchId">สาขาหลัก</Label>
                <Select
                  value={formData.preferredBranchId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, preferredBranchId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสาขา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ไม่ระบุ</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">สาขาที่ผู้ปกครองมาใช้บริการบ่อย</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/parents">
            <Button type="button" variant="outline">
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-red-500 hover:bg-red-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ปกครอง'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}