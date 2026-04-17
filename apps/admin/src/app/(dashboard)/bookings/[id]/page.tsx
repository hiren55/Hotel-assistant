'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowLeft, LogIn, LogOut, Check, X, 
  Banknote, BedDouble, Calendar, User, Users,
  Wifi, Snowflake, Coffee, LogInIcon, LogOutIcon, MoreHorizontal
} from 'lucide-react';
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
      toast({ title: 'Booking Confirmed', description: 'The booking has been confirmed.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to confirm booking.', variant: 'destructive' });
    }
  };

  const handleCancelBooking = async () => {
    try {
      await cancelBookingMutation.mutateAsync({ bookingId });
      toast({ title: 'Booking Cancelled', description: 'The booking has been cancelled.', variant: 'success' });
      router.push('/bookings');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel booking.', variant: 'destructive' });
    }
  };

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync(bookingId);
      toast({ title: 'Check-in Complete', description: 'The guest has been checked in.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to check in guest.', variant: 'destructive' });
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut.mutateAsync(bookingId);
      toast({ title: 'Check-out Complete', description: 'The guest has been checked out.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to check out guest.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#1B2541]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold bg-gray-50 rounded-2xl p-10 max-w-md mx-auto">Booking Not Found</h1>
        <Link href="/bookings">
          <Button className="mt-6 rounded-full bg-[#1B2541]">Back to Bookings</Button>
        </Link>
      </div>
    );
  }

  const fakeAvatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(booking.guestName) + '&background=D1D5DB&color=374151&rounded=true&size=128';
  const shortId = booking.id.slice(0, 5).toUpperCase();

  return (
    <div className="font-sans max-w-[1280px] mx-auto pb-12 pt-2">
      {/* Header Actions Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <Link href="/bookings" className="inline-flex items-center text-sm font-bold text-[#6D7B93] hover:text-[#1B2541] transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Bookings
          </Link>
          <h1 className="text-[2.25rem] font-bold tracking-tight text-gray-900 leading-none mb-2">
            Booking #{shortId}
          </h1>
          <p className="text-[15px] font-medium text-gray-600">
            {statusLabels[booking.status]} • Created on {formatDate(booking.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm font-bold">
           {/* Modify Button Mock */}
           <Button variant="outline" className="rounded-full px-8 py-6 font-bold border-gray-300 text-gray-800 hover:bg-gray-50 shadow-sm border-2">
             Modify
           </Button>

           {/* Dynamic Action Buttons based on state */}
           {booking.status === 'pending' && (
             <Button onClick={handleConfirmBooking} disabled={confirmBooking.isPending} className="rounded-full px-8 py-6 bg-[#0B1120] hover:bg-[#1A2542] text-white shadow-xl shadow-black/10">
               {confirmBooking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               Confirm Booking
             </Button>
           )}
           {booking.status === 'confirmed' && (
             <Button onClick={handleCheckIn} disabled={checkIn.isPending} className="rounded-full px-8 py-6 bg-[#0B1120] hover:bg-[#1A2542] text-white shadow-xl shadow-black/10">
               {checkIn.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               Check In
             </Button>
           )}
           {booking.status === 'checked_in' && (
             <Button onClick={handleCheckOut} disabled={checkOut.isPending} className="rounded-full px-8 py-6 bg-[#0B1120] hover:bg-[#1A2542] text-white shadow-xl shadow-black/10">
               {checkOut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               Check Out
             </Button>
           )}
           
           {/* Cancel Dropdown trigger (Mocked as secondary button) */}
           {(booking.status === 'pending' || booking.status === 'confirmed') && (
             <AlertDialog>
               <AlertDialogTrigger asChild>
                 <Button variant="destructive" className="rounded-full px-8 py-6 font-bold bg-white text-red-600 border-2 border-red-100 hover:bg-red-50 hover:text-red-700 shadow-sm">
                   Cancel
                 </Button>
               </AlertDialogTrigger>
               <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
                 <AlertDialogHeader>
                   <AlertDialogTitle className="text-2xl font-bold">Cancel Booking #{shortId}</AlertDialogTitle>
                   <AlertDialogDescription className="text-gray-500 font-medium mt-2">
                     Are you sure you want to cancel this booking? This action cannot be undone.
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter className="mt-6">
                   <AlertDialogCancel className="rounded-full px-8 border-none hover:bg-gray-100 font-bold">Keep Booking</AlertDialogCancel>
                   <AlertDialogAction
                     onClick={handleCancelBooking}
                     className="rounded-full px-8 bg-red-500 text-white hover:bg-red-600 font-bold border-none"
                   >
                     {cancelBookingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Cancel Booking
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
        {/* Left Column - Main Details */}
        <div className="flex flex-col gap-8">
          
          {/* Guest Information Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 relative overflow-hidden">
             
             <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] flex items-center justify-center text-[#9333EA]">
                 <User className="w-4 h-4" />
               </div>
               <h2 className="text-[18px] font-bold text-gray-900">Guest Information</h2>
             </div>

             <div className="flex flex-col md:flex-row gap-8 items-start">
                <img src={fakeAvatarUrl} alt={booking.guestName} className="w-[100px] h-[100px] rounded-full object-cover shadow-inner" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 w-full">
                   <div>
                     <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Full Name</p>
                     <p className="text-[15px] font-bold text-gray-900">{booking.guestName}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Email Address</p>
                     <p className="text-[15px] font-bold text-gray-900">{booking.guestEmail}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Phone</p>
                     <p className="text-[15px] font-bold text-gray-900">{booking.guestPhone || 'Not Provided'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Member Status</p>
                     <span className="bg-[#4ADE80]/20 text-[#16A34A] px-3 py-1.5 rounded-full text-[12px] font-bold border-none inline-block">
                        {booking.adults > 2 ? 'Platinum Member' : 'Gold Member'}
                     </span>
                   </div>
                </div>
             </div>

             {/* Background Silhouette (Mock visual detail) */}
             <div className="absolute top-8 right-8 text-gray-100">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
               </svg>
             </div>
          </div>

          {/* Stay Details Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100">
             
             <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center text-[#7E42FF]">
                 <Calendar className="w-4 h-4" />
               </div>
               <h2 className="text-[18px] font-bold text-gray-900">Stay Details</h2>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12">
               
               {/* Check-In */}
               <div className="flex items-start gap-4 border-r border-transparent sm:border-gray-100">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#7E42FF]">
                    <LogInIcon className="w-5 h-5 ml-1" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-[#7E42FF] uppercase mb-1">Check-in</p>
                    <p className="text-[16px] font-bold text-gray-900 mb-0.5">{formatDate(booking.checkIn)}</p>
                    <p className="text-[13px] font-medium text-gray-500">After 3:00 PM</p>
                  </div>
               </div>

               {/* Check-Out */}
               <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#7E42FF]">
                    <LogOutIcon className="w-5 h-5 mr-1" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-[#7E42FF] uppercase mb-1">Check-out</p>
                    <p className="text-[16px] font-bold text-gray-900 mb-0.5">{formatDate(booking.checkOut)}</p>
                    <p className="text-[13px] font-medium text-gray-500">Before 11:00 AM</p>
                  </div>
               </div>

               {/* Guests */}
               <div className="flex items-start gap-4 pt-4 sm:pt-0 sm:border-t border-transparent border-gray-100 sm:mt-0">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Guests</p>
                     <p className="text-[16px] font-bold text-gray-900 mb-0.5">{booking.adults} {booking.adults === 1 ? 'Adult' : 'Adults'}</p>
                     <p className="text-[13px] font-medium text-gray-500">{booking.children > 0 ? booking.children + ' Children' : 'No children'}</p>
                  </div>
               </div>

               {/* Room Type */}
               <div className="flex items-start gap-4 pt-4 sm:pt-0 sm:border-t sm:border-transparent sm:mt-0">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Room Type</p>
                     <p className="text-[16px] font-bold text-gray-900 mb-0.5">{booking.room?.name || 'Standard Room'}</p>
                     <p className="text-[13px] font-medium text-gray-500">Non-smoking</p>
                  </div>
               </div>

             </div>

             {/* Internal Notes Display (Only if present) */}
             {(booking.specialRequests || booking.internalNotes) && (
               <div className="mt-10 bg-orange-50/50 rounded-3xl p-6 border border-orange-100/50">
                 {booking.specialRequests && (
                   <div className="mb-4">
                     <p className="text-[11px] font-bold tracking-widest text-orange-800 uppercase mb-2">Special Requests</p>
                     <p className="text-[14px] font-medium text-orange-950 leading-relaxed">{booking.specialRequests}</p>
                   </div>
                 )}
                 {booking.internalNotes && (
                   <div>
                     <p className="text-[11px] font-bold tracking-widest text-orange-800 uppercase mb-2">Internal Notes</p>
                     <p className="text-[14px] font-medium text-orange-950 leading-relaxed">{booking.internalNotes}</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Right Sidebar - Financials & Room Info */}
        <div className="flex flex-col gap-6">

          {/* Price Summary Dark Card */}
          <div className="bg-[#0B1120] text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
             {/* Diagonal accent strip */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rotate-45 pointer-events-none"></div>

             <div className="flex items-center gap-3 mb-8">
               <div className="w-7 h-7 rounded-sm bg-white/10 flex items-center justify-center text-white">
                 <Banknote className="w-4 h-4" />
               </div>
               <h2 className="text-[16px] font-bold text-white tracking-wide">Price Summary</h2>
             </div>

             <div className="mb-10">
               <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">Total Amount</p>
               <div className="flex items-center gap-4">
                 <h3 className="text-[40px] font-bold text-white leading-none">
                   {formatCurrency(booking.totalPrice, booking.currency)}
                 </h3>
                 <span className="bg-[#064E3B]/80 text-[#34D399] px-3 py-1 rounded-sm text-[9px] font-bold tracking-widest border border-[#34D399]/20 self-center uppercase">
                   {booking.status === 'confirmed' ? 'DEPOSIT' : 'PAID'}
                 </span>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-1">Source</p>
                  <p className="text-[13px] font-bold text-white capitalize">{booking.source || 'Widget'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-1">ID</p>
                  <p className="text-[13px] font-bold text-white">#{shortId}-W</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-1">Created</p>
                  <p className="text-[13px] font-bold text-white">{formatDate(booking.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase mb-1">Updated</p>
                  <p className="text-[13px] font-bold text-white">{formatDate(booking.updatedAt)}</p>
                </div>
             </div>
          </div>

          {/* Room Specification Detailed Card */}
          {booking.room && (
            <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 overflow-hidden flex flex-col">
               
               <div className="p-8 pb-6 flex items-center gap-3">
                 <div className="w-6 h-6 rounded-sm bg-[#7E42FF]/10 flex items-center justify-center text-[#7E42FF]">
                   <BedDouble className="w-3.5 h-3.5" />
                 </div>
                 <h2 className="text-[16px] font-bold text-gray-900 tracking-wide">Room Specification</h2>
               </div>

               {/* Room Hero Image Mock */}
               <div className="w-[calc(100%-4rem)] mx-auto h-[160px] bg-gray-200 rounded-3xl overflow-hidden relative shadow-inner">
                  {booking.room.images?.[0] ? (
                    <img src={booking.room.images[0]} alt="Room View" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-400">
                      <BedDouble className="w-10 h-10 opacity-30" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[11px] font-bold text-gray-900 shadow-sm border border-white/20">
                    Room {400 + Math.floor(Math.random() * 20)}
                  </div>
               </div>

               <div className="p-8 pt-6 space-y-5">
                  
                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-[13px] font-medium text-gray-500">Type</span>
                    <span className="text-[14px] font-bold text-gray-900 capitalize">{booking.room.type}</span>
                  </div>

                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-[13px] font-medium text-gray-500">Category</span>
                    <span className="text-[14px] font-bold text-gray-900 pr-2">{booking.room.name}</span>
                  </div>

                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-[13px] font-medium text-gray-500">Rate</span>
                    <span className="text-[14px] font-bold text-[#7E42FF]">
                      {formatCurrency(booking.room.basePrice, booking.room.currency)} <span className="font-medium text-gray-400">/ Night</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-[13px] font-medium text-gray-500">Floor</span>
                    <span className="text-[14px] font-bold text-gray-900">4th Floor</span>
                  </div>

                  {/* Amenities Row */}
                  <div className="pt-2 flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold tracking-wide text-gray-600">
                      <Wifi className="w-3 h-3" /> Free WiFi
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold tracking-wide text-gray-600">
                      <Snowflake className="w-3 h-3" /> Climate Control
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold tracking-wide text-gray-600">
                      <Coffee className="w-3 h-3" /> Mini Bar
                    </span>
                  </div>

               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
