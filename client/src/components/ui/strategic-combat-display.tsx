import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  Shield,
  Zap,
  Brain,
  TrendingUp,
  AlertTriangle,
  Award,
} from "lucide-react";
import { useTranslation } from 'react-i18next';

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
  data: StrategicCombatData;
}

export function StrategicCombatDisplay({ data }: StrategicCombatDisplayProps) {
  const { t, i18n } = useTranslation('home');
  if (!data || !data.strategies || !Array.isArray(data.strategies)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p>{t("analysis.combat.noData", "Strategic combat analysis data is not available")}</p>
      </div>
    );
  }

  const normalizeRiskLevel = (risk: string): 'low' | 'medium' | 'high' | 'unknown' => {
    const riskLower = risk.toLowerCase();
    // English terms
    if (riskLower.includes('low') || riskLower.includes('minimal')) return 'low';
    if (riskLower.includes('medium') || riskLower.includes('moderate')) return 'medium';
    if (riskLower.includes('high') || riskLower.includes('severe')) return 'high';
    // Arabic terms (including variations with tanween)
    if (riskLower.includes('منخفض') || riskLower.includes('قليل')) return 'low';
    if (riskLower.includes('متوسط') || riskLower.includes('معتدل')) return 'medium';
    if (riskLower.includes('عالي') || riskLower.includes('عالٍ') || riskLower.includes('مرتفع')) return 'high';
    return 'unknown';
  };

  const translateRiskLevel = (risk: string): string => {
    const level = normalizeRiskLevel(risk);
    switch (level) {
      case 'low': return t("analysis.combat.riskLow", "low");
      case 'medium': return t("analysis.combat.riskMedium", "medium");
      case 'high': return t("analysis.combat.riskHigh", "high");
      default: return risk;
    }
  };

  const getRiskColor = (risk: string) => {
    const level = normalizeRiskLevel(risk);
    switch (level) {
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const normalizeSuccessLevel = (probability: string): 'low' | 'medium' | 'high' | 'unknown' => {
    const probLower = probability.toLowerCase();
    // English terms
    if (probLower.includes('high') || probLower.includes('excellent')) return 'high';
    if (probLower.includes('medium') || probLower.includes('moderate')) return 'medium';
    if (probLower.includes('low') || probLower.includes('poor')) return 'low';
    // Arabic terms (including variations with tanween)
    if (probLower.includes('عالي') || probLower.includes('عالٍ') || probLower.includes('مرتفع') || probLower.includes('ممتاز')) return 'high';
    if (probLower.includes('متوسط') || probLower.includes('معتدل')) return 'medium';
    if (probLower.includes('منخفض') || probLower.includes('قليل') || probLower.includes('ضعيف')) return 'low';
    return 'unknown';
  };

  const getSuccessColor = (probability: string) => {
    const level = normalizeSuccessLevel(probability);
    switch (level) {
      case 'high': return 'text-green-600 font-bold';
      case 'medium': return 'text-amber-600 font-bold';
      case 'low': return 'text-red-600 font-bold';
      default: return 'text-slate-600';
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
    switch (level) {
      case 'low': return t("analysis.combat.successLow", "low");
      case 'medium': return t("analysis.combat.successMedium", "medium");
      case 'high': return t("analysis.combat.successHigh", "high");
      default: return probability;
    }
  };

  const getRiskIcon = (risk: string) => {
    const level = normalizeRiskLevel(risk);
    switch (level) {
      case 'low': return <Shield className="w-5 h-5" />;
      case 'medium': return <AlertTriangle className="w-5 h-5" />;
      case 'high': return <Zap className="w-5 h-5" />;
      default: return <ClipboardList className="w-5 h-5" />;
    }
  };

  const isArabic = i18n.language === 'ar';
  
  return (
    <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="flex items-center justify-center gap-3 text-purple-500">
          <ClipboardList size={32} />
          <h2 className="text-3xl font-bold text-gray-800">{t("services.tacticRecommendations.title", "Tactical Recommendations")}</h2>
        </div>
        <p className="text-gray-600 text-lg">
          {t("analysis.combat.tacticalAnalysis", { count: data.strategies.length, defaultValue: "Advanced tactical analysis with {{count}} strategic approaches" })}
        </p>
      </div>

      {/* Strategies Grid */}
      <div className="space-y-8">
        {data.strategies.map((strategy, index) => (
          <Card 
            key={index} 
            className="bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300"
            data-testid={`strategy-card-${index}`}
          >
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-gray-800 text-xl font-bold flex items-center">
                    <div className={`w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shadow-sm ${isArabic ? 'ml-4' : 'mr-4'}`}>
                      <span className="text-purple-600 font-bold text-lg">{index + 1}</span>
                    </div>
                    {strategy.strategy}
                  </CardTitle>
                </div>
                <div className={`flex gap-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                  <Badge 
                    variant="outline" 
                    className={`${getRiskColor(strategy.risk_level)} border text-sm px-3 py-1`}
                    data-testid={`risk-badge-${index}`}
                  >
                    {getRiskIcon(strategy.risk_level)}
                    <span className={isArabic ? 'mr-2' : 'ml-2'}>
                      {isArabic 
                        ? `${t("analysis.combat.risk", "Risk")} ${translateRiskLevel(strategy.risk_level)}`
                        : `${translateRiskLevel(strategy.risk_level)} ${t("analysis.combat.risk", "Risk")}`
                      }
                    </span>
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Strategy Description Card */}
              <div className="p-6 border-b border-gray-100">
                <h4 className="text-base font-semibold text-gray-700 flex items-center mb-3">
                  <Brain className={`w-5 h-5 text-blue-500 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                  {t("analysis.combat.strategicOverview", "Strategic Overview")}
                </h4>
                <Card className="bg-gray-50 border border-gray-200 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-gray-700 leading-relaxed text-base">
                      {strategy.description}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Execution Details Card */}
              <div className="p-6 border-b border-gray-100">
                <h4 className="text-base font-semibold text-gray-700 flex items-center mb-3">
                  <Zap className={`w-5 h-5 text-amber-500 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                  {t("analysis.combat.executionPlan", "Execution Plan")}
                </h4>
                <Card className="bg-gray-50 border border-gray-200 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-gray-700 leading-relaxed text-base">
                      {strategy.execution}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Success Probability Card */}
              <div className="p-6">
                <h4 className="text-base font-semibold text-gray-700 flex items-center mb-3">
                  <TrendingUp className={`w-5 h-5 text-green-500 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                  {t("analysis.combat.successProbability", "Success Probability")}
                </h4>
                <Card className="bg-gray-50 border border-gray-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-600 text-base">{t("analysis.combat.estimatedSuccess", "Estimated Success Rate")}</span>
                      <span 
                        className={`text-lg ${getSuccessColor(strategy.success_probability)}`}
                        data-testid={`success-probability-${index}`}
                      >
                        {translateSuccessProbability(strategy.success_probability)}
                      </span>
                    </div>
                    <Progress 
                      value={getSuccessProgress(strategy.success_probability)} 
                      className="h-3 bg-gray-200"
                      data-testid={`success-progress-${index}`}
                    />
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 mt-10 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
              <Award className="text-purple-600" size={24} />
            </div>
            <div>
              <h3 className="text-gray-800 font-bold text-lg">{t("analysis.combat.analysisComplete", "Strategic Analysis Complete")}</h3>
              <p className="text-gray-600 text-base">
                {t("analysis.combat.tacticalApproaches", "{{count}} tactical approaches identified for optimal performance advantage", { count: data.strategies.length })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}