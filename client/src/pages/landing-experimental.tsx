import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  { src: squashImage, alt: 'Squash' },
  { src: taekwondoImage, alt: 'Taekwondo' },
  { src: fencingImage, alt: 'Fencing' },
  { src: swimmingImage, alt: 'Swimming' },
  { src: tennisImage, alt: 'Tennis' },
  { src: wrestlingImage, alt: 'Wrestling' },
];

interface PlaneData {
  index: number;
  z: number;
  imageIndex: number;
  x: number;
  y: number;
}

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;

function InfiniteGallery3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const lastInteraction = useRef(Date.now());
  const animationRef = useRef<number>();
  const planesDataRef = useRef<PlaneData[]>([]);
  const [, forceUpdate] = useState({});

  const visibleCount = 12;
  const totalImages = galleryImages.length;
  const depthRange = DEFAULT_DEPTH_RANGE;
  const speed = 1.2;

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
    event.preventDefault();
    setScrollVelocity((prev) => prev + event.deltaY * 0.01 * speed);
    setAutoPlay(false);
    lastInteraction.current = Date.now();
  }, [speed]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      setScrollVelocity((prev) => prev - 2 * speed);
      setAutoPlay(false);
      lastInteraction.current = Date.now();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      setScrollVelocity((prev) => prev + 2 * speed);
      setAutoPlay(false);
      lastInteraction.current = Date.now();
    }
  }, [speed]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        container.removeEventListener('wheel', handleWheel);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleWheel, handleKeyDown]);

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

      if (autoPlay) {
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
          }

          if (wrapsBackward > 0 && imageAdvance > 0) {
            const step = plane.imageIndex - wrapsBackward * imageAdvance;
            plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
          }

          plane.z = ((newZ % depthRange) + depthRange) % depthRange;
        });

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
  }, [autoPlay, depthRange, totalImages, visibleCount]);

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
      transform: `translate3d(${plane.x * 30}px, ${plane.y * 30}px, ${worldZ * 15}px) scale(${Math.max(0.3, scale)})`,
      opacity,
      filter: `blur(${blur}px)`,
      zIndex,
    };
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden"
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

      <div className="absolute bottom-10 left-0 right-0 text-center font-mono uppercase text-[11px] font-semibold text-white/80">
        <p>Use mouse wheel, arrow keys, or touch to navigate</p>
        <p className="opacity-60">Auto-play resumes after 3 seconds of inactivity</p>
      </div>
    </div>
  );
}

function useMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ value: T; deps: React.DependencyList } | null>(null);
  
  if (!ref.current || !deps.every((dep, i) => Object.is(dep, ref.current!.deps[i]))) {
    ref.current = { value: factory(), deps };
  }
  
  return ref.current.value;
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

      <InfiniteGallery3D />

      <motion.div 
        className="fixed bottom-32 left-0 right-0 flex flex-col sm:flex-row gap-4 justify-center px-4 z-20"
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
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500/20 to-amber-500/20 border border-amber-400/30 rounded-lg p-4 max-w-lg z-20"
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
  );
}
