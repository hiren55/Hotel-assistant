'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Hotel,
    MapPin,
    Globe,
    ExternalLink,
    CheckCircle2,
    Loader2,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Wifi,
    RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

// ============================================
// TYPES
// ============================================

interface DiscoveryResult {
    name: string;
    website: string;
    image: string | null;
    source: string;
    snippet: string;
}

interface ScrapeJobStatus {
    id: string;
    hotelId: string;
    url: string;
    status: string;
    pagesScraped: number;
    entriesFound: number;
    errorMessage?: string;
    completedAt?: string;
    createdAt: string;
}

// ============================================
// STEP INDICATOR
// ============================================

const steps = [
    { id: 1, name: 'Hotel Info', icon: Hotel },
    { id: 2, name: 'Search Results', icon: Search },
    { id: 3, name: 'Import Data', icon: RefreshCw },
    { id: 4, name: 'Complete', icon: CheckCircle2 },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-12">
            {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${isCompleted
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : isActive
                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110'
                                            : 'bg-gray-100 border-gray-300 text-gray-400'
                                    }
                `}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    <Icon className="w-5 h-5" />
                                )}
                            </div>
                            <span
                                className={`mt-2 text-xs font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
                                    }`}
                            >
                                {step.name}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={`w-16 h-0.5 mx-2 mt-[-1rem] transition-all duration-500 ${step.id < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// SOURCE BADGE
// ============================================

function SourceBadge({ source }: { source: string }) {
    const colorMap: Record<string, string> = {
        Official: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Booking.com': 'bg-blue-100 text-blue-700 border-blue-200',
        TripAdvisor: 'bg-green-100 text-green-700 border-green-200',
        Agoda: 'bg-red-100 text-red-700 border-red-200',
        'Google Maps': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Google Travel': 'bg-orange-100 text-orange-700 border-orange-200',
        Expedia: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };

    const classes = colorMap[source] || 'bg-gray-100 text-gray-700 border-gray-200';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
            {source}
        </span>
    );
}

// ============================================
// SCRAPING PROGRESS
// ============================================

const scrapeStages = [
    { status: 'pending', label: 'Preparing to scrape...', icon: '⏳' },
    { status: 'crawling', label: 'Crawling hotel website...', icon: '🌐' },
    { status: 'searching', label: 'Searching for additional info...', icon: '🔍' },
    { status: 'extracting', label: 'Extracting hotel information...', icon: '🤖' },
    { status: 'importing', label: 'Setting up your dashboard...', icon: '📥' },
    { status: 'completed', label: 'All done!', icon: '✅' },
];

function ScrapeProgress({ status, pagesScraped, entriesFound }: {
    status: string;
    pagesScraped: number;
    entriesFound: number;
}) {
    const currentIndex = scrapeStages.findIndex(s => s.status === status);

    return (
        <div className="space-y-4">
            {scrapeStages.map((stage, index) => {
                const isActive = stage.status === status;
                const isCompleted = index < currentIndex;
                const isPending = index > currentIndex;

                return (
                    <div
                        key={stage.status}
                        className={`
              flex items-center gap-4 p-4 rounded-xl transition-all duration-500
              ${isActive
                                ? 'bg-primary/5 border border-primary/20 shadow-sm'
                                : isCompleted
                                    ? 'bg-emerald-50 border border-emerald-100'
                                    : 'bg-gray-50 border border-gray-100 opacity-50'
                            }
            `}
                    >
                        <span className="text-2xl">{stage.icon}</span>
                        <div className="flex-1">
                            <p className={`font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-emerald-700' : 'text-gray-400'}`}>
                                {stage.label}
                            </p>
                            {isActive && stage.status === 'crawling' && pagesScraped > 0 && (
                                <p className="text-sm text-gray-500 mt-1">{pagesScraped} pages scraped</p>
                            )}
                            {isActive && stage.status === 'extracting' && entriesFound > 0 && (
                                <p className="text-sm text-gray-500 mt-1">{entriesFound} data entries found</p>
                            )}
                        </div>
                        {isActive && !isPending && status !== 'completed' && (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        )}
                        {isCompleted && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// SKELETON CARDS
// ============================================

function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
            <div className="w-full h-40 bg-gray-200 rounded-xl mb-4" />
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
    );
}

// ============================================
// MAIN ONBOARDING PAGE
// ============================================

export default function OnboardingPage() {
    const router = useRouter();
    const { user, isAuthenticated, isInitialized, initializeAuth } = useAuthStore();

    const [currentStep, setCurrentStep] = useState(1);
    const [hotelName, setHotelName] = useState('');
    const [city, setCity] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [scrapeJobId, setScrapeJobId] = useState<string | null>(null);
    const [scrapeStatus, setScrapeStatus] = useState<ScrapeJobStatus | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);

    // Initialize auth on mount
    useEffect(() => {
        if (!isInitialized) {
            initializeAuth();
        }
    }, [isInitialized, initializeAuth]);

    // Redirect if not authenticated
    useEffect(() => {
        if (isInitialized && !isAuthenticated) {
            router.push('/login');
        }
    }, [isInitialized, isAuthenticated, router]);

    // Redirect if onboarding already complete
    useEffect(() => {
        if (isInitialized && isAuthenticated && user?.onboardingComplete) {
            router.push('/dashboard');
        }
    }, [isInitialized, isAuthenticated, user, router]);

    // Poll scrape job status
    useEffect(() => {
        if (!scrapeJobId || !user?.hotelId) return;

        const interval = setInterval(async () => {
            try {
                const status = await api.get<ScrapeJobStatus>(
                    `/hotels/${user.hotelId}/scrape/status/${scrapeJobId}`
                );
                setScrapeStatus(status);

                if (status.status === 'completed' || status.status === 'failed') {
                    clearInterval(interval);
                }
            } catch (err) {
                console.error('Failed to poll scrape status:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [scrapeJobId, user?.hotelId]);

    // Auto-advance to step 4 when scrape completes
    useEffect(() => {
        if (scrapeStatus?.status === 'completed') {
            setTimeout(() => setCurrentStep(4), 1500);
        }
    }, [scrapeStatus?.status]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleSearch = useCallback(async () => {
        if (!hotelName.trim() || !city.trim()) return;

        setIsSearching(true);
        setSearchError(null);
        setDiscoveryResults([]);

        try {
            const results = await api.post<DiscoveryResult[]>('/hotel-discovery', {
                hotelName: hotelName.trim(),
                city: city.trim(),
            });
            setDiscoveryResults(results);
            setCurrentStep(2);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Search failed';
            setSearchError(msg);
        } finally {
            setIsSearching(false);
        }
    }, [hotelName, city]);

    const handleSelectHotel = useCallback(async (result: DiscoveryResult) => {
        if (!user?.hotelId) return;

        setCurrentStep(3);

        try {
            // Start scrape job
            const job = await api.post<ScrapeJobStatus>(`/hotels/${user.hotelId}/scrape`, {
                url: result.website,
                hotelName: result.name,
            });
            setScrapeJobId(job.id);
            setScrapeStatus(job);
        } catch (err) {
            console.error('Failed to start scrape:', err);
            setSearchError(err instanceof Error ? err.message : 'Failed to start scraping');
            setCurrentStep(2);
        }
    }, [user?.hotelId]);

    const handleComplete = useCallback(async () => {
        setIsCompleting(true);
        try {
            await api.post('/onboarding/complete');
            // Update the user state in the auth store — refetch user
            await initializeAuth();
            router.push('/dashboard');
        } catch (err) {
            console.error('Failed to complete onboarding:', err);
        } finally {
            setIsCompleting(false);
        }
    }, [initializeAuth, router]);

    // ============================================
    // LOADING STATE
    // ============================================

    if (!isInitialized || !isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                    <p className="mt-4 text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                            <Hotel className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-900">Hotel Assistant</span>
                    </div>
                    <span className="text-sm text-gray-500">
                        Welcome, {user?.name || 'there'}! 👋
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {currentStep === 1 && 'Set Up Your Hotel'}
                        {currentStep === 2 && 'Select Your Hotel'}
                        {currentStep === 3 && 'Importing Your Hotel Data'}
                        {currentStep === 4 && 'You\'re All Set! 🎉'}
                    </h1>
                    <p className="text-gray-500 max-w-lg mx-auto">
                        {currentStep === 1 && 'Let\'s find your hotel online and automatically import all its data.'}
                        {currentStep === 2 && 'We found these results. Select the one that matches your hotel.'}
                        {currentStep === 3 && 'We\'re scraping your hotel website and importing data. This may take a few minutes.'}
                        {currentStep === 4 && 'Your hotel profile has been set up with all the imported data.'}
                    </p>
                </div>

                {/* Step Indicator */}
                <StepIndicator currentStep={currentStep} />

                {/* ==================== STEP 1: Hotel Info ==================== */}
                {currentStep === 1 && (
                    <div className="max-w-md mx-auto">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
                            <div>
                                <label htmlFor="hotelName" className="block text-sm font-medium text-gray-700 mb-2">
                                    Hotel Name
                                </label>
                                <div className="relative">
                                    <Hotel className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="hotelName"
                                        type="text"
                                        value={hotelName}
                                        onChange={(e) => setHotelName(e.target.value)}
                                        placeholder="e.g. Grand Palace Hotel"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                                    City
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="city"
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="e.g. Surat"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>

                            {searchError && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                    {searchError}
                                </div>
                            )}

                            <button
                                onClick={handleSearch}
                                disabled={!hotelName.trim() || !city.trim() || isSearching}
                                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
                            >
                                {isSearching ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        Search My Hotel
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-400">
                                <Sparkles className="w-3 h-3 inline mr-1" />
                                We&apos;ll search across Google, Booking.com, TripAdvisor, Agoda &amp; more
                            </p>
                        </div>
                    </div>
                )}

                {/* ==================== STEP 2: Discovery Results ==================== */}
                {currentStep === 2 && (
                    <div>
                        {/* Search Again / Back */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Search Again
                            </button>
                            <p className="text-sm text-gray-500">
                                {discoveryResults.length} results found
                            </p>
                        </div>

                        {/* No Results */}
                        {discoveryResults.length === 0 && (
                            <div className="text-center py-16">
                                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-700 mb-2">No results found</h3>
                                <p className="text-gray-500 mb-6">Try adjusting your hotel name or city.</p>
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="px-6 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {/* Result Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {discoveryResults.map((result, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl border border-gray-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden group"
                                >
                                    {/* Image */}
                                    <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                                        {result.image ? (
                                            <img
                                                src={result.image}
                                                alt={result.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Hotel className="w-12 h-12 text-gray-300" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3">
                                            <SourceBadge source={result.source} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">
                                            {result.name}
                                        </h3>
                                        <a
                                            href={result.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3 line-clamp-1"
                                        >
                                            <Globe className="w-3.5 h-3.5 shrink-0" />
                                            {result.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                                            <ExternalLink className="w-3 h-3 shrink-0" />
                                        </a>
                                        {result.snippet && (
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-4">{result.snippet}</p>
                                        )}
                                        <button
                                            onClick={() => handleSelectHotel(result)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all text-sm group-hover:shadow-md"
                                        >
                                            Select This Hotel
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ==================== STEP 3: Scraping Progress ==================== */}
                {currentStep === 3 && (
                    <div className="max-w-lg mx-auto">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            {scrapeStatus ? (
                                <ScrapeProgress
                                    status={scrapeStatus.status}
                                    pagesScraped={scrapeStatus.pagesScraped}
                                    entriesFound={scrapeStatus.entriesFound}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                    <p className="text-gray-600 font-medium">Starting scraper...</p>
                                </div>
                            )}

                            {scrapeStatus?.status === 'failed' && (
                                <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
                                    <p className="text-red-700 text-sm font-medium">Scraping failed</p>
                                    <p className="text-red-600 text-sm mt-1">{scrapeStatus.errorMessage}</p>
                                    <button
                                        onClick={() => {
                                            setScrapeJobId(null);
                                            setScrapeStatus(null);
                                            setCurrentStep(2);
                                        }}
                                        className="mt-3 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
                                    >
                                        Go Back & Try Again
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-400">
                                <Wifi className="w-3 h-3 inline mr-1" />
                                Scraping official website &amp; OTA platforms. This usually takes 1-3 minutes.
                            </p>
                        </div>
                    </div>
                )}

                {/* ==================== STEP 4: Complete ==================== */}
                {currentStep === 4 && (
                    <div className="max-w-md mx-auto text-center">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            {/* Success animation */}
                            <div className="mb-6">
                                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto animate-bounce">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hotel Setup Complete!</h2>
                            <p className="text-gray-500 mb-6">
                                We&apos;ve imported {scrapeStatus?.entriesFound || 0} data entries from your hotel website.
                                Your dashboard is ready to use.
                            </p>

                            {/* Summary Stats */}
                            {scrapeStatus && (
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <p className="text-2xl font-bold text-blue-700">{scrapeStatus.pagesScraped}</p>
                                        <p className="text-xs text-blue-600">Pages Scraped</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-4">
                                        <p className="text-2xl font-bold text-emerald-700">{scrapeStatus.entriesFound}</p>
                                        <p className="text-xs text-emerald-600">Data Entries</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleComplete}
                                disabled={isCompleting}
                                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                            >
                                {isCompleting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Setting up dashboard...
                                    </>
                                ) : (
                                    <>
                                        Go to Dashboard
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading skeletons for step 2 */}
                {currentStep === 1 && isSearching && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                )}
            </div>
        </div>
    );
}
