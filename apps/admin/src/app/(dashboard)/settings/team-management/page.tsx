'use client';

import { useState } from 'react';
import { 
  Users, MoreHorizontal, PenLine, Trash2, 
  ChevronLeft, ChevronRight, UserPlus, 
  Loader2, CheckCircle2, Shield, User as UserIcon,
  X, AlertTriangle, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useMyHotel, useTeamMembers, useAddMember, useUpdateMember, useDeleteMember, useAcceptMember } from '@/lib/hooks';
import { toast } from '@/lib/hooks/use-toast';
import type { User, UserRole, UserStatus } from '@/types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'hotel_owner', label: 'Owner' },
  { value: 'hotel_manager', label: 'Manager' },
  { value: 'hotel_staff', label: 'Staff' },
];

const JOB_TITLES = [
  'General Manager',
  'Manager',
  'Head Concierge',
  'Front Desk',
  'Shift Lead',
  'Staff',
  'Housekeeping Manager',
  'Maintenance Lead'
];

export default function TeamManagementPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const hotelId = hotel?.id || '';

  const { data: members, isLoading: teamLoading } = useTeamMembers(hotelId);
  const addMember = useAddMember(hotelId);
  const updateMember = useUpdateMember(hotelId);
  const deleteMember = useDeleteMember(hotelId);
  const acceptMember = useAcceptMember(hotelId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'hotel_staff' as UserRole,
    jobTitle: 'Staff',
  });

  const isLoading = hotelLoading || teamLoading;

  const handleOpenAdd = () => {
    setFormData({ name: '', email: '', role: 'hotel_staff', jobTitle: 'Staff' });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (member: User) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      jobTitle: member.jobTitle || 'Staff',
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (member: User) => {
    setSelectedMember(member);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = async () => {
    try {
      await addMember.mutateAsync(formData as any);
      toast({ title: 'Member Added', description: `${formData.name} has been added to the team.`, variant: 'success' });
      setIsAddOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to add member.', variant: 'destructive' });
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedMember) return;
    try {
      await updateMember.mutateAsync({
        userId: selectedMember.id,
        data: {
          name: formData.name,
          role: formData.role,
          jobTitle: formData.jobTitle,
        },
      });
      toast({ title: 'Member Updated', description: 'Team member details have been saved.', variant: 'success' });
      setIsEditOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update member.', variant: 'destructive' });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedMember) return;
    try {
      await deleteMember.mutateAsync(selectedMember.id);
      toast({ title: 'Member Removed', description: 'Team member has been removed from the roster.', variant: 'success' });
      setIsDeleteOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to remove member.', variant: 'destructive' });
    }
  };

  const handleAcceptMember = async (userId: string) => {
    try {
      await acceptMember.mutateAsync(userId);
      toast({ title: 'Member Accepted', description: 'The pending request has been approved.', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to approve member.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  // Calculate metrics
  const totalStaff = members?.length || 0;
  const activeNow = members?.filter(m => m.status === 'active').length || 0;
  const pendingRequests = members?.filter(m => m.status === 'inactive' || m.status === 'suspended').length || 0;

  return (
    <div className="font-sans max-w-[1280px] mx-auto pb-12 pt-2">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-2">
        <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight text-gray-900 leading-none mb-2">Team Management</h1>
          <p className="text-[15px] font-medium text-gray-600">Manage your hotel staff and their access levels.</p>
        </div>
        <Button onClick={handleOpenAdd} className="rounded-full px-8 py-6 font-bold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-xl shadow-indigo-500/20">
          <UserPlus className="mr-2 w-5 h-5" />
          Add New Member
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
          const isActive = tab === 'Team Management';
          return (
            <Link key={tab} href={routes[tab] || '#'} className={`text-[14px] font-bold pb-4 transition-colors whitespace-nowrap ${isActive ? 'text-[#1B2541] border-b-2 border-[#1B2541]' : 'text-gray-500 hover:text-gray-900'}`}>
              {tab}
            </Link>
          )
        })}
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#F8FAFC] rounded-[2rem] p-8 ring-1 ring-gray-100 relative">
          <p className="text-[14px] font-bold text-gray-500 mb-2">Total Staff</p>
          <p className="text-[32px] font-bold text-gray-900 leading-none">{totalStaff}</p>
          <div className="absolute top-8 right-8 w-14 h-14 bg-[#E0E7FF] rounded-full flex items-center justify-center text-[#1E293B]">
             <Users className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-[#F8FAFC] rounded-[2rem] p-8 ring-1 ring-gray-100 relative">
          <p className="text-[14px] font-bold text-gray-500 mb-2">Active Now</p>
          <p className="text-[32px] font-bold text-[#059669] leading-none">{activeNow}</p>
          <div className="absolute top-8 right-8 w-14 h-14 bg-[#E0E7FF] rounded-full flex items-center justify-center">
             <div className="w-4 h-4 rounded-full bg-[#059669]"></div>
          </div>
        </div>
        
        <div className="bg-[#F8FAFC] rounded-[2rem] p-8 ring-1 ring-gray-100 relative shadow-sm">
          <p className="text-[14px] font-bold text-gray-500 mb-2">Pending Requests</p>
          <p className="text-[32px] font-bold text-[#6366F1] leading-none">{pendingRequests}</p>
          <div className="absolute top-8 right-8 w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-[#6366F1]">
             <MoreHorizontal className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white ring-1 ring-gray-100 rounded-[2.5rem] overflow-hidden mb-8 shadow-sm min-h-[400px]">
         <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_100px] items-center p-6 px-10 border-b border-gray-50 bg-[#F8FAFC]">
            <span className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase">Name</span>
            <span className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase">Role</span>
            <span className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase">Status</span>
            <span className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase">Member Since</span>
            <span className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase text-right">Actions</span>
         </div>

         <div className="divide-y divide-gray-50">
            {members?.map((member) => (
              <div key={member.id} className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_100px] items-center p-6 px-10 hover:bg-gray-50/50 transition-colors">
                 <div className="flex items-center gap-4">
                   <Avatar className="w-12 h-12 bg-[#1B2541] rounded-full text-white flex items-center justify-center text-[15px] font-bold shadow-sm">
                     <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                   </Avatar>
                   <div>
                     <p className="text-[15px] font-bold text-gray-900 leading-tight mb-1">{member.name}</p>
                     <p className="text-[12px] font-medium text-gray-500 leading-none">{member.email}</p>
                   </div>
                 </div>

                 <div>
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit text-[10px] font-bold px-2 py-0.5 rounded-full ${member.role === 'hotel_owner' ? 'bg-[#1E293B] text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                         {member.role.replace('hotel_', '').toUpperCase()}
                      </span>
                      <span className="text-[12px] font-semibold text-gray-600 ml-1">
                        {member.jobTitle || 'Staff'}
                      </span>
                    </div>
                 </div>

                 <div className="flex items-center gap-2 text-[14px] font-bold text-gray-700">
                    <div className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                 </div>

                 <div className="text-[14px] font-medium text-gray-600">
                    {new Date(member.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                 </div>

                 <div className="flex items-center justify-end gap-2 text-gray-400">
                    {member.status !== 'active' && (
                      <button 
                        onClick={() => handleAcceptMember(member.id)}
                        className="p-2 hover:text-[#059669] hover:bg-emerald-50 rounded-full transition-all"
                        title="Accept Member"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenEdit(member)}
                      className="p-2 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                    >
                      <PenLine className="w-5 h-5"/>
                    </button>
                    <button 
                      onClick={() => handleOpenDelete(member)}
                      className="p-2 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 className="w-5 h-5"/>
                    </button>
                 </div>
              </div>
            ))}
            {(!members || members.length === 0) && (
              <div className="py-20 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-lg">No team members found</p>
                <p className="text-sm">Start by adding your first staff member.</p>
              </div>
            )}
         </div>

         <div className="bg-[#F8FAFC] border-t border-gray-50 p-5 px-10 flex items-center justify-between">
            <span className="text-[13px] font-bold text-gray-500">Showing {members?.length || 0} members</span>
            <div className="flex gap-2">
               <button className="w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-colors cursor-not-allowed opacity-50">
                  <ChevronLeft className="w-5 h-5"/>
               </button>
               <button className="w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-colors cursor-not-allowed opacity-50">
                  <ChevronRight className="w-5 h-5"/>
               </button>
            </div>
         </div>
      </div>

      {/* Bottom Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-[#F8FAFC] rounded-[2.5rem] p-10 ring-1 ring-[#E2E8F0]">
            <h3 className="text-[18px] font-bold text-gray-900 mb-8">Staff Allocation</h3>
            <div className="space-y-8">
               {['Front Desk', 'Housekeeping', 'Management'].map((dept, idx) => {
                 const percentages = [45, 30, 25];
                 const colors = ['bg-[#1E293B]', 'bg-[#8B5CF6]', 'bg-[#047857]'];
                 return (
                   <div key={dept}>
                     <div className="flex justify-between items-end mb-3">
                       <p className="text-[13px] font-medium text-gray-600">{dept}</p>
                       <p className="text-[12px] font-bold text-gray-900">{percentages[idx]}%</p>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-2">
                       <div className={`${colors[idx]} h-2 rounded-full`} style={{ width: `${percentages[idx]}%` }}></div>
                     </div>
                   </div>
                 );
               })}
            </div>
         </div>

         <div className="bg-[#0B1120] rounded-[2.5rem] min-h-[260px] p-10 relative overflow-hidden flex items-end">
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
               <img src="https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Lobby" className="w-full h-full object-cover" />
            </div>
            <div className="relative z-20">
               <p className="text-[11px] font-bold tracking-widest text-[#E2E8F0] uppercase mb-4 opacity-90">Daily Operations Insight</p>
               <h3 className="text-[20px] font-bold text-white leading-snug w-[85%]">
                 Team productivity is up 12% this week after the last concierge training.
               </h3>
            </div>
         </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => { if(!open) { setIsAddOpen(false); setIsEditOpen(false); } }}>
        <DialogContent className="max-w-2xl sm:rounded-[2.5rem] p-8 border-none shadow-2xl bg-white overflow-hidden">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {isAddOpen ? 'Add Team Member' : 'Edit Member Details'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-2 font-medium">
              {isAddOpen 
                ? 'Invite a new staff member to join your hotel management system.' 
                : 'Update the role or job details for this team member.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="bg-[#EEF2FC] border-none text-gray-900 font-semibold py-6 pl-12 pr-5 rounded-[1.25rem] w-full"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    disabled={isEditOpen}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className={`bg-[#EEF2FC] border-none text-gray-900 font-semibold py-6 pl-12 pr-5 rounded-[1.25rem] w-full ${isEditOpen && 'opacity-50'}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">System Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                  <SelectTrigger className="bg-[#EEF2FC] border-none text-gray-900 font-semibold h-14 px-5 rounded-[1.25rem] w-full">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value} className="rounded-xl font-semibold p-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 opacity-50" />
                          {role.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Job Title</Label>
                <Select value={formData.jobTitle} onValueChange={(v) => setFormData({ ...formData, jobTitle: v })}>
                  <SelectTrigger className="bg-[#EEF2FC] border-none text-gray-900 font-semibold h-14 px-5 rounded-[1.25rem] w-full">
                    <SelectValue placeholder="Select Job Title" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                    {JOB_TITLES.map(title => (
                      <SelectItem key={title} value={title} className="rounded-xl font-semibold p-3">
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-10 sm:justify-end gap-3 sm:gap-2">
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="rounded-full px-8 py-6 font-semibold border-gray-200">
              Cancel
            </Button>
            <Button
              onClick={isAddOpen ? handleAddSubmit : handleEditSubmit}
              disabled={!formData.name || !formData.email || addMember.isPending || updateMember.isPending}
              className="rounded-full px-8 py-6 font-semibold bg-[#111827] hover:bg-black text-white shadow-lg shadow-gray-200"
            >
              {(addMember.isPending || updateMember.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAddOpen ? 'Add Member' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-gray-500">
              Are you sure you want to remove <span className="font-bold text-gray-900">{selectedMember?.name}</span>? They will lose all access to the hotel dashboard immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-full px-6 py-5 border-gray-100 font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSubmit}
              className="rounded-full px-6 py-5 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {deleteMember.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Removal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
