'use client';

import { useState } from 'react';
import { Loader2, Plus, MoreHorizontal, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import {
  useMyHotel,
  useGroupedKnowledge,
  useCreateKnowledgeEntry,
  useUpdateKnowledgeEntry,
  useDeleteKnowledgeEntry,
  useToggleKnowledgeEntry,
} from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { KnowledgeEntry, KnowledgeCategory, CreateKnowledgeData } from '@/types';

const categories: { value: KnowledgeCategory; label: string; description: string }[] = [
  { value: 'general', label: 'General', description: 'General hotel information' },
  { value: 'rooms', label: 'Rooms', description: 'Room types and features' },
  { value: 'amenities', label: 'Amenities', description: 'Hotel amenities and services' },
  { value: 'policies', label: 'Policies', description: 'Hotel policies and rules' },
  { value: 'location', label: 'Location', description: 'Location and nearby attractions' },
  { value: 'faq', label: 'FAQ', description: 'Frequently asked questions' },
];

export default function BotPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const { data: groupedKnowledge, isLoading: knowledgeLoading } = useGroupedKnowledge(hotel?.id || '');

  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('general');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<KnowledgeEntry | null>(null);

  const [formData, setFormData] = useState<CreateKnowledgeData>({
    category: 'general',
    question: '',
    answer: '',
    keywords: [],
    priority: 0,
    isActive: true,
  });

  const createEntry = useCreateKnowledgeEntry(hotel?.id || '');
  const updateEntry = useUpdateKnowledgeEntry(hotel?.id || '', editingEntry?.id || '');
  const deleteEntryMutation = useDeleteKnowledgeEntry(hotel?.id || '');
  const toggleEntry = useToggleKnowledgeEntry(hotel?.id || '');

  const isLoading = hotelLoading || knowledgeLoading;

  const entries = groupedKnowledge?.[selectedCategory] || [];

  const handleOpenDialog = (entry?: KnowledgeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        category: entry.category,
        question: entry.question,
        answer: entry.answer,
        keywords: entry.keywords,
        priority: entry.priority,
        isActive: entry.isActive,
      });
    } else {
      setEditingEntry(null);
      setFormData({
        category: selectedCategory,
        question: '',
        answer: '',
        keywords: [],
        priority: 0,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingEntry) {
        await updateEntry.mutateAsync(formData);
        toast({
          title: 'Entry Updated',
          description: 'Knowledge entry has been updated.',
          variant: 'success',
        });
      } else {
        await createEntry.mutateAsync(formData);
        toast({
          title: 'Entry Created',
          description: 'Knowledge entry has been created.',
          variant: 'success',
        });
      }
      setIsDialogOpen(false);
      setEditingEntry(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save entry. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;

    try {
      await deleteEntryMutation.mutateAsync(deleteEntry.id);
      toast({
        title: 'Entry Deleted',
        description: 'Knowledge entry has been deleted.',
        variant: 'success',
      });
      setDeleteEntry(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete entry.',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (entryId: string) => {
    try {
      await toggleEntry.mutateAsync(entryId);
      toast({
        title: 'Status Updated',
        description: 'Entry status has been toggled.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle entry status.',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Bot Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your chatbot's knowledge base
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as KnowledgeCategory)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
              {groupedKnowledge?.[cat.value]?.length ? (
                <Badge variant="secondary" className="ml-2">
                  {groupedKnowledge[cat.value].length}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{cat.label}</CardTitle>
                <CardDescription>{cat.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No entries in this category</p>
                    <p className="text-sm mt-1">Add entries to help your bot answer questions</p>
                    <Button className="mt-4" onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Entry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`border rounded-lg p-4 ${!entry.isActive ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{entry.question}</h4>
                              {!entry.isActive && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {entry.answer}
                            </p>
                            {entry.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {entry.keywords.map((keyword, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggle(entry.id)}>
                                {entry.isActive ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteEntry(entry)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
            </DialogTitle>
            <DialogDescription>
              Add information that your chatbot can use to answer guest questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as KnowledgeCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="question">Question/Topic *</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g., What are your check-in hours?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Answer *</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter the answer or information..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={formData.keywords?.join(', ') || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                  })
                }
                placeholder="e.g., check-in, arrival, time"
              />
              <p className="text-sm text-muted-foreground">
                Keywords help the bot find this entry when guests ask questions.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.question ||
                !formData.answer ||
                createEntry.isPending ||
                updateEntry.isPending
              }
            >
              {(createEntry.isPending || updateEntry.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingEntry ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this knowledge entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEntryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
