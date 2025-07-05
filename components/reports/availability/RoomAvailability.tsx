// components/reports/availability/RoomAvailability.tsx

'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Clock,
  MapPin,
  Projector,
  PenTool
} from 'lucide-react';
import { Room } from '@/types/models';

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  conflicts?: Array<{
    type: 'class' | 'makeup' | 'trial';
    name: string;
  }>;
}

interface RoomAvailabilityData {
  room: Room;
  slots: TimeSlot[];
}

interface RoomAvailabilityProps {
  roomAvailability: RoomAvailabilityData[];
}

interface ConflictSummary {
  name: string;
  type: 'class' | 'makeup' | 'trial';
  totalHours: number;
  timeSlots: string[];
}

export function RoomAvailability({ roomAvailability }: RoomAvailabilityProps) {
  // Helper function to merge consecutive time slots
  const mergeConsecutiveSlots = (slots: TimeSlot[]): TimeSlot[] => {
    if (slots.length === 0) return [];
    
    const merged: TimeSlot[] = [];
    let current = { ...slots[0] };
    
    for (let i = 1; i < slots.length; i++) {
      if (current.endTime === slots[i].startTime) {
        current.endTime = slots[i].endTime;
      } else {
        merged.push(current);
        current = { ...slots[i] };
      }
    }
    
    merged.push(current);
    return merged;
  };

  // Calculate time difference in hours
  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;
    return (endInMinutes - startInMinutes) / 60;
  };

  // Group conflicts by class name and calculate total hours
  const groupConflictsByClass = (slots: TimeSlot[]): ConflictSummary[] => {
    const conflictMap = new Map<string, ConflictSummary>();
    
    slots.filter(s => !s.available).forEach(slot => {
      slot.conflicts?.forEach(conflict => {
        const key = conflict.name;
        const hours = calculateHours(slot.startTime, slot.endTime);
        const timeSlot = `${slot.startTime}-${slot.endTime}`;
        
        if (conflictMap.has(key)) {
          const existing = conflictMap.get(key)!;
          existing.totalHours += hours;
          existing.timeSlots.push(timeSlot);
        } else {
          conflictMap.set(key, {
            name: conflict.name,
            type: conflict.type,
            totalHours: hours,
            timeSlots: [timeSlot]
          });
        }
      });
    });
    
    return Array.from(conflictMap.values()).sort((a, b) => {
      // Sort by type first (class, makeup, trial), then by name
      if (a.type !== b.type) {
        const typeOrder = { 'class': 0, 'makeup': 1, 'trial': 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.name.localeCompare(b.name);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roomAvailability.map(({ room, slots }) => {
        const availableSlots = slots.filter(s => s.available);
        const isAvailable = availableSlots.length > 0;
        const conflictSummaries = groupConflictsByClass(slots);
        
        return (
          <Card key={room.id} className={cn(
            "transition-all",
            !isAvailable && "opacity-60"
          )}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {room.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>ความจุ {room.capacity} คน</span>
                  </div>
                </div>
                <Badge 
                  variant={isAvailable ? "default" : "secondary"}
                  className={isAvailable ? "bg-green-100 text-green-700 border-green-200" : ""}
                >
                  {isAvailable ? "ว่าง" : "ไม่ว่าง"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex gap-2 text-sm">
                  {room.floor && (
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      ชั้น {room.floor}
                    </Badge>
                  )}
                  {room.hasProjector && (
                    <Badge variant="outline">
                      <Projector className="h-3 w-3 mr-1" />
                      Projector
                    </Badge>
                  )}
                  {room.hasWhiteboard && (
                    <Badge variant="outline">
                      <PenTool className="h-3 w-3 mr-1" />
                      Whiteboard
                    </Badge>
                  )}
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">ช่วงเวลาว่าง:</p>
                  {availableSlots.length > 0 ? (
                    <div className="space-y-1">
                      {mergeConsecutiveSlots(availableSlots).map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className="text-green-600 border-green-500 bg-green-50"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {slot.startTime} - {slot.endTime}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">ไม่มีช่วงเวลาว่าง</p>
                  )}
                </div>
                
                {conflictSummaries.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-2 text-gray-600">ตารางการใช้งาน:</p>
                    <div className="space-y-2">
                      {conflictSummaries.map((summary, idx) => (
                        <div key={idx} className="border-l-2 pl-3 py-1" style={{
                          borderColor: summary.type === 'class' ? '#3B82F6' : 
                                       summary.type === 'makeup' ? '#F97316' : '#8B5CF6'
                        }}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {summary.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {summary.totalHours} ชม.
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {summary.timeSlots.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}