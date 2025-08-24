import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, ChartPie, ChartLine, Dumbbell, Star, ArrowRight, Coins, Plus, Gift, UserPlus, TrendingDown, Target, Calendar, Video, Users, Twitter, Instagram, Linkedin, Mail, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Landing() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if there's a referral code in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
    }
  }, []);

  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-athlete-primary/90 backdrop-blur-lg border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Trophy className="text-athlete-accent text-2xl" />
            <span className="text-xl font-bold">Athlete360</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setLocation('/signup')}
              data-testid="button-signup"
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
            <Button 
              onClick={() => setLocation('/login')}
              data-testid="button-login"
              variant="outline"
              className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 min-h-screen gradient-bg flex items-center">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
              <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                Athlete360
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              AI-Powered Athlete Analytics & Performance Optimization Platform
            </p>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              Analyze any athlete's performance, get tactical insights, create development plans, and unlock the secrets to athletic excellence with our revolutionary AI system.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                onClick={() => setLocation('/signup')}
                data-testid="button-hero-signup"
                size="lg"
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-4 text-lg font-semibold"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Start Free Trial - 1000 Tokens
              </Button>
              <Button 
                onClick={() => setLocation('/login')}
                data-testid="button-hero-signin"
                size="lg"
                variant="outline"
                className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white px-8 py-4 text-lg font-semibold"
              >
                Sign In to Continue
              </Button>
            </div>
            
            {/* Referral Bonus Banner - only show if there's a referral code */}
            {referralCode && (
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-lg p-4 mb-12 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                  <Gift className="h-5 w-5" />
                  <span className="font-semibold">You're using a referral link!</span>
                </div>
                <p className="text-sm text-gray-300">
                  Your friend will get 100 bonus tokens when you sign up!<br/>
                  You'll start with 1000 free tokens.
                </p>
              </div>
            )}
            
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
                <div className="space-y-3">
                  <Button 
                    onClick={() => setLocation('/signup')}
                    data-testid="button-start-free-trial"
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 py-4 text-lg font-semibold"
                  >
                    <UserPlus className="mr-2" size={20} />
                    Start Free Trial
                  </Button>
                  <Button 
                    onClick={() => setLocation('/login')}
                    data-testid="button-start-now"
                    variant="outline"
                    className="w-full border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white py-4 text-lg font-semibold"
                  >
                    Sign In <ArrowRight className="ml-2" size={20} />
                  </Button>
                </div>
              </CardContent>
            </Card>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* First Row - Core Analysis */}
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
                  <TrendingDown className="text-2xl text-red-400" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">50 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Weaknesses</h3>
                <p className="text-gray-400 text-sm">In-depth analysis of areas needing improvement and targeted solutions</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Second Row - Advanced Features */}
            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Target className="text-2xl text-purple-400" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">80 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">How to Beat</h3>
                <p className="text-gray-400 text-sm">Strategic insights on how to defeat specific opponents or improve matchups</p>
              </CardContent>
            </Card>

            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Calendar className="text-2xl text-blue-400" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">80 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Development Plan</h3>
                <p className="text-gray-400 text-sm">Personalized training roadmap with specific goals and timelines</p>
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

            <Card className="bg-athlete-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Video className="text-2xl text-orange-400" size={32} />
                  <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">120 tokens</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Video Analysis</h3>
                <p className="text-gray-400 text-sm">Frame-by-frame performance breakdown with AI-powered insights</p>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Feature Highlight */}
          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <Users className="text-4xl text-purple-400" size={48} />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">Compare Athletes</h3>
                <p className="text-gray-300 mb-4">Head-to-head analysis comparing any two athletes across all performance metrics</p>
                <span className="bg-purple-500 text-white text-sm px-4 py-2 rounded-full font-semibold">150 tokens</span>
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
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-blue-400 p-2"
                    data-testid="link-twitter"
                  >
                    <Twitter size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-pink-400 p-2"
                    data-testid="link-instagram"
                  >
                    <Instagram size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-blue-600 p-2"
                    data-testid="link-linkedin"
                  >
                    <Linkedin size={18} />
                  </Button>
                </div>
                <div className="text-sm text-gray-400 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail size={14} />
                    <span>support@athlete360.ai</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageCircle size={14} />
                    <span>Live Chat Support</span>
                  </div>
                </div>
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
