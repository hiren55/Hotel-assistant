'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Hotel,
  BedDouble,
  CalendarCheck,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Search,
  Bell,
  Globe,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/auth-store';
import { WidgetColorProvider } from '@/lib/context/WidgetColorContext';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['hotel_staff', 'hotel_manager', 'hotel_owner', 'super_admin'] },
  { name: 'Hotel', href: '/hotel', icon: Hotel, roles: ['hotel_owner', 'super_admin'] },
  { name: 'Rooms', href: '/rooms', icon: BedDouble, roles: ['hotel_manager', 'hotel_owner', 'super_admin'] },
  { name: 'Bookings', href: '/bookings', icon: CalendarCheck, roles: ['hotel_staff', 'hotel_manager', 'hotel_owner', 'super_admin'] },
  { name: 'AI Bot', href: '/bot', icon: Bot, roles: ['hotel_owner', 'super_admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['hotel_owner', 'super_admin'] },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { user: authUser, isAuthenticated, isEmailVerified, logout, initializeAuth, checkAuthStatus } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      setIsInitialized(true);
    };
    init();
  }, [initializeAuth]);

  // Periodically re-check auth status to catch session expiration
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      void checkAuthStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isInitialized, checkAuthStatus]);

  // Filter navigation based on role
  const userRole = authUser?.role || 'hotel_staff';
  const navigation = navigationItems.filter(item => item.roles.includes(userRole));

  // Role-based route protection
  useEffect(() => {
    if (isInitialized && isAuthenticated && authUser) {
      const currentPath = pathname;
      const allowedPaths = navigationItems
        .filter(item => item.roles.includes(authUser.role))
        .map(item => item.href);
      
      // Check if current path starts with any allowed path
      const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
      
      // Special case: /dashboard is always allowed after auth
      if (!isAllowed && currentPath !== '/dashboard' && currentPath !== '/') {
        console.warn(`Unauthorized access attempt to ${currentPath} by role ${authUser.role}. Redirecting...`);
        router.push('/dashboard');
      }
    }
  }, [isInitialized, isAuthenticated, authUser, pathname, router]);

  // Redirect to login if not authenticated, or to verify-email if not verified
  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isEmailVerified) {
        // User is authenticated but email not verified - redirect to verify-email
        router.push('/verify-email');
      } else if (authUser && !authUser.onboardingComplete) {
        // User is authenticated but hasn't completed onboarding
        router.push('/onboarding');
      }
    }
  }, [isInitialized, isAuthenticated, isEmailVerified, authUser, router]);

  // Derive display user from auth state
  const user = {
    name: authUser?.name || 'User',
    email: authUser?.email || '',
    roleLabel: authUser?.role === 'hotel_owner' ? 'Owner' : 
               authUser?.role === 'hotel_manager' ? 'Manager' : 
               authUser?.role === 'hotel_staff' ? 'Staff' : 'Super Admin',
    jobTitle: authUser?.jobTitle || (authUser?.role === 'hotel_owner' ? 'Owner' : 
                                   authUser?.role === 'hotel_manager' ? 'Manager' : 'Staff'),
    initials: authUser?.name
      ? authUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U',
  };

  const handleLogout = () => {
    // Don't await - let logout happen in background while we redirect immediately
    // The logout function clears state synchronously in the finally block
    logout().catch(() => {
      // Ignore errors - logout will still clear local state
    });
    // Redirect immediately for fast UX
    router.push('/login');
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard content if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard content if email not verified
  if (!isEmailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Email verification required...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div
        className={classNames(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className={classNames(
            'fixed inset-0 bg-gray-900/80 transition-opacity',
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={classNames(
            'fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-[#1C2539] transition-transform',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-6">
            <div className="flex flex-col items-start pt-2">
              <span className="text-xl font-bold text-white">Concierge AI</span>
              <span className="text-[10px] uppercase tracking-widest text-[#8a98bc]">Premium Edition</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col px-3 py-4">
            <ul className="flex flex-1 flex-col gap-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      pathname.startsWith(item.href)
                        ? 'bg-[#293450] text-white border-l-4 border-indigo-400'
                        : 'text-[#8a98bc] hover:bg-[#202b44] hover:text-white',
                      'group flex gap-x-3 rounded-md p-3 text-sm font-medium'
                    )}
                    onClick={() => void setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group flex w-full gap-x-3 rounded-md p-3 text-sm font-medium text-[#8a98bc] hover:bg-[#202b44] hover:text-white"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Log out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#1C2539] px-6">
          <div className="flex h-20 shrink-0 flex-col justify-center pt-2">
            <span className="text-xl font-bold text-white tracking-wide">Concierge AI</span>
            <span className="text-[10px] font-semibold text-[#8a98bc] uppercase tracking-widest mt-1">Premium Edition</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      pathname.startsWith(item.href)
                        ? 'bg-[#26314D] text-white'
                        : 'text-[#8a98bc] hover:bg-[#202b44] hover:text-white',
                      'group flex gap-x-3 rounded-md p-3 text-sm font-medium relative'
                    )}
                  >
                    {pathname.startsWith(item.href) && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-sm"></div>
                    )}
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group flex w-full gap-x-3 rounded-md p-3 text-sm font-medium text-[#8a98bc] hover:bg-[#202b44] hover:text-white mb-6"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen bg-[#F8F9FD]">
        <div className="sticky top-0 z-40 flex h-16 bg-[#EEF0F8] shrink-0 items-center gap-x-4 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
            <div className="flex flex-1">
              <div className="w-full max-w-lg relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search analytics or guests..."
                  className="w-full bg-[#E0E4F0] text-sm text-gray-700 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button className="text-gray-500 hover:text-gray-700 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#EEF0F8]"></span>
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <Globe className="h-5 w-5" />
              </button>

              <div className="h-6 w-px bg-gray-300" aria-hidden="true" />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-x-3 outline-none hover:bg-gray-200/50 p-1 pr-2 rounded-full transition-colors leading-tight">
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-sm font-semibold text-gray-800">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                      {user.jobTitle}
                    </span>
                  </div>
                  <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-gray-200">
                    <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="py-8 bg-[#F8F9FD] flex-1">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <WidgetColorProvider>{children}</WidgetColorProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
