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
  ChevronDown,
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

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Hotel', href: '/hotel', icon: Hotel },
  { name: 'Rooms', href: '/rooms', icon: BedDouble },
  { name: 'Bookings', href: '/bookings', icon: CalendarCheck },
  { name: 'AI Bot', href: '/bot', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
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
      checkAuthStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isInitialized, checkAuthStatus]);

  // Redirect to login if not authenticated, or to verify-email if not verified
  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isEmailVerified) {
        // User is authenticated but email not verified - redirect to verify-email
        router.push('/verify-email');
      }
    }
  }, [isInitialized, isAuthenticated, isEmailVerified, router]);

  // Derive display user from auth state
  const user = {
    name: authUser?.name || 'User',
    email: authUser?.email || '',
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
          sidebarOpen ? '' : 'pointer-events-none'
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
            'fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white transition-transform',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-6">
            <span className="text-xl font-bold text-primary">Hotel Assistant</span>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col px-3 py-4">
            <ul className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      pathname.startsWith(item.href)
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100',
                      'group flex gap-x-3 rounded-md p-3 text-sm font-semibold'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group flex w-full gap-x-3 rounded-md p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
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
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <div className="flex h-16 shrink-0 items-center">
            <span className="text-xl font-bold text-primary">Hotel Assistant</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      pathname.startsWith(item.href)
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100',
                      'group flex gap-x-3 rounded-md p-3 text-sm font-semibold'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group flex w-full gap-x-3 rounded-md p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Log out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-x-2 outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
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

        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
