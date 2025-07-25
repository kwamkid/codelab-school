'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X,
  Maximize2, 
  Minimize2,
  BookOpen,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { TeachingMaterial, Class } from '@/types/models';

interface SecureSlideViewerProps {
  material: TeachingMaterial;
  classInfo: Class;
  onBack: () => void;
}

export default function SecureSlideViewer({ 
  material,
  classInfo,
  onBack 
}: SecureSlideViewerProps) {
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
      } else if (e.key === 'r' || e.key === 'R') {
        refreshSlides();
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
              <h2 className="font-semibold text-lg">{material.title}</h2>
              <p className="text-sm opacity-80">{classInfo.name} - ครั้งที่ {material.sessionNumber}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSlides}
                title="Refresh Slides (R)"
                className="bg-white text-black border-gray-300 hover:bg-gray-100"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
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
              src={material.embedUrl}
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
                    {material.objectives.map((obj: string, index: number) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <div className="font-medium text-green-300 mb-2">📦 อุปกรณ์ที่ใช้</div>
                  <div className="flex flex-wrap gap-1">
                    {material.materials?.map((item: string, index: number) => (
                      <span key={index} className="bg-gray-700 px-2 py-1 rounded text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-yellow-300 mb-2">✅ เตรียมการ</div>
                  <ul className="list-disc list-inside space-y-1 text-gray-300 text-xs">
                    {material.preparation?.map((prep: string, index: number) => (
                      <li key={index}>{prep}</li>
                    ))}
                  </ul>
                </div>
                
                {material.teachingNotes && (
                  <div>
                    <div className="font-medium text-orange-300 mb-2">📝 บันทึกสำหรับครู</div>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap">
                      {material.teachingNotes}
                    </p>
                  </div>
                )}
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
              <span><kbd className="bg-gray-700 px-1 rounded">R</kbd> รีเฟรช</span>
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
          
          <h1 className="text-3xl font-bold">{material.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 mt-2">
            <span>ครั้งที่ {material.sessionNumber}</span>
            <span>{material.duration} นาที</span>
            <span className="text-sm">{classInfo.name}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshSlides}
            title="Refresh Slides (R)"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
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
              src={material.embedUrl}
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
              {material.objectives.map((obj: string, index: number) => (
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
              {material.materials?.map((item: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {item}
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
              {material.preparation?.map((prep: string, index: number) => (
                <li key={index}>{prep}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {material.teachingNotes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>📝 บันทึกสำหรับครู</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{material.teachingNotes}</p>
            </CardContent>
          </Card>
        )}
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
            <div><kbd className="bg-white px-2 py-1 rounded">R</kbd> รีเฟรช Slides</div>
            <div><kbd className="bg-white px-2 py-1 rounded">Esc</kbd> ออก/กลับ</div>
            <div className="col-span-2"><kbd className="bg-white px-2 py-1 rounded">Space/Arrow</kbd> เปลี่ยนหน้า Slides (ใช้ controls ของ Canva)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}