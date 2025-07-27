'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Save, 
  Loader2, 
  Repeat,
  Clock,
  Bell,
  Info,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getMakeupSettings, 
  updateMakeupSettings,
  MakeupSettings
} from '@/lib/services/settings';
import { auth } from '@/lib/firebase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MakeupSettingsComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MakeupSettings | null>(null);
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const data = await getMakeupSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading makeup settings:', error);
      toast.error('ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!settings || !auth.currentUser) return;
    
    setSaving(true);
    
    try {
      await updateMakeupSettings(settings, auth.currentUser.uid);
      toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving makeup settings:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusToggle = (status: 'absent' | 'sick' | 'leave') => {
    if (!settings) return;
    
    const currentStatuses = settings.allowMakeupForStatuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    setSettings({
      ...settings,
      allowMakeupForStatuses: newStatuses
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }
  
  if (!settings) {
    return (
      <div className="text-center p-12 text-gray-500">
        ไม่สามารถโหลดข้อมูลได้
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Auto Create Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            การสร้าง Makeup อัตโนมัติ
          </CardTitle>
          <CardDescription>
            ตั้งค่าการสร้างคลาสชดเชยอัตโนมัติเมื่อนักเรียนขาดเรียน
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Create Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoCreate" className="text-base">
                สร้าง Makeup อัตโนมัติ
              </Label>
              <p className="text-sm text-muted-foreground">
                สร้างคำขอชดเชยทันทีเมื่อเช็คชื่อว่าขาดเรียน
              </p>
            </div>
            <Switch
              id="autoCreate"
              checked={settings.autoCreateMakeup}
              onCheckedChange={(checked) => 
                setSettings({...settings, autoCreateMakeup: checked})
              }
            />
          </div>
          
          {/* Makeup Limit */}
          <div className="space-y-2">
            <Label htmlFor="makeupLimit">
              จำนวนครั้งที่ชดเชยได้ต่อคอร์ส
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="makeupLimit"
                type="number"
                value={settings.makeupLimitPerCourse}
                onChange={(e) => setSettings({
                  ...settings, 
                  makeupLimitPerCourse: parseInt(e.target.value) || 0
                })}
                className="w-24"
                min="0"
                max="20"
              />
              <span className="text-sm text-muted-foreground">
                ครั้ง (0 = ไม่จำกัด)
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              เมื่อเกินจำนวนนี้ ระบบจะไม่สร้างอัตโนมัติ แต่ Admin ยังสามารถสร้างเองได้
            </p>
          </div>
          
          {/* Status Selection */}
          <div className="space-y-3">
            <Label>สถานะที่สร้าง Makeup ให้</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="absent"
                  checked={settings.allowMakeupForStatuses.includes('absent')}
                  onCheckedChange={() => handleStatusToggle('absent')}
                />
                <Label
                  htmlFor="absent"
                  className="text-sm font-normal cursor-pointer"
                >
                  ขาดเรียน (Absent)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sick"
                  checked={settings.allowMakeupForStatuses.includes('sick')}
                  onCheckedChange={() => handleStatusToggle('sick')}
                />
                <Label
                  htmlFor="sick"
                  className="text-sm font-normal cursor-pointer"
                >
                  ป่วย (Sick)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="leave"
                  checked={settings.allowMakeupForStatuses.includes('leave')}
                  onCheckedChange={() => handleStatusToggle('leave')}
                />
                <Label
                  htmlFor="leave"
                  className="text-sm font-normal cursor-pointer"
                >
                  ลา (Leave)
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rules & Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            กฎและระยะเวลา
          </CardTitle>
          <CardDescription>
            กำหนดระยะเวลาในการขอและเข้าเรียนชดเชย
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestDeadline">
                ขอชดเชยได้ภายใน
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="requestDeadline"
                  type="number"
                  value={settings.makeupRequestDeadlineDays}
                  onChange={(e) => setSettings({
                    ...settings, 
                    makeupRequestDeadlineDays: parseInt(e.target.value) || 7
                  })}
                  className="w-24"
                  min="1"
                  max="30"
                />
                <span className="text-sm text-muted-foreground">
                  วัน หลังจากขาดเรียน
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="validityDays">
                ต้องมาชดเชยภายใน
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="validityDays"
                  type="number"
                  value={settings.makeupValidityDays}
                  onChange={(e) => setSettings({
                    ...settings, 
                    makeupValidityDays: parseInt(e.target.value) || 30
                  })}
                  className="w-24"
                  min="7"
                  max="90"
                />
                <span className="text-sm text-muted-foreground">
                  วัน หลังคอร์สจบ
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            การแจ้งเตือน
          </CardTitle>
          <CardDescription>
            ตั้งค่าการแจ้งเตือนเกี่ยวกับ Makeup Class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lineNotify" className="text-base">
                แจ้งเตือนผ่าน LINE
              </Label>
              <p className="text-sm text-muted-foreground">
                ส่งข้อความแจ้งเตือนเมื่อมีการจัดตาราง Makeup
              </p>
            </div>
            <Switch
              id="lineNotify"
              checked={settings.sendLineNotification}
              onCheckedChange={(checked) => 
                setSettings({...settings, sendLineNotification: checked})
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="parentNotify" className="text-base">
                แจ้งผู้ปกครองเมื่อสร้างอัตโนมัติ
              </Label>
              <p className="text-sm text-muted-foreground">
                แจ้งให้ผู้ปกครองทราบเมื่อระบบสร้าง Makeup อัตโนมัติ
              </p>
            </div>
            <Switch
              id="parentNotify"
              checked={settings.notifyParentOnAutoCreate}
              onCheckedChange={(checked) => 
                setSettings({...settings, notifyParentOnAutoCreate: checked})
              }
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>หมายเหตุ:</strong> การตั้งค่านี้จะมีผลกับการเช็คชื่อใหม่เท่านั้น 
          ไม่มีผลย้อนหลังกับข้อมูลที่มีอยู่แล้ว
        </AlertDescription>
      </Alert>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-red-500 hover:bg-red-600"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              บันทึกการตั้งค่า
            </>
          )}
        </Button>
      </div>
    </div>
  );
}