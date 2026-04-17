'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Filter, Loader2, Star, Pencil, 
  Trash2, Bot, Coffee, Wifi, 
  MonitorPlay, Maximize, User, Waves, Briefcase
} from 'lucide-react';
import { useMyHotel, useRooms, useDeleteRoom } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/utils';
import type { Room, RoomType } from '@/types';

// Utility for providing realistic mocked amenity icons depending on room type
const getSpecialAmenities = (type: RoomType) => {
  switch(type) {
    case 'penthouse':
    case 'suite':
      return [
        { icon: <Wifi className="w-4 h-4" />, label: 'Ultra' },
        { icon: <Briefcase className="w-4 h-4" />, label: 'Lounge' },
      ];
    case 'executive':
      return [
        { icon: <Briefcase className="w-4 h-4" />, label: 'Office' },
        { icon: <Coffee className="w-4 h-4" />, label: 'Nespresso' },
      ];
    case 'deluxe':
    case 'family':
      return [
        { icon: <MonitorPlay className="w-4 h-4" />, label: '65" 4K' },
        { icon: <Waves className="w-4 h-4" />, label: 'Soak Tub' },
      ];
    default:
      return [
        { icon: <Wifi className="w-4 h-4" />, label: 'Smart IOT' },
        { icon: <Coffee className="w-4 h-4" />, label: 'City View' },
      ];
  }
};

const getRoomStars = (type: RoomType) => {
  switch(type) {
    case 'penthouse': return '4.9';
    case 'suite': return '4.9';
    case 'executive': return '4.7';
    case 'deluxe': return '4.5';
    default: return '4.2';
  }
};

export default function RoomsPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);

  const { data: roomsData, isLoading: roomsLoading } = useRooms(hotel?.id || '', {
    status: undefined,
    type: undefined,
  });

  const deleteRoomMutation = useDeleteRoom(hotel?.id || '');

  const rooms = roomsData?.data || [];
  const isLoading = hotelLoading || roomsLoading;

  const handleDeleteRoom = async () => {
    if (!deleteRoom) return;

    try {
      await deleteRoomMutation.mutateAsync(deleteRoom.id);
      toast({
        title: 'Room Deleted',
        description: deleteRoom.name + ' has been deleted.',
        variant: 'success',
      });
      setDeleteRoom(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete room. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#7E42FF]" />
      </div>
    );
  }

  return (
    <div className="font-sans max-w-[1400px] mx-auto pb-12">
      {/* Top 2 Insight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-12">
         {/* Occupancy Trends */}
         <div className="bg-[#A4ABB8]/80 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-8 right-8 bg-[#8C93A3] text-gray-900 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border-none">
               REAL-TIME
            </div>
            <h2 className="text-[26px] font-bold text-gray-900 mb-1">Occupancy Trends</h2>
            <p className="text-[13px] font-medium text-gray-600 mb-10">
               Live metrics for current stay distribution
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
               <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-bold tracking-wide text-gray-900">Presidential Suite</span>
                    <span className="text-[11px] font-bold tracking-wide text-gray-900">92%</span>
                  </div>
                  <div className="w-full h-3 bg-white/40 rounded-full overflow-hidden">
                    <div className="h-full bg-[#111827] rounded-full w-[92%]"></div>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-bold tracking-wide text-gray-900">Deluxe Twin</span>
                    <span className="text-[11px] font-bold tracking-wide text-[#7E42FF]">64%</span>
                  </div>
                  <div className="w-full h-3 bg-white/40 rounded-full overflow-hidden">
                    <div className="h-full bg-[#7E42FF] rounded-full w-[64%]"></div>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-bold tracking-wide text-gray-900">Executive Room</span>
                    <span className="text-[11px] font-bold tracking-wide text-gray-900">78%</span>
                  </div>
                  <div className="w-full h-3 bg-white/40 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1A2542] rounded-full w-[78%]"></div>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-bold tracking-wide text-gray-900">Standard Single</span>
                    <span className="text-[11px] font-bold tracking-wide text-gray-600">45%</span>
                  </div>
                  <div className="w-full h-3 bg-white/40 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full w-[45%] shadow-sm"></div>
                  </div>
               </div>
            </div>
         </div>

         {/* AI Dynamic Pricing Card */}
         <div className="bg-[#A4ABB8]/80 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-full bg-[#969EB0] flex items-center justify-center shadow-inner">
                   <Bot className="w-6 h-6 text-[#1A2542]" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold tracking-widest text-[#1A2542] uppercase mt-2">
                   AI DYNAMIC PRICING
                </span>
              </div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-3 leading-tight">Weekend Optimization</h2>
              <p className="text-[13px] font-medium text-gray-700 leading-relaxed max-w-[90%]">
                 Demand for <span className="font-bold text-gray-900">Executive Suites</span> is projected to rise by 24% this weekend. Suggesting +12% increase.
              </p>
            </div>

            <div className="mt-8">
               <div className="flex items-center gap-4 mb-6">
                 <div className="text-[42px] font-bold text-gray-900 leading-none">$420</div>
                 <div className="text-[13px] font-bold text-red-500 line-through leading-none mt-1">$375</div>
                 <div className="text-[10px] font-bold tracking-widest text-gray-900 uppercase ml-auto mt-2">+12% Yield</div>
               </div>
               <button className="w-full bg-[#111827] hover:bg-[#1A2542] text-white rounded-[1.25rem] py-5 font-bold text-[14px] transition-colors shadow-lg">
                 Apply Recommendation
               </button>
            </div>
         </div>
      </div>

      {/* Room Inventory Section Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center items-start gap-4 mb-8">
        <h2 className="text-[28px] font-bold text-gray-900">Room Inventory</h2>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full px-6 py-6 font-bold border-gray-300 bg-[#AAB1BE]/30 hover:bg-[#AAB1BE]/50 text-gray-800 border-none shadow-sm">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Link href="/rooms/new">
            <Button className="rounded-full px-6 py-6 font-bold bg-[#111827] hover:bg-[#1A2542] text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" strokeWidth={3} /> Add Type
            </Button>
          </Link>
        </div>
      </div>

      {/* Room Inventory Grid */}
      {rooms.length === 0 ? (
        <div className="bg-white/50 rounded-[2.5rem] p-12 text-center shadow-sm">
          <p className="text-gray-500 font-bold mb-2">No rooms found</p>
          <p className="text-sm text-gray-400">Add your first room type to begin managing inventory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {rooms.map((room) => {
             const isSuite = room.type === 'suite' || room.type === 'penthouse';
             const isLimited = room.status === 'occupied' || room.type === 'executive';
             const amenities = getSpecialAmenities(room.type);
             const fakeStars = getRoomStars(room.type);
             
             // Base sizes (mocked for visual fidelity if actual data lacks it)
             const sizeMock = room.type === 'penthouse' ? '120m²' : room.type === 'executive' ? '54m²' : room.type === 'deluxe' ? '42m²' : '28m²';

             return (
               <div key={room.id} className="bg-gradient-to-b from-white to-[#F2F5FB] rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative group transition-transform hover:-translate-y-1">
                 
                 {/* Visual Badges overlay */}
                 <div className="absolute top-5 left-5 z-10 flex gap-2">
                    {isSuite && (
                      <span className="bg-[#111827]/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase">
                        FEATURED
                      </span>
                    )}
                    {isLimited && !isSuite && (
                      <span className="bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase">
                        ONLY 2 LEFT
                      </span>
                    )}
                 </div>

                 {/* Image Area */}
                 <div className="h-[220px] w-full bg-slate-200 relative overflow-hidden">
                   {room.images?.[0] ? (
                     <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-tr from-slate-300 to-slate-200 flex items-center justify-center text-slate-400">
                        <MonitorPlay className="w-10 h-10 opacity-20" />
                     </div>
                   )}
                   {/* Integrated bottom shadow gradient for smooth text transition */}
                   <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
                 </div>

                 {/* Content Area */}
                 <div className="p-8 pb-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-[20px] font-bold text-gray-900 leading-tight pr-4">
                        {room.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0 mt-1">
                        <Star className="w-3.5 h-3.5 fill-gray-900 text-gray-900" />
                        <span className="text-[12px] font-bold text-gray-900">{fakeStars}</span>
                      </div>
                    </div>

                    <p className="text-[12px] text-gray-600 font-medium leading-relaxed mb-6 line-clamp-3">
                      {room.description || 'Spacious room ensuring you have everything you need for a comfortable stay.'}
                    </p>

                    {/* Meta stats row */}
                    <div className="flex justify-between items-center mt-auto pb-8 border-b border-gray-200/60 mb-6">
                       <div className="flex flex-col items-center gap-1.5">
                         <Maximize className="w-4 h-4 text-gray-700" />
                         <span className="text-[9px] font-bold text-gray-500 uppercase">{sizeMock}</span>
                       </div>
                       <div className="flex flex-col items-center gap-1.5">
                         <User className="w-4 h-4 text-gray-700" />
                         <span className="text-[9px] font-bold text-gray-500 uppercase">{room.maxOccupancy} Max</span>
                       </div>
                       {amenities.map((amenity, idx) => (
                         <div key={idx} className="flex flex-col items-center gap-1.5">
                           {/* cloneElement isn't used here, relying on direct icons from mapping */}
                           <div className="text-gray-700">{amenity.icon}</div>
                           <span className="text-[9px] font-bold text-gray-500 uppercase">{amenity.label}</span>
                         </div>
                       ))}
                    </div>

                    {/* Footer Area */}
                    <div className="flex justify-between items-end relative">
                      <div>
                        <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase block mb-1">
                          Starting from
                        </span>
                        <div className="flex items-end gap-1">
                          <span className="text-[24px] font-bold text-gray-900 leading-none">
                            {formatCurrency(room.basePrice, room.currency).replace('.00', '')}
                          </span>
                          <span className="text-[12px] font-medium text-gray-500 mb-1">/night</span>
                        </div>
                      </div>

                      {/* Floating Edit Circular Button */}
                      <Link href={'/rooms/' + room.id + ''}>
                        <div className="w-12 h-12 bg-[#E1E6FA] group-hover:bg-[#111827] group-hover:text-white transition-colors rounded-full flex items-center justify-center cursor-pointer shadow-sm">
                          <Pencil className="w-4 h-4" strokeWidth={2.5} />
                        </div>
                      </Link>
                    </div>

                    {/* Small invisible delete button for admins */}
                    <button 
                      onClick={() => setDeleteRoom(room)}
                      className="absolute top-5 right-5 w-8 h-8 bg-white/50 hover:bg-red-500 hover:text-white backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-gray-600"
                      title="Delete Room"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                 </div>
               </div>
             );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRoom} onOpenChange={() => setDeleteRoom(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Delete Room</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium mt-2">
              Are you sure you want to delete <strong className="text-gray-900">{deleteRoom?.name}</strong>? This action cannot be undone.
              Any existing bookings for this room type will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-full px-8 border-none hover:bg-gray-100 font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              className="rounded-full px-8 bg-red-500 text-white hover:bg-red-600 font-bold border-none"
            >
              {deleteRoomMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Layout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
