'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Shield, Users, Search, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useMyHotel, useUpdateHotel } from '@/lib/hooks';

const hotelDetailsSchema = z.object({
  hotelName: z.string().min(2, 'Name must be at least 2 characters'),
  contactEmail: z.string().email('Invalid email address'),
  address: z.string().min(5, 'Address is required'),
  phoneNumber: z.string().min(5, 'Phone number is required'),
  timezone: z.string().min(2, 'Timezone is required'),
});

type HotelDetailsData = z.infer<typeof hotelDetailsSchema>;

// Mock team data mapped from design image
const mockTeam = [
  { id: 1, name: 'Elena Rodriguez', role: 'General Manager', status: 'ACTIVE', color: 'bg-emerald-400', image: 'https://ui-avatars.com/api/?name=Elena+Rodriguez&background=D1D5DB&color=374151' },
  { id: 2, name: 'Marcus Chen', role: 'Head Concierge', status: 'OFFLINE', color: 'bg-gray-300', image: 'https://ui-avatars.com/api/?name=Marcus+Chen&background=D1D5DB&color=374151' },
  { id: 3, name: 'Sarah Jenkins', role: 'Front Desk Lead', status: 'ACTIVE', color: 'bg-emerald-400', image: 'https://ui-avatars.com/api/?name=Sarah+Jenkins&background=D1D5DB&color=374151' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('General');

  const { user } = useAuthStore();
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const updateHotel = useUpdateHotel();

  const hotelForm = useForm<HotelDetailsData>({
    resolver: zodResolver(hotelDetailsSchema),
    defaultValues: {
      hotelName: '',
      contactEmail: '',
      address: '',
      phoneNumber: '',
      timezone: '',
    },
  });

  useEffect(() => {
    if (hotel) {
      hotelForm.reset({
        hotelName: hotel.name,
        contactEmail: hotel.email,
        address: typeof hotel.address === 'string' ? hotel.address : (hotel.address as any)?.street || '',
        phoneNumber: hotel.phone || '',
        timezone: (hotel.settings as any)?.timezone || 'UTC',
      });
    }
  }, [hotel, hotelForm]);

  const isUpdating = updateHotel.isPending;

  const onSubmit = async (data: HotelDetailsData) => {
    if (!hotel) return;
    
    try {
      await updateHotel.mutateAsync({
        id: hotel.id,
        data: {
          name: data.hotelName,
          email: data.contactEmail,
          phone: data.phoneNumber,
          address: {
            street: data.address,
          } as any,
          settings: {
            timezone: data.timezone,
          } as any
        },
      });
      
      toast({
        title: 'Settings Saved',
        description: 'Hotel details have been updated successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update settings.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  if (!user || hotelLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  return (
    <div className="font-sans max-w-[1280px] mx-auto pb-12 pt-2">
      
      {/* Header Area */}
      <form onSubmit={hotelForm.handleSubmit(onSubmit)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <h1 className="text-[2.25rem] font-bold tracking-tight text-gray-900 leading-none mb-2">
              General Settings
            </h1>
            <p className="text-[15px] font-medium text-gray-600">
              Manage your hotel's core configuration and team access.
            </p>
          </div>

          <Button type="submit" disabled={isUpdating} className="rounded-full px-8 py-6 font-bold bg-[#1B2541] hover:bg-[#0B1120] text-white shadow-xl shadow-[#1B2541]/10">
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-8 border-b border-gray-100 mb-8 overflow-x-auto pb-1">
          {['General', 'Team Management', 'Notifications', 'Billing'].map((tab) => {
            const routes: Record<string, string> = {
              'General': '/settings',
              'Team Management': '/settings/team-management',
              'Notifications': '/settings/notifications',
              'Billing': '/settings/billing'
            };
            const isActive = tab === 'General';
            return (
              <Link
                key={tab}
                href={routes[tab] || '#'}
                className={`text-[14px] font-bold pb-4 transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'text-[#1B2541] border-b-2 border-[#1B2541]' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab}
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
            
            {/* Left Column */}
            <div className="flex flex-col gap-8">
              
              {/* Hotel Details Form */}
              <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100">
                 <h2 className="text-[20px] font-bold text-gray-900 mb-8">Hotel Details</h2>
                 
                 <div className="space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold tracking-widest text-[#4B5563] uppercase mb-2">Hotel Name</label>
                        <Input
                          {...hotelForm.register('hotelName')}
                          className="w-full rounded-full bg-[#F8FAFC] border-none py-6 px-5 text-[15px] font-medium text-gray-900 focus-visible:ring-1 focus-visible:ring-[#1E293B]"
                        />
                        {hotelForm.formState.errors.hotelName && (
                          <p className="text-[12px] font-bold text-red-500 mt-2">{hotelForm.formState.errors.hotelName.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold tracking-widest text-[#4B5563] uppercase mb-2">Contact Email</label>
                        <Input
                          {...hotelForm.register('contactEmail')}
                          type="email"
                          className="w-full rounded-full bg-[#F8FAFC] border-none py-6 px-5 text-[15px] font-medium text-gray-900 focus-visible:ring-1 focus-visible:ring-[#1E293B]"
                        />
                        {hotelForm.formState.errors.contactEmail && (
                          <p className="text-[12px] font-bold text-red-500 mt-2">{hotelForm.formState.errors.contactEmail.message}</p>
                        )}
                      </div>
                   </div>

                   <div>
                      <label className="block text-[11px] font-bold tracking-widest text-[#4B5563] uppercase mb-2">Address</label>
                      <Input
                        {...hotelForm.register('address')}
                        className="w-full rounded-full bg-[#F8FAFC] border-none py-6 px-5 text-[15px] font-medium text-gray-900 focus-visible:ring-1 focus-visible:ring-[#1E293B]"
                      />
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold tracking-widest text-[#4B5563] uppercase mb-2">Phone Number</label>
                        <Input
                          {...hotelForm.register('phoneNumber')}
                          className="w-full rounded-full bg-[#F8FAFC] border-none py-6 px-5 text-[15px] font-medium text-gray-900 focus-visible:ring-1 focus-visible:ring-[#1E293B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold tracking-widest text-[#4B5563] uppercase mb-2">Timezone</label>
                        <Input
                          {...hotelForm.register('timezone')}
                          className="w-full rounded-full bg-[#F8FAFC] border-none py-6 px-5 text-[15px] font-medium text-gray-900 focus-visible:ring-1 focus-visible:ring-[#1E293B]"
                        />
                      </div>
                   </div>
                 </div>
              </div>

              {/* AI Assistant Health Insight */}
              <div className="bg-[#1B2541] rounded-[2.5rem] p-10 relative overflow-hidden text-white shadow-xl shadow-[#1B2541]/10">
                 
                 <div className="relative z-10 flex flex-col items-start">
                   <h2 className="text-[20px] font-bold mb-3 tracking-wide">AI Assistant Health</h2>
                   <p className="text-[#94A3B8] font-medium text-[15px] leading-relaxed max-w-[80%] mb-8">
                     Your automated concierge is currently handling 84% of guest inquiries with a 4.9/5 satisfaction rating.
                   </p>
                   <Button type="button" variant="outline" className="rounded-full px-8 py-6 font-bold border-white text-gray-900 bg-white hover:bg-gray-100 border-2">
                     View Analytics
                   </Button>
                 </div>
                 
                 {/* Decorative background bot icon */}
                 <div className="absolute -bottom-4 right-6 text-white/5 pointer-events-none">
                    <Bot className="w-48 h-48" />
                 </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-8">
              
              {/* Team Management */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-[18px] font-bold text-gray-900">Team Management</h2>
                   <button type="button" className="text-[13px] font-bold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1">
                     <Users className="w-3.5 h-3.5" />
                     Add New Member
                   </button>
                 </div>

                 <div className="relative mb-6">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                     type="text" 
                     placeholder="Search staff..." 
                     className="w-full bg-[#F8FAFC] border border-gray-100 rounded-full py-3.5 pl-11 pr-5 text-[14px] font-medium placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1E293B]"
                   />
                 </div>

                 <div className="flex flex-col gap-2">
                   {mockTeam.map((member) => (
                     <div key={member.id} className="flex items-center justify-between p-3 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-2xl transition-colors">
                        <div className="flex items-center gap-4">
                           <img src={member.image} alt={member.name} className="w-11 h-11 rounded-full object-cover shadow-sm border border-gray-100" />
                           <div>
                             <p className="text-[14px] font-bold text-gray-900">{member.name}</p>
                             <p className="text-[12px] font-medium text-gray-500">{member.role}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <div className={`w-2 h-2 rounded-full ${member.color}`}></div>
                           <span className="text-[10px] font-bold tracking-widest text-[#4B5563] uppercase">
                             {member.status}
                           </span>
                        </div>
                     </div>
                   ))}
                 </div>

                 <div className="mt-4 pt-4 border-t border-gray-100">
                    <button type="button" className="w-full py-2 text-[13px] font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                      View All 14 Team Members
                    </button>
                 </div>
              </div>

              {/* Security Logs */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 relative overflow-hidden">
                 {/* Decorative background blur */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#E0E7FF] opacity-30 blur-[40px] rounded-full pointer-events-none"></div>

                 <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-gray-100 flex items-center justify-center text-[#4F46E5]">
                     <Shield className="w-5 h-5" />
                   </div>
                   <h2 className="text-[18px] font-bold text-gray-900">Security Logs</h2>
                 </div>

                 <p className="text-[13px] font-medium text-gray-600 mb-6 relative z-10 leading-relaxed pr-4">
                   Last login: <span className="font-bold text-gray-900">Today, 08:42 AM</span> from IP 192.168.1.45
                 </p>

                 <Button type="button" variant="outline" className="w-full rounded-full py-6 font-bold border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm relative z-10">
                   Review Activity
                 </Button>
              </div>

            </div>
          </div>
      </form>
    </div>
  );
}
