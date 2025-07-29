'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Event, Branch } from '@/types/models';
import { createEvent, updateEvent } from '@/lib/services/events';
import { getActiveBranches } from '@/lib/services/branches';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { 
  Loader2, 
  Save, 
  X, 
  Calendar,
  MapPin,
  Users,
  Bell,
  Plus,
  Trash2,
  Image
} from 'lucide-react';
import Link from 'next/link';

interface EventFormProps {
  event?: Event;
  isEdit?: boolean;
}

export default function EventForm({ event, isEdit = false }: EventFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: event?.name || '',
    description: event?.description || '',
    fullDescription: event?.fullDescription || '',
    imageUrl: event?.imageUrl || '',
    location: event?.location || '',
    locationUrl: event?.locationUrl || '',
    branchIds: event?.branchIds || [],
    eventType: event?.eventType || 'open-house' as Event['eventType'],
    highlights: event?.highlights || [''],
    targetAudience: event?.targetAudience || '',
    whatToBring: event?.whatToBring || [''],
    registrationStartDate: event?.registrationStartDate 
      ? new Date(event.registrationStartDate).toISOString().split('T')[0] 
      : '',
    registrationEndDate: event?.registrationEndDate 
      ? new Date(event.registrationEndDate).toISOString().split('T')[0] 
      : '',
    countingMethod: event?.countingMethod || 'registrations' as Event['countingMethod'],
    enableReminder: event?.enableReminder ?? true,
    reminderDaysBefore: event?.reminderDaysBefore || 1,
    reminderTime: event?.reminderTime || '10:00',
    status: event?.status || 'draft' as Event['status'],
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
    if (!formData.name || !formData.description || !formData.location) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (!formData.registrationStartDate || !formData.registrationEndDate) {
      toast.error('กรุณาเลือกวันเปิด-ปิดรับลงทะเบียน');
      return;
    }

    if (formData.branchIds.length === 0) {
      toast.error('กรุณาเลือกสาขาที่จัด Event อย่างน้อย 1 สาขา');
      return;
    }

    const startDate = new Date(formData.registrationStartDate);
    const endDate = new Date(formData.registrationEndDate);
    if (startDate > endDate) {
      toast.error('วันเปิดรับลงทะเบียนต้องมาก่อนวันปิด');
      return;
    }

    setLoading(true);

    try {
      const eventData = {
        ...formData,
        registrationStartDate: startDate,
        registrationEndDate: endDate,
        highlights: formData.highlights.filter(h => h.trim()),
        whatToBring: formData.whatToBring.filter(w => w.trim()),
      };

      if (isEdit && event?.id) {
        await updateEvent(event.id, eventData, user!.uid);
        toast.success('อัปเดต Event เรียบร้อยแล้ว');
        router.push(`/events/${event.id}`);
      } else {
        const newEventId = await createEvent(eventData, user!.uid);
        toast.success('สร้าง Event เรียบร้อยแล้ว');
        router.push(`/events/${newEventId}`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(isEdit ? 'ไม่สามารถอัปเดต Event ได้' : 'ไม่สามารถสร้าง Event ได้');
    } finally {
      setLoading(false);
    }
  };

  const addHighlight = () => {
    setFormData({ ...formData, highlights: [...formData.highlights, ''] });
  };

  const removeHighlight = (index: number) => {
    setFormData({
      ...formData,
      highlights: formData.highlights.filter((_, i) => i !== index)
    });
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...formData.highlights];
    newHighlights[index] = value;
    setFormData({ ...formData, highlights: newHighlights });
  };

  const addWhatToBring = () => {
    setFormData({ ...formData, whatToBring: [...formData.whatToBring, ''] });
  };

  const removeWhatToBring = (index: number) => {
    setFormData({
      ...formData,
      whatToBring: formData.whatToBring.filter((_, i) => i !== index)
    });
  };

  const updateWhatToBring = (index: number, value: string) => {
    const newItems = [...formData.whatToBring];
    newItems[index] = value;
    setFormData({ ...formData, whatToBring: newItems });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
            <CardDescription>ข้อมูลทั่วไปของ Event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ Event *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น Open House 2024"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="eventType">ประเภท Event *</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => setFormData({ ...formData, eventType: value as Event['eventType'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open-house">Open House</SelectItem>
                    <SelectItem value="parent-meeting">Parent Meeting</SelectItem>
                    <SelectItem value="showcase">Showcase</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบายสั้นๆ *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="อธิบาย Event ในไม่กี่ประโยค"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">รายละเอียดแบบเต็ม</Label>
              <Textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม รองรับ Markdown"
                rows={6}
              />
              <p className="text-xs text-gray-500">รองรับ Markdown สำหรับจัดรูปแบบข้อความ</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL รูปภาพ Event</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                />
                {formData.imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(formData.imageUrl, '_blank')}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Branches */}
        <Card>
          <CardHeader>
            <CardTitle>สถานที่และสาขา</CardTitle>
            <CardDescription>กำหนดสถานที่จัดงานและสาขาที่เกี่ยวข้อง</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">สถานที่จัดงาน *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="เช่น อาคาร A ชั้น 3"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="locationUrl">Google Maps URL</Label>
                <Input
                  id="locationUrl"
                  type="url"
                  value={formData.locationUrl}
                  onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>สาขาที่จัด Event *</Label>
              <div className="space-y-2 p-4 border rounded-lg">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={branch.id}
                      checked={formData.branchIds.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            branchIds: [...formData.branchIds, branch.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            branchIds: formData.branchIds.filter(id => id !== branch.id)
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={branch.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {branch.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียด Event</CardTitle>
            <CardDescription>ข้อมูลเพิ่มเติมสำหรับผู้เข้าร่วม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetAudience">กลุ่มเป้าหมาย</Label>
              <Input
                id="targetAudience"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="เช่น ผู้ปกครองและนักเรียนอายุ 6-12 ปี"
              />
            </div>

            <div className="space-y-2">
              <Label>จุดเด่นของงาน</Label>
              <div className="space-y-2">
                {formData.highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                      placeholder="เช่น พบปะครูผู้สอน"
                    />
                    {formData.highlights.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHighlight(index)}
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
                  onClick={addHighlight}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มจุดเด่น
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>สิ่งที่ควรนำมา</Label>
              <div className="space-y-2">
                {formData.whatToBring.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateWhatToBring(index, e.target.value)}
                      placeholder="เช่น สมุดจดบันทึก"
                    />
                    {formData.whatToBring.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWhatToBring(index)}
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
                  onClick={addWhatToBring}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มรายการ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>การลงทะเบียน</CardTitle>
            <CardDescription>กำหนดช่วงเวลาและวิธีนับจำนวนผู้เข้าร่วม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationStartDate">วันเปิดรับลงทะเบียน *</Label>
                <Input
                  id="registrationStartDate"
                  type="date"
                  value={formData.registrationStartDate}
                  onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="registrationEndDate">วันปิดรับลงทะเบียน *</Label>
                <Input
                  id="registrationEndDate"
                  type="date"
                  value={formData.registrationEndDate}
                  onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="countingMethod">วิธีนับจำนวน *</Label>
              <Select
                value={formData.countingMethod}
                onValueChange={(value) => setFormData({ ...formData, countingMethod: value as Event['countingMethod'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registrations">นับจำนวนการลงทะเบียน</SelectItem>
                  <SelectItem value="students">นับจำนวนนักเรียน</SelectItem>
                  <SelectItem value="parents">นับจำนวนผู้ปกครอง</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.countingMethod === 'registrations' && 'นับทุกการลงทะเบียนเป็น 1'}
                {formData.countingMethod === 'students' && 'นับจำนวนนักเรียนที่ลงทะเบียน'}
                {formData.countingMethod === 'parents' && 'นับจำนวนผู้ปกครองที่ลงทะเบียน'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle>การแจ้งเตือน</CardTitle>
            <CardDescription>ตั้งค่าการแจ้งเตือนผู้ลงทะเบียน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>เปิดการแจ้งเตือนอัตโนมัติ</Label>
                <p className="text-sm text-gray-500">
                  ส่งการแจ้งเตือนให้ผู้ที่ลงทะเบียนผ่าน LINE
                </p>
              </div>
              <Switch
                checked={formData.enableReminder}
                onCheckedChange={(checked) => setFormData({ ...formData, enableReminder: checked })}
              />
            </div>

            {formData.enableReminder && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="reminderDaysBefore">แจ้งเตือนล่วงหน้า (วัน)</Label>
                  <Input
                    id="reminderDaysBefore"
                    type="number"
                    min="1"
                    max="7"
                    value={formData.reminderDaysBefore}
                    onChange={(e) => setFormData({ ...formData, reminderDaysBefore: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reminderTime">เวลาที่ส่ง</Label>
                  <Input
                    id="reminderTime"
                    type="time"
                    value={formData.reminderTime}
                    onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>สถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="status">สถานะ Event</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Event['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">ร่าง</SelectItem>
                  <SelectItem value="published">เผยแพร่</SelectItem>
                  {isEdit && (
                    <>
                      <SelectItem value="completed">จบแล้ว</SelectItem>
                      <SelectItem value="cancelled">ยกเลิก</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.status === 'draft' && 'Event จะยังไม่แสดงให้ผู้ใช้เห็น'}
                {formData.status === 'published' && 'Event จะแสดงและเปิดรับลงทะเบียน'}
                {formData.status === 'completed' && 'Event จบแล้ว ไม่รับลงทะเบียนใหม่'}
                {formData.status === 'cancelled' && 'Event ถูกยกเลิก'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/events">
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
                {isEdit ? 'บันทึกการแก้ไข' : 'สร้าง Event'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}