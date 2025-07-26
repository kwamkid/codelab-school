'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen,
  Plus,
  ArrowRight,
  Layers,
  Clock,
  Search
} from 'lucide-react';
import { getActiveSubjects } from '@/lib/services/subjects';
import { getTeachingMaterials } from '@/lib/services/teaching-materials';
import { Subject, TeachingMaterial } from '@/types/models';
import { toast } from 'sonner';
import { ActionButton } from '@/components/ui/action-button';
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

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const matchSearch = 
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCategory = selectedCategory === 'all' || subject.category === selectedCategory;
    
    return matchSearch && matchCategory;
  });

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
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

      {/* Subjects by Category */}
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
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold">หมวดหมู่</h2>
                <Badge className={getCategoryColor(category)} variant="secondary">
                  {category}
                </Badge>
                <span className="text-gray-500">({categorySubjects.length} วิชา)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorySubjects.map((subject) => {
                  const materialCount = materialCounts[subject.id] || 0;
                  
                  return (
                    <Card
                      key={subject.id}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                      onClick={() => router.push(`/teaching-materials/${subject.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{subject.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{subject.code}</p>
                          </div>
                          <Badge className={getLevelBadgeColor(subject.level)} variant="secondary">
                            {subject.level}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Material Count - Prominent Display */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-center gap-2">
                            <Layers className="h-5 w-5 text-gray-600" />
                            <span className="text-2xl font-bold text-gray-800">
                              {materialCount}
                            </span>
                            <span className="text-gray-600 font-medium">
                              บทเรียน
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            อายุ {subject.ageRange.min}-{subject.ageRange.max} ปี
                          </span>
                          
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                            จัดการ
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
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