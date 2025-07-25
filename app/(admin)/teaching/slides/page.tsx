'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getClassesByTeacher } from '@/lib/services/classes';
import { getTeachingMaterials } from '@/lib/services/teaching-materials';
import { getSubject } from '@/lib/services/subjects';
import { TeachingMaterial, Subject } from '@/types/models';
import TeachingMaterialsViewer from '@/components/teaching/teaching-materials-viewer';
import SecureSlideViewer from '@/components/teaching/secure-slide-viewer';
import { Loader2 } from 'lucide-react';

export default function TeachingSlidesPage() {
  const { user, adminUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allMaterials, setAllMaterials] = useState<TeachingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected state
  const [selectedMaterial, setSelectedMaterial] = useState<TeachingMaterial | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get subjects that teacher can teach
      let subjectIds: string[] = [];
      
      if (adminUser?.role === 'teacher') {
        // Get classes for teacher
        const classes = await getClassesByTeacher(user.uid);
        // Get unique subject IDs
        subjectIds = [...new Set(classes.map(c => c.subjectId))];
      } else {
        // Admin can see all - get from all classes
        const { getClasses } = await import('@/lib/services/classes');
        const classes = await getClasses();
        subjectIds = [...new Set(classes.map(c => c.subjectId))];
      }
      
      // Load subjects and their materials
      const subjectsData: Subject[] = [];
      const materialsData: TeachingMaterial[] = [];
      
      for (const subjectId of subjectIds) {
        const subject = await getSubject(subjectId);
        if (subject) {
          subjectsData.push(subject);
          
          // Load materials for this subject
          try {
            const materials = await getTeachingMaterials(subjectId);
            const activeMaterials = materials.filter(m => m.isActive);
            materialsData.push(...activeMaterials);
          } catch (error) {
            console.error(`Error loading materials for subject ${subjectId}:`, error);
          }
        }
      }
      
      setSubjects(subjectsData);
      setAllMaterials(materialsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMaterial = (material: TeachingMaterial) => {
    setSelectedMaterial(material);
  };

  const handleBack = () => {
    setSelectedMaterial(null);
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

  // For slide viewer, we need to pass class info - just create a simple one
  const defaultClassInfo = {
    id: 'temp',
    name: 'การสอน',
    code: 'TEACH',
    subjectId: selectedMaterial?.subjectId || '',
    teacherId: user?.uid || '',
    branchId: '',
    roomId: '',
    startDate: new Date(),
    endDate: new Date(),
    totalSessions: 0,
    daysOfWeek: [],
    startTime: '',
    endTime: '',
    maxStudents: 0,
    minStudents: 0,
    enrolledCount: 0,
    pricing: {
      pricePerSession: 0,
      totalPrice: 0
    },
    status: 'started' as const,
    createdAt: new Date()
  };

  return (
    <div className="space-y-6">
      {!selectedMaterial ? (
        <TeachingMaterialsViewer
          subjects={subjects}
          materials={allMaterials}
          onSelectMaterial={handleSelectMaterial}
        />
      ) : (
        <SecureSlideViewer
          material={selectedMaterial}
          classInfo={defaultClassInfo}
          onBack={handleBack}
        />
      )}
    </div>
  );
}