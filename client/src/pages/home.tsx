import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { ServiceCard } from "@/components/ui/service-card";
import { TokenModal } from "@/components/ui/token-modal";

import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { AthleteComparison } from "@/components/ui/athlete-comparison";
import { VideoAnalysisResults } from "@/components/ui/video-analysis-results";
import { NutritionPlanDisplay } from "@/components/ui/nutrition-plan-display";
import { DevelopmentPlanDisplay } from "@/components/ui/development-plan-display";
import { StatisticsDisplay } from "@/components/ui/statistics-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Search, Star, User, Loader2, Users, Apple, CalendarDays, BarChart3, X, RefreshCw, TrendingUp, Check, ChevronsUpDown, Shield, Ruler, Trophy, Eye, HelpCircle } from "lucide-react";
import type { Sport, Athlete } from "@shared/schema";
import { CountrySelect } from "@/components/ui/country-select";
import { Flag } from "@/components/ui/flag";
import arHomeTranslations from '@/locales/ar/home.json';
import enHomeTranslations from '@/locales/en/home.json';

// Animated loading dots component
function AnimatedDots({ isRTL }: { isRTL: boolean }) {
  const [dots, setDots] = useState('.');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return <span className="inline-block">{dots}</span>;
}

// Helper to convert numbers to Arabic numerals
function toArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}

// Helper function to get translations for nutrition/development plans based on plan language
function getPlanTranslations(language: string | undefined, key: string): string {
  const planLang = language || 'en';
  const translations = planLang === 'ar' ? arHomeTranslations : enHomeTranslations;
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if not found
    }
  }
  
  return typeof value === 'string' ? value : key;
}

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('home');
  const isArabic = i18n.language === 'ar';
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchProgressMessage, setSearchProgressMessage] = useState("");
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("analysis");
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [videoAnalysisData, setVideoAnalysisData] = useState<any>(null);
  const [nutritionPlanData, setNutritionPlanData] = useState<any>(null);
  const [showNutritionForm, setShowNutritionForm] = useState<boolean>(true);
  const [developmentPlanData, setDevelopmentPlanData] = useState<any>(null);
  const [showDevelopmentForm, setShowDevelopmentForm] = useState<boolean>(true);
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [developmentJobId, setDevelopmentJobId] = useState<string | null>(null);
  const [developmentProgress, setDevelopmentProgress] = useState<number>(0);
  const [developmentProgressMessage, setDevelopmentProgressMessage] = useState<string>("");
  const [developmentQueueId, setDevelopmentQueueId] = useState<string | null>(null);
  const [nutritionJobId, setNutritionJobId] = useState<string | null>(null);
  const [nutritionProgress, setNutritionProgress] = useState<number>(0);
  const [nutritionJobProgressMessage, setNutritionJobProgressMessage] = useState<string>("");
  const [nutritionQueueId, setNutritionQueueId] = useState<string | null>(null);
  const [location] = useLocation();
  
  // Preview modal state
  const [previewModal, setPreviewModal] = useState<{ open: boolean; serviceType: string | null }>({ open: false, serviceType: null });
  
  // Preview data types
  interface PreviewAnalysisItem {
    serviceType: string;
    resultData: any;
    createdAt: string;
  }

  interface PreviewApiResponse {
    success: boolean;
    data: PreviewAnalysisItem[];
    count: number;
  }

  // Fetch preview data based on site language
  const { data: previewData, isLoading: previewLoading } = useQuery<PreviewApiResponse>({
    queryKey: ['/api/preview/latest-by-type', i18n.language],
    queryFn: async () => {
      const res = await fetch(`/api/preview/latest-by-type?language=${i18n.language}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch preview data');
      return res.json();
    },
    enabled: previewModal.open && !!previewModal.serviceType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get the specific analysis data for the selected service type
  const getAnalysisForPreview = () => {
    if (!previewData?.data || !previewModal.serviceType) return null;
    return previewData.data.find((item: any) => item.serviceType === previewModal.serviceType);
  };

  const selectedPreviewAnalysis = getAnalysisForPreview();
  
  // Handle URL parameters from GenerationQueue navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const data = urlParams.get('data');
    
    console.log('URL params check:', { tab, data });
    
    if (tab && data) {
      try {
        let result;
        
        // Check if data is the special 'fromStorage' flag
        if (data === 'fromStorage') {
          // Load from sessionStorage based on tab
          if (tab === 'development') {
            const storedData = sessionStorage.getItem('developmentPlanData');
            if (storedData) {
              result = JSON.parse(storedData);
              sessionStorage.removeItem('developmentPlanData');
            }
          } else if (tab === 'nutrition') {
            const storedData = sessionStorage.getItem('nutritionPlanData');
            if (storedData) {
              result = JSON.parse(storedData);
              sessionStorage.removeItem('nutritionPlanData');
            }
          }
        } else {
          // Parse data from URL parameter
          result = JSON.parse(decodeURIComponent(data));
        }
        
        // Apply the result if we have one
        if (result) {
          if (tab === 'comparison' && result.serviceType === 'compare') {
            setComparisonData(result);
            setActiveTab('comparison');
          } else if (tab === 'video' && result.serviceType === 'video') {
            setVideoAnalysisData(result);
            setActiveTab('video');
          } else if (tab === 'nutrition') {
            setNutritionPlanData(result);
            setShowNutritionForm(false);
            setActiveTab('nutrition');
          } else if (tab === 'development') {
            setDevelopmentPlanData(result);
            setShowDevelopmentForm(false);
            setActiveTab('development');
          }
        }
        
        // Clean up URL after processing
        window.history.replaceState({}, '', '/');
      } catch (error) {
        console.error('Error parsing URL data:', error);
      }
    }
  }, [location]);
  
  // Restore loading states from queue when navigating back to tabs
  useEffect(() => {
    const queue = (window as any).generationQueue?.getQueue?.();
    if (!queue) return;
    
    // Check for running development plan jobs
    const runningDevelopmentJob = queue.find((item: any) => 
      (item.serviceType === 'development-plan' || item.serviceType === 'development') && 
      (item.status === 'running' || item.status === 'pending')
    );
    
    if (runningDevelopmentJob && runningDevelopmentJob.jobId) {
      setDevelopmentJobId(runningDevelopmentJob.jobId);
      setDevelopmentProgressMessage(runningDevelopmentJob.progressMessage || '');
      // Progress will be updated by the polling system
    } else if (!runningDevelopmentJob && developmentJobId) {
      // Clear state if no running job in queue
      const completedJob = queue.find((item: any) => 
        (item.serviceType === 'development-plan' || item.serviceType === 'development') && 
        item.status === 'completed' && 
        item.jobId === developmentJobId
      );
      
      if (!completedJob) {
        setDevelopmentJobId(null);
        setDevelopmentProgress(0);
        setDevelopmentProgressMessage('');
      }
    }
    
    // Check for running nutrition plan jobs
    const runningNutritionJob = queue.find((item: any) => 
      (item.serviceType === 'nutrition-plan' || item.serviceType === 'nutrition') && 
      (item.status === 'running' || item.status === 'pending')
    );
    
    if (runningNutritionJob && runningNutritionJob.jobId) {
      setNutritionJobId(runningNutritionJob.jobId);
      setNutritionJobProgressMessage(runningNutritionJob.progressMessage || '');
    } else if (!runningNutritionJob && nutritionJobId) {
      const completedJob = queue.find((item: any) => 
        (item.serviceType === 'nutrition-plan' || item.serviceType === 'nutrition') && 
        item.status === 'completed' && 
        item.jobId === nutritionJobId
      );
      
      if (!completedJob) {
        setNutritionJobId(null);
        setNutritionProgress(0);
        setNutritionJobProgressMessage('');
      }
    }
  }, [activeTab, location, developmentJobId, nutritionJobId]);
  
  // Sports dropdown search states
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
  const [sportSearchTerm, setSportSearchTerm] = useState("");
  const [nutritionSportDropdownOpen, setNutritionSportDropdownOpen] = useState(false);
  const [nutritionSportSearchTerm, setNutritionSportSearchTerm] = useState("");
  const [developmentSportDropdownOpen, setDevelopmentSportDropdownOpen] = useState(false);
  const [developmentSportSearchTerm, setDevelopmentSportSearchTerm] = useState("");
  
  // Ranking progress states (for in-card loading display)
  const [rankingFetchStatus, setRankingFetchStatus] = useState<Record<string, { isLoading: boolean; currentPhase: string }>>({});

  // Helper for required number validation that shows proper required messages
  const requiredNumber = (requiredMsg: string, invalidMsg: string, min: number, max: number) => 
    z.preprocess(
      (v) => {
        if (v === '' || v == null) return undefined;
        if (typeof v === 'string') {
          const num = Number(v);
          return isNaN(num) ? v : num; // Return original if not a valid number, let z.number handle the error
        }
        return v;
      },
      z.number({ 
        required_error: requiredMsg, 
        invalid_type_error: invalidMsg 
      }).min(min, invalidMsg).max(max, invalidMsg)
    );

  // Nutrition Plan form validation schema with translations
  const nutritionPlanSchema = useMemo(() => z.object({
    goal: z.string().min(10, t('validation.goalRequired')).max(1000, t('validation.goalTooLong')),
    sport: z.string().optional(),
    age: requiredNumber(t('validation.ageRequired'), t('validation.ageInvalid'), 13, 99),
    height: requiredNumber(t('validation.heightRequired'), t('validation.heightInvalid'), 120, 250),
    currentWeight: requiredNumber(t('validation.currentWeightRequired'), t('validation.currentWeightInvalid'), 30, 300),
    targetWeight: requiredNumber(t('validation.targetWeightRequired'), t('validation.targetWeightInvalid'), 30, 300),
    country: z.string().min(1, t('validation.countryRequired')),
    period: z.preprocess(
      (v) => v === '' || v == null ? 1 : Number(v),
      z.number().int().min(1).max(52)
    ),
    inbodyReport: z.any().optional(),
    language: z.string().default("en")
  }), [t, i18n.language]);

  type NutritionPlanFormData = z.infer<typeof nutritionPlanSchema>;

  // Development Plan form validation schema with translations
  const developmentPlanSchema = useMemo(() => z.object({
    goal: z.string().min(10, t('validation.goalRequired')).max(1000, t('validation.goalTooLong')),
    age: requiredNumber(t('validation.ageRequired'), t('validation.ageInvalid'), 13, 99),
    height: requiredNumber(t('validation.heightRequired'), t('validation.heightInvalid'), 120, 250),
    weight: requiredNumber(t('validation.weightRequired'), t('validation.weightInvalid'), 30, 300),
    gender: z.enum(['male', 'female'], { required_error: t('validation.genderRequired') }),
    sport: z.string().min(1, t('validation.sportRequired')),
    language: z.string().default("en")
  }), [t, i18n.language]);

  type DevelopmentPlanFormData = z.infer<typeof developmentPlanSchema>;

  // Initialize form with validation
  const nutritionForm = useForm<NutritionPlanFormData>({
    resolver: zodResolver(nutritionPlanSchema),
    defaultValues: {
      goal: "",
      sport: selectedSport,
      age: undefined,
      height: undefined,
      currentWeight: undefined,
      targetWeight: undefined,
      country: selectedCountry || "",
      period: 1,
      inbodyReport: undefined,
      language: i18n.language
    }
  });

  // Nutrition plan generation mutation
  // Nutrition plan job creation mutation
  const createNutritionPlanJobMutation = useMutation({
    mutationFn: async (data: NutritionPlanFormData) => {
      // Add to generation queue
      const queueId = (window as any).generationQueue?.add?.('Nutrition Plan', 'nutrition', false);
      
      const response = await fetch('/api/jobs/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        // Update queue on error
        if (queueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(queueId, { status: 'error', errorMessage: error.message || 'Generation failed' });
        }
        throw new Error(error.message || 'Failed to start nutrition plan generation');
      }
      const result = await response.json();
      return { ...result, queueId, formData: data };
    },
    onSuccess: (result) => {
      console.log('Nutrition plan job created:', result);
      setNutritionJobId(result.jobId);
      setNutritionQueueId(result.queueId);
      setNutritionProgress(0);
      setNutritionJobProgressMessage("Starting nutrition plan generation...");
      
      // Update queue to running with jobId for proper cancellation and retry
      if (result.queueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(result.queueId, { 
          status: 'running', 
          progressMessage: 'Generating nutrition plan...',
          jobId: result.jobId,
          onRetry: () => {
            // Retry by resubmitting the form with the same data
            createNutritionPlanJobMutation.mutate(result.formData);
          }
        });
      }
      
      toast({
        title: t('common:toast.generationStarted', 'Generation Started!'),
        description: t('common:toast.nutritionGenerationStartedDesc', 'Your nutrition plan is being generated. This may take several minutes.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:toast.generationFailed', 'Generation Failed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize development plan form with validation
  const developmentForm = useForm<DevelopmentPlanFormData>({
    resolver: zodResolver(developmentPlanSchema),
    defaultValues: {
      goal: "",
      age: undefined,
      height: undefined,
      weight: undefined,
      gender: "male",
      sport: "",
      language: i18n.language
    }
  });

  // Development plan job creation mutation
  const createDevelopmentPlanJobMutation = useMutation({
    mutationFn: async (data: DevelopmentPlanFormData) => {
      // Add to generation queue
      const queueId = (window as any).generationQueue?.add?.('Development Plan', 'development', false);
      
      const response = await fetch('/api/jobs/development-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        // Update queue on error
        if (queueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(queueId, { status: 'error', errorMessage: error.message || 'Generation failed' });
        }
        throw new Error(error.message || 'Failed to start development plan generation');
      }
      const result = await response.json();
      return { ...result, queueId, formData: data };
    },
    onSuccess: (result) => {
      console.log('Development plan job created:', result);
      setDevelopmentJobId(result.jobId);
      setDevelopmentQueueId(result.queueId);
      setDevelopmentProgress(0);
      setDevelopmentProgressMessage(t('common:messages.startingDevelopmentPlan', 'Starting development plan generation...'));
      
      // Update queue to running with jobId for proper cancellation and retry
      if (result.queueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(result.queueId, { 
          status: 'running', 
          progressMessage: 'Generating development plan...',
          jobId: result.jobId,
          onRetry: () => {
            // Retry by resubmitting the form with the same data
            createDevelopmentPlanJobMutation.mutate(result.formData);
          }
        });
      }
      
      toast({
        title: t('common:toast.generationStarted', 'Generation Started!'),
        description: t('common:toast.developmentGenerationStartedDesc', 'Your development plan is being generated. This may take several minutes.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:toast.generationFailed', 'Generation Failed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Development plan job polling
  const { data: developmentJobStatus, refetch: refetchJobStatus } = useQuery({
    queryKey: ['/api/jobs', developmentJobId],
    enabled: !!developmentJobId,
    refetchInterval: (query) => {
      // Stop polling if job is completed, failed, or cancelled
      const status = query.state?.data?.status;
      return (status === 'completed' || status === 'failed' || status === 'cancelled') ? false : 2000;
    },
    queryFn: async () => {
      if (!developmentJobId) return null;
      const response = await fetch(`/api/jobs/${developmentJobId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }
      return response.json();
    }
  });

  // Nutrition job status polling
  const { data: nutritionJobStatus, refetch: refetchNutritionJobStatus } = useQuery({
    queryKey: ['/api/jobs', nutritionJobId],
    enabled: !!nutritionJobId,
    refetchInterval: (query) => {
      // Stop polling if job is completed, failed, or cancelled
      const status = query.state?.data?.status;
      return (status === 'completed' || status === 'failed' || status === 'cancelled') ? false : 2000;
    },
    queryFn: async () => {
      if (!nutritionJobId) return null;
      const response = await fetch(`/api/jobs/${nutritionJobId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }
      return response.json();
    }
  });

  // Cancel development plan job mutation
  const cancelDevelopmentPlanJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel job');
      }
      return response.json();
    },
    onSuccess: () => {
      // Update queue to cancelled
      if (developmentQueueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(developmentQueueId, { status: 'cancelled' });
      }
      
      // Reset all state
      setDevelopmentJobId(null);
      setDevelopmentQueueId(null);
      setDevelopmentProgress(0);
      setDevelopmentProgressMessage("");
      
      // Invalidate the job query to stop polling
      queryClient.cancelQueries({ queryKey: ['/api/jobs', developmentJobId] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', developmentJobId] });
      
      toast({
        title: t('common:toast.generationCancelled', 'Generation Cancelled'),
        description: t('common:toast.developmentCancelledDesc', 'Development plan generation was cancelled.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:toast.cancellationFailed', 'Cancellation Failed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel nutrition plan job mutation
  const cancelNutritionPlanJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel job');
      }
      return response.json();
    },
    onSuccess: () => {
      // Update queue to cancelled
      if (nutritionQueueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(nutritionQueueId, { status: 'cancelled' });
      }
      
      // Reset all state
      setNutritionJobId(null);
      setNutritionQueueId(null);
      setNutritionProgress(0);
      setNutritionJobProgressMessage("");
      
      // Invalidate the job query to stop polling
      queryClient.cancelQueries({ queryKey: ['/api/jobs', nutritionJobId] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', nutritionJobId] });
      
      toast({
        title: t('common:toast.generationCancelled', 'Generation Cancelled'),
        description: t('common:toast.nutritionCancelledDesc', 'Nutrition plan generation was cancelled.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:toast.cancellationFailed', 'Cancellation Failed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmitNutritionPlan = (data: NutritionPlanFormData) => {
    console.log('Nutrition plan form submitted:', data);
    createNutritionPlanJobMutation.mutate(data);
  };

  // Development plan form submission handler
  const onSubmitDevelopmentPlan = (data: DevelopmentPlanFormData) => {
    console.log('Development plan form submitted:', data);
    createDevelopmentPlanJobMutation.mutate(data);
  };

  // Handle development plan job completion
  useEffect(() => {
    if (developmentJobStatus) {
      const { status, progress, result, error } = developmentJobStatus;
      const results = result; // Map result to results for backwards compatibility
      
      // Cap progress at 100% to prevent values like 138%
      const cappedProgress = Math.min(Math.max(progress || 0, 0), 100);
      setDevelopmentProgress(cappedProgress);
      
      if (status === 'running' || status === 'in_progress') {
        // Language-aware progress messages using translation keys
        const messages = [
          t('common:messages.developmentProgress1'),
          t('common:messages.developmentProgress2'),
          t('common:messages.developmentProgress3'),
          t('common:messages.developmentProgress4'),
          t('common:messages.developmentProgress5'),
          t('common:messages.developmentProgress6'),
          t('common:messages.developmentProgress7')
        ];
        
        // More sophisticated message selection based on actual progress
        const messageIndex = Math.min(
          Math.floor((cappedProgress / 100) * messages.length),
          messages.length - 1
        );
        
        const newMessage = messages[messageIndex];
        setDevelopmentProgressMessage(newMessage);
        
        // Update queue progress
        if (developmentQueueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(developmentQueueId, { 
            status: 'running', 
            progressMessage: newMessage 
          });
        }
        
        // Display incremental results if available during processing
        if (results) {
          console.log('Displaying incremental results:', results);
          setDevelopmentPlanData(results);
          setShowDevelopmentForm(false);
          setActiveTab('development');
        }
      } else if (status === 'completed' && results) {
        console.log('Development plan completed:', results);
        setDevelopmentPlanData(results);
        setShowDevelopmentForm(false);
        setActiveTab('development');
        setDevelopmentJobId(null);
        setDevelopmentProgress(0);
        setDevelopmentProgressMessage("");
        
        // Update queue to completed
        if (developmentQueueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(developmentQueueId, { status: 'completed' });
        }
        setDevelopmentQueueId(null);
        
        toast({
          title: t('common:toast.developmentPlanGenerated', 'Development Plan Generated!'),
          description: t('common:toast.developmentPlanGeneratedDesc', 'Your personalized training plan is ready.'),
        });
        // Invalidate relevant queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-history'] });
      } else if (status === 'failed') {
        console.error('Development plan generation failed:', error);
        setDevelopmentJobId(null);
        setDevelopmentProgress(0);
        setDevelopmentProgressMessage("");
        
        // Update queue to error
        if (developmentQueueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(developmentQueueId, { 
            status: 'error', 
            errorMessage: error || 'Generation failed' 
          });
        }
        setDevelopmentQueueId(null);
        
        toast({
          title: t('common:toast.generationFailed', 'Generation Failed'),
          description: error || t('common:messages.analysisFailedDesc', 'Development plan generation failed. Please try again.'),
          variant: "destructive",
        });
      } else if (status === 'cancelled') {
        setDevelopmentJobId(null);
        setDevelopmentProgress(0);
        setDevelopmentProgressMessage("");
        
        // Update queue to error (cancelled)
        if (developmentQueueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(developmentQueueId, { 
            status: 'error', 
            errorMessage: 'Cancelled by user' 
          });
        }
        setDevelopmentQueueId(null);
      }
    }
  }, [developmentJobStatus, queryClient, toast, setActiveTab, i18n.language, t, developmentQueueId]);

  // Nutrition plan job status handling
  useEffect(() => {
    if (nutritionJobStatus) {
      const { status, progress, result, error } = nutritionJobStatus;
      
      // Cap progress at 100% to prevent values like 138%
      const cappedProgress = Math.min(Math.max(progress || 0, 0), 100);
      setNutritionProgress(cappedProgress);
      
      if (status === 'running' || status === 'in_progress') {
        // Language-aware progress messages using translation keys
        const messages = [
          t('common:messages.nutritionProgress1'),
          t('common:messages.nutritionProgress2'),
          t('common:messages.nutritionProgress3'),
          t('common:messages.nutritionProgress4'),
          t('common:messages.nutritionProgress5'),
          t('common:messages.nutritionProgress6'),
          t('common:messages.nutritionProgress7')
        ];
        const messageIndex = Math.min(Math.floor((cappedProgress / 100) * 7), messages.length - 1);
        setNutritionJobProgressMessage(messages[messageIndex]);
        
        // Update queue progress
        if (nutritionQueueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(nutritionQueueId, { 
            status: 'running', 
            progressMessage: messages[messageIndex] 
          });
        }
        
        // Display incremental results if available during processing
        if (result) {
          console.log('Displaying incremental nutrition results:', result);
          setNutritionPlanData(result);
          setShowNutritionForm(false);
          setActiveTab('nutrition');
        }
      } else if (status === 'completed' && result) {
        console.log('Nutrition plan completed:', result);
        setNutritionPlanData(result);
        setShowNutritionForm(false);
        setActiveTab('nutrition');
        setNutritionJobId(null);
        setNutritionProgress(0);
        setNutritionJobProgressMessage("");
        
        // Update queue to completed
        if (nutritionQueueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(nutritionQueueId, { status: 'completed' });
        }
        setNutritionQueueId(null);
        
        toast({
          title: t('common:toast.nutritionPlanGenerated', 'Nutrition Plan Generated!'),
          description: t('common:toast.nutritionPlanGeneratedDesc', 'Your personalized nutrition plan is ready.'),
        });
        // Invalidate relevant queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-history'] });
      } else if (status === 'failed') {
        console.error('Nutrition plan generation failed:', error);
        setNutritionJobId(null);
        setNutritionProgress(0);
        setNutritionJobProgressMessage("");
        
        // Update queue to error
        if (nutritionQueueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(nutritionQueueId, { 
            status: 'error', 
            errorMessage: error || 'Generation failed' 
          });
        }
        setNutritionQueueId(null);
        
        toast({
          title: t('common:toast.generationFailed', 'Generation Failed'),
          description: error || t('common:messages.analysisFailedDesc', 'Nutrition plan generation failed. Please try again.'),
          variant: "destructive",
        });
      } else if (status === 'cancelled') {
        setNutritionJobId(null);
        setNutritionProgress(0);
        setNutritionJobProgressMessage("");
      }
    }
  }, [nutritionJobStatus, queryClient, toast, setActiveTab, i18n.language, t, nutritionQueueId]);

  // Listen for queue notifications
  useEffect(() => {
    const handleQueueNotification = (event: CustomEvent) => {
      const { title, description } = event.detail;
      toast({
        title,
        description,
      });
    };

    window.addEventListener('queue-notification', handleQueueNotification as EventListener);
    return () => {
      window.removeEventListener('queue-notification', handleQueueNotification as EventListener);
    };
  }, [toast]);

  // WebSocket listener for ranking progress updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/ranking-progress`);

    ws.onopen = () => {
      console.log('🔌 Connected to ranking progress WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, athleteId, message, isComplete, status, queueId, progress } = data;
        
        // Handle comparison progress updates
        if (type === 'comparison-progress' && queueId) {
          if (window.generationQueue) {
            window.generationQueue.update(queueId, { 
              progressMessage: message,
              status: 'running'
            });
          }
          console.log('📊 Comparison progress:', message, progress);
        }
        
        // Handle comparison completion
        if (type === 'comparison-complete' && queueId) {
          if (window.generationQueue) {
            window.generationQueue.update(queueId, { 
              status: 'completed'
            });
          }
          console.log('✅ Comparison complete');
        }
        
        // Handle ranking progress updates (existing logic)
        if (athleteId) {
          if (isComplete) {
            // Clear loading state when complete
            setRankingFetchStatus(prev => {
              const { [athleteId]: _, ...rest } = prev;
              return rest;
            });
            
            // Show completion message to user
            if (status === 'not_found' || message.toLowerCase().includes('could not find') || message.toLowerCase().includes('not found')) {
              toast({
                title: t('common:toast.rankingSearchComplete', 'Ranking Search Complete'),
                description: message || t('common:toast.rankingSearchCompleteDesc', 'Could not find rankings for this athlete'),
                variant: "default"
              });
            } else if (status === 'complete' && !message.toLowerCase().includes('error')) {
              toast({
                title: t('common:toast.rankingsFound', 'Rankings Found'),
                description: message || t('common:toast.rankingsFoundDesc', 'Rankings have been updated'),
              });
            }
          } else {
            // Update phase message
            setRankingFetchStatus(prev => ({
              ...prev,
              [athleteId]: { isLoading: true, currentPhase: message || 'Processing...' }
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 Disconnected from ranking progress WebSocket');
    };

    return () => {
      ws.close();
    };
  }, []);

  // Progress messages for nutrition plan generation
  const nutritionProgressMessages = useMemo(() => {
    const isArabic = i18n.language === 'ar';
    return isArabic ? [
      "بدء تحليل ملف التغذية الخاص بك... (هذا قد يستغرق 5-10 دقائق للخطط الطويلة)",
      "جمع البيانات الغذائية المتخصصة... كل أسبوع يحتاج ~50 ثانية للإنشاء",
      "تحليل احتياجاتك الرياضية... الذكاء الاصطناعي يعمل على تخصيص خطتك",
      "إنشاء خطة أسبوعية متنوعة... هذا يستحق الانتظار!",
      "تحسين المحتوى الغذائي... جاري تحليل الوجبات المتوازنة",
      "تنسيق الوجبات التقليدية... مراعاة ثقافتك الغذائية",
      "إضافة لمسة شخصية للخطة... تخصيص حسب أهدافك",
      "مراجعة الخطة النهائية... ضمان الجودة والتنوع",
      "جاري الإنتهاء من خطتك... تقريباً جاهز!",
      "المعالجة النهائية... بناء خطة شاملة ومتوازنة"
    ] : [
      "Analyzing your nutritional profile... (This may take 5-10 minutes for longer plans)",
      "Gathering specialized dietary data... Each week takes ~50 seconds to generate",
      "Evaluating your athletic requirements... AI is customizing your plan",
      "Creating varied weekly meal plans... This is worth the wait!",
      "Optimizing nutritional content... Analyzing balanced meal composition",
      "Coordinating traditional cuisine... Respecting your dietary culture",
      "Adding personal touches to your plan... Customizing for your goals",
      "Reviewing final nutrition strategy... Ensuring quality and variety",
      "Finalizing your custom plan... Almost ready!",
      "Final processing... Building comprehensive balanced plan"
    ];
  }, [i18n.language]);

  // Cycle through progress messages during nutrition plan generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let messageIndex = 0;

    if (nutritionJobId && nutritionProgress < 100) {
      // Set initial message
      setNutritionJobProgressMessage(nutritionProgressMessages[0]);
      
      // Update message every 20 seconds
      interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % nutritionProgressMessages.length;
        setNutritionJobProgressMessage(nutritionProgressMessages[messageIndex]);
      }, 20000);
    } else {
      // Reset message when not generating
      setNutritionJobProgressMessage("");
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [nutritionJobId, nutritionProgress]);

  // Check for payment success notification
  useEffect(() => {
    const paymentSuccess = sessionStorage.getItem('paymentSuccess');
    if (paymentSuccess) {
      try {
        const paymentData = JSON.parse(paymentSuccess);
        toast({
          title: t('common:toast.paymentSuccessful', 'Payment Successful!'),
          description: `Successfully purchased tokens for ${paymentData.amount} EGP. Transaction: ${paymentData.transactionId}`,
        });
        sessionStorage.removeItem('paymentSuccess');
      } catch (error) {
        console.error('Error parsing payment success data:', error);
      }
    }
  }, [toast]);


  // Check for URL parameters to load comparison data
  useEffect(() => {
    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      const data = urlParams.get('data');
      
      console.log('URL params check:', { tab, data: data ? 'present' : 'null' });
      
      if (tab === 'comparison' && data) {
        try {
          let parsedData;
          if (data === 'fromStorage') {
            // Get data from sessionStorage
            const storedData = sessionStorage.getItem('comparisonData');
            if (storedData) {
              parsedData = JSON.parse(storedData);
              // Clean up sessionStorage after use
              sessionStorage.removeItem('comparisonData');
            } else {
              throw new Error('No comparison data found in sessionStorage');
            }
          } else {
            // Legacy URL-based approach
            parsedData = JSON.parse(decodeURIComponent(data));
          }
          
          console.log('Parsed comparison data:', parsedData);
          setComparisonData(parsedData);
          setActiveTab("comparison");
          console.log('Set activeTab to comparison, comparisonData:', parsedData);
          // Clean up URL after loading data
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Failed to parse comparison data from URL:', error);
        }
      } else if (tab === 'video' && data) {
        try {
          const parsedData = JSON.parse(decodeURIComponent(data));
          console.log('Parsed video analysis data:', parsedData);
          // Store data temporarily in sessionStorage and redirect to dedicated video analysis page
          sessionStorage.setItem('videoAnalysisData', JSON.stringify(parsedData));
          window.location.href = '/video-analysis';
        } catch (error) {
          console.error('Failed to parse video analysis data from URL:', error);
        }
      } else if (tab === 'development' && data) {
        try {
          let parsedData;
          if (data === 'fromStorage') {
            // Get data from sessionStorage
            const storedData = sessionStorage.getItem('developmentPlanData');
            if (storedData) {
              parsedData = JSON.parse(storedData);
              // Clean up sessionStorage after use
              sessionStorage.removeItem('developmentPlanData');
            } else {
              throw new Error('No development plan data found in sessionStorage');
            }
          } else {
            // Legacy URL-based approach
            parsedData = JSON.parse(decodeURIComponent(data));
          }
          
          console.log('Parsed development plan data:', parsedData);
          setDevelopmentPlanData(parsedData);
          setShowDevelopmentForm(false);
          setActiveTab("development");
          // Clean up URL after loading data
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Failed to parse development plan data from URL:', error);
        }
      } else if (tab === 'statistics' && data) {
        try {
          let parsedData;
          if (data === 'fromStorage') {
            // Get data from sessionStorage
            const storedData = sessionStorage.getItem('statisticsData');
            if (storedData) {
              parsedData = JSON.parse(storedData);
              // Clean up sessionStorage after use
              sessionStorage.removeItem('statisticsData');
            } else {
              throw new Error('No statistics data found in sessionStorage');
            }
          } else {
            // Legacy URL-based approach
            parsedData = JSON.parse(decodeURIComponent(data));
          }
          
          console.log('Parsed statistics data:', parsedData);
          setStatisticsData(parsedData);
          setActiveTab("statistics");
          // Clean up URL after loading data
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Failed to parse statistics data from URL:', error);
        }
      }
    };

    // Check immediately
    checkUrlParams();

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', checkUrlParams);
    
    // Clean up listener
    return () => {
      window.removeEventListener('popstate', checkUrlParams);
    };
  }, [location]);

  // Also check on location changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const data = urlParams.get('data');
    
    console.log('Location changed, URL params:', { tab, data: data ? 'present' : 'null' });
    
    if (tab === 'comparison' && data) {
      try {
        let parsedData;
        if (data === 'fromStorage') {
          // Get data from sessionStorage
          const storedData = sessionStorage.getItem('comparisonData');
          if (storedData) {
            parsedData = JSON.parse(storedData);
            // Clean up sessionStorage after use
            sessionStorage.removeItem('comparisonData');
          } else {
            throw new Error('No comparison data found in sessionStorage');
          }
        } else {
          // Legacy URL-based approach
          parsedData = JSON.parse(decodeURIComponent(data));
        }
        
        console.log('Location change - Parsed comparison data:', parsedData);
        setComparisonData(parsedData);
        setActiveTab("comparison");
        // Clean up URL after loading data
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse comparison data from URL:', error);
      }
    } else if (tab === 'video' && data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        console.log('Location change - Parsed video analysis data:', parsedData);
        // Store data temporarily in sessionStorage and redirect to dedicated video analysis page
        sessionStorage.setItem('videoAnalysisData', JSON.stringify(parsedData));
        window.location.href = '/video-analysis';
        setActiveTab("video");
        // Clean up URL after loading data
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse video analysis data from URL:', error);
      }
    } else if (tab === 'development' && data) {
      try {
        let parsedData;
        if (data === 'fromStorage') {
          // Get data from sessionStorage
          const storedData = sessionStorage.getItem('developmentPlanData');
          if (storedData) {
            parsedData = JSON.parse(storedData);
            // Clean up sessionStorage after use
            sessionStorage.removeItem('developmentPlanData');
          } else {
            throw new Error('No development plan data found in sessionStorage');
          }
        } else {
          // Legacy URL-based approach
          parsedData = JSON.parse(decodeURIComponent(data));
        }
        
        console.log('Location change - Parsed development plan data:', parsedData);
        setDevelopmentPlanData(parsedData);
        setShowDevelopmentForm(false);
        setActiveTab("development");
        // Clean up URL after loading data
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse development plan data from URL:', error);
      }
    } else if (tab === 'statistics' && data) {
      try {
        let parsedData;
        if (data === 'fromStorage') {
          // Get data from sessionStorage
          const storedData = sessionStorage.getItem('statisticsData');
          if (storedData) {
            parsedData = JSON.parse(storedData);
            // Clean up sessionStorage after use
            sessionStorage.removeItem('statisticsData');
          } else {
            throw new Error('No statistics data found in sessionStorage');
          }
        } else {
          // Legacy URL-based approach
          parsedData = JSON.parse(decodeURIComponent(data));
        }
        
        console.log('Location change - Parsed statistics data:', parsedData);
        setStatisticsData(parsedData);
        setActiveTab("statistics");
        // Clean up URL after loading data
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse statistics data from URL:', error);
      }
    }
  }, [location]);

  // Callback function to handle comparison loading from history
  const handleComparisonFromHistory = (historyComparisonData: any) => {
    setComparisonData(historyComparisonData);
    setActiveTab("comparison");
  };

  // Get all countries
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ["/api/countries"],
  });
  
  // Get athletes for the selected sport with deduplication (only if no search is active)
  const { data: allAthletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport, selectedCountry],
    enabled: !!selectedSport && !searchName.trim(),
    queryFn: async () => {
      try {
        const url = new URL(`/api/athletes/by-sport/${selectedSport}`, window.location.origin);
        if (selectedCountry) {
          url.searchParams.set('country', selectedCountry);
        }
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching athletes by sport:', error);
        toast({
          title: t('common:toast.loadAthletesError', 'Error'),
          description: t('common:toast.loadAthletesErrorDesc', 'Failed to load athletes. Please try again.'),
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Search athletes by name with AI fallback
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/search-by-name", searchName.trim(), selectedSport, selectedCountry],
    enabled: !!searchName.trim() && searchName.trim().length >= 2,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/athletes/search-by-name?name=${encodeURIComponent(searchName.trim())}&sportId=${encodeURIComponent(selectedSport)}&country=${encodeURIComponent(selectedCountry)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error searching athletes:', error);
        toast({
          title: t('common:toast.searchError', 'Search Error'),
          description: t('common:toast.searchErrorDesc', 'Failed to search athletes. Please try again.'),
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Determine which athletes to display: search results or sport-filtered athletes
  const displayAthletes = searchName.trim() ? searchResults : allAthletes;

  // Deduplicate athletes by name, keeping the most recent record
  const availableAthletes = displayAthletes.reduce((acc: Athlete[], current) => {
    const existingIndex = acc.findIndex(athlete => 
      athlete.name.toLowerCase().trim() === current.name.toLowerCase().trim()
    );
    
    if (existingIndex === -1) {
      acc.push(current);
    } else {
      // Keep the more recent record (or the one with more complete data)
      const existing = acc[existingIndex];
      const currentDate = new Date(current.updatedAt || current.createdAt || 0);
      const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
      
      if (currentDate > existingDate || 
          (current.bio && current.bio.length > (existing.bio?.length || 0))) {
        acc[existingIndex] = current;
      }
    }
    
    return acc;
  }, []);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [isAthleteNewlyCreated, setIsAthleteNewlyCreated] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showBioPopup, setShowBioPopup] = useState(false);
  const [bioData, setBioData] = useState(null);
  const [showStatisticsPopup, setShowStatisticsPopup] = useState(false);
  const [showImageUpdateTip, setShowImageUpdateTip] = useState(false);

  // Show image update tip when athlete is selected
  useEffect(() => {
    if (selectedAthlete) {
      // Show tip after a short delay when athlete loads
      const timer = setTimeout(() => {
        setShowImageUpdateTip(true);
      }, 1500);

      // Auto-hide after 8 seconds
      const hideTimer = setTimeout(() => {
        setShowImageUpdateTip(false);
      }, 9500);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    } else {
      // Hide tip when no athlete is selected
      setShowImageUpdateTip(false);
    }
  }, [selectedAthlete]);

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });
  
  // Filter sports based on search terms
  const filteredSports = sports.filter(sport => 
    sport.name.toLowerCase().includes(sportSearchTerm.toLowerCase())
  );
  
  const filteredNutritionSports = sports.filter(sport => 
    sport.name.toLowerCase().includes(nutritionSportSearchTerm.toLowerCase())
  );
  
  const filteredDevelopmentSports = sports.filter(sport => 
    sport.name.toLowerCase().includes(developmentSportSearchTerm.toLowerCase())
  );

  // Handle creating athlete with AI
  const handleCreateAthleteWithAI = async (athleteName: string) => {
    if (!selectedSport || !athleteName.trim()) return;
    
    setIsSearching(true);
    setSearchProgress(0);
    setSearchProgressMessage("");
    
    // Progress simulation based on typical AI search stages
    const updateProgress = (progress: number, message: string) => {
      setSearchProgress(progress);
      setSearchProgressMessage(message);
    };

    try {
      // Stage 1: Initializing search
      updateProgress(10, t('athleteSearch.progress.starting'));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Validating sport information
      updateProgress(20, t('athleteSearch.progress.preparing'));
      await new Promise(resolve => setTimeout(resolve, 800));

      // Start the actual API request
      const startTime = Date.now();
      
      // Stage 3: AI search with improved progress management
      updateProgress(35, t('athleteSearch.progress.finding'));
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        // Determine if this is an individual sport for ranking search
        const isIndividualSport = selectedSport && ![
          'Football', 'Soccer', 'Basketball', 'Volleyball', 'Handball', 
          'Rugby', 'Cricket', 'Baseball', 'Softball', 'Hockey', 
          'Field Hockey', 'Ice Hockey', 'Water Polo', 'American Football',
          'Lacrosse', 'Netball', 'Australian Football', 'Gaelic Football'
        ].some(teamSport => 
          sports.find(s => s.id === selectedSport)?.name.toLowerCase().includes(teamSport.toLowerCase())
        );
        
        // Asymptotic progression that slows down but keeps moving
        // This ensures smooth progress even for long-running operations
        if (elapsed < 10000) { // First 10 seconds - personal info extraction
          const progress = 35 + (elapsed / 10000) * 20; // From 35% to 55%
          updateProgress(Math.min(progress, 55), t('athleteSearch.progress.searchingDatabase'));
        } else if (elapsed < 20000) { // Next 10 seconds - detailed extraction
          const progress = 55 + ((elapsed - 10000) / 10000) * 15; // From 55% to 70%
          updateProgress(Math.min(progress, 70), t('athleteSearch.progress.extractingDetails'));
        } else if (elapsed < 30000) { // Next 10 seconds - ranking search for individual sports
          const progress = 70 + ((elapsed - 20000) / 10000) * 10; // From 70% to 80%
          const message = isIndividualSport ? t('athleteSearch.progress.searchingRankings') : t('athleteSearch.progress.verifyingTeam');
          updateProgress(Math.min(progress, 80), message);
        } else if (elapsed < 45000) { // Next 15 seconds - image search
          const progress = 80 + ((elapsed - 30000) / 15000) * 10; // From 80% to 90%
          updateProgress(Math.min(progress, 90), t('athleteSearch.progress.findingImage'));
        } else if (elapsed < 65000) { // Next 20 seconds - final processing
          const progress = 90 + ((elapsed - 45000) / 20000) * 5; // From 90% to 95%
          updateProgress(Math.min(progress, 95), t('athleteSearch.progress.finalizing'));
        } else { // Beyond 65 seconds - very slow asymptotic approach to 97%
          const extraTime = elapsed - 65000;
          const progress = 95 + (2 * (1 - Math.exp(-extraTime / 30000))); // Asymptotically approaches 97%
          updateProgress(Math.min(progress, 96.5), t('athleteSearch.progress.saving'));
        }
      }, 400);

      const response = await fetch('/api/athletes/create-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: athleteName.trim(),
          sportId: selectedSport,
          nationality: selectedCountry // Pass selected nationality to improve AI search accuracy
        }),
      });

      clearInterval(progressInterval);

      if (response.ok) {
        updateProgress(95, t('athleteSearch.progress.building'));
        const newAthlete = await response.json();
        
        updateProgress(100, t('athleteSearch.progress.success'));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSelectedAthlete(newAthlete);
        setIsAthleteNewlyCreated(true);
        setSearchName(newAthlete.name);
        
        // Determine if this is an individual sport for ranking polling
        const isIndividualSport = selectedSport && ![
          'Football', 'Soccer', 'Basketball', 'Volleyball', 'Handball', 
          'Rugby', 'Cricket', 'Baseball', 'Softball', 'Hockey', 
          'Field Hockey', 'Ice Hockey', 'Water Polo', 'American Football',
          'Lacrosse', 'Netball', 'Australian Football', 'Gaelic Football'
        ].some(teamSport => 
          sports.find(s => s.id === selectedSport)?.name.toLowerCase().includes(teamSport.toLowerCase())
        );
        
        // Show success toast
        toast({
          title: t('common:toast.athleteCreated', 'Athlete Created'),
          description: `${newAthlete.name} has been added to our database${isIndividualSport ? '. Fetching rankings...' : ' with AI-powered insights.'}`,
        });
        
        // For individual sports, poll for ranking updates (fetched asynchronously)
        if (isIndividualSport) {
          console.log(`🏆 Starting polling for ${newAthlete.name}'s rankings...`);
          
          // Set loading state for rankings
          setRankingFetchStatus(prev => ({
            ...prev,
            [newAthlete.id]: { isLoading: true, currentPhase: 'Initializing ranking search...' }
          }));
          
          const rankingPoll = setInterval(async () => {
            try {
              const athleteResponse = await fetch(`/api/athletes/${newAthlete.id}`);
              if (athleteResponse.ok) {
                const updatedAthlete = await athleteResponse.json();
                
                // Check if rankings have been added
                if (updatedAthlete.rankings && updatedAthlete.rankings.categories && updatedAthlete.rankings.categories.length > 0) {
                  console.log(`✅ Rankings found via polling for ${newAthlete.name}:`, updatedAthlete.rankings);
                  setSelectedAthlete(updatedAthlete);
                  clearInterval(rankingPoll);
                  
                  // Clear loading state
                  setRankingFetchStatus(prev => {
                    const { [newAthlete.id]: _, ...rest } = prev;
                    return rest;
                  });
                  
                  // Show success toast
                  toast({
                    title: t('common:toast.rankingsUpdated', 'Rankings Updated!'),
                    description: t('common:toast.rankingsUpdatedDesc', `${newAthlete.name}'s ranking has been added successfully.`),
                  });
                }
              }
            } catch (error) {
              console.error('Error polling for rankings:', error);
            }
          }, 5000); // Poll every 5 seconds
        }
      } else {
        clearInterval(progressInterval);
        const error = await response.json();
        toast({
          title: t('common:toast.creationFailed', 'Creation Failed'),
          description: error.message || "Failed to create athlete with AI",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      toast({
        title: t('common:toast.loadAthletesError', 'Error'),
        description: t('common:toast.somethingWentWrong', 'Something went wrong while creating the athlete'),
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setSearchProgress(0);
      setSearchProgressMessage("");
    }
  };

  // Reset selected athlete when sport changes
  const handleSportChange = (sportId: string) => {
    setSelectedSport(sportId);
    setSelectedAthlete(null);
    setIsAthleteNewlyCreated(false);
    setSearchName("");
    // Sync with nutrition form to ensure bidirectional state consistency
    nutritionForm.setValue('sport', sportId, { shouldDirty: true, shouldValidate: true });
  };

  // Clear selected sport
  const handleClearSport = () => {
    setSelectedSport("");
    setSelectedAthlete(null);
    setIsAthleteNewlyCreated(false);
    setSearchName("");
    // Also clear the nutrition form's sport field to keep form state in sync
    nutritionForm.setValue('sport', '');
  };

  // Reset selected athlete when country changes
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country === "all" ? "" : country);
    setSelectedAthlete(null);
    setIsAthleteNewlyCreated(false);
  };

  // Handle manual ranking search for athlete
  const handleSearchAthleteRankings = async (athleteId: string) => {
    try {
      console.log(`🏆 Starting manual ranking search for athlete ${athleteId}...`);
      
      // Store the timestamp when we start the fetch
      const fetchStartTime = new Date().toISOString();
      
      // Determine if it's Taekwondo to show appropriate message
      const athleteSport = selectedAthlete ? sports.find(s => s.id === selectedAthlete.sportId) : null;
      const isTaekwondo = athleteSport?.name.toLowerCase().includes('taekwondo');
      const initialMessage = isTaekwondo 
        ? 'Fetching data from World Taekwondo API...' 
        : 'Analyzing rankings with autonomous web navigation...';
      
      // Set loading state immediately with sport-specific message
      setRankingFetchStatus(prev => ({
        ...prev,
        [athleteId]: { isLoading: true, currentPhase: initialMessage }
      }));
      
      const response = await fetch(`/api/athletes/${athleteId}/fetch-rankings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: t('common:toast.rankingSearchStarted', 'Ranking Search Started'),
          description: result.message || t('common:toast.rankingSearchStartedDesc', 'Searching for athlete rankings...'),
        });
        
        // Start polling for updated athlete data (no timeout - waits indefinitely)
        const rankingPoll = setInterval(async () => {
          try {
            const athleteResponse = await fetch(`/api/athletes/${athleteId}`);
            if (athleteResponse.ok) {
              const updatedAthlete = await athleteResponse.json();
              
              // Check if rankings have been added AND are fresh (after our fetch started)
              // Compare dates by converting both to date strings (YYYY-MM-DD) to handle cases where fetchedAt is just a date
              const fetchedDate = updatedAthlete.rankings?.fetchedAt ? new Date(updatedAthlete.rankings.fetchedAt).toISOString().split('T')[0] : null;
              const startDate = new Date(fetchStartTime).toISOString().split('T')[0];
              
              if (updatedAthlete.rankings && 
                  updatedAthlete.rankings.categories && 
                  updatedAthlete.rankings.categories.length > 0 &&
                  fetchedDate &&
                  fetchedDate >= startDate) {
                console.log(`✅ Rankings found via polling for athlete ${athleteId}:`, updatedAthlete.rankings);
                setSelectedAthlete(updatedAthlete);
                clearInterval(rankingPoll);
                
                // Clear loading state
                setRankingFetchStatus(prev => {
                  const { [athleteId]: _, ...rest } = prev;
                  return rest;
                });
                
                // Show success toast
                toast({
                  title: t('common:toast.rankingsUpdated', 'Rankings Updated!'),
                  description: t('common:toast.rankingsUpdatedDesc', `${updatedAthlete.name}'s ranking has been updated successfully.`),
                });
              }
            }
          } catch (error) {
            console.error('Error polling for rankings:', error);
          }
        }, 5000); // Poll every 5 seconds
        
      } else {
        const error = await response.json();
        // Clear loading state on error
        setRankingFetchStatus(prev => {
          const { [athleteId]: _, ...rest } = prev;
          return rest;
        });
        toast({
          title: t('common:toast.searchFailed', 'Search Failed'),
          description: error.message || t('common:toast.searchFailedDesc', 'Failed to start ranking search'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting ranking search:", error);
      // Clear loading state on network/fetch error
      setRankingFetchStatus(prev => {
        const { [athleteId]: _, ...rest } = prev;
        return rest;
      });
      toast({
        title: t('common:toast.loadAthletesError', 'Error'),
        description: "Something went wrong while starting ranking search",
        variant: "destructive",
      });
    }
  };

  // Handle searching for athlete image
  const handleSearchAthleteImage = async (athleteId: string) => {
    setIsSearchingImage(true);
    
    try {
      console.log(`🖼️ Starting image search for athlete ${athleteId}...`);
      
      const response = await fetch(`/api/athletes/${athleteId}/search-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Image search successful:`, result);
          
          // Refresh athlete data to show the new image
          const updatedAthleteResponse = await fetch(`/api/athletes/${athleteId}`);
          if (updatedAthleteResponse.ok) {
            const updatedAthlete = await updatedAthleteResponse.json();
            console.log(`🔄 Updated athlete data:`, updatedAthlete);
            setSelectedAthlete(updatedAthlete);
            
            toast({
              title: t('common:toast.imageFound', 'Image Found!'),
              description: t('common:toast.imageFoundDesc', `Profile image has been updated successfully. Found ${result.type || 'image'} URL.`),
            });
          } else {
            console.error(`❌ Failed to refresh athlete data`);
            toast({
              title: t('common:toast.imageFoundButUpdateFailed', 'Image Found but Update Failed'),
              description: t('common:toast.imageFoundButUpdateFailedDesc', "Found an image but couldn't refresh the profile data."),
              variant: "destructive",
            });
          }
        } else {
          console.log(`❌ Image search failed:`, result);
          toast({
            title: t('common:toast.noImageFound', 'No Image Found'),
            description: result.message || t('common:toast.noImageFoundDesc', 'Could not find a suitable profile image.'),
            variant: "destructive",
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: t('common:toast.imageSearchFailed', 'Search Failed'),
          description: error.message || "Failed to search for profile image",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching for athlete image:', error);
      toast({
        title: t('common:toast.loadAthletesError', 'Error'),
        description: "Something went wrong while searching for the image",
        variant: "destructive",
      });
    } finally {
      setIsSearchingImage(false);
    }
  };

  const services = [
    {
      id: "bio",
      title: t('services.bioAnalysis.title'),
      description: t('services.bioAnalysis.description'),
      cost: 50,
      icon: "user-alt",
      color: "text-athlete-accent"
    },
    {
      id: "rank",
      title: t('services.rankHistory.title'),
      description: t('services.rankHistory.description'),
      cost: 70,
      icon: "trophy",
      color: "text-athlete-warning"
    },
    {
      id: "strengths",
      title: t('services.strengths.title'),
      description: t('services.strengths.description'),
      cost: 50,
      icon: "muscle",
      color: "text-athlete-success"
    },
    {
      id: "weaknesses",
      title: t('services.weaknesses.title'),
      description: t('services.weaknesses.description'),
      cost: 50,
      icon: "exclamation-triangle",
      color: "text-athlete-danger"
    },
    {
      id: "beat-strategies",
      title: t('services.tacticRecommendations.title'),
      description: t('services.tacticRecommendations.description'),
      cost: 100,
      icon: "chess",
      color: "text-red-400"
    },
    {
      id: "statistics",
      title: t('services.statistics.title', 'Statistics'),
      description: t('services.statistics.description', 'Comprehensive performance statistics and metrics analysis'),
      cost: 60,
      icon: "bar-chart",
      color: "text-blue-400"
    }
  ];

  // Expose trigger analysis function for queue retries and cancellation function
  useEffect(() => {
    // Function to handle cancellation from queue
    (window as any).cancelGeneration = (athleteName: string, serviceType: string) => {
      // Trigger a custom event that service cards can listen to
      const event = new CustomEvent('cancel-generation', {
        detail: { athleteName, serviceType }
      });
      window.dispatchEvent(event);
    };

    (window as any).triggerAnalysis = async (athleteName: string, serviceType: string) => {
      // Find the athlete in current context
      if (selectedAthlete?.name === athleteName) {
        // Find the service and trigger it
        const service = services.find(s => s.id === serviceType);
        if (service) {
          try {
            const response = await fetch(`/api/analysis/${selectedAthlete.id}/${serviceType}`, {
              method: 'POST',
              credentials: 'include',
            });
            
            if (response.ok) {
              const result = await response.json();
              // Update queue with success
              (window as any).generationQueue?.update?.(
                `gen_${Date.now()}_retry`,
                { 
                  status: 'completed', 
                  result: { ...result, serviceType, athleteName }
                }
              );
            } else {
              const error = await response.json();
              // Update queue with error
              (window as any).generationQueue?.update?.(
                `gen_${Date.now()}_retry`,
                { 
                  status: 'error', 
                  error: error.message || 'Failed to regenerate analysis'
                }
              );
            }
          } catch (error) {
            console.error('Retry analysis failed:', error);
          }
        }
      }
    };

    return () => {
      delete (window as any).triggerAnalysis;
      delete (window as any).cancelGeneration;
    };
  }, [selectedAthlete, services]);

  return (
    <div className="container mx-auto px-3 sm:px-4 pt-16 sm:pt-20">
          {/* Welcome Section */}
          <div className="text-center mb-8 sm:mb-12 px-2">
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 text-white">
{t('interface.welcome')}
            </h1>
            <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8">
{t('interface.tagline')}
            </p>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <div className="mb-6 sm:mb-8 overflow-x-auto sm:overflow-x-visible">
              <TabsList className="inline-flex w-full sm:grid sm:grid-cols-4 bg-athlete-gray-800 min-w-max sm:min-w-0 h-11 p-0">
                <TabsTrigger 
                  value="analysis" 
                  data-testid="tab-analysis"
                  className="data-[state=active]:bg-athlete-accent flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm h-11"
                >
                  <BarChart3 size={14} className="sm:w-4 sm:h-4" />
                  {t('interface.athleteAnalysis')}
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  data-testid="tab-comparison"
                  className="data-[state=active]:bg-athlete-accent flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm h-11"
                >
                  <Users size={14} className="sm:w-4 sm:h-4" />
                  {t('interface.compareAthletes')}
                </TabsTrigger>
                <TabsTrigger 
                  value="nutrition" 
                  data-testid="tab-nutrition"
                  className="data-[state=active]:bg-athlete-accent flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm h-11"
                >
                  <Apple size={14} className="sm:w-4 sm:h-4" />
                  {t('interface.nutritionPlan')}
                </TabsTrigger>
                <TabsTrigger 
                  value="development" 
                  data-testid="tab-development"
                  className="data-[state=active]:bg-athlete-accent flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm h-11"
                >
                  <CalendarDays size={14} className="sm:w-4 sm:h-4" />
                  {t('interface.developmentPlan')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="analysis" className="space-y-8">
              {/* Sport & Athlete Selection */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('interface.selectSportAthlete')}</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">{t('interface.sport')}</label>
                  <div className="flex gap-2">
                    <Popover open={sportDropdownOpen} onOpenChange={setSportDropdownOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={sportDropdownOpen}
                          className="bg-athlete-gray-700 border-gray-600 text-white flex-1 justify-between hover:bg-athlete-gray-600"
                          data-testid="select-sport"
                        >
                          {selectedSport
                            ? sports.find(s => s.id === selectedSport)?.name
                            : t('interface.chooseASport')}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 bg-athlete-gray-700 border-gray-600" align="start">
                        <div className="p-3 border-b border-gray-600">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Search sports..."
                              value={sportSearchTerm}
                              onChange={(e) => setSportSearchTerm(e.target.value)}
                              className="pl-9 bg-athlete-gray-700 border-athlete-gray-600 text-white placeholder:text-gray-400 focus:bg-athlete-gray-700 focus:border-athlete-gray-500"
                              data-testid="input-sport-search"
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-auto">
                          {filteredSports.length === 0 ? (
                            <div className="p-3 text-center text-gray-400">
                              No sports found.
                            </div>
                          ) : (
                            filteredSports.map((sportItem) => (
                              <div
                                key={sportItem.id}
                                className="flex items-center px-3 py-2 cursor-pointer hover:bg-athlete-gray-600 text-white"
                                onClick={() => {
                                  handleSportChange(sportItem.id);
                                  setSportDropdownOpen(false);
                                  setSportSearchTerm("");
                                }}
                                data-testid={`option-sport-${sportItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <Check className={`mr-2 h-4 w-4 ${selectedSport === sportItem.id ? "opacity-100" : "opacity-0"}`} />
                                {sportItem.name}
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {selectedSport && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearSport}
                        className="bg-athlete-gray-700 border-gray-600 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                        data-testid="clear-sport-button"
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">{t('interface.country')}</label>
                  <CountrySelect
                    value={selectedCountry || "all"}
                    onValueChange={handleCountryChange}
                    placeholder={t('interface.allCountries')}
                    countries={countries}
                    testId="select-country"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">{t('interface.athleteName')}</label>
                  <div className="relative">
                    <Input
                      data-testid="search-athlete-name"
                      placeholder={t('interface.searchAthlete')}
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="bg-athlete-gray-700 border-gray-600 text-white pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    {isSearchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin w-4 h-4 border-2 border-athlete-accent border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Dropdown for search results */}
                  {searchName.trim() && availableAthletes.length > 0 && (
                    <div className="mt-2 bg-athlete-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {availableAthletes.map((athlete) => (
                        <button
                          key={athlete.id}
                          data-testid={`athlete-option-${athlete.id}`}
                          onClick={() => {
                            setSelectedAthlete(athlete);
                            setIsAthleteNewlyCreated(false);
                            setSearchName("");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-athlete-gray-600 text-white border-b border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium">
                            {athlete.name}
                          </div>
                          {athlete.country && (
                            <div className="text-sm text-gray-400">{athlete.country}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchName.trim() && !isSearchLoading && availableAthletes.length === 0 && 
                   (!selectedAthlete || searchName.trim().toLowerCase() !== selectedAthlete.name.toLowerCase()) && (
                    <div className="mt-4">
                      {isSearching ? (
                        /* Premium AI Search Loading State */
                        <div className="bg-gradient-to-br from-athlete-gray-700/90 to-athlete-gray-800/90 border border-athlete-accent/20 rounded-xl p-8 text-center backdrop-blur-sm shadow-2xl">
                          {/* Enhanced Progress Circle */}
                          <div className="flex flex-col items-center space-y-6">
                            <div className="relative">
                              {/* Outer glow ring */}
                              <div className="absolute inset-0 bg-athlete-accent/20 rounded-full blur-md animate-pulse" style={{ width: '80px', height: '80px' }} />
                              
                              {/* Main progress circle */}
                              <div className="relative w-20 h-20 flex items-center justify-center">
                                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                                  {/* Background circle with gradient */}
                                  <defs>
                                    <linearGradient id="progress-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="rgb(75, 85, 99)" stopOpacity="0.3" />
                                      <stop offset="100%" stopColor="rgb(55, 65, 81)" stopOpacity="0.6" />
                                    </linearGradient>
                                    <linearGradient id="progress-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="rgb(34, 197, 94)" />
                                      <stop offset="50%" stopColor="rgb(16, 185, 129)" />
                                      <stop offset="100%" stopColor="rgb(6, 182, 212)" />
                                    </linearGradient>
                                  </defs>
                                  <path
                                    stroke="url(#progress-bg)"
                                    strokeWidth="2.5"
                                    fill="none"
                                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  {/* Animated progress path */}
                                  <path
                                    stroke="url(#progress-fill)"
                                    strokeWidth="2.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(searchProgress || 0) * 100 / 100}, 100`}
                                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                                    className="transition-all duration-500 ease-out"
                                    style={{
                                      filter: 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.4))'
                                    }}
                                  />
                                </svg>
                                
                                {/* Progress percentage */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-lg font-bold text-white bg-athlete-gray-800/80 rounded-full w-12 h-12 flex items-center justify-center text-xs backdrop-blur-sm">
                                    {Math.round(searchProgress || 0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status message with icon */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-2 h-2 bg-athlete-accent rounded-full animate-ping" />
                                <span className="text-lg font-semibold text-white">
                                  {t('athleteSearch.aiSearching.title')}
                                </span>
                              </div>
                              <p className="text-athlete-accent font-medium text-sm max-w-sm mx-auto leading-relaxed" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                                {i18n.language === 'ar' ? (
                                  <>
                                    <AnimatedDots isRTL={true} />
                                    {searchProgressMessage || t('athleteSearch.aiSearching.initializing')}
                                  </>
                                ) : (
                                  <>
                                    {searchProgressMessage || t('athleteSearch.aiSearching.initializing')}
                                    <AnimatedDots isRTL={false} />
                                  </>
                                )}
                              </p>
                            </div>
                            
                            {/* Subtle animated background elements */}
                            <div className="absolute top-4 right-4 w-16 h-16 bg-athlete-accent/5 rounded-full animate-pulse" />
                            <div className="absolute bottom-4 left-4 w-12 h-12 bg-blue-400/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                          </div>
                        </div>
                      ) : (
                        /* Enhanced Not Found State */
                        <div className="bg-gradient-to-br from-athlete-gray-700 to-athlete-gray-800 border border-gray-500/30 rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transition-all duration-300">
                          {/* Icon */}
                          <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-athlete-gray-600/50 rounded-full flex items-center justify-center border border-gray-500/20">
                              <Search className="w-8 h-8 text-gray-400" />
                            </div>
                          </div>
                          
                          {/* Title */}
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {t('athleteSearch.notFound.title')}
                          </h3>
                          
                          {/* Description */}
                          <p className="text-gray-300 mb-6 text-sm leading-relaxed max-w-sm mx-auto">
                            {t('athleteSearch.notFound.description', { name: searchName.trim() })}
                          </p>
                          
                          {/* Enhanced CTA Button */}
                          <Button
                            data-testid="create-athlete-ai"
                            onClick={() => handleCreateAthleteWithAI(searchName.trim())}
                            className="bg-gradient-to-r from-athlete-accent to-green-500 hover:from-athlete-accent/90 hover:to-green-500/90 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            disabled={!selectedSport || isSearching}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                                <Search className="w-3 h-3" />
                              </div>
                              <span>{t('athleteSearch.notFound.button')}</span>
                            </div>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
                </CardContent>
              </Card>

              {/* Current Athlete Display */}
              {selectedAthlete && (
                <TooltipProvider>
                  <div>
                    {/* Last Update Timestamp - Above Card */}
                    {selectedAthlete.updatedAt && (
                      <div className="flex justify-end mb-2">
                        <div className={`flex items-center ${i18n.language === 'ar' ? 'gap-3 flex-row-reverse px-4 py-2' : 'gap-2 px-3 py-1.5'} bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-600/40`}>
                          <CalendarDays className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <p className={`font-medium text-gray-300 whitespace-nowrap ${i18n.language === 'ar' ? 'text-base' : 'text-sm'}`}>
                            <span>{t('interface.lastUpdate')}: </span>
                            <span className="text-blue-400">{new Date(selectedAthlete.updatedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <Card 
                      className="bg-athlete-gray-700 border-gray-600"
                    >
                      <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col items-start space-y-3">
                        {/* Profile Image */}
                        <div className="relative w-16 h-16 flex-shrink-0">
                          {selectedAthlete.profileImageUrl ? (
                            <img 
                              src={selectedAthlete.profileImageUrl}
                              alt="Athlete profile" 
                              className="w-16 h-16 rounded-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget;
                                const fallback = img.parentElement?.querySelector('.profile-fallback') as HTMLElement;
                                if (fallback) {
                                  img.style.display = 'none';
                                  fallback.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            className={`profile-fallback w-16 h-16 rounded-full bg-athlete-gray-600 flex items-center justify-center absolute top-0 left-0 ${selectedAthlete.profileImageUrl ? 'hidden' : 'flex'}`}
                          >
                            <User className="text-gray-400" size={24} />
                          </div>
                        </div>
                        
                        {/* Action Buttons Container */}
                        <div className="relative flex flex-col gap-1">
                          {/* Image Search Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                data-testid="button-search-image"
                                onClick={() => {
                                  handleSearchAthleteImage(selectedAthlete.id);
                                  setShowImageUpdateTip(false);
                                }}
                                size="sm"
                                variant="outline"
                                className="bg-athlete-gray-600 border-gray-500 text-gray-300 hover:bg-athlete-gray-500 hover:text-white text-xs px-2 py-1 h-6 relative w-full"
                                disabled={isSearchingImage}
                              >
                                {isSearchingImage ? (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    <span>{t('athleteSearch.imageUpdate.searching')}</span>
                                  </div>
                                ) : (
                                  <>
                                    <Search className="mr-1 h-3 w-3" />
                                    {selectedAthlete.profileImageUrl ? t('athleteSearch.imageUpdate.updateButton') : t('athleteSearch.imageUpdate.findButton')}
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <p className="mb-1">{t('athleteSearch.imageUpdate.popup.question', { name: i18n.language === 'ar' && selectedAthlete.nameArabic ? selectedAthlete.nameArabic : selectedAthlete.name })}</p>
                                <p className="text-gray-300">{t('athleteSearch.imageUpdate.popup.help')}</p>
                                <p className="text-xs text-green-400 mt-1 font-semibold">(No token deduction)</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          
                          {/* Manual Ranking Search Button - Only show for existing athletes */}
                          {!isAthleteNewlyCreated && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  data-testid="button-search-rankings"
                                  onClick={() => handleSearchAthleteRankings(selectedAthlete.id)}
                                  size="sm"
                                  variant="outline"
                                  className="bg-amber-600/20 border-amber-500/50 text-amber-300 hover:bg-amber-600/30 hover:text-amber-200 text-xs px-2 py-1 h-6 w-full"
                                  disabled={rankingFetchStatus[selectedAthlete.id]?.isLoading}
                                >
                                  {rankingFetchStatus[selectedAthlete.id]?.isLoading ? (
                                    <div className="flex items-center space-x-1">
                                      <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                                      <span className="text-xs">{rankingFetchStatus[selectedAthlete.id]?.currentPhase || t('athleteSearch.rankingUpdate.updating')}</span>
                                    </div>
                                  ) : (
                                    <>
                                      <Trophy className="mr-1 h-3 w-3" />
                                      {t('athleteSearch.rankingUpdate.updateButton')}
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div>
                                  <p>{t('athleteSearch.rankingUpdate.tooltip.help', { name: i18n.language === 'ar' && selectedAthlete.nameArabic ? selectedAthlete.nameArabic : selectedAthlete.name })}</p>
                                  <p className="text-xs text-green-400 mt-1 font-semibold">{t('athleteSearch.rankingUpdate.tooltip.noTokens')}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {/* Image Update Tip Popup */}
                          {showImageUpdateTip && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 w-max max-w-[280px]">
                              <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow-xl border border-blue-400 relative animate-in slide-in-from-top-2 duration-300">
                                {/* Arrow pointing up to button */}
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
                                  <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-blue-600"></div>
                                </div>
                                
                                <div className="text-sm font-medium">
                                  <p className="mb-1">{t('athleteSearch.imageUpdate.popup.question', { name: i18n.language === 'ar' && selectedAthlete.nameArabic ? selectedAthlete.nameArabic : selectedAthlete.name })}</p>
                                  <p className="text-blue-100">{t('athleteSearch.imageUpdate.popup.help')}</p>
                                  <p className="text-xs text-blue-200 mt-1 font-semibold">{t('athleteSearch.imageUpdate.popup.noTokens')}</p>
                                </div>
                                
                                {/* Close button */}
                                <button
                                  onClick={() => setShowImageUpdateTip(false)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xs transition-colors"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 ml-4">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1" style={{ minWidth: '200px' }}>
                              <h3 className="text-xl font-bold text-white whitespace-normal">
                                {selectedAthlete.name}
                              </h3>
                              <p className="text-gray-400 capitalize flex items-center gap-2">
                                <Flag country={selectedAthlete.country || "US"} className="w-6 h-4 rounded shadow-sm" />
                                {selectedAthlete.country || "Unknown Country"}
                              </p>
                            </div>
                            
                            {/* Rankings Display - aligned with name */}
                            <div className="flex flex-wrap items-start justify-end gap-2">
                              {selectedAthlete.rankings?.categories && selectedAthlete.rankings.categories.length > 0 ? (
                                selectedAthlete.rankings.categories.map((rankInfo, index) => {
                                  // Determine rank type and color from the category text
                                  const isOlympic = rankInfo.category.toLowerCase().includes('olympic');
                                  const isWorld = rankInfo.category.toLowerCase().includes('world');
                                  const isContinental = rankInfo.category.toLowerCase().includes('continental') || 
                                                       rankInfo.category.toLowerCase().includes('asian') || 
                                                       rankInfo.category.toLowerCase().includes('european') ||
                                                       rankInfo.category.toLowerCase().includes('african') ||
                                                       rankInfo.category.toLowerCase().includes('pan american');
                                  const isNational = rankInfo.category.toLowerCase().includes('national');
                                  
                                  // Determine if top 3 rank
                                  const rankNum = parseInt(rankInfo.rank);
                                  const isTop3 = rankNum >= 1 && rankNum <= 3;
                                  
                                  // Choose color scheme based on rank type
                                  let bgColor, borderColor, textColor, categoryTextColor, testId, medalEmoji;
                                  
                                  if (isOlympic) {
                                    testId = 'rank-olympic';
                                    if (rankNum === 1) {
                                      bgColor = 'bg-gradient-to-br from-yellow-400/30 via-amber-500/30 to-yellow-600/30';
                                      borderColor = 'border-yellow-400';
                                      textColor = 'text-yellow-300';
                                      categoryTextColor = 'text-yellow-200/90';
                                      medalEmoji = '🥇';
                                    } else if (rankNum === 2) {
                                      bgColor = 'bg-gradient-to-br from-gray-300/30 via-slate-400/30 to-gray-500/30';
                                      borderColor = 'border-gray-300';
                                      textColor = 'text-gray-200';
                                      categoryTextColor = 'text-gray-300/90';
                                      medalEmoji = '🥈';
                                    } else if (rankNum === 3) {
                                      bgColor = 'bg-gradient-to-br from-orange-400/30 via-amber-600/30 to-orange-700/30';
                                      borderColor = 'border-orange-400';
                                      textColor = 'text-orange-300';
                                      categoryTextColor = 'text-orange-200/90';
                                      medalEmoji = '🥉';
                                    } else {
                                      bgColor = 'bg-yellow-500/15';
                                      borderColor = 'border-yellow-500/60';
                                      textColor = 'text-yellow-300';
                                      categoryTextColor = 'text-yellow-200/70';
                                    }
                                  } else if (isWorld) {
                                    testId = 'rank-world';
                                    if (rankNum === 1) {
                                      bgColor = 'bg-gradient-to-br from-yellow-400/30 via-amber-500/30 to-yellow-600/30';
                                      borderColor = 'border-yellow-400';
                                      textColor = 'text-yellow-300';
                                      categoryTextColor = 'text-yellow-200/90';
                                      medalEmoji = '🥇';
                                    } else if (rankNum === 2) {
                                      bgColor = 'bg-gradient-to-br from-gray-300/30 via-slate-400/30 to-gray-500/30';
                                      borderColor = 'border-gray-300';
                                      textColor = 'text-gray-200';
                                      categoryTextColor = 'text-gray-300/90';
                                      medalEmoji = '🥈';
                                    } else if (rankNum === 3) {
                                      bgColor = 'bg-gradient-to-br from-orange-400/30 via-amber-600/30 to-orange-700/30';
                                      borderColor = 'border-orange-400';
                                      textColor = 'text-orange-300';
                                      categoryTextColor = 'text-orange-200/90';
                                      medalEmoji = '🥉';
                                    } else {
                                      bgColor = 'bg-orange-500/15';
                                      borderColor = 'border-orange-500/60';
                                      textColor = 'text-orange-300';
                                      categoryTextColor = 'text-orange-200/70';
                                    }
                                  } else if (isContinental) {
                                    testId = 'rank-continental';
                                    if (rankNum === 1) {
                                      bgColor = 'bg-gradient-to-br from-yellow-400/30 via-amber-500/30 to-yellow-600/30';
                                      borderColor = 'border-yellow-400';
                                      textColor = 'text-yellow-300';
                                      categoryTextColor = 'text-yellow-200/90';
                                      medalEmoji = '🥇';
                                    } else if (rankNum === 2) {
                                      bgColor = 'bg-gradient-to-br from-gray-300/30 via-slate-400/30 to-gray-500/30';
                                      borderColor = 'border-gray-300';
                                      textColor = 'text-gray-200';
                                      categoryTextColor = 'text-gray-300/90';
                                      medalEmoji = '🥈';
                                    } else if (rankNum === 3) {
                                      bgColor = 'bg-gradient-to-br from-orange-400/30 via-amber-600/30 to-orange-700/30';
                                      borderColor = 'border-orange-400';
                                      textColor = 'text-orange-300';
                                      categoryTextColor = 'text-orange-200/90';
                                      medalEmoji = '🥉';
                                    } else {
                                      bgColor = 'bg-green-500/15';
                                      borderColor = 'border-green-500/60';
                                      textColor = 'text-green-300';
                                      categoryTextColor = 'text-green-200/70';
                                    }
                                  } else if (isNational) {
                                    testId = 'rank-national';
                                    if (rankNum === 1) {
                                      bgColor = 'bg-gradient-to-br from-yellow-400/30 via-amber-500/30 to-yellow-600/30';
                                      borderColor = 'border-yellow-400';
                                      textColor = 'text-yellow-300';
                                      categoryTextColor = 'text-yellow-200/90';
                                      medalEmoji = '🥇';
                                    } else if (rankNum === 2) {
                                      bgColor = 'bg-gradient-to-br from-gray-300/30 via-slate-400/30 to-gray-500/30';
                                      borderColor = 'border-gray-300';
                                      textColor = 'text-gray-200';
                                      categoryTextColor = 'text-gray-300/90';
                                      medalEmoji = '🥈';
                                    } else if (rankNum === 3) {
                                      bgColor = 'bg-gradient-to-br from-orange-400/30 via-amber-600/30 to-orange-700/30';
                                      borderColor = 'border-orange-400';
                                      textColor = 'text-orange-300';
                                      categoryTextColor = 'text-orange-200/90';
                                      medalEmoji = '🥉';
                                    } else {
                                      bgColor = 'bg-blue-500/15';
                                      borderColor = 'border-blue-500/60';
                                      textColor = 'text-blue-300';
                                      categoryTextColor = 'text-blue-200/70';
                                    }
                                  }
                                  
                                  return (
                                    <div 
                                      key={index}
                                      className={`relative ${bgColor} border-2 ${borderColor} rounded-lg px-2 py-1 ${isTop3 ? 'shadow-lg' : 'shadow-md'} hover:scale-105 transition-transform duration-200 w-full max-w-xs`} 
                                      data-testid={testId}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        {medalEmoji && (
                                          <span className={`text-lg flex-shrink-0 ${isTop3 ? 'animate-pulse' : ''}`}>{medalEmoji}</span>
                                        )}
                                        {!medalEmoji && <Trophy className={`w-3.5 h-3.5 flex-shrink-0 ${textColor}`} />}
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <div className="flex items-baseline gap-1">
                                            <span className={`${textColor} font-black ${isTop3 ? 'text-lg' : 'text-base'} leading-none`}>
                                              #{rankInfo.rank}
                                            </span>
                                          </div>
                                          <span className={`${categoryTextColor} text-[9px] font-semibold leading-tight truncate`}>
                                            {rankInfo.category}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <>
                                  {selectedAthlete.olympicRank ? (
                                    <div className="flex items-center space-x-1 bg-yellow-500/20 border-2 border-yellow-400 px-2 py-1 rounded-lg" data-testid="rank-olympic">
                                      <Trophy className="w-3 h-3 text-yellow-300" />
                                      <span className="text-yellow-300 font-bold text-xs">Olympic #{selectedAthlete.olympicRank}</span>
                                    </div>
                                  ) : null}
                                  {selectedAthlete.rank ? (
                                    <div className="flex items-center space-x-1 bg-orange-500/20 border-2 border-orange-400 px-2 py-1 rounded-lg" data-testid="rank-world">
                                      <Trophy className="w-3 h-3 text-orange-300" />
                                      <span className="text-orange-300 font-bold text-xs">World #{selectedAthlete.rank}</span>
                                    </div>
                                  ) : null}
                                  {selectedAthlete.continentalRank ? (
                                    <div className="flex items-center space-x-1 bg-green-500/20 border-2 border-green-400 px-2 py-1 rounded-lg" data-testid="rank-continental">
                                      <Trophy className="w-3 h-3 text-green-300" />
                                      <span className="text-green-300 font-bold text-xs">Continental #{selectedAthlete.continentalRank}</span>
                                    </div>
                                  ) : null}
                                  {selectedAthlete.nationalRank ? (
                                    <div className="flex items-center space-x-1 bg-blue-500/20 border-2 border-blue-400 px-2 py-1 rounded-lg" data-testid="rank-national">
                                      <TrendingUp className="w-3 h-3 text-blue-300" />
                                      <span className="text-blue-300 font-bold text-xs">National #{selectedAthlete.nationalRank}</span>
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                          {/* Personal Information Badges */}
                          {selectedAthlete.personalInfo && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedAthlete.personalInfo.age && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-blue-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-blue-500/20 rounded-full">
                                    <span className="text-[10px] text-blue-400">📅</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Age</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.age}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.height && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-yellow-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-yellow-500/20 rounded-full">
                                    <Ruler className="text-yellow-400" size={10} />
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Height</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.height}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.position && selectedAthlete.personalInfo.position !== "N/A" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-purple-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-purple-500/20 rounded-full">
                                    <span className="text-[10px] text-purple-400">{selectedSport && ['taekwondo', 'boxing', 'athletics', 'tennis', 'golf', 'swimming'].some(sport => 
                                      sports.find(s => s.id === selectedSport)?.name.toLowerCase().includes(sport)
                                    ) ? '🥋' : '🏆'}</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">
                                    {selectedSport && ['taekwondo', 'boxing', 'athletics', 'tennis', 'golf', 'swimming'].some(sport => 
                                      sports.find(s => s.id === selectedSport)?.name.toLowerCase().includes(sport)
                                    ) ? 'Weight Category' : 'Position'}
                                  </span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.position}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.club && selectedAthlete.personalInfo.club !== "N/A" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-green-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-green-500/20 rounded-full">
                                    <Shield className="text-green-400" size={10} />
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Club</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.club}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.category && selectedAthlete.personalInfo.category !== "N/A" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-orange-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-orange-500/20 rounded-full">
                                    <span className="text-[10px] text-orange-400">⚖️</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Category</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.category}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.dateOfBirth && selectedAthlete.personalInfo.dateOfBirth !== "N/A" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-pink-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-pink-500/20 rounded-full">
                                    <span className="text-[10px] text-pink-400">🎂</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Birth</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.dateOfBirth}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.educationalBackground && selectedAthlete.personalInfo.educationalBackground !== "N/A" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-indigo-400/60 transition-all duration-200 w-fit max-w-full">
                                  <div className="flex items-center justify-center w-4 h-4 bg-indigo-500/20 rounded-full flex-shrink-0">
                                    <span className="text-[10px] text-indigo-400">🎓</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium flex-shrink-0">Education</span>
                                  <span className="text-xs font-bold text-white" title={selectedAthlete.personalInfo.educationalBackground}>
                                    {selectedAthlete.personalInfo.educationalBackground}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                </TooltipProvider>
              )}

              {/* Service Boxes Grid */}
              {selectedAthlete && (
                <div>
                  <h2 className="text-3xl font-bold text-center mb-8 text-white">{t('interface.analysisServices')}</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {services.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        athlete={selectedAthlete}
                        onInsufficientTokens={() => setShowTokenModal(true)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!selectedAthlete && (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{t('interface.readyToAnalyze.title')}</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    {t('interface.readyToAnalyze.description')}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-8">
              <AthleteComparison preloadedComparisonData={comparisonData} />
            </TabsContent>

            <TabsContent value="nutrition" className="space-y-8">
              {showNutritionForm ? (
                /* Nutrition Plan Form */
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardContent className="p-8">
                    <div className={`flex justify-between items-center mb-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <h2 className="text-2xl font-bold text-white">{t('nutritionPlan.title')}</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewModal({ open: true, serviceType: 'nutrition-plan' })}
                        disabled={previewLoading && previewModal.serviceType === 'nutrition-plan'}
                        className={`border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 ${isArabic ? 'flex-row-reverse' : ''}`}
                        data-testid="button-preview-nutrition-form"
                      >
                        {previewLoading && previewModal.serviceType === 'nutrition-plan' ? (
                          <Loader2 className={`h-4 w-4 animate-spin ${isArabic ? 'ml-2' : 'mr-2'}`} />
                        ) : (
                          <HelpCircle className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                        )}
                        {t('common:buttons.preview')}
                      </Button>
                    </div>
                  
                  <Form {...nutritionForm}>
                    <form onSubmit={nutritionForm.handleSubmit(onSubmitNutritionPlan)} className="space-y-6">
                      {/* Goal Input (Required) - Full Width Row */}
                      <FormField
                        control={nutritionForm.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.goal')} *</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-nutrition-goal"
                                placeholder={t('nutritionPlan.goalPlaceholder')}
                                className="bg-athlete-gray-700 border-gray-600 text-white min-h-[120px] resize-y overflow-y-auto"
                                maxLength={1000}
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Sport Selection (Optional) */}
                        <FormField
                          control={nutritionForm.control}
                          name="sport"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.sport')}</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Popover open={nutritionSportDropdownOpen} onOpenChange={setNutritionSportDropdownOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={nutritionSportDropdownOpen}
                                        className="bg-athlete-gray-700 border-gray-600 text-white flex-1 justify-between hover:bg-athlete-gray-600"
                                        data-testid="select-nutrition-sport"
                                      >
                                        {(selectedSport || field.value)
                                          ? sports.find(s => s.id === (selectedSport || field.value))?.name
                                          : t('interface.chooseASport')}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 bg-athlete-gray-700 border-gray-600" align="start">
                                      <div className="p-3 border-b border-gray-600">
                                        <div className="relative">
                                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                          <Input
                                            placeholder="Search sports..."
                                            value={nutritionSportSearchTerm}
                                            onChange={(e) => setNutritionSportSearchTerm(e.target.value)}
                                            className="pl-9 bg-athlete-gray-700 border-athlete-gray-600 text-white placeholder:text-gray-400 focus:bg-athlete-gray-700 focus:border-athlete-gray-500"
                                            data-testid="input-nutrition-sport-search"
                                          />
                                        </div>
                                      </div>
                                      <div className="max-h-60 overflow-auto">
                                        {filteredNutritionSports.length === 0 ? (
                                          <div className="p-3 text-center text-gray-400">
                                            No sports found.
                                          </div>
                                        ) : (
                                          filteredNutritionSports.map((sportItem) => (
                                            <div
                                              key={sportItem.id}
                                              className="flex items-center px-3 py-2 cursor-pointer hover:bg-athlete-gray-600 text-white"
                                              onClick={() => {
                                                field.onChange(sportItem.id);
                                                setSelectedSport(sportItem.id);
                                                // Clear athlete selection when sport changes in form
                                                if (sportItem.id !== selectedSport) {
                                                  setSelectedAthlete(null);
                                                  setSearchName("");
                                                }
                                                setNutritionSportDropdownOpen(false);
                                                setNutritionSportSearchTerm("");
                                              }}
                                              data-testid={`option-nutrition-sport-${sportItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                                            >
                                              <Check className={`mr-2 h-4 w-4 ${(selectedSport || field.value) === sportItem.id ? "opacity-100" : "opacity-0"}`} />
                                              {sportItem.name}
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        field.onChange('');
                                        setSelectedSport('');
                                        setSelectedAthlete(null);
                                        setSearchName('');
                                      }}
                                      className="bg-athlete-gray-700 border-gray-600 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                                      data-testid="clear-nutrition-sport-button"
                                    >
                                      <X size={16} />
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Age (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.age')} *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-nutrition-age"
                                  type="number"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Height (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.height')} *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-nutrition-height"
                                  type="number"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Current Weight (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="currentWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.currentWeight')} *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-current-weight"
                                  type="number"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Target Weight (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="targetWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.targetWeight')} *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-target-weight"
                                  type="number"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Country Selection (Required) */}
                        <FormField
                          control={nutritionForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.country')} *</FormLabel>
                              <FormControl>
                                <CountrySelect
                                  value={field.value || ""}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedCountry(value);
                                  }}
                                  placeholder={t('interface.selectCountry')}
                                  countries={countries}
                                  testId="select-nutrition-country"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Period in Weeks (Optional) */}
                        <FormField
                          control={nutritionForm.control}
                          name="period"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.period')}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-nutrition-period"
                                  type="number"
                                  placeholder=""
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-6 grid md:grid-cols-2 gap-6">
                        {/* InBody Report Upload (Optional) */}
                        <FormField
                          control={nutritionForm.control}
                          name="inbodyReport"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.inbodyReport')}</FormLabel>
                              <FormControl>
                                <Input
                                  data-testid="input-inbody-report"
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                  onChange={(e) => field.onChange(e.target.files?.[0])}
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Language Selection */}
                        <FormField
                          control={nutritionForm.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-300 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('nutritionPlan.language')}</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger 
                                    data-testid="select-nutrition-language"
                                    className="bg-athlete-gray-700 border-gray-600 text-white"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-athlete-gray-700 border-gray-600">
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="ar">العربية</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Progress tracking for nutrition plan generation */}
                      {nutritionJobId && (
                        <div className="mb-6 p-6 bg-athlete-gray-750 border border-gray-600 rounded-lg shadow-lg">
                          <div className="space-y-4">
                            {/* Progress message with dynamic animation */}
                            <div className="flex items-center justify-center space-x-3">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-0"></div>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300"></div>
                              </div>
                              <p className="text-lg font-medium text-emerald-200 text-center">
                                {nutritionJobProgressMessage || t('common:messages.generatingNutritionPlan', "Generating your personalized nutrition plan...")}
                              </p>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="space-y-2">
                              <div className={`flex justify-between items-center text-sm ${i18n.language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <span className="text-slate-300 font-medium">{t('common:messages.progress', 'Progress')}</span>
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-emerald-500/20 rounded-full">
                                    <span className="text-emerald-200 font-bold text-xs">
                                      {i18n.language === 'ar' ? toArabicNumerals(nutritionProgress) : nutritionProgress}٪
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="relative w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700"></div>
                                <div 
                                  className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-700 ease-out shadow-sm relative" 
                                  style={{ width: `${nutritionProgress}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Cancel button */}
                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => cancelNutritionPlanJobMutation.mutate(nutritionJobId)}
                                disabled={cancelNutritionPlanJobMutation.isPending}
                                className="border-red-500/50 text-red-300 hover:bg-red-500/10 hover:border-red-500"
                              >
                                <X className={i18n.language === 'ar' ? 'ml-2' : 'mr-2'} size={16} />
                                {t('home:services.queue.cancel')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center mt-8">
                        <Button 
                          type="submit"
                          data-testid="button-generate-nutrition-plan"
                          disabled={nutritionJobId !== null || createNutritionPlanJobMutation.isPending}
                          className="bg-athlete-accent hover:bg-blue-600 text-white px-8 py-3 text-lg"
                        >
                          {(nutritionJobId || createNutritionPlanJobMutation.isPending) ? (
                            <Loader2 className="mr-2 animate-spin" size={20} />
                          ) : (
                            <Apple className="mr-2" size={20} />
                          )}
                          {(nutritionJobId || createNutritionPlanJobMutation.isPending) ? t('nutritionPlan.generating') : t('nutritionPlan.generate')}
                        </Button>
                      </div>
                    </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : nutritionPlanData && (
                /* Nutrition Plan Results with New Plan Button */
                <div className="space-y-6">
                  <div className={`flex justify-between items-center mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <h2 className="text-2xl font-bold text-white">{t('nutritionPlan.yourPlan')}</h2>
                    <Button 
                      onClick={() => {
                        setShowNutritionForm(true);
                        setNutritionPlanData(null);
                        nutritionForm.reset();
                      }}
                      data-testid="button-new-nutrition-plan"
                      className={`bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold shadow-lg ${isArabic ? 'flex-row-reverse' : ''}`}
                    >
                      <Apple className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                      {t('nutritionPlan.generateNew')}
                    </Button>
                  </div>
                  <NutritionPlanDisplay 
                    plan={nutritionPlanData.plan || nutritionPlanData} 
                    language={nutritionPlanData.language || (nutritionPlanData.resultData?.language)} 
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="development" className="space-y-8">
              {showDevelopmentForm ? (
                /* Development Plan Form */
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardContent className="p-8">
                    <div className={`flex justify-between items-center mb-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <h2 className="text-2xl font-bold text-white">{t('developmentPlan.title')}</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewModal({ open: true, serviceType: 'development-plan' })}
                        disabled={previewLoading && previewModal.serviceType === 'development-plan'}
                        className={`border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 ${isArabic ? 'flex-row-reverse' : ''}`}
                        data-testid="button-preview-development-form"
                      >
                        {previewLoading && previewModal.serviceType === 'development-plan' ? (
                          <Loader2 className={`h-4 w-4 animate-spin ${isArabic ? 'ml-2' : 'mr-2'}`} />
                        ) : (
                          <HelpCircle className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                        )}
                        {t('common:buttons.preview')}
                      </Button>
                    </div>
                    
                    <Form {...developmentForm}>
                      <form onSubmit={developmentForm.handleSubmit(onSubmitDevelopmentPlan)} className="space-y-6">
                        {/* Goal Field */}
                        <FormField
                          control={developmentForm.control}
                          name="goal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-200 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('developmentPlan.goal')}</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field}
                                  placeholder={t('developmentPlan.goalPlaceholder')}
                                  className="bg-athlete-gray-700 border-gray-600 text-white min-h-[100px]"
                                  data-testid="input-development-goal"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {/* Age Field */}
                          <FormField
                            control={developmentForm.control}
                            name="age"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={`text-gray-200 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('developmentPlan.age')}</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    placeholder={t('developmentPlan.agePlaceholder')}
                                    className="bg-athlete-gray-700 border-gray-600 text-white"
                                    data-testid="input-development-age"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />

                          {/* Height Field */}
                          <FormField
                            control={developmentForm.control}
                            name="height"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={`text-gray-200 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('developmentPlan.height')}</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    placeholder={t('developmentPlan.heightPlaceholder')}
                                    className="bg-athlete-gray-700 border-gray-600 text-white"
                                    data-testid="input-development-height"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />

                          {/* Weight Field */}
                          <FormField
                            control={developmentForm.control}
                            name="weight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={`text-gray-200 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('developmentPlan.weight')}</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    placeholder={t('developmentPlan.weightPlaceholder')}
                                    className="bg-athlete-gray-700 border-gray-600 text-white"
                                    data-testid="input-development-weight"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />

                          {/* Gender Field */}
                          <FormField
                            control={developmentForm.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={`text-gray-200 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('developmentPlan.gender')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-athlete-gray-700 border-gray-600 text-white" data-testid="select-development-gender">
                                      <SelectValue placeholder={t('developmentPlan.genderPlaceholder')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-athlete-gray-700 border-gray-600">
                                    <SelectItem value="male" className="text-white hover:bg-athlete-gray-600">
                                      {t('developmentPlan.male')}
                                    </SelectItem>
                                    <SelectItem value="female" className="text-white hover:bg-athlete-gray-600">
                                      {t('developmentPlan.female')}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Sport Field */}
                        <FormField
                          control={developmentForm.control}
                          name="sport"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-200 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('developmentPlan.sport')}</FormLabel>
                              <FormControl>
                                <Popover open={developmentSportDropdownOpen} onOpenChange={setDevelopmentSportDropdownOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={developmentSportDropdownOpen}
                                      className="bg-athlete-gray-700 border-gray-600 text-white w-full justify-between hover:bg-athlete-gray-600"
                                      data-testid="select-development-sport"
                                    >
                                      {field.value
                                        ? sports.find(s => s.name === field.value)?.name
                                        : t('developmentPlan.sportPlaceholder')}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0 bg-athlete-gray-700 border-gray-600" align="start">
                                    <div className="p-3 border-b border-gray-600">
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                          placeholder={i18n.language === 'ar' ? 'ابحث عن رياضة...' : 'Search sports...'}
                                          value={developmentSportSearchTerm}
                                          onChange={(e) => setDevelopmentSportSearchTerm(e.target.value)}
                                          className="pl-9 bg-athlete-gray-700 border-athlete-gray-600 text-white placeholder:text-gray-400 focus:bg-athlete-gray-700 focus:border-athlete-gray-500"
                                          data-testid="input-development-sport-search"
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-60 overflow-auto">
                                      {filteredDevelopmentSports.length === 0 ? (
                                        <div className="p-3 text-center text-gray-400">
                                          {i18n.language === 'ar' ? 'لم يتم العثور على رياضات.' : 'No sports found.'}
                                        </div>
                                      ) : (
                                        filteredDevelopmentSports.map((sportItem) => (
                                          <div
                                            key={sportItem.id}
                                            className="flex items-center px-3 py-2 cursor-pointer hover:bg-athlete-gray-600 text-white"
                                            onClick={() => {
                                              field.onChange(sportItem.name);
                                              setDevelopmentSportDropdownOpen(false);
                                              setDevelopmentSportSearchTerm("");
                                            }}
                                            data-testid={`option-development-sport-${sportItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                                          >
                                            <Check className={`mr-2 h-4 w-4 ${field.value === sportItem.name ? "opacity-100" : "opacity-0"}`} />
                                            {sportItem.name}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        {/* Language Field */}
                        <FormField
                          control={developmentForm.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`text-gray-200 ${i18n.language === 'ar' ? 'block w-full text-right' : ''}`}>{t('developmentPlan.language')}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-athlete-gray-700 border-gray-600 text-white" data-testid="select-development-language">
                                    <SelectValue placeholder={t('developmentPlan.selectLanguage')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-athlete-gray-700 border-gray-600">
                                  <SelectItem value="en" className="text-white hover:bg-athlete-gray-600">English</SelectItem>
                                  <SelectItem value="ar" className="text-white hover:bg-athlete-gray-600">العربية</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full bg-athlete-accent hover:bg-athlete-accent-dark text-white"
                          disabled={createDevelopmentPlanJobMutation.isPending || !!developmentJobId}
                          data-testid="button-generate-development-plan"
                        >
                          {createDevelopmentPlanJobMutation.isPending || !!developmentJobId ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {developmentProgressMessage || t('developmentPlan.generating')}
                            </>
                          ) : (
                            <>
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {t('developmentPlan.generate')}
                            </>
                          )}
                        </Button>
                        
                        {/* Enhanced Progress indicator */}
                        {developmentJobId && (
                          <div className="mt-6 p-6 bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-xl border border-slate-600/50 shadow-lg" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                            <div className="space-y-4">
                              {/* Progress Header with Cancel Button */}
                              <div className={`flex items-center ${i18n.language === 'ar' ? 'flex-row-reverse' : 'justify-between'}`}>
                                {i18n.language === 'ar' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Prevent multiple clicks
                                      if (cancelDevelopmentPlanJobMutation.isPending) return;
                                      cancelDevelopmentPlanJobMutation.mutate(developmentJobId);
                                    }}
                                    disabled={cancelDevelopmentPlanJobMutation.isPending}
                                    className="bg-red-500/10 border-red-400/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 transition-all duration-200"
                                    data-testid="button-cancel-development-plan"
                                  >
                                    {cancelDevelopmentPlanJobMutation.isPending ? (
                                      <>
                                        <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                                        {t('common:buttons.cancelling')}
                                      </>
                                    ) : (
                                      <>
                                        <X className="ml-2 h-3 w-3" />
                                        {t('common:buttons.cancel')}
                                      </>
                                    )}
                                  </Button>
                                )}
                                <div className={`flex items-center gap-3 ${i18n.language === 'ar' ? 'flex-1 justify-end flex-row-reverse' : ''}`}>
                                  <div className="relative">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500/30 border-t-emerald-400"></div>
                                    <div className="absolute inset-0 rounded-full h-6 w-6 bg-emerald-500/10"></div>
                                  </div>
                                  <div className={i18n.language === 'ar' ? 'text-right' : ''}>
                                    <p className={`text-emerald-100 font-semibold ${i18n.language === 'ar' ? 'text-lg' : ''}`}>
                                      {developmentProgressMessage || t('common:messages.generatingDevelopmentPlan', 'Generating your development plan...')}
                                    </p>
                                    <p className={`text-slate-300 ${i18n.language === 'ar' ? 'text-base' : 'text-sm'}`}>{t('common:messages.thisMayTakeFewMinutes', 'This may take a few minutes')}</p>
                                  </div>
                                </div>
                                {i18n.language !== 'ar' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Prevent multiple clicks
                                      if (cancelDevelopmentPlanJobMutation.isPending) return;
                                      cancelDevelopmentPlanJobMutation.mutate(developmentJobId);
                                    }}
                                    disabled={cancelDevelopmentPlanJobMutation.isPending}
                                    className="bg-red-500/10 border-red-400/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 transition-all duration-200"
                                    data-testid="button-cancel-development-plan"
                                  >
                                    {cancelDevelopmentPlanJobMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        {t('common:buttons.cancelling')}
                                      </>
                                    ) : (
                                      <>
                                        <X className="mr-2 h-3 w-3" />
                                        {t('common:buttons.cancel')}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>

                              {/* Progress Bar with Percentage */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-300 font-medium">{t('common:messages.progress', 'Progress')}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="px-2 py-1 bg-emerald-500/20 rounded-full">
                                      <span className="text-emerald-200 font-bold text-xs">
                                        {i18n.language === 'ar' ? toArabicNumerals(developmentProgress) : developmentProgress}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="relative w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                                  <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700"></div>
                                  <div 
                                    className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-700 ease-out shadow-sm relative" 
                                    style={{ width: `${developmentProgress}%` }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : (
                /* Development Plan Display */
                developmentPlanData && (
                  <div className="space-y-6">
                    <div className={`flex justify-between items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <h2 className="text-2xl font-bold text-white">{t('developmentPlan.yourPlan')}</h2>
                      <Button
                        onClick={() => {
                          setShowDevelopmentForm(true);
                          setDevelopmentPlanData(null);
                        }}
                        className={`bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold shadow-lg ${isArabic ? 'flex-row-reverse' : ''}`}
                        data-testid="button-new-development-plan"
                      >
                        <RefreshCw className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                        {t('developmentPlan.generateNew')}
                      </Button>
                    </div>
                    
                    <DevelopmentPlanDisplay 
                      plan={developmentPlanData}
                      language={developmentPlanData.language || 'en'}
                      sport={developmentForm.getValues('sport') || selectedSport || 'training'}
                    />
                  </div>
                )
              )}
            </TabsContent>


          </Tabs>

          <TokenModal 
            open={showTokenModal} 
            onOpenChange={setShowTokenModal}
          />

          {showBioPopup && bioData && selectedAthlete && (
            <AnalysisPopup
              open={showBioPopup}
              onOpenChange={setShowBioPopup}
              type="bio"
              data={bioData}
              athleteName={selectedAthlete.name}
              athleteId={selectedAthlete.id}
              createdAt={new Date().toISOString()}
            />
          )}

          {showStatisticsPopup && statisticsData && selectedAthlete && (
            <AnalysisPopup
              open={showStatisticsPopup}
              onOpenChange={setShowStatisticsPopup}
              type="statistics"
              data={statisticsData}
              athleteName={selectedAthlete.name}
              athleteId={selectedAthlete.id}
              createdAt={new Date().toISOString()}
            />
          )}

          {/* Preview Modal */}
          {previewModal.serviceType && selectedPreviewAnalysis && (
            <AnalysisPopup
              open={previewModal.open && !previewLoading && !!selectedPreviewAnalysis}
              onOpenChange={(open) => setPreviewModal({ open, serviceType: open ? previewModal.serviceType : null })}
              type={previewModal.serviceType}
              data={selectedPreviewAnalysis?.resultData}
              athleteName={t('common:common.sampleAthlete', 'Sample Athlete')}
              createdAt={selectedPreviewAnalysis.createdAt}
            />
          )}

        </div>
  );
}
