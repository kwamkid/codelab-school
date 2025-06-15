'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getGeneralSettings } from '@/lib/services/settings';
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
  X,
  ChevronDown,
  BookOpen,
  CalendarCheck,
  Home,
  CalendarDays
} from 'lucide-react';
import Image from 'next/image';

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'ข้อมูลพื้นฐาน',
    icon: Building2,
    children: [
      { name: 'สาขา', href: '/branches', icon: Home },
      { name: 'วิชา', href: '/subjects', icon: BookOpen },
      { name: 'ครูผู้สอน', href: '/teachers', icon: UserCheck },
      { name: 'วันหยุด', href: '/holidays', icon: CalendarCheck },
    ]
  },
  {
    name: 'ลูกค้า',
    icon: Users,
    children: [
      { name: 'ผู้ปกครอง', href: '/parents', icon: Users },
      { name: 'นักเรียน', href: '/students', icon: GraduationCap },
    ]
  },
  {
    name: 'จัดการคลาส',
    icon: Calendar,
    children: [
      { name: 'คลาสเรียน', href: '/classes', icon: Calendar },
      { name: 'Makeup Class', href: '/makeup', icon: CalendarDays },
    ]
  },
  { name: 'ลงทะเบียน', href: '/enrollments', icon: UserCheck },
  { name: 'รายงาน', href: '/reports', icon: FileText },
  { name: 'ตั้งค่า', href: '/settings', icon: Settings },
];

function NavItem({ item, pathname, setSidebarOpen }: { 
  item: NavigationItem; 
  pathname: string; 
  setSidebarOpen: (open: boolean) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href ? pathname === item.href : item.children?.some(child => pathname === child.href);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors w-full ${
            isActive ? 'bg-red-50 text-red-600' : ''
          }`}
        >
          <item.icon className="h-5 w-5" />
          <span className="flex-1 text-left">{item.name}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="mt-1 ml-4 space-y-1">
            {item.children.map((child) => {
              if (!child.href) return null;
              return (
                <Link
                  key={child.name}
                  href={child.href}
                  className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors ${
                    pathname === child.href ? 'bg-red-50 text-red-600' : 'text-gray-600'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <child.icon className="h-4 w-4" />
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!item.href) return null;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors ${
        pathname === item.href ? 'bg-red-50 text-red-600' : ''
      }`}
      onClick={() => setSidebarOpen(false)}
    >
      <item.icon className="h-5 w-5" />
      <span>{item.name}</span>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getGeneralSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

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
          <div className="flex items-center gap-3">
            {/* Logo */}
            {settings?.logoUrl ? (
              <div className="relative w-[230px] h-[60px]">
                <Image 
                  src={settings.logoUrl} 
                  alt={settings.schoolName || 'School Logo'} 
                  width={230}
                  height={60}
                  className="object-contain object-left"
                  priority
                  unoptimized // สำหรับ external URL
                />
              </div>
            ) : (
              <div className="relative h-[60px]" style={{ width: '230px' }}>
                <Image 
                  src="/logo.svg" 
                  alt="CodeLab Logo" 
                  fill
                  className="object-contain object-left"
                />
              </div>
            )}
          </div>
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
                <NavItem item={item} pathname={pathname} setSidebarOpen={setSidebarOpen} />
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