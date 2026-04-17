'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, Plus, Zap, FileText, UtensilsCrossed, Upload,
  Sparkles, ArrowRight, X, Link as LinkIcon, CheckCircle2, Clock,
} from 'lucide-react';
import {
  useMyHotel,
  useGroupedKnowledge,
  useCreateKnowledgeEntry,
  useUpdateKnowledgeEntry,
} from '@/lib/hooks';
import { useWidgetColor } from '@/lib/context/WidgetColorContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from '@/lib/hooks/use-toast';
import type { KnowledgeEntry, KnowledgeCategory, CreateKnowledgeData } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PdfEntry {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  type: 'pdf';
  description: string;
}

interface ScrapedSource {
  id: string;
  url: string;
  title: string;
  status: 'indexed' | 'scraping' | 'failed';
}

// ─── Constants ────────────────────────────────────────────────────────────────
const KNOWLEDGE_KEY = 'ai_knowledge_base';
const SCRAPER_KEY = 'scraped_sources';
const CONFIG_KEY = 'ai_bot_config';

const ALL_INTERCEPTS = [
  { guest: 'Marcus Sterling', intent: 'Late Checkout Request', conf: 98, status: 'Resolved', initials: 'MS', color: 'bg-gray-400' },
  { guest: 'Elena Petrov', intent: 'Spa Booking Inquiry', conf: 84, status: 'Auto-Handoff', initials: 'EP', color: 'bg-[#9881F3]' },
  { guest: 'Jason Reed', intent: 'Complaint: AC Noise', conf: 42, status: 'Needs Human', initials: 'JR', color: 'bg-red-400' },
  { guest: 'Emma Watson', intent: 'Spa Booking', conf: 95, status: 'Resolved', initials: 'EW', color: 'bg-gray-400' },
  { guest: 'Daniel Kim', intent: 'Airport Transfer', conf: 92, status: 'Escalated', initials: 'DK', color: 'bg-red-400' },
  { guest: 'Olivia Brown', intent: 'Room Service Menu', conf: 96, status: 'Resolved', initials: 'OB', color: 'bg-gray-400' },
];

const PROCESSING_STAGES = ['Uploading document', 'Extracting text', 'Creating embeddings', 'Indexing knowledge'];
const TRAINING_STAGES = [
  'Collecting hotel knowledge...',
  'Cleaning text data...',
  'Generating embeddings...',
  'Updating AI memory...',
  'Deploying model...',
];

const categories: { value: KnowledgeCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'policies', label: 'Policies' },
  { value: 'location', label: 'Location' },
  { value: 'faq', label: 'FAQ' },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function getConfidence(sourceCount: number): number {
  if (sourceCount === 0) return 70;
  if (sourceCount <= 2) return 85;
  if (sourceCount <= 4) return 92;
  return 95;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BotPage() {
  const { data: hotel, isLoading: hotelLoading } = useMyHotel();
  const { data: groupedKnowledge, isLoading: knowledgeLoading } = useGroupedKnowledge(hotel?.id || '');

  // ── Dialog state ──
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('general');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [formData, setFormData] = useState<CreateKnowledgeData>({
    category: 'general', question: '', answer: '', keywords: [], priority: 0, isActive: true,
  });

  const createEntry = useCreateKnowledgeEntry(hotel?.id || '');
  const updateEntry = useUpdateKnowledgeEntry(hotel?.id || '', editingEntry?.id || '');
  const isLoading = hotelLoading || knowledgeLoading;

  // ── Widget brand colors from shared context ──
  const { primaryColor, secondaryColor } = useWidgetColor();

  // ── Knowledge base (PDF) ──
  const [pdfs, setPdfs] = useState<PdfEntry[]>([]);
  const [processingPdf, setProcessingPdf] = useState<string | null>(null);
  const [processStage, setProcessStage] = useState(0);
  const [processProgress, setProcessProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Scraper ──
  const [scrapedSources, setScrapedSources] = useState<ScrapedSource[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  // ── Retrain ──
  const [isRetraining, setIsRetraining] = useState(false);
  const [trainingStage, setTrainingStage] = useState(0);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainSuccess, setTrainSuccess] = useState(false);

  // ── Provider routing ──
  const [primaryOn, setPrimaryOn] = useState(true);
  const [standbyOn, setStandbyOn] = useState(false);
  const [latency, setLatency] = useState('1.2s avg');

  // ── Intercepts ──
  const [interceptPage, setInterceptPage] = useState(0);
  const recentIntercepts = ALL_INTERCEPTS.slice(interceptPage * 3, interceptPage * 3 + 3);

  // ─── Load from localStorage on mount ─────────────────────────────────────
  useEffect(() => {
    setPdfs(loadFromStorage<PdfEntry[]>(KNOWLEDGE_KEY, []));
    setScrapedSources(loadFromStorage<ScrapedSource[]>(SCRAPER_KEY, []));
    const cfg = loadFromStorage<{ primaryOn: boolean; standbyOn: boolean }>(CONFIG_KEY, { primaryOn: true, standbyOn: false });
    setPrimaryOn(cfg.primaryOn);
    setStandbyOn(cfg.standbyOn);
  }, []);

  // ─── Rotate intercepts every 6s ──────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setInterceptPage(p => (p + 1) % 2);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  // ─── Animate latency every 4s ─────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const val = (0.8 + Math.random() * 0.8).toFixed(1);
      setLatency(`${val}s avg`);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // ─── Save provider config ─────────────────────────────────────────────────
  useEffect(() => {
    saveToStorage(CONFIG_KEY, { primaryOn, standbyOn });
  }, [primaryOn, standbyOn]);

  // ─── Total sources for confidence ────────────────────────────────────────
  const totalSources = pdfs.length + scrapedSources.filter(s => s.status === 'indexed').length;
  const confidence = getConfidence(totalSources);
  const totalEntries = groupedKnowledge
    ? Object.values(groupedKnowledge).reduce((acc, curr) => acc + curr.length, 0)
    : 0;

  // ─── PDF Upload logic ─────────────────────────────────────────────────────
  const processPdf = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid File', description: 'Only PDF files are accepted.', variant: 'destructive' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Maximum file size is 50MB.', variant: 'destructive' });
      return;
    }

    const id = `pdf_${Date.now()}`;
    const name = file.name;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + 'MB';
    const description = name.replace('.pdf', '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    setProcessingPdf(name);
    setProcessStage(0);
    setProcessProgress(0);

    // Simulate processing stages
    for (let stage = 0; stage < PROCESSING_STAGES.length; stage++) {
      setProcessStage(stage);
      for (let p = 0; p <= 100; p += 10) {
        setProcessProgress(p);
        await new Promise(r => setTimeout(r, 80));
      }
    }

    const entry: PdfEntry = {
      id,
      name,
      size: sizeMB,
      uploadDate: new Date().toISOString().split('T')[0],
      type: 'pdf',
      description,
    };

    setPdfs(prev => {
      const updated = [...prev, entry];
      saveToStorage(KNOWLEDGE_KEY, updated);
      return updated;
    });

    setProcessingPdf(null);
    setProcessProgress(0);
    toast({ title: 'Knowledge Indexed', description: `"${name}" has been embedded into the AI.`, variant: 'success' });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void processPdf(file);
  }, [processPdf]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processPdf(file);
    e.target.value = '';
  };

  const removePdf = (id: string) => {
    setPdfs(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveToStorage(KNOWLEDGE_KEY, updated);
      return updated;
    });
  };

  // ─── Scraper logic ────────────────────────────────────────────────────────
  const handleAddUrl = async () => {
    const url = newUrl.trim();
    if (!url) return;

    const id = `src_${Date.now()}`;
    const entry: ScrapedSource = { id, url, title: '', status: 'scraping' };

    setScrapedSources(prev => {
      const updated = [...prev, entry];
      saveToStorage(SCRAPER_KEY, updated);
      return updated;
    });
    setNewUrl('');
    setShowUrlInput(false);
    setScrapingId(id);

    // Simulate scraping
    await new Promise(r => setTimeout(r, 2500));

    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
    const path = url.split('/').pop() || '';
    const title = path
      ? path.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ` – ${domain}`
      : `Homepage – ${domain}`;

    setScrapedSources(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, title, status: 'indexed' as const } : s);
      saveToStorage(SCRAPER_KEY, updated);
      return updated;
    });
    setScrapingId(null);
    toast({ title: 'Source Indexed', description: `Content from "${url}" has been scraped.`, variant: 'success' });
  };

  const removeSource = (id: string) => {
    setScrapedSources(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveToStorage(SCRAPER_KEY, updated);
      return updated;
    });
  };

  // ─── Retrain logic ────────────────────────────────────────────────────────
  const handleRetrain = async () => {
    if (isRetraining) return;
    setIsRetraining(true);
    setTrainSuccess(false);
    setTrainingStage(0);
    setTrainingProgress(0);

    for (let stage = 0; stage < TRAINING_STAGES.length; stage++) {
      setTrainingStage(stage);
      for (let p = 0; p <= 100; p += 5) {
        setTrainingProgress(p);
        await new Promise(r => setTimeout(r, stage === TRAINING_STAGES.length - 1 ? 60 : 100));
      }
    }

    setIsRetraining(false);
    setTrainSuccess(true);
    toast({ title: 'AI Concierge Retrained', description: 'AI Concierge successfully retrained.', variant: 'success' });
    setTimeout(() => setTrainSuccess(false), 4000);
  };

  // ─── Dialog logic ─────────────────────────────────────────────────────────
  const handleOpenDialog = (entry?: KnowledgeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({ category: entry.category, question: entry.question, answer: entry.answer, keywords: entry.keywords, priority: entry.priority, isActive: entry.isActive });
    } else {
      setEditingEntry(null);
      setFormData({ category: selectedCategory, question: '', answer: '', keywords: [], priority: 0, isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingEntry) {
        await updateEntry.mutateAsync(formData);
        toast({ title: 'Entry Updated', description: 'Knowledge entry has been updated.', variant: 'success' });
      } else {
        await createEntry.mutateAsync(formData);
        toast({ title: 'Entry Created', description: 'Knowledge entry has been created.', variant: 'success' });
      }
      setIsDialogOpen(false);
      setEditingEntry(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to save entry.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#7E42FF]" />
      </div>
    );
  }

  return (
    <div className="pb-10 font-sans max-w-[1400px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center items-start gap-4 mb-8 mt-2">
        <div>
          <h1 className="text-[2rem] font-bold tracking-tight text-gray-900 leading-tight">AI Agent Control</h1>
          <p className="mt-1.5 text-[15px] font-medium text-gray-600 max-w-2xl">
            Fine-tune your digital concierge's knowledge, manage LLM providers, and audit automated interactions.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleRetrain}
          disabled={isRetraining}
          className="rounded-full px-8 py-6 font-bold bg-[#334155] hover:bg-[#1E293B] text-white shadow-xl shadow-slate-900/10 transition-all shrink-0 mt-4 sm:mt-0"
        >
          {isRetraining
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : trainSuccess
            ? <CheckCircle2 className="mr-2 h-4 w-4 fill-emerald-400 text-emerald-400" />
            : <Zap className="mr-2 h-4 w-4 fill-white" />}
          {isRetraining ? TRAINING_STAGES[trainingStage] : trainSuccess ? 'Retrained!' : 'Retrain Model'}
        </Button>
      </div>

      {/* Retrain progress bar */}
      {isRetraining && (
        <div className="mb-6 bg-[#EEF2FC] rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[#5A6A8C]">Stage {trainingStage + 1}/{TRAINING_STAGES.length}: {TRAINING_STAGES[trainingStage]}</span>
            <span className="text-xs font-bold text-gray-800">{trainingProgress}%</span>
          </div>
          <div className="h-2 w-full bg-[#E2E8F5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1C2541] rounded-full transition-all duration-100"
              style={{ width: `${(trainingStage / TRAINING_STAGES.length) * 100 + trainingProgress / TRAINING_STAGES.length}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Grid: Knowledge Base & Provider Routing */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Knowledge Base */}
        <div className="bg-[#EEF2FC] rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[22px] font-bold text-gray-800">Knowledge Base</h2>
            <span className="text-[10px] font-bold tracking-widest text-[#7988A8] uppercase">
              {totalEntries > 0 ? `${totalEntries} ENTRIES SYNCED` : totalSources > 0 ? `${totalSources} SOURCES` : '84% SYNCED'}
            </span>
          </div>

          {/* Uploaded PDFs display */}
          {pdfs.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {pdfs.slice(0, 4).map(pdf => (
                <div key={pdf.id} className="bg-[#E2E8F5] p-5 rounded-[1.5rem] flex flex-col justify-between min-h-[120px] relative group">
                  <button
                    type="button"
                    onClick={() => removePdf(pdf.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-[#7E42FF]/10 flex items-center justify-center mb-auto">
                    <FileText className="w-4 h-4 text-[#7E42FF]" />
                  </div>
                  <p className="text-[11px] font-semibold text-[#5A6A8C] mt-4 leading-relaxed pr-2 tracking-wide line-clamp-2">
                    {pdf.description}
                  </p>
                  <p className="text-[9px] text-[#8699C2] font-bold mt-1 tracking-wide">{pdf.size}</p>
                </div>
              ))}
            </div>
          )}

          {/* Default cards when no PDFs */}
          {pdfs.length === 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#E2E8F5] p-5 rounded-[1.5rem] flex flex-col justify-between min-h-[140px]">
                <div className="w-8 h-8 rounded-full bg-[#7E42FF]/10 flex items-center justify-center mb-auto">
                  <FileText className="w-4 h-4 text-[#7E42FF]" />
                </div>
                <p className="text-[11px] font-semibold text-[#5A6A8C] mt-4 leading-relaxed pr-2 tracking-wide">
                  Cancellation, pets, and check-in times.
                </p>
              </div>
              <div className="bg-[#E2E8F5] p-5 rounded-[1.5rem] flex flex-col justify-between min-h-[140px]">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center mb-auto">
                  <UtensilsCrossed className="w-4 h-4 text-white" />
                </div>
                <p className="text-[11px] font-semibold text-[#5A6A8C] mt-4 leading-relaxed pr-2 tracking-wide">
                  Menu PDFs and spa operating hours.
                </p>
              </div>
            </div>
          )}

          {/* Processing progress */}
          {processingPdf && (
            <div className="mb-4 bg-[#E2E8F5] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-[#5A6A8C] truncate max-w-[60%]">{PROCESSING_STAGES[processStage]}</span>
                <span className="text-[10px] font-bold text-gray-800">{processProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7E42FF] rounded-full transition-all duration-75"
                  style={{ width: `${processProgress}%` }}
                />
              </div>
              <p className="text-[9px] text-[#8699C2] font-semibold mt-1.5 truncate">{processingPdf}</p>
            </div>
          )}

          {/* Drop zone */}
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          <div
            ref={dropRef}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-[2.5px] border-dashed transition-colors rounded-[2rem] p-6 flex flex-col items-center justify-center cursor-pointer min-h-[110px] ${isDragging ? 'border-[#7E42FF] bg-[#7E42FF]/5' : 'border-white bg-white/40 hover:bg-white/60'}`}
          >
            <Upload className="w-5 h-5 text-[#1C2541] mb-2" strokeWidth={2.5} />
            <p className="text-sm font-bold text-[#8699C2]">Drop FAQ files or PDFs here</p>
            <p className="text-[8px] font-bold tracking-widest text-[#9BA8C4] uppercase mt-1.5">Maximum file size: 50MB</p>
          </div>

          {/* Scraped URL sources */}
          {scrapedSources.length > 0 && (
            <div className="mt-4 space-y-2">
              {scrapedSources.map(src => (
                <div key={src.id} className="flex items-center justify-between bg-[#E2E8F5] rounded-2xl px-4 py-3 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${src.status === 'indexed' ? 'bg-emerald-400' : src.status === 'scraping' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-gray-800 truncate">{src.title || src.url}</p>
                      <p className="text-[9px] text-[#8699C2] font-semibold truncate">{src.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {src.id === scrapingId && <Loader2 className="w-3 h-3 animate-spin text-[#7E42FF]" />}
                    <button
                      type="button"
                      onClick={() => removeSource(src.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* URL input for scraper */}
          <div className="mt-4">
            {showUrlInput ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleAddUrl(); if (e.key === 'Escape') setShowUrlInput(false); }}
                  placeholder="https://yourhotel.com/spa"
                  className="flex-1 bg-white border border-[#C8D4F0] rounded-full px-4 py-2 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#7E42FF]/30"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void handleAddUrl()}
                  className="px-4 py-2 bg-[#1C2541] text-white text-xs font-bold rounded-full hover:bg-black transition-colors"
                >
                  Scrape
                </button>
                <button type="button" onClick={() => setShowUrlInput(false)} className="p-2 text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowUrlInput(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#7E42FF] hover:text-[#5c2bc7] transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Add URL Source
              </button>
            )}
          </div>
        </div>

        {/* Provider Routing */}
        <div className="bg-[#EEF2FC] rounded-[2.5rem] p-8 shadow-sm flex flex-col">
          <h2 className="text-[22px] font-bold text-gray-800 mb-8">Provider Routing</h2>

          <div className="space-y-4 mb-auto">
            {/* Primary toggle */}
            <div className={`bg-[#E2E8F5] p-2.5 pr-4 pl-4 rounded-full flex items-center justify-between ${!primaryOn && 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <div className="w-4 h-4 bg-emerald-400 rounded-lg" />
                </div>
                <span className="text-[10px] font-bold tracking-widest text-[#5A6A8C] uppercase">Primary</span>
              </div>
              <button
                type="button"
                onClick={() => setPrimaryOn(v => !v)}
                className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${primaryOn ? 'bg-[#1C2541]' : 'bg-white/50'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${primaryOn ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Standby toggle */}
            <div className={`bg-[#E2E8F5] p-2.5 pr-4 pl-4 rounded-full flex items-center justify-between ${!standbyOn && 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-[#9881F3]" fill="currentColor" />
                </div>
                <span className="text-[10px] font-bold tracking-widest text-[#5A6A8C] uppercase">Standby</span>
              </div>
              <button
                type="button"
                onClick={() => setStandbyOn(v => !v)}
                className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${standbyOn ? 'bg-[#1C2541]' : 'bg-white/50'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${standbyOn ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Latency */}
          <div className="mt-8 pt-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-semibold text-[#5A6A8C]">Latency</span>
              <span className="text-sm font-bold text-gray-900 transition-all">{latency}</span>
            </div>
            <div className="h-2 w-full bg-[#E2E8F5] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1C2541] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, parseFloat(latency) * 60)}%` }}
              />
            </div>
          </div>

          {/* AI Confidence */}
          <div className="mt-6 pt-4 border-t border-white/40">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-semibold text-[#5A6A8C]">AI Confidence</span>
              <span className="text-sm font-bold text-gray-900">{confidence}%</span>
            </div>
            <div className="h-2 w-full bg-[#E2E8F5] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7E42FF] rounded-full transition-all duration-700"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <p className="text-[9px] font-bold tracking-wide text-[#8699C2] uppercase mt-2">
              {totalSources} source{totalSources !== 1 ? 's' : ''} indexed
            </p>
          </div>
        </div>
      </div>

      {/* Recent Intercepts */}
      <div className="relative">
        <div className="bg-[#EEF2FC] rounded-[2.5rem] mt-6 p-8 shadow-sm">
          <div className="mb-6 border-b border-white/40 pb-6 flex justify-between items-center relative">
            <div>
              <h2 className="text-[22px] font-bold text-gray-800">Recent Intercepts</h2>
              <p className="text-[10px] font-bold tracking-widest text-[#7988A8] uppercase mt-1.5">
                Auditing last 24 hours of guest traffic
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-10 h-10 rounded-full bg-[#E2E8F5]" />
              <div className="w-10 h-10 rounded-full bg-[#E2E8F5]" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pb-4 text-[10px] font-bold tracking-widest text-[#7988A8] uppercase w-[25%] px-4">Guest</th>
                  <th className="pb-4 text-[10px] font-bold tracking-widest text-[#7988A8] uppercase w-[30%] px-4">Intent</th>
                  <th className="pb-4 text-[10px] font-bold tracking-widest text-[#7988A8] uppercase w-[15%] px-4 text-center">AI Confidence</th>
                  <th className="pb-4 text-[10px] font-bold tracking-widest text-[#7988A8] uppercase w-[15%] px-4">Status</th>
                  <th className="pb-4 text-[10px] font-bold tracking-widest text-[#7988A8] uppercase w-[15%] px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="bg-[#E6ECFA] rounded-2xl">
                {recentIntercepts.map((intercept, idx) => (
                  <tr key={`${interceptPage}-${idx}`} className="group">
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className={'w-8 h-8 rounded-full ' + intercept.color + ' text-white flex items-center justify-center text-[10px] font-bold shadow-sm'}>
                          {intercept.initials}
                        </div>
                        <span className="text-xs font-semibold text-[#8699C2] group-hover:text-gray-800 transition-colors">{intercept.guest}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span className="text-xs font-semibold text-[#5A6A8C]">{intercept.intent}</span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-1.5 bg-white/50 rounded-full overflow-hidden">
                          <div
                            className={'h-full rounded-full ' + (intercept.color === 'bg-[#9881F3]' ? 'bg-[#9881F3]' : intercept.color === 'bg-red-400' ? 'bg-red-500' : 'bg-gray-800')}
                            style={{ width: intercept.conf + '%' }}
                          />
                        </div>
                        <span className={'text-[10px] font-bold ' + (intercept.conf > 90 ? 'text-gray-800' : intercept.conf > 50 ? 'text-[#9881F3]' : 'text-red-500')}>
                          {intercept.conf}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className={'w-1.5 h-1.5 rounded-full ' + (intercept.color === 'bg-[#9881F3]' ? 'bg-[#9881F3]' : intercept.color === 'bg-red-400' ? 'bg-red-500' : 'bg-gray-800')} />
                        <span className={'text-xs font-bold ' + (intercept.color === 'bg-[#9881F3]' ? 'text-[#9881F3]' : intercept.color === 'bg-red-400' ? 'text-red-500' : 'text-gray-800')}>
                          {intercept.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle text-right">
                      <button className="text-[10px] font-bold text-[#7E42FF] hover:text-[#5c2bc7] transition-colors tracking-wide bg-white/50 px-3 py-1.5 rounded-full hover:bg-white shadow-sm mr-6">
                        Review Transcript
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center pt-2">
            <button
              onClick={() => setInterceptPage(p => (p + 1) % 2)}
              className="text-[10px] font-bold tracking-[0.2em] text-[#5A6A8C] hover:text-gray-900 transition-colors uppercase flex items-center gap-2 mx-auto"
            >
              <Clock className="w-3 h-3" />
              Load Older Conversations
            </button>
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => handleOpenDialog(undefined)}
          title="Add New Knowledge Entry"
          className="absolute right-0 top-1/2 -mt-4 w-14 h-14 bg-[#51597B] hover:bg-[#3E4562] transition-colors rounded-full flex items-center justify-center shadow-xl shadow-[#51597B]/30 hover:scale-105 transform translate-x-1/3"
        >
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* Bottom Row - Insights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">

        {/* Live Widget Brand Preview — reads from WidgetColorContext */}
        <div
          className="rounded-[2.5rem] p-8 shadow-sm flex flex-col relative overflow-hidden group col-span-1"
          style={{ background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${primaryColor}99 100%)` }}
        >
          {/* Mini chat preview */}
          <div className="w-full bg-white/15 backdrop-blur-sm rounded-2xl p-4 mb-auto">
            {/* Bot header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shadow-inner shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <Sparkles className="w-3 h-3 text-white" fill="currentColor" />
              </div>
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">{hotel?.name || 'AI Concierge'}</span>
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {/* Sample messages */}
            <div className="space-y-2">
              <div
                className="text-[10px] font-medium text-white/90 p-2 rounded-xl rounded-tl-sm w-[80%]"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                Welcome! How can I assist?
              </div>
              <div className="flex justify-end">
                <div
                  className="text-[10px] font-medium text-white p-2 rounded-xl rounded-tr-sm max-w-[75%]"
                  style={{ backgroundColor: secondaryColor + 'aa' }}
                >
                  What's the check-out time?
                </div>
              </div>
            </div>
          </div>

          {/* Color swatches */}
          <div className="flex gap-2 mt-4 items-center">
            <div className="w-5 h-5 rounded-full border-2 border-white/40 shadow-sm" style={{ backgroundColor: primaryColor }} title="Primary" />
            <div className="w-5 h-5 rounded-full border-2 border-white/40 shadow-sm" style={{ backgroundColor: secondaryColor }} title="Secondary" />
            <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest ml-1">Brand Colors</span>
          </div>

          <Link
            href="/hotel"
            className="mt-5 flex items-center gap-2 text-[11px] font-bold text-white/80 uppercase tracking-widest group-hover:text-white transition-colors"
          >
            Customize Colors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-[#EEF2FC] rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
          <h3 className="text-[10px] font-bold tracking-widest text-[#7988A8] uppercase">Resolution Rate</h3>
          <div className="my-8">
            <span className="text-[48px] font-normal text-[#DEDCE9] select-none block leading-none">{confidence > 90 ? '94.1%' : '87.3%'}</span>
          </div>
          <p className="text-[9px] font-bold tracking-widest text-gray-800 uppercase flex items-center gap-1">
            <span className="text-lg leading-none mt-[-5px]">↗</span> +3.1% this week
          </p>
        </div>

        <div className="bg-[#EEF2FC] rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
          <h3 className="text-[10px] font-bold tracking-widest text-[#7988A8] uppercase">Top FAQ</h3>
          <div className="my-8">
            <span className="text-[32px] font-normal text-[#DEDCE9] select-none block leading-[1.1]">Check-out <br />hours</span>
          </div>
          <p className="text-[9px] font-bold tracking-widest text-gray-600 uppercase">1,204 queries handled</p>
        </div>

        <div className="bg-[#EEF2FC] rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
          <h3 className="text-[10px] font-bold tracking-widest text-[#7988A8] uppercase">AI Savings</h3>
          <div className="my-8">
            <span className="text-[48px] font-normal text-[#DEDCE9] select-none block leading-none">42h</span>
          </div>
          <p className="text-[9px] font-bold tracking-widest text-gray-600 uppercase">Human hours reclaimed</p>
        </div>
      </div>

      {/* Knowledge Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl sm:rounded-[2.5rem] p-8 border-none shadow-2xl bg-white overflow-hidden">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {editingEntry ? 'Edit Knowledge Entry' : 'Manual Knowledge Entry'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-2 font-medium">
              Manually add Q&A entries to override or supplement the automated document sync.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="category" className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v as KnowledgeCategory })}>
                <SelectTrigger className="bg-[#EEF2FC] border-none text-gray-900 font-semibold py-6 px-5 rounded-[1.25rem] w-full focus:ring-2 focus:ring-[#7E42FF]/30">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-xl p-2">
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="rounded-xl font-semibold cursor-pointer py-2.5 focus:bg-[#EEF2FC]">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="question" className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Question / Topic *</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={e => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g., What are your check-in hours?"
                className="bg-[#EEF2FC] border-none text-gray-900 font-semibold py-6 px-5 rounded-[1.25rem] w-full"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="answer" className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Bot Answer *</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={e => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter the detailed information..."
                rows={5}
                className="bg-[#EEF2FC] border-none text-gray-900 font-semibold py-4 px-5 rounded-[1.25rem] w-full resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="keywords" className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Keywords</Label>
              <Input
                id="keywords"
                value={formData.keywords?.join(', ') || ''}
                onChange={e => setFormData({ ...formData, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                placeholder="e.g., check-in, arrival, time"
                className="bg-[#EEF2FC] border-none text-gray-900 font-semibold py-6 px-5 rounded-[1.25rem] w-full"
              />
            </div>
          </div>

          <DialogFooter className="mt-10 sm:justify-end gap-3 sm:gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-full px-8 py-6 font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm sm:w-auto w-full">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.question || !formData.answer || createEntry.isPending || updateEntry.isPending}
              className="rounded-full px-8 py-6 font-semibold bg-[#111827] hover:bg-[#1C2541] text-white shadow-md transition-all sm:w-auto w-full"
            >
              {(createEntry.isPending || updateEntry.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEntry ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
