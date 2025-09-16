import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";

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

export function DevelopmentPlanDisplay({ plan, language }: DevelopmentPlanDisplayProps) {
  const { t } = useTranslation('home');
  
  const { processedText, videos } = processTextWithVideos(plan);
  
  // Split text into sections for better formatting
  const sections = processedText.split(/\n(?=\*\*|##|\d+\.|\w+:)/);
  
  return (
    <div className="space-y-6" data-testid="development-plan-display">
      {/* Plan Content */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="prose prose-invert max-w-none">
            {sections.map((section, index) => {
              // Check if this section might have an associated video
              const sectionLines = section.split('\n');
              const exerciseLine = sectionLines.find(line => 
                /(?:\d+\.?\s*)?([A-Za-z][^.\n]*(?:exercise|drill|workout|training|stretch|push|pull|squat|lunge|jump|run))/i.test(line)
              );
              
              return (
                <div key={index} className="mb-6">
                  <div className="whitespace-pre-wrap text-gray-200 leading-relaxed">
                    {section}
                  </div>
                  
                  {/* Show related videos for this section */}
                  {exerciseLine && videos.length > 0 && (
                    <div className="mt-4">
                      {videos.slice(0, Math.min(videos.length, 2)).map((video, videoIndex) => (
                        <div key={videoIndex} className="mb-4">
                          <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                            <Play size={14} />
                            <span>{t('developmentPlan.exerciseVideo')}</span>
                          </div>
                          <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1`}
                              title={`Exercise demonstration video ${videoIndex + 1}`}
                              className="absolute top-0 left-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              data-testid={`video-${videoIndex}`}
                            ></iframe>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Videos Section */}
      {videos.length > 0 && (
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Play size={20} />
              {t('developmentPlan.exerciseVideos')} ({videos.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((video, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1`}
                      title={`Exercise demonstration video ${index + 1}`}
                      className="absolute top-0 left-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      data-testid={`all-videos-${index}`}
                    ></iframe>
                  </div>
                  <p className="text-sm text-gray-400">
                    {t('developmentPlan.video')} {index + 1}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}