'use client';

import { CalendarCheck, TrendingUp, Loader2, Bot, Sparkles } from 'lucide-react';
import { useMyHotel, useDashboardSummary } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  loading,
  className,
  iconClassName,
  chartElement,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ElementType;
  loading?: boolean;
  className?: string;
  iconClassName?: string;
  chartElement?: React.ReactNode;
  subtitle?: string;
}) {
  if (loading) {
    return (
      <Card className={`overflow-hidden border-none shadow-sm rounded-3xl ${className}`}>
        <CardContent className="p-6 h-48 flex flex-col justify-between">
          <Skeleton className="h-4 w-32 bg-white/40" />
          <Skeleton className="h-10 w-24 bg-white/40 mb-2" />
          <Skeleton className="h-4 w-32 bg-white/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden border-none shadow-sm rounded-3xl relative h-48 flex flex-col justify-between p-6 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-600 uppercase mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-bold tracking-tight text-gray-900">{value}</h3>
            {subtitle && <span className="text-sm font-medium text-gray-500 whitespace-nowrap">{subtitle}</span>}
          </div>
          
          {change && (
            <div className="mt-4 flex items-center mb-8">
              <span className="font-bold flex items-center text-sm">
                {changeType === 'positive' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
                )}
                <span className={changeType === 'positive' ? 'text-gray-900' : 'text-gray-900'}>
                  {changeType === 'positive' ? '+' : ''}{change}
                </span>
              </span>
              <span className="text-sm text-gray-500 ml-2 font-medium">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl flex items-center justify-center ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {chartElement && (
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
          {chartElement}
        </div>
      )}
    </Card>
  );
}

function getBookingStatusBadge(status: string) {
  const variants: Record<string, string> = {
    confirmed: 'bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold',
    pending: 'bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold',
    cancelled: 'bg-red-50 text-red-600 hover:bg-red-100 font-semibold',
  };

  return (
    <span className={`px-3 py-1 text-xs rounded-full ${variants[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 22) return 'Good Evening';
  return 'Good Night';
}

function formatDateRange(checkIn: string, checkOut: string) {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const f1 = d1.toLocaleDateString('en-US', options);
  const f2 = d2.toLocaleDateString('en-US', options);
  
  return { start: f1, end: f2 };
}

export default function DashboardPage() {
  const { user: authUser } = useAuthStore();
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(hotel?.id || '');

  const recentBookings = summary?.recentBookings || [];
  const isLoading = hotelLoading || summaryLoading;
  const greeting = getGreeting();
  const userName = authUser?.name?.split(' ')[0] || 'User';

  return (
    <div className="space-y-6">
      <div className="mb-8 mt-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {greeting}, {userName}
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Here's what's happening at {summary?.hotelName || hotel?.name || 'your hotel'} today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatsCard
          title="TOTAL BOOKINGS"
          value={summary?.totalBookings ?? 0}
          icon={CalendarCheck}
          className="bg-[#EBF1FF]"
          iconClassName="bg-[#DCE6FA] text-gray-800"
          chartElement={
            <svg viewBox="0 0 100 30" className="w-full h-full preserve-3d" preserveAspectRatio="none">
              <path d="M0,25 Q15,10 30,22 T60,20 T90,5" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          }
          loading={isLoading}
        />
        <StatsCard
          title="TOTAL REVENUE"
          value={formatCurrency(summary?.totalRevenue || 0, summary?.currency || hotel?.settings?.currency || 'USD')}
          icon={TrendingUp}
          className="bg-[#EDE9FF]"
          iconClassName="bg-[#DFD8FA] text-[#7E42FF]"
          chartElement={
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path d="M10,25 Q25,25 35,15 T55,25 T65,5 T80,25 T90,20" fill="none" stroke="#7E42FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          loading={isLoading}
        />
        <StatsCard
          title="AI CONVERSATIONS"
          value={summary?.totalConversations ?? 0}
          subtitle={`${summary?.resolutionRate ?? 0}% Resolution Automation Rate`}
          icon={Bot}
          className="bg-[#E7ECF3]"
          iconClassName="bg-[#D9DEEB] text-gray-700"
          chartElement={
            <svg viewBox="0 0 100 30" className="w-full h-full px-4 flex items-end transform translate-y-4">
               {/* Bar chart bars simulation */}
               <rect x="5" y="15" width="12" height="15" rx="1" fill="#C4CBDD" />
               <rect x="20" y="5" width="12" height="25" rx="1" fill="#A8B2C4" />
               <rect x="35" y="18" width="12" height="12" rx="1" fill="#8F9AA9" />
               <rect x="50" y="10" width="12" height="20" rx="1" fill="#74839B" />
               <rect x="65" y="12" width="12" height="18" rx="1" fill="#586A88" />
               <rect x="80" y="4" width="12" height="26" rx="1" fill="#1C2541" />
            </svg>
          }
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Recent Bookings (takes 2 columns) */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm rounded-3xl bg-[#F4F6FB] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-6 pt-8 px-8">
              <CardTitle className="text-xl font-semibold text-gray-800">Recent Bookings</CardTitle>
              <Link href="/bookings">
                <span className="text-xs font-bold text-[#7E42FF] tracking-wider uppercase hover:underline">View All Activity</span>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recentBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No bookings yet</p>
                  <p className="text-sm mt-1">Bookings made through the widget will appear here</p>
                </div>
              ) : (
                <Table className="px-4 border-none">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200/60 hover:bg-transparent">
                      <TableHead className="font-semibold text-gray-500 tracking-wider text-xs pl-8">GUEST</TableHead>
                      <TableHead className="font-semibold text-gray-500 tracking-wider text-xs">ROOM TYPE</TableHead>
                      <TableHead className="font-semibold text-gray-500 tracking-wider text-xs">STAY DATES</TableHead>
                      <TableHead className="font-semibold text-gray-500 tracking-wider text-xs">STATUS</TableHead>
                      <TableHead className="font-semibold text-gray-500 tracking-wider text-xs text-right pr-8">AMOUNT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking, index) => {
                      const guestNameParts = booking.guestName.split(' ');
                      const initials = (guestNameParts[0]?.[0] || '') + (guestNameParts[1]?.[0] || '');
                      const isLast = index === recentBookings.length - 1;
                      const dateRange = formatDateRange(booking.checkIn, booking.checkOut);
                      
                      return (
                        <TableRow key={booking.id} className={`${!isLast ? 'border-b border-gray-200/60' : 'border-none'} hover:bg-white/40 transition-colors`}>
                          <TableCell className="pl-8 py-5">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 border border-white shadow-sm bg-[#1C2541] text-white">
                                <AvatarFallback className="bg-[#1C2541] text-white text-xs tracking-wider">{initials.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-gray-900">{booking.guestName}</div>
                                <div className="text-xs text-gray-500 mt-1 pb-1">Silver Member</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 font-medium">
                            <div className="max-w-[120px] whitespace-normal leading-tight">
                              {booking.roomType}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 font-medium whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span>{dateRange.start} -</span>
                              <span>{dateRange.end}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getBookingStatusBadge(booking.status)}</TableCell>
                          <TableCell className="text-right font-bold text-gray-900 pr-8">
                            {formatCurrency(booking.amount, summary?.currency || hotel?.settings?.currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar cards */}
        <div className="flex flex-col gap-6">
          <Card className="border-none shadow-sm rounded-3xl bg-[#EEF2FC]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Guest Engagement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold tracking-wider text-gray-600 mb-2 uppercase">
                  <span>Mobile Check-In</span>
                  <span>88%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 line-clamp-1 flex">
                  <div className="bg-[#1C2541] h-1.5 rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold tracking-wider text-gray-600 mb-2 uppercase">
                  <span>AI Concierge Usage</span>
                  <span>64%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 flex">
                  <div className="bg-[#7E42FF] h-1.5 rounded-full" style={{ width: '64%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold tracking-wider text-gray-600 mb-2 uppercase">
                  <span>Room Service Digital</span>
                  <span>42%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 flex">
                  <div className="bg-[#1C2541] h-1.5 rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>
              
              <div className="pt-2 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <Avatar className="border-2 border-white w-8 h-8">
                    <AvatarImage src="https://i.pravatar.cc/100?img=1" />
                    <AvatarFallback>U1</AvatarFallback>
                  </Avatar>
                  <Avatar className="border-2 border-white w-8 h-8">
                    <AvatarImage src="https://i.pravatar.cc/100?img=2" />
                    <AvatarFallback>U2</AvatarFallback>
                  </Avatar>
                  <Avatar className="border-2 border-white w-8 h-8">
                    <AvatarImage src="https://i.pravatar.cc/100?img=3" />
                    <AvatarFallback>U3</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs text-gray-600 font-medium leading-tight">24 guests currently<br/>interacting</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-3xl bg-gradient-to-br from-[#7786AB] to-[#394970] text-white flex flex-col items-start overflow-hidden relative">
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-[#1C2337] to-transparent opacity-90"></div>
            <CardContent className="p-8 relative z-10 w-full h-full flex flex-col justify-end">
              <div className="mb-4">
                <Sparkles className="h-8 w-8 text-blue-100" />
              </div>
              <h3 className="text-xl font-bold mb-3">Optimize Operations</h3>
              <p className="text-sm font-medium text-blue-100/90 leading-relaxed mb-6">
                AI suggests re-allocating 2 staff members to the lobby for the 2:00 PM check-in peak based on booking trends.
              </p>
              <Button className="w-full bg-white grow-0 text-gray-900 hover:bg-gray-100 font-semibold rounded-xl py-6">
                Accept AI Suggestion
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
