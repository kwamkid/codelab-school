'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  GraduationCap,
  UserCheck,
  FileText,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'สาขา', href: '/branches', icon: Building2 },
  { name: 'ผู้ปกครอง', href: '/parents', icon: Users },
  { name: 'นักเรียน', href: '/students', icon: GraduationCap },
  { name: 'คลาสเรียน', href: '/classes', icon: Calendar },
  { name: 'ลงทะเบียน', href: '/enrollments', icon: UserCheck },
  { name: 'วิชา', href: '/subjects', icon: GraduationCap },
  { name: 'ครูผู้สอน', href: '/teachers', icon: UserCheck },
  { name: 'วันหยุด', href: '/holidays', icon: Calendar },
  { name: 'รายงาน', href: '/reports', icon: FileText },
  { name: 'ตั้งค่า', href: '/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">
            <span className="text-red-500">CODE</span>LAB
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Admin</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}