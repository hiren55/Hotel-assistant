'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Check, X, LogIn, LogOut, Mail, Phone, Calendar, Users, DollarSign, MessageSquare } from 'lucide-react';
import {
  useMyHotel,
  useBooking,
  useConfirmBooking,
  useCancelBooking,
  useCheckIn,
  useCheckOut,
} from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/lib/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { BookingStatus } from '@/types';

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

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const { data: booking, isLoading: bookingLoading } = useBooking(hotel?.id || '', bookingId);

  const confirmBooking = useConfirmBooking(hotel?.id || '');
  const cancelBookingMutation = useCancelBooking(hotel?.id || '');
  const checkIn = useCheckIn(hotel?.id || '');
  const checkOut = useCheckOut(hotel?.id || '');

  const isLoading = hotelLoading || bookingLoading;

  const handleConfirmBooking = async () => {
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
    try {
      await cancelBookingMutation.mutateAsync({ bookingId });
      toast({
        title: 'Booking Cancelled',
        description: 'The booking has been cancelled.',
        variant: 'success',
      });
      router.push('/bookings');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking.',
        variant: 'destructive',
      });
    }
  };

  const handleCheckIn = async () => {
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

  const handleCheckOut = async () => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold">Booking Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The booking you're looking for doesn't exist.
        </p>
        <Link href="/bookings">
          <Button className="mt-4">Back to Bookings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bookings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Booking Details</h1>
              <Badge variant={statusColors[booking.status]}>
                {statusLabels[booking.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.confirmationNumber && `Confirmation: ${booking.confirmationNumber}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <Button onClick={handleConfirmBooking} disabled={confirmBooking.isPending}>
              {confirmBooking.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Confirm
            </Button>
          )}
          {booking.status === 'confirmed' && (
            <Button onClick={handleCheckIn} disabled={checkIn.isPending}>
              {checkIn.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Check In
            </Button>
          )}
          {booking.status === 'checked_in' && (
            <Button onClick={handleCheckOut} disabled={checkOut.isPending}>
              {checkOut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Check Out
            </Button>
          )}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this booking? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelBooking}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel Booking
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle>Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                    {booking.guestName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{booking.guestName}</div>
                    <div className="text-sm text-muted-foreground">Guest</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${booking.guestEmail}`} className="text-primary hover:underline">
                    {booking.guestEmail}
                  </a>
                </div>
                {booking.guestPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${booking.guestPhone}`} className="text-primary hover:underline">
                      {booking.guestPhone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stay Details */}
          <Card>
            <CardHeader>
              <CardTitle>Stay Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Check-in
                  </div>
                  <div className="font-medium">{formatDate(booking.checkIn)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Check-out
                  </div>
                  <div className="font-medium">{formatDate(booking.checkOut)}</div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Guests
                  </div>
                  <div className="font-medium">
                    {booking.adults} {booking.adults === 1 ? 'Adult' : 'Adults'}
                    {booking.children > 0 && `, ${booking.children} ${booking.children === 1 ? 'Child' : 'Children'}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Room</div>
                  <div className="font-medium">{booking.room?.name || 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Requests */}
          {(booking.specialRequests || booking.internalNotes) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.specialRequests && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MessageSquare className="h-4 w-4" />
                      Special Requests
                    </div>
                    <p className="text-sm bg-muted p-3 rounded-md">{booking.specialRequests}</p>
                  </div>
                )}
                {booking.internalNotes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Internal Notes</div>
                    <p className="text-sm bg-muted p-3 rounded-md">{booking.internalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Price Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Price</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(booking.totalPrice, booking.currency)}
                </span>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="capitalize">{booking.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(booking.createdAt)}</span>
                </div>
                {booking.updatedAt !== booking.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{formatDate(booking.updatedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Room Details */}
          {booking.room && (
            <Card>
              <CardHeader>
                <CardTitle>Room</CardTitle>
                <CardDescription>{booking.room.type}</CardDescription>
              </CardHeader>
              <CardContent>
                {booking.room.images?.[0] && (
                  <img
                    src={booking.room.images[0]}
                    alt={booking.room.name}
                    className="w-full h-32 object-cover rounded-md mb-4"
                  />
                )}
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{booking.room.name}</div>
                  {booking.room.description && (
                    <p className="text-muted-foreground line-clamp-3">
                      {booking.room.description}
                    </p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{formatCurrency(booking.room.basePrice, booking.room.currency)}/night</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
