import { useState, useEffect } from 'react';
import { Parent, Student } from '@/types/models';
import { getParentByLineId, getStudentsByParent } from '@/lib/services/parents';
import { useLiff } from '@/components/liff/liff-provider';

interface UseLiffParentReturn {
  parent: Parent | null;
  students: Student[];
  loading: boolean;
  error: Error | null;
  isRegistered: boolean;
  refetch: () => Promise<void>;
}

export function useLiffParent(): UseLiffParentReturn {
  const { profile, isLoggedIn } = useLiff();
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchParentData = async () => {
    if (!profile?.userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get parent by LINE ID
      const parentData = await getParentByLineId(profile.userId);
      
      if (parentData) {
        setParent(parentData);
        
        // Get students
        const studentsData = await getStudentsByParent(parentData.id);
        setStudents(studentsData);
      } else {
        setParent(null);
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching parent data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && profile?.userId) {
      fetchParentData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, profile?.userId]);

  return {
    parent,
    students,
    loading,
    error,
    isRegistered: !!parent,
    refetch: fetchParentData,
  };
}