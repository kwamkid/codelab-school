'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  User, 
  School, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  Plus,
  AlertCircle,
  Calendar,
  Users,
  Loader2
} from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParentByLineId, getStudentsByParent, deleteStudent as deleteStudentService } from '@/lib/services/parents'
import { getBranch } from '@/lib/services/branches'
import { toast } from 'sonner'
import type { Parent, Student, Branch } from '@/types/models'
import { LiffProvider } from '@/components/liff/liff-provider'
import { Loading } from '@/components/ui/loading'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function ProfileContent() {
  const router = useRouter()
  const { liff, profile, isLoggedIn, isLoading: liffLoading } = useLiff()
  const [parentData, setParentData] = useState<Parent | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [preferredBranch, setPreferredBranch] = useState<Branch | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [parentId, setParentId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  
  // Delete confirmation state
  const [deleteStudentData, setDeleteStudentData] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [navigating, setNavigating] = useState(false)

  // Check authentication
  useEffect(() => {
    if (!liffLoading) {
      if (!isLoggedIn && liff) {
        console.log('[ProfileContent] Not logged in, redirecting...')
        liff.login()
      } else if (isLoggedIn) {
        setAuthChecked(true)
      }
    }
  }, [liffLoading, isLoggedIn, liff])

  useEffect(() => {
    if (profile?.userId && authChecked) {
      loadParentData(profile.userId)
    }
  }, [profile, authChecked])

  const loadParentData = async (lineUserId: string) => {
    try {
      setIsLoadingData(true)
      
      // Get parent data using service function
      const parent = await getParentByLineId(lineUserId)
      console.log('Parent data:', parent)
      
      if (parent) {
        setParentData(parent)
        setParentId(parent.id)

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

  const handleLogout = async () => {
    if (liff) {
      setNavigating(true)
      await liff.logout()
    }
  }

  const navigateTo = (path: string) => {
    setNavigating(true)
    router.push(path)
  }

  const calculateAge = (birthdate: any) => {
    let birth: Date;
    
    // Handle different birthdate formats
    if (birthdate?.seconds) {
      birth = new Date(birthdate.seconds * 1000);
    } else if (birthdate?.toDate && typeof birthdate.toDate === 'function') {
      birth = birthdate.toDate();
    } else if (birthdate instanceof Date) {
      birth = birthdate;
    } else if (typeof birthdate === 'string') {
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

  const handleDeleteStudent = async () => {
    if (!deleteStudentData || !parentId) return

    try {
      setIsDeleting(true)
      
      // Call delete function
      await deleteStudentService(parentId, deleteStudentData.id)
      
      // Update local state
      setStudents(prev => prev.filter(s => s.id !== deleteStudentData.id))
      
      toast.success('ลบข้อมูลนักเรียนเรียบร้อยแล้ว')
      setDeleteStudentData(null)
    } catch (error: any) {
      console.error('Error deleting student:', error)
      toast.error(error.message || 'ไม่สามารถลบข้อมูลได้')
    } finally {
      setIsDeleting(false)
    }
  }

  // Show loading while checking auth or loading data
  if (liffLoading || !authChecked || isLoadingData) {
    return <Loading fullScreen text="กำลังโหลดข้อมูล..." />
  }

  // Show navigating overlay
  if (navigating) {
    return <Loading fullScreen text="กำลังโหลด..." />
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
              onClick={() => navigateTo('/liff')}
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
            disabled={navigating}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Parent Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                ข้อมูลผู้ปกครอง
              </CardTitle>
              {parentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo(`/liff/profile/${parentId}`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
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
                <h3 className="font-semibold">{parentData?.displayName || profile?.displayName || 'ไม่ระบุชื่อ'}</h3>
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
          </CardContent>
        </Card>

        {/* Students Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                รายชื่อนักเรียน ({students.length} คน)
              </CardTitle>
              {parentId && (
                <Button
                  size="sm"
                  onClick={() => navigateTo(`/liff/profile/${parentId}/students/new`)}
                  disabled={navigating}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  เพิ่ม
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">ยังไม่มีข้อมูลนักเรียน</p>
                <Button 
                  onClick={() => navigateTo(`/liff/profile/${parentId}/students/new`)}
                  className="gap-2"
                  disabled={!parentId || navigating}
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
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => navigateTo(`/liff/profile/${parentId}/students/${student.id}`)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.profileImage} />
                        <AvatarFallback>
                          {student.nickname?.charAt(0) || student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{student.nickname || student.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{student.gradeLevel || 'ไม่ระบุชั้นเรียน'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            อายุ {calculateAge(student.birthdate)} ปี
                          </span>
                          {student.schoolName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <School className="h-3 w-3" />
                                {student.schoolName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigateTo(`/liff/profile/${parentId}/students/${student.id}`)
                        }}
                        disabled={navigating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteStudentData(student)
                        }}
                        disabled={navigating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
                onClick={() => navigateTo('/liff/schedule')}
                disabled={navigating}
              >
                <School className="h-6 w-6" />
                <span className="text-sm">ตารางเรียน</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigateTo('/liff/makeup')}
                disabled={navigating}
              >
                <Users className="h-6 w-6" />
                <span className="text-sm">Makeup Class</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStudentData} onOpenChange={() => setDeleteStudentData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              ยืนยันการลบข้อมูล
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบข้อมูลของ <strong>{deleteStudentData?.nickname || deleteStudentData?.name}</strong> ใช่หรือไม่?
              <br />
              <span className="text-destructive text-sm mt-2 block">
                ⚠️ การลบข้อมูลนี้ไม่สามารถย้อนกลับได้
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                'ยืนยันการลบ'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <LiffProvider requireLogin={true}>
      <ProfileContent />
    </LiffProvider>
  );
}