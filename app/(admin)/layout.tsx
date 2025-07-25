'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  CalendarDays,
  TestTube,
  Repeat,
  ChevronDown,
  ChevronRight,
  School,
  UserCheck,
  GraduationCap,
  Building,
  Loader2,
  Bell,
  Play,
  Shield,
  BarChart3,
  Key,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { BranchProvider } from '@/contexts/BranchContext';
import { BranchSelector } from '@/components/layout/branch-selector';
import { PageLoading } from '@/components/ui/loading';
import { getMakeupClasses } from '@/lib/services/makeup';
import { getUnreadNotifications, markNotificationAsRead } from '@/lib/services/notifications';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Navigation types
interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  badge?: number;
  subItems?: NavigationItem[];
  requiredRole?: ('super_admin' | 'branch_admin' | 'teacher')[];
  requiredPermission?: string;
}

// Custom Link component with loading
const MenuLink = ({ href, children, className, onClick }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Execute onClick if provided
    if (onClick) onClick();
    
    // Navigate
    await router.push(href);
    
    // Reset loading after navigation
    setTimeout(() => setIsLoading(false), 500);
  };
  
  return (
    <Link href={href} onClick={handleClick} className={className}>
      {isLoading ? (
        <div className="flex items-center">
          <Loader2 className="mr-3 h-4 w-4 animate-spin" />
          <span className="opacity-70">กำลังโหลด...</span>
        </div>
      ) : (
        children
      )}
    </Link>
  );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, adminUser, signOut, loading: authLoading, isSuperAdmin, canManageSettings } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [navigating, setNavigating] = useState(false);
  
  // Makeup badge state
  const [pendingMakeupCount, setPendingMakeupCount] = useState(0);
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load pending makeup count
  useEffect(() => {
    const loadMakeupCount = async () => {
      try {
        const makeupClasses = await getMakeupClasses();
        // นับเฉพาะที่เป็น pending และสร้างโดย system
        const pendingAuto = makeupClasses.filter(
          m => m.status === 'pending' && m.requestedBy === 'system'
        ).length;
        setPendingMakeupCount(pendingAuto);
      } catch (error) {
        console.error('Error loading makeup count:', error);
      }
    };
    
    if (user) {
      loadMakeupCount();
      // Refresh ทุก 30 วินาที
      const interval = setInterval(loadMakeupCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (user) {
        try {
          const unread = await getUnreadNotifications(user.uid);
          setNotifications(unread);
        } catch (error) {
          console.error('Error loading notifications:', error);
        }
      }
    };
    
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 60000); // ทุก 1 นาที
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-dropdown') && !target.closest('.notification-bell')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  // Filter navigation based on role
  const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter(item => {
      // Check role
      if (item.requiredRole && adminUser) {
        if (!item.requiredRole.includes(adminUser.role)) {
          return false;
        }
      }
      
      // Check permission
      if (item.requiredPermission) {
        if (item.requiredPermission === 'canManageSettings') {
          // Super admin สามารถเข้าได้เสมอ
          if (adminUser?.role === 'super_admin') return true;
          // อื่นๆ ตรวจสอบ permission
          if (!canManageSettings()) return false;
        }
      }
      
      // Filter sub items recursively
      if (item.subItems) {
        const filteredSubItems = filterNavigation(item.subItems);
        // ถ้าไม่มี sub items ที่แสดงได้ ให้ซ่อน parent ด้วย
        if (filteredSubItems.length === 0) return false;
        item.subItems = filteredSubItems;
      }
      
      return true;
    });
  };

  const navigation: NavigationItem[] = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: Home 
    },
    {
      name: 'ผู้ใช้งาน และครู',
      icon: Users,
      requiredRole: ['super_admin', 'branch_admin'],
      subItems: [
        { 
          name: 'ผู้ดูแลระบบ', 
          href: '/users', 
          icon: Shield,
          requiredRole: ['super_admin']
        },
        { 
          name: 'ครูผู้สอน', 
          href: '/teachers', 
          icon: UserCog,
          requiredRole: ['super_admin', 'branch_admin']
        },
      ]
    },
    {
      name: 'ข้อมูลพื้นฐาน',
      icon: Building,
      subItems: [
        { 
          name: 'สาขา', 
          href: '/branches', 
          icon: Building2,
          requiredRole: ['super_admin'] // เฉพาะ super admin
        },
        { 
          name: 'ห้องเรียน', 
          href: '/rooms', 
          icon: School,
          requiredRole: ['super_admin', 'branch_admin'] // admin ขึ้นไป
        },
        { 
          name: 'วันหยุด', 
          href: '/holidays', 
          icon: CalendarDays,
          requiredRole: ['super_admin', 'branch_admin'] // admin ขึ้นไป
        },
        { 
          name: 'วิชา', 
          href: '/subjects', 
          icon: BookOpen,
          requiredRole: ['super_admin'] // เฉพาะ super admin (ข้อมูลกลาง)
        },
      ]
    },
    {
        name: 'การสอน',
        icon: GraduationCap,
        requiredRole: ['super_admin', 'teacher'], // เพิ่ม super_admin
        subItems: [
          { 
            name: 'Slides & เนื้อหา', 
            href: '/teaching/slides', 
            icon: Play,
            requiredRole: ['super_admin', 'teacher']
          },
          // จะเพิ่มเมนูอื่นๆ ในอนาคต
        ]
      },
    {
      name: 'ลูกค้า',
      icon: Users,
      subItems: [
        { 
          name: 'ผู้ปกครอง', 
          href: '/parents', 
          icon: Users,
          requiredRole: ['super_admin', 'branch_admin'] // admin ขึ้นไป
        },
        { 
          name: 'นักเรียน', 
          href: '/students', 
          icon: UserCheck,
          requiredRole: ['super_admin', 'branch_admin'] // admin ขึ้นไป
        },
      ]
    },
    { 
      name: 'คลาสเรียน', 
      href: '/classes', 
      icon: GraduationCap
      // ทุกคนเห็นได้ แต่ teacher จะเห็นเฉพาะคลาสที่สอน
    },
    { 
      name: 'ลงทะเบียนเรียน', 
      href: '/enrollments', 
      icon: Calendar,
      requiredRole: ['super_admin', 'branch_admin'] // admin ขึ้นไป
    },
    { 
      name: 'ลาและชดเชย', 
      href: '/makeup', 
      icon: Repeat,
      badge: pendingMakeupCount > 0 ? pendingMakeupCount : undefined
      // ทุกคนเห็นได้ แต่ teacher เห็นเฉพาะของคลาสที่สอน
    },
    { 
      name: 'ทดลองเรียน', 
      href: '/trial', 
      icon: TestTube,
      requiredRole: ['super_admin', 'branch_admin'] // admin ขึ้นไป
    },
    {
      name: 'รายงาน',
      icon: BarChart3,
      requiredRole: ['super_admin', 'branch_admin'], // admin ขึ้นไป
      subItems: [
        { 
          name: 'ห้องและครูว่าง', 
          href: '/reports/availability', 
          icon: Calendar 
        },
      ]
    },
    { 
      name: 'ตั้งค่า', 
      href: '/settings', 
      icon: Settings,
      requiredPermission: 'canManageSettings' // ตรวจสอบ permission พิเศษ
    },
  ];

  const filteredNavigation = filterNavigation(navigation);

  // Auto-expand menu items based on current path
  useEffect(() => {
    const expandedMenus = filteredNavigation
      .filter(item => 
        item.subItems?.some(sub => pathname.startsWith(sub.href!))
      )
      .map(item => item.name);
    setExpandedItems(expandedMenus);
  }, [pathname]);

  // Reset navigating state when pathname changes
  useEffect(() => {
    setNavigating(false);
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
    return <PageLoading />;
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

  const handleNotificationClick = async (notif: any) => {
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
    await markNotificationAsRead(user.uid, notif.id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    setShowNotifications(false);
  };

  return (
    <LoadingProvider>
      <BranchProvider>
        <div className="h-screen overflow-hidden bg-gray-50">
          <div className="flex h-full">
            {/* Loading overlay */}
            {navigating && <PageLoading />}
            
            {/* Sidebar */}
            <div
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              )}
            >
              <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-6 border-b">
                  <div className="w-full">
                    <Image 
                      src="/logo.svg" 
                      alt="CodeLab School" 
                      width={150}
                      height={40}
                      className="w-full max-w-[180px]"
                      priority
                    />
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden ml-2"
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-6">
                  {filteredNavigation.map((item) => (
                    <div key={item.name} className="mb-2">
                      {item.subItems ? (
                        <>
                          <button
                            onClick={() => toggleExpanded(item.name)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-base font-normal transition-colors',
                              isSubItemActive(item)
                                ? 'bg-red-50/50 text-red-600'
                                : 'text-gray-700 hover:bg-gray-50'
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
                            <div className="mt-2 ml-8 space-y-1">
                              {item.subItems.map((subItem) => (
                                <MenuLink
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={cn(
                                    'flex items-center rounded-lg px-3 py-2 text-base font-normal transition-colors',
                                    isActive(subItem.href!)
                                      ? 'bg-red-50 text-red-600'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  )}
                                  onClick={() => {
                                    setSidebarOpen(false);
                                    setNavigating(true);
                                  }}
                                >
                                  <subItem.icon className="mr-3 h-4 w-4" />
                                  {subItem.name}
                                </MenuLink>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <MenuLink
                          href={item.href}
                          className={cn(
                            'flex items-center rounded-lg px-3 py-2.5 text-base font-normal transition-colors',
                            isActive(item.href!)
                              ? 'bg-red-50/50 text-red-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                          onClick={() => {
                            setSidebarOpen(false);
                            setNavigating(true);
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <item.icon className="mr-3 h-5 w-5" />
                              {item.name}
                            </div>
                            {item.badge && (
                              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-white bg-red-500 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </MenuLink>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Top bar */}
              <header className="h-16 bg-white shadow-sm px-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden"
                  >
                    <Menu className="h-6 w-6 text-gray-500" />
                  </button>

                  {/* Branch Selector - Desktop */}
                  <div className="hidden lg:flex items-center gap-4">
                    <BranchSelector />
                    
                    {/* Role Indicator */}
                    {adminUser && (
                      <div className="text-sm text-gray-600 px-3 py-1 bg-gray-100 rounded-md">
                        {adminUser.role === 'super_admin' && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            Super Admin
                          </span>
                        )}
                        {adminUser.role === 'branch_admin' && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            Branch Admin
                          </span>
                        )}
                        {adminUser.role === 'teacher' && (
                          <span className="flex items-center gap-1">
                            <UserCog className="h-3.5 w-3.5" />
                            Teacher
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Branch Selector and Right Side Items */}
                <div className="flex items-center gap-4 ml-auto">
                  {/* Branch Selector - Mobile */}
                  <div className="lg:hidden">
                    <BranchSelector />
                  </div>

                  {/* Notification Bell */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative notification-bell"
                      onClick={() => setShowNotifications(!showNotifications)}
                    >
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {notifications.length}
                        </span>
                      )}
                    </Button>
                    
                    {/* Notification Dropdown */}
                    {showNotifications && (
                      <div className="notification-dropdown absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                        <div className="p-4 border-b">
                          <h3 className="font-semibold">การแจ้งเตือน</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <p className="p-4 text-gray-500 text-center">ไม่มีการแจ้งเตือนใหม่</p>
                          ) : (
                            notifications.map(notif => (
                              <div
                                key={notif.id}
                                className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleNotificationClick(notif)}
                              >
                                <p className="font-medium text-sm">{notif.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {formatDate(notif.sentAt, 'short')}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Dropdown */}
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
                            {adminUser?.displayName || user.displayName || 'Admin'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                          {adminUser && (
                            <Badge 
                              variant="secondary" 
                              className="mt-1 text-xs w-fit"
                            >
                              {adminUser.role === 'super_admin' ? 'Super Admin' : 
                               adminUser.role === 'branch_admin' ? 'Branch Admin' : 'Teacher'}
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {/* เมนู Profile สำหรับทุก role */}
                      <DropdownMenuItem 
                        onClick={() => {
                          router.push('/profile');
                        }}
                      >
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>โปรไฟล์ของฉัน</span>
                      </DropdownMenuItem>
                      
                      {/* เมนู Change Password สำหรับทุก role */}
                      <DropdownMenuItem 
                        onClick={() => {
                          router.push('/profile/change-password');
                        }}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        <span>เปลี่ยนรหัสผ่าน</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>ออกจากระบบ</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Page content - ใช้ calc เพื่อหักความสูงของ header */}
              <main className="h-[calc(100%-4rem)] overflow-y-auto overflow-x-hidden overscroll-contain">
                <div className="p-4 md:p-6 pb-12">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>
      </BranchProvider>
    </LoadingProvider>
  );
}