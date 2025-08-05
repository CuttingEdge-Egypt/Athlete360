import { useEffect, useState } from "react";

export function HeroVisualization() {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const athletes = [
    { id: 1, x: 120, y: 180, sport: "⚽", color: "#3B82F6", name: "Soccer" },
    { id: 2, x: 280, y: 150, sport: "🏀", color: "#F59E0B", name: "Basketball" },
    { id: 3, x: 450, y: 190, sport: "🎾", color: "#10B981", name: "Tennis" },
    { id: 4, x: 600, y: 160, sport: "🥊", color: "#EF4444", name: "Boxing" },
    { id: 5, x: 750, y: 175, sport: "🏈", color: "#8B5CF6", name: "Football" }
  ];

  const dataPoints = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 800 + 50,
    y: Math.random() * 300 + 100,
    value: Math.random() * 100
  }));

  return (
    <div className="relative w-full h-96 bg-gradient-to-br from-athlete-primary via-athlete-gray-800 to-athlete-gray-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Background Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Animated Data Visualization */}
      <svg className="absolute inset-0 w-full h-full">
        {/* Performance Lines */}
        <path
          d="M50,300 Q200,200 400,250 T750,180"
          fill="none"
          stroke="url(#gradient1)"
          strokeWidth="3"
          opacity={animationPhase >= 1 ? 0.8 : 0}
          className="transition-opacity duration-1000"
        />
        
        <path
          d="M50,250 Q300,150 500,200 T800,160"
          fill="none"
          stroke="url(#gradient2)"
          strokeWidth="3"
          opacity={animationPhase >= 2 ? 0.8 : 0}
          className="transition-opacity duration-1000 delay-500"
        />

        {/* Data Points */}
        {dataPoints.slice(0, 20).map((point, index) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="#60A5FA"
            opacity={animationPhase >= 3 ? 0.6 : 0}
            className="transition-opacity duration-500"
            style={{ transitionDelay: `${index * 100}ms` }}
          />
        ))}

        {/* Gradients */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#3B82F6", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#10B981", stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: "#F59E0B", stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#EF4444", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#8B5CF6", stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: "#06B6D4", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating Athlete Icons */}
      <div className="absolute inset-0">
        {athletes.map((athlete, index) => (
          <div
            key={athlete.id}
            className="absolute animate-pulse"
            style={{ left: athlete.x, top: athlete.y }}
          >
            <div className="relative group cursor-pointer">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform"
                style={{ backgroundColor: athlete.color }}
              >
                {athlete.sport}
              </div>
              
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {athlete.name}
              </div>

              {/* Pulse Effect */}
              <div
                className="absolute inset-0 rounded-full border-2 animate-ping"
                style={{ borderColor: athlete.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Analytics Overlay */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 text-white animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">AI Analysis Active</span>
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Performance Score:</span>
              <span className="text-green-400 font-bold animate-pulse">
                94.2%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Athletes Analyzed:</span>
              <span className="text-blue-400 font-bold">2,847</span>
            </div>
            <div className="flex justify-between">
              <span>Real-time Updates:</span>
              <span className="text-yellow-400 font-bold">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/40 to-transparent backdrop-blur-sm p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm">8 Sports Supported</span>
            </div>
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Real-time API Integration</span>
            </div>
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '400ms' }}>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm">AI-Powered Insights</span>
            </div>
          </div>
          
          <div className="text-right animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Athlete360
            </div>
            <div className="text-xs text-gray-300">Next-Gen Sports Analytics</div>
          </div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}