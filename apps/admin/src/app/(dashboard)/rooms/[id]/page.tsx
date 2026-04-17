'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Info, Banknote, Users, Image as ImageIcon, Wifi, Snowflake, Wine, Waves, BellRing, CookingPot, X, Plus } from 'lucide-react';
import { useMyHotel, useRoom, useUpdateRoom } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/hooks/use-toast';
import Link from 'next/link';

const roomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  type: z.enum(['standard', 'deluxe', 'suite', 'family', 'executive', 'penthouse']),
  description: z.string().optional(),
  basePrice: z.coerce.number().positive('Price must be greater than 0'),
  maxOccupancy: z.coerce.number().min(1, 'Max occupancy must be at least 1'),
  maxAdults: z.coerce.number().min(1, 'Max adults must be at least 1'),
  maxChildren: z.coerce.number().min(0, 'Max children cannot be negative'),
  amenities: z.array(z.string()).optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

const DEFAULT_AMENITIES = [
  { id: 'WiFi', label: 'High-speed WiFi', subtitle: 'INCLUDED', icon: <Wifi className="w-5 h-5 text-gray-700" /> },
  { id: 'Air Conditioning', label: 'Air Conditioning', subtitle: 'CENTRALIZED', icon: <Snowflake className="w-5 h-5 text-gray-700" /> },
  { id: 'Mini Bar', label: 'Mini Bar', subtitle: 'PREMIUM', icon: <Wine className="w-5 h-5 text-gray-700" /> },
  { id: 'Balcony', label: 'Balcony', subtitle: 'CITY VIEW', icon: <Waves className="w-5 h-5 text-gray-700" /> },
  { id: 'Room Service', label: 'Room Service', subtitle: '24/7 AVAILABLE', icon: <BellRing className="w-5 h-5 text-gray-700" /> },
  { id: 'Kitchenette', label: 'Kitchenette', subtitle: 'LIMITED', icon: <CookingPot className="w-5 h-5 text-gray-700" /> },
];

const DEFAULT_AMENITY_IDS = new Set(DEFAULT_AMENITIES.map(a => a.id));
const MAX_IMAGES = 3;

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
      basePrice: 1,
      maxOccupancy: 2,
      maxAdults: 2,
      maxChildren: 0,
      amenities: [],
    },
  });

  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);

  useEffect(() => {
    if (room) {
      // Separate default amenities from custom ones stored on the room
      const roomAmenities: string[] = (room.amenities as string[]) || [];
      const existingCustom = roomAmenities.filter(a => !DEFAULT_AMENITY_IDS.has(a));
      setCustomAmenities(existingCustom);

      form.reset({
        name: room.name || '',
        type: (room.type as any) || 'standard',
        description: room.description || '',
        basePrice: room.basePrice || 1,
        maxOccupancy: (room as any).maxOccupancy ?? (room as any).capacity ?? 2,
        maxAdults: (room as any).maxAdults ?? 2,
        maxChildren: (room as any).maxChildren ?? 0,
        amenities: roomAmenities,
      });

      // Pre-populate existing images
      if (room.images && Array.isArray(room.images) && room.images.length > 0) {
        setImages((room.images as string[]).slice(0, MAX_IMAGES));
      }
    }
  }, [room, form]);

  const selectedAmenities = form.watch('amenities') || [];

  const toggleAmenity = (amenityId: string) => {
    const current = form.getValues('amenities') || [];
    if (current.includes(amenityId)) {
      form.setValue('amenities', current.filter((a) => a !== amenityId), { shouldValidate: true, shouldDirty: true });
    } else {
      form.setValue('amenities', [...current, amenityId], { shouldValidate: true, shouldDirty: true });
    }
  };

  const addCustomAmenity = () => {
    const trimmed = customAmenityInput.trim();
    if (!trimmed) return;
    if (customAmenities.includes(trimmed) || DEFAULT_AMENITY_IDS.has(trimmed)) {
      toast({ title: 'Duplicate', description: 'This amenity already exists.', variant: 'destructive' });
      return;
    }
    setCustomAmenities(prev => [...prev, trimmed]);
    const current = form.getValues('amenities') || [];
    form.setValue('amenities', [...current, trimmed], { shouldValidate: true, shouldDirty: true });
    setCustomAmenityInput('');
  };

  const removeCustomAmenity = (id: string) => {
    setCustomAmenities(prev => prev.filter(a => a !== id));
    const current = form.getValues('amenities') || [];
    form.setValue('amenities', current.filter(a => a !== id), { shouldValidate: true, shouldDirty: true });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({ title: 'Limit Reached', description: `You can upload a maximum of ${MAX_IMAGES} images.`, variant: 'destructive' });
      return;
    }

    Array.from(files).slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImages((prev) => {
          const updated = [...prev, base64String];
          try {
            localStorage.setItem(`room_images_${roomId}`, JSON.stringify(updated));
          } catch { /* quota exceeded */ }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem(`room_images_${roomId}`, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  };

  const onSubmit = async (data: RoomFormData) => {
    try {
      // Only send fields that UpdateRoomDto accepts — NO status field
      const payload = {
        name: data.name,
        type: data.type,
        description: data.description,
        basePrice: data.basePrice,
        capacity: data.maxOccupancy,
        amenities: data.amenities,
        images: images,
      } as any;

      await updateRoom.mutateAsync(payload);
      toast({
        title: 'Room Updated',
        description: data.name + ' has been updated successfully.',
        variant: 'success',
      });
      router.push('/rooms');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update room. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#1B2541]" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold bg-gray-50 rounded-2xl p-10 max-w-md mx-auto">Room Not Found</h1>
        <Link href="/rooms">
          <Button className="mt-6 rounded-full bg-[#1B2541]">Back to Rooms</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="font-sans max-w-[1280px] mx-auto pb-12 pt-2">
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center text-[13px] font-bold text-gray-500 mb-4 tracking-wide">
              <Link href="/rooms" className="hover:text-gray-900 transition-colors">Inventory</Link>
              <span className="mx-2 text-gray-300">&gt;</span>
              <span className="text-gray-900">Edit Room Details</span>
            </div>
            <h1 className="text-[2.25rem] font-bold tracking-tight text-gray-900 leading-none mb-2">
              Edit Room
            </h1>
            <p className="text-[15px] font-medium text-gray-600">
              Update {room.name}'s specifications and pricing logic.
            </p>
          </div>

          <div className="flex gap-4">
             <Link href="/rooms">
               <Button type="button" variant="outline" className="rounded-full px-8 py-6 font-bold border-gray-300 text-gray-800 hover:bg-gray-50 shadow-sm border-2">
                 Discard
               </Button>
             </Link>
             <Button type="submit" disabled={updateRoom.isPending} className="rounded-full px-8 py-6 bg-[#0B1120] hover:bg-[#1A2542] text-white shadow-xl shadow-black/10">
               {updateRoom.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
               Save Changes
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
          
          {/* Left Column */}
          <div className="flex flex-col gap-8">
            
            {/* Basic Information */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 relative">
               <div className="flex items-center gap-4 mb-10">
                 <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[#4F46E5] shrink-0">
                   <Info className="w-4 h-4" />
                 </div>
                 <h2 className="text-[20px] font-bold text-gray-900">Basic Information</h2>
               </div>
               
               <div className="space-y-8">
                 <div>
                    <label className="block text-[13px] font-bold text-gray-900 mb-2">Room Name</label>
                    <Input
                      {...form.register('name')}
                      placeholder="e.g. Skyline Executive Suite 402"
                      className="w-full rounded-2xl border-gray-200 py-6 px-5 text-[15px] font-medium placeholder:text-gray-400 focus-visible:ring-[#4F46E5] shadow-sm"
                    />
                    {form.formState.errors.name && (
                      <p className="text-[12px] font-bold text-red-500 mt-2">{form.formState.errors.name.message}</p>
                    )}
                 </div>

                 <div>
                   <label className="block text-[13px] font-bold text-gray-900 mb-2">Room Type</label>
                   <Controller
                     control={form.control}
                     name="type"
                     render={({ field }) => (
                       <Select value={field.value} onValueChange={field.onChange}>
                         <SelectTrigger className="w-full rounded-2xl border-gray-200 py-6 px-5 text-[15px] font-medium shadow-sm focus:ring-[#4F46E5]">
                           <SelectValue placeholder="Select room type" />
                         </SelectTrigger>
                         <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                           <SelectItem value="standard" className="text-[14px] font-medium">Standard</SelectItem>
                           <SelectItem value="deluxe" className="text-[14px] font-medium">Deluxe</SelectItem>
                           <SelectItem value="suite" className="text-[14px] font-medium">Suite</SelectItem>
                           <SelectItem value="family" className="text-[14px] font-medium">Family</SelectItem>
                           <SelectItem value="executive" className="text-[14px] font-medium">Executive</SelectItem>
                           <SelectItem value="penthouse" className="text-[14px] font-medium">Penthouse</SelectItem>
                         </SelectContent>
                       </Select>
                     )}
                   />
                 </div>

                 <div>
                    <label className="block text-[13px] font-bold text-gray-900 mb-2">Description</label>
                    <Textarea
                      {...form.register('description')}
                      placeholder="Describe the room's unique features, views, and special touches..."
                      rows={5}
                      className="w-full rounded-2xl border-gray-200 py-5 px-5 text-[15px] font-medium placeholder:text-gray-400 focus-visible:ring-[#4F46E5] shadow-sm resize-none"
                    />
                 </div>
               </div>
            </div>

            {/* Amenities & Features */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 relative">
               <div className="flex items-center gap-4 mb-10">
                 <div className="w-8 h-8 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#10B981] shrink-0">
                   <StarIcon />
                 </div>
                 <h2 className="text-[20px] font-bold text-gray-900">Amenities & Features</h2>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                 {DEFAULT_AMENITIES.map((amenity) => {
                   const isSelected = selectedAmenities.includes(amenity.id);
                   return (
                     <div 
                       key={amenity.id}
                       onClick={() => toggleAmenity(amenity.id)}
                       className={`cursor-pointer border-2 rounded-3xl p-5 flex items-center gap-4 transition-all duration-200 ${isSelected ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-gray-100 hover:border-gray-200 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]'}`}
                     >
                       <div className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]' : 'border-gray-300 bg-white'}`}>
                          {isSelected && <CheckIcon />}
                       </div>
                       <div>
                         <p className={`text-[13px] font-bold ${isSelected ? 'text-[#312E81]' : 'text-gray-900'}`}>{amenity.label}</p>
                         <p className={`text-[8px] font-bold tracking-widest uppercase mt-0.5 ${isSelected ? 'text-[#4F46E5]' : 'text-gray-400'}`}>{amenity.subtitle}</p>
                       </div>
                     </div>
                   );
                 })}

                 {/* Custom amenities from DB or newly added */}
                 {customAmenities.map((id) => {
                   const isSelected = selectedAmenities.includes(id);
                   return (
                     <div
                       key={id}
                       className={`relative border-2 rounded-3xl p-5 flex items-center gap-4 transition-all duration-200 ${isSelected ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-gray-100 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]'}`}
                     >
                       <div
                         onClick={() => toggleAmenity(id)}
                         className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center cursor-pointer ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]' : 'border-gray-300 bg-white'}`}
                       >
                         {isSelected && <CheckIcon />}
                       </div>
                       <div className="flex-1 cursor-pointer" onClick={() => toggleAmenity(id)}>
                         <p className={`text-[13px] font-bold ${isSelected ? 'text-[#312E81]' : 'text-gray-900'}`}>{id}</p>
                         <p className="text-[8px] font-bold tracking-widest uppercase mt-0.5 text-gray-400">CUSTOM</p>
                       </div>
                       <button
                         type="button"
                         onClick={() => removeCustomAmenity(id)}
                         className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors"
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                   );
                 })}
               </div>

               {/* Add custom amenity */}
               <div className="flex gap-2 mt-2">
                 <Input
                   value={customAmenityInput}
                   onChange={(e) => setCustomAmenityInput(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
                   placeholder="e.g. Jacuzzi, Sea View, Smart TV..."
                   className="rounded-2xl border-gray-200 py-5 px-5 text-[14px] font-medium placeholder:text-gray-400 focus-visible:ring-[#4F46E5] shadow-sm flex-1"
                 />
                 <button
                   type="button"
                   onClick={addCustomAmenity}
                   className="shrink-0 w-12 h-12 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl flex items-center justify-center transition-colors shadow-md"
                 >
                   <Plus className="w-5 h-5" />
                 </button>
               </div>
               <p className="text-[11px] text-gray-400 font-medium mt-2 ml-1">Press Enter or click + to add a custom amenity</p>
            </div>

          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">

            {/* Pricing */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 relative">
               <div className="flex items-center gap-4 mb-8">
                 <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#10B981] shrink-0">
                   <Banknote className="w-4 h-4" />
                 </div>
                 <h2 className="text-[20px] font-bold text-gray-900">Pricing</h2>
               </div>
               
               <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-2">Base Price (Per Night)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-gray-900">$</span>
                    <Input
                      {...form.register('basePrice')}
                      type="number"
                      min={1}
                      step={0.01}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === '+') {
                          e.preventDefault();
                        }
                      }}
                      placeholder="0.00"
                      className="w-full rounded-2xl border-gray-200 py-6 pl-9 pr-5 text-[15px] font-medium focus-visible:ring-[#4F46E5] shadow-sm"
                    />
                  </div>
                  <p className="text-[10px] font-medium text-gray-400 mt-3 leading-tight">Recommended for Deluxe rooms: $240 - $320</p>
                  {form.formState.errors.basePrice && (
                    <p className="text-[12px] font-bold text-red-500 mt-2">{form.formState.errors.basePrice.message}</p>
                  )}
               </div>
            </div>

            {/* Capacity */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 relative">
               <div className="flex items-center gap-4 mb-8">
                 <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                   <Users className="w-4 h-4" />
                 </div>
                 <h2 className="text-[20px] font-bold text-gray-900">Capacity</h2>
               </div>
               
               <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-[13px] font-bold text-gray-900">Max Occupancy</label>
                       <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-bold">1-10</span>
                    </div>
                    <Input
                      {...form.register('maxOccupancy')}
                      type="number"
                      min={1}
                      max={10}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') e.preventDefault();
                      }}
                      className="w-full rounded-2xl border-gray-200 py-6 px-5 text-[15px] font-medium focus-visible:ring-[#4F46E5] shadow-sm"
                    />
                    {form.formState.errors.maxOccupancy && (
                      <p className="text-[12px] font-bold text-red-500 mt-2">{form.formState.errors.maxOccupancy.message}</p>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Max Adults</label>
                      <Input
                        {...form.register('maxAdults')}
                        type="number"
                        min={1}
                        max={10}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') e.preventDefault();
                        }}
                        className="w-full rounded-2xl border-gray-200 py-6 px-5 text-[15px] font-medium text-center focus-visible:ring-[#4F46E5] shadow-sm"
                      />
                      {form.formState.errors.maxAdults && (
                        <p className="text-[12px] font-bold text-red-500 mt-1">{form.formState.errors.maxAdults.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Max Children</label>
                      <Input
                        {...form.register('maxChildren')}
                        type="number"
                        min={0}
                        max={10}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') e.preventDefault();
                        }}
                        className="w-full rounded-2xl border-gray-200 py-6 px-5 text-[15px] font-medium text-center focus-visible:ring-[#4F46E5] shadow-sm"
                      />
                      {form.formState.errors.maxChildren && (
                        <p className="text-[12px] font-bold text-red-500 mt-1">{form.formState.errors.maxChildren.message}</p>
                      )}
                    </div>
                 </div>
               </div>
            </div>

            {/* Upload Gallery */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-[18px] font-bold text-gray-900">Gallery</h2>
                </div>
                <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden relative group">
                      <img src={img} className="w-full h-full object-cover" alt={`Room photo ${i + 1}`} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              {images.length < MAX_IMAGES ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-[#F8FAFC] hover:border-[#3B82F6] transition-all cursor-pointer"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-10 h-10 bg-[#EFF6FF] rounded-full flex items-center justify-center mb-3">
                    <Plus className="text-[#3B82F6] w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <p className="text-[13px] font-bold text-gray-700">
                    {images.length === 0 ? 'Upload Photos' : 'Add More'}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1">
                    PNG, JPG · Max {MAX_IMAGES - images.length} more
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-4 text-center bg-gray-50">
                  <p className="text-[12px] font-bold text-gray-400">Maximum {MAX_IMAGES} images reached</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">Remove an image to upload a new one</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </form>

      {/* Bottom Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
        <div className="bg-[#0B1120] text-white rounded-[2rem] p-8 shadow-xl">
           <p className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase mb-1.5">Total Inventory</p>
           <p className="text-[32px] font-bold leading-none">124 Rooms</p>
        </div>
        <div className="bg-white rounded-[2rem] p-8 ring-1 ring-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
           <p className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase mb-1.5">Avg. Maintenance</p>
           <p className="text-[32px] font-bold text-gray-900 leading-none">4.2 Days</p>
        </div>
        <div className="bg-white rounded-[2rem] p-8 ring-1 ring-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
           <p className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase mb-1.5">Projected ROI</p>
           <p className="text-[32px] font-bold text-[#10B981] leading-none">+12.5%</p>
        </div>
        <div className="bg-white rounded-[2rem] p-8 ring-1 ring-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
           <p className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase mb-1.5">Active Bookings</p>
           <p className="text-[32px] font-bold text-[#3B82F6] leading-none">89%</p>
        </div>
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
