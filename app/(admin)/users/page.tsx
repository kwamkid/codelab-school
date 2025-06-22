'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Shield, 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Key,
  Ban,
  CheckCircle,
  Loader2,
  Users,
  Building2
} from 'lucide-react';
import { AdminUser } from '@/types/models';
import { getAdminUsers, updateAdminUser, sendPasswordReset } from '@/lib/services/admin-users';
import { getBranches } from '@/lib/services/branches';
import { Branch } from '@/types/models';
import { toast } from 'sonner';
import UserFormDialog from '@/components/users/user-form-dialog';
import AddRightsDialog from '@/components/users/add-rights-dialog';
import { formatDate } from '@/lib/utils';

export default function UsersPage() {
  const { adminUser, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddRightsDialog, setShowAddRightsDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Check permission
  useEffect(() => {
    if (!loading && !isSuperAdmin()) {
      router.push('/dashboard');
    }
  }, [loading, isSuperAdmin, router]);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData] = await Promise.all([
        getAdminUsers(),
        getBranches()
      ]);
      setUsers(usersData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await updateAdminUser(
        user.id,
        { isActive: !user.isActive },
        adminUser?.id || ''
      );
      
      toast.success(user.isActive ? 'ระงับการใช้งานเรียบร้อย' : 'เปิดใช้งานเรียบร้อย');
      await loadData();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    if (!confirm(`ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${user.email}?`)) return;
    
    try {
      await sendPasswordReset(user.email);
      toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านเรียบร้อย');
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งลิงก์');
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    );
  });

  // Get role display
  const getRoleDisplay = (role: string) => {
    const roleMap = {
      'super_admin': 'Super Admin',
      'branch_admin': 'Branch Admin',
      'teacher': 'Teacher'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  // Get role color
  const getRoleColor = (role: string) => {
    const colorMap = {
      'super_admin': 'destructive',
      'branch_admin': 'default',
      'teacher': 'secondary'
    };
    return colorMap[role as keyof typeof colorMap] as any || 'default';
  };

  // Get branch names
  const getBranchNames = (branchIds: string[]) => {
    if (!branchIds || branchIds.length === 0) return 'ทุกสาขา';
    
    const branchNames = branchIds
      .map(id => branches.find(b => b.id === id)?.name)
      .filter(Boolean);
    
    if (branchNames.length === 0) return 'ทุกสาขา';
    if (branchNames.length === branches.length) return 'ทุกสาขา';
    
    return branchNames.join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!isSuperAdmin()) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-500" />
            จัดการผู้ใช้งาน
          </h1>
          <p className="text-gray-600 mt-1">จัดการผู้ใช้งานและสิทธิ์การเข้าถึง</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-red-500 hover:bg-red-600"
            disabled // ปิดไว้ก่อน
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มผู้ใช้งาน
          </Button>
          
          <Button 
            onClick={() => setShowAddRightsDialog(true)}
            variant="outline"
          >
            <Shield className="h-4 w-4 mr-2" />
            เพิ่มสิทธิ์ผู้ใช้ที่มีอยู่
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ผู้ใช้ทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              ใช้งาน {users.filter(u => u.isActive).length} คน
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admin</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'super_admin').length}
            </div>
            <p className="text-xs text-muted-foreground">
              มีสิทธิ์สูงสุดในระบบ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branch Admin</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'branch_admin').length}
            </div>
            <p className="text-xs text-muted-foreground">
              จัดการเฉพาะสาขา
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อหรืออีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ใช้งาน</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>สาขา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>เข้าใช้งานล่าสุด</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleColor(user.role)}>
                      {getRoleDisplay(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {getBranchNames(user.branchIds)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          ใช้งาน
                        </>
                      ) : (
                        <>
                          <Ban className="h-3 w-3 mr-1" />
                          ระงับ
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {user.updatedAt ? formatDate(user.updatedAt, 'short') : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setEditingUser(user);
                            setShowCreateDialog(true);
                          }}
                          disabled={user.id === adminUser?.id}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          แก้ไขข้อมูล
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleResetPassword(user)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          รีเซ็ตรหัสผ่าน
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleActive(user)}
                          disabled={user.id === adminUser?.id}
                          className={user.isActive ? 'text-red-600' : ''}
                        >
                          {user.isActive ? (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              ระงับการใช้งาน
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              เปิดใช้งาน
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'ไม่พบผู้ใช้งานที่ค้นหา' : 'ยังไม่มีผู้ใช้งาน'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <UserFormDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
        branches={branches}
        onSuccess={loadData}
      />

      {/* Add Rights Dialog */}
      <AddRightsDialog
        open={showAddRightsDialog}
        onOpenChange={setShowAddRightsDialog}
        branches={branches}
        onSuccess={loadData}
      />
    </div>
  );
}