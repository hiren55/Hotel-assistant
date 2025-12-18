'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Upload } from 'lucide-react';
import { useMyHotel, useUpdateHotel, useUploadLogo } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/hooks/use-toast';
import { useEffect, useRef } from 'react';

const hotelProfileSchema = z.object({
  name: z.string().min(2, 'Hotel name must be at least 2 characters'),
  description: z.string().optional(),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

type HotelProfileFormData = z.infer<typeof hotelProfileSchema>;

export default function HotelProfilePage() {
  const { data: hotel, isLoading } = useMyHotel();
  const updateHotel = useUpdateHotel(hotel?.id || '');
  const uploadLogo = useUploadLogo(hotel?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<HotelProfileFormData>({
    resolver: zodResolver(hotelProfileSchema),
    defaultValues: {
      name: '',
      description: '',
      contactEmail: '',
      contactPhone: '',
      website: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
      },
    },
  });

  useEffect(() => {
    if (hotel) {
      form.reset({
        name: hotel.name || '',
        description: hotel.description || '',
        contactEmail: hotel.contactEmail || '',
        contactPhone: hotel.contactPhone || '',
        website: hotel.website || '',
        address: {
          street: hotel.address?.street || '',
          city: hotel.address?.city || '',
          state: hotel.address?.state || '',
          country: hotel.address?.country || '',
          postalCode: hotel.address?.postalCode || '',
        },
      });
    }
  }, [hotel, form]);

  const onSubmit = async (data: HotelProfileFormData) => {
    try {
      await updateHotel.mutateAsync(data);
      toast({
        title: 'Profile Updated',
        description: 'Hotel profile has been saved successfully.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update hotel profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadLogo.mutateAsync(file);
      toast({
        title: 'Logo Updated',
        description: 'Hotel logo has been uploaded successfully.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload logo. Please try again.',
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
        <h1 className="text-2xl font-semibold">Hotel Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your hotel's public information
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hotel Logo</CardTitle>
            <CardDescription>
              Upload your hotel logo. Recommended size: 200x200 pixels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                {hotel?.logoUrl ? (
                  <img
                    src={hotel.logoUrl}
                    alt="Hotel logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">
                    {hotel?.name?.charAt(0) || 'H'}
                  </span>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                >
                  {uploadLogo.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Logo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your hotel's name and description shown to guests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Hotel Name *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Enter hotel name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Describe your hotel..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              How guests can reach you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  {...form.register('contactEmail')}
                  placeholder="contact@hotel.com"
                />
                {form.formState.errors.contactEmail && (
                  <p className="text-sm text-destructive">{form.formState.errors.contactEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  {...form.register('contactPhone')}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...form.register('website')}
                placeholder="https://www.yourhotel.com"
              />
              {form.formState.errors.website && (
                <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>
              Your hotel's physical location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address.street">Street Address</Label>
              <Input
                id="address.street"
                {...form.register('address.street')}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address.city">City</Label>
                <Input
                  id="address.city"
                  {...form.register('address.city')}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address.state">State/Province</Label>
                <Input
                  id="address.state"
                  {...form.register('address.state')}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address.country">Country</Label>
                <Input
                  id="address.country"
                  {...form.register('address.country')}
                  placeholder="Country"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address.postalCode">Postal Code</Label>
                <Input
                  id="address.postalCode"
                  {...form.register('address.postalCode')}
                  placeholder="12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button type="submit" disabled={updateHotel.isPending}>
            {updateHotel.isPending ? (
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
