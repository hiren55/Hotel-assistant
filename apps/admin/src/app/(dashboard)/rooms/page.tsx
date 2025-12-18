'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useMyHotel, useRooms, useDeleteRoom, useUpdateRoomStatus } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency } from '@/lib/utils';
import type { Room, RoomStatus, RoomType } from '@/types';

const statusColors: Record<RoomStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  available: 'success',
  occupied: 'warning',
  maintenance: 'destructive',
  disabled: 'secondary',
};

const roomTypeLabels: Record<RoomType, string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  suite: 'Suite',
  family: 'Family',
  executive: 'Executive',
  penthouse: 'Penthouse',
};

export default function RoomsPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RoomType | 'all'>('all');
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);

  const { data: roomsData, isLoading: roomsLoading } = useRooms(hotel?.id || '', {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const deleteRoomMutation = useDeleteRoom(hotel?.id || '');
  const updateStatusMutation = useUpdateRoomStatus(hotel?.id || '');

  const rooms = roomsData?.data || [];
  const isLoading = hotelLoading || roomsLoading;

  const handleDeleteRoom = async () => {
    if (!deleteRoom) return;

    try {
      await deleteRoomMutation.mutateAsync(deleteRoom.id);
      toast({
        title: 'Room Deleted',
        description: `${deleteRoom.name} has been deleted.`,
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

  const handleStatusChange = async (roomId: string, status: RoomStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ roomId, status });
      toast({
        title: 'Status Updated',
        description: 'Room status has been updated.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update room status.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your hotel rooms and availability
          </p>
        </div>
        <Link href="/rooms/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-[180px]">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as RoomStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as RoomType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="deluxe">Deluxe</SelectItem>
                  <SelectItem value="suite">Suite</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No rooms found</p>
              <p className="text-sm mt-1">
                {statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first room to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {room.images?.[0] ? (
                          <img
                            src={room.images[0]}
                            alt={room.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-sm">
                            {room.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{room.name}</div>
                          {room.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {room.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{roomTypeLabels[room.type]}</TableCell>
                    <TableCell>{formatCurrency(room.basePrice, room.currency)}/night</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{room.maxOccupancy} guests max</div>
                        <div className="text-muted-foreground">
                          {room.maxAdults} adults, {room.maxChildren} children
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[room.status]}>
                        {room.status}
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
                          <Link href={`/rooms/${room.id}`}>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(room.id, 'available')}
                            disabled={room.status === 'available'}
                          >
                            Set Available
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(room.id, 'maintenance')}
                            disabled={room.status === 'maintenance'}
                          >
                            Set Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(room.id, 'disabled')}
                            disabled={room.status === 'disabled'}
                          >
                            Disable
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteRoom(room)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRoom} onOpenChange={() => setDeleteRoom(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRoom?.name}"? This action cannot be undone.
              Any existing bookings for this room will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRoomMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
