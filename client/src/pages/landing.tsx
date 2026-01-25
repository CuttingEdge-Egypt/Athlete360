import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, ChartPie, ChartLine, Dumbbell, Star, ArrowRight, Coins, Plus, Gift, UserPlus, TrendingDown, Target, Calendar, Video, Users, Twitter, Instagram, Linkedin, Mail, MessageCircle, HelpCircle, Loader2 } from "lucide-react";
import { useEffect, useState, useRef, ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import logoImage from "@assets/Athlete360_logo-1_1769372516063.png";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className={`h-full ${className}`} style={{ perspective: "1000px" }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const fadeInDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 }
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -5, transition: { duration: 0.3, ease: "easeOut" } }
};

const buttonPulse = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.98 }
};

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
  const { t, i18n } = useTranslation(['home', 'common']);
  const { language } = useLanguage();

  // Fetch all preview data (not filtered by service type)
  const { data: previewData, isLoading: previewLoading } = useQuery<PreviewApiResponse>({
    queryKey: ['/api/preview/latest-by-type', i18n.language],
    queryFn: async () => {
      const res = await fetch(`/api/preview/latest-by-type?language=${i18n.language}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch preview data');
      return res.json();
    },
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <motion.nav 
        initial="hidden"
        animate="visible"
        variants={fadeInDown}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm"
      >
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <motion.div 
            className="flex items-center space-x-2 flex-shrink-0"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <img src={logoImage} alt="Athlete360" className="h-12 sm:h-14 w-auto" />
          </motion.div>
          <motion.div 
            className="flex items-center gap-1.5 sm:gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInDown} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => setLocation('/signup')}
                data-testid="button-signup"
                className="bg-[#2563eb] hover:bg-[#d4a017] text-white text-xs sm:text-sm px-2 sm:px-4 h-11 transition-colors duration-200"
              >
                <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {t('landing.navigation.signUp')}
              </Button>
            </motion.div>
            <motion.div variants={fadeInDown} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => setLocation('/login')}
                data-testid="button-login"
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white text-xs sm:text-sm px-2 sm:px-4 h-11"
              >
                {t('landing.navigation.signIn')}
              </Button>
            </motion.div>
            
            <motion.div variants={fadeInDown}>
              <LanguageSwitcher />
            </motion.div>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-16 sm:pt-20 min-h-screen gradient-bg flex items-center overflow-hidden">
        <div className="container mx-auto px-3 sm:px-4 py-12 sm:py-20">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.h1 
              className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 text-foreground leading-tight"
              variants={fadeInUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.span 
                className="bg-gradient-to-r from-blue-800 via-blue-600 to-amber-500 bg-clip-text text-transparent inline-block"
                animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ 
                  duration: 5, 
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ backgroundSize: "200% 200%" }}
              >
                {t('landing.hero.title')}
              </motion.span>
            </motion.h1>
            <motion.p 
              className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-8 px-2"
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {t('landing.hero.subtitle')}
            </motion.p>
            <motion.p 
              className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2"
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {t('landing.hero.description')}
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4"
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setLocation('/signup')}
                  data-testid="button-hero-signup"
                  className="bg-[#2563eb] hover:bg-[#d4a017] text-white px-6 sm:px-8 h-12 sm:h-14 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-lg hover:shadow-xl transition-colors duration-200"
                >
                  <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {t('landing.hero.ctaStart')}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setLocation('/login')}
                  data-testid="button-hero-signin"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-white px-6 sm:px-8 h-12 sm:h-14 text-base sm:text-lg font-semibold w-full sm:w-auto"
                >
                  {t('landing.hero.ctaSignIn')}
                </Button>
              </motion.div>
            </motion.div>
            
            {/* Referral Bonus Banner - only show if there's a referral code */}
            {referralCode && (
              <div className="bg-gradient-to-r from-blue-800/20 to-amber-500/20 border border-amber-400/30 rounded-lg p-4 mb-12 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
                  <Gift className="h-5 w-5" />
                  <span className="font-semibold">{t('landing.referralBanner.title')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('landing.referralBanner.description')}
                </p>
              </div>
            )}
            
            {/* Analysis Preview Cards */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 px-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={fadeInUp} transition={{ duration: 0.5, delay: 0.4 }}>
                <TiltCard className="h-full">
                  <Card className="service-card bg-card border shadow-sm h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.5 }}>
                          <ChartPie className="text-2xl text-primary" size={32} />
                        </motion.div>
                        <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">50 {t('units.tokens', { ns: 'common' })}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{t('services.bioAnalysis.title')}</h3>
                      <p className="text-muted-foreground text-sm mb-3 flex-grow">{t('services.bioAnalysis.description')}</p>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'bio' })}
                        data-testid="button-preview-bio"
                        variant="outline" 
                        size="sm" 
                        className="w-full border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 mt-auto transition-colors"
                      >
                        <HelpCircle className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>

              <motion.div variants={fadeInUp} transition={{ duration: 0.5, delay: 0.5 }}>
                <TiltCard className="h-full">
                  <Card className="service-card bg-card border shadow-sm h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.5 }}>
                          <Trophy className="text-2xl text-amber-500" size={32} />
                        </motion.div>
                        <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">70 {t('units.tokens', { ns: 'common' })}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{t('services.rankHistory.title')}</h3>
                      <p className="text-muted-foreground text-sm mb-3 flex-grow">{t('services.rankHistory.description')}</p>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'rank' })}
                        data-testid="button-preview-rank"
                        variant="outline" 
                        size="sm" 
                        className="w-full border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 mt-auto transition-colors"
                      >
                        <HelpCircle className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>

              <motion.div variants={fadeInUp} transition={{ duration: 0.5, delay: 0.6 }}>
                <TiltCard className="h-full">
                  <Card className="service-card bg-card border shadow-sm h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.5 }}>
                          <Star className="text-2xl text-athlete-success" size={32} />
                        </motion.div>
                        <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">50 {t('units.tokens', { ns: 'common' })}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{t('services.strengths.title')}</h3>
                      <p className="text-muted-foreground text-sm mb-3 flex-grow">{t('services.strengths.description')}</p>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'strengths' })}
                        data-testid="button-preview-strengths"
                        variant="outline" 
                        size="sm" 
                        className="w-full border-green-500 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 mt-auto transition-colors"
                      >
                        <HelpCircle className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>

              <motion.div variants={fadeInUp} transition={{ duration: 0.5, delay: 0.7 }}>
                <TiltCard className="h-full">
                  <Card className="service-card bg-card border shadow-sm h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.5 }}>
                          <TrendingDown className="text-2xl text-red-400" size={32} />
                        </motion.div>
                        <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">50 {t('units.tokens', { ns: 'common' })}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{t('services.weaknesses.title')}</h3>
                      <p className="text-muted-foreground text-sm mb-3 flex-grow">{t('services.weaknesses.description')}</p>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'weaknesses' })}
                        data-testid="button-preview-weaknesses"
                        variant="outline" 
                        size="sm" 
                        className="w-full border-red-500 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 mt-auto transition-colors"
                      >
                        <HelpCircle className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 px-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={fadeInUp} transition={{ duration: 0.5, delay: 0.8 }}>
                <TiltCard className="h-full">
                  <Card className="service-card bg-card border shadow-sm h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.5 }}>
                          <Target className="text-2xl text-purple-400" size={32} />
                        </motion.div>
                        <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">80 {t('units.tokens', { ns: 'common' })}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{t('services.tacticRecommendations.title', 'How to Beat')}</h3>
                      <p className="text-muted-foreground text-sm mb-3 flex-grow">{t('services.tacticRecommendations.description', 'Strategic insights on how to defeat specific opponents or improve matchups')}</p>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'beat-strategies' })}
                        data-testid="button-preview-beat"
                        variant="outline" 
                        size="sm" 
                        className="w-full border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white hover:border-purple-500 mt-auto transition-colors"
                      >
                        <HelpCircle className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>

              <motion.div variants={fadeInUp} transition={{ duration: 0.5, delay: 0.9 }}>
                <TiltCard className="h-full">
                  <Card className="service-card bg-card border shadow-sm h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.5 }}>
                          <Calendar className="text-2xl text-blue-400" size={32} />
                        </motion.div>
                        <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">80 {t('units.tokens', { ns: 'common' })}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{t('services.developmentPlan.title', 'Development Plan')}</h3>
                      <p className="text-muted-foreground text-sm mb-3 flex-grow">{t('services.developmentPlan.description', 'Personalized training roadmap with specific goals and timelines')}</p>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'development-plan' })}
                        data-testid="button-preview-development"
                        variant="outline" 
                        size="sm" 
                        className="w-full border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 mt-auto transition-colors"
                      >
                        <HelpCircle className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>

              <motion.div variants={fadeInUp} transition={{ duration: 0.5, delay: 1.0 }}>
                <TiltCard className="h-full">
                  <Card className="service-card bg-card border shadow-sm h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.5 }}>
                          <Dumbbell className="text-2xl text-green-400" size={32} />
                        </motion.div>
                        <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">90 {t('units.tokens', { ns: 'common' })}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">{t('services.nutritionPlan.title', 'Nutrition Plan')}</h3>
                      <p className="text-muted-foreground text-sm mb-3 flex-grow">{t('services.nutritionPlan.description', 'Comprehensive meal planning based on body composition and goals')}</p>
                      <Button 
                        onClick={() => setPreviewModal({ open: true, serviceType: 'nutrition-plan' })}
                        data-testid="button-preview-nutrition"
                        variant="outline" 
                        size="sm" 
                        className="w-full border-green-500 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 mt-auto transition-colors"
                      >
                        <HelpCircle className="mr-2" size={14} />
                        {t('actions.preview')}
                      </Button>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>
            </motion.div>

            {/* Premium Features - Video Analysis and Compare Athletes */}
            <motion.div 
              className="mb-8 sm:mb-12 px-2"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto">
                <TiltCard className="h-full">
                  <Card className="service-card bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-400/30 h-full">
                    <CardContent className="p-8 text-center h-full flex flex-col">
                      <motion.div 
                        className="flex justify-center mb-4"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Video className="text-4xl text-orange-400" size={48} />
                      </motion.div>
                      <h3 className="text-2xl font-semibold mb-3 text-foreground">{t('services.videoAnalysis.title', 'Video Analysis')}</h3>
                      <p className="text-gray-600 mb-4 flex-grow">{t('services.videoAnalysis.description', 'Frame-by-frame performance breakdown with AI-powered insights')}</p>
                      <div className="flex items-center justify-center gap-4 mb-4 mt-auto">
                        <span className="bg-orange-500 text-white text-sm px-4 rounded-full font-semibold inline-flex items-center justify-center h-9">120 {t('units.tokens', { ns: 'common' })}</span>
                        <Button 
                          onClick={() => setPreviewModal({ open: true, serviceType: 'video' })}
                          data-testid="button-preview-video"
                          variant="outline" 
                          size="sm" 
                          className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 h-9 px-4 transition-colors"
                        >
                          <HelpCircle className="mr-2" size={14} />
                          {t('actions.preview')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TiltCard>

                <TiltCard className="h-full">
                  <Card className="service-card bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30 h-full">
                    <CardContent className="p-8 text-center h-full flex flex-col">
                      <motion.div 
                        className="flex justify-center mb-4"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      >
                        <Users className="text-4xl text-purple-400" size={48} />
                      </motion.div>
                      <h3 className="text-2xl font-semibold mb-3 text-foreground">{t('services.athleteComparison.title', 'Compare Athletes')}</h3>
                      <p className="text-gray-600 mb-4 flex-grow">{t('services.athleteComparison.description', 'Head-to-head analysis comparing any two athletes across all performance metrics')}</p>
                      <div className="flex items-center justify-center gap-4 mb-4 mt-auto">
                        <span className="bg-purple-500 text-white text-sm px-4 rounded-full font-semibold inline-flex items-center justify-center h-9">150 {t('units.tokens', { ns: 'common' })}</span>
                        <Button 
                          onClick={() => setPreviewModal({ open: true, serviceType: 'comparison' })}
                          data-testid="button-preview-comparison"
                          variant="outline" 
                          size="sm" 
                          className="border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white hover:border-purple-500 h-9 px-4 transition-colors"
                        >
                          <HelpCircle className="mr-2" size={14} />
                          {t('actions.preview')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TiltCard>
              </div>
            </motion.div>

            {/* Subscription Pricing */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.6, delay: 1.2 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="service-card bg-card/80 border shadow-lg backdrop-blur-sm max-w-md mx-auto">
                <CardContent className="p-8 text-center">
                  <motion.h2 
                    className="text-2xl font-bold mb-4 text-primary"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {t('landing.pricing.journeyTitle')}
                  </motion.h2>
                  <motion.div 
                    className="text-4xl font-bold mb-2 text-foreground"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                  >
                    {t('landing.pricing.price')}<span className="text-lg text-muted-foreground">{t('landing.pricing.period')}</span>
                  </motion.div>
                  <p className="text-muted-foreground mb-6">{t('landing.pricing.tokenDescription')}</p>
                  <div className="space-y-3">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => setLocation('/signup')}
                        data-testid="button-start-free-trial"
                        className="w-full bg-[#2563eb] hover:bg-[#d4a017] py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-colors duration-200"
                      >
                        <UserPlus className="mr-2" size={20} />
                        {t('landing.hero.ctaStart')}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => setLocation('/login')}
                        data-testid="button-start-now"
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary hover:text-white py-4 text-lg font-semibold"
                      >
                        {t('landing.navigation.signIn')} <ArrowRight className="ml-2" size={20} />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* Analysis Preview Modal */}
      {previewModal.serviceType && (
        <>
          <AnalysisPopup
            open={previewModal.open && !previewLoading && !!selectedAnalysis}
            onOpenChange={(open) => setPreviewModal({ open, serviceType: open ? previewModal.serviceType : null })}
            type={previewModal.serviceType}
            data={selectedAnalysis?.resultData}
            athleteName={selectedAnalysis ? t('common.sampleAthlete') : undefined}
            createdAt={selectedAnalysis?.createdAt}
            shared={true}
          />
          
          {/* No Data Available Modal */}
          <Dialog open={previewModal.open && !previewLoading && !selectedAnalysis}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">
                  {t('common:messages.previewNotAvailable')}
                </DialogTitle>
              </DialogHeader>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t('common:messages.previewNotAvailableDesc')}
                </p>
                <Button 
                  onClick={() => setPreviewModal({ open: false, serviceType: null })}
                  variant="outline"
                  data-testid="button-close-no-preview"
                >
                  {t('common:buttons.close')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
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
            <p className="text-muted-foreground">
              Fetching the latest {previewModal.serviceType} analysis for preview
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer - Temporarily hidden */}
      {false && (language === 'ar' ? (
        <footer className="bg-muted border-t py-8 sm:py-12" dir="rtl">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <h5 className="font-semibold mb-4 text-foreground">تواصل</h5>
                <div className="space-y-3">
                  <div className="flex space-x-3 space-x-reverse">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-blue-600 p-2"
                      data-testid="link-linkedin-ar"
                    >
                      <Linkedin size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-pink-500 p-2"
                      data-testid="link-instagram-ar"
                    >
                      <Instagram size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-blue-500 p-2"
                      data-testid="link-twitter-ar"
                    >
                      <Twitter size={18} />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Mail size={14} />
                      <span>support@athlete360.ai</span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <MessageCircle size={14} />
                      <span>دعم الدردشة المباشرة</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-foreground">الدعم</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>مركز المساعدة</li>
                  <li>وثائق API</li>
                  <li>اتصل بنا</li>
                  <li>المجتمع</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-foreground">المميزات</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>ملفات الرياضيين</li>
                  <li>تحليلات الأداء</li>
                  <li>خطط التدريب</li>
                  <li>تحليل الفيديو</li>
                </ul>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2 space-x-reverse mb-4">
                  <img src={logoImage} alt="Athlete360" className="h-12 w-auto" />
                </div>
                <p className="text-muted-foreground text-sm">تحليلات رياضية مدعومة بالذكاء الاصطناعي للجيل القادم من التحليل الرياضي.</p>
              </div>
            </div>
            <div className="border-t mt-8 pt-8 text-center text-muted-foreground text-sm">
              <p>&copy; ٢٠٢٤ Athlete360. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </footer>
      ) : (
        /* Footer - English Version */
        <footer className="bg-muted border-t py-8 sm:py-12">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <img src={logoImage} alt="Athlete360" className="h-12 w-auto" />
                </div>
                <p className="text-muted-foreground text-sm">AI-powered athlete analytics for the next generation of sports analysis.</p>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-foreground">Features</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Athlete Profiles</li>
                  <li>Performance Analytics</li>
                  <li>Training Plans</li>
                  <li>Video Analysis</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-foreground">Support</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Help Center</li>
                  <li>API Documentation</li>
                  <li>Contact Us</li>
                  <li>Community</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4 text-foreground">Connect</h5>
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-blue-500 p-2"
                      data-testid="link-twitter"
                    >
                      <Twitter size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-pink-500 p-2"
                      data-testid="link-instagram"
                    >
                      <Instagram size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-blue-600 p-2"
                      data-testid="link-linkedin"
                    >
                      <Linkedin size={18} />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
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
            <div className="border-t mt-8 pt-8 text-center text-muted-foreground text-sm">
              <p>&copy; 2024 Athlete360. All rights reserved.</p>
            </div>
          </div>
        </footer>
      ))}

    </div>
  );
}
