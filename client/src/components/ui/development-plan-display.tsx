import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Target, Dumbbell, Play, ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface DevelopmentPlanDisplayProps {
  plan: string;
  language: string;
  sport?: string;
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
function processTextWithVideos(text: string): { processedText: string; videos: { url: string; videoId: string; exerciseName: string }[] } {
  const youtubeUrls = extractYouTubeUrls(text);
  
  // Deny list for non-exercise terms that should not be used as exercise names
  const denyList = [
    'age', 'height', 'weight', 'gender', 'goal', 'country', 'protein', 'hydration',
    'male', 'female', 'athlete', 'program duration', 'weeks', 'test', 'method',
    'schedule', 'adaptation', 'focus', 'intensity', 'recovery', 'rest', 'warm',
    'cool', 'down', 'as a sports training', 'but with updated workout', 'with updated workout',
    'your training', 'more on training', 'same as phase', 'primary goals',
    'personalized', 'basketball', 'development', 'comprehensive', 'professional'
  ];
  
  // Extract exercise names from the context around YouTube URLs
  const videos = youtubeUrls.map((video, index) => {
    const lines = text.split('\n');
    let exerciseName = `Exercise ${index + 1}`;
    
    // Find the line with the video URL
    const videoLineIndex = lines.findIndex(line => line.includes(video.url));
    
    if (videoLineIndex > 0) {
      // Look for exercise name in the previous few lines
      for (let i = videoLineIndex - 1; i >= Math.max(0, videoLineIndex - 3); i--) {
        const line = lines[i].trim();
        if (line && !line.includes('🎥') && !line.includes('Video:') && !line.includes('فيديو:')) {
          // Clean up markdown and extract exercise name
          const cleanLine = line
            .replace(/^\d+\.\s*/, '')
            .replace(/[*#]+/g, '')
            .replace(/^\s*[-•]\s*/, '')
            .replace(/[&]+/g, '') // Remove HTML entities
            .trim();
          
          // Check if this is a valid exercise name (not in deny list and reasonable length)
          const isValidExercise = cleanLine.length > 3 && 
                                  cleanLine.length < 80 && 
                                  !denyList.some(term => cleanLine.toLowerCase().includes(term.toLowerCase())) &&
                                  !cleanLine.includes('--') && // Not a divider
                                  !/^\d+$/.test(cleanLine) && // Not just a number
                                  !/^(day|week)\s*\d+/i.test(cleanLine); // Not a day/week label
          
          if (isValidExercise) {
            exerciseName = cleanLine;
            break;
          }
        }
      }
    }
    
    return { ...video, exerciseName };
  });
  
  // Clean up text by removing YouTube URLs and markdown formatting
  let processedText = text
    // Remove video labels and URLs (more comprehensive)
    .replace(/(?:🎥\s*(?:Video|فيديو):\s*)?(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s\n]*)\s*/g, ' ')
    // Remove any leftover video reference patterns
    .replace(/🎥\s*(?:Video|فيديو)?\s*:?\s*/g, ' ')
    // Clean up markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/#{1,6}\s*([^\n]+)/g, '$1') // Headers
    .replace(/^\s*[-•*]\s*/gm, '• ') // Bullet points
    // Remove HTML entities that might have been introduced
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up excessive spaces and normalize whitespace
    .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
    .replace(/\s*\n\s*/g, '\n') // Normalize newlines
    // Normalize paragraph spacing - preserve single line breaks within paragraphs, double line breaks between paragraphs
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Reduce multiple blank lines to double newlines
    .replace(/\n\s*\n/g, '\n\n') // Ensure consistent double newlines for paragraph breaks
    .trim();
  
  return { processedText, videos };
}

// Function to parse sections from the development plan with Arabic day support
function parsePlanSections(text: string) {
  // Arabic day names mapping
  const arabicDays = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
  const arabicWeekWords = ['أسبوع', 'الأسبوع', 'برنامج'];
  const sections: { title: string; content: string; type: 'general' | 'schedule' | 'week' | 'day' }[] = [];
  const lines = text.split('\n');
  let currentSection: { title: string; content: string; type: 'general' | 'schedule' | 'week' | 'day' } = { title: '', content: '', type: 'general' };
  
  for (const line of lines) {
    // Detect different section types
    const isWeekSection = (line.includes('Week') && (line.includes('Program') || /Week\s*\d+/i.test(line))) ||
                          arabicWeekWords.some(word => line.includes(word));
    const isDaySection = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(line) || 
                        arabicDays.some(day => line.includes(day));
    const isHeaderSection = line.startsWith('###') || line.startsWith('**') || line.includes('Program');
    
    if (isHeaderSection || isWeekSection || isDaySection) {
      if (currentSection.title || currentSection.content.trim()) {
        sections.push(currentSection);
      }
      
      let sectionType: 'general' | 'schedule' | 'week' | 'day' = 'general';
      if (isWeekSection) sectionType = 'week';
      else if (isDaySection) sectionType = 'day';
      else if (isHeaderSection) sectionType = 'schedule';
      
      currentSection = {
        title: line.replace(/[*#]/g, '').trim(),
        content: '',
        type: sectionType
      };
    } else if (line.trim()) {
      currentSection.content += line + '\n';
    }
  }
  
  if (currentSection.title || currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

export function DevelopmentPlanDisplay({ plan, language, sport = 'training' }: DevelopmentPlanDisplayProps) {
  const { t } = useTranslation('home');
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [showAllVideos, setShowAllVideos] = useState(false);
  
  // Log sport parameter for debugging
  console.log('DevelopmentPlanDisplay received sport:', sport);
  
  const { processedText, videos } = processTextWithVideos(plan);
  const sections = parsePlanSections(processedText);
  
  // Remove duplicate videos
  const uniqueVideos = videos.reduce((acc: typeof videos, video) => {
    const exists = acc.find(v => v.videoId === video.videoId);
    if (!exists) {
      acc.push(video);
    }
    return acc;
  }, []);
  
  // Extract key information from the plan
  const programTitle = sections.find(s => s.title.includes('Week') || s.title.includes('Program'))?.title || 'Development Program';
  const totalVideos = uniqueVideos.length;
  
  return (
    <div className="space-y-8" data-testid="development-plan-display">
      {/* Program Overview Header - Compact */}
      <Card className="bg-gradient-to-br from-athlete-accent/20 to-athlete-gray-800 border-athlete-accent/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-athlete-accent" />
                {programTitle}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-athlete-accent flex-shrink-0" />
                  <span>12 Weeks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Play className="h-3 w-3 text-athlete-accent flex-shrink-0" />
                  <span>{totalVideos} Videos</span>
                </div>
              </div>
            </div>
            <Badge className="bg-athlete-accent text-white px-2 py-1 text-sm">
              AI Generated
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Video Gallery - Always Visible & Interactive */}
      {uniqueVideos.length > 0 && (
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Play className="h-5 w-5 text-athlete-accent" />
              Exercise Demonstration Videos
              <Badge variant="secondary" className="ml-2 bg-athlete-accent text-white">
                {uniqueVideos.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Main Video Player */}
            <div className="space-y-6">
              <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${uniqueVideos[selectedVideoIndex]?.videoId}?rel=0&modestbranding=1`}
                  title={`${uniqueVideos[selectedVideoIndex]?.exerciseName || 'Exercise Demo'}`}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid={`main-video-${selectedVideoIndex}`}
                />
              </div>
              
              {/* Video Navigation Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      {uniqueVideos[selectedVideoIndex]?.exerciseName || 'Exercise Demo'}
                    </h4>
                    <p className="text-sm text-gray-400">Video {selectedVideoIndex + 1} of {uniqueVideos.length}</p>
                  </div>
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
                      onClick={() => setSelectedVideoIndex(Math.min(uniqueVideos.length - 1, selectedVideoIndex + 1))}
                      disabled={selectedVideoIndex === uniqueVideos.length - 1}
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
                  {(showAllVideos ? uniqueVideos : uniqueVideos.slice(0, 8)).map((video, index) => (
                    <button
                      key={`${video.videoId}-${index}`}
                      onClick={() => setSelectedVideoIndex(showAllVideos ? index : index)}
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
                          {video.exerciseName}
                        </div>
                      </div>
                    </button>
                  ))}
                  {uniqueVideos.length > 8 && !showAllVideos && (
                    <button
                      onClick={() => setShowAllVideos(true)}
                      className="aspect-video rounded-lg bg-athlete-gray-700 hover:bg-athlete-gray-600 flex items-center justify-center text-gray-300 transition-colors"
                      data-testid="show-all-videos-button"
                    >
                      <div className="text-center">
                        <ChevronRight className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-xs">+{uniqueVideos.length - 8} more</div>
                      </div>
                    </button>
                  )}
                  {showAllVideos && uniqueVideos.length > 8 && (
                    <button
                      onClick={() => setShowAllVideos(false)}
                      className="aspect-video rounded-lg bg-athlete-gray-700 hover:bg-athlete-gray-600 flex items-center justify-center text-gray-300 transition-colors"
                      data-testid="show-less-videos-button"
                    >
                      <div className="text-center">
                        <ChevronLeft className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-xs">Show less</div>
                      </div>
                    </button>
                  )}
                </div>

                {/* View in YouTube Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(uniqueVideos[selectedVideoIndex]?.url, '_blank')}
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
        <CardContent className="p-6">
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className={`${
                section.type === 'day' ? 'bg-athlete-gray-700/50 rounded-lg p-4 border-l-4 border-athlete-accent' :
                section.type === 'week' ? 'bg-gradient-to-r from-athlete-accent/10 to-transparent rounded-lg p-4' :
                ''
              }`}>
                {section.title && (
                  <h3 className={`font-bold mb-3 flex items-center gap-2 ${
                    section.type === 'day' ? 'text-athlete-accent text-lg' :
                    section.type === 'week' ? 'text-white text-xl' :
                    section.type === 'schedule' ? 'text-athlete-accent text-lg border-l-4 border-athlete-accent pl-4' :
                    'text-white text-base'
                  }`}>
                    {section.type === 'day' && <Calendar className="h-4 w-4" />}
                    {section.type === 'week' && <Target className="h-5 w-5" />}
                    {section.title}
                  </h3>
                )}
                <div className={`leading-relaxed space-y-3 ${
                  section.type === 'day' ? 'text-gray-100' : 'text-gray-200'
                }`}>
                  {section.content.trim().split('\n\n').filter(paragraph => paragraph.trim()).map((paragraph, pIndex) => (
                    <p key={pIndex} className="whitespace-pre-wrap leading-relaxed">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
                {index < sections.length - 1 && section.type !== 'day' && (
                  <hr className="border-gray-600 mt-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}