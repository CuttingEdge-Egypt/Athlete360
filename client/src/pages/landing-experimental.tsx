import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { UserPlus, ChartPie, Trophy, Scale, Target, Gift, HelpCircle, Video, ArrowRight } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import logoImage from '@assets/NewLogo_1765909713887.jpeg';

import squashImage from '@assets/1920471-2038466691_1765914070355.jpg';
import taekwondoImage from '@assets/171020105248526_Amy+Truesdale_1765914077745.jpg';
import fencingImage from '@assets/f36678a75ccddae385e7b563ceb7a774_1765914083516.jpeg';
import swimmingImage from '@assets/freestyle-stroke-breathing-technique-myswimpro_1765914090436.jpeg';
import tennisImage from '@assets/images_1765914095101.jpg';
import wrestlingImage from '@assets/wrestling-singapore_1765914098964.jpg';

const galleryImages = [
  { src: squashImage, alt: 'Squash player in action' },
  { src: taekwondoImage, alt: 'Taekwondo match' },
  { src: fencingImage, alt: 'Fencing competition' },
  { src: swimmingImage, alt: 'Swimmer freestyle' },
  { src: tennisImage, alt: 'Tennis close-up' },
  { src: wrestlingImage, alt: 'Wrestling match' },
];

function AnimatedGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (hoveredIndex === null) {
        setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [hoveredIndex]);

  const getImagePosition = (index: number) => {
    const totalImages = galleryImages.length;
    const relativeIndex = (index - currentIndex + totalImages) % totalImages;
    
    const positions = [
      { x: 0, y: 0, z: 100, scale: 1.1, opacity: 1, blur: 0 },
      { x: 55, y: -15, z: 50, scale: 0.85, opacity: 0.9, blur: 1 },
      { x: -55, y: 15, z: 50, scale: 0.85, opacity: 0.9, blur: 1 },
      { x: 70, y: 25, z: 0, scale: 0.7, opacity: 0.7, blur: 2 },
      { x: -70, y: -25, z: 0, scale: 0.7, opacity: 0.7, blur: 2 },
      { x: 0, y: -50, z: -50, scale: 0.5, opacity: 0.4, blur: 4 },
    ];
    
    return positions[relativeIndex] || { x: 0, y: 100, z: -100, scale: 0.3, opacity: 0, blur: 6 };
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] md:h-[600px] perspective-[1000px] overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      <AnimatePresence>
        {galleryImages.map((image, index) => {
          const pos = getImagePosition(index);
          const isHovered = hoveredIndex === index;
          
          return (
            <motion.div
              key={index}
              className="absolute left-1/2 top-1/2 cursor-pointer"
              initial={false}
              animate={{
                x: `calc(-50% + ${pos.x}%)`,
                y: `calc(-50% + ${pos.y}%)`,
                z: pos.z,
                scale: isHovered ? pos.scale * 1.1 : pos.scale,
                opacity: pos.opacity,
                rotateY: isHovered ? [0, 5, -5, 0] : 0,
                filter: `blur(${isHovered ? 0 : pos.blur}px)`,
              }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 20,
                rotateY: isHovered ? { duration: 0.6, repeat: Infinity, repeatType: 'loop' } : undefined,
              }}
              style={{
                zIndex: Math.round(pos.z) + 100,
                transformStyle: 'preserve-3d',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setCurrentIndex(index)}
            >
              <div 
                className="relative rounded-xl overflow-hidden shadow-2xl"
                style={{
                  width: 'clamp(200px, 35vw, 380px)',
                  aspectRatio: '4/3',
                }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  className="absolute bottom-0 left-0 right-0 p-4 text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm font-medium">{image.alt}</p>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
        {galleryImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white w-6' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
            data-testid={`gallery-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingExperimental() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['home', 'common']);
  const searchParams = new URLSearchParams(window.location.search);
  const referralCode = searchParams.get('ref');

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  const fadeInDown = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      <motion.nav 
        initial="hidden"
        animate="visible"
        variants={fadeInDown}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10"
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
                data-testid="button-signup-experimental"
                className="bg-gradient-to-r from-blue-500 to-amber-500 hover:from-blue-600 hover:to-amber-600 text-white text-xs sm:text-sm px-2 sm:px-4 h-11"
              >
                <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {t('landing.navigation.signUp')}
              </Button>
            </motion.div>
            <motion.div variants={fadeInDown} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => setLocation('/login')}
                data-testid="button-login-experimental"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-4 h-11"
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

      <section className="pt-24 sm:pt-28 min-h-screen flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />
        </div>

        <motion.div 
          className="text-center max-w-4xl mx-auto px-4 mb-8 relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1
            className="text-5xl sm:text-7xl md:text-8xl font-bold mb-6 tracking-tight"
            variants={fadeInUp}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <motion.span 
              className="bg-gradient-to-r from-blue-400 via-blue-300 to-amber-400 bg-clip-text text-transparent inline-block"
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
              Athlete360
            </motion.span>
          </motion.h1>
          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-blue-100/80 mb-4"
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {t('landing.hero.subtitle')}
          </motion.p>
          <motion.p 
            className="text-sm sm:text-base text-blue-200/60 max-w-2xl mx-auto"
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t('landing.hero.description')}
          </motion.p>
        </motion.div>

        <motion.div
          className="w-full max-w-6xl mx-auto px-4 relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <AnimatedGallery />
        </motion.div>

        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center mt-8 px-4 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Button 
            onClick={() => setLocation('/signup')}
            data-testid="button-get-started-experimental"
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-amber-500 hover:from-blue-600 hover:to-amber-600 text-white text-lg px-8 py-6 rounded-full shadow-lg shadow-blue-500/25"
          >
            {t('landing.navigation.signUp')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            onClick={() => setLocation('/login')}
            data-testid="button-signin-hero-experimental"
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-full"
          >
            {t('landing.navigation.signIn')}
          </Button>
        </motion.div>

        {referralCode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-gradient-to-r from-blue-500/20 to-amber-500/20 border border-amber-400/30 rounded-lg p-4 mt-8 max-w-lg mx-4"
          >
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
              <Gift className="h-5 w-5" />
              <span className="font-semibold">{t('landing.referralBanner.title')}</span>
            </div>
            <p className="text-sm text-blue-200/80 text-center">
              {t('landing.referralBanner.description')}
            </p>
          </motion.div>
        )}
      </section>

      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span className="bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
              {t('services.title', 'Our Services')}
            </span>
          </motion.h2>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { icon: ChartPie, title: t('services.bioAnalysis.title'), desc: t('services.bioAnalysis.description'), tokens: 50, color: 'blue' },
              { icon: Trophy, title: t('services.rankHistory.title'), desc: t('services.rankHistory.description'), tokens: 70, color: 'amber' },
              { icon: Scale, title: t('services.athleteComparison.title'), desc: t('services.athleteComparison.description'), tokens: 100, color: 'purple' },
              { icon: Target, title: t('services.howToBeat.title'), desc: t('services.howToBeat.description'), tokens: 90, color: 'green' },
            ].map((service, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 h-full group">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <motion.div 
                        whileHover={{ rotate: 360, scale: 1.1 }} 
                        transition={{ duration: 0.5 }}
                        className={`p-3 rounded-lg bg-${service.color}-500/20`}
                      >
                        <service.icon className={`text-${service.color}-400`} size={28} />
                      </motion.div>
                      <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        {service.tokens} {t('units.tokens', { ns: 'common' })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-blue-300 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-blue-200/60 text-sm flex-grow">
                      {service.desc}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-4 text-blue-300 hover:text-white hover:bg-white/10"
                      data-testid={`button-service-${index}`}
                    >
                      <HelpCircle className="mr-2" size={14} />
                      {t('actions.preview')}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-400/30 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <motion.div
                  className="flex justify-center mb-4"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Video className="text-orange-400" size={48} />
                </motion.div>
                <h3 className="text-2xl font-semibold mb-3 text-white">
                  {t('services.videoAnalysis.title', 'Video Analysis')}
                </h3>
                <p className="text-blue-200/70 mb-4 max-w-2xl mx-auto">
                  {t('services.videoAnalysis.description', 'Upload your training videos and receive detailed AI-powered analysis of your technique, movement patterns, and areas for improvement.')}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="bg-orange-500 text-white text-sm px-3 py-1 rounded-full font-semibold">
                    150 {t('units.tokens', { ns: 'common' })}
                  </span>
                  <span className="text-orange-300 text-sm">{t('labels.perVideo', 'per video')}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-blue-200/50 text-sm">
            &copy; {new Date().getFullYear()} Athlete360. {t('footer.rights', 'All rights reserved.')}
          </p>
        </div>
      </footer>
    </div>
  );
}
