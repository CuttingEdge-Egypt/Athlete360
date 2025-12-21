import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { UserPlus, ChartPie, Trophy, Scale, Target, Gift, HelpCircle, Video, ArrowRight, ChevronDown } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import logoImage from '@assets/NewLogo_1765909713887.jpeg';

import squashImage from '@assets/1920471-2038466691_1765914070355.jpg';
import taekwondoImage from '@assets/171020105248526_Amy+Truesdale_1765914077745.jpg';
import fencingImage from '@assets/f36678a75ccddae385e7b563ceb7a774_1765914083516.jpeg';
import swimmingImage from '@assets/freestyle-stroke-breathing-technique-myswimpro_1765914090436.jpeg';
import tennisImage from '@assets/images_1765914095101.jpg';
import wrestlingImage from '@assets/wrestling-singapore_1765914098964.jpg';
import shootingImage from '@assets/Shooting_1766325301815.webp';
import judoImage from '@assets/Judo_1766325307453.jpg';
import tableTennisImage from '@assets/150413103127066_LON_0109_4685_1766325313141.jpg';
import boxingImage from '@assets/Boxing_1766325318681.jpg';

const galleryImages = [
  { src: squashImage, alt: 'Squash' },
  { src: taekwondoImage, alt: 'Taekwondo' },
  { src: fencingImage, alt: 'Fencing' },
  { src: swimmingImage, alt: 'Swimming' },
  { src: tennisImage, alt: 'Tennis' },
  { src: wrestlingImage, alt: 'Wrestling' },
  { src: shootingImage, alt: 'Shooting' },
  { src: judoImage, alt: 'Judo' },
  { src: tableTennisImage, alt: 'Table Tennis' },
  { src: boxingImage, alt: 'Boxing' },
];

interface PlaneData {
  index: number;
  z: number;
  imageIndex: number;
  x: number;
  y: number;
}

const DEFAULT_DEPTH_RANGE = 80;
const MAX_HORIZONTAL_OFFSET = 16;
const MAX_VERTICAL_OFFSET = 12;
const REQUIRED_LOOPS = 5;

interface InfiniteGallery3DProps {
  onLoopsComplete: () => void;
  isActive: boolean;
}

function InfiniteGallery3D({ onLoopsComplete, isActive }: InfiniteGallery3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const lastInteraction = useRef(Date.now());
  const animationRef = useRef<number>();
  const planesDataRef = useRef<PlaneData[]>([]);
  const [, forceUpdate] = useState({});
  const imagePassCountRef = useRef(0);
  const [loopsCompleted, setLoopsCompleted] = useState(false);
  const loopsCompletedRef = useRef(false);

  const visibleCount = 8;
  const totalImages = galleryImages.length;
  const depthRange = DEFAULT_DEPTH_RANGE;
  const speed = 1.2;
  const imagesPerLoop = totalImages;
  const requiredPasses = REQUIRED_LOOPS * imagesPerLoop;

  const fadeSettings = {
    fadeIn: { start: 0.05, end: 0.25 },
    fadeOut: { start: 0.4, end: 0.43 },
  };

  const blurSettings = {
    blurIn: { start: 0.0, end: 0.1 },
    blurOut: { start: 0.4, end: 0.43 },
    maxBlur: 8.0,
  };

  const spatialPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < visibleCount; i++) {
      const horizontalAngle = (i * 2.618) % (Math.PI * 2);
      const verticalAngle = (i * 1.618 + Math.PI / 3) % (Math.PI * 2);
      const horizontalRadius = (i % 3) * 1.2;
      const verticalRadius = ((i + 1) % 4) * 0.8;
      const x = (Math.sin(horizontalAngle) * horizontalRadius * MAX_HORIZONTAL_OFFSET) / 3;
      const y = (Math.cos(verticalAngle) * verticalRadius * MAX_VERTICAL_OFFSET) / 4;
      positions.push({ x, y });
    }
    return positions;
  }, [visibleCount]);

  useEffect(() => {
    planesDataRef.current = Array.from({ length: visibleCount }, (_, i) => ({
      index: i,
      z: ((depthRange / visibleCount) * i) % depthRange,
      imageIndex: i % totalImages,
      x: spatialPositions[i]?.x ?? 0,
      y: spatialPositions[i]?.y ?? 0,
    }));
  }, [visibleCount, totalImages, spatialPositions, depthRange]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!isActive || loopsCompletedRef.current) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const scrollAmount = event.deltaY * 0.01 * speed;
    setScrollVelocity((prev) => prev + scrollAmount);
    setAutoPlay(false);
    lastInteraction.current = Date.now();
  }, [speed, isActive]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || loopsCompletedRef.current) return;
    
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      setScrollVelocity((prev) => prev - 2 * speed);
      setAutoPlay(false);
      lastInteraction.current = Date.now();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      setScrollVelocity((prev) => prev + 2 * speed);
      setAutoPlay(false);
      lastInteraction.current = Date.now();
    }
  }, [speed, isActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (container && isActive) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        container.removeEventListener('wheel', handleWheel);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleWheel, handleKeyDown, isActive]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastInteraction.current > 3000) {
        setAutoPlay(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (autoPlay && !loopsCompletedRef.current) {
        setScrollVelocity((prev) => prev + 0.3 * delta);
      }

      setScrollVelocity((prev) => {
        const newVelocity = prev * 0.95;
        
        const imageAdvance = visibleCount % totalImages || totalImages;
        
        planesDataRef.current.forEach((plane) => {
          let newZ = plane.z + newVelocity * delta * 10;
          let wrapsForward = 0;
          let wrapsBackward = 0;

          if (newZ >= depthRange) {
            wrapsForward = Math.floor(newZ / depthRange);
            newZ -= depthRange * wrapsForward;
          } else if (newZ < 0) {
            wrapsBackward = Math.ceil(-newZ / depthRange);
            newZ += depthRange * wrapsBackward;
          }

          if (wrapsForward > 0 && imageAdvance > 0) {
            plane.imageIndex = (plane.imageIndex + wrapsForward * imageAdvance) % totalImages;
            if (!loopsCompletedRef.current) {
              imagePassCountRef.current += wrapsForward;
            }
          }

          if (wrapsBackward > 0 && imageAdvance > 0) {
            const step = plane.imageIndex - wrapsBackward * imageAdvance;
            plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
            if (!loopsCompletedRef.current) {
              imagePassCountRef.current += wrapsBackward;
            }
          }

          plane.z = ((newZ % depthRange) + depthRange) % depthRange;
        });

        if (!loopsCompletedRef.current && imagePassCountRef.current >= requiredPasses) {
          loopsCompletedRef.current = true;
          setLoopsCompleted(true);
          onLoopsComplete();
        }

        return newVelocity;
      });

      forceUpdate({});
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoPlay, depthRange, totalImages, visibleCount, requiredPasses, onLoopsComplete]);

  const getPlaneStyles = (plane: PlaneData) => {
    const normalizedPosition = plane.z / depthRange;
    const worldZ = plane.z - depthRange / 2;
    
    let opacity = 1;
    if (normalizedPosition >= fadeSettings.fadeIn.start && normalizedPosition <= fadeSettings.fadeIn.end) {
      opacity = (normalizedPosition - fadeSettings.fadeIn.start) / (fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
    } else if (normalizedPosition < fadeSettings.fadeIn.start) {
      opacity = 0;
    } else if (normalizedPosition >= fadeSettings.fadeOut.start && normalizedPosition <= fadeSettings.fadeOut.end) {
      opacity = 1 - (normalizedPosition - fadeSettings.fadeOut.start) / (fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
    } else if (normalizedPosition > fadeSettings.fadeOut.end) {
      opacity = 0;
    }
    opacity = Math.max(0, Math.min(1, opacity));

    let blur = 0;
    if (normalizedPosition >= blurSettings.blurIn.start && normalizedPosition <= blurSettings.blurIn.end) {
      blur = blurSettings.maxBlur * (1 - (normalizedPosition - blurSettings.blurIn.start) / (blurSettings.blurIn.end - blurSettings.blurIn.start));
    } else if (normalizedPosition < blurSettings.blurIn.start) {
      blur = blurSettings.maxBlur;
    } else if (normalizedPosition >= blurSettings.blurOut.start && normalizedPosition <= blurSettings.blurOut.end) {
      blur = blurSettings.maxBlur * ((normalizedPosition - blurSettings.blurOut.start) / (blurSettings.blurOut.end - blurSettings.blurOut.start));
    } else if (normalizedPosition > blurSettings.blurOut.end) {
      blur = blurSettings.maxBlur;
    }
    blur = Math.max(0, Math.min(blurSettings.maxBlur, blur));

    const scale = 1 - (normalizedPosition * 0.5);
    const zIndex = Math.round((1 - normalizedPosition) * 100);

    return {
      transform: `translate3d(${plane.x * 50}px, ${plane.y * 50}px, ${worldZ * 20}px) scale(${Math.max(0.3, scale)})`,
      opacity,
      filter: `blur(${blur}px)`,
      zIndex,
    };
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ perspective: '1000px', perspectiveOrigin: 'center center' }}
    >
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {planesDataRef.current.map((plane) => {
          const styles = getPlaneStyles(plane);
          const image = galleryImages[plane.imageIndex];
          
          return (
            <div
              key={plane.index}
              className="absolute rounded-xl overflow-hidden shadow-2xl transition-transform duration-75"
              style={{
                width: 'clamp(200px, 30vw, 350px)',
                aspectRatio: '4/3',
                ...styles,
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <h1 
          className="text-5xl md:text-8xl font-bold tracking-tight mix-blend-exclusion text-white"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Athlete360
        </h1>
      </div>

      {loopsCompleted && (
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ChevronDown className="w-8 h-8 text-white/60 animate-bounce" />
        </motion.div>
      )}
    </div>
  );
}

export default function LandingExperimental() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['home', 'common']);
  const searchParams = new URLSearchParams(window.location.search);
  const referralCode = searchParams.get('ref');
  const [galleryComplete, setGalleryComplete] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLElement>(null);

  const handleLoopsComplete = useCallback(() => {
    setGalleryComplete(true);
  }, []);

  useEffect(() => {
    if (galleryComplete && servicesRef.current) {
      servicesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [galleryComplete]);

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
    <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
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
                className="bg-[#2563eb] hover:bg-[#d4a017] text-white text-xs sm:text-sm px-2 sm:px-4 h-11 transition-colors duration-200"
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

      <div ref={heroRef} className="h-screen relative">
        <InfiniteGallery3D onLoopsComplete={handleLoopsComplete} isActive={!galleryComplete} />
        
        <motion.div 
          className="absolute bottom-32 left-0 right-0 flex flex-col sm:flex-row gap-4 justify-center px-4 z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Button 
            onClick={() => setLocation('/signup')}
            data-testid="button-get-started-experimental"
            size="lg"
            className="bg-[#2563eb] hover:bg-[#d4a017] text-white text-lg px-8 py-6 rounded-full shadow-lg shadow-blue-500/25 transition-colors duration-200"
          >
            {t('landing.hero.ctaStart', 'Start Free Trial')}
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
            className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500/20 to-amber-500/20 border border-amber-400/30 rounded-lg p-4 max-w-lg z-20"
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
      </div>

      <section ref={servicesRef} className="min-h-screen py-20 bg-gradient-to-b from-slate-900 to-blue-950">
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
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {[
              { icon: ChartPie, title: t('services.bioAnalysis.title'), desc: t('services.bioAnalysis.description'), tokens: 50, color: 'blue' },
              { icon: Trophy, title: t('services.rankHistory.title'), desc: t('services.rankHistory.description'), tokens: 70, color: 'amber' },
              { icon: Scale, title: t('services.athleteComparison.title'), desc: t('services.athleteComparison.description'), tokens: 100, color: 'purple' },
              { icon: Target, title: t('services.howToBeat.title'), desc: t('services.howToBeat.description'), tokens: 90, color: 'green' },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 h-full group">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <service.icon className="text-blue-400" size={28} />
                      </div>
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
                  {t('services.videoAnalysis.description')}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="bg-orange-500 text-white text-sm px-3 py-1 rounded-full font-semibold">
                    150 {t('units.tokens', { ns: 'common' })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 border-t border-white/10 bg-slate-950">
        <div className="container mx-auto px-4 text-center">
          <p className="text-blue-200/50 text-sm">
            &copy; {new Date().getFullYear()} Athlete360. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
