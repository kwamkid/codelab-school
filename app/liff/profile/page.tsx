'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { User, Users, School, LogOut, ChevronRight, ChevronLeft, MapPin, Phone, Mail } from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParentByLineId, getStudentsByParent } from '@/lib/services/parents'
import { getBranch } from '@/lib/services/branches'
import { toast } from 'sonner'
import type { Parent, Student, Branch } from '@/types/models'
import AuthWrapper from '@/components/liff/auth-wrapper'

function ProfileContent() {
  const router = useRouter()
  const { liff, profile, isLoggedIn } = useLiff()
  const [parentData, setParentData] = useState<Parent | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [preferredBranch, setPreferredBranch] = useState<Branch | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [parentId, setParentId] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.userId) {
      loadParentData(profile.userId)
    }
  }, [profile])

  const loadParentData = async (lineUserId: string) => {
    try {
      setIsLoadingData(true)
      
      // Get parent data using service function
      const parent = await getParentByLineId(lineUserId)
      console.log('Parent data:', parent)
      
      if (parent) {
        setParentData(parent)
        setParentId(parent.id) // เก็บ parent ID

        // Load preferred branch
        if (parent.preferredBranchId) {
          const branch = await getBranch(parent.preferredBranchId)
          if (branch) {
            setPreferredBranch(branch)
          }
        }

        // Load students
        const studentsList = await getStudentsByParent(parent.id)
        console.log('Students:', studentsList)
        
        // Debug birthdate format
        if (studentsList.length > 0) {
          console.log('First student birthdate:', studentsList[0].birthdate)
          console.log('Birthdate type:', typeof studentsList[0].birthdate)
        }
        
        setStudents(studentsList.filter(student => student.isActive))
      } else {
        console.log('No parent data found for LINE ID:', lineUserId)
      }
    } catch (error) {
      console.error('Error loading parent data:', error)
      toast.error("ไม่สามารถโหลดข้อมูลได้")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleLogout = () => {
    if (liff) {
      liff.logout()
    }
  }

  const calculateAge = (birthdate: any) => {
    let birth: Date;
    
    // Handle different birthdate formats
    if (birthdate?.seconds) {
      // Firestore Timestamp
      birth = new Date(birthdate.seconds * 1000);
    } else if (birthdate?.toDate && typeof birthdate.toDate === 'function') {
      // Firestore Timestamp with toDate method
      birth = birthdate.toDate();
    } else if (birthdate instanceof Date) {
      // Already a Date object
      birth = birthdate;
    } else if (typeof birthdate === 'string') {
      // String date
      birth = new Date(birthdate);
    } else {
      console.error('Invalid birthdate format:', birthdate);
      return 0;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  const formatAddress = (address?: Parent['address']) => {
    if (!address) return 'ไม่ได้ระบุ'
    
    const parts = [
      address.houseNumber,
      address.street && `ถ.${address.street}`,
      address.subDistrict && `แขวง${address.subDistrict}`,
      address.district && `เขต${address.district}`,
      address.province,
      address.postalCode
    ].filter(Boolean)
    
    return parts.join(' ') || 'ไม่ได้ระบุ'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/liff')}
              className="text-white hover:text-white/80 -ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">โปรไฟล์</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:text-white/80"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Parent Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              ข้อมูลผู้ปกครอง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.pictureUrl} />
                <AvatarFallback>
                  {profile?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{profile?.displayName || 'ไม่ระบุชื่อ'}</h3>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {parentData?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>โทร: {parentData.phone}</span>
                  {parentData.emergencyPhone && (
                    <span className="text-muted-foreground">
                      (ฉุกเฉิน: {parentData.emergencyPhone})
                    </span>
                  )}
                </div>
              )}
              
              {parentData?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{parentData.email}</span>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium">ที่อยู่: </span>
                  <span className={parentData?.address ? '' : 'text-red-500'}>
                    {formatAddress(parentData?.address)}
                  </span>
                  {!parentData?.address && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs h-auto p-0 ml-2"
                      onClick={() => router.push('/liff/edit-profile')}
                    >
                      กรุณากรอกที่อยู่
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {preferredBranch && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2 text-sm">
                  <School className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{preferredBranch.name}</p>
                    {preferredBranch.address && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {preferredBranch.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => parentId && router.push(`/liff/profile/${parentId}`)}
              disabled={!parentId}
            >
              แก้ไขข้อมูล
            </Button>
          </CardContent>
        </Card>

        {/* Students Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                รายชื่อนักเรียน
              </CardTitle>
              {students.length > 0 && parentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/liff/profile/${parentId}/students`)}
                >
                  จัดการ
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">ยังไม่มีข้อมูลนักเรียน</p>
                <Button 
                  onClick={() => router.push(`/liff/profile/${parentId}/students/new`)}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  ลงทะเบียนนักเรียน
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/liff/profile/${parentId}/students/${student.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.profileImage} />
                        <AvatarFallback>
                          {student.nickname?.charAt(0) || student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.nickname || student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.gradeLevel || 'ไม่ระบุชั้นเรียน'} • อายุ {calculateAge(student.birthdate)} ปี
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}

                <Button 
                  className="w-full mt-4 bg-red-500 hover:bg-red-600"
                  onClick={() => router.push(`/liff/profile/${parentId}/students/new`)}
                >
                  เพิ่มนักเรียน
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {students.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>เมนูลัด</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push('/liff/schedule')}
              >
                <School className="h-6 w-6" />
                <span className="text-sm">ตารางเรียน</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push('/liff/makeup')}
              >
                <Users className="h-6 w-6" />
                <span className="text-sm">Makeup Class</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthWrapper>
      <ProfileContent />
    </AuthWrapper>
  );
}