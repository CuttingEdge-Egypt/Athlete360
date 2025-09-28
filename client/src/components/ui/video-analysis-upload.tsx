import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Video, Upload, Loader2, Play, FileVideo, Search, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResult } from "./analysis-result";
import { VideoPlayerAnalysis } from "./video-player-analysis";
import { useQuery } from "@tanstack/react-query";

interface VideoAnalysisUploadProps {
  onClose?: () => void;
}

// Helper function to determine if a sport has rounds based on its name
const hasRounds = (sportName: string): boolean => {
  const roundBasedSports = ['taekwondo', 'boxing', 'martial arts', 'mma', 'kickboxing'];
  return roundBasedSports.some(sport => 
    sportName.toLowerCase().includes(sport)
  );
};

export function VideoAnalysisUpload({ onClose }: VideoAnalysisUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [roundToAnalyze, setRoundToAnalyze] = useState<number | 'no-rounds'>(1);
  const [language, setLanguage] = useState<string>("english");
  const [sport, setSport] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing Video...');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
  const [sportSearchTerm, setSportSearchTerm] = useState("");
  const { toast } = useToast();

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

  // Set default sport when sports load
  if (sports.length > 0 && !sport) {
    const defaultSport = sports.find(s => s.name.toLowerCase().includes('taekwondo')) || sports[0];
    setSport(defaultSport.id);
    setRoundToAnalyze(hasRounds(defaultSport.name) ? 1 : 'no-rounds');
  }

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a video file (MP4, MOV, AVI, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Note: Backend now supports up to 500MB, no client-side size restriction needed

    setUploadedFile(file);
    toast({
      title: "Video Uploaded",
      description: `Selected: ${file.name}`,
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
        title: "Missing Video",
        description: "Please upload a video file",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setLoadingMessage('Uploading video...');
    
    // Add to generation queue if available
    let queueId: string | null = null;
    if ((window as any).generationQueue) {
      queueId = (window as any).generationQueue.add(`Video: ${uploadedFile.name}`, 'video', false);
      (window as any).generationQueue.update(queueId, 'running', null, null, 'Uploading video...');
    }
    
    // Start cycling through loading messages
    const messages = [
      'Uploading video to server...',
      'Processing video frames...',
      'Analyzing athlete movements...',
      'Detecting scoring events...',
      'Identifying kicks and strikes...',
      'Analyzing penalties and violations...',
      'Generating comprehensive analysis...',
      'Finalizing results...'
    ];
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (messageIndex < messages.length - 1) {
        messageIndex++;
        setLoadingMessage(messages[messageIndex]);
      }
    }, 5000); // Change message every 5 seconds
    
    const formData = new FormData();
    formData.append('video', uploadedFile);
    formData.append('round', roundToAnalyze.toString());
    formData.append('language', language);
    formData.append('sport', sport);

    // Create an AbortController for manual timeout control
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Update queue status
      if (queueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(queueId, 'running', null, null, 'Processing video...');
      }
      
      // Update loading message for processing phase
      setLoadingMessage('Processing video with Gemini AI...')
      
      // Set up timeout control
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, 600000); // 10 minutes
      
      const response = await fetch('/api/analysis/video', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast({
            title: "Insufficient Tokens",
            description: "You need more tokens to perform video analysis. Please purchase tokens to continue.",
            variant: "destructive",
          });
          // Update queue status on error
          if (queueId && (window as any).generationQueue) {
            (window as any).generationQueue.update(queueId, 'error', null, 'Insufficient tokens');
          }
          clearInterval(messageInterval);
          setIsAnalyzing(false);
          return;
        }
        throw new Error(result.message || 'Analysis failed');
      }

      setAnalysisResult(result.data);
      toast({
        title: "Analysis Complete",
        description: "Video analysis completed successfully!",
      });
      
      // Update queue status on success
      if (queueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(queueId, 'completed', result.data);
      }

    } catch (error) {
      console.error('Video analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      
      // Update queue status on error
      if (queueId && (window as any).generationQueue) {
        (window as any).generationQueue.update(queueId, 'error', null, error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      // Clean up timeout and intervals
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      clearInterval(messageInterval);
      setIsAnalyzing(false);
      setLoadingMessage('Analyzing Video...');
    }
  };

  if (analysisResult && uploadedFile) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Video Analysis Results</h3>
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                setAnalysisResult(null);
                setUploadedFile(null);
                setRoundToAnalyze(1);
                setLanguage("english");
              }}
              variant="outline"
              data-testid="button-analyze-new"
            >
              Analyze New Video
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="outline" data-testid="button-close">
                Close
              </Button>
            )}
          </div>
        </div>
        <VideoPlayerAnalysis 
          videoFile={uploadedFile}
          analysisData={analysisResult}
          language={language}
          sport={sport}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Video className="text-indigo-400" size={28} />
            <div>
              <CardTitle className="text-white">Video Analysis</CardTitle>
              <p className="text-gray-400 text-sm mt-1">
                Upload a sports match video for AI-powered analysis (200 tokens)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Video Upload Area */}
          <div className="space-y-4">
            <Label className="text-white font-medium">Upload Video File</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-indigo-400 bg-indigo-400/10' 
                  : 'border-gray-600 hover:border-gray-500'
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
                    <p className="text-gray-400 text-sm">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <Badge variant="outline" className="border-indigo-400 text-indigo-400">
                    Ready for Analysis
                  </Badge>
                </div>
              ) : (
                <div className="space-y-3 pointer-events-none">
                  <Upload className="mx-auto text-gray-400" size={48} />
                  <div>
                    <p className="text-white">Drop your video file here</p>
                    <p className="text-gray-400 text-sm">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supports MP4, MOV, AVI (max 500MB)
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
          <div className="space-y-2">
            <Label htmlFor="sport-select" className="text-white font-medium">Sport</Label>
            <Popover open={sportDropdownOpen} onOpenChange={setSportDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sportDropdownOpen}
                  className="w-full max-w-xs justify-between bg-athlete-gray-700 border-gray-600 text-white hover:bg-athlete-gray-600"
                  data-testid="button-sport-select"
                >
                  {sport
                    ? sports.find(s => s.id === sport)?.name
                    : "Select sport..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[300px] p-0 bg-athlete-gray-700 border-gray-600" 
                side="bottom" 
                sideOffset={4} 
                align="start"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  const searchInput = e.currentTarget.querySelector('input');
                  if (searchInput) {
                    searchInput.focus();
                  }
                }}
              >
                <div className="p-3 border-b border-gray-600">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search sports..."
                      value={sportSearchTerm}
                      onChange={(e) => setSportSearchTerm(e.target.value)}
                      className="pl-9 bg-athlete-gray-600 border-gray-500 text-white placeholder-gray-400"
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
                          setSport(sportItem.id);
                          setSportDropdownOpen(false);
                          setSportSearchTerm("");
                          // Reset round selection when sport changes
                          if (!hasRounds(sportItem.name)) {
                            setRoundToAnalyze('no-rounds');
                          } else {
                            setRoundToAnalyze(1);
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

          {/* Round Selection */}
          <div className="space-y-2">
            <Label htmlFor="round" className="text-white font-medium">
              {currentSportHasRounds ? 'Round to Analyze' : 'Analysis Type'}
            </Label>
            <div className="flex space-x-2">
              {currentSportHasRounds ? (
                // Show round buttons for round-based sports
                [1, 2, 3].map((round) => (
                  <Button
                    key={round}
                    onClick={() => setRoundToAnalyze(round)}
                    variant={roundToAnalyze === round ? "default" : "outline"}
                    size="sm"
                    data-testid={`button-round-${round}`}
                    className={roundToAnalyze === round 
                      ? "bg-indigo-600 hover:bg-indigo-700" 
                      : "border-gray-600 text-gray-300"
                    }
                  >
                    Round {round}
                  </Button>
                ))
              ) : (
                // Show "Full Match/Game" button for non-round sports
                <Button
                  onClick={() => setRoundToAnalyze('no-rounds')}
                  variant={roundToAnalyze === 'no-rounds' ? "default" : "outline"}
                  size="sm"
                  data-testid="button-no-rounds"
                  className={roundToAnalyze === 'no-rounds'
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "border-gray-600 text-gray-300"
                  }
                >
                  Full Match/Game
                </Button>
              )}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language" className="text-white font-medium">
              Analysis Language
            </Label>
            <Select 
              value={language} 
              onValueChange={setLanguage}
              data-testid="select-language"
            >
              <SelectTrigger className="bg-athlete-gray-700 border-gray-600 text-white w-full max-w-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-athlete-gray-700 border-gray-600">
                <SelectItem value="english" className="text-white hover:bg-athlete-gray-600">
                  English
                </SelectItem>
                <SelectItem value="arabic" className="text-white hover:bg-athlete-gray-600">
                  العربية (Arabic)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Analysis Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleAnalyze}
              disabled={!uploadedFile || isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
              data-testid="button-analyze-video"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loadingMessage}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Analyze Video (200 tokens)
                </>
              )}
            </Button>
          </div>

          {/* Analysis Info */}
          <div className="bg-athlete-gray-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">What We Analyze:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Kick counts and types for each athlete</li>
              <li>• Scoring patterns and point breakdown</li>
              <li>• Punch attempts and violations</li>
              <li>• Yellow cards and penalties</li>
              <li>• Technical match analysis with expert commentary</li>
              <li>• AI-powered improvement advice for each player</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}