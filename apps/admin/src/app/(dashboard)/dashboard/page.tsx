'use client';

import { CalendarCheck, Users, MessageSquare, TrendingUp, Loader2 } from 'lucide-react';
import { useMyHotel, useDashboardStats, useBookings } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ElementType;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="ml-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        </div>
        {change && (
          <div className="mt-4">
            <span
              className={`text-sm font-medium ${
                changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {change}
            </span>
            <span className="text-sm text-muted-foreground"> vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getBookingStatusBadge(status: string) {
  const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    confirmed: 'success',
    pending: 'warning',
    cancelled: 'destructive',
    checked_in: 'info',
    checked_out: 'secondary',
    no_show: 'destructive',
  };

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export default function DashboardPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(hotel?.id || '');
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(hotel?.id || '', {
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const recentBookings = bookingsData?.data || [];
  const isLoading = hotelLoading || statsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hotel ? `Overview of ${hotel.name}'s performance` : 'Overview of your hotel performance'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          change={stats?.bookingsChange ? `${stats.bookingsChange > 0 ? '+' : ''}${stats.bookingsChange}%` : undefined}
          changeType={stats?.bookingsChange && stats.bookingsChange >= 0 ? 'positive' : 'negative'}
          icon={CalendarCheck}
          loading={isLoading}
        />
        <StatsCard
          title="Revenue"
          value={stats ? formatCurrency(stats.revenue, hotel?.currency) : '$0'}
          change={stats?.revenueChange ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}%` : undefined}
          changeType={stats?.revenueChange && stats.revenueChange >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatsCard
          title="Upcoming Check-ins"
          value={stats?.upcomingCheckIns ?? 0}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="Active Conversations"
          value={stats?.activeConversations ?? 0}
          change={stats?.conversationsChange ? `${stats.conversationsChange > 0 ? '+' : ''}${stats.conversationsChange}%` : undefined}
          changeType={stats?.conversationsChange && stats.conversationsChange >= 0 ? 'positive' : 'negative'}
          icon={MessageSquare}
          loading={isLoading}
        />
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Bookings</CardTitle>
          <Link href="/bookings">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {bookingsLoading || hotelLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No bookings yet</p>
              <p className="text-sm mt-1">Bookings made through the widget will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.guestName}</div>
                        <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{booking.room?.name || 'N/A'}</TableCell>
                    <TableCell>{formatDate(booking.checkIn)}</TableCell>
                    <TableCell>{formatDate(booking.checkOut)}</TableCell>
                    <TableCell>{getBookingStatusBadge(booking.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="hover:bg-accent/50 transition-colors">
          <Link href="/rooms">
            <CardContent className="p-6">
              <h3 className="font-semibold">Manage Rooms</h3>
              <p className="text-sm text-muted-foreground mt-1">Add, edit, or update room availability</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:bg-accent/50 transition-colors">
          <Link href="/bot">
            <CardContent className="p-6">
              <h3 className="font-semibold">Configure Bot</h3>
              <p className="text-sm text-muted-foreground mt-1">Update knowledge base and bot settings</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:bg-accent/50 transition-colors">
          <Link href="/hotel">
            <CardContent className="p-6">
              <h3 className="font-semibold">Hotel Profile</h3>
              <p className="text-sm text-muted-foreground mt-1">Update hotel information and settings</p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
