// components/trial/contact-history-section.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare,
  PhoneCall,
  Plus,
  Clock,
  User,
  Save
} from 'lucide-react';
import { TrialBooking } from '@/types/models';
import { updateTrialBooking, updateBookingStatus } from '@/lib/services/trial-bookings';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface ContactHistoryEntry {
  date: Date;
  type: 'contacted' | 'note';
  note: string;
  by?: string;
}

interface ContactHistorySectionProps {
  booking: TrialBooking;
  onUpdate: () => void;
}

export default function ContactHistorySection({ booking, onUpdate }: ContactHistorySectionProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Build contact history from booking data
  const getContactHistory = (): ContactHistoryEntry[] => {
    const history: ContactHistoryEntry[] = [];
    
    // Add initial contact if exists
    if (booking.contactedAt) {
      history.push({
        date: booking.contactedAt,
        type: 'contacted',
        note: booking.contactNote || 'ติดต่อผู้ปกครองแล้ว',
      });
    }
    
    // Sort by date descending
    return history.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('กรุณากรอกบันทึก');
      return;
    }

    setSaving(true);
    
    try {
      // If this is the first contact, update status to contacted
      if (booking.status === 'new') {
        await updateBookingStatus(booking.id, 'contacted', newNote);
      } else {
        // Otherwise, just add to existing notes
        const existingNote = booking.contactNote || '';
        const updatedNote = existingNote 
          ? `${existingNote}\n\n[${formatDate(new Date(), 'short')}] ${newNote}`
          : newNote;
          
        await updateTrialBooking(booking.id, {
          contactNote: updatedNote
        });
      }
      
      toast.success('บันทึกข้อมูลสำเร็จ');
      setNewNote('');
      setShowAddNote(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const contactHistory = getContactHistory();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            ประวัติการติดต่อ
          </CardTitle>
          {!showAddNote && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddNote(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มบันทึก
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Note Form */}
        {showAddNote && (
          <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="บันทึกการติดต่อ..."
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    บันทึก
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddNote(false);
                  setNewNote('');
                }}
                disabled={saving}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {/* Contact History */}
        {contactHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">ยังไม่มีประวัติการติดต่อ</p>
            {booking.status === 'new' && (
              <p className="text-xs mt-1">คลิก &quot;เพิ่มบันทึก&quot; เพื่อบันทึกการติดต่อครั้งแรก</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {contactHistory.map((entry, index) => (
              <div key={index} className="relative pl-8">
                {/* Timeline line */}
                {index < contactHistory.length - 1 && (
                  <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                )}
                
                {/* Timeline dot */}
                <div className="absolute left-0 top-2">
                  {entry.type === 'contacted' ? (
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <PhoneCall className="h-3 w-3 text-yellow-600" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-3 w-3 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="bg-white border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDate(entry.date, 'long')}
                      </span>
                    </div>
                    {entry.type === 'contacted' && (
                      <Badge variant="outline" className="text-xs">
                        ติดต่อครั้งแรก
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {entry.note}
                  </p>
                  {entry.by && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">โดย {entry.by}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Multi-line notes display */}
        {booking.contactNote && booking.contactNote.includes('\n') && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">บันทึกทั้งหมด</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {booking.contactNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}