import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Video, Upload, Loader2, Play, FileVideo, Search, Check, ChevronsUpDown, Trophy, Film, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResult } from "./analysis-result";
import { VideoPlayerAnalysis } from "./video-player-analysis";
import { ClipAnalysisDisplay } from "./clip-analysis-display";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface VideoAnalysisUploadProps {
  onClose?: () => void;
}

// Helper function to determine if a sport has rounds based on its name
const hasRounds = (sportName: string): boolean => {
  const roundBasedSports = ['taekwondo', 'boxing', 'martial arts', 'mma', 'kickboxing', 'fencing'];
  return roundBasedSports.some(sport => 
    sportName.toLowerCase().includes(sport)
  );
};

export function VideoAnalysisUpload({ onClose }: VideoAnalysisUploadProps) {
  const { t, i18n } = useTranslation('videoAnalysis');
  const isArabic = i18n.language === 'ar';
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<string>("match");
  const [whatToAnalyze, setWhatToAnalyze] = useState<string>("");
  const [roundToAnalyze, setRoundToAnalyze] = useState<string>("1");
  const [language, setLanguage] = useState<string>("english");
  const [sport, setSport] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(t('upload.analyzing'));
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
  const [sportSearchTerm, setSportSearchTerm] = useState("");
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to get the appropriate progress message based on current progress and analysis type
  const getProgressMessage = (progress: number, type: string) => {
    const stages = type === 'match' ? [
      { threshold: 5, key: 'progressMessages.match.uploading' },
      { threshold: 15, key: 'progressMessages.match.preparing' },
      { threshold: 25, key: 'progressMessages.match.processing' },
      { threshold: 35, key: 'progressMessages.match.movements' },
      { threshold: 50, key: 'progressMessages.match.scoring' },
      { threshold: 65, key: 'progressMessages.match.techniques' },
      { threshold: 75, key: 'progressMessages.match.penalties' },
      { threshold: 85, key: 'progressMessages.match.generating' },
      { threshold: 95, key: 'progressMessages.match.finalizing' }
    ] : [
      { threshold: 5, key: 'progressMessages.clip.uploading' },
      { threshold: 15, key: 'progressMessages.clip.preparing' },
      { threshold: 30, key: 'progressMessages.clip.processing' },
      { threshold: 45, key: 'progressMessages.clip.understanding' },
      { threshold: 60, key: 'progressMessages.clip.evaluating' },
      { threshold: 75, key: 'progressMessages.clip.comparing' },
      { threshold: 90, key: 'progressMessages.clip.advice' },
      { threshold: 95, key: 'progressMessages.clip.finalizing' }
    ];

    // Find the appropriate stage based on current progress
    for (let i = stages.length - 1; i >= 0; i--) {
      if (progress >= stages[i].threshold) {
        return t(stages[i].key);
      }
    }
    return t('upload.analyzing');
  };

  // Update loading message when language changes during analysis
  useEffect(() => {
    if (isAnalyzing && loadingProgress > 0) {
      setLoadingMessage(getProgressMessage(loadingProgress, analysisType));
    }
  }, [i18n.language, isAnalyzing, loadingProgress, analysisType]);

  // Load sports from API
  const { data: sports = [] } = useQuery<Array<{id: string, name: string}>>({
    queryKey: ["/api/sports"]
  });

  // Find current sport and determine if it has rounds
  const currentSport = sports.find(s => s.id === sport);
  const currentSportHasRounds = currentSport ? hasRounds(currentSport.name) : false;
  
  // Filter sports based on search term
  const filteredSports = sports.filter(sport => 
    sport.name.toLowerCase().includes(sportSearchTerm.toLowerCase())
  );

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: t('toast.invalidFileType'),
        description: t('toast.invalidFileTypeDesc'),
        variant: "destructive",
      });
      return;
    }

    // Note: Backend now supports up to 500MB, no client-side size restriction needed

    setUploadedFile(file);
    toast({
      title: t('toast.videoUploaded'),
      description: `${t('toast.selected')}: ${file.name}`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) {
      toast({
        title: t('toast.missingVideo'),
        description: t('toast.missingVideoDesc'),
        variant: "destructive",
      });
      return;
    }

    // Validate sport selection
    if (!sport) {
      toast({
        title: t('toast.missingSport'),
        description: t('toast.missingSportDesc'),
        variant: "destructive",
      });
      return;
    }

    // Validate clip analysis input
    if (analysisType === 'clip' && !whatToAnalyze.trim()) {
      toast({
        title: t('toast.missingAnalysisDetails'),
        description: t('toast.missingAnalysisDetailsDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setLoadingProgress(0);
    setLoadingMessage(t('progressMessages.match.uploading'));
    
    // Add to generation queue if available
    let queueId: string | null = null;
    if ((window as any).generationQueue) {
      const queueLabel = analysisType === 'match' 
        ? `Match Analysis: ${uploadedFile.name}` 
        : `Clip Analysis: ${uploadedFile.name}`;
      queueId = (window as any).generationQueue.add(queueLabel, 'video', false);
      
      // Add cancel and retry callbacks to queue item
      (window as any).generationQueue.update(queueId, { 
        status: 'running', 
        progressMessage: 'Uploading video...',
        onCancel: () => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        },
        onRetry: () => {
          // Retry with the same file and parameters
          handleAnalyze();
        }
      });
    }
    
    // Define progress stages with smooth transitions (4-7 minute duration)
    const stages = analysisType === 'match' ? [
      { progress: 5, message: t('progressMessages.match.uploading'), duration: 25000 },
      { progress: 15, message: t('progressMessages.match.preparing'), duration: 25000 },
      { progress: 25, message: t('progressMessages.match.processing'), duration: 35000 },
      { progress: 35, message: t('progressMessages.match.movements'), duration: 45000 },
      { progress: 50, message: t('progressMessages.match.scoring'), duration: 55000 },
      { progress: 65, message: t('progressMessages.match.techniques'), duration: 55000 },
      { progress: 75, message: t('progressMessages.match.penalties'), duration: 45000 },
      { progress: 85, message: t('progressMessages.match.generating'), duration: 45000 },
      { progress: 95, message: t('progressMessages.match.finalizing'), duration: 25000 }
    ] : [
      { progress: 5, message: t('progressMessages.clip.uploading'), duration: 25000 },
      { progress: 15, message: t('progressMessages.clip.preparing'), duration: 25000 },
      { progress: 30, message: t('progressMessages.clip.processing'), duration: 35000 },
      { progress: 45, message: t('progressMessages.clip.understanding'), duration: 45000 },
      { progress: 60, message: t('progressMessages.clip.evaluating'), duration: 55000 },
      { progress: 75, message: t('progressMessages.clip.comparing'), duration: 45000 },
      { progress: 90, message: t('progressMessages.clip.advice'), duration: 35000 },
      { progress: 95, message: t('progressMessages.clip.finalizing'), duration: 25000 }
    ];
    
    let currentStage = 0;
    let progressInterval: NodeJS.Timeout | null = null;
    
    // Function to smoothly transition between stages
    const updateProgress = () => {
      if (currentStage < stages.length) {
        const stage = stages[currentStage];
        setLoadingProgress(stage.progress);
        setLoadingMessage(stage.message);
        
        // Update queue message
        if (queueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(queueId, { status: 'running', progressMessage: stage.message });
        }
        
        currentStage++;
        
        // Schedule next stage
        if (currentStage < stages.length) {
          progressInterval = setTimeout(updateProgress, stage.duration);
        }
      }
    };
    
    // Start progress updates
    updateProgress();
    
    const formData = new FormData();
    formData.append('video', uploadedFile);
    formData.append('analysisType', analysisType);
    formData.append('language', language);
    formData.append('sport', sport);
    
    // Add specific fields based on analysis type
    if (analysisType === 'match') {
      formData.append('round', roundToAnalyze || '1');
    } else {
      formData.append('whatToAnalyze', whatToAnalyze);
    }

    // Create an AbortController for manual timeout control
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Update queue status
      if (queueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(queueId, { status: 'running', progressMessage: 'Processing video...' });
      }
      
      // Update loading message for processing phase
      setLoadingMessage(t('progressMessages.match.processing'))
      
      // Set up timeout control
      abortControllerRef.current = new AbortController();
      timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 600000); // 10 minutes
      
      const response = await fetch('/api/analysis/video', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      // Check if response is ok before parsing JSON
      if (!response.ok && !response.body) {
        throw new Error('Request failed or was cancelled');
      }

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast({
            title: t('toast.insufficientTokens'),
            description: t('toast.insufficientTokensDesc'),
            variant: "destructive",
          });
          // Update queue status on error
          if (queueId && (window as any).generationQueue) {
            (window as any).generationQueue.update(queueId, { status: 'error', error: 'Insufficient tokens' });
          }
          if (progressInterval) clearTimeout(progressInterval);
          setIsAnalyzing(false);
          setLoadingProgress(0);
          return;
        }
        throw new Error(result.message || 'Analysis failed');
      }

      // Analysis is complete and tokens have been automatically deducted
      setAnalysisResult(result.data);
      toast({
        title: t('toast.analysisComplete'),
        description: t('toast.analysisCompleteDesc'),
      });
      
      // Update queue status on success
      if (queueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(queueId, { status: 'completed', result: result.data });
      }

    } catch (error) {
      console.error('Video analysis error:', error);
      
      // Check if the error is due to user cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: t('toast.analysisCancelled') || 'Analysis Cancelled',
          description: t('toast.analysisCancelledDesc') || 'Video analysis was cancelled by user.',
        });
        
        // Update queue status on cancellation
        if (queueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(queueId, { status: 'error', error: 'Cancelled by user' });
        }
      } else {
        toast({
          title: t('toast.analysisFailed'),
          description: t('toast.analysisFailedDesc') || 'We couldn\'t complete the video analysis. Please try again or contact support if the issue persists.',
          variant: "destructive",
        });
        
        // Update queue status on error
        if (queueId && (window as any).generationQueue) {
          (window as any).generationQueue.update(queueId, { status: 'error', error: error instanceof Error ? error.message : 'Analysis failed' });
        }
      }
    } finally {
      // Clean up timeout and intervals
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (progressInterval) {
        clearTimeout(progressInterval);
      }
      abortControllerRef.current = null;
      setIsAnalyzing(false);
      setLoadingMessage(t('common:messages.analyzingVideo', 'Analyzing Video...'));
      setLoadingProgress(0);
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // The abort will trigger the catch block in handleAnalyze
      // where proper cleanup happens
    }
  };

  if (analysisResult && uploadedFile) {
    // Show full results (tokens have been automatically deducted)
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">
            {analysisResult.analysisType === 'clip' ? t('results.clipAnalysisResults') : t('results.matchAnalysisResults')}
          </h3>
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                setAnalysisResult(null);
                setUploadedFile(null);
                setRoundToAnalyze("1");
                setLanguage("english");
                setAnalysisType("match");
                setWhatToAnalyze("");
              }}
              className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0"
              data-testid="button-analyze-new"
            >
              <Video className="mr-2" size={18} />
              {t('upload.analyzeNewVideo')}
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="outline" data-testid="button-close">
                {t('upload.close')}
              </Button>
            )}
          </div>
        </div>
        
        {/* Render appropriate display based on analysis type */}
        {analysisResult.analysisType === 'clip' ? (
          <ClipAnalysisDisplay 
            analysisData={analysisResult}
            videoFile={uploadedFile}
          />
        ) : (
          <VideoPlayerAnalysis 
            videoFile={uploadedFile}
            analysisData={analysisResult}
            language={language}
            sport={sport}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Video className="text-indigo-400" size={28} />
              <div className={isArabic ? 'text-right' : ''}>
                <CardTitle className="text-white">{t('upload.title')}</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('description')}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-orange-600/20 text-orange-300 border-orange-500/30 text-xs font-medium whitespace-nowrap">
              {t('tokenCost')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Analysis Type Selection */}
          <div className="space-y-3">
            <Label className="text-white font-medium">{t('upload.analysisType')}</Label>
            <RadioGroup 
              value={analysisType} 
              onValueChange={setAnalysisType}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-3 bg-slate-100 p-3 rounded-lg">
                <RadioGroupItem value="match" id="match" />
                <Label htmlFor="match" className="flex items-center cursor-pointer flex-1">
                  <Trophy className="text-indigo-400 mr-2" size={18} />
                  <div>
                    <span className="text-white font-medium">{t('upload.matchAnalysis')}</span>
                    <p className="text-muted-foreground text-sm">{t('upload.matchAnalysisDesc')}</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-slate-100 p-3 rounded-lg">
                <RadioGroupItem value="clip" id="clip" />
                <Label htmlFor="clip" className="flex items-center cursor-pointer flex-1">
                  <Film className="text-indigo-400 mr-2" size={18} />
                  <div>
                    <span className="text-white font-medium">{t('upload.clipAnalysis')}</span>
                    <p className="text-muted-foreground text-sm">{t('upload.clipAnalysisDesc')}</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* What to Analyze Input (for Clip Analysis) */}
          {analysisType === 'clip' && (
            <div className="space-y-2">
              <Label htmlFor="whatToAnalyze" className="text-white font-medium">
                {t('upload.whatToAnalyze')} <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="whatToAnalyze"
                value={whatToAnalyze}
                onChange={(e) => setWhatToAnalyze(e.target.value)}
                placeholder={t('upload.whatToAnalyzePlaceholder')}
                className="bg-slate-100 border-slate-200 text-white placeholder-gray-400 min-h-[100px]"
                data-testid="textarea-what-to-analyze"
              />
            </div>
          )}
          
          {/* Video Upload Area */}
          <div className="space-y-4">
            <Label className="text-white font-medium">{t('upload.uploadVideo')}</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-indigo-400 bg-indigo-400/10' 
                  : 'border-slate-200 hover:border-gray-500'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
            >
              {uploadedFile ? (
                <div className="space-y-3 pointer-events-none">
                  <FileVideo className="mx-auto text-indigo-400" size={48} />
                  <div>
                    <p className="text-white font-medium">{uploadedFile.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <Badge variant="outline" className="border-indigo-400 text-indigo-400">
                    {t('upload.readyForAnalysis')}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-3 pointer-events-none">
                  <Upload className="mx-auto text-muted-foreground" size={48} />
                  <div>
                    <p className="text-white">{t('upload.dragDrop')}</p>
                    <p className="text-muted-foreground text-sm">{t('upload.clickBrowse')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('upload.supportedFormats')}
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                data-testid="input-video-file"
              />
            </div>
          </div>



          {/* Sport Selection with Search */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="sport-select" className="text-white font-medium block">{t('upload.sport')}</Label>
            <Popover open={sportDropdownOpen} onOpenChange={setSportDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sportDropdownOpen}
                  className="w-full max-w-xs justify-between bg-slate-100 border-slate-200 text-white hover:bg-slate-100"
                  data-testid="button-sport-select"
                >
                  {sport
                    ? sports.find(s => s.id === sport)?.name
                    : t('upload.selectSport')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[300px] h-[280px] p-0 bg-slate-100 border-slate-200" 
                side="bottom" 
                sideOffset={4} 
                align="start"
                avoidCollisions={false}
                collisionPadding={0}
              >
                <div className="p-3 border-b border-slate-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder={t('upload.searchSport')}
                      value={sportSearchTerm}
                      onChange={(e) => setSportSearchTerm(e.target.value)}
                      className="pl-9 bg-slate-50 border-athlete-gray-600 text-white placeholder-gray-500 focus:bg-slate-100 focus:border-gray-500"
                      data-testid="input-sport-search"
                    />
                  </div>
                </div>
                <div className="h-[200px] overflow-auto">
                  {filteredSports.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground">
                      {t('upload.noSportsFound')}
                    </div>
                  ) : (
                    filteredSports.map((sportItem) => (
                      <div
                        key={sportItem.id}
                        className="flex items-center px-3 py-2 cursor-pointer hover:bg-slate-100 text-white"
                        onClick={() => {
                          setSport(sportItem.id);
                          setSportDropdownOpen(false);
                          setSportSearchTerm("");
                          // Reset round selection when sport changes
                          if (!hasRounds(sportItem.name)) {
                            setRoundToAnalyze("");
                          } else {
                            setRoundToAnalyze("1");
                          }
                        }}
                        data-testid={`option-sport-${sportItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Check className={`mr-2 h-4 w-4 ${sport === sportItem.id ? "opacity-100" : "opacity-0"}`} />
                        {sportItem.name}
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Round Selection - Only show for match analysis and sports that have rounds */}
          {analysisType === 'match' && currentSportHasRounds && (
            <div className="space-y-2">
              <Label htmlFor="round" className="text-white font-medium">
                {t('upload.roundToAnalyze')}
              </Label>
              <div className="flex items-center space-x-3">
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={roundToAnalyze}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string while typing
                    if (value === '') {
                      setRoundToAnalyze('');
                      return;
                    }
                    // Validate number range
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1 && num <= 50) {
                      setRoundToAnalyze(value);
                    }
                  }}
                  onBlur={() => {
                    // Set to 1 if empty on blur
                    if (roundToAnalyze === '') {
                      setRoundToAnalyze('1');
                    }
                  }}
                  className="w-20 bg-slate-100 border-slate-200 text-white text-center"
                  data-testid="input-round-number"
                />
                <span className="text-muted-foreground text-sm">{t('upload.enterRoundNumber')}</span>
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language" className="text-white font-medium">
              {t('upload.analysisLanguage')}
            </Label>
            <Select 
              value={language} 
              onValueChange={setLanguage}
              data-testid="select-language"
            >
              <SelectTrigger className="bg-slate-100 border-slate-200 text-white w-full max-w-xs">
                <SelectValue placeholder={t('upload.selectLanguage')} />
              </SelectTrigger>
              <SelectContent className="bg-slate-100 border-slate-200">
                <SelectItem value="english" className="text-white hover:bg-slate-100">
                  {t('upload.english')}
                </SelectItem>
                <SelectItem value="arabic" className="text-white hover:bg-slate-100">
                  {t('upload.arabic')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Analysis Button / Progress Bar */}
          {isAnalyzing ? (
            <div className="space-y-4 bg-slate-100 rounded-lg p-6 border-2 border-indigo-500/30">
              {/* Main loading message at the top */}
              <p className="text-gray-600 text-lg leading-relaxed text-center font-medium">{loadingMessage}</p>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  <span className="text-white font-medium">{t('upload.analyzing')}</span>
                </div>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  {Math.round(loadingProgress)}%
                </Badge>
              </div>
              
              <Progress 
                value={loadingProgress} 
                className="h-3 bg-slate-100"
                data-testid="progress-bar"
              />
              
              <div className="flex items-start justify-center space-x-2 text-sm mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 animate-pulse"></div>
                <p className="text-muted-foreground text-sm">
                  {t('upload.pleaseWait')}
                </p>
              </div>
              
              <div className="flex justify-center">
                <Button
                  onClick={handleCancelAnalysis}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-400"
                  data-testid="button-cancel-analysis"
                >
                  {t('upload.cancel', 'Cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleAnalyze}
                disabled={!uploadedFile || isAnalyzing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
                data-testid="button-analyze-video"
              >
                <Play className="mr-2 h-4 w-4" />
                {t('upload.analyzeButton')}
              </Button>
            </div>
          )}

          {/* Analysis Info */}
          <div className="bg-slate-100 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">{t('whatWeAnalyze.title')}</h4>
            
            {/* Match Analysis Section */}
            <div className="mb-4">
              <p className="text-indigo-400 font-medium text-sm mb-2">{t('whatWeAnalyze.matchType')}</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>{t('whatWeAnalyze.actionCounts')}</li>
                <li>{t('whatWeAnalyze.scoringPatterns')}</li>
                <li>{t('whatWeAnalyze.violations')}</li>
                <li>{t('whatWeAnalyze.technicalAnalysis')}</li>
                <li>{t('whatWeAnalyze.tacticalAdvice')}</li>
              </ul>
            </div>
            
            {/* Clip Analysis Section */}
            <div>
              <p className="text-indigo-400 font-medium text-sm mb-2">{t('whatWeAnalyze.clipType')}</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>{t('whatWeAnalyze.customAnalysis')}</li>
                <li>{t('whatWeAnalyze.techniqueEvaluation')}</li>
                <li>{t('whatWeAnalyze.professionalComparison')}</li>
                <li>{t('whatWeAnalyze.improvementAdvice')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}