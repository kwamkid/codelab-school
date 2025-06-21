'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Users,
  GraduationCap,
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  DollarSign,
  CalendarCheck,
  TestTube,
  FileText,
  Repeat,
  ChevronDown,
  ChevronRight,
  School,
  CalendarDays,
  MessageSquare,
  Sparkles,
  Gift
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { LoadingProvider } from '@/contexts/LoadingContext';

const navigation = [
  { name: 'หน้าหลัก', href: '/dashboard', icon: Home },
  { name: 'สาขา', href: '/branches', icon: Building2 },
  { name: 'นักเรียน', href: '/students', icon: Users },
  { name: 'ผู้ปกครอง', href: '/parents', icon: Users },
  { name: 'ครู', href: '/teachers', icon: UserCog },
  { name: 'วิชา', href: '/subjects', icon: BookOpen },
  {
    name: 'คลาสเรียน',
    icon: School,
    subItems: [
      { name: 'รายการคลาส', href: '/classes', icon: BookOpen },
      { name: 'ตารางเรียน', href: '/schedules', icon: Calendar },
      { name: 'เช็คชื่อ', href: '/attendance', icon: CalendarCheck },
      { name: 'Makeup Class', href: '/makeup', icon: Repeat },
    ]
  },
  {
    name: 'การเงิน',
    icon: DollarSign,
    subItems: [
      { name: 'รายการชำระเงิน', href: '/payments', icon: DollarSign },
      { name: 'ใบเสร็จ', href: '/receipts', icon: FileText },
    ]
  },
  { name: 'ทดลองเรียน', href: '/trial', icon: TestTube },
  { name: 'วันหยุด', href: '/holidays', icon: CalendarDays },
  { name: 'โปรโมชั่น', href: '/promotions', icon: Gift },
  { 
    name: 'LINE Integration', 
    href: '/line-integration', 
    icon: MessageSquare,
    badge: 'New'
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Auto-expand menu items based on current path
  useEffect(() => {
    const expandedMenus = navigation
      .filter(item => 
        item.subItems?.some(sub => pathname.startsWith(sub.href))
      )
      .map(item => item.name);
    setExpandedItems(expandedMenus);
  }, [pathname]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isSubItemActive = (item: any) => {
    return item.subItems?.some((sub: any) => pathname.startsWith(sub.href));
  };

  return (
    <LoadingProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-4 shadow-sm">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-red-500" />
                CodeLab School
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.subItems ? (
                    <>
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                          isSubItemActive(item)
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </div>
                        {expandedItems.includes(item.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {expandedItems.includes(item.name) && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.subItems.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={cn(
                                'flex items-center rounded-lg px-2 py-2 text-sm transition-colors',
                                isActive(subItem.href)
                                  ? 'bg-red-100 text-red-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              )}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <subItem.icon className="mr-3 h-4 w-4" />
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-red-50 text-red-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Settings */}
            <div className="border-t p-4">
              <Link
                href="/settings"
                className={cn(
                  'flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                  isActive('/settings')
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="mr-3 h-5 w-5" />
                ตั้งค่า
              </Link>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6 text-gray-500" />
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      <AvatarImage
                        src={user.photoURL || ''}
                        alt={user.displayName || ''}
                      />
                      <AvatarFallback>
                        {user.displayName?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || 'Admin'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </LoadingProvider>
  );
}