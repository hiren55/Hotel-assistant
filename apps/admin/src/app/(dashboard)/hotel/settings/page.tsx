'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save } from 'lucide-react';
import { useMyHotel, useUpdateHotelSettings } from '@/lib/hooks';
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
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/hooks/use-toast';
import { useEffect } from 'react';

const hotelSettingsSchema = z.object({
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  primaryColor: z.string().optional(),
  welcomeMessage: z.string().optional(),
  fallbackMessage: z.string().optional(),
});

type HotelSettingsFormData = z.infer<typeof hotelSettingsSchema>;

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
  { value: 'CNY', label: 'Chinese Yuan (CNY)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
];

export default function HotelSettingsPage() {
  const { data: hotel, isLoading } = useMyHotel();
  const updateSettings = useUpdateHotelSettings();

  const form = useForm<HotelSettingsFormData>({
    resolver: zodResolver(hotelSettingsSchema),
    defaultValues: {
      checkInTime: '14:00',
      checkOutTime: '11:00',
      primaryColor: '#3b82f6',
      welcomeMessage: '',
      fallbackMessage: '',
    },
  });

  useEffect(() => {
    if (hotel?.settings) {
      form.reset({
        checkInTime: hotel.settings.checkInTime || '14:00',
        checkOutTime: hotel.settings.checkOutTime || '11:00',
        primaryColor: hotel.settings.primaryColor || '#3b82f6',
        welcomeMessage: hotel.settings.welcomeMessage || '',
        fallbackMessage: hotel.settings.fallbackMessage || '',
      });
    }
  }, [hotel, form]);

  const onSubmit = async (data: HotelSettingsFormData) => {
    if (!hotel?.id) return;
    try {
      await updateSettings.mutateAsync({ id: hotel.id, settings: data });
      toast({
        title: 'Settings Updated',
        description: 'Hotel settings have been saved successfully.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hotel Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure operational settings for your hotel
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>
              Configure timezone and currency for your hotel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue={hotel?.timezone || 'America/New_York'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select defaultValue={hotel?.currency || 'USD'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
            <CardDescription>
              Set default check-in and check-out times.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkInTime">Check-in Time</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  {...form.register('checkInTime')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkOutTime">Check-out Time</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  {...form.register('checkOutTime')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bot Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Bot Messages</CardTitle>
            <CardDescription>
              Customize the messages your chatbot uses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                {...form.register('welcomeMessage')}
                placeholder="Hello! Welcome to our hotel. How can I assist you today?"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                This message is shown when a guest first opens the chat widget.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fallbackMessage">Fallback Message</Label>
              <Textarea
                id="fallbackMessage"
                {...form.register('fallbackMessage')}
                placeholder="I'm sorry, I couldn't understand that. Would you like to speak with our staff?"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                This message is shown when the bot cannot understand the user's query.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Customize the appearance of your chat widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primaryColor"
                  type="color"
                  {...form.register('primaryColor')}
                  className="h-10 w-20 p-1"
                />
                <Input
                  {...form.register('primaryColor')}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                This color will be used as the primary accent color in your chat widget.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
