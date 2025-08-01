'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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

export default function TeachingSlidesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materialCounts, setMaterialCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get all active subjects
      const subjectsData = await getActiveSubjects();
      const counts: Record<string, number> = {};
      
      // Count materials for each subject
      for (const subject of subjectsData) {
        try {
          const materials = await getTeachingMaterials(subject.id);
          counts[subject.id] = materials.filter(m => m.isActive).length;
        } catch (error) {
          counts[subject.id] = 0;
        }
      }
      
      setSubjects(subjectsData);
      setMaterialCounts(counts);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

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

  // Get unique categories
  const categories = ['all', ...new Set(subjects.map(s => s.category))];

  // Filter and sort subjects
  const filteredSubjects = subjects
    .filter(subject => {
      const matchSearch = 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = selectedCategory === 'all' || subject.category === selectedCategory;
      
      return matchSearch && matchCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  // Group subjects by category
  const subjectsByCategory = filteredSubjects.reduce((acc, subject) => {
    if (!acc[subject.category]) {
      acc[subject.category] = [];
    }
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);

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