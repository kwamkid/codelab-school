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
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { PageLoading } from '@/components/ui/loading';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home 
  },
  {
    name: 'ข้อมูลพื้นฐาน',
    icon: Building,
    subItems: [
      { name: 'สาขา', href: '/branches', icon: Building2 },
      { name: 'ห้องเรียน', href: '/rooms', icon: School },
      { name: 'ครูผู้สอน', href: '/teachers', icon: UserCog },
      { name: 'วันหยุด', href: '/holidays', icon: CalendarDays },
      { name: 'วิชา', href: '/subjects', icon: BookOpen },
      { name: 'คลาสเรียน', href: '/classes', icon: GraduationCap },
    ]
  },
  {
    name: 'ลูกค้า',
    icon: Users,
    subItems: [
      { name: 'ผู้ปกครอง', href: '/parents', icon: Users },
      { name: 'นักเรียน', href: '/students', icon: UserCheck },
    ]
  },
  { 
    name: 'ลงทะเบียนเรียน', 
    href: '/enrollments', 
    icon: Calendar 
  },
  { 
    name: 'เรียนชดเชย', 
    href: '/makeup', 
    icon: Repeat 
  },
  { 
    name: 'ทดลองเรียน', 
    href: '/trial', 
    icon: TestTube 
  },
  { 
    name: 'ตั้งค่า', 
    href: '/settings', 
    icon: Settings 
  },
];

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
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [navigating, setNavigating] = useState(false);

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

  return (
    <LoadingProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Loading overlay - ใช้ PageLoading */}
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
            <div className="flex h-20 items-center justify-between px-6 border-b">
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
              {navigation.map((item) => (
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
                                isActive(subItem.href)
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
                        isActive(item.href)
                          ? 'bg-red-50/50 text-red-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                      onClick={() => {
                        setSidebarOpen(false);
                        setNavigating(true);
                      }}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </MenuLink>
                  )}
                </div>
              ))}
            </nav>
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