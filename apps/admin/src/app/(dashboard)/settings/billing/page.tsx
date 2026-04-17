'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function BillingPage() {

  return (
    <div className="font-sans max-w-[1280px] mx-auto pb-12 pt-2">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-2">
        <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight text-gray-900 leading-none mb-2">
            Billing & Invoices
          </h1>
          <p className="text-[15px] font-medium text-gray-600">
            Securely review your tier allocation and payment methods.
          </p>
        </div>
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
          const isActive = tab === 'Billing';
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
      
      <div className="py-20 text-center">
         <p className="text-gray-400 font-bold">Billing Configuration Screen - Coming Soon</p>
      </div>

    </div>
  );
}
