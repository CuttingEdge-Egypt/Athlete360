import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Target, Dumbbell, Play, ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface DevelopmentPlanDisplayProps {
  plan: string;
  language: string;
}

// Function to extract YouTube video URLs from plan text
function extractYouTubeUrls(text: string): { url: string; videoId: string }[] {
  // More robust regex that supports various YouTube URL formats and is language-agnostic
  const youtubeRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11}))(?:[&?][^\s\n]*)?/g;
  const videos: { url: string; videoId: string }[] = [];
  let match;
  
  while ((match = youtubeRegex.exec(text)) !== null) {
    videos.push({
      url: match[1],
      videoId: match[2]
    });
  }
  
  return videos;
}

// Function to convert YouTube URLs to embedded iframes and clean the text
function processTextWithVideos(text: string): { processedText: string; videos: { url: string; videoId: string }[] } {
  const videos = extractYouTubeUrls(text);
  
  // Remove YouTube URLs from the text with flexible patterns (including video labels in multiple languages)
  let processedText = text
    // Remove Arabic and English video labels with URLs
    .replace(/(?:🎥\s*(?:Video|فيديو):\s*)?(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s\n]*)\n?/g, '')
    // Clean up extra newlines and spaces
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
  
  return { processedText, videos };
}

// Function to parse sections from the development plan
function parsePlanSections(text: string) {
  const sections: { title: string; content: string; type: 'general' | 'schedule' }[] = [];
  const lines = text.split('\n');
  let currentSection: { title: string; content: string; type: 'general' | 'schedule' } = { title: '', content: '', type: 'general' };
  
  for (const line of lines) {
    if (line.startsWith('###') || line.startsWith('**') || line.includes('Week') || line.includes('Monday') || line.includes('Tuesday')) {
      if (currentSection.title || currentSection.content) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/[*#]/g, '').trim(),
        content: '',
        type: line.includes('Week') || line.includes('Monday') || line.includes('Tuesday') || line.includes('Wednesday') || line.includes('Thursday') || line.includes('Friday') ? 'schedule' as const : 'general' as const
      };
    } else {
      currentSection.content += line + '\n';
    }
  }
  
  if (currentSection.title || currentSection.content) {
    sections.push(currentSection);
  }
  
  return sections;
}

export function DevelopmentPlanDisplay({ plan, language }: DevelopmentPlanDisplayProps) {
  const { t } = useTranslation('home');
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  
  const { processedText, videos } = processTextWithVideos(plan);
  const sections = parsePlanSections(processedText);
  
  // Extract key information from the plan
  const programTitle = sections.find(s => s.title.includes('Week') || s.title.includes('Program'))?.title || 'Development Program';
  const totalVideos = videos.length;
  
  return (
    <div className="space-y-8" data-testid="development-plan-display">
      {/* Program Overview Header */}
      <Card className="bg-gradient-to-br from-athlete-accent/20 to-athlete-gray-800 border-athlete-accent/30">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <Target className="h-6 w-6 text-athlete-accent" />
                {programTitle}
              </CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-athlete-accent" />
                  <span>12-Week Program</span>
                </div>
                <div className="flex items-center gap-1">
                  <Dumbbell className="h-4 w-4 text-athlete-accent" />
                  <span>Strength & Agility</span>
                </div>
                <div className="flex items-center gap-1">
                  <Play className="h-4 w-4 text-athlete-accent" />
                  <span>{totalVideos} Exercise Videos</span>
                </div>
              </div>
            </div>
            <Badge className="bg-athlete-accent text-white px-3 py-1">
              AI Generated
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Video Gallery - Always Visible & Interactive */}
      {videos.length > 0 && (
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Play className="h-5 w-5 text-athlete-accent" />
              Exercise Demonstration Videos
              <Badge variant="secondary" className="ml-2 bg-athlete-accent text-white">
                {videos.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Main Video Player */}
            <div className="space-y-6">
              <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${videos[selectedVideoIndex]?.videoId}?rel=0&modestbranding=1`}
                  title={`Exercise Demo ${selectedVideoIndex + 1}`}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid={`main-video-${selectedVideoIndex}`}
                />
              </div>
              
              {/* Video Navigation Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">
                    Exercise Video {selectedVideoIndex + 1} of {videos.length}
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVideoIndex(Math.max(0, selectedVideoIndex - 1))}
                      disabled={selectedVideoIndex === 0}
                      className="border-gray-600 text-gray-300 hover:bg-athlete-gray-700 hover:text-white"
                      data-testid="video-prev-button"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVideoIndex(Math.min(videos.length - 1, selectedVideoIndex + 1))}
                      disabled={selectedVideoIndex === videos.length - 1}
                      className="border-gray-600 text-gray-300 hover:bg-athlete-gray-700 hover:text-white"
                      data-testid="video-next-button"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
                
                {/* Video Thumbnails Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videos.slice(0, 8).map((video, index) => (
                    <button
                      key={video.videoId}
                      onClick={() => setSelectedVideoIndex(index)}
                      className={`relative aspect-video rounded-lg overflow-hidden transition-all duration-200 ${
                        selectedVideoIndex === index 
                          ? 'ring-2 ring-athlete-accent shadow-lg scale-105 bg-athlete-accent/20' 
                          : 'hover:scale-102 hover:shadow-md bg-gray-900'
                      }`}
                      data-testid={`video-thumbnail-${index}`}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt={`Exercise ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className={`h-6 w-6 ${selectedVideoIndex === index ? 'text-athlete-accent' : 'text-white'}`} />
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black/80 text-white text-xs px-2 py-1 rounded truncate">
                          Exercise {index + 1}
                        </div>
                      </div>
                    </button>
                  ))}
                  {videos.length > 8 && (
                    <div className="aspect-video rounded-lg bg-athlete-gray-700 flex items-center justify-center text-gray-300">
                      <div className="text-center">
                        <ChevronRight className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-xs">+{videos.length - 8} more</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* View in YouTube Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(videos[selectedVideoIndex]?.url, '_blank')}
                    className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white"
                    data-testid="view-youtube-button"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Watch on YouTube
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Development Plan Content */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-athlete-accent" />
            Training Program Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="prose prose-invert prose-lg max-w-none">
            {sections.map((section, index) => (
              <div key={index} className="mb-8">
                {section.title && (
                  <h3 className={`font-bold mb-4 ${
                    section.type === 'schedule' 
                      ? 'text-athlete-accent text-xl border-l-4 border-athlete-accent pl-4' 
                      : 'text-white text-lg'
                  }`}>
                    {section.title}
                  </h3>
                )}
                <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {section.content.trim()}
                </div>
                {index < sections.length - 1 && (
                  <hr className="border-gray-700 mt-6" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}