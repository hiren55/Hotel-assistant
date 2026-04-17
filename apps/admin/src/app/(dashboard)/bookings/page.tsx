'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Loader2, MoreHorizontal, Eye, Check, X, LogIn, LogOut, 
  Search, Filter, Plus, BedDouble, Building2, Banknote, 
  Sparkles, TrendingUp, Users, ArrowRight, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  useMyHotel,
  useBookings,
  useRooms,
  useConfirmBooking,
  useCancelBooking,
  useCheckIn,
  useCheckOut,
} from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { toast } from '@/lib/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Booking, BookingStatus } from '@/types';

const PAGE_SIZE = 10;

const statusVisuals = (status: BookingStatus) => {
  switch(status) {
    case 'confirmed':
      return { label: 'CONFIRMED', className: 'bg-[#A8B2C4] text-gray-900 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border-none' };
    case 'pending':
      return { label: 'PENDING', className: 'bg-[#E3DCFF] text-[#7E42FF] px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border-none' };
    case 'checked_in':
      return { label: 'IN HOUSE', className: 'bg-[#D1FAE5] text-emerald-800 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border-none' };
    case 'checked_out':
      return { label: 'CHECKED OUT', className: 'bg-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border-none' };
    case 'cancelled':
      return { label: 'CANCELLED', className: 'bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border-none' };
    default:
      return { label: status.toUpperCase().replace('_', ' '), className: 'bg-red-100 text-red-800 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border-none' };
  }
};

export default function BookingsPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  // Debounce search — only fire API request 350ms after last keystroke
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(q.trim());
      setPage(1);
    }, 350);
  };

  // Fetch paginated bookings from real API
  const { data: bookingsData, isLoading: bookingsLoading, isFetching: bookingsFetching } = useBookings(hotel?.id || '', {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    sortBy: 'checkIn',
    sortOrder: 'desc',
    page,
    limit: PAGE_SIZE,
  });

  // Fetch ALL bookings (no limit) for stats computation — use a large limit
  const { data: allBookingsData } = useBookings(hotel?.id || '', {
    limit: 500,
    page: 1,
  });

  // Fetch rooms to compute room-type stats
  const { data: roomsData } = useRooms(hotel?.id || '');

  const confirmBooking = useConfirmBooking(hotel?.id || '');
  const cancelBookingMutation = useCancelBooking(hotel?.id || '');
  const checkIn = useCheckIn(hotel?.id || '');
  const checkOut = useCheckOut(hotel?.id || '');

  const bookings = bookingsData?.data || [];
  const totalBookings = bookingsData?.total ?? 0;
  const totalPages = Math.ceil(totalBookings / PAGE_SIZE);
  // Show full-page spinner only on the very first load (no cached data)
  const isLoading = hotelLoading || bookingsLoading;
  // isFetching is true on filter/search changes — just show subtle indicator in table
  const isRefetching = bookingsFetching && !bookingsLoading;

  // ─── Compute Real Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allBookings = allBookingsData?.data ?? [];
    const rooms = roomsData?.data ?? [];

    // Count active (confirmed / checked_in) bookings per room type
    const activeBookings = allBookings.filter(b =>
      b.status === 'confirmed' || b.status === 'checked_in'
    );

    // Group rooms by type
    const roomsByType: Record<string, { total: number; booked: number }> = {};
    for (const room of rooms) {
      const type = room.type?.toLowerCase() || 'other';
      if (!roomsByType[type]) roomsByType[type] = { total: 0, booked: 0 };
      roomsByType[type].total++;
    }
    for (const booking of activeBookings) {
      const room = rooms.find(r => r.id === booking.roomId);
      const type = room?.type?.toLowerCase() || 'other';
      if (!roomsByType[type]) roomsByType[type] = { total: 0, booked: 0 };
      roomsByType[type].booked++;
    }

    // Types we show in the order cards
    const deluxeTypes = ['deluxe', 'suite'];
    const executiveTypes = ['executive', 'penthouse'];
    const standardTypes = ['standard', 'family'];

    const sumGroup = (types: string[]) => {
      let total = 0, booked = 0;
      for (const t of types) {
        total += roomsByType[t]?.total ?? 0;
        booked += roomsByType[t]?.booked ?? 0;
      }
      return { total, booked };
    };

    const deluxe = sumGroup(deluxeTypes);
    const executive = sumGroup(executiveTypes);
    const standard = sumGroup(standardTypes);

    // Today's revenue: sum totalPrice of confirmed/checked_in bookings created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyRevenue = allBookings
      .filter(b => {
        const created = new Date(b.createdAt ?? b.checkIn);
        return created >= today && (b.status === 'confirmed' || b.status === 'checked_in');
      })
      .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

    // Total active revenue for the "vs last week" calculation attempt
    const totalActiveRevenue = activeBookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

    return { deluxe, executive, standard, dailyRevenue, totalActiveRevenue };
  }, [allBookingsData, roomsData]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await confirmBooking.mutateAsync(bookingId);
      toast({ title: 'Booking Confirmed', description: 'The booking has been confirmed.', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to confirm booking.', variant: 'destructive' });
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBooking) return;
    try {
      await cancelBookingMutation.mutateAsync({ bookingId: cancelBooking.id });
      toast({ title: 'Booking Cancelled', description: 'The booking has been cancelled.', variant: 'success' });
      setCancelBooking(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel booking.', variant: 'destructive' });
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      await checkIn.mutateAsync(bookingId);
      toast({ title: 'Check-in Complete', description: 'The guest has been checked in.', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to check in guest.', variant: 'destructive' });
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      await checkOut.mutateAsync(bookingId);
      toast({ title: 'Check-out Complete', description: 'The guest has been checked out.', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to check out guest.', variant: 'destructive' });
    }
  };

  const handleStatusFilter = (s: BookingStatus | 'all') => {
    setStatusFilter(s);
    setPage(1);
  };

  // ─── Pagination helpers ───────────────────────────────────────────────────
  const firstItem = totalBookings === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, totalBookings);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#7E42FF]" />
      </div>
    );
  }

  const { deluxe, executive, standard, dailyRevenue } = stats;

  return (
    <div className="font-sans max-w-[1400px] mx-auto pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center items-start gap-4 mb-10 mt-2">
        <div>
          <h1 className="text-[2rem] font-bold tracking-tight text-gray-900 leading-tight">Booking Management</h1>
          <p className="mt-1.5 text-[15px] font-medium text-gray-600 max-w-2xl">
            Real-time oversight of guest arrivals, room availability, and automated pricing adjustments.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
          <Button variant="outline" className="rounded-full px-6 py-6 font-bold border-gray-200 text-gray-800 hover:bg-gray-50 flex items-center shadow-sm">
            <Filter className="w-4 h-4 mr-2" strokeWidth={2.5} />
            Advanced Filters
          </Button>
          <Button className="rounded-full px-6 py-6 font-bold bg-[#1B2541] hover:bg-[#121A30] text-white flex items-center shadow-lg shadow-blue-900/10">
            <Plus className="w-4 h-4 mr-2" strokeWidth={3} />
            New Booking
          </Button>
        </div>
      </div>

      {/* ─── Real Data Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

        {/* Card 1: Deluxe Suites */}
        <div className="bg-[#B9BCCC] rounded-[2rem] p-7 shadow-sm flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1">Deluxe Suites</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-bold text-gray-900 leading-none">
                  {String(deluxe.booked).padStart(2, '0')}
                </span>
                <span className="text-[15px] font-medium text-gray-600">/ {deluxe.total || '—'}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
              <BedDouble className="w-5 h-5 text-gray-800" />
            </div>
          </div>
          <div className="mt-8">
            <div className="w-full h-[6px] bg-black/10 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-700"
                style={{ width: deluxe.total > 0 ? `${Math.round((deluxe.booked / deluxe.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[10px] font-bold tracking-widest text-gray-700 flex items-center gap-1.5 uppercase">
              <TrendingUp className="w-3.5 h-3.5" />
              {deluxe.total > 0 ? `${Math.round((deluxe.booked / deluxe.total) * 100)}% occupied` : 'No rooms added'}
            </p>
          </div>
        </div>

        {/* Card 2: Executive Penthouses */}
        <div className="bg-[#B9BCCC] rounded-[2rem] p-7 shadow-sm flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1">Executive Penthouses</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-bold text-gray-900 leading-none">
                  {String(executive.booked).padStart(2, '0')}
                </span>
                <span className="text-[15px] font-medium text-gray-600">/ {executive.total || '—'}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#B5A8F2]/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#7E42FF]" />
            </div>
          </div>
          <div className="mt-8">
            <div className="w-full h-[6px] bg-[#B5A8F2]/40 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#7E42FF] rounded-full transition-all duration-700"
                style={{ width: executive.total > 0 ? `${Math.round((executive.booked / executive.total) * 100)}%` : '0%' }}
              />
            </div>
            {executive.total > 0 && executive.booked >= executive.total * 0.7 ? (
              <p className="text-[10px] font-bold tracking-widest text-red-600 flex items-center gap-1.5 uppercase">
                <span className="text-sm leading-none mt-[-2px]">⚠</span> Limited availability
              </p>
            ) : (
              <p className="text-[10px] font-bold tracking-widest text-gray-600 flex items-center gap-1.5 uppercase">
                <Check className="w-3.5 h-3.5" />
                {executive.total > 0 ? `${Math.round((executive.booked / executive.total) * 100)}% occupied` : 'No rooms added'}
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Standard Queen */}
        <div className="bg-[#B9BCCC] rounded-[2rem] p-7 shadow-sm flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1">Standard Queen</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-bold text-gray-900 leading-none">
                  {String(standard.booked).padStart(2, '0')}
                </span>
                <span className="text-[15px] font-medium text-gray-600">/ {standard.total || '—'}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
              <BedDouble className="w-5 h-5 text-gray-800" />
            </div>
          </div>
          <div className="mt-8">
            <div className="w-full h-[6px] bg-black/10 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-700"
                style={{ width: standard.total > 0 ? `${Math.round((standard.booked / standard.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[10px] font-bold tracking-widest text-gray-600 uppercase flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {standard.total > 0 ? `Status: ${Math.round((standard.booked / standard.total) * 100)}% Occupied` : 'No rooms added'}
            </p>
          </div>
        </div>

        {/* Card 4: Daily Revenue (EST) */}
        <div className="bg-[#B9BCCC] rounded-[2rem] p-7 shadow-sm flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1 leading-tight">
                Daily Revenue<br />(EST)
              </h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-[24px] font-bold text-gray-900 leading-none">
                  {formatCurrency(dailyRevenue, hotel?.settings?.currency || 'USD')}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-gray-800" />
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-end">
            <div className="flex gap-1 items-end h-8 mb-2">
              {[40, 60, 30, 80, 50, 100, 70].map((h, i) => (
                <div key={i} className="w-full bg-gray-900 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-[8px] font-bold tracking-widest text-gray-700 flex items-center justify-between uppercase w-full">
              <span>Today's bookings</span>
              <span className="text-gray-900">+{totalBookings}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ─── Booking Table ──────────────────────────────────────────────────── */}
      <div className="bg-[#B9BCCC]/30 rounded-[2.5rem] p-8 shadow-sm">

        {/* Table Header + Search + Status Filter */}
        <div className="flex flex-col gap-4 border-b border-[#A4A9BD] pb-6 mb-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center items-start gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[22px] font-bold text-gray-800">All Bookings</h2>
              {isRefetching && (
                <Loader2 className="w-4 h-4 animate-spin text-[#7E42FF] opacity-70" />
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by guest name..."
                className="pl-10 rounded-full border-gray-200 bg-white/80 py-5 text-[14px] font-medium focus-visible:ring-[#7E42FF] shadow-sm"
              />
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'confirmed', 'pending', 'checked_in', 'checked_out', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => handleStatusFilter(s)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
                  statusFilter === s
                    ? 'bg-[#1B2541] text-white shadow-md'
                    : 'bg-white/60 text-gray-500 hover:bg-white'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto transition-opacity duration-200">
          {bookings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 font-medium">No bookings found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Bookings will appear here once guests book.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pt-6 pb-4 text-[10px] font-bold tracking-widest text-gray-500 uppercase px-4 w-[25%]">Guest Information</th>
                  <th className="pt-6 pb-4 text-[10px] font-bold tracking-widest text-gray-500 uppercase px-4 w-[20%]">Room Details</th>
                  <th className="pt-6 pb-4 text-[10px] font-bold tracking-widest text-gray-500 uppercase px-4 w-[20%]">Duration</th>
                  <th className="pt-6 pb-4 text-[10px] font-bold tracking-widest text-gray-500 uppercase px-4 w-[15%]">Value</th>
                  <th className="pt-6 pb-4 text-[10px] font-bold tracking-widest text-gray-500 uppercase px-4 w-[10%]">Status</th>
                  <th className="pt-6 pb-4 text-[10px] font-bold tracking-widest text-gray-500 uppercase px-4 w-[10%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const statusProps = statusVisuals(booking.status);
                  const checkInDate = new Date(booking.checkIn);
                  const checkOutDate = new Date(booking.checkOut);
                  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));
                  const fakeAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.guestName)}&background=111827&color=ffffff&rounded=true`;

                  return (
                    <tr key={booking.id} className="border-b border-white/20 last:border-0 hover:bg-white/10 transition-colors">
                      <td className="py-5 px-4 align-middle">
                        <div className="flex items-center gap-4">
                          <img src={fakeAvatarUrl} alt="Avatar" className="w-10 h-10 rounded-full shadow-sm grayscale opacity-80" />
                          <div>
                            <div className="font-bold text-gray-900 text-[15px]">{booking.guestName}</div>
                            <div className="text-[11px] font-semibold tracking-wide text-gray-500 mt-0.5">
                              #{booking.bookingNumber || booking.id.slice(0, 8).toUpperCase()} · {nights > 3 ? 'VIP Member' : 'First Time'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4 align-middle">
                        <div>
                          <div className="font-bold text-gray-900 text-[14px]">{(booking as any).room?.name || 'Standard Room'}</div>
                          <div className="text-[11px] font-semibold text-gray-500 mt-0.5">
                            {booking.adults} Adult{booking.adults !== 1 ? 's' : ''}{booking.children > 0 ? ` · ${booking.children} Child${booking.children !== 1 ? 'ren' : ''}` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4 align-middle">
                        <div>
                          <div className="font-semibold text-gray-900 text-[14px]">{fmt(checkInDate)} — {fmt(checkOutDate)}</div>
                          <div className="text-[11px] font-semibold text-gray-500 mt-0.5">{nights} {nights === 1 ? 'Night' : 'Nights'}</div>
                        </div>
                      </td>
                      <td className="py-5 px-4 align-middle">
                        <div>
                          <div className="font-bold text-[#AFA6E9] text-[15px] tracking-wide">
                            {formatCurrency(booking.totalPrice, booking.currency)}
                          </div>
                          <div className="text-[11px] font-semibold text-gray-500 mt-0.5">
                            {booking.status === 'confirmed' ? 'Awaiting Check-in' : booking.status === 'checked_in' ? 'In House' : 'On Checkout'}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4 align-middle">
                        <Badge variant="outline" className={statusProps.className}>{statusProps.label}</Badge>
                      </td>
                      <td className="py-5 px-4 align-middle text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-white/50 rounded-full text-gray-600">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl p-2 border-none shadow-xl bg-white">
                            <Link href={`/bookings/${booking.id}`}>
                              <DropdownMenuItem className="rounded-xl font-semibold cursor-pointer py-2.5">
                                <Eye className="mr-2 h-4 w-4 text-gray-500" /> View Details
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            {booking.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleConfirmBooking(booking.id)} className="rounded-xl font-semibold cursor-pointer py-2.5">
                                <Check className="mr-2 h-4 w-4 text-gray-500" /> Confirm
                              </DropdownMenuItem>
                            )}
                            {booking.status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleCheckIn(booking.id)} className="rounded-xl font-semibold cursor-pointer py-2.5">
                                <LogIn className="mr-2 h-4 w-4 text-gray-500" /> Check In
                              </DropdownMenuItem>
                            )}
                            {booking.status === 'checked_in' && (
                              <DropdownMenuItem onClick={() => handleCheckOut(booking.id)} className="rounded-xl font-semibold cursor-pointer py-2.5">
                                <LogOut className="mr-2 h-4 w-4 text-gray-500" /> Check Out
                              </DropdownMenuItem>
                            )}
                            {(booking.status === 'pending' || booking.status === 'confirmed') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-600 focus:bg-red-50 rounded-xl font-semibold cursor-pointer py-2.5"
                                  onClick={() => setCancelBooking(booking)}
                                >
                                  <X className="mr-2 h-4 w-4" /> Cancel Booking
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── Pagination ─────────────────────────────────────────────────── */}
        {totalBookings > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-white/30 gap-4">
            <span className="text-[11px] font-bold text-gray-500 tracking-wide">
              Showing {firstItem}–{lastItem} of {totalBookings} bookings
            </span>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs font-bold">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      page === p
                        ? 'bg-[#1C2541] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Lumina AI Insight Card ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white to-[#F2EFFF] rounded-[2.5rem] p-12 mt-10 shadow-sm border-[4px] border-white/50 flex flex-col md:flex-row gap-10 items-center justify-between">
        <div className="flex flex-col max-w-lg">
          <div className="w-16 h-16 rounded-3xl bg-[#7E42FF] flex items-center justify-center shadow-xl shadow-[#7E42FF]/30 mb-8 overflow-hidden relative">
            <Sparkles className="w-7 h-7 text-white relative z-10" fill="currentColor" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
          </div>
          <h2 className="text-[26px] font-bold text-gray-900 mb-1">Lumina Insight</h2>
          <p className="text-[10px] font-bold tracking-widest text-[#B5A8F2] uppercase mb-4">Dynamic Strategy</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-10 flex-1 w-full relative">
          <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" /> Weekend Pricing Optimization
          </h3>
          <p className="text-[13px] text-gray-600 font-medium leading-relaxed mb-6">
            AI analysis detects a <span className="font-bold text-gray-900">14% surge</span> in luxury travel intent for the upcoming weekend. Suggesting an automated{' '}
            <span className="text-[#7E42FF] font-bold">8% increase</span> in Premium Suite rates to maximize yield while maintaining high occupancy.
          </p>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="bg-white rounded-3xl p-5 flex items-center gap-4 flex-1 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-50/50">
              <TrendingUp className="w-6 h-6 text-gray-900" />
              <div>
                <p className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">Proj. Revenue Boost</p>
                <p className="text-[18px] font-bold text-gray-900 mt-0.5">+$2,150 / day</p>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 flex items-center gap-4 flex-1 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-50/50">
              <Users className="w-6 h-6 text-[#7E42FF]" />
              <div>
                <p className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">Estimated Fill Rate</p>
                <p className="text-[18px] font-bold text-gray-900 mt-0.5">92.4%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 shrink-0 mt-6 md:mt-0">
          <button className="bg-[#8A56F9] hover:bg-[#774BE5] text-white rounded-full px-10 py-6 font-bold text-sm transition-all shadow-xl shadow-[#8A56F9]/30 flex items-center gap-3">
            Execute Pricing Strategy <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[10px] font-medium text-gray-500">Next scheduled review: Oct 12, 08:00 AM</p>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelBooking} onOpenChange={() => setCancelBooking(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium">
              Are you sure you want to cancel the booking for <strong className="text-gray-900">{cancelBooking?.guestName}</strong>?
              This action cannot be undone.
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
    </div>
  );
}
