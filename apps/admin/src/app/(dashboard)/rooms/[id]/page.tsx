'use client';

import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useMyHotel, useRoom, useUpdateRoom } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/hooks/use-toast';
import Link from 'next/link';
import { useEffect } from 'react';

const roomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  type: z.enum(['standard', 'deluxe', 'suite', 'family', 'executive', 'penthouse']),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(0, 'Price must be positive'),
  maxOccupancy: z.coerce.number().min(1, 'Max occupancy must be at least 1'),
  maxAdults: z.coerce.number().min(1, 'Max adults must be at least 1'),
  maxChildren: z.coerce.number().min(0, 'Max children cannot be negative'),
  amenities: z.array(z.string()).optional(),
  status: z.enum(['available', 'occupied', 'maintenance', 'disabled']),
});

type RoomFormData = z.infer<typeof roomSchema>;

const amenitiesList = [
  'WiFi',
  'Air Conditioning',
  'TV',
  'Mini Bar',
  'Safe',
  'Room Service',
  'Balcony',
  'Ocean View',
  'City View',
  'Garden View',
  'Bathtub',
  'Shower',
  'Hair Dryer',
  'Iron',
  'Coffee Maker',
  'Kitchenette',
  'Workspace',
  'King Bed',
  'Twin Beds',
  'Sofa Bed',
];

export default function EditRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const { data: room, isLoading: roomLoading } = useRoom(hotel?.id || '', roomId);
  const updateRoom = useUpdateRoom(hotel?.id || '', roomId);

  const isLoading = hotelLoading || roomLoading;

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: '',
      type: 'standard',
      description: '',
      basePrice: 100,
      maxOccupancy: 2,
      maxAdults: 2,
      maxChildren: 0,
      amenities: [],
      status: 'available',
    },
  });

  useEffect(() => {
    if (room) {
      form.reset({
        name: room.name || '',
        type: room.type || 'standard',
        description: room.description || '',
        basePrice: room.basePrice || 100,
        maxOccupancy: room.maxOccupancy || 2,
        maxAdults: room.maxAdults || 2,
        maxChildren: room.maxChildren || 0,
        amenities: room.amenities || [],
        status: room.status || 'available',
      });
    }
  }, [room, form]);

  const selectedAmenities = form.watch('amenities') || [];

  const toggleAmenity = (amenity: string) => {
    const current = form.getValues('amenities') || [];
    if (current.includes(amenity)) {
      form.setValue('amenities', current.filter((a) => a !== amenity));
    } else {
      form.setValue('amenities', [...current, amenity]);
    }
  };

  const onSubmit = async (data: RoomFormData) => {
    try {
      await updateRoom.mutateAsync(data);
      toast({
        title: 'Room Updated',
        description: `${data.name} has been updated successfully.`,
        variant: 'success',
      });
      router.push('/rooms');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update room. Please try again.',
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

  if (!room) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold">Room Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The room you're looking for doesn't exist.
        </p>
        <Link href="/rooms">
          <Button className="mt-4">Back to Rooms</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rooms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Edit Room</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update {room.name}'s details
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update the basic details about this room.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="e.g., Deluxe Suite 101"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Room Type *</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(value) => form.setValue('type', value as RoomFormData['type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Describe this room..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Status */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Status</CardTitle>
            <CardDescription>
              Set the price and availability status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (per night) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="basePrice"
                    type="number"
                    {...form.register('basePrice')}
                    className="pl-7"
                    min={0}
                    step={0.01}
                  />
                </div>
                {form.formState.errors.basePrice && (
                  <p className="text-sm text-destructive">{form.formState.errors.basePrice.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as RoomFormData['status'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>Capacity</CardTitle>
            <CardDescription>
              Set the maximum occupancy for this room.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxOccupancy">Max Occupancy *</Label>
                <Input
                  id="maxOccupancy"
                  type="number"
                  {...form.register('maxOccupancy')}
                  min={1}
                />
                {form.formState.errors.maxOccupancy && (
                  <p className="text-sm text-destructive">{form.formState.errors.maxOccupancy.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAdults">Max Adults *</Label>
                <Input
                  id="maxAdults"
                  type="number"
                  {...form.register('maxAdults')}
                  min={1}
                />
                {form.formState.errors.maxAdults && (
                  <p className="text-sm text-destructive">{form.formState.errors.maxAdults.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxChildren">Max Children</Label>
                <Input
                  id="maxChildren"
                  type="number"
                  {...form.register('maxChildren')}
                  min={0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
            <CardDescription>
              Select the amenities available in this room.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {amenitiesList.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={amenity}
                    checked={selectedAmenities.includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  <Label htmlFor={amenity} className="text-sm font-normal cursor-pointer">
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/rooms">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateRoom.isPending}>
            {updateRoom.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
