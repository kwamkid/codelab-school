'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen,
  ArrowRight,
  Layers,
  Search,
  Loader2
} from 'lucide-react';
import { getActiveSubjects } from '@/lib/services/subjects';
import { getTeachingMaterials } from '@/lib/services/teaching-materials';
import { Subject, TeachingMaterial } from '@/types/models';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeachingMaterialsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materialCounts, setMaterialCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const subjectsData = await getActiveSubjects();
      setSubjects(subjectsData);
      
      // Load material counts for each subject
      const counts: Record<string, number> = {};
      for (const subject of subjectsData) {
        try {
          const materials = await getTeachingMaterials(subject.id);
          counts[subject.id] = materials.filter(m => m.isActive).length;
        } catch (error) {
          counts[subject.id] = 0;
        }
      }
      setMaterialCounts(counts);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Coding':
        return 'bg-blue-100 text-blue-700';
      case 'Robotics':
        return 'bg-green-100 text-green-700';
      case 'AI':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
    .sort((a, b) => {
      // Sort by name alphabetically
      return a.name.localeCompare(b.name, 'th');
    });

  // Group subjects by category for display
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">จัดการสื่อการสอน</h1>
          <p className="text-gray-600 mt-1">เลือกวิชาเพื่อจัดการ Slides และเนื้อหาการสอน</p>
        </div>
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
            <p className="text-gray-600">ไม่พบวิชาที่ตรงกับการค้นหา</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 text-gray-700">{category}</h2>
              
              <div className="space-y-2">
                {categorySubjects.map((subject) => {
                  const materialCount = materialCounts[subject.id] || 0;
                  
                  return (
                    <Card
                      key={subject.id}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={() => router.push(`/teaching-materials/${subject.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Material Count - Big Number */}
                          <div className="bg-gray-50 rounded-lg p-4 min-w-[80px] text-center">
                            <div className="text-3xl font-bold text-gray-800">
                              {materialCount}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              บทเรียน
                            </div>
                          </div>
                          
                          {/* Subject Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {subject.name}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {subject.code} • อายุ {subject.ageRange.min}-{subject.ageRange.max} ปี
                                </p>
                                {subject.description && (
                                  <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                                    {subject.description}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Badge className={getLevelBadgeColor(subject.level)} variant="secondary">
                                  {subject.level}
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-blue-600 hover:text-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/teaching-materials/${subject.id}`);
                                  }}
                                >
                                  จัดการ
                                  <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
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