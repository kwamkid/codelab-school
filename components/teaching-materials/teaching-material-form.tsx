'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeachingMaterial } from '@/types/models';
import { 
  createTeachingMaterial, 
  updateTeachingMaterial 
} from '@/lib/services/teaching-materials';
import { isValidCanvaUrl } from '@/lib/utils/canva';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, X, Plus, Trash2, Link } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TeachingMaterialFormProps {
  subjectId: string;
  material?: TeachingMaterial;
  isEdit?: boolean;
}

export default function TeachingMaterialForm({ 
  subjectId, 
  material, 
  isEdit = false 
}: TeachingMaterialFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testingUrl, setTestingUrl] = useState(false);
  
  const [formData, setFormData] = useState({
    subjectId: subjectId,
    sessionNumber: material?.sessionNumber || 1,
    title: material?.title || '',
    description: material?.description || '',
    objectives: material?.objectives || [''],
    materials: material?.materials || [''],
    preparation: material?.preparation || [''],
    canvaUrl: material?.canvaUrl || '',
    duration: material?.duration || 90,
    teachingNotes: material?.teachingNotes || '',
    tags: material?.tags || [],
    isActive: material?.isActive ?? true,
  });

  // Common tags
  const commonTags = [
    'hands-on',
    'group-work',
    'individual',
    'presentation',
    'assessment',
    'project-based',
    'game-based',
    'competition',
    'review',
    'introduction'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.title || !formData.canvaUrl) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    // Validate Canva URL
    if (!isValidCanvaUrl(formData.canvaUrl)) {
      toast.error('URL ของ Canva ไม่ถูกต้อง');
      return;
    }

    // Remove empty items from arrays
    const cleanedData = {
      ...formData,
      objectives: formData.objectives.filter(obj => obj.trim() !== ''),
      materials: formData.materials.filter(mat => mat.trim() !== ''),
      preparation: formData.preparation.filter(prep => prep.trim() !== ''),
    };

    if (cleanedData.objectives.length === 0) {
      toast.error('กรุณาระบุจุดประสงค์การเรียนรู้อย่างน้อย 1 ข้อ');
      return;
    }

    setLoading(true);

    try {
      if (isEdit && material?.id) {
        await updateTeachingMaterial(material.id, cleanedData, user?.uid || '');
        toast.success('อัปเดตสื่อการสอนเรียบร้อยแล้ว');
      } else {
        await createTeachingMaterial(cleanedData, user?.uid || '');
        toast.success('เพิ่มสื่อการสอนเรียบร้อยแล้ว');
      }
      
      router.push(`/teaching-materials/${subjectId}`);
    } catch (error) {
      console.error('Error saving teaching material:', error);
      toast.error(isEdit ? 'ไม่สามารถอัปเดตสื่อการสอนได้' : 'ไม่สามารถเพิ่มสื่อการสอนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleArrayItemChange = (
    field: 'objectives' | 'materials' | 'preparation',
    index: number,
    value: string
  ) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: 'objectives' | 'materials' | 'preparation') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field: 'objectives' | 'materials' | 'preparation', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const testCanvaUrl = () => {
    if (!formData.canvaUrl) {
      toast.error('กรุณากรอก URL ก่อน');
      return;
    }
    
    if (!isValidCanvaUrl(formData.canvaUrl)) {
      toast.error('URL ของ Canva ไม่ถูกต้อง');
      return;
    }
    
    setTestingUrl(true);
    window.open(formData.canvaUrl, '_blank');
    setTimeout(() => setTestingUrl(false), 1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionNumber">ครั้งที่ *</Label>
                <Input
                  id="sessionNumber"
                  type="number"
                  min="1"
                  value={formData.sessionNumber}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    sessionNumber: parseInt(e.target.value) || 1 
                  })}
                  required
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">ชื่อบทเรียน *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="เช่น Introduction to VEX Robotics"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="อธิบายภาพรวมของบทเรียน"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">ระยะเวลา (นาที) *</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="240"
                step="15"
                value={formData.duration}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  duration: parseInt(e.target.value) || 90 
                })}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Canva URL */}
        <Card>
          <CardHeader>
            <CardTitle>Canva Presentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="canvaUrl">Canva Share URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="canvaUrl"
                  type="url"
                  value={formData.canvaUrl}
                  onChange={(e) => setFormData({ ...formData, canvaUrl: e.target.value })}
                  placeholder="https://www.canva.com/design/..."
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={testCanvaUrl}
                  disabled={testingUrl}
                >
                  {testingUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link className="h-4 w-4" />
                  )}
                  ทดสอบ
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                วิธีการ: เปิด Canva → คลิก Share → คลิก Copy link
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Learning Objectives */}
        <Card>
          <CardHeader>
            <CardTitle>จุดประสงค์การเรียนรู้ *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.objectives.map((objective, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={objective}
                  onChange={(e) => handleArrayItemChange('objectives', index, e.target.value)}
                  placeholder="เช่น เข้าใจหลักการทำงานของหุ่นยนต์"
                />
                {formData.objectives.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem('objectives', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('objectives')}
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มจุดประสงค์
            </Button>
          </CardContent>
        </Card>

        {/* Materials */}
        <Card>
          <CardHeader>
            <CardTitle>อุปกรณ์ที่ใช้</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.materials.map((material, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={material}
                  onChange={(e) => handleArrayItemChange('materials', index, e.target.value)}
                  placeholder="เช่น VEX GO Robot Kit"
                />
                {formData.materials.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem('materials', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('materials')}
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มอุปกรณ์
            </Button>
          </CardContent>
        </Card>

        {/* Preparation */}
        <Card>
          <CardHeader>
            <CardTitle>การเตรียมการก่อนสอน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.preparation.map((prep, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={prep}
                  onChange={(e) => handleArrayItemChange('preparation', index, e.target.value)}
                  placeholder="เช่น ตรวจสอบแบตเตอรี่หุ่นยนต์"
                />
                {formData.preparation.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem('preparation', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('preparation')}
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มรายการ
            </Button>
          </CardContent>
        </Card>

        {/* Teaching Notes */}
        <Card>
          <CardHeader>
            <CardTitle>บันทึกสำหรับครู</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.teachingNotes}
              onChange={(e) => setFormData({ ...formData, teachingNotes: e.target.value })}
              placeholder="เคล็ดลับ, ข้อควรระวัง, หรือข้อแนะนำในการสอน"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>แท็ก</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {commonTags.map(tag => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={formData.tags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <Label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>สถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive" className="font-normal">
                พร้อมใช้งาน
              </Label>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              สื่อการสอนที่ปิดใช้งานจะไม่แสดงให้ครูเห็น
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/teaching-materials/${subjectId}`)}
          >
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
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
                {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มบทเรียน'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}