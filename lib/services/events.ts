// lib/services/events.ts

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment,
  writeBatch,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Event, EventSchedule, EventRegistration } from '@/types/models';

const EVENTS_COLLECTION = 'events';
const SCHEDULES_COLLECTION = 'eventSchedules';
const REGISTRATIONS_COLLECTION = 'eventRegistrations';

// ==================== Event CRUD Operations ====================

// Get all events
export async function getEvents(branchId?: string): Promise<Event[]> {
  try {
    let q;
    
    if (branchId) {
      // Filter by branch
      q = query(
        collection(db, EVENTS_COLLECTION),
        where('branchIds', 'array-contains', branchId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Get all events
      q = query(
        collection(db, EVENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        fullDescription: data.fullDescription,
        imageUrl: data.imageUrl,
        location: data.location,
        locationUrl: data.locationUrl,
        branchIds: data.branchIds || [],
        eventType: data.eventType,
        highlights: data.highlights,
        targetAudience: data.targetAudience,
        whatToBring: data.whatToBring,
        registrationStartDate: data.registrationStartDate?.toDate() || new Date(),
        registrationEndDate: data.registrationEndDate?.toDate() || new Date(),
        countingMethod: data.countingMethod,
        enableReminder: data.enableReminder ?? true,
        reminderDaysBefore: data.reminderDaysBefore || 1,
        reminderTime: data.reminderTime,
        status: data.status,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedAt: data.updatedAt?.toDate(),
        updatedBy: data.updatedBy
      } as Event;
    });
  } catch (error) {
    console.error('Error getting events:', error);
    throw error;
  }
}

// Get single event
export async function getEvent(id: string): Promise<Event | null> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as DocumentData;
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        fullDescription: data.fullDescription,
        imageUrl: data.imageUrl,
        location: data.location,
        locationUrl: data.locationUrl,
        branchIds: data.branchIds || [],
        eventType: data.eventType,
        highlights: data.highlights,
        targetAudience: data.targetAudience,
        whatToBring: data.whatToBring,
        registrationStartDate: data.registrationStartDate?.toDate() || new Date(),
        registrationEndDate: data.registrationEndDate?.toDate() || new Date(),
        countingMethod: data.countingMethod,
        enableReminder: data.enableReminder ?? true,
        reminderDaysBefore: data.reminderDaysBefore || 1,
        reminderTime: data.reminderTime,
        status: data.status,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedAt: data.updatedAt?.toDate(),
        updatedBy: data.updatedBy
      } as Event;
    }
    return null;
  } catch (error) {
    console.error('Error getting event:', error);
    throw error;
  }
}

// Create new event
export async function createEvent(
  eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
      ...eventData,
      registrationStartDate: Timestamp.fromDate(eventData.registrationStartDate),
      registrationEndDate: Timestamp.fromDate(eventData.registrationEndDate),
      createdAt: serverTimestamp(),
      createdBy: userId,
      isActive: true,
      reminderDaysBefore: eventData.reminderDaysBefore || 1,
      enableReminder: eventData.enableReminder ?? true,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

// Update event
export async function updateEvent(
  id: string,
  eventData: Partial<Event>,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    
    const updateData: any = {
      ...eventData,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    
    // Convert dates to Timestamp
    if (eventData.registrationStartDate) {
      updateData.registrationStartDate = Timestamp.fromDate(eventData.registrationStartDate);
    }
    if (eventData.registrationEndDate) {
      updateData.registrationEndDate = Timestamp.fromDate(eventData.registrationEndDate);
    }
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

// Delete event
export async function deleteEvent(id: string): Promise<void> {
  try {
    // Check if event has registrations
    const registrations = await getEventRegistrations(id);
    if (registrations.length > 0) {
      throw new Error('ไม่สามารถลบ Event ที่มีผู้ลงทะเบียนแล้วได้');
    }
    
    // Delete all schedules first
    const schedules = await getEventSchedules(id);
    const batch = writeBatch(db);
    
    schedules.forEach(schedule => {
      batch.delete(doc(db, SCHEDULES_COLLECTION, schedule.id));
    });
    
    // Delete event
    batch.delete(doc(db, EVENTS_COLLECTION, id));
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// ==================== Event Schedule Operations ====================

// Get event schedules
export async function getEventSchedules(eventId: string): Promise<EventSchedule[]> {
  try {
    const q = query(
      collection(db, SCHEDULES_COLLECTION),
      where('eventId', '==', eventId),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        eventId: data.eventId,
        date: data.date?.toDate() || new Date(),
        startTime: data.startTime,
        endTime: data.endTime,
        maxAttendees: data.maxAttendees,
        attendeesByBranch: data.attendeesByBranch || {},
        status: data.status
      } as EventSchedule;
    });
  } catch (error) {
    console.error('Error getting event schedules:', error);
    throw error;
  }
}

// Create event schedule
export async function createEventSchedule(
  scheduleData: Omit<EventSchedule, 'id' | 'attendeesByBranch'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, SCHEDULES_COLLECTION), {
      ...scheduleData,
      date: Timestamp.fromDate(scheduleData.date),
      attendeesByBranch: {},
      status: 'available'
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating event schedule:', error);
    throw error;
  }
}

// Update event schedule
export async function updateEventSchedule(
  id: string,
  scheduleData: Partial<EventSchedule>
): Promise<void> {
  try {
    const docRef = doc(db, SCHEDULES_COLLECTION, id);
    
    const updateData: any = { ...scheduleData };
    if (scheduleData.date) {
      updateData.date = Timestamp.fromDate(scheduleData.date);
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating event schedule:', error);
    throw error;
  }
}

// Delete event schedule
export async function deleteEventSchedule(id: string): Promise<void> {
  try {
    // Check if schedule has registrations
    const registrations = await getScheduleRegistrations(id);
    if (registrations.length > 0) {
      throw new Error('ไม่สามารถลบรอบที่มีผู้ลงทะเบียนแล้วได้');
    }
    
    await deleteDoc(doc(db, SCHEDULES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting event schedule:', error);
    throw error;
  }
}

// ==================== Event Registration Operations ====================

// Get event registrations
export async function getEventRegistrations(
  eventId: string,
  options?: {
    scheduleId?: string;
    branchId?: string;
    status?: EventRegistration['status'];
  }
): Promise<EventRegistration[]> {
  try {
    let q = query(
      collection(db, REGISTRATIONS_COLLECTION),
      where('eventId', '==', eventId)
    );
    
    // Add additional filters
    if (options?.scheduleId) {
      q = query(q, where('scheduleId', '==', options.scheduleId));
    }
    if (options?.branchId) {
      q = query(q, where('branchId', '==', options.branchId));
    }
    if (options?.status) {
      q = query(q, where('status', '==', options.status));
    }
    
    q = query(q, orderBy('registeredAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        eventId: data.eventId,
        eventName: data.eventName,
        scheduleId: data.scheduleId,
        scheduleDate: data.scheduleDate?.toDate() || new Date(),
        scheduleTime: data.scheduleTime,
        branchId: data.branchId,
        isGuest: data.isGuest,
        lineUserId: data.lineUserId,
        lineDisplayName: data.lineDisplayName,
        linePictureUrl: data.linePictureUrl,
        parentId: data.parentId,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        parentAddress: data.parentAddress,
        parents: data.parents || [],
        students: data.students?.map((s: any) => ({
          studentId: s.studentId,
          name: s.name,
          nickname: s.nickname,
          birthdate: s.birthdate?.toDate() || new Date(),
          schoolName: s.schoolName,
          gradeLevel: s.gradeLevel
        })) || [],
        attendeeCount: data.attendeeCount,
        status: data.status,
        registeredAt: data.registeredAt?.toDate() || new Date(),
        registeredFrom: data.registeredFrom,
        cancelledAt: data.cancelledAt?.toDate(),
        cancelledBy: data.cancelledBy,
        cancellationReason: data.cancellationReason,
        attended: data.attended,
        attendanceCheckedAt: data.attendanceCheckedAt?.toDate(),
        attendanceCheckedBy: data.attendanceCheckedBy,
        attendanceNote: data.attendanceNote,
        specialRequest: data.specialRequest,
        referralSource: data.referralSource
      } as EventRegistration;
    });
  } catch (error) {
    console.error('Error getting event registrations:', error);
    throw error;
  }
}

// Get registrations by schedule
export async function getScheduleRegistrations(scheduleId: string): Promise<EventRegistration[]> {
  try {
    const q = query(
      collection(db, REGISTRATIONS_COLLECTION),
      where('scheduleId', '==', scheduleId),
      where('status', '!=', 'cancelled')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        eventId: data.eventId,
        eventName: data.eventName,
        scheduleId: data.scheduleId,
        scheduleDate: data.scheduleDate?.toDate() || new Date(),
        scheduleTime: data.scheduleTime,
        branchId: data.branchId,
        isGuest: data.isGuest,
        lineUserId: data.lineUserId,
        lineDisplayName: data.lineDisplayName,
        linePictureUrl: data.linePictureUrl,
        parentId: data.parentId,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        parentAddress: data.parentAddress,
        parents: data.parents || [],
        students: data.students || [],
        attendeeCount: data.attendeeCount,
        status: data.status,
        registeredAt: data.registeredAt?.toDate() || new Date(),
        registeredFrom: data.registeredFrom,
        cancelledAt: data.cancelledAt?.toDate(),
        cancelledBy: data.cancelledBy,
        cancellationReason: data.cancellationReason,
        attended: data.attended,
        attendanceCheckedAt: data.attendanceCheckedAt?.toDate(),
        attendanceCheckedBy: data.attendanceCheckedBy,
        attendanceNote: data.attendanceNote,
        specialRequest: data.specialRequest,
        referralSource: data.referralSource
      } as EventRegistration;
    });
  } catch (error) {
    console.error('Error getting schedule registrations:', error);
    throw error;
  }
}

// Get user's registrations
export async function getUserRegistrations(
  userId: string,
  isLineUserId: boolean = true
): Promise<EventRegistration[]> {
  try {
    const field = isLineUserId ? 'lineUserId' : 'parentId';
    const q = query(
      collection(db, REGISTRATIONS_COLLECTION),
      where(field, '==', userId),
      orderBy('scheduleDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        eventId: data.eventId,
        eventName: data.eventName,
        scheduleId: data.scheduleId,
        scheduleDate: data.scheduleDate?.toDate() || new Date(),
        scheduleTime: data.scheduleTime,
        branchId: data.branchId,
        isGuest: data.isGuest,
        lineUserId: data.lineUserId,
        lineDisplayName: data.lineDisplayName,
        linePictureUrl: data.linePictureUrl,
        parentId: data.parentId,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        parentAddress: data.parentAddress,
        parents: data.parents || [],
        students: data.students?.map((s: any) => ({
          studentId: s.studentId,
          name: s.name,
          nickname: s.nickname,
          birthdate: s.birthdate?.toDate() || new Date(),
          schoolName: s.schoolName,
          gradeLevel: s.gradeLevel
        })) || [],
        attendeeCount: data.attendeeCount,
        status: data.status,
        registeredAt: data.registeredAt?.toDate() || new Date(),
        registeredFrom: data.registeredFrom,
        cancelledAt: data.cancelledAt?.toDate(),
        cancelledBy: data.cancelledBy,
        cancellationReason: data.cancellationReason,
        attended: data.attended,
        attendanceCheckedAt: data.attendanceCheckedAt?.toDate(),
        attendanceCheckedBy: data.attendanceCheckedBy,
        attendanceNote: data.attendanceNote,
        specialRequest: data.specialRequest,
        referralSource: data.referralSource
      } as EventRegistration;
    });
  } catch (error) {
    console.error('Error getting user registrations:', error);
    throw error;
  }
}

// Create event registration
export async function createEventRegistration(
  registrationData: Omit<EventRegistration, 'id' | 'registeredAt' | 'status'>,
  event: Event
): Promise<string> {
  try {
    // Get schedule to check capacity
    const scheduleDoc = await getDoc(doc(db, SCHEDULES_COLLECTION, registrationData.scheduleId));
    if (!scheduleDoc.exists()) {
      throw new Error('ไม่พบรอบเวลาที่เลือก');
    }
    
    const scheduleData = scheduleDoc.data();
    const schedule = {
      id: scheduleDoc.id,
      eventId: scheduleData?.eventId,
      date: scheduleData?.date?.toDate() || new Date(),
      startTime: scheduleData?.startTime,
      endTime: scheduleData?.endTime,
      maxAttendees: scheduleData?.maxAttendees,
      attendeesByBranch: scheduleData?.attendeesByBranch || {},
      status: scheduleData?.status
    } as EventSchedule;
    
    // Calculate current attendees
    const currentAttendees = Object.values(schedule.attendeesByBranch || {})
      .reduce((sum, count) => sum + count, 0);
    
    // Check if full
    if (currentAttendees >= schedule.maxAttendees) {
      throw new Error('รอบนี้เต็มแล้ว');
    }
    
    // Calculate attendee count based on counting method
    let attendeeCount = 1; // default
    if (event.countingMethod === 'students') {
      attendeeCount = registrationData.students.length;
    } else if (event.countingMethod === 'parents') {
      attendeeCount = registrationData.parents.length;
    }
    
    // Check if will exceed capacity
    if (currentAttendees + attendeeCount > schedule.maxAttendees) {
      throw new Error(`รอบนี้เหลือที่ว่างเพียง ${schedule.maxAttendees - currentAttendees} ที่`);
    }
    
    console.log('[createEventRegistration] Creating registration with:', {
      scheduleId: registrationData.scheduleId,
      branchId: registrationData.branchId,
      attendeeCount,
      currentAttendees,
      maxAttendees: schedule.maxAttendees
    });
    
    // Create registration
    const docRef = await addDoc(collection(db, REGISTRATIONS_COLLECTION), {
      ...registrationData,
      scheduleDate: Timestamp.fromDate(registrationData.scheduleDate),
      students: registrationData.students.map(s => ({
        ...s,
        birthdate: s.birthdate ? Timestamp.fromDate(s.birthdate) : null
      })),
      attendeeCount,
      status: 'confirmed',
      registeredAt: serverTimestamp(),
    });
    
    // Update schedule attendee count - Fixed syntax
    const currentBranchCount = schedule.attendeesByBranch[registrationData.branchId] || 0;
    const newTotal = currentAttendees + attendeeCount;
    
    const updateData: any = {
      [`attendeesByBranch.${registrationData.branchId}`]: currentBranchCount + attendeeCount,
      status: newTotal >= schedule.maxAttendees ? 'full' : 'available'
    };
    
    console.log('[createEventRegistration] Updating schedule with:', updateData);
    
    await updateDoc(doc(db, SCHEDULES_COLLECTION, registrationData.scheduleId), updateData);
    
    console.log('[createEventRegistration] Registration created successfully:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating event registration:', error);
    throw error;
  }
}

// Cancel registration
export async function cancelEventRegistration(
  registrationId: string,
  reason: string,
  cancelledBy: string
): Promise<void> {
  try {
    // Get registration
    const regDoc = await getDoc(doc(db, REGISTRATIONS_COLLECTION, registrationId));
    if (!regDoc.exists()) {
      throw new Error('ไม่พบข้อมูลการลงทะเบียน');
    }
    
    const regData = regDoc.data();
    const registration = {
      id: regDoc.id,
      eventId: regData?.eventId,
      eventName: regData?.eventName,
      scheduleId: regData?.scheduleId,
      scheduleDate: regData?.scheduleDate?.toDate() || new Date(),
      scheduleTime: regData?.scheduleTime,
      branchId: regData?.branchId,
      isGuest: regData?.isGuest,
      lineUserId: regData?.lineUserId,
      lineDisplayName: regData?.lineDisplayName,
      linePictureUrl: regData?.linePictureUrl,
      parentId: regData?.parentId,
      parentName: regData?.parentName,
      parentPhone: regData?.parentPhone,
      parentEmail: regData?.parentEmail,
      parentAddress: regData?.parentAddress,
      parents: regData?.parents || [],
      students: regData?.students || [],
      attendeeCount: regData?.attendeeCount,
      status: regData?.status,
      registeredAt: regData?.registeredAt?.toDate() || new Date(),
      registeredFrom: regData?.registeredFrom,
      cancelledAt: regData?.cancelledAt?.toDate(),
      cancelledBy: regData?.cancelledBy,
      cancellationReason: regData?.cancellationReason,
      attended: regData?.attended,
      attendanceCheckedAt: regData?.attendanceCheckedAt?.toDate(),
      attendanceCheckedBy: regData?.attendanceCheckedBy,
      attendanceNote: regData?.attendanceNote,
      specialRequest: regData?.specialRequest,
      referralSource: regData?.referralSource
    } as EventRegistration;
    
    if (registration.status === 'cancelled') {
      throw new Error('การลงทะเบียนนี้ถูกยกเลิกแล้ว');
    }
    
    console.log('[cancelEventRegistration] Cancelling registration:', {
      registrationId,
      scheduleId: registration.scheduleId,
      branchId: registration.branchId,
      attendeeCount: registration.attendeeCount
    });
    
    // Get current schedule data
    const scheduleDoc = await getDoc(doc(db, SCHEDULES_COLLECTION, registration.scheduleId));
    if (!scheduleDoc.exists()) {
      throw new Error('ไม่พบข้อมูลรอบเวลา');
    }
    
    const scheduleData = scheduleDoc.data();
    const currentBranchCount = scheduleData?.attendeesByBranch?.[registration.branchId] || 0;
    const newBranchCount = Math.max(0, currentBranchCount - registration.attendeeCount); // Prevent negative
    
    console.log('[cancelEventRegistration] Current branch count:', currentBranchCount, 'New count:', newBranchCount);
    
    // Update registration
    await updateDoc(doc(db, REGISTRATIONS_COLLECTION, registrationId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy,
      cancellationReason: reason
    });
    
    // Update schedule attendee count - Fixed syntax
    const updateData: any = {
      [`attendeesByBranch.${registration.branchId}`]: newBranchCount,
      status: 'available' // Always available after cancellation
    };
    
    await updateDoc(doc(db, SCHEDULES_COLLECTION, registration.scheduleId), updateData);
    
    console.log('[cancelEventRegistration] Cancellation completed');
  } catch (error) {
    console.error('Error cancelling registration:', error);
    throw error;
  }
}

// Update attendance (bulk)
export async function updateEventAttendance(
  attendanceData: Array<{
    registrationId: string;
    attended: boolean;
    note?: string;
  }>,
  checkedBy: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();
    
    attendanceData.forEach(({ registrationId, attended, note }) => {
      const docRef = doc(db, REGISTRATIONS_COLLECTION, registrationId);
      
      batch.update(docRef, {
        attended,
        attendanceCheckedAt: now,
        attendanceCheckedBy: checkedBy,
        attendanceNote: note || null,
        status: attended ? 'attended' : 'no-show'
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
}

// ==================== Event Utilities ====================

// Check if registration is open
export function isRegistrationOpen(event: Event): boolean {
  const now = new Date();
  return event.status === 'published' &&
         now >= event.registrationStartDate &&
         now <= event.registrationEndDate;
}

// Get available schedules
export async function getAvailableSchedules(eventId: string): Promise<EventSchedule[]> {
  const schedules = await getEventSchedules(eventId);
  const now = new Date();
  
  return schedules.filter(schedule => {
    const scheduleDateTime = new Date(schedule.date);
    const [hours, minutes] = schedule.startTime.split(':');
    scheduleDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    return schedule.status === 'available' && scheduleDateTime > now;
  });
}

// Get event statistics
export async function getEventStatistics(eventId: string) {
  try {
    const [event, schedules, registrations] = await Promise.all([
      getEvent(eventId),
      getEventSchedules(eventId),
      getEventRegistrations(eventId)
    ]);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Calculate stats
    const totalCapacity = schedules.reduce((sum, s) => sum + s.maxAttendees, 0);
    const totalRegistered = registrations.filter(r => r.status !== 'cancelled').length;
    const totalAttended = registrations.filter(r => r.status === 'attended').length;
    const totalCancelled = registrations.filter(r => r.status === 'cancelled').length;
    
    // By branch
    const byBranch: Record<string, number> = {};
    registrations
      .filter(r => r.status !== 'cancelled')
      .forEach(r => {
        byBranch[r.branchId] = (byBranch[r.branchId] || 0) + r.attendeeCount;
      });
    
    // By schedule
    const bySchedule = schedules.map(schedule => {
      const scheduleRegs = registrations.filter(
        r => r.scheduleId === schedule.id && r.status !== 'cancelled'
      );
      
      return {
        scheduleId: schedule.id,
        date: schedule.date,
        startTime: schedule.startTime,
        maxAttendees: schedule.maxAttendees,
        registered: scheduleRegs.reduce((sum, r) => sum + r.attendeeCount, 0),
        attended: scheduleRegs.filter(r => r.status === 'attended').length
      };
    });
    
    return {
      totalCapacity,
      totalRegistered,
      totalAttended,
      totalCancelled,
      attendanceRate: totalRegistered > 0 ? (totalAttended / totalRegistered) * 100 : 0,
      byBranch,
      bySchedule
    };
  } catch (error) {
    console.error('Error getting event statistics:', error);
    throw error;
  }
}

// ==================== Event Reminder Functions ====================

// Get events for reminder
export async function getEventsForReminder(): Promise<Array<{
  event: Event;
  registrations: EventRegistration[];
}>> {
  try {
    // Get all active events with reminder enabled
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('status', '==', 'published'),
      where('enableReminder', '==', true),
      where('isActive', '==', true)
    );
    
    const eventsSnapshot = await getDocs(q);
    const results = [];
    
    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data() as DocumentData;
      const event = {
        id: eventDoc.id,
        name: eventData.name,
        description: eventData.description,
        fullDescription: eventData.fullDescription,
        imageUrl: eventData.imageUrl,
        location: eventData.location,
        locationUrl: eventData.locationUrl,
        branchIds: eventData.branchIds || [],
        eventType: eventData.eventType,
        highlights: eventData.highlights,
        targetAudience: eventData.targetAudience,
        whatToBring: eventData.whatToBring,
        registrationStartDate: eventData.registrationStartDate?.toDate() || new Date(),
        registrationEndDate: eventData.registrationEndDate?.toDate() || new Date(),
        countingMethod: eventData.countingMethod,
        enableReminder: eventData.enableReminder ?? true,
        reminderDaysBefore: eventData.reminderDaysBefore || 1,
        reminderTime: eventData.reminderTime,
        status: eventData.status,
        isActive: eventData.isActive ?? true,
        createdAt: eventData.createdAt?.toDate() || new Date(),
        createdBy: eventData.createdBy,
        updatedAt: eventData.updatedAt?.toDate(),
        updatedBy: eventData.updatedBy
      } as Event;
      
      // Get all schedules for this event
      const schedules = await getEventSchedules(event.id);
      
      // Check which schedules need reminders
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + (event.reminderDaysBefore || 1));
      tomorrow.setHours(0, 0, 0, 0);
      
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);
      
      const schedulesToRemind = schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= tomorrow && scheduleDate <= endOfTomorrow;
      });
      
      if (schedulesToRemind.length > 0) {
        // Get registrations for these schedules
        const registrations = [];
        for (const schedule of schedulesToRemind) {
          const scheduleRegs = await getScheduleRegistrations(schedule.id);
          registrations.push(...scheduleRegs);
        }
        
        // Filter only confirmed registrations with LINE ID
        const confirmedWithLine = registrations.filter(
          r => r.status === 'confirmed' && r.lineUserId
        );
        
        if (confirmedWithLine.length > 0) {
          results.push({ event, registrations: confirmedWithLine });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error getting events for reminder:', error);
    throw error;
  }
}

// Send event reminder
export async function sendEventReminder(
  registration: EventRegistration,
  event: Event
): Promise<boolean> {
  try {
    if (!registration.lineUserId) {
      return false;
    }
    
    // Import LINE notification service
    const { sendLineMessage } = await import('./line-notifications');
    
    // Format message
    const message = `🔔 เตือนงาน: ${event.name}
📅 ${registration.scheduleTime}
📍 สถานที่: ${event.location}
👥 ผู้เข้าร่วม: ${registration.attendeeCount} คน

ดูรายละเอียดเพิ่มเติม:
${process.env.NEXT_PUBLIC_APP_URL}/liff/my-events`;
    
    const result = await sendLineMessage(registration.lineUserId, message);
    
    return result.success;
  } catch (error) {
    console.error('Error sending event reminder:', error);
    return false;
  }
}