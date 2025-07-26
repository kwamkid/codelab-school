'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BookOpen,
  Play,
  Search,
  Clock,
  Package,
  CheckSquare
} from 'lucide-react';
import { TeachingMaterial, Subject } from '@/types/models';

interface TeachingMaterialsViewerProps {
  subjects: Subject[];
  materials: TeachingMaterial[];
  onSelectMaterial: (material: TeachingMaterial) => void;
}

export default function TeachingMaterialsViewer({
  subjects,
  materials,
  onSelectMaterial
}: TeachingMaterialsViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');

  // Get unique session numbers
  const sessionNumbers = useMemo(() => {
    const numbers = [...new Set(materials.map(m => m.sessionNumber))].sort((a, b) => a - b);
    return numbers;
  }, [materials]);

  // Create subject map for easy lookup
  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    subjects.forEach(subject => {
      map[subject.id] = subject;
    });
    return map;
  }, [subjects]);

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      // Search filter
      const matchSearch = 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Subject filter
      const matchSubject = selectedSubject === 'all' || material.subjectId === selectedSubject;
      
      // Session filter
      const matchSession = selectedSession === 'all' || material.sessionNumber.toString() === selectedSession;
      
      return matchSearch && matchSubject && matchSession;
    });
  }, [materials, searchTerm, selectedSubject, selectedSession]);

  // Group materials by subject
  const materialsBySubject = useMemo(() => {
    const grouped: Record<string, TeachingMaterial[]> = {};
    
    filteredMaterials.forEach(material => {
      if (!grouped[material.subjectId]) {
        grouped[material.subjectId] = [];
      }
      grouped[material.subjectId].push(material);
    });
    
    // Sort materials within each subject by session number
    Object.keys(grouped).forEach(subjectId => {
      grouped[subjectId].sort((a, b) => a.sessionNumber - b.sessionNumber);
    });
    
    return grouped;
  }, [filteredMaterials]);

  if (subjects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">ไม่พบวิชาที่สามารถสอนได้</p>
          <p className="text-sm text-gray-500 mt-2">
            กรุณาติดต่อ Admin เพื่อกำหนดวิชาที่ต้องสอน
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Slides & เนื้อหาการสอน</h1>
        <p className="text-gray-600">เลือกบทเรียนที่ต้องการสอน</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex flex-col md:flex-row gap-3 md:w-auto">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="เลือกวิชา">
                    {selectedSubject === 'all' ? (
                      'ทุกวิชา'
                    ) : (
                      <span className="truncate">
                        {subjects.find(s => s.id === selectedSubject)?.name || 'เลือกวิชา'}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกวิชา</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{subject.name}</span>
                        <span className="text-gray-500 text-xs shrink-0">({subject.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="เลือกครั้งที่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกครั้ง</SelectItem>
                  {sessionNumbers.map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      ครั้งที่ {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อบทเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      {Object.keys(materialsBySubject).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบบทเรียนที่ตรงกับการค้นหา</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(materialsBySubject).map(([subjectId, subjectMaterials]) => {
            const subject = subjectMap[subjectId];
            if (!subject) return null;
            
            return (
              <div key={subjectId}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-lg font-semibold">{subject.name}</h2>
                  <Badge variant="outline" className="text-xs">{subject.code}</Badge>
                  <span className="text-sm text-gray-500">({subjectMaterials.length} บทเรียน)</span>
                </div>
                
                <div className="space-y-2">
                  {subjectMaterials.map(material => (
                    <Card
                      key={material.id}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
                      onClick={() => onSelectMaterial(material)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          {/* Session Number & Title */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <Badge 
                              variant="secondary" 
                              className="text-base font-bold px-3 py-1 shrink-0"
                            >
                              {material.sessionNumber}
                            </Badge>
                            
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-lg truncate">
                                {material.title}
                              </h3>
                              {material.description && (
                                <p className="text-sm text-gray-600 truncate">
                                  {material.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick Info */}
                          <div className="flex items-center gap-6 text-sm text-gray-500 shrink-0">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{material.duration} นาที</span>
                            </div>
                            
                            <div className="hidden md:flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <CheckSquare className="h-4 w-4" />
                                <span>{material.objectives.length}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                <span>{material.materials.length}</span>
                              </div>
                            </div>
                            
                            {/* Tags */}
                            {material.tags && material.tags.length > 0 && (
                              <div className="hidden lg:flex items-center gap-1">
                                {material.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {material.tags.length > 2 && (
                                  <span className="text-xs text-gray-400">
                                    +{material.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Action Button */}
                          <Button 
                            className="bg-blue-500 hover:bg-blue-600 shrink-0"
                            size="sm"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            เริ่มสอน
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}