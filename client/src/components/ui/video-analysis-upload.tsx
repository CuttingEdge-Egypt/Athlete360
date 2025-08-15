import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Video, Upload, Loader2, Play, FileVideo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResult } from "./analysis-result";
import { VideoPlayerAnalysis } from "./video-player-analysis";

interface VideoAnalysisUploadProps {
  onClose?: () => void;
}

export function VideoAnalysisUpload({ onClose }: VideoAnalysisUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [roundToAnalyze, setRoundToAnalyze] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

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

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Video files must be under 100MB",
        variant: "destructive",
      });
      return;
    }

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
    
    const formData = new FormData();
    formData.append('video', uploadedFile);
    formData.append('roundToAnalyze', roundToAnalyze.toString());

    try {
      const response = await fetch('/api/analysis/video', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast({
            title: "Insufficient Tokens",
            description: "You need more tokens to perform video analysis. Please purchase tokens to continue.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(result.message || 'Analysis failed');
      }

      setAnalysisResult(result.data);
      toast({
        title: "Analysis Complete",
        description: "Video analysis completed successfully!",
      });

    } catch (error) {
      console.error('Video analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
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
                Upload a taekwondo match video for AI-powered analysis (200 tokens)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Video Upload Area */}
          <div className="space-y-4">
            <Label className="text-white font-medium">Upload Video File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                <div className="space-y-3">
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
                <div className="space-y-3">
                  <Upload className="mx-auto text-gray-400" size={48} />
                  <div>
                    <p className="text-white">Drop your video file here</p>
                    <p className="text-gray-400 text-sm">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supports MP4, MOV, AVI (max 100MB)
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-video-file"
              />
            </div>
          </div>



          {/* Round Selection */}
          <div className="space-y-2">
            <Label htmlFor="round" className="text-white font-medium">
              Round to Analyze
            </Label>
            <div className="flex space-x-2">
              {[1, 2, 3].map((round) => (
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
              ))}
            </div>
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
                  Analyzing Video...
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
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}