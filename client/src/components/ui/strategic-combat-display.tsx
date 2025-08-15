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
  ChevronRight,
} from "lucide-react";

interface Strategy {
  strategy: string;
  description: string;
  execution: string;
  success_probability: string;
  risk_level: string;
}

interface StrategicCombatData {
  strategies: Strategy[];
}

interface StrategicCombatDisplayProps {
  data: StrategicCombatData;
}

export function StrategicCombatDisplay({ data }: StrategicCombatDisplayProps) {
  if (!data || !data.strategies || !Array.isArray(data.strategies)) {
    return (
      <div className="text-center text-gray-400 py-8">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p>Strategic combat analysis data is not available</p>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('low')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (riskLower.includes('medium')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (riskLower.includes('high')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getSuccessColor = (probability: string) => {
    const probLower = probability.toLowerCase();
    if (probLower.includes('high')) return 'text-green-400';
    if (probLower.includes('medium')) return 'text-yellow-400';
    if (probLower.includes('low')) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSuccessProgress = (probability: string) => {
    const probLower = probability.toLowerCase();
    if (probLower.includes('high')) return 75;
    if (probLower.includes('medium')) return 50;
    if (probLower.includes('low')) return 25;
    return 0;
  };

  const getRiskIcon = (risk: string) => {
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('low')) return <Shield className="w-4 h-4" />;
    if (riskLower.includes('medium')) return <AlertTriangle className="w-4 h-4" />;
    if (riskLower.includes('high')) return <Zap className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="flex items-center justify-center space-x-2 text-red-400">
          <Target size={24} />
          <h2 className="text-2xl font-bold">Combat Strategies</h2>
        </div>
        <p className="text-gray-400">
          Advanced tactical analysis with {data.strategies.length} strategic approaches
        </p>
      </div>

      {/* Strategies Grid */}
      <div className="space-y-6">
        {data.strategies.map((strategy, index) => (
          <Card 
            key={index} 
            className="bg-athlete-gray-800 border-gray-700 hover:border-red-500/30 transition-all duration-300"
            data-testid={`strategy-card-${index}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-white text-lg font-semibold mb-2 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                      <span className="text-red-400 font-bold text-sm">{index + 1}</span>
                    </div>
                    {strategy.strategy}
                  </CardTitle>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Badge 
                    variant="outline" 
                    className={`${getRiskColor(strategy.risk_level)} border`}
                    data-testid={`risk-badge-${index}`}
                  >
                    {getRiskIcon(strategy.risk_level)}
                    <span className="ml-1">{strategy.risk_level} Risk</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Strategy Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                  <Brain className="w-4 h-4 mr-2 text-blue-400" />
                  Strategic Overview
                </h4>
                <p className="text-gray-300 leading-relaxed text-sm bg-athlete-gray-900/50 p-3 rounded-md">
                  {strategy.description}
                </p>
              </div>

              <div className="border-t border-gray-600 my-4"></div>

              {/* Execution Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                  Execution Plan
                </h4>
                <p className="text-gray-300 leading-relaxed text-sm bg-athlete-gray-900/50 p-3 rounded-md">
                  {strategy.execution}
                </p>
              </div>

              <div className="border-t border-gray-600 my-4"></div>

              {/* Success Probability */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                    Success Probability
                  </h4>
                  <span 
                    className={`text-sm font-semibold ${getSuccessColor(strategy.success_probability)}`}
                    data-testid={`success-probability-${index}`}
                  >
                    {strategy.success_probability}
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
      <Card className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-500/30 mt-8">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Award className="text-red-400" size={20} />
            <div>
              <h3 className="text-white font-semibold">Strategic Analysis Complete</h3>
              <p className="text-gray-300 text-sm">
                {data.strategies.length} tactical approaches identified for optimal performance advantage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}