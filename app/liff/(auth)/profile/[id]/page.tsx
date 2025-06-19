'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, User, MapPin, School, Loader2 } from 'lucide-react'
import { useLiff } from '@/components/liff/liff-provider'
import { getParent, updateParent } from '@/lib/services/parents'
import { getActiveBranches } from '@/lib/services/branches'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import TechLoadingAnimation from '@/components/liff/tech-loading-animation'


// Thai provinces data
const provinces = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร',
  'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง',
  'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม',
  'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส',
  'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พังงา', 'พัทลุง',
  'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่',
  'พะเยา', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน',
  'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง',
  'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย',
  'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี',
  'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
  'หนองบัวลำภู', 'อ่างทอง', 'อุดรธานี', 'อุทัยธานี', 'อุตรดิตถ์',
  'อุบลราชธานี', 'อำนาจเจริญ'
].sort()

// Form schema
const formSchema = z.object({
  displayName: z.string().min(1, 'กรุณาระบุชื่อ-นามสกุล'),
  phone: z.string().regex(/^[0-9]{10}$/, 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก'),
  emergencyPhone: z.string().regex(/^[0-9]{10}$/, 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก').optional().or(z.literal('')),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  preferredBranchId: z.string().optional(),
  address: z.object({
    houseNumber: z.string().min(1, 'กรุณาระบุบ้านเลขที่'),
    street: z.string().optional(),
    subDistrict: z.string().min(1, 'กรุณาระบุแขวง/ตำบล'),
    district: z.string().min(1, 'กรุณาระบุเขต/อำเภอ'),
    province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
    postalCode: z.string().regex(/^[0-9]{5}$/, 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'),
  })
})

type FormData = z.infer<typeof formSchema>

export default function EditParentProfilePage() {
  const router = useRouter()
  const params = useParams()
  const parentId = params.id as string
  const { profile } = useLiff()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([])
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  })

  useEffect(() => {
    loadData()
  }, [parentId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load parent data
      const parent = await getParent(parentId)
      if (!parent) {
        toast.error('ไม่พบข้อมูล')
        router.back()
        return
      }
      
      // Set form values
      setValue('displayName', parent.displayName)
      setValue('phone', parent.phone)
      setValue('emergencyPhone', parent.emergencyPhone || '')
      setValue('email', parent.email || '')
      setValue('preferredBranchId', parent.preferredBranchId || '')
      
      if (parent.address) {
        setValue('address.houseNumber', parent.address.houseNumber)
        setValue('address.street', parent.address.street || '')
        setValue('address.subDistrict', parent.address.subDistrict)
        setValue('address.district', parent.address.district)
        setValue('address.province', parent.address.province)
        setValue('address.postalCode', parent.address.postalCode)
      }
      
      // Load branches
      const branchList = await getActiveBranches()
      setBranches(branchList.map(b => ({ id: b.id, name: b.name })))
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      setSaving(true)
      
      await updateParent(parentId, {
        displayName: data.displayName,
        phone: data.phone,
        emergencyPhone: data.emergencyPhone || undefined,
        email: data.email || undefined,
        preferredBranchId: data.preferredBranchId || undefined,
        address: {
          houseNumber: data.address.houseNumber,
          street: data.address.street || undefined,
          subDistrict: data.address.subDistrict,
          district: data.address.district,
          province: data.address.province,
          postalCode: data.address.postalCode,
        }
      })
      
      toast.success('บันทึกข้อมูลเรียบร้อย')
      router.push('/liff/profile')
      
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
      return <TechLoadingAnimation />

  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/liff/profile')}
            className="text-white hover:text-white/80 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">แก้ไขข้อมูลผู้ปกครอง</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              ข้อมูลส่วนตัว
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">ชื่อ-นามสกุล *</Label>
              <Input
                id="displayName"
                {...register('displayName')}
                placeholder="ระบุชื่อ-นามสกุล"
              />
              {errors.displayName && (
                <p className="text-sm text-red-500 mt-1">{errors.displayName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="0812345678"
                  maxLength={10}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="emergencyPhone">เบอร์ฉุกเฉิน</Label>
                <Input
                  id="emergencyPhone"
                  {...register('emergencyPhone')}
                  placeholder="0812345678"
                  maxLength={10}
                />
                {errors.emergencyPhone && (
                  <p className="text-sm text-red-500 mt-1">{errors.emergencyPhone.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              ที่อยู่
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="houseNumber">บ้านเลขที่ *</Label>
                <Input
                  id="houseNumber"
                  {...register('address.houseNumber')}
                  placeholder="123/45"
                />
                {errors.address?.houseNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.address.houseNumber.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="street">ถนน</Label>
                <Input
                  id="street"
                  {...register('address.street')}
                  placeholder="ถนนสุขุมวิท"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subDistrict">แขวง/ตำบล *</Label>
                <Input
                  id="subDistrict"
                  {...register('address.subDistrict')}
                  placeholder="คลองตัน"
                />
                {errors.address?.subDistrict && (
                  <p className="text-sm text-red-500 mt-1">{errors.address.subDistrict.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="district">เขต/อำเภอ *</Label>
                <Input
                  id="district"
                  {...register('address.district')}
                  placeholder="คลองเตย"
                />
                {errors.address?.district && (
                  <p className="text-sm text-red-500 mt-1">{errors.address.district.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="province">จังหวัด *</Label>
                <Select
                  value={watch('address.province')}
                  onValueChange={(value) => setValue('address.province', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกจังหวัด" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.address?.province && (
                  <p className="text-sm text-red-500 mt-1">{errors.address.province.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="postalCode">รหัสไปรษณีย์ *</Label>
                <Input
                  id="postalCode"
                  {...register('address.postalCode')}
                  placeholder="10110"
                  maxLength={5}
                />
                {errors.address?.postalCode && (
                  <p className="text-sm text-red-500 mt-1">{errors.address.postalCode.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferred Branch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              สาขาที่สะดวก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={watch('preferredBranchId')}
              onValueChange={(value) => setValue('preferredBranchId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกสาขา" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              'บันทึกข้อมูล'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/liff/profile')}
            disabled={saving}
          >
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  )
}