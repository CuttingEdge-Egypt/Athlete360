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

      {/* Hero Section with Enhanced Professional Athletes */}
      <section className="pt-20 min-h-screen gradient-bg flex items-center relative">
        {/* Professional Athlete Background - Highly Visible */}
        <div className="absolute inset-0 overflow-hidden opacity-25">
          <svg 
            className="absolute inset-0 w-full h-full object-cover text-white" 
            viewBox="0 0 1200 800" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Elite Marathon Runner */}
            <g transform="translate(100, 200)">
              <circle cx="50" cy="40" r="22" fill="currentColor" opacity="0.8" />
              <ellipse cx="55" cy="80" rx="15" ry="35" fill="currentColor" opacity="0.8" />
              <path d="M35 65 L15 45 L8 35" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.8" />
              <path d="M75 70 L95 85 L105 90" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.8" />
              <path d="M45 115 L40 140 L35 170 L30 200" stroke="currentColor" strokeWidth="10" fill="none" opacity="0.8" />
              <path d="M65 115 L72 135 L78 155 L85 175" stroke="currentColor" strokeWidth="10" fill="none" opacity="0.8" />
              {/* Speed lines */}
              <path d="M20 50 L10 48 M25 55 L15 53 M30 60 L20 58" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            </g>

            {/* Professional Basketball Player - Dunking */}
            <g transform="translate(400, 150)">
              <circle cx="60" cy="35" r="20" fill="currentColor" opacity="0.75" />
              <rect x="48" y="55" width="24" height="55" rx="12" fill="currentColor" opacity="0.75" />
              <path d="M35 75 L15 40 L8 25" stroke="currentColor" strokeWidth="9" fill="none" opacity="0.75" />
              <path d="M85 75 L105 40 L112 25" stroke="currentColor" strokeWidth="9" fill="none" opacity="0.75" />
              {/* Basketball */}
              <circle cx="115" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.75" />
              <path d="M103 20 L127 20 M115 8 L115 32" stroke="currentColor" strokeWidth="1" opacity="0.75" />
              <path d="M48 110 L45 135 L42 165 L40 195" stroke="currentColor" strokeWidth="10" fill="none" opacity="0.75" />
              <path d="M72 110 L75 135 L78 165 L80 195" stroke="currentColor" strokeWidth="10" fill="none" opacity="0.75" />
            </g>

            {/* Elite Soccer Player - Power Kick */}
            <g transform="translate(700, 180)">
              <circle cx="55" cy="30" r="18" fill="currentColor" opacity="0.7" />
              <ellipse cx="60" cy="70" rx="18" ry="32" fill="currentColor" opacity="0.7" />
              <path d="M40 60 L20 55 L10 52" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.7" />
              <path d="M80 60 L100 65 L110 68" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.7" />
              <path d="M50 102 L45 125 L40 150 L35 175" stroke="currentColor" strokeWidth="9" fill="none" opacity="0.7" />
              <path d="M70 102 L85 120 L100 135 L115 145" stroke="currentColor" strokeWidth="9" fill="none" opacity="0.7" />
              {/* Soccer ball with motion */}
              <circle cx="120" cy="142" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
              <path d="M114 142 L126 142 M120 136 L120 148" stroke="currentColor" strokeWidth="1" opacity="0.7" />
              <path d="M130 140 L135 138 M140 136 L145 134" stroke="currentColor" strokeWidth="2" opacity="0.4" />
            </g>

            {/* Professional Tennis Player - Serve */}
            <g transform="translate(950, 160)">
              <circle cx="45" cy="25" r="16" fill="currentColor" opacity="0.65" />
              <path d="M38 41 Q45 65 52 89" stroke="currentColor" strokeWidth="25" fill="none" opacity="0.65" />
              <path d="M52 55 L70 30 L85 15 L95 8" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.65" />
              {/* Tennis racket */}
              <ellipse cx="100" cy="3" rx="10" ry="15" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.65" />
              <path d="M95 -12 L95 18 M85 3 L115 3" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              <path d="M38 60 L25 65 L18 67" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.65" />
              <path d="M42 93 L40 115 L38 140 L36 165" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.65" />
              <path d="M48 93 L52 115 L56 140 L60 165" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.65" />
              {/* Tennis ball */}
              <circle cx="75" cy="35" r="4" fill="currentColor" opacity="0.65" />
            </g>

            {/* Professional Cyclist - Time Trial Position */}
            <g transform="translate(200, 400)">
              <circle cx="40" cy="20" r="14" fill="currentColor" opacity="0.6" />
              <ellipse cx="50" cy="45" rx="20" ry="15" fill="currentColor" opacity="0.6" />
              <path d="M30 40 L15 35 L8 33" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.6" />
              <path d="M70 40 L85 35 L92 33" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.6" />
              {/* Aerodynamic handlebars */}
              <path d="M5 33 L12 30 L15 33" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.6" />
              <path d="M45 60 L38 78 L32 95" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.6" />
              <path d="M55 60 L62 78 L68 95" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.6" />
              {/* Bike wheels - larger and more detailed */}
              <circle cx="25" cy="100" r="18" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.6" />
              <circle cx="75" cy="100" r="18" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.6" />
              {/* Spokes */}
              <path d="M25 82 L25 118 M7 100 L43 100 M16 89 L34 111 M34 89 L16 111" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              <path d="M75 82 L75 118 M57 100 L93 100 M66 89 L84 111 M84 89 L66 111" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            </g>
          </svg>
        </div>
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
                <svg className="absolute inset-0 w-full h-full opacity-25 text-white" viewBox="0 0 800 400">
                  {/* Elite Sprinter */}
                  <g transform="translate(50, 120)">
                    {/* Head */}
                    <circle cx="35" cy="30" r="18" fill="currentColor" opacity="0.6" />
                    {/* Torso - leaning forward */}
                    <ellipse cx="40" cy="60" rx="12" ry="28" fill="currentColor" opacity="0.6" />
                    {/* Arms - sprinting motion */}
                    <path d="M25 50 L8 35 L2 28" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.6" />
                    <path d="M55 55 L72 70 L78 75" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.6" />
                    {/* Legs - mid-stride */}
                    <path d="M35 88 L30 110 L25 135 L20 160" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.6" />
                    <path d="M45 88 L52 105 L58 120 L65 135" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.6" />
                    {/* Motion lines */}
                    <path d="M5 45 L0 42 M10 48 L5 45 M15 51 L10 48" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  </g>

                  {/* Basketball Dunker */}
                  <g transform="translate(200, 80)">
                    {/* Head */}
                    <circle cx="40" cy="25" r="16" fill="currentColor" opacity="0.65" />
                    {/* Torso - extended upward */}
                    <rect x="32" y="41" width="16" height="45" rx="8" fill="currentColor" opacity="0.65" />
                    {/* Arms - dunking position */}
                    <path d="M25 55 L10 25 L5 15" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.65" />
                    <path d="M55 55 L70 25 L75 15" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.65" />
                    {/* Basketball */}
                    <circle cx="75" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.65" />
                    <path d="M67 12 L83 12 M75 4 L75 20" stroke="currentColor" strokeWidth="1" opacity="0.65" />
                    {/* Legs - jumping */}
                    <path d="M36 86 L34 105 L32 125 L30 145" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.65" />
                    <path d="M44 86 L46 105 L48 125 L50 145" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.65" />
                  </g>

                  {/* Soccer Player - Power Kick */}
                  <g transform="translate(350, 110)">
                    {/* Head */}
                    <circle cx="40" cy="25" r="15" fill="currentColor" opacity="0.55" />
                    {/* Torso - twisted for power */}
                    <ellipse cx="45" cy="55" rx="14" ry="25" fill="currentColor" opacity="0.55" />
                    {/* Arms - balance */}
                    <path d="M28 45 L12 40 L5 38" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.55" />
                    <path d="M62 45 L78 50 L85 52" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.55" />
                    {/* Legs - kicking motion */}
                    <path d="M38 80 L35 100 L32 120 L30 140" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.55" />
                    <path d="M52 80 L65 95 L78 105 L90 110" stroke="currentColor" strokeWidth="7" fill="none" opacity="0.55" />
                    {/* Soccer ball */}
                    <circle cx="95" cy="108" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
                    <path d="M89 108 L101 108 M95 102 L95 114" stroke="currentColor" strokeWidth="1" opacity="0.55" />
                  </g>

                  {/* Tennis Serve */}
                  <g transform="translate(500, 90)">
                    {/* Head */}
                    <circle cx="35" cy="20" r="14" fill="currentColor" opacity="0.5" />
                    {/* Torso - arched for serve */}
                    <path d="M28 34 Q35 50 42 66" stroke="currentColor" strokeWidth="20" fill="none" opacity="0.5" />
                    {/* Serving arm - extended up */}
                    <path d="M42 40 L55 20 L68 8 L78 2" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.5" />
                    {/* Racket */}
                    <ellipse cx="82" cy="-2" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                    <path d="M78 2 L82 -2" stroke="currentColor" strokeWidth="3" opacity="0.5" />
                    {/* Other arm */}
                    <path d="M28 45 L18 50 L12 52" stroke="currentColor" strokeWidth="5" fill="none" opacity="0.5" />
                    {/* Legs - serving stance */}
                    <path d="M32 70 L30 90 L28 110 L26 130" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.5" />
                    <path d="M38 70 L42 90 L46 110 L50 130" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.5" />
                    {/* Tennis ball */}
                    <circle cx="45" cy="25" r="3" fill="currentColor" opacity="0.5" />
                  </g>

                  {/* Cyclist - Racing Position */}
                  <g transform="translate(630, 130)">
                    {/* Head - aerodynamic position */}
                    <circle cx="25" cy="15" r="12" fill="currentColor" opacity="0.45" />
                    {/* Torso - low and aerodynamic */}
                    <ellipse cx="32" cy="35" rx="18" ry="12" fill="currentColor" opacity="0.45" />
                    {/* Arms - on handlebars */}
                    <path d="M18 30 L8 28 L2 27" stroke="currentColor" strokeWidth="5" fill="none" opacity="0.45" />
                    <path d="M46 30 L56 28 L62 27" stroke="currentColor" strokeWidth="5" fill="none" opacity="0.45" />
                    {/* Handlebars */}
                    <path d="M0 27 L4 25 L6 27" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.45" />
                    {/* Legs - pedaling */}
                    <path d="M28 47 L22 62 L18 75" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.45" />
                    <path d="M36 47 L42 62 L46 75" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.45" />
                    {/* Bike wheels */}
                    <circle cx="12" cy="80" r="15" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.45" />
                    <circle cx="52" cy="80" r="15" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.45" />
                    {/* Spokes */}
                    <path d="M12 65 L12 95 M-3 80 L27 80" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                    <path d="M52 65 L52 95 M37 80 L67 80" stroke="currentColor" strokeWidth="1" opacity="0.3" />
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
