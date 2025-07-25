'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Filter
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Slides & เนื้อหาการสอน</h1>
        <p className="text-gray-600">เลือกบทเรียนที่ต้องการสอน</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อบทเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <SelectValue placeholder="เลือกวิชา" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกวิชา</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <div className="flex items-center gap-2">
                      <span>{subject.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {subject.code}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="เลือกครั้งที่" />
                </div>
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
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">วิชาทั้งหมด</p>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">บทเรียนทั้งหมด</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ผลการค้นหา</p>
                <p className="text-2xl font-bold">{filteredMaterials.length}</p>
              </div>
              <Search className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">จำนวนครั้ง</p>
                <p className="text-2xl font-bold">{sessionNumbers.length}</p>
              </div>
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

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
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold">{subject.name}</h2>
                  <Badge variant="outline">{subject.code}</Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {subjectMaterials.length} บทเรียน
                  </Badge>
                </div>
                
                <div className="grid gap-3">
                  {subjectMaterials.map(material => (
                    <Card
                      key={material.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onSelectMaterial(material)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                ครั้งที่ {material.sessionNumber}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {material.duration} นาที
                              </span>
                              {material.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <h3 className="font-semibold text-lg mb-1">
                              {material.title}
                            </h3>
                            
                            {material.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {material.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>🎯 {material.objectives.length} จุดประสงค์</span>
                              <span>📦 {material.materials.length} อุปกรณ์</span>
                              <span>✅ {material.preparation.length} การเตรียมการ</span>
                            </div>
                          </div>
                          
                          <Button className="ml-4 bg-blue-500 hover:bg-blue-600">
                            <Play className="h-4 w-4 mr-2" />
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