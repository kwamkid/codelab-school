'use client';

import { useState, useEffect } from 'react';
import { Room } from '@/types/models';
import { createRoom, updateRoom, checkRoomNameExists } from '@/lib/services/rooms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  room?: Room | null;
  onSaved: () => void;
}

export default function RoomDialog({
  open,
  onOpenChange,
  branchId,
  room,
  onSaved
}: RoomDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 10,
    floor: '',
    hasProjector: true,
    hasWhiteboard: true,
    isActive: true,
  });

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        capacity: room.capacity,
        floor: room.floor || '',
        hasProjector: room.hasProjector,
        hasWhiteboard: room.hasWhiteboard,
        isActive: room.isActive,
      });
    } else {
      // Reset form for new room
      setFormData({
        name: '',
        capacity: 10,
        floor: '',
        hasProjector: true,
        hasWhiteboard: true,
        isActive: true,
      });
    }
  }, [room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อห้อง');
      return;
    }

    if (formData.capacity < 1) {
      toast.error('ความจุต้องมากกว่า 0');
      return;
    }

    setLoading(true);

    try {
      // Check if room name already exists
      const nameExists = await checkRoomNameExists(
        branchId,
        formData.name.trim(),
        room?.id
      );

      if (nameExists) {
        toast.error('ชื่อห้องนี้มีอยู่แล้ว');
        setLoading(false);
        return;
      }

      if (room) {
        // Update existing room
        await updateRoom(branchId, room.id, {
          ...formData,
          name: formData.name.trim(),
        });
        toast.success('อัปเดตข้อมูลห้องเรียนเรียบร้อยแล้ว');
      } else {
        // Create new room
        await createRoom(branchId, {
          ...formData,
          name: formData.name.trim(),
        });
        toast.success('เพิ่มห้องเรียนใหม่เรียบร้อยแล้ว');
      }

      onSaved();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error(room ? 'ไม่สามารถอัปเดตข้อมูลได้' : 'ไม่สามารถเพิ่มห้องเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {room ? 'แก้ไขข้อมูลห้องเรียน' : 'เพิ่มห้องเรียนใหม่'}
            </DialogTitle>
            <DialogDescription>
              กรอกข้อมูลห้องเรียนให้ครบถ้วน
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">ชื่อห้อง *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น A101, Lab 1"
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="capacity">ความจุ (คน) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="floor">ชั้น</Label>
                <Input
                  id="floor"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="เช่น 1, 2, G"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>อุปกรณ์ในห้อง</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasProjector"
                  checked={formData.hasProjector}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, hasProjector: checked as boolean })
                  }
                  disabled={loading}
                />
                <Label htmlFor="hasProjector" className="font-normal cursor-pointer">
                  มีโปรเจคเตอร์
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasWhiteboard"
                  checked={formData.hasWhiteboard}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, hasWhiteboard: checked as boolean })
                  }
                  disabled={loading}
                />
                <Label htmlFor="hasWhiteboard" className="font-normal cursor-pointer">
                  มีกระดานไวท์บอร์ด
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isActive: checked as boolean })
                }
                disabled={loading}
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                เปิดใช้งาน
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="bg-red-500 hover:bg-red-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                room ? 'บันทึกการแก้ไข' : 'เพิ่มห้องเรียน'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}