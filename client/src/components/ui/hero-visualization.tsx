import { useEffect, useState } from "react";

export function HeroVisualization() {
  const [currentStat, setCurrentStat] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat(prev => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Athletes Analyzed", value: "2,847", color: "#3B82F6" },
    { label: "Performance Score", value: "94.2%", color: "#10B981" },
    { label: "API Integrations", value: "8 Active", color: "#F59E0B" }
  ];

  const athletes = [
    { id: 1, x: "15%", y: "30%", sport: "⚽", color: "#3B82F6", name: "Soccer" },
    { id: 2, x: "35%", y: "20%", sport: "🏀", color: "#F59E0B", name: "Basketball" },
    { id: 3, x: "55%", y: "40%", sport: "🎾", color: "#10B981", name: "Tennis" },
    { id: 4, x: "75%", y: "25%", sport: "🥊", color: "#EF4444", name: "Boxing" },
    { id: 5, x: "85%", y: "35%", sport: "🏈", color: "#8B5CF6", name: "Football" }
  ];

  return (
    <div className="relative w-full h-96 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-blue-500/50 backdrop-blur-sm">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Performance Chart Background */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Animated performance line */}
        <path
          d="M50 280 Q150 220 250 260 Q350 180 450 240 Q550 200 650 220 Q750 180 850 200"
          fill="none"
          stroke="url(#chartGradient)"
          strokeWidth="3"
          className="animate-pulse"
        />
        
        {/* Data points */}
        {[150, 250, 350, 450, 550, 650, 750].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={220 + Math.sin(i) * 40}
            r="4"
            fill="#3B82F6"
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </svg>

      {/* Floating Athlete Icons */}
      <div className="absolute inset-0">
        {athletes.map((athlete, index) => (
          <div
            key={athlete.id}
            className="absolute animate-bounce"
            style={{ 
              left: athlete.x, 
              top: athlete.y,
              animationDelay: `${index * 0.5}s`,
              animationDuration: `${2 + index * 0.3}s`
            }}
          >
            <div className="relative group cursor-pointer">
              <div
                className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl shadow-lg hover:scale-110 transition-all duration-300"
                style={{ backgroundColor: athlete.color }}
              >
                {athlete.sport}
              </div>
              
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {athlete.name}
              </div>

              {/* Glow Effect */}
              <div
                className="absolute inset-0 rounded-full blur-sm opacity-50"
                style={{ backgroundColor: athlete.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Analytics Overlay */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/50 backdrop-blur-md rounded-lg p-4 text-white border border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Analytics</span>
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">{stats[currentStat].label}:</span>
              <span 
                className="font-bold transition-all duration-500"
                style={{ color: stats[currentStat].color }}
              >
                {stats[currentStat].value}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent backdrop-blur-md p-4 border-t border-blue-500/20">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs md:text-sm">8 Sports</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs md:text-sm">Real-time APIs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs md:text-sm">AI Insights</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm md:text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Athlete360
            </div>
            <div className="text-xs text-gray-300 hidden md:block">Next-Gen Analytics</div>
          </div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}