import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, ChartPie, ChartLine, Dumbbell, Star, ArrowRight, Coins, Plus, Gift, UserPlus, TrendingDown, Target, Calendar, Video, Users, Twitter, Instagram, Linkedin, Mail, MessageCircle, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/lib/LanguageProvider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface PreviewAnalysisItem {
  serviceType: string;
  resultData: any;
  createdAt: string;
}

interface PreviewApiResponse {
  success: boolean;
  data: PreviewAnalysisItem[];
  count: number;
}

export default function Landing() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [previewModal, setPreviewModal] = useState<{ open: boolean; serviceType: string | null }>({ open: false, serviceType: null });
  const { t } = useTranslation(['home', 'common']);
  const { language } = useLanguage();

  // Fetch all preview data (not filtered by service type)
  const { data: previewData, isLoading: previewLoading } = useQuery<PreviewApiResponse>({
    queryKey: ['/api/preview/latest-by-type'],
    enabled: previewModal.open && !!previewModal.serviceType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get the specific analysis data for the selected service type
  const getAnalysisForPreview = () => {
    if (!previewData?.data || !previewModal.serviceType) return null;
    return previewData.data.find((item: any) => item.serviceType === previewModal.serviceType);
  };

  const selectedAnalysis = getAnalysisForPreview();

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
            <span className="text-xl font-bold">{t('landing.navigation.brand')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button 
              onClick={() => setLocation('/signup')}
              data-testid="button-signup"
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t('landing.navigation.signUp')}
            </Button>
            <Button 
              onClick={() => setLocation('/login')}
              data-testid="button-login"
              variant="outline"
              className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white"
            >
              {t('landing.navigation.signIn')}
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
                {t('landing.hero.title')}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              {t('landing.hero.subtitle')}
            </p>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              {t('landing.hero.description')}
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
                {t('landing.hero.ctaStart')}
              </Button>
              <Button 
                onClick={() => setLocation('/login')}
                data-testid="button-hero-signin"
                size="lg"
                variant="outline"
                className="border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white px-8 py-4 text-lg font-semibold"
              >
                {t('landing.hero.ctaSignIn')}
              </Button>
            </div>
            
            {/* Referral Bonus Banner - only show if there's a referral code */}
            {referralCode && (
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-lg p-4 mb-12 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                  <Gift className="h-5 w-5" />
                  <span className="font-semibold">{t('landing.referralBanner.title')}</span>
                </div>
                <p className="text-sm text-gray-300">
                  {t('landing.referralBanner.description')}
                </p>
              </div>
            )}
            
            {/* Analysis Preview Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <ChartPie className="text-2xl text-athlete-accent" size={32} />
                    <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">50 tokens</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{t('services.bioAnalysis.title')}</h3>
                  <p className="text-gray-400 text-sm mb-3">{t('services.bioAnalysis.description')}</p>
                  <Button 
                    onClick={() => setPreviewModal({ open: true, serviceType: 'bio' })}
                    data-testid="button-preview-bio"
                    variant="outline" 
                    size="sm" 
                    className="w-full border-blue-400/50 text-blue-400 hover:bg-blue-400/10"
                  >
                    <Eye className="mr-2" size={14} />
                    {t('actions.preview')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Trophy className="text-2xl text-athlete-warning" size={32} />
                    <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">70 tokens</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{t('services.rankHistory.title')}</h3>
                  <p className="text-gray-400 text-sm mb-3">{t('services.rankHistory.description')}</p>
                  <Button 
                    onClick={() => setPreviewModal({ open: true, serviceType: 'rank' })}
                    data-testid="button-preview-rank"
                    variant="outline" 
                    size="sm" 
                    className="w-full border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
                  >
                    <Eye className="mr-2" size={14} />
                    {t('actions.preview')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Star className="text-2xl text-athlete-success" size={32} />
                    <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">50 tokens</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{t('services.strengths.title')}</h3>
                  <p className="text-gray-400 text-sm mb-3">{t('services.strengths.description')}</p>
                  <Button 
                    onClick={() => setPreviewModal({ open: true, serviceType: 'strengths' })}
                    data-testid="button-preview-strengths"
                    variant="outline" 
                    size="sm" 
                    className="w-full border-green-400/50 text-green-400 hover:bg-green-400/10"
                  >
                    <Eye className="mr-2" size={14} />
                    {t('actions.preview')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <TrendingDown className="text-2xl text-red-400" size={32} />
                    <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">50 tokens</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{t('services.weaknesses.title')}</h3>
                  <p className="text-gray-400 text-sm mb-3">{t('services.weaknesses.description')}</p>
                  <Button 
                    onClick={() => setPreviewModal({ open: true, serviceType: 'weaknesses' })}
                    data-testid="button-preview-weaknesses"
                    variant="outline" 
                    size="sm" 
                    className="w-full border-red-400/50 text-red-400 hover:bg-red-400/10"
                  >
                    <Eye className="mr-2" size={14} />
                    {t('actions.preview')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Target className="text-2xl text-purple-400" size={32} />
                    <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">80 tokens</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">How to Beat</h3>
                  <p className="text-gray-400 text-sm mb-3">Strategic insights on how to defeat specific opponents or improve matchups</p>
                  <Button 
                    onClick={() => setPreviewModal({ open: true, serviceType: 'beat-strategies' })}
                    data-testid="button-preview-beat"
                    variant="outline" 
                    size="sm" 
                    className="w-full border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                  >
                    <Eye className="mr-2" size={14} />
                    {t('actions.preview')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Calendar className="text-2xl text-blue-400" size={32} />
                    <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">80 tokens</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Development Plan</h3>
                  <p className="text-gray-400 text-sm mb-3">Personalized training roadmap with specific goals and timelines</p>
                  <Button 
                    onClick={() => setPreviewModal({ open: true, serviceType: 'development-plan' })}
                    data-testid="button-preview-development"
                    variant="outline" 
                    size="sm" 
                    className="w-full border-blue-400/50 text-blue-400 hover:bg-blue-400/10"
                  >
                    <Eye className="mr-2" size={14} />
                    {t('actions.preview')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-athlete-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Dumbbell className="text-2xl text-green-400" size={32} />
                    <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">90 tokens</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Nutrition Plan</h3>
                  <p className="text-gray-400 text-sm mb-3">Comprehensive meal planning based on body composition and goals</p>
                  <Button 
                    onClick={() => setPreviewModal({ open: true, serviceType: 'nutrition-plan' })}
                    data-testid="button-preview-nutrition"
                    variant="outline" 
                    size="sm" 
                    className="w-full border-green-400/50 text-green-400 hover:bg-green-400/10"
                  >
                    <Eye className="mr-2" size={14} />
                    {t('actions.preview')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Premium Features - Video Analysis and Compare Athletes */}
            <div className="mb-12">
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Card className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-400/30">
                  <CardContent className="p-8 text-center">
                    <div className="flex justify-center mb-4">
                      <Video className="text-4xl text-orange-400" size={48} />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3 text-white">Video Analysis</h3>
                    <p className="text-gray-300 mb-4">Frame-by-frame performance breakdown with AI-powered insights</p>
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <span className="bg-orange-500 text-white text-sm px-4 py-2 rounded-full font-semibold">120 tokens</span>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'video' })}
                        data-testid="button-preview-video"
                        variant="outline" 
                        size="sm" 
                        className="border-orange-400/50 text-orange-400 hover:bg-orange-400/10"
                      >
                        <Eye className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30">
                  <CardContent className="p-8 text-center">
                    <div className="flex justify-center mb-4">
                      <Users className="text-4xl text-purple-400" size={48} />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3 text-white">Compare Athletes</h3>
                    <p className="text-gray-300 mb-4">Head-to-head analysis comparing any two athletes across all performance metrics</p>
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <span className="bg-purple-500 text-white text-sm px-4 py-2 rounded-full font-semibold">150 tokens</span>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'comparison' })}
                        data-testid="button-preview-comparison"
                        variant="outline" 
                        size="sm" 
                        className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                      >
                        <Eye className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
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


      {/* Analysis Preview Modal */}
      {previewModal.serviceType && (
        <AnalysisPopup
          open={previewModal.open}
          onOpenChange={(open) => setPreviewModal({ open, serviceType: open ? previewModal.serviceType : null })}
          type={previewModal.serviceType}
          data={selectedAnalysis?.resultData}
          athleteName={selectedAnalysis ? "Sample Athlete" : undefined}
          createdAt={selectedAnalysis?.createdAt}
          shared={true}
        />
      )}

      {/* Loading Modal for Preview */}
      <Dialog open={previewModal.open && previewLoading}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center space-x-2">
              <Loader2 className="animate-spin" size={20} />
              <span>Loading Preview...</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-400">
              Fetching the latest {previewModal.serviceType} analysis for preview
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
