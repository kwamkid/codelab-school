'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getActiveSubjects } from '@/lib/services/subjects';
import { getTeachingMaterials } from '@/lib/services/teaching-materials';
import { Subject } from '@/types/models';
import { Loader2, BookOpen, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Cache key constants
const QUERY_KEYS = {
  subjects: ['subjects', 'active'],
  materials: (subjectId: string) => ['teaching-materials', subjectId],
  allMaterials: ['teaching-materials', 'counts'],
};

// Custom hook to fetch material counts
const useMaterialCounts = (subjects: Subject[], enabled: boolean) => {
  return useQuery({
    queryKey: QUERY_KEYS.allMaterials,
    queryFn: async () => {
      const counts: Record<string, number> = {};
      
      // Fetch materials for all subjects in parallel
      const promises = subjects.map(async (subject) => {
        try {
          const materials = await getTeachingMaterials(subject.id);
          counts[subject.id] = materials.filter(m => m.isActive).length;
        } catch (error) {
          counts[subject.id] = 0;
        }
      });
      
      await Promise.all(promises);
      return counts;
    },
    enabled: enabled && subjects.length > 0,
    staleTime: 300000, // 5 minutes
  });
};

export default function TeachingSlidesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch subjects using React Query
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: QUERY_KEYS.subjects,
    queryFn: getActiveSubjects,
    enabled: !!user,
    staleTime: 300000, // 5 minutes
  });

  // Fetch material counts
  const { data: materialCounts = {}, isLoading: loadingCounts } = useMaterialCounts(subjects, !!user);

  // Get unique categories with memoization
  const categories = useMemo(() => {
    const uniqueCategories = new Set(subjects.map(s => s.category));
    return ['all', ...Array.from(uniqueCategories)];
  }, [subjects]);

  // Filter and sort subjects with memoization
  const filteredSubjects = useMemo(() => {
    return subjects
      .filter(subject => {
        const matchSearch = 
          subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subject.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchCategory = selectedCategory === 'all' || subject.category === selectedCategory;
        
        return matchSearch && matchCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [subjects, searchTerm, selectedCategory]);

  // Group subjects by category with memoization
  const subjectsByCategory = useMemo(() => {
    return filteredSubjects.reduce((acc, subject) => {
      if (!acc[subject.category]) {
        acc[subject.category] = [];
      }
      acc[subject.category].push(subject);
      return acc;
    }, {} as Record<string, Subject[]>);
  }, [filteredSubjects]);

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 text-green-700';
      case 'Intermediate':
        return 'bg-blue-100 text-blue-700';
      case 'Advanced':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Loading state
  const isLoading = loadingSubjects || loadingCounts;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Skeleton className="h-10 w-full md:w-[200px]" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </CardContent>
        </Card>

        {/* Grid Skeleton */}
        <div className="space-y-6">
          {[...Array(2)].map((_, categoryIndex) => (
            <div key={categoryIndex}>
              <Skeleton className="h-6 w-32 mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Slides & เนื้อหาการสอน</h1>
        <p className="text-gray-600 mt-1">เลือกวิชาที่ต้องการสอน</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                {categories.filter(c => c !== 'all').map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาวิชา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      {Object.keys(subjectsByCategory).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {subjects.length === 0 
                ? 'ไม่พบวิชาในระบบ' 
                : 'ไม่พบวิชาที่ตรงกับการค้นหา'}
            </p>
            {subjects.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                กรุณาติดต่อ Admin เพื่อเพิ่มวิชาในระบบ
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 text-gray-700">{category}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {categorySubjects.map((subject) => {
                  const materialCount = materialCounts[subject.id] || 0;
                  
                  return (
                    <Card
                      key={subject.id}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4"
                      style={{ borderLeftColor: subject.color }}
                      onClick={() => router.push(`/teaching/slides/${subject.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div 
                            className="text-2xl font-bold"
                            style={{ color: subject.color }}
                          >
                            {materialCount}
                          </div>
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: subject.color + '20',
                              color: subject.color 
                            }}
                          >
                            {subject.level}
                          </Badge>
                        </div>
                        
                        <h3 className="font-medium text-sm line-clamp-2 mb-1">
                          {subject.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {subject.code} • {subject.ageRange.min}-{subject.ageRange.max} ปี
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}