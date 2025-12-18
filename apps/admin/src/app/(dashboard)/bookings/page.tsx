'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, MoreHorizontal, Eye, Check, X, LogIn, LogOut, Search } from 'lucide-react';
import {
  useMyHotel,
  useBookings,
  useConfirmBooking,
  useCancelBooking,
  useCheckIn,
  useCheckOut,
} from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Booking, BookingStatus } from '@/types';

const statusColors: Record<BookingStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  pending: 'warning',
  confirmed: 'success',
  checked_in: 'info',
  checked_out: 'secondary',
  cancelled: 'destructive',
  no_show: 'destructive',
};

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export default function BookingsPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(hotel?.id || '', {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
    sortBy: 'checkIn',
    sortOrder: 'desc',
  });

  const confirmBooking = useConfirmBooking(hotel?.id || '');
  const cancelBookingMutation = useCancelBooking(hotel?.id || '');
  const checkIn = useCheckIn(hotel?.id || '');
  const checkOut = useCheckOut(hotel?.id || '');

  const bookings = bookingsData?.data || [];
  const isLoading = hotelLoading || bookingsLoading;

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await confirmBooking.mutateAsync(bookingId);
      toast({
        title: 'Booking Confirmed',
        description: 'The booking has been confirmed.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to confirm booking.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBooking) return;

    try {
      await cancelBookingMutation.mutateAsync({ bookingId: cancelBooking.id });
      toast({
        title: 'Booking Cancelled',
        description: 'The booking has been cancelled.',
        variant: 'success',
      });
      setCancelBooking(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking.',
        variant: 'destructive',
      });
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      await checkIn.mutateAsync(bookingId);
      toast({
        title: 'Check-in Complete',
        description: 'The guest has been checked in.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check in guest.',
        variant: 'destructive',
      });
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      await checkOut.mutateAsync(bookingId);
      toast({
        title: 'Check-out Complete',
        description: 'The guest has been checked out.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check out guest.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your hotel bookings
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by guest name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-[180px]">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as BookingStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No bookings found</p>
              <p className="text-sm mt-1">
                {statusFilter !== 'all' || searchQuery
                  ? 'Try adjusting your filters'
                  : 'Bookings will appear here once guests book through the widget'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.guestName}</div>
                        <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                        {booking.guestPhone && (
                          <div className="text-sm text-muted-foreground">{booking.guestPhone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{booking.room?.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          {booking.adults} adults{booking.children > 0 && `, ${booking.children} children`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(booking.checkIn)}</TableCell>
                    <TableCell>{formatDate(booking.checkOut)}</TableCell>
                    <TableCell>{formatCurrency(booking.totalPrice, booking.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[booking.status]}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/bookings/${booking.id}`}>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                          {booking.status === 'pending' && (
                            <DropdownMenuItem
                              onClick={() => handleConfirmBooking(booking.id)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Confirm
                            </DropdownMenuItem>
                          )}
                          {booking.status === 'confirmed' && (
                            <DropdownMenuItem
                              onClick={() => handleCheckIn(booking.id)}
                            >
                              <LogIn className="mr-2 h-4 w-4" />
                              Check In
                            </DropdownMenuItem>
                          )}
                          {booking.status === 'checked_in' && (
                            <DropdownMenuItem
                              onClick={() => handleCheckOut(booking.id)}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Check Out
                            </DropdownMenuItem>
                          )}
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setCancelBooking(booking)}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancel Booking
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelBooking} onOpenChange={() => setCancelBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking for {cancelBooking?.guestName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelBookingMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
