import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { UserPlus, Gift, ArrowRight, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import logoImage from '@assets/Png_new_logo_1766325613955.png';

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

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 14;
const MAX_VERTICAL_OFFSET = 10;
const REQUIRED_LOOPS = 3;

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

  const totalImages = galleryImages.length;
  const visibleCount = totalImages;
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

      if (autoPlay) {
        setScrollVelocity((prev) => prev + 0.5 * delta);
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
          className="text-5xl md:text-8xl font-bold tracking-tight mix-blend-exclusion"
          style={{ fontFamily: "'Montserrat', sans-serif", color: '#1e4a8a' }}
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

// Features data for the 3D pie chart
const featuresData = [
  {
    id: 'feature1',
    name: 'Feature One',
    percentage: 20,
    color: '#1e4a8a',
    title: 'Feature One Title',
    subtitle: 'Powerful capability for athletes',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  },
  {
    id: 'feature2',
    name: 'Feature Two',
    percentage: 20,
    color: '#2563eb',
    title: 'Feature Two Title',
    subtitle: 'Advanced analytics and insights',
    description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.',
  },
  {
    id: 'feature3',
    name: 'Feature Three',
    percentage: 20,
    color: '#3b82f6',
    title: 'Feature Three Title',
    subtitle: 'Real-time performance tracking',
    description: 'Sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque.',
  },
  {
    id: 'feature4',
    name: 'Feature Four',
    percentage: 20,
    color: '#60a5fa',
    title: 'Feature Four Title',
    subtitle: 'Comprehensive athlete profiles',
    description: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
  },
  {
    id: 'feature5',
    name: 'Feature Five',
    percentage: 20,
    color: '#93c5fd',
    title: 'Feature Five Title',
    subtitle: 'Strategic competition analysis',
    description: 'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt.',
  },
];

interface PieSliceProps {
  startAngle: number;
  endAngle: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  label: string;
}

function PieSlice({ startAngle, endAngle, color, isSelected, onClick, label }: PieSliceProps) {
  const cx = 150;
  const cy = 150;
  const radius = 120;
  
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);
  
  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  
  const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  
  const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
  const translateX = isSelected ? Math.cos(midAngle) * 15 : 0;
  const translateY = isSelected ? Math.sin(midAngle) * 15 : 0;
  
  return (
    <motion.path
      d={pathD}
      fill={color}
      stroke="white"
      strokeWidth="2"
      onClick={onClick}
      initial={false}
      animate={{
        transform: `translate(${translateX}px, ${translateY}px)`,
        filter: isSelected ? 'brightness(1.1) drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : 'brightness(1)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="cursor-pointer hover:brightness-110 transition-all"
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      data-testid={`pie-slice-${label}`}
    />
  );
}

function FeaturesSection() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  
  let currentAngle = 0;
  const slices = featuresData.map((feature) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (feature.percentage / 100) * 360;
    currentAngle = endAngle;
    return { ...feature, startAngle, endAngle };
  });
  
  const selectedData = selectedFeature 
    ? featuresData.find(f => f.id === selectedFeature) 
    : null;

  return (
    <section className="min-h-screen py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-3xl sm:text-4xl font-bold text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span className="text-[#1e4a8a]">Features</span>
        </motion.h2>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            animate={{
              x: selectedFeature ? -50 : 0,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{ perspective: '1000px' }}
          >
            <motion.div
              animate={{
                rotateX: 55,
                rotateZ: selectedFeature ? -5 : 0,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <svg 
                width="300" 
                height="300" 
                viewBox="0 0 300 300"
                className="drop-shadow-2xl"
                data-testid="features-pie-chart"
              >
                <defs>
                  <filter id="shadow3d" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="10" stdDeviation="8" floodOpacity="0.3"/>
                  </filter>
                </defs>
                <g filter="url(#shadow3d)">
                  {slices.map((slice) => (
                    <PieSlice
                      key={slice.id}
                      startAngle={slice.startAngle}
                      endAngle={slice.endAngle}
                      color={slice.color}
                      isSelected={selectedFeature === slice.id}
                      onClick={() => setSelectedFeature(selectedFeature === slice.id ? null : slice.id)}
                      label={slice.id}
                    />
                  ))}
                </g>
                <circle cx="150" cy="150" r="40" fill="white" className="pointer-events-none" />
              </svg>
            </motion.div>
            
            <p className="text-center mt-6 text-slate-500 text-sm">
              Click on a section to learn more
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedData && (
              <motion.div
                key={selectedData.id}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="max-w-md lg:max-w-lg"
                data-testid="feature-details"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div 
                    className="w-16 h-1 mb-4 rounded-full"
                    style={{ backgroundColor: selectedData.color }}
                  />
                  <h3 
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: selectedData.color, fontFamily: "'Montserrat', sans-serif" }}
                    data-testid="feature-title"
                  >
                    {selectedData.title}
                  </h3>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-lg text-slate-600 mb-4 font-medium"
                  data-testid="feature-subtitle"
                >
                  {selectedData.subtitle}
                </motion.p>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-500 leading-relaxed"
                  data-testid="feature-description"
                >
                  {selectedData.description}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedFeature && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md text-center lg:text-left"
            >
              <p className="text-slate-400 text-lg">
                Select a feature from the chart to explore what Athlete360 can do for you.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function LandingExperimental() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['home', 'common']);
  const searchParams = new URLSearchParams(window.location.search);
  const referralCode = searchParams.get('ref');
  const [galleryComplete, setGalleryComplete] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const handleLoopsComplete = useCallback(() => {
    setGalleryComplete(true);
  }, []);

  useEffect(() => {
    if (galleryComplete && featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: 'smooth' });
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
    <div className="bg-white text-slate-900">
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
                data-testid="button-signup-experimental"
                className="bg-[#1e4a8a] hover:bg-[#d4a017] text-white text-xs sm:text-sm px-2 sm:px-4 h-11 transition-colors duration-200"
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
                className="border-[#1e4a8a] text-[#1e4a8a] bg-transparent hover:bg-[#1e4a8a] hover:text-white text-xs sm:text-sm px-2 sm:px-4 h-11 transition-colors duration-200"
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
          className="absolute bottom-24 left-0 right-0 flex flex-col sm:flex-row gap-4 justify-center px-4 z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Button 
            onClick={() => setLocation('/signup')}
            data-testid="button-get-started-experimental"
            size="lg"
            className="bg-[#1e4a8a] hover:bg-[#d4a017] text-white text-lg px-8 py-6 rounded-full shadow-lg shadow-blue-800/25 transition-colors duration-200"
          >
            {t('landing.hero.ctaStart', 'Start Free Trial')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            onClick={() => setLocation('/login')}
            data-testid="button-signin-hero-experimental"
            size="lg"
            variant="outline"
            className="border-[#1e4a8a] text-[#1e4a8a] bg-transparent hover:bg-[#1e4a8a] hover:text-white text-lg px-8 py-6 rounded-full transition-colors duration-200"
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

      <div ref={featuresRef}>
        <FeaturesSection />
      </div>

      <footer className="py-8 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Athlete360. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
