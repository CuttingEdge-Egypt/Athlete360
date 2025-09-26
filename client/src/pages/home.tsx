import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Search, Star, User, Loader2, Users, Apple, CalendarDays, BarChart3, X, RefreshCw, TrendingUp } from "lucide-react";
import type { Sport, Athlete } from "@shared/schema";
import GenerationQueue from "@/components/ui/generation-queue";
import { CountrySelect } from "@/components/ui/country-select";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('home');
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
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
  const [nutritionJobId, setNutritionJobId] = useState<string | null>(null);
  const [nutritionProgress, setNutritionProgress] = useState<number>(0);
  const [nutritionJobProgressMessage, setNutritionJobProgressMessage] = useState<string>("");
  const [location] = useLocation();

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
      const response = await fetch('/api/jobs/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start nutrition plan generation');
      }
      return response.json();
    },
    onSuccess: (result) => {
      console.log('Nutrition plan job created:', result);
      setNutritionJobId(result.jobId);
      setNutritionProgress(0);
      setNutritionJobProgressMessage("Starting nutrition plan generation...");
      toast({
        title: "Generation Started!",
        description: "Your nutrition plan is being generated. This may take several minutes.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
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
      const response = await fetch('/api/jobs/development-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start development plan generation');
      }
      return response.json();
    },
    onSuccess: (result) => {
      console.log('Development plan job created:', result);
      setDevelopmentJobId(result.jobId);
      setDevelopmentProgress(0);
      setDevelopmentProgressMessage("Starting development plan generation...");
      toast({
        title: "Generation Started!",
        description: "Your development plan is being generated. This may take several minutes.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
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
      setDevelopmentJobId(null);
      setDevelopmentProgress(0);
      setDevelopmentProgressMessage("");
      toast({
        title: "Generation Cancelled",
        description: "Development plan generation was cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
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
      setNutritionJobId(null);
      setNutritionProgress(0);
      setNutritionJobProgressMessage("");
      toast({
        title: "Generation Cancelled",
        description: "Nutrition plan generation was cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
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
      
      if (status === 'in_progress') {
        const messages = [
          "🎯 Analyzing your training goals and current fitness level...",
          "🧠 AI is crafting your personalized training strategy...",
          "💪 Designing targeted exercises for your specific weaknesses...",
          "📊 Calculating optimal sets, reps, and rest periods...",
          "🎬 Finding the perfect instructional videos for each exercise...",
          "⚡ Optimizing training intensity and progression...",
          "📋 Assembling your complete development plan..."
        ];
        const messageIndex = Math.min(Math.floor((progress || 0) / 14), messages.length - 1);
        setDevelopmentProgressMessage(messages[messageIndex]);
        
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
        toast({
          title: "Development Plan Generated!",
          description: "Your personalized training plan is ready.",
        });
        // Invalidate relevant queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-history'] });
      } else if (status === 'failed') {
        console.error('Development plan generation failed:', error);
        setDevelopmentJobId(null);
        setDevelopmentProgress(0);
        setDevelopmentProgressMessage("");
        toast({
          title: "Generation Failed",
          description: error || "Development plan generation failed. Please try again.",
          variant: "destructive",
        });
      } else if (status === 'cancelled') {
        setDevelopmentJobId(null);
        setDevelopmentProgress(0);
        setDevelopmentProgressMessage("");
      }
    }
  }, [developmentJobStatus, queryClient, toast, setActiveTab]);

  // Nutrition plan job status handling
  useEffect(() => {
    if (nutritionJobStatus) {
      const { status, progress, result, error } = nutritionJobStatus;
      
      // Cap progress at 100% to prevent values like 138%
      const cappedProgress = Math.min(Math.max(progress || 0, 0), 100);
      setNutritionProgress(cappedProgress);
      
      if (status === 'in_progress') {
        const messages = [
          "🥗 Analyzing your nutritional goals and current dietary requirements...",
          "🧠 AI is crafting your personalized nutrition strategy...",
          "📊 Calculating optimal macronutrient distribution and meal timing...",
          "🍎 Designing balanced meals for your specific goals...",
          "🌍 Incorporating local cuisine and cultural preferences...",
          "⚖️ Optimizing caloric intake for your target weight...",
          "📋 Assembling your complete nutrition plan..."
        ];
        const messageIndex = Math.min(Math.floor((progress || 0) / 14), messages.length - 1);
        setNutritionJobProgressMessage(messages[messageIndex]);
        
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
        toast({
          title: "Nutrition Plan Generated!",
          description: "Your personalized nutrition plan is ready.",
        });
        // Invalidate relevant queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-history'] });
      } else if (status === 'failed') {
        console.error('Nutrition plan generation failed:', error);
        setNutritionJobId(null);
        setNutritionProgress(0);
        setNutritionJobProgressMessage("");
        toast({
          title: "Generation Failed",
          description: error || "Nutrition plan generation failed. Please try again.",
          variant: "destructive",
        });
      } else if (status === 'cancelled') {
        setNutritionJobId(null);
        setNutritionProgress(0);
        setNutritionJobProgressMessage("");
      }
    }
  }, [nutritionJobStatus, queryClient, toast, setActiveTab]);

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

  // Progress messages for nutrition plan generation
  const nutritionProgressMessages = useMemo(() => {
    const isArabic = i18n.language === 'ar';
    return isArabic ? [
      "بدء تحليل ملف التغذية الخاص بك... (هذا قد يستغرق 5-10 دقائق للخطط الطويلة)",
      "جمع البيانات الغذائية المتخصصة... كل أسبوع يحتاج ~50 ثانية للإنشاء",
      "تحليل احتياجاتك الرياضية... AI يعمل على تخصيص خطتك",
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
          title: "Payment Successful!",
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
          title: "Error",
          description: "Failed to load athletes. Please try again.",
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
          title: "Search Error",
          description: "Failed to search athletes. Please try again.",
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
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showBioPopup, setShowBioPopup] = useState(false);
  const [bioData, setBioData] = useState(null);
  const [showStatisticsPopup, setShowStatisticsPopup] = useState(false);

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  // Handle creating athlete with AI
  const handleCreateAthleteWithAI = async (athleteName: string) => {
    if (!selectedSport || !athleteName.trim()) return;
    
    setIsSearching(true);
    try {
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
      
      if (response.ok) {
        const newAthlete = await response.json();
        setSelectedAthlete(newAthlete);
        setSearchName(newAthlete.name);
        toast({
          title: "Athlete Created",
          description: `${newAthlete.name} has been added to our database with AI-powered insights.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Creation Failed",
          description: error.message || "Failed to create athlete with AI",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      toast({
        title: "Error",
        description: "Something went wrong while creating the athlete",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Reset selected athlete when sport changes
  const handleSportChange = (sportId: string) => {
    setSelectedSport(sportId);
    setSelectedAthlete(null);
    setSearchName("");
    // Sync with nutrition form to ensure bidirectional state consistency
    nutritionForm.setValue('sport', sportId, { shouldDirty: true, shouldValidate: true });
  };

  // Clear selected sport
  const handleClearSport = () => {
    setSelectedSport("");
    setSelectedAthlete(null);
    setSearchName("");
    // Also clear the nutrition form's sport field to keep form state in sync
    nutritionForm.setValue('sport', '');
  };

  // Reset selected athlete when country changes
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country === "all" ? "" : country);
    setSelectedAthlete(null);
  };

  const handleAthleteCardClick = async () => {
    if (!selectedAthlete) return;
    
    try {
      // Get current language from localStorage
      const language = localStorage.getItem('i18nextLng') || 'en';
      
      const response = await fetch(`/api/analysis/${selectedAthlete.id}/bio`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBioData(data);
        setShowBioPopup(true);
        
        // Invalidate queries to refresh token balance immediately
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analysis-logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-history"] });
        
        // Force refetch user data immediately
        queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          title: "Analysis Complete",
          description: "Biography analysis generated successfully!",
        });
      } else {
        toast({
          title: "Analysis Error",
          description: "Failed to generate athlete biography",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load athlete biography",
        variant: "destructive",
      });
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
    <div className="container mx-auto px-4 pt-20">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-white">
{t('interface.welcome')}
            </h1>
            <p className="text-xl text-gray-300 mb-8">
{t('interface.tagline')}
            </p>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 bg-athlete-gray-800 mb-8">
              <TabsTrigger 
                value="analysis" 
                data-testid="tab-analysis"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <BarChart3 size={16} />
                {t('interface.athleteAnalysis')}
              </TabsTrigger>
              <TabsTrigger 
                value="comparison" 
                data-testid="tab-comparison"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <Users size={16} />
                {t('interface.compareAthletes')}
              </TabsTrigger>
              <TabsTrigger 
                value="nutrition" 
                data-testid="tab-nutrition"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <Apple size={16} />
                {t('interface.nutritionPlan')}
              </TabsTrigger>
              <TabsTrigger 
                value="development" 
                data-testid="tab-development"
                className="data-[state=active]:bg-athlete-accent flex items-center gap-2"
              >
                <CalendarDays size={16} />
                {t('interface.developmentPlan')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-8">
              {/* Sport & Athlete Selection */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('interface.selectSportAthlete')}</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">{t('interface.sport')}</label>
                  <div className="flex gap-2">
                    <Select value={selectedSport} onValueChange={handleSportChange}>
                      <SelectTrigger 
                        data-testid="select-sport"
                        className="bg-athlete-gray-700 border-gray-600 text-white flex-1"
                      >
                        <SelectValue placeholder={t('interface.chooseASport')} />
                      </SelectTrigger>
                      <SelectContent className="bg-athlete-gray-700 border-gray-600">
                        {sports.map((sport) => (
                          <SelectItem key={sport.id} value={sport.id}>
                            {sport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            setSearchName("");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-athlete-gray-600 text-white border-b border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium">
                            {athlete.name}
                            {athlete.nameArabic && (
                              <span className="text-gray-300 mr-2"> / {athlete.nameArabic}</span>
                            )}
                          </div>
                          {athlete.country && (
                            <div className="text-sm text-gray-400">{athlete.country}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchName.trim() && !isSearchLoading && availableAthletes.length === 0 && (
                    <div className="mt-2 bg-athlete-gray-700 border border-gray-600 rounded-md p-4 text-center">
                      <p className="text-gray-300 mb-2">Athlete not found</p>
                      <Button
                        data-testid="create-athlete-ai"
                        onClick={() => handleCreateAthleteWithAI(searchName.trim())}
                        className="bg-athlete-accent hover:bg-athlete-accent/80 text-white"
                        disabled={!selectedSport || isSearching}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching with AI...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Search with AI
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Athlete Display */}
              {selectedAthlete && (
                <Card 
                  className="bg-athlete-gray-700 border-gray-600 cursor-pointer hover:border-athlete-accent transition-colors duration-300"
                  onClick={handleAthleteCardClick}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative w-16 h-16">
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
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {selectedAthlete.name}
                            {selectedAthlete.nameArabic && (
                              <span className="text-gray-300 font-normal text-lg block">{selectedAthlete.nameArabic}</span>
                            )}
                          </h3>
                          <p className="text-gray-400 capitalize">{selectedAthlete.country || "Unknown Country"}</p>
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
                                    <span className="text-[10px] text-yellow-400">📏</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Height</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.height}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.position && selectedAthlete.personalInfo.position !== "N/A" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-purple-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-purple-500/20 rounded-full">
                                    <span className="text-[10px] text-purple-400">🏆</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Position</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.position}</span>
                                </div>
                              )}
                              
                              {selectedAthlete.personalInfo.weight && selectedAthlete.personalInfo.weight !== "N/A" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-orange-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-orange-500/20 rounded-full">
                                    <span className="text-[10px] text-orange-400">⚖️</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Weight</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.weight}</span>
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
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-600/50 hover:border-indigo-400/60 transition-all duration-200">
                                  <div className="flex items-center justify-center w-4 h-4 bg-indigo-500/20 rounded-full">
                                    <span className="text-[10px] text-indigo-400">🎓</span>
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium">Education</span>
                                  <span className="text-xs font-bold text-white">{selectedAthlete.personalInfo.educationalBackground}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Fallback rank display if no personal info */}
                          {!selectedAthlete.personalInfo && selectedAthlete.rank && (
                            <div className="flex items-center space-x-2 mt-1">
                              <Star className="text-athlete-warning" size={16} />
                              <span className="text-sm text-gray-300">Rank #{selectedAthlete.rank}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-athlete-accent">
                        <span className="text-sm">Click for Biography →</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
                </CardContent>
              </Card>

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
                    <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('nutritionPlan.title')}</h2>
                  
                  <Form {...nutritionForm}>
                    <form onSubmit={nutritionForm.handleSubmit(onSubmitNutritionPlan)} className="space-y-6">
                      {/* Goal Input (Required) - Full Width Row */}
                      <FormField
                        control={nutritionForm.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">{t('nutritionPlan.goal')} *</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.sport')}</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Select value={selectedSport || field.value || ""} onValueChange={(value) => { 
                                    field.onChange(value);
                                    setSelectedSport(value);
                                    // Clear athlete selection when sport changes in form
                                    if (value !== selectedSport) {
                                      setSelectedAthlete(null);
                                      setSearchName("");
                                    }
                                  }}>
                                    <SelectTrigger 
                                      data-testid="select-nutrition-sport"
                                      className="bg-athlete-gray-700 border-gray-600 text-white flex-1"
                                    >
                                      <SelectValue placeholder={t('interface.chooseASport')} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-athlete-gray-700 border-gray-600">
                                      {sports.map((sport) => (
                                        <SelectItem key={sport.id} value={sport.id}>
                                          {sport.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.age')} *</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.height')} *</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.currentWeight')} *</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.targetWeight')} *</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.country')} *</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.period')}</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.inbodyReport')}</FormLabel>
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
                              <FormLabel className="text-gray-300">{t('nutritionPlan.language')}</FormLabel>
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
                                {nutritionJobProgressMessage || "Generating your personalized nutrition plan..."}
                              </p>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-300 font-medium">Progress</span>
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-emerald-500/20 rounded-full">
                                    <span className="text-emerald-200 font-bold text-xs">{nutritionProgress}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="relative w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
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
                                <X className="mr-2" size={16} />
                                Cancel Generation
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center mt-8">
                        <Button 
                          type="submit"
                          data-testid="button-generate-nutrition-plan"
                          disabled={nutritionJobId !== null}
                          className="bg-athlete-accent hover:bg-blue-600 text-white px-8 py-3 text-lg"
                        >
                          {nutritionJobId ? (
                            <Loader2 className="mr-2 animate-spin" size={20} />
                          ) : (
                            <Apple className="mr-2" size={20} />
                          )}
                          {nutritionJobId ? "Generating..." : t('nutritionPlan.generate')}
                        </Button>
                      </div>
                    </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : nutritionPlanData && (
                /* Nutrition Plan Results with New Plan Button */
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => {
                        setShowNutritionForm(true);
                        setNutritionPlanData(null);
                        nutritionForm.reset();
                      }}
                      data-testid="button-new-nutrition-plan"
                      className="bg-athlete-accent hover:bg-blue-600 text-white px-6 py-2"
                    >
                      <Apple className="mr-2" size={20} />
                      New Nutrition Plan
                    </Button>
                  </div>
                  <NutritionPlanDisplay plan={nutritionPlanData.plan || nutritionPlanData} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="development" className="space-y-8">
              {showDevelopmentForm ? (
                /* Development Plan Form */
                <Card className="bg-athlete-gray-800 border-gray-700">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6 text-center text-white">{t('developmentPlan.title')}</h2>
                    
                    <Form {...developmentForm}>
                      <form onSubmit={developmentForm.handleSubmit(onSubmitDevelopmentPlan)} className="space-y-6">
                        {/* Goal Field */}
                        <FormField
                          control={developmentForm.control}
                          name="goal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-200">{t('developmentPlan.goal')}</FormLabel>
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
                                <FormLabel className="text-gray-200">{t('developmentPlan.age')}</FormLabel>
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
                                <FormLabel className="text-gray-200">{t('developmentPlan.height')}</FormLabel>
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
                                <FormLabel className="text-gray-200">{t('developmentPlan.weight')}</FormLabel>
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
                                <FormLabel className="text-gray-200">{t('developmentPlan.gender')}</FormLabel>
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
                              <FormLabel className="text-gray-200">{t('developmentPlan.sport')}</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  placeholder={t('developmentPlan.sportPlaceholder')}
                                  className="bg-athlete-gray-700 border-gray-600 text-white"
                                  data-testid="input-development-sport"
                                />
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
                              <FormLabel className="text-gray-200">{t('developmentPlan.language')}</FormLabel>
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
                          <div className="mt-6 p-6 bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-xl border border-slate-600/50 shadow-lg">
                            <div className="space-y-4">
                              {/* Progress Header with Cancel Button */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500/30 border-t-emerald-400"></div>
                                    <div className="absolute inset-0 rounded-full h-6 w-6 bg-emerald-500/10"></div>
                                  </div>
                                  <div>
                                    <p className="text-emerald-100 font-semibold">
                                      {developmentProgressMessage || 'Generating your development plan...'}
                                    </p>
                                    <p className="text-slate-300 text-sm">This may take a few minutes</p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelDevelopmentPlanJobMutation.mutate(developmentJobId)}
                                  disabled={cancelDevelopmentPlanJobMutation.isPending}
                                  className="bg-red-500/10 border-red-400/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 transition-all duration-200"
                                  data-testid="button-cancel-development-plan"
                                >
                                  {cancelDevelopmentPlanJobMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Cancelling
                                    </>
                                  ) : (
                                    <>
                                      <X className="mr-2 h-3 w-3" />
                                      Cancel
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Progress Bar with Percentage */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-300 font-medium">Progress</span>
                                  <div className="flex items-center gap-2">
                                    <div className="px-2 py-1 bg-emerald-500/20 rounded-full">
                                      <span className="text-emerald-200 font-bold text-xs">{developmentProgress}%</span>
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
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-white">{t('developmentPlan.yourPlan')}</h2>
                      <Button
                        onClick={() => {
                          setShowDevelopmentForm(true);
                          setDevelopmentPlanData(null);
                        }}
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold shadow-lg"
                        data-testid="button-new-development-plan"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
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

          {/* Generation Queue */}
          <GenerationQueue
            onSelectGeneration={(result) => {
              // Handle different types of generation results
              if (result.serviceType === 'compare') {
                setComparisonData(result);
                setActiveTab('comparison');
              } else if (result.serviceType === 'video') {
                setVideoAnalysisData(result);
                setActiveTab('video');
              } else if (result.serviceType === 'nutrition-plan') {
                setNutritionPlanData(result);
                setShowNutritionForm(false); // Hide form and show results
                setActiveTab('nutrition');
              } else {
                // Handle other analysis types - they're handled by the AnalysisPopup component
                console.log('Selected generation result:', result);
              }
            }}
            currentAthlete={selectedAthlete?.name}
            currentService="rank"
          />
        </div>
  );
}
