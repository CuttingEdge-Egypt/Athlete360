import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Trophy, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ClipAnalysisDisplayProps {
  analysisData: {
    analysisType: string;
    userRequest: string;
    sport: string;
    language: string;
    analysis: string;
    processedAt: string;
  };
  videoFile?: File;
}

export function ClipAnalysisDisplay({ analysisData, videoFile }: ClipAnalysisDisplayProps) {
  const { t } = useTranslation('videoAnalysis');
  
  // Format the analysis text for better readability with proper markdown rendering
  const isArabic = analysisData.language === 'arabic';
  
  const formatAnalysisText = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    let inList = false;
    
    const flushParagraph = (index: number) => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ');
        elements.push(
          <p key={`p-${index}`} className={`mb-7 leading-[2] ${
            isArabic 
              ? 'text-slate-200 text-[18px] font-light tracking-wide' 
              : 'text-foreground text-base leading-relaxed'
          }`}>
            {renderInlineFormatting(paragraphText)}
          </p>
        );
        currentParagraph = [];
      }
    };
    
    const flushList = (index: number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${index}`} className={`mb-8 space-y-5 ${
            isArabic 
              ? 'list-none text-slate-200 text-[17px] font-light' 
              : 'list-disc list-inside text-foreground'
          }`}>
            {listItems.map((item, i) => (
              <li key={i} className={`leading-[1.9] ${
                isArabic 
                  ? 'mr-0 pr-5 border-r-[3px] border-indigo-500 bg-slate-800/30 py-3 rounded-r-lg hover:bg-slate-800/50 transition-colors' 
                  : 'ml-4'
              }`}>
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        flushParagraph(index);
        flushList(index);
        return;
      }
      
      // Handle markdown headers (### or ##)
      if (trimmedLine.startsWith('###')) {
        flushParagraph(index);
        flushList(index);
        elements.push(
          <h3 key={`h3-${index}`} className={`font-bold mb-5 mt-10 pb-3 ${
            isArabic 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-[21px] border-b border-cyan-500/30' 
              : 'text-white text-xl border-b border-slate-200'
          }`}>
            {trimmedLine.replace(/^###\s*/, '').replace(/\*\*/g, '')}
          </h3>
        );
        return;
      }
      
      if (trimmedLine.startsWith('##')) {
        flushParagraph(index);
        flushList(index);
        elements.push(
          <h2 key={`h2-${index}`} className={`font-extrabold mb-6 mt-12 pb-4 ${
            isArabic 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-[24px] border-b-2 border-purple-500/50' 
              : 'text-white text-2xl border-b-2 border-indigo-500'
          }`}>
            {trimmedLine.replace(/^##\s*/, '').replace(/\*\*/g, '')}
          </h2>
        );
        return;
      }
      
      // Handle bullet points
      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        flushParagraph(index);
        inList = true;
        listItems.push(trimmedLine.replace(/^[*-]\s*/, ''));
        return;
      }
      
      // Handle numbered lists
      if (/^\d+\.\s/.test(trimmedLine)) {
        flushParagraph(index);
        if (!inList) {
          flushList(index);
          inList = true;
        }
        listItems.push(trimmedLine.replace(/^\d+\.\s*/, ''));
        return;
      }
      
      // Handle horizontal rules
      if (trimmedLine === '---') {
        flushParagraph(index);
        flushList(index);
        elements.push(<hr key={`hr-${index}`} className="my-6 border-slate-200" />);
        return;
      }
      
      // Regular text - accumulate into paragraph
      if (!inList) {
        currentParagraph.push(trimmedLine);
      }
    });
    
    // Flush any remaining content
    flushParagraph(lines.length);
    flushList(lines.length);
    
    return elements;
  };
  
  // Render inline formatting (bold text)
  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className={`font-semibold ${
            isArabic 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400' 
              : 'text-white font-bold'
          }`}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Video Preview */}
      {videoFile && (
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="text-indigo-400" size={20} />
              {t('results.videoPreview')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <video
              controls
              className="rounded-lg shadow-lg max-h-[500px] w-auto max-w-full"
              src={URL.createObjectURL(videoFile)}
              data-testid="video-preview"
            >
              Your browser does not support the video tag.
            </video>
          </CardContent>
        </Card>
      )}

      {/* User Request Card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="text-indigo-400" size={20} />
            {t('results.yourRequest')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-foreground italic">"{analysisData.userRequest}"</p>
            <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy size={14} />
                {analysisData.sport}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={14} />
                {analysisData.language === 'arabic' ? 'العربية' : 'English'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <Card className={`border ${
        isArabic 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${
            isArabic 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400' 
              : 'text-white'
          }`}>
            <MessageSquare className={isArabic ? 'text-purple-400' : 'text-indigo-400'} size={20} />
            {t('results.aiAnalysisRecommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`prose prose-invert max-w-none ${
            isArabic ? 'bg-gradient-to-br from-slate-800/40 via-slate-900/40 to-slate-800/40 p-8 rounded-2xl border border-slate-700/30' : ''
          }`}>
            <div className={`${isArabic ? 'text-right dir-rtl space-y-1' : 'space-y-2'}`} dir={isArabic ? 'rtl' : 'ltr'}>
              {formatAnalysisText(analysisData.analysis)}
            </div>
          </div>
          
          {/* Analysis Metadata */}
          <div className={`mt-6 pt-4 border-t ${
            isArabic ? 'border-slate-700/50 text-right' : 'border-slate-200'
          }`}>
            <div className={`flex items-center gap-2 text-sm ${
              isArabic ? 'text-slate-400 flex-row-reverse' : 'text-muted-foreground'
            }`}>
              <Calendar size={14} />
              <span>{t('results.analyzedOn')} {new Date(analysisData.processedAt).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}