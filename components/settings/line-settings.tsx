'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Loader2, 
  MessageSquare,
  Key,
  Webhook,
  Menu,
  Bot,
  Clock,
  TestTube,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getLineSettings, 
  updateLineSettings,
  validateLineSettings,
  testLineChannel,
  generateWebhookUrl,
  formatBusinessHours,
  LineSettings
} from '@/lib/services/line-settings';
import { auth } from '@/lib/firebase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LineWebhookTest from './line-webhook-test';

export default function LineSettingsComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<LineSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Generate webhook URL when component mounts
  useEffect(() => {
    if (settings && typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      const webhookUrl = generateWebhookUrl(baseUrl);
      if (webhookUrl !== settings.webhookUrl) {
        setSettings({ ...settings, webhookUrl });
      }
    }
  }, [settings]);
  
  const loadSettings = async () => {
    try {
      const data = await getLineSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!settings || !auth.currentUser) return;
    
    // Validate
    const validation = validateLineSettings(settings);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('กรุณาตรวจสอบข้อมูลให้ถูกต้อง');
      return;
    }
    
    setSaving(true);
    setErrors({});
    
    try {
      await updateLineSettings(settings, auth.currentUser.uid);
      toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };
  
  const handleTestConnection = async (type: 'login' | 'messaging') => {
    if (!settings) return;
    
    setTesting(true);
    
    try {
      let result;
      if (type === 'login') {
        result = await testLineChannel(
          settings.loginChannelId || '',
          settings.loginChannelSecret || ''
        );
      } else {
        result = await testLineChannel(
          settings.messagingChannelId || '',
          settings.messagingChannelSecret || '',
          settings.messagingChannelAccessToken
        );
      }
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการทดสอบ');
    } finally {
      setTesting(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('คัดลอกแล้ว');
  };
  
  const toggleBusinessDay = (day: number) => {
    if (!settings) return;
    
    const days = settings.businessHours.days.includes(day)
      ? settings.businessHours.days.filter(d => d !== day)
      : [...settings.businessHours.days, day].sort();
    
    setSettings({
      ...settings,
      businessHours: { ...settings.businessHours, days }
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
  
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">
            <Key className="h-4 w-4 mr-2" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="webhook">
            <Webhook className="h-4 w-4 mr-2" />
            Webhook & LIFF
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            ข้อความ
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Bot className="h-4 w-4 mr-2" />
            ตั้งค่า
          </TabsTrigger>
        </TabsList>
        
        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          {/* LINE Login Channel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  LINE Login Channel
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestConnection('login')}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  <span className="ml-2">ทดสอบ</span>
                </Button>
              </CardTitle>
              <CardDescription>
                ใช้สำหรับให้ผู้ปกครอง Login เข้าระบบผ่าน LINE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loginChannelId">Channel ID</Label>
                  <Input
                    id="loginChannelId"
                    value={settings.loginChannelId || ''}
                    onChange={(e) => setSettings({...settings, loginChannelId: e.target.value})}
                    placeholder="1234567890"
                    className={errors.loginChannelId ? 'border-red-500' : ''}
                  />
                  {errors.loginChannelId && (
                    <p className="text-sm text-red-500">{errors.loginChannelId}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loginChannelSecret">Channel Secret</Label>
                  <Input
                    id="loginChannelSecret"
                    type="password"
                    value={settings.loginChannelSecret || ''}
                    onChange={(e) => setSettings({...settings, loginChannelSecret: e.target.value})}
                    placeholder="32 ตัวอักษร"
                    className={errors.loginChannelSecret ? 'border-red-500' : ''}
                  />
                  {errors.loginChannelSecret && (
                    <p className="text-sm text-red-500">{errors.loginChannelSecret}</p>
                  )}
                </div>
              </div>
              
              {/* Callback URL */}
              <div className="space-y-2">
                <Label>Callback URL (สำหรับ LINE Login)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/line`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(`${window.location.origin}/api/auth/callback/line`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  คัดลอก URL นี้ไปใส่ใน Callback URL ของ LINE Login Channel
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  สร้าง LINE Login Channel ได้ที่{' '}
                  <a 
                    href="https://developers.line.biz/console/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    LINE Developers Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          {/* LINE Messaging API Channel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  LINE Messaging API Channel
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestConnection('messaging')}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  <span className="ml-2">ทดสอบ</span>
                </Button>
              </CardTitle>
              <CardDescription>
                ใช้สำหรับส่งข้อความแจ้งเตือน และ Chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="messagingChannelId">Channel ID</Label>
                  <Input
                    id="messagingChannelId"
                    value={settings.messagingChannelId || ''}
                    onChange={(e) => setSettings({...settings, messagingChannelId: e.target.value})}
                    placeholder="1234567890"
                    className={errors.messagingChannelId ? 'border-red-500' : ''}
                  />
                  {errors.messagingChannelId && (
                    <p className="text-sm text-red-500">{errors.messagingChannelId}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="messagingChannelSecret">Channel Secret</Label>
                  <Input
                    id="messagingChannelSecret"
                    type="password"
                    value={settings.messagingChannelSecret || ''}
                    onChange={(e) => setSettings({...settings, messagingChannelSecret: e.target.value})}
                    placeholder="32 ตัวอักษร"
                    className={errors.messagingChannelSecret ? 'border-red-500' : ''}
                  />
                  {errors.messagingChannelSecret && (
                    <p className="text-sm text-red-500">{errors.messagingChannelSecret}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="messagingChannelAccessToken">Channel Access Token</Label>
                <Textarea
                  id="messagingChannelAccessToken"
                  value={settings.messagingChannelAccessToken || ''}
                  onChange={(e) => setSettings({...settings, messagingChannelAccessToken: e.target.value})}
                  placeholder="Long-lived channel access token"
                  rows={3}
                  className={errors.messagingChannelAccessToken ? 'border-red-500' : ''}
                />
                {errors.messagingChannelAccessToken && (
                  <p className="text-sm text-red-500">{errors.messagingChannelAccessToken}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Webhook & LIFF Tab */}
        <TabsContent value="webhook" className="space-y-6">
          {/* Webhook Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook URL
              </CardTitle>
              <CardDescription>
                URL สำหรับรับข้อความจาก LINE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.webhookUrl || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(settings.webhookUrl || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  คัดลอก URL นี้ไปใส่ใน LINE Developers Console
                </p>
              </div>
              
              <LineWebhookTest 
                webhookUrl={settings.webhookUrl || ''}
                webhookVerified={settings.webhookVerified}
                accessToken={settings.messagingChannelAccessToken}
              />
            </CardContent>
          </Card>
          
          {/* LIFF Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                LIFF (LINE Front-end Framework)
              </CardTitle>
              <CardDescription>
                ใช้สำหรับหน้าเว็บใน LINE เช่น ดูตารางเรียน จองทดลองเรียน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="liffId">LIFF ID</Label>
                  <Input
                    id="liffId"
                    value={settings.liffId || ''}
                    onChange={(e) => setSettings({...settings, liffId: e.target.value})}
                    placeholder="1234567890-abcdefgh"
                    className={errors.liffId ? 'border-red-500' : ''}
                  />
                  {errors.liffId && (
                    <p className="text-sm text-red-500">{errors.liffId}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="liffChannelId">LIFF Channel ID</Label>
                  <Input
                    id="liffChannelId"
                    value={settings.liffChannelId || ''}
                    onChange={(e) => setSettings({...settings, liffChannelId: e.target.value})}
                    placeholder="1234567890"
                  />
                </div>
              </div>
              
              {/* LIFF Endpoint URL */}
              <div className="space-y-2">
                <Label>LIFF Endpoint URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/liff`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(`${window.location.origin}/liff`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  ใช้ URL นี้เป็น Endpoint URL เมื่อสร้าง LIFF App
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>สร้าง LIFF App ได้ที่ LINE Login Channel > LIFF tab</p>
                    <p className="text-sm">
                      <strong>Size:</strong> Full | 
                      <strong> Scope:</strong> profile, openid | 
                      <strong> Bot link:</strong> On (เลือก Messaging API channel)
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
              
              {/* LIFF URLs */}
              {settings.liffId && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm">LIFF URLs</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">ดูตารางเรียน:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded text-xs">
                          https://liff.line.me/{settings.liffId}/schedule
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://liff.line.me/${settings.liffId}/schedule`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">จองทดลองเรียน:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded text-xs">
                          https://liff.line.me/{settings.liffId}/trial
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://liff.line.me/${settings.liffId}/trial`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">ชำระเงิน:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded text-xs">
                          https://liff.line.me/{settings.liffId}/payment
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://liff.line.me/${settings.liffId}/payment`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">โปรไฟล์:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded text-xs">
                          https://liff.line.me/{settings.liffId}/profile
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://liff.line.me/${settings.liffId}/profile`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Makeup Class:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded text-xs">
                          https://liff.line.me/{settings.liffId}/makeup
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://liff.line.me/${settings.liffId}/makeup`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          {/* Quick Reply Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reply Templates</CardTitle>
              <CardDescription>
                ข้อความตอบกลับด่วนสำหรับผู้ปกครอง
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ดูตารางเรียน</Label>
                  <Input
                    value={settings.quickReplyTemplates?.scheduleInquiry || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      quickReplyTemplates: {
                        ...settings.quickReplyTemplates,
                        scheduleInquiry: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ขอเรียนชดเชย</Label>
                  <Input
                    value={settings.quickReplyTemplates?.makeupRequest || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      quickReplyTemplates: {
                        ...settings.quickReplyTemplates,
                        makeupRequest: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>จองทดลองเรียน</Label>
                  <Input
                    value={settings.quickReplyTemplates?.trialBooking || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      quickReplyTemplates: {
                        ...settings.quickReplyTemplates,
                        trialBooking: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ติดต่อสอบถาม</Label>
                  <Input
                    value={settings.quickReplyTemplates?.contactUs || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      quickReplyTemplates: {
                        ...settings.quickReplyTemplates,
                        contactUs: e.target.value
                      }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Auto Reply Messages */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อความตอบกลับอัตโนมัติ</CardTitle>
              <CardDescription>
                ข้อความที่ระบบจะตอบกลับอัตโนมัติ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ข้อความต้อนรับ</Label>
                <Textarea
                  value={settings.autoReplyMessages?.welcome || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    autoReplyMessages: {
                      ...settings.autoReplyMessages,
                      welcome: e.target.value
                    }
                  })}
                  rows={3}
                  placeholder="สวัสดีค่ะ ยินดีต้อนรับ..."
                />
                <p className="text-sm text-gray-500">
                  ใช้ {'{schoolName}'} เพื่อแทนชื่อโรงเรียน
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>ไม่เข้าใจคำสั่ง</Label>
                <Textarea
                  value={settings.autoReplyMessages?.unknownCommand || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    autoReplyMessages: {
                      ...settings.autoReplyMessages,
                      unknownCommand: e.target.value
                    }
                  })}
                  rows={2}
                />
                <p className="text-sm text-gray-500">
                  ใช้ {'{contactPhone}'} เพื่อแทนเบอร์โทร
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>นอกเวลาทำการ</Label>
                <Textarea
                  value={settings.autoReplyMessages?.outsideHours || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    autoReplyMessages: {
                      ...settings.autoReplyMessages,
                      outsideHours: e.target.value
                    }
                  })}
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  ใช้ {'{businessHours}'} เพื่อแทนเวลาทำการ
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Notification Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Template การแจ้งเตือน</CardTitle>
              <CardDescription>
                รูปแบบข้อความแจ้งเตือนต่างๆ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>แจ้งเตือนก่อนเรียน</Label>
                <Textarea
                  value={settings.notificationTemplates?.classReminder || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    notificationTemplates: {
                      ...settings.notificationTemplates,
                      classReminder: e.target.value
                    }
                  })}
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  Variables: {'{studentName}'}, {'{subjectName}'}, {'{date}'}, {'{time}'}, {'{location}'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>ยืนยันการเรียนชดเชย</Label>
                <Textarea
                  value={settings.notificationTemplates?.makeupConfirmation || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    notificationTemplates: {
                      ...settings.notificationTemplates,
                      makeupConfirmation: e.target.value
                    }
                  })}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>แจ้งเตือนชำระค่าเรียน</Label>
                <Textarea
                  value={settings.notificationTemplates?.paymentReminder || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    notificationTemplates: {
                      ...settings.notificationTemplates,
                      paymentReminder: e.target.value
                    }
                  })}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>ยืนยันการทดลองเรียน</Label>
                <Textarea
                  value={settings.notificationTemplates?.trialConfirmation || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    notificationTemplates: {
                      ...settings.notificationTemplates,
                      trialConfirmation: e.target.value
                    }
                  })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Bot Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                ตั้งค่า Bot
              </CardTitle>
              <CardDescription>
                กำหนดการทำงานของ LINE Bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>เปิดใช้งานตอบกลับอัตโนมัติ</Label>
                    <p className="text-sm text-gray-500">
                      Bot จะตอบกลับข้อความอัตโนมัติ
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableAutoReply}
                    onCheckedChange={(checked) => 
                      setSettings({...settings, enableAutoReply: checked})
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>เปิดใช้งานการแจ้งเตือน</Label>
                    <p className="text-sm text-gray-500">
                      ส่งข้อความแจ้งเตือนไปยังผู้ปกครอง
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => 
                      setSettings({...settings, enableNotifications: checked})
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>เปิดใช้งาน Rich Menu</Label>
                    <p className="text-sm text-gray-500">
                      แสดงเมนูด้านล่างใน LINE
                    </p>
                  </div>
                  <Switch
                    checked={settings.richMenuEnabled}
                    onCheckedChange={(checked) => 
                      setSettings({...settings, richMenuEnabled: checked})
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                เวลาทำการ
              </CardTitle>
              <CardDescription>
                กำหนดเวลาที่ Bot จะตอบกลับ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>เวลาเปิด</Label>
                  <Input
                    type="time"
                    value={settings.businessHours.start}
                    onChange={(e) => setSettings({
                      ...settings,
                      businessHours: {
                        ...settings.businessHours,
                        start: e.target.value
                      }
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>เวลาปิด</Label>
                  <Input
                    type="time"
                    value={settings.businessHours.end}
                    onChange={(e) => setSettings({
                      ...settings,
                      businessHours: {
                        ...settings.businessHours,
                        end: e.target.value
                      }
                    })}
                  />
                  {errors.businessHours && (
                    <p className="text-sm text-red-500">{errors.businessHours}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>วันทำการ</Label>
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((day, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={settings.businessHours.days.includes(index) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleBusinessDay(index)}
                      className="w-full"
                    >
                      {day.slice(0, 2)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  เวลาทำการปัจจุบัน: <span className="font-medium">{formatBusinessHours(settings)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Rich Menu Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Rich Menu
              </CardTitle>
              <CardDescription>
                เมนูด้านล่างใน LINE Chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="richMenuId">Rich Menu ID</Label>
                <Input
                  id="richMenuId"
                  value={settings.richMenuId || ''}
                  onChange={(e) => setSettings({...settings, richMenuId: e.target.value})}
                  placeholder="richmenu-xxxxx"
                />
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  สร้างและจัดการ Rich Menu ได้ที่{' '}
                  <a 
                    href="https://manager.line.biz/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    LINE Official Account Manager
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
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