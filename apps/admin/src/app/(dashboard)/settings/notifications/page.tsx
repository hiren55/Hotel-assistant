'use client';

import {Smartphone, Mail, Moon, Save, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotificationsPage() {
  return (
    <div className="font-sans max-w-[1280px] mx-auto pb-12 pt-2">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-2">
        <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight text-gray-900 leading-none mb-2">
            Notification Settings
          </h1>
          <p className="text-[15px] font-medium text-gray-600">
            Control which automated alerts you receive across your devices.
          </p>
        </div>

        <Button type="button" className="rounded-full px-8 py-6 font-bold bg-[#1B2541] hover:bg-[#0B1120] text-white shadow-xl shadow-[#1B2541]/10">
          <Save className="mr-2 w-5 h-5" />
          Save Preferences
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
          const isActive = tab === 'Notifications';
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
         
         {/* Left Column: Toggles */}
         <div className="bg-white rounded-[2.5rem] p-10 ring-1 ring-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-[20px] font-bold text-gray-900 mb-8">Communication Channels</h2>

            <div className="space-y-8">
               {/* Toggle Item 1 */}
               <div className="flex items-start justify-between pb-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 -mx-10 px-10 transition-colors duration-300">
                  <div className="pr-12">
                     <h3 className="text-[16px] font-bold text-gray-900 mb-1">New Booking Confirmations</h3>
                     <p className="text-[13px] font-medium text-gray-500 leading-relaxed">
                       Receive alerts instantly when a guest confirms a new reservation, including room details.
                     </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-[#E0E7FF] text-[#4F46E5] font-bold text-[12px] group hover:bg-[#4F46E5] hover:text-white transition-colors">
                        <Mail className="w-4 h-4" /> Email
                     </button>
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-[#E0E7FF] text-[#4F46E5] font-bold text-[12px] group hover:bg-[#4F46E5] hover:text-white transition-colors">
                        <Smartphone className="w-4 h-4" /> Push
                     </button>
                  </div>
               </div>

               {/* Toggle Item 2 */}
               <div className="flex items-start justify-between pb-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 -mx-10 px-10 transition-colors duration-300">
                  <div className="pr-12">
                     <h3 className="text-[16px] font-bold text-gray-900 mb-1">Direct Guest Messages</h3>
                     <p className="text-[13px] font-medium text-gray-500 leading-relaxed">
                       Get notified when guests send direct inquiries before or during their stay.
                     </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-gray-100 text-gray-500 font-bold text-[12px] hover:bg-gray-200 transition-colors">
                        <Mail className="w-4 h-4" /> Email
                     </button>
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-[#E0E7FF] text-[#4F46E5] font-bold text-[12px] group hover:bg-[#4F46E5] hover:text-white transition-colors">
                        <Smartphone className="w-4 h-4" /> Push
                     </button>
                  </div>
               </div>

               {/* Toggle Item 3 */}
               <div className="flex items-start justify-between pb-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 -mx-10 px-10 transition-colors duration-300">
                  <div className="pr-12">
                     <h3 className="text-[16px] font-bold text-gray-900 mb-1">Cancellations & Modifications</h3>
                     <p className="text-[13px] font-medium text-gray-500 leading-relaxed">
                       Alerts for when a booking drops off or dates change to manage inventory accurately.
                     </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-[#E0E7FF] text-[#4F46E5] font-bold text-[12px] group hover:bg-[#4F46E5] hover:text-white transition-colors">
                        <Mail className="w-4 h-4" /> Email
                     </button>
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-gray-100 text-gray-500 font-bold text-[12px] hover:bg-gray-200 transition-colors">
                        <Smartphone className="w-4 h-4" /> Push
                     </button>
                  </div>
               </div>

               {/* Toggle Item 4 */}
               <div className="flex items-start justify-between pb-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 -mx-10 px-10 transition-colors duration-300 pt-8 -mt-8">
                  <div className="pr-12">
                     <h3 className="text-[16px] font-bold text-gray-900 mb-1">Nightly AI Analytics Report</h3>
                     <p className="text-[13px] font-medium text-gray-500 leading-relaxed">
                       Receive your AI's summarized daily performance and aggregated guest requests.
                     </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-[#E0E7FF] text-[#4F46E5] font-bold text-[12px] group hover:bg-[#4F46E5] hover:text-white transition-colors">
                        <Mail className="w-4 h-4" /> Email
                     </button>
                     <button className="flex items-center gap-2 p-2 px-4 rounded-full bg-gray-100 text-gray-500 font-bold text-[12px] hover:bg-gray-200 transition-colors">
                        <Smartphone className="w-4 h-4" /> Push
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Right Column: Quiet Hours & Mobile App */}
         <div className="flex flex-col gap-8">
            <div className="bg-[#1E293B] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                       <Moon className="w-5 h-5" />
                    </div>
                    <h2 className="text-[18px] font-bold">Quiet Hours</h2>
                 </div>
                 <p className="text-[14px] text-slate-300 font-medium leading-relaxed mb-6">
                   Schedule periods where non-critical push notifications are muted across all your connected devices simultaneously.
                 </p>
                 <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Current Schedule</p>
                      <p className="text-[14px] font-bold">10:00 PM – 07:00 AM</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                 </div>
               </div>
               
               <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 ring-1 ring-gray-100 shadow-sm flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4">
                 <Smartphone className="w-8 h-8 text-[#4F46E5]" />
               </div>
               <h3 className="text-[16px] font-bold text-gray-900 mb-2">Connect Mobile Device</h3>
               <p className="text-[13px] font-medium text-gray-500 mb-6">
                 Scan your unique secure code to pair your iOS or Android app to this admin profile.
               </p>
               <Button type="button" variant="outline" className="w-full rounded-full py-6 font-bold text-[#1B2541] border-gray-200 shadow-sm">
                 <ExternalLink className="w-4 h-4 mr-2" /> Pair New App
               </Button>
            </div>
         </div>

      </div>
    </div>
  );
}
