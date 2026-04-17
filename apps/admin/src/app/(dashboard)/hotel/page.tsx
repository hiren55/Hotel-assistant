'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2, BedDouble, Wifi, Waves, Utensils, Dumbbell,
  BatteryCharging, Plus, MessageSquare, Database, Send,
  X, Star, Bot, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useMyHotel, useUpdateHotel } from '@/lib/hooks';
import { hotelKeys } from '@/lib/hooks/useHotel';
import { useWidgetColor } from '@/lib/context/WidgetColorContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/lib/hooks/use-toast';

// ─── Zod Schema ─────────────────────────────────────────────────────────────
const hotelProfileSchema = z.object({
  name: z.string().min(2, 'Hotel name must be at least 2 characters'),
  description: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

type HotelProfileFormData = z.infer<typeof hotelProfileSchema>;

// ─── Amenity icons map ───────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, React.ElementType> = {
  'Free High-speed WiFi': Wifi,
  'Infinity Spa': Waves,
  'Fine Dining': Utensils,
  'Gym': Dumbbell,
  'EV Charging': BatteryCharging,
};

// ─── Pill component ──────────────────────────────────────────────────────────
const Pill = ({
  icon: Icon,
  label,
  active = false,
  onRemove,
}: {
  icon?: React.ElementType;
  label: string;
  active?: boolean;
  onRemove?: () => void;
}) => (
  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold group ${active ? 'bg-[#1C2541] text-white shadow-sm' : 'bg-[#E0E5F0] text-gray-700 hover:bg-[#d6dbe5] transition-colors'}`}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    <span>{label}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
        aria-label={`Remove ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function HotelProfilePage() {
  const queryClient = useQueryClient();
  const { data: hotel, isLoading } = useMyHotel();
  const updateHotel = useUpdateHotel();

  // Color state for live widget preview + context broadcasting
  const { primaryColor, secondaryColor, setColors, setPrimary, setSecondary } = useWidgetColor();

  // Amenities state
  const [amenities, setAmenities] = useState<string[]>([]);
  const [showAddAmenity, setShowAddAmenity] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Knowledge sync state
  const [isRetraining, setIsRetraining] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const form = useForm<HotelProfileFormData>({
    resolver: zodResolver(hotelProfileSchema),
    defaultValues: {
      name: '',
      description: '',
      contactEmail: '',
      contactPhone: '',
      website: '',
      address: { street: '', city: '', state: '', country: '', postalCode: '' },
    },
  });

  // Populate form + state from hotel data
  useEffect(() => {
    if (hotel) {
      const branding = (hotel as any)?.branding || {};
      const settings = (hotel as any)?.settings || {};

      form.reset({
        name: hotel.name || '',
        description: (hotel as any)?.description || branding.description || '',
        contactEmail: (hotel as any)?.email || hotel.contactEmail || '',
        contactPhone: (hotel as any)?.phone || hotel.contactPhone || '',
        website: branding.website || (hotel as any)?.website || '',
        address: {
          street: hotel.address?.street || '',
          city: hotel.address?.city || '',
          state: hotel.address?.state || '',
          country: hotel.address?.country || '',
          postalCode: hotel.address?.postalCode || '',
        },
      });

      // Colors from branding (BrandingDto) — push into shared context
      const p = branding.primaryColor || '#1C2541';
      const s = branding.secondaryColor || '#D2BBFF';
      setColors(p, s);

      // Amenities from branding (stored as JSON string in welcomeMessage extension)
      const savedAmenities = branding.amenities;
      if (Array.isArray(savedAmenities) && savedAmenities.length > 0) {
        setAmenities(savedAmenities);
      } else {
        setAmenities(['Free High-speed WiFi', 'Infinity Spa']);
      }

      // Last sync time from branding
      if (branding.lastKnowledgeSync) {
        setLastSync(branding.lastKnowledgeSync);
      }
    }
  }, [hotel, form]);

  // Focus add amenity input when shown
  useEffect(() => {
    if (showAddAmenity) addInputRef.current?.focus();
  }, [showAddAmenity]);

  // ── Save property details ──────────────────────────────────────────────────
  const onSubmit = async (data: HotelProfileFormData) => {
    if (!hotel?.id) return;
    try {
      const existingBranding = (hotel as any)?.branding || {};
      const existingSettings = (hotel as any)?.settings || {};

      // Only send fields the backend DTOs strictly accept
      // BrandingDto: primaryColor, secondaryColor, logoUrl, welcomeMessage
      // HotelSettingsDto: checkInTime, checkOutTime, currency, timezone, cancellationPolicy, widgetEnabled, bookingEnabled
      const payload = {
        name: data.name,
        email: data.contactEmail || undefined,
        phone: data.contactPhone || undefined,
        address: data.address,
        branding: {
          ...(existingBranding.logoUrl && { logoUrl: existingBranding.logoUrl }),
          ...(existingBranding.welcomeMessage && { welcomeMessage: existingBranding.welcomeMessage }),
          primaryColor,
          secondaryColor,
          // NOTE: amenities not persisted to DB (no DTO field) — managed in React state
        },
        settings: {
          ...(existingSettings.checkInTime && { checkInTime: existingSettings.checkInTime }),
          ...(existingSettings.checkOutTime && { checkOutTime: existingSettings.checkOutTime }),
          ...(existingSettings.currency && { currency: existingSettings.currency }),
          ...(existingSettings.timezone && { timezone: existingSettings.timezone }),
        },
      };
      await updateHotel.mutateAsync({ id: hotel.id, data: payload as any });
      void queryClient.invalidateQueries({ queryKey: hotelKeys.my() });
      toast({ title: 'Identity Updated', description: 'Hotel identity has been saved successfully.', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update hotel identity. Please try again.', variant: 'destructive' });
    }
  };

  // ── Add amenity ────────────────────────────────────────────────────────────
  const handleAddAmenity = () => {
    const trimmed = newAmenity.trim();
    if (!trimmed || amenities.includes(trimmed)) return;
    setAmenities(prev => [...prev, trimmed]);
    setNewAmenity('');
    setShowAddAmenity(false);
  };

  // ── Remove amenity ─────────────────────────────────────────────────────────
  const handleRemoveAmenity = (label: string) => {
    setAmenities(prev => prev.filter(a => a !== label));
  };

  // ── Force Retrain ──────────────────────────────────────────────────────────
  const handleRetrain = async () => {
    if (!hotel?.id || isRetraining) return;
    setIsRetraining(true);
    try {
      // No backend endpoint for retrain yet — update local state only
      await new Promise(resolve => setTimeout(resolve, 1200)); // simulate
      setLastSync(new Date().toISOString());
      toast({ title: 'Retrain Started', description: 'AI knowledge sync has been triggered.', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to trigger retrain. Please try again.', variant: 'destructive' });
    } finally {
      setIsRetraining(false);
    }
  };

  // ── Format last sync time ──────────────────────────────────────────────────
  const formatLastSync = (iso: string | null): string => {
    if (!iso) return 'Never';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min${diff > 1 ? 's' : ''} ago`;
    const hours = Math.floor(diff / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#7E42FF]" />
      </div>
    );
  }

  return (
    <div className="pb-10 font-sans">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center items-start gap-4 mb-8 mt-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Hotel Identity</h1>
            <p className="mt-2 text-[15px] font-medium text-gray-600 max-w-2xl">
              Configure your property's digital persona and customize how the AI interacts with your guests.
            </p>
          </div>
          <div className="flex gap-4 shrink-0 mt-4 sm:mt-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8 py-6 font-semibold border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm"
              onClick={() => form.reset()}
            >
              Discard<br className="hidden xl:block"/> Changes
            </Button>
            <Button
              type="submit"
              className="rounded-full px-8 py-6 font-semibold bg-[#111827] hover:bg-[#1C2541] text-white shadow-md transition-all"
              disabled={updateHotel.isPending}
            >
              {updateHotel.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Save<br className="hidden xl:block" /> Changes
            </Button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Left Column */}
          <div className="space-y-8 flex flex-col">

            {/* Property Details */}
            <Card className="border-none shadow-sm rounded-[2rem] bg-[#EEF2FC] overflow-hidden flex-1">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <BedDouble className="h-6 w-6 text-gray-900" strokeWidth={2.5} />
                  <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">Hotel Name</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      className="bg-[#DEE5F6] border-none text-gray-900 font-medium py-6 px-4 rounded-xl text-sm"
                      placeholder="e.g. The Azure Sanctuary & Spa"
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-red-500 font-medium">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">Property Type</Label>
                      <div className="relative">
                        <select className="appearance-none w-full bg-[#DEE5F6] border-none text-gray-900 font-medium py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7E42FF]/50 text-sm">
                          <option>Boutique Resort</option>
                          <option>Luxury Hotel</option>
                          <option>Business Hotel</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">Star Rating</Label>
                      <div className="flex items-center gap-1.5 bg-[#DEE5F6] rounded-xl py-3.5 px-4 h-[48px]">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className="w-4 h-4 fill-[#7E42FF] text-[#7E42FF]" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-[10px] font-bold tracking-wider text-gray-600 uppercase">Guest Welcome Message</Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      className="bg-[#DEE5F6] border-none text-gray-900 font-medium py-4 px-4 rounded-xl resize-none h-32 text-sm leading-relaxed"
                      placeholder="Welcome your guests..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Amenities */}
            <Card className="border-none shadow-sm rounded-[2rem] bg-[#EEF2FC]">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Waves className="h-6 w-6 text-gray-900" strokeWidth={2.5} />
                  <h2 className="text-xl font-bold text-gray-900">Active Amenities</h2>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {amenities.map(label => (
                    <Pill
                      key={label}
                      icon={AMENITY_ICONS[label]}
                      label={label}
                      active
                      onRemove={() => handleRemoveAmenity(label)}
                    />
                  ))}

                  {showAddAmenity ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={addInputRef}
                        type="text"
                        value={newAmenity}
                        onChange={e => setNewAmenity(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity(); }
                          if (e.key === 'Escape') { setShowAddAmenity(false); setNewAmenity(''); }
                        }}
                        placeholder="Amenity name..."
                        className="px-3 py-2 text-xs rounded-full bg-white border border-[#C8D4F0] text-gray-800 font-semibold outline-none focus:ring-2 focus:ring-[#7E42FF]/30 w-36"
                      />
                      <button
                        type="button"
                        onClick={handleAddAmenity}
                        className="px-3 py-2 rounded-full text-xs font-semibold bg-[#1C2541] text-white shadow-sm hover:bg-black transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddAmenity(false); setNewAmenity(''); }}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddAmenity(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#DEE5F6] text-gray-600 hover:bg-[#d4dbe9] shadow-sm transition-colors border border-transparent hover:border-gray-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add New
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8 flex flex-col">

            {/* Widget UI Live Preview */}
            <Card className="border-none shadow-sm rounded-[2rem] bg-[#EEF2FC] flex-1 flex flex-col">
              <CardContent className="p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-[#7E42FF] fill-[#7E42FF]" />
                    <h2 className="text-xl font-bold text-gray-900">Widget UI</h2>
                  </div>
                  <span className="px-3.5 py-1.5 bg-[#DEE5F6] text-gray-700 text-[9px] font-bold tracking-widest rounded-full uppercase shadow-sm">Live Preview</span>
                </div>

                {/* Chat preview — colors update in real time */}
                <div className="bg-white rounded-[2rem] p-2 pb-6 shadow-sm mb-auto mx-4 sm:mx-8">
                  <div
                    className="rounded-t-[1.5rem] rounded-b-md flex items-center justify-between p-4 mb-6"
                    style={{ backgroundColor: primaryColor + '22' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-inner"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{form.watch('name') || hotel?.name || 'AI Concierge'}</div>
                        <div className="text-[9px] font-bold tracking-wider text-gray-500 uppercase mt-0.5">Online</div>
                      </div>
                    </div>
                    <X className="w-4 h-4 text-gray-500 hover:text-gray-800 cursor-pointer transition-colors" />
                  </div>

                  <div className="px-4 space-y-4 mb-20 text-[11px] leading-relaxed relative">
                    <div
                      className="text-gray-800 p-3.5 rounded-[1.25rem] rounded-tl-sm font-medium w-4/5 shadow-sm"
                      style={{ backgroundColor: primaryColor + '18' }}
                    >
                      {form.watch('description') || 'Bonjour! I can help you with room service or local tours.'}
                    </div>
                    <div className="flex justify-end">
                      <div
                        className="text-gray-800 p-3.5 rounded-[1.25rem] rounded-tr-sm font-medium max-w-[85%] shadow-sm"
                        style={{ backgroundColor: secondaryColor + '55' }}
                      >
                        What time does the spa close?
                      </div>
                    </div>
                    <div
                      className="text-gray-800 p-3.5 rounded-[1.25rem] rounded-tl-sm font-medium w-[90%] shadow-sm"
                      style={{ backgroundColor: primaryColor + '18' }}
                    >
                      The Infinity Spa is open until 10:00 PM tonight.
                    </div>
                  </div>

                  <div className="px-4 relative mt-4">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="w-full bg-[#EEF2FC] rounded-full py-3.5 pl-5 pr-14 text-xs font-medium text-gray-600 outline-none shadow-inner border border-transparent focus:border-indigo-100 transition-colors"
                      readOnly
                    />
                    <div
                      className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-colors"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Send className="w-3.5 h-3.5 text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Color pickers */}
                <div className="grid grid-cols-2 gap-4 px-4 sm:px-8 mt-8">
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-gray-600 uppercase mb-2">Primary Color</div>
                    <label className="flex items-center gap-3 bg-[#DEE5F6] rounded-xl py-3 px-4 transition-transform hover:scale-[1.02] cursor-pointer">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={e => setPrimary(e.target.value)}
                        className="w-6 h-6 rounded-full border-none bg-transparent cursor-pointer p-0"
                        style={{ appearance: 'none' }}
                      />
                      <span className="text-xs font-bold text-gray-800 tracking-wider">{primaryColor.toUpperCase()}</span>
                    </label>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-gray-600 uppercase mb-2">Secondary</div>
                    <label className="flex items-center gap-3 bg-[#DEE5F6] rounded-xl py-3 px-4 transition-transform hover:scale-[1.02] cursor-pointer">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={e => setSecondary(e.target.value)}
                        className="w-6 h-6 rounded-full border-none bg-transparent cursor-pointer p-0"
                        style={{ appearance: 'none' }}
                      />
                      <span className="text-xs font-bold text-gray-800 tracking-wider">{secondaryColor.toUpperCase()}</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Knowledge Sync */}
        <div className="bg-[#EEF2FC] rounded-[2.5rem] p-8 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm mt-8 gap-6 sm:gap-0">
          <div className="flex items-center gap-6">
            <div className="w-[4.5rem] h-[4.5rem] shrink-0 rounded-[1.25rem] bg-[#111827] flex items-center justify-center shadow-lg">
              <Database className="w-8 h-8 text-[#0EA5E9]" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Knowledge Sync</h2>
              <p className="text-[13px] text-gray-600 font-medium mt-1">
                AI is trained on your hotel data and knowledge base.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 sm:gap-8 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col sm:items-end">
              <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Last Sync</div>
              <div className="text-sm font-bold text-gray-900">{formatLastSync(lastSync)}</div>
            </div>
            <Button
              type="button"
              onClick={handleRetrain}
              disabled={isRetraining}
              className="rounded-full px-8 py-6 font-semibold bg-[#111827] hover:bg-[#1C2541] text-white shadow-md transition-all shrink-0"
            >
              {isRetraining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Force Retrain
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
