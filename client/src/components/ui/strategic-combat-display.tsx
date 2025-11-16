import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Shield,
  Zap,
  Brain,
  TrendingUp,
  AlertTriangle,
  Star,
  Clock,
  Award,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Strategy {
  strategy: string;
  description: string;
  execution: string;
  success_probability: string;
  risk_level: string;
  references?: string[];
}

interface StrategicCombatData {
  strategies: Strategy[];
}

interface StrategicCombatDisplayProps {
  data: StrategicCombatData & { language?: string; generationLanguage?: string };
}

export function StrategicCombatDisplay({ data }: StrategicCombatDisplayProps) {
  const { language } = useLanguage();
  
  // Helper function to detect if text contains Arabic characters
  const containsArabic = (text: string): boolean => {
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
    return arabicPattern.test(text);
  };
  
  // Determine if content is Arabic based on:
  // 1. Data generation language
  // 2. Data language 
  // 3. UI language
  // 4. Actual content detection
  const isArabic = 
    data?.generationLanguage === 'ar' || 
    data?.language === 'ar' ||
    language === 'ar' ||
    (data?.strategies?.[0]?.strategy && containsArabic(data.strategies[0].strategy));
  if (!data || !data.strategies || !Array.isArray(data.strategies)) {
    return (
      <div className="text-center text-gray-400 py-8">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p>{isArabic ? 'بيانات تحليل القتال الاستراتيجي غير متوفرة' : 'Strategic combat analysis data is not available'}</p>
      </div>
    );
  }

  const normalizeRiskLevel = (risk: string): 'low' | 'medium' | 'high' | 'unknown' => {
    const riskLower = risk.toLowerCase();
    // English terms
    if (riskLower.includes('low') || riskLower.includes('minimal')) return 'low';
    if (riskLower.includes('medium') || riskLower.includes('moderate')) return 'medium';
    if (riskLower.includes('high') || riskLower.includes('severe')) return 'high';
    // Arabic terms
    if (riskLower.includes('منخفض') || riskLower.includes('قليل')) return 'low';
    if (riskLower.includes('متوسط') || riskLower.includes('معتدل')) return 'medium';
    if (riskLower.includes('عالي') || riskLower.includes('مرتفع')) return 'high';
    return 'unknown';
  };

  const translateRiskLevel = (risk: string): string => {
    const level = normalizeRiskLevel(risk);
    if (isArabic) {
      switch (level) {
        case 'low': return 'منخفض';
        case 'medium': return 'متوسط';
        case 'high': return 'عالي';
        default: return risk;
      }
    } else {
      switch (level) {
        case 'low': return 'low';
        case 'medium': return 'medium';
        case 'high': return 'high';
        default: return risk;
      }
    }
  };

  const getRiskColor = (risk: string) => {
    const level = normalizeRiskLevel(risk);
    switch (level) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const normalizeSuccessLevel = (probability: string): 'low' | 'medium' | 'high' | 'unknown' => {
    const probLower = probability.toLowerCase();
    // English terms
    if (probLower.includes('high') || probLower.includes('excellent')) return 'high';
    if (probLower.includes('medium') || probLower.includes('moderate')) return 'medium';
    if (probLower.includes('low') || probLower.includes('poor')) return 'low';
    // Arabic terms
    if (probLower.includes('عالي') || probLower.includes('مرتفع') || probLower.includes('ممتاز')) return 'high';
    if (probLower.includes('متوسط') || probLower.includes('معتدل')) return 'medium';
    if (probLower.includes('منخفض') || probLower.includes('قليل') || probLower.includes('ضعيف')) return 'low';
    return 'unknown';
  };

  const getSuccessColor = (probability: string) => {
    const level = normalizeSuccessLevel(probability);
    switch (level) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSuccessProgress = (probability: string) => {
    const level = normalizeSuccessLevel(probability);
    switch (level) {
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 0;
    }
  };

  const translateSuccessProbability = (probability: string): string => {
    const level = normalizeSuccessLevel(probability);
    if (isArabic) {
      switch (level) {
        case 'low': return 'منخفض';
        case 'medium': return 'متوسط';
        case 'high': return 'عالي';
        default: return probability;
      }
    } else {
      switch (level) {
        case 'low': return 'low';
        case 'medium': return 'medium';
        case 'high': return 'high';
        default: return probability;
      }
    }
  };

  const getRiskIcon = (risk: string) => {
    const level = normalizeRiskLevel(risk);
    switch (level) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Zap className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className={`flex items-center justify-center text-red-400 ${isArabic ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'}`}>
          <Target size={24} />
          <h2 className="text-2xl font-bold">{isArabic ? 'استراتيجيات القتال' : 'Combat Strategies'}</h2>
        </div>
        <p className="text-gray-400">
          {isArabic 
            ? `تحليل تكتيكي متقدم يحتوي على ${data.strategies.length} نهج استراتيجي`
            : `Advanced tactical analysis with ${data.strategies.length} strategic approaches`
          }
        </p>
      </div>

      {/* Strategies Grid */}
      <div className="space-y-6">
        {data.strategies.map((strategy, index) => (
          <Card 
            key={index} 
            className="bg-athlete-gray-800 border-gray-700 hover:border-red-500/30 transition-all duration-300"
            data-testid={`strategy-card-${index}`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <CardHeader className="pb-3">
              <div className={`flex items-start justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                <div className="flex-1">
                  <CardTitle className={`text-white text-lg font-semibold mb-2 flex items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center ${isArabic ? 'ml-3' : 'mr-3'}`}>
                      <span className="text-red-400 font-bold text-sm">{index + 1}</span>
                    </div>
                    <span className={isArabic ? 'text-right' : ''}>{strategy.strategy}</span>
                  </CardTitle>
                </div>
                <div className={`flex ${isArabic ? 'mr-4 space-x-reverse space-x-2' : 'ml-4 space-x-2'}`}>
                  <Badge 
                    variant="outline" 
                    className={`${getRiskColor(strategy.risk_level)} border`}
                    data-testid={`risk-badge-${index}`}
                  >
                    {getRiskIcon(strategy.risk_level)}
                    <span className={isArabic ? 'mr-1' : 'ml-1'}>
                      {isArabic 
                        ? `مخاطرة ${translateRiskLevel(strategy.risk_level)}`
                        : `${translateRiskLevel(strategy.risk_level)} Risk`
                      }
                    </span>
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Strategy Description */}
              <div className="space-y-2">
                <h4 className={`text-sm font-semibold text-gray-300 flex items-center ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                  <Brain className={`w-4 h-4 text-blue-400 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                  {isArabic ? 'نظرة استراتيجية عامة' : 'Strategic Overview'}
                </h4>
                <p className={`text-gray-300 leading-relaxed text-sm bg-athlete-gray-900/50 p-3 rounded-md ${isArabic ? 'text-right' : 'text-left'}`}>
                  {strategy.description}
                </p>
              </div>

              <div className="border-t border-gray-600 my-4"></div>

              {/* Execution Details */}
              <div className="space-y-2">
                <h4 className={`text-sm font-semibold text-gray-300 flex items-center ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                  <Zap className={`w-4 h-4 text-yellow-400 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                  {isArabic ? 'خطة التنفيذ' : 'Execution Plan'}
                </h4>
                <p className={`text-gray-300 leading-relaxed text-sm bg-athlete-gray-900/50 p-3 rounded-md ${isArabic ? 'text-right' : 'text-left'}`}>
                  {strategy.execution}
                </p>
              </div>

              <div className="border-t border-gray-600 my-4"></div>

              {/* Success Probability */}
              <div className="space-y-3">
                <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <h4 className={`text-sm font-semibold text-gray-300 flex items-center ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                    <TrendingUp className={`w-4 h-4 text-green-400 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                    {isArabic ? 'احتمالية النجاح' : 'Success Probability'}
                  </h4>
                  <span 
                    className={`text-sm font-semibold ${getSuccessColor(strategy.success_probability)}`}
                    data-testid={`success-probability-${index}`}
                  >
                    {translateSuccessProbability(strategy.success_probability)}
                  </span>
                </div>
                <Progress 
                  value={getSuccessProgress(strategy.success_probability)} 
                  className="h-2 bg-gray-700"
                  data-testid={`success-progress-${index}`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-500/30 mt-8" dir={isArabic ? 'rtl' : 'ltr'}>
        <CardContent className="p-4">
          <div className={`flex items-center ${isArabic ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
            <Award className="text-red-400" size={20} />
            <div className={isArabic ? 'text-right' : ''}>
              <h3 className="text-white font-semibold">{isArabic ? 'اكتمل التحليل الاستراتيجي' : 'Strategic Analysis Complete'}</h3>
              <p className="text-gray-300 text-sm">
                {isArabic 
                  ? `تم تحديد ${data.strategies.length} نهج تكتيكي لتحقيق ميزة الأداء الأمثل`
                  : `${data.strategies.length} tactical approaches identified for optimal performance advantage`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}