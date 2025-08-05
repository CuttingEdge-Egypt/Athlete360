import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, ChartPie, ChartLine, Dumbbell, Star, ArrowRight, Coins, Plus } from "lucide-react";
import { HeroVisualization } from "@/components/ui/hero-visualization";
import { AthleteBackground } from "@/components/ui/athlete-background";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-athlete-primary/90 backdrop-blur-lg border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Trophy className="text-athlete-accent text-2xl" />
            <span className="text-xl font-bold">Athlete360</span>
          </div>
          <Button 
            onClick={handleLogin}
            data-testid="button-login"
            className="bg-athlete-accent hover:bg-blue-600 text-white"
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 min-h-screen gradient-bg flex items-center relative">
        <AthleteBackground />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-athlete-accent to-athlete-success bg-clip-text text-transparent">
              Athlete360
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              AI-Powered Athlete Analytics & Performance Optimization Platform
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Analyze any athlete's performance, get tactical insights, create development plans, and unlock the secrets to athletic excellence with our revolutionary AI system.
            </p>
            
            {/* Feature Preview Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <ChartPie className="text-3xl text-athlete-accent mb-4 mx-auto" size={48} />
                  <h3 className="text-lg font-semibold mb-2 text-white">Athlete Profiles</h3>
                  <p className="text-gray-400 text-sm">Comprehensive bios with latest stats</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <ChartLine className="text-3xl text-athlete-success mb-4 mx-auto" size={48} />
                  <h3 className="text-lg font-semibold mb-2 text-white">Performance Analytics</h3>
                  <p className="text-gray-400 text-sm">Dynamic analysis and rankings</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Dumbbell className="text-3xl text-athlete-warning mb-4 mx-auto" size={48} />
                  <h3 className="text-lg font-semibold mb-2 text-white">Training Plans</h3>
                  <p className="text-gray-400 text-sm">Personalized development strategies</p>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Pricing */}
            <Card className="bg-gray-800/30 border-gray-700 backdrop-blur-sm max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-athlete-accent">Start Your Journey</h2>
                <div className="text-4xl font-bold mb-2 text-white">$25<span className="text-lg text-gray-400">/month</span></div>
                <p className="text-gray-300 mb-6">Get 1,000 tokens to analyze any athlete</p>
                <Button 
                  onClick={handleLogin}
                  data-testid="button-start-now"
                  className="w-full bg-gradient-to-r from-athlete-accent to-athlete-success hover:from-blue-600 hover:to-green-600 py-4 text-lg font-semibold"
                >
                  Start Now <ArrowRight className="ml-2" size={20} />
                </Button>
              </CardContent>
            </Card>

            {/* Hero Visualization */}
            <div className="mt-16 mb-16">
              <h3 className="text-2xl font-bold text-center mb-8 text-white">Live Sports Analytics Dashboard</h3>
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

                {/* Performance Chart */}
                <svg className="absolute inset-0 w-full h-full opacity-30">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#10B981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  
                  <path
                    d="M50 280 Q150 220 250 260 Q350 180 450 240 Q550 200 650 220 Q750 180 850 200"
                    fill="none"
                    stroke="url(#chartGradient)"
                    strokeWidth="3"
                    className="animate-pulse"
                  />
                  
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

                {/* Professional Athlete Silhouettes */}
                <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 800 400">
                  {/* Marathon Runner */}
                  <g transform="translate(100, 150)">
                    <path d="M40 80 C42 78 44 76 46 75 C48 74 50 74 52 75 C54 76 56 78 58 80 C56 82 54 84 52 85 C50 86 48 86 46 85 C44 84 42 82 40 80 Z" fill="currentColor" opacity="0.4" />
                    <rect x="43" y="85" width="12" height="35" rx="6" fill="currentColor" opacity="0.4" />
                    <path d="M38 95 L32 88 L28 85" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.4" />
                    <path d="M60 95 L66 88 L70 85" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.4" />
                    <path d="M46 120 L44 135 L42 150 L40 165" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.4" />
                    <path d="M52 120 L54 135 L56 150 L58 165" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.4" />
                  </g>

                  {/* Basketball Player - Shooting */}
                  <g transform="translate(250, 120)">
                    <circle cx="40" cy="25" r="12" fill="currentColor" opacity="0.35" />
                    <rect x="32" y="37" width="16" height="40" rx="8" fill="currentColor" opacity="0.35" />
                    <path d="M28 50 L18 35 L12 28" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.35" />
                    <path d="M52 50 L62 35 L68 28 L72 22" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.35" />
                    <path d="M36 77 L34 95 L32 113 L30 130" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.35" />
                    <path d="M44 77 L46 95 L48 113 L50 130" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.35" />
                  </g>

                  {/* Soccer Player - Kicking */}
                  <g transform="translate(400, 140)">
                    <circle cx="35" cy="20" r="10" fill="currentColor" opacity="0.3" />
                    <rect x="28" y="30" width="14" height="32" rx="7" fill="currentColor" opacity="0.3" />
                    <path d="M25 42 L15 38 L8 35" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
                    <path d="M45 42 L55 45 L62 48" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
                    <path d="M31 62 L25 78 L15 90 L8 98" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
                    <path d="M39 62 L41 80 L43 98 L45 115" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
                  </g>

                  {/* Tennis Player - Serving */}
                  <g transform="translate(550, 125)">
                    <circle cx="38" cy="22" r="11" fill="currentColor" opacity="0.25" />
                    <rect x="31" y="33" width="14" height="35" rx="7" fill="currentColor" opacity="0.25" />
                    <path d="M45 45 L58 32 L68 25 L75 20" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                    <ellipse cx="78" cy="16" rx="6" ry="9" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
                    <path d="M27 45 L18 48 L12 50" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                    <path d="M34 68 L32 85 L30 102 L28 118" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                    <path d="M42 68 L44 85 L46 102 L48 118" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                  </g>

                  {/* Cyclist */}
                  <g transform="translate(680, 160)">
                    <circle cx="30" cy="18" r="9" fill="currentColor" opacity="0.2" />
                    <rect x="24" y="27" width="12" height="25" rx="6" fill="currentColor" opacity="0.2" />
                    <path d="M20 38 L12 35 L6 33" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />
                    <path d="M40 38 L48 35 L54 33" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />
                    <path d="M27 52 L22 65 L18 75" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
                    <path d="M33 52 L38 65 L42 75" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
                    <circle cx="15" cy="80" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2" />
                    <circle cx="45" cy="80" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2" />
                  </g>
                </svg>

                {/* Performance Metrics */}
                <div className="absolute top-4 right-4">
                  <div className="bg-black/60 backdrop-blur-md rounded-lg p-4 text-white border border-gray-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Performance Analytics</span>
                    </div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Elite Athletes:</span>
                        <span className="font-bold text-blue-400">2,847</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Avg Score:</span>
                        <span className="font-bold text-green-400">94.2%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Capabilities */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent backdrop-blur-md p-4 border-t border-gray-500/20">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs md:text-sm">Multi-Sport Analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs md:text-sm">Real-time Data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-xs md:text-sm">AI-Powered</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm md:text-lg font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
                        Professional Athletics
                      </div>
                      <div className="text-xs text-gray-400 hidden md:block">Performance Platform</div>
                    </div>
                  </div>
                </div>

                {/* Floating Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
                  {[1,2,3,4,5,6,7,8].map((i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                      style={{
                        left: `${10 + (i * 10)}%`,
                        top: `${10 + (i * 8)}%`,
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: `${2 + i * 0.3}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-athlete-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">About Athlete360 AI</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Revolutionary sports analytics platform that combines artificial intelligence with deep athletic insights to provide unprecedented analysis of any athlete's performance, strengths, and development opportunities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Service Examples */}
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <ChartPie className="text-2xl text-athlete-accent" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">50 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Bio Analysis</h3>
                <p className="text-gray-400 text-sm">Complete athlete biography with career highlights and achievements</p>
              </CardContent>
            </Card>

            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Trophy className="text-2xl text-athlete-warning" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">70 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Rank History</h3>
                <p className="text-gray-400 text-sm">Interactive charts showing ranking progression and improvement recommendations</p>
              </CardContent>
            </Card>

            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Star className="text-2xl text-athlete-success" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">50 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Strengths</h3>
                <p className="text-gray-400 text-sm">Detailed analysis of key strengths and competitive advantages</p>
              </CardContent>
            </Card>

            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Dumbbell className="text-2xl text-green-400" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">90 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Nutrition Plan</h3>
                <p className="text-gray-400 text-sm">Comprehensive meal planning based on body composition and goals</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-athlete-primary border-t border-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Trophy className="text-athlete-accent text-xl" />
                <span className="text-lg font-bold text-white">Athlete360</span>
              </div>
              <p className="text-gray-400 text-sm">AI-powered athlete analytics for the next generation of sports analysis.</p>
            </div>
            <div>
              <h5 className="font-semibold mb-4 text-white">Features</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Athlete Profiles</li>
                <li>Performance Analytics</li>
                <li>Training Plans</li>
                <li>Video Analysis</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4 text-white">Support</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Help Center</li>
                <li>API Documentation</li>
                <li>Contact Us</li>
                <li>Community</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4 text-white">Connect</h5>
              <div className="flex space-x-3">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-athlete-accent p-2">
                  <i className="fab fa-twitter"></i>
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-athlete-accent p-2">
                  <i className="fab fa-instagram"></i>
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-athlete-accent p-2">
                  <i className="fab fa-linkedin"></i>
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 Athlete360. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
