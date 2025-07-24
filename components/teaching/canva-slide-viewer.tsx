'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  X,
  Maximize2, 
  Minimize2,
  BookOpen,
  Clock,
  Users,
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

// Sample data สำหรับทดสอบ
const sampleSlides = [
  {
    id: 'DAGn6E-6Uho',
    title: '[VEX GO] W12 MARS MATH EXPEDITION',
    subject: 'VEX Robotics',
    sessionNumber: 12,
    // ใช้ present mode URL ที่ซ่อน UI
    embedUrl: 'https://www.canva.com/design/DAGn6E-6Uho/HkNpZzV5tk6Df9WQQNY-9A/view?embed&ui=eyJBIjp7IkIiOmZhbHNlLCJDIjpmYWxzZX19&utm_content=DAGn6E-6Uho&utm_campaign=designshare&utm_medium=embeds&utm_source=link',
    thumbnailUrl: 'https://via.placeholder.com/400x225/4285f4/ffffff?text=VEX+MARS+MATH',
    duration: 90,
    objectives: [
      'เข้าใจการใช้คณิตศาสตร์ในการสำรวจอวกาศ',
      'สามารถเขียนโปรแกรมให้ robot เคลื่อนที่ตามเส้นทาง',
      'ประยุกต์ใช้ sensor ในการวัดระยะทาง',
      'ทำงานร่วมกันในการแก้ปัญหา'
    ],
    materials: [
      'VEX GO Robot Kit',
      'Distance Sensor',
      'Mars Map Mat',
      'Calculation Worksheets'
    ],
    preparation: [
      'ตรวจสอบ robot ให้พร้อมใช้งาน',
      'เตรียม Mars Map และวางในตำแหน่งที่ถูกต้อง',
      'ทดสอบ sensor ก่อนเริ่มคลาส',
      'เตรียมใบงานคำนวณ'
    ]
  },
  {
    id: 'DAGpkPoTu4s',
    title: 'VEXG02 - Week 3 Parade Float',
    subject: 'VEX Robotics',
    sessionNumber: 3,
    embedUrl: 'https://www.canva.com/design/DAGpkPoTu4s/rMrmoDWLDno8rtoCTtoCTtARig/view?embed&ui=eyJBIjp7IkIiOmZhbHNlLCJDIjpmYWxzZX19&utm_content=DAGpkPoTu4s&utm_campaign=designshare&utm_medium=embeds&utm_source=link',
    thumbnailUrl: 'https://via.placeholder.com/400x225/ea4335/ffffff?text=VEX+PARADE+FLOAT',
    duration: 90,
    objectives: [
      'เข้าใจหลักการสร้าง Parade Float',
      'สามารถใช้ sensors ควบคุมการเคลื่อนที่',
      'ออกแบบ robot ให้สวยงามและใช้งานได้',
      'นำเสนอผลงานต่อหน้าชั้นเรียน'
    ],
    materials: [
      'VEX GO Robot Kit',
      'Bumper Sensor',
      'Eye Sensor',
      'Decorative Materials'
    ],
    preparation: [
      'เตรียมอุปกรณ์ตซแต่ง robot',
      'ตรวจสอบ sensor ทุกตัว',
      'เตรียมพื้นที่สำหรับ parade',
      'เตรียมกล้องถ่าย VDO'
    ]
  },
  {
    id: 'python-basics',
    title: 'Python Fundamentals - Getting Started',
    subject: 'Python Programming',
    sessionNumber: 1,
    embedUrl: '#',
    thumbnailUrl: 'https://via.placeholder.com/400x225/34a853/ffffff?text=PYTHON+BASICS',
    duration: 75,
    objectives: [
      'เข้าใจพื้นฐานของภาษา Python',
      'สามารถติดตั้งและใช้งาน Python IDE',
      'เขียน "Hello World" โปรแกรมแรก',
      'เข้าใจ syntax พื้นฐาน'
    ],
    materials: [
      'Computer/Laptop',
      'Python 3.x',
      'VS Code or PyCharm',
      'Practice Worksheets'
    ],
    preparation: [
      'ตรวจสอบการติดตั้ง Python ในทุกเครื่อง',
      'เตรียม sample code files',
      'ทดสอบ internet connection',
      'เตรียมใบงานแบบฝึกหัด'
    ]
  }
];

const sampleClasses = [
  {
    id: 'vex-a',
    name: 'VEX Robotics Level 1 - Group A',
    subject: 'VEX Robotics',
    time: '14:00 - 15:30',
    students: 8,
    room: 'Room A1'
  },
  {
    id: 'python-b',
    name: 'Python Programming - Beginner',
    subject: 'Python Programming',
    time: '16:00 - 17:30',
    students: 12,
    room: 'Room B2'
  }
];

// หน้าหลักสำหรับเลือก Class และ Session
const SlideSelection = ({ onSelectSlide }: { onSelectSlide: (slide: any) => void }) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);

  useEffect(() => {
    if (selectedClass) {
      const classInfo = sampleClasses.find(c => c.id === selectedClass);
      if (classInfo) {
        const sessions = sampleSlides.filter(slide => slide.subject === classInfo.subject);
        setAvailableSessions(sessions);
      }
    } else {
      setAvailableSessions([]);
    }
  }, [selectedClass]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">เลือก Slides สำหรับการสอน</h1>
        <p className="text-gray-600">เลือกคลาสและครั้งที่เรียน เพื่อเริ่มการสอน</p>
      </div>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            เลือกคลาสที่จะสอน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {sampleClasses.map((cls) => (
              <div
                key={cls.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedClass === cls.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedClass(cls.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{cls.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">วิชา: {cls.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {cls.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {cls.students} คน
                      </span>
                      <span>{cls.room}</span>
                    </div>
                  </div>
                  {selectedClass === cls.id && (
                    <Badge className="bg-blue-500">เลือกแล้ว</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Selection */}
      {availableSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>เลือกครั้งที่เรียน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {availableSessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <div className="w-48 h-28 bg-gray-100 flex-shrink-0">
                      <img 
                        src={session.thumbnailUrl}
                        alt={session.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start h-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">ครั้งที่ {session.sessionNumber}</Badge>
                            <span className="text-sm text-gray-500">{session.duration} นาที</span>
                          </div>
                          <h3 className="font-semibold mb-2">{session.title}</h3>
                          
                          <div className="text-sm text-gray-600">
                            <div className="font-medium mb-1">🎯 เป้าหมายการเรียนรู้:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {session.objectives.slice(0, 2).map((obj: string, index: number) => (
                                <li key={index}>{obj}</li>
                              ))}
                              {session.objectives.length > 2 && (
                                <li className="text-gray-500">และอีก {session.objectives.length - 2} รายการ...</li>
                              )}
                            </ul>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-4">
                          <Button 
                            onClick={() => onSelectSlide(session)}
                            className="bg-blue-500 hover:bg-blue-600"
                            disabled={session.embedUrl === '#'}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            เริ่มสอน
                          </Button>
                          
                          <Button 
                            variant="outline"
                            onClick={() => onSelectSlide(session)}
                            disabled={session.embedUrl === '#'}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            ดูข้อมูล
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Secure Slide Viewer - ซ่อน URL และแสดง effects
const SecureSlideViewer = ({ 
  slide, 
  onBack 
}: { 
  slide: any; 
  onBack: () => void; 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Toggle CSS fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Refresh iframe (เพื่อ restart slides)
  const refreshSlides = () => {
    setIframeKey(prev => prev + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onBack();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowControls(!showControls);
      } else if (e.key === 'i' || e.key === 'I') {
        setShowInfo(!showInfo);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showControls, showInfo, isFullscreen, onBack]);

  // Prevent right-click context menu on iframe
  useEffect(() => {
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    document.addEventListener('contextmenu', preventRightClick);
    return () => document.removeEventListener('contextmenu', preventRightClick);
  }, []);

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
        {/* Controls - Fullscreen */}
        {showControls && (
          <div className="bg-black bg-opacity-80 text-white p-4 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">{slide.title}</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                title="Exit Fullscreen (F)"
                className="bg-white text-black border-gray-300 hover:bg-gray-100"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInfo(!showInfo)}
                title="Toggle Info (I)"
                className="bg-white text-black border-gray-300 hover:bg-gray-100"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowControls(false)}
                title="Hide controls (H)"
                className="bg-white text-black border-gray-300 hover:bg-gray-100"
              >
                Hide
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                title="Back (Esc)"
                className="bg-red-500 text-white border-red-500 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Slide Content */}
          <div className={`${showInfo && showControls ? 'w-3/4' : 'w-full'} relative`}>
            <iframe
              key={iframeKey}
              src={slide.embedUrl}
              className="w-full h-full border-none"
              allowFullScreen
              allow="autoplay; fullscreen"
              style={{
                // ป้องกันการแสดง URL
                pointerEvents: 'auto',
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
            
            {/* Overlay to prevent URL inspection */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: -1 }}
            />
          </div>

          {/* Info Panel */}
          {showInfo && showControls && (
            <div className="w-1/4 bg-black bg-opacity-90 text-white p-4 overflow-y-auto">
              <h3 className="font-semibold mb-4">ข้อมูลการสอน</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <div className="font-medium text-blue-300 mb-2">🎯 เป้าหมายการเรียนรู้</div>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {slide.objectives.map((obj: string, index: number) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <div className="font-medium text-green-300 mb-2">📦 อุปกรณ์ที่ใช้</div>
                  <div className="flex flex-wrap gap-1">
                    {slide.materials?.map((material: string, index: number) => (
                      <span key={index} className="bg-gray-700 px-2 py-1 rounded text-xs">
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-yellow-300 mb-2">✅ เตรียมการ</div>
                  <ul className="list-disc list-inside space-y-1 text-gray-300 text-xs">
                    {slide.preparation?.map((prep: string, index: number) => (
                      <li key={index}>{prep}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {showControls && (
          <div className="bg-black bg-opacity-70 px-4 py-2 text-xs text-white">
            <div className="flex justify-center gap-6">
              <span>🎯 โหมดการสอน</span>
              <span><kbd className="bg-gray-700 px-1 rounded">H</kbd> ซ่อน/แสดง</span>
              <span><kbd className="bg-gray-700 px-1 rounded">I</kbd> ข้อมูล</span>
              <span><kbd className="bg-gray-700 px-1 rounded">F</kbd> ออก</span>
              <span><kbd className="bg-gray-700 px-1 rounded">Esc</kbd> กลับ</span>
            </div>
          </div>
        )}

        {/* Hidden controls button */}
        {!showControls && (
          <div className="absolute bottom-4 right-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowControls(true)}
              className="bg-white text-black border-gray-300 hover:bg-gray-100"
            >
              Show Controls
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Normal mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Button 
            onClick={onBack}
            variant="outline" 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปเลือกคลาส
          </Button>
          
          <h1 className="text-3xl font-bold">{slide.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 mt-2">
            <span>ครั้งที่ {slide.sessionNumber}</span>
            <span>{slide.duration} นาที</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            เต็มจอ
          </Button>
        </div>
      </div>

      {/* Slide Content */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <iframe
              key={iframeKey}
              src={slide.embedUrl}
              className="w-full h-[600px] border-none rounded-lg"
              allowFullScreen
              allow="autoplay; fullscreen"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🎯 เป้าหมายการเรียนรู้</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {slide.objectives.map((obj: string, index: number) => (
                <li key={index}>{obj}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📦 อุปกรณ์ที่ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {slide.materials?.map((material: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {material}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>✅ เตรียมการก่อนสอน</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {slide.preparation?.map((prep: string, index: number) => (
                <li key={index}>{prep}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Keyboard Shortcuts */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">⌨️ คีย์ลัด</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><kbd className="bg-white px-2 py-1 rounded">F</kbd> เต็มจอ/ออกจากเต็มจอ</div>
            <div><kbd className="bg-white px-2 py-1 rounded">H</kbd> ซ่อน/แสดง Controls</div>
            <div><kbd className="bg-white px-2 py-1 rounded">I</kbd> แสดงข้อมูล (เต็มจอ)</div>
            <div><kbd className="bg-white px-2 py-1 rounded">Esc</kbd> ออก/กลับ</div>
            <div className="col-span-2"><kbd className="bg-white px-2 py-1 rounded">Space/Arrow</kbd> เปลี่ยนหน้า Slides (ใช้ controls ของ Canva)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Component
const SecureCanvaViewer = () => {
  const [currentSlide, setCurrentSlide] = useState<any>(null);

  const handleSelectSlide = (slide: any) => {
    setCurrentSlide(slide);
  };

  const handleBack = () => {
    setCurrentSlide(null);
  };

  return (
    <div className="space-y-6">
      {!currentSlide ? (
        <SlideSelection onSelectSlide={handleSelectSlide} />
      ) : (
        <SecureSlideViewer
          slide={currentSlide}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default SecureCanvaViewer;