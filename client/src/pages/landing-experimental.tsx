import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { UserPlus, Gift, ArrowRight, ChevronDown, GripVertical, User, Video, Target, Utensils, TrendingUp, Trophy, Sparkles, Brain, Clock, FileText, Users, BarChart3, Clipboard, XCircle, CheckCircle, Zap, Globe, Shield, Cpu, Sun, Moon, Mail, MapPin, Phone, Twitter, Instagram, Youtube, Linkedin } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import logoImage from '@assets/Png_new_logo_1766325613955.png';

// Theme context for dark/light mode
const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return { isDark, toggleTheme: () => setIsDark(!isDark) };
};

// RTL detection hook
const useIsRTL = () => {
  const { i18n } = useTranslation();
  return i18n.language === 'ar';
};

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

// Features data for the 3D pie chart - based on Key Features & Value Propositions
const featuresData = [
  {
    id: 'feature1',
    name: 'Profile',
    nameAr: 'الملف الشخصي',
    percentage: 20,
    color: '#1e4a8a',
    icon: User,
    title: 'Athlete 360° Profile',
    titleAr: 'ملف الرياضي 360°',
    subtitle: 'Your complete performance overview',
    subtitleAr: 'نظرة شاملة على أدائك',
    description: 'Get a comprehensive view of your athletic journey including rankings, achievements, historical data, and AI-generated strengths/weaknesses analysis. Track your progress from amateur to champion.',
    descriptionAr: 'احصل على نظرة شاملة لرحلتك الرياضية بما في ذلك التصنيفات والإنجازات والبيانات التاريخية وتحليل نقاط القوة والضعف المولدة بالذكاء الاصطناعي. تتبع تقدمك من هاوٍ إلى بطل.',
  },
  {
    id: 'feature2',
    name: 'Video AI',
    nameAr: 'تحليل الفيديو',
    percentage: 20,
    color: '#10b981',
    icon: Video,
    title: 'AI Video Analysis',
    titleAr: 'تحليل الفيديو بالذكاء الاصطناعي',
    subtitle: 'Powered by Google Gemini 2.0 Flash',
    subtitleAr: 'مدعوم بتقنية Google Gemini 2.0 Flash',
    description: 'Upload match footage and receive detailed AI-powered breakdowns of techniques, scoring patterns, tactical elements, and performance insights specific to your sport.',
    descriptionAr: 'قم بتحميل لقطات المباراة واحصل على تحليلات مفصلة مدعومة بالذكاء الاصطناعي للتقنيات وأنماط التسجيل والعناصر التكتيكية ورؤى الأداء الخاصة برياضتك.',
  },
  {
    id: 'feature3',
    name: 'Strategy',
    nameAr: 'الاستراتيجية',
    percentage: 20,
    color: '#f59e0b',
    icon: Target,
    title: 'Opponent Analysis',
    titleAr: 'تحليل المنافس',
    subtitle: 'Know your competition inside out',
    subtitleAr: 'اعرف منافسك من الداخل والخارج',
    description: 'Get strategic insights on opponents based on their fighting style, tendencies, and historical performance data. Prepare for every match with data-driven game plans.',
    descriptionAr: 'احصل على رؤى استراتيجية حول المنافسين بناءً على أسلوب قتالهم وميولهم وبيانات أدائهم التاريخية. استعد لكل مباراة بخطط لعب مبنية على البيانات.',
  },
  {
    id: 'feature4',
    name: 'Nutrition',
    nameAr: 'التغذية',
    percentage: 20,
    color: '#ef4444',
    icon: Utensils,
    title: 'Training & Nutrition',
    titleAr: 'التدريب والتغذية',
    subtitle: 'Personalized plans powered by AI',
    subtitleAr: 'خطط مخصصة مدعومة بالذكاء الاصطناعي',
    description: 'AI-generated personalized training programs and nutrition plans based on sports science, including TDEE calculations, macro optimization, and competition preparation schedules.',
    descriptionAr: 'برامج تدريب وخطط تغذية مخصصة مولدة بالذكاء الاصطناعي مبنية على علوم الرياضة، بما في ذلك حسابات TDEE وتحسين الماكرو وجداول التحضير للمنافسات.',
  },
  {
    id: 'feature5',
    name: 'Rank Up',
    nameAr: 'رفع الترتيب',
    percentage: 20,
    color: '#8b5cf6',
    icon: TrendingUp,
    title: 'Rank-Up Calculator',
    titleAr: 'حاسبة رفع الترتيب',
    subtitle: 'Strategic guidance to advance',
    subtitleAr: 'إرشادات استراتيجية للتقدم',
    description: 'Get clear, actionable steps on how to advance in world rankings with competition recommendations and strategic planning to reach your performance goals.',
    descriptionAr: 'احصل على خطوات واضحة وقابلة للتنفيذ حول كيفية التقدم في التصنيفات العالمية مع توصيات المنافسات والتخطيط الاستراتيجي للوصول إلى أهداف أدائك.',
  },
];

interface PieSliceProps {
  startAngle: number;
  endAngle: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  label: string;
  name: string;
  cx: number;
  cy: number;
  radius: number;
}

function PieSlice({ startAngle, endAngle, color, isSelected, onClick, label, name, cx, cy, radius }: PieSliceProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);
  
  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  
  const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  
  const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
  const hoverOffset = isHovered && !isSelected ? 6 : 0;
  const selectedOffset = isSelected ? 18 : 0;
  const totalOffset = hoverOffset + selectedOffset;
  const translateX = Math.cos(midAngle) * totalOffset;
  const translateY = Math.sin(midAngle) * totalOffset;
  
  const labelRadius = radius * 0.65;
  const labelX = cx + labelRadius * Math.cos(midAngle);
  const labelY = cy + labelRadius * Math.sin(midAngle);
  
  const scale = isSelected ? 1.02 : isHovered ? 1.01 : 1;
  
  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.path
        d={pathD}
        fill={color}
        stroke="white"
        strokeWidth="3"
        onClick={onClick}
        initial={false}
        animate={{
          x: translateX,
          y: translateY,
          scale: scale,
          opacity: isSelected ? 1 : isHovered ? 0.95 : 0.9,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 35,
          mass: 0.6
        }}
        className="cursor-pointer"
        style={{ 
          transformOrigin: `${cx}px ${cy}px`,
          filter: isSelected ? 'brightness(1.1)' : 'brightness(1)',
        }}
        data-testid={`pie-slice-${label}`}
      />
      <motion.text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="14"
        fontWeight="bold"
        className="pointer-events-none select-none"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        initial={false}
        animate={{
          x: translateX,
          y: translateY,
          scale: scale,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 35,
          mass: 0.6
        }}
      >
        {name}
      </motion.text>
    </g>
  );
}

function FeaturesSection() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const isRTL = useIsRTL();
  
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
    <section className="min-h-screen py-20 relative">
      <div className="container mx-auto px-4 relative z-10">
        <motion.h2
          className="text-3xl sm:text-4xl font-bold text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span className="text-[#1e4a8a] dark:text-white">{isRTL ? 'التجربة 360°' : 'The 360° Experience'}</span>
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
            transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }}
            style={{ perspective: '1000px' }}
          >
            <motion.div
              animate={{
                rotateX: 15,
                rotateZ: selectedFeature ? -3 : 0,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <svg 
                width="420" 
                height="420" 
                viewBox="0 0 420 420"
                className="drop-shadow-xl"
                data-testid="features-pie-chart"
              >
                <g>
                  {slices.map((slice) => (
                    <PieSlice
                      key={slice.id}
                      startAngle={slice.startAngle}
                      endAngle={slice.endAngle}
                      color={slice.color}
                      isSelected={selectedFeature === slice.id}
                      onClick={() => setSelectedFeature(selectedFeature === slice.id ? null : slice.id)}
                      label={slice.id}
                      name={isRTL ? slice.nameAr : slice.name}
                      cx={210}
                      cy={210}
                      radius={180}
                    />
                  ))}
                </g>
              </svg>
            </motion.div>
            
            <p className="text-center mt-6 text-slate-500 dark:text-slate-400 text-sm">
              {isRTL ? 'انقر على قسم لمعرفة المزيد' : 'Click on a section to learn more'}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedData && (
              <motion.div
                key={selectedData.id}
                initial={{ opacity: 0, x: 30, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 500, 
                  damping: 30,
                  mass: 0.5
                }}
                className="max-w-md lg:max-w-lg"
                data-testid="feature-details"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    delay: 0.05 
                  }}
                >
                  <motion.div 
                    className="w-16 h-1.5 mb-4 rounded-full"
                    style={{ backgroundColor: selectedData.color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                  <h3 
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: selectedData.color, fontFamily: "'Montserrat', sans-serif" }}
                    data-testid="feature-title"
                  >
                    {isRTL ? selectedData.titleAr : selectedData.title}
                  </h3>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    delay: 0.08 
                  }}
                  className="text-lg mb-4 font-medium"
                  style={{ color: selectedData.color }}
                  data-testid="feature-subtitle"
                >
                  {isRTL ? selectedData.subtitleAr : selectedData.subtitle}
                </motion.p>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    delay: 0.11 
                  }}
                  className="text-slate-500 dark:text-slate-300 leading-relaxed"
                  data-testid="feature-description"
                >
                  {isRTL ? selectedData.descriptionAr : selectedData.description}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedFeature && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.3 }}
              className="w-full max-w-md lg:max-w-lg text-center lg:text-left"
            >
              <p className="text-slate-400 dark:text-slate-500 text-lg">
                {isRTL 
                  ? 'اختر ميزة من الرسم البياني لاستكشاف ما يمكن أن يقدمه لك Athlete360.'
                  : 'Select a feature from the chart to explore what Athlete360 can do for you.'
                }
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

// AI Edge Section Data
const aiEdgeCards = [
  {
    id: 'who-we-are',
    title: 'Who We Are',
    titleAr: 'من نحن',
    icon: Users,
    color: '#1e4a8a',
    points: [
      'A comprehensive AI-powered sports analytics platform',
      'Built for athletes, coaches, and teams worldwide',
      'Taekwondo-first with expansion to 10+ combat & racquet sports',
      'Trusted by athletes from amateur to elite level',
      'Multi-language support with English and Arabic',
    ],
    pointsAr: [
      'منصة تحليلات رياضية شاملة مدعومة بالذكاء الاصطناعي',
      'مصممة للرياضيين والمدربين والفرق حول العالم',
      'التايكوندو أولاً مع التوسع إلى أكثر من 10 رياضات قتالية ومضرب',
      'موثوق من قبل الرياضيين من المستوى الهواة إلى النخبة',
      'دعم متعدد اللغات مع الإنجليزية والعربية',
    ],
  },
  {
    id: 'what-we-provide',
    title: 'What We Provide',
    titleAr: 'ماذا نقدم',
    icon: Zap,
    color: '#10b981',
    points: [
      'Complete 360° athlete profiles with AI-generated insights',
      'AI-powered video analysis with technique breakdowns',
      'Personalized training & nutrition plans',
      'Strategic opponent analysis and beat strategies',
      'Rank-Up Calculator for world ranking advancement',
    ],
    pointsAr: [
      'ملفات رياضي كاملة 360° مع رؤى مولدة بالذكاء الاصطناعي',
      'تحليل فيديو مدعوم بالذكاء الاصطناعي مع تفصيل التقنيات',
      'خطط تدريب وتغذية مخصصة',
      'تحليل استراتيجي للمنافسين واستراتيجيات الفوز',
      'حاسبة رفع الترتيب للتقدم في التصنيفات العالمية',
    ],
  },
  {
    id: 'how-we-do-it',
    title: 'How We Do It',
    titleAr: 'كيف نفعل ذلك',
    icon: Cpu,
    color: '#f59e0b',
    points: [
      'Dual AI engine: GPT-4o + Google Gemini technology',
      'Integration with world ranking systems & live competitions',
      'Sport-adaptive analytics across multiple disciplines',
      'Secure, mobile-ready Progressive Web App',
      'Data-driven insights powered by cutting-edge AI',
    ],
    pointsAr: [
      'محرك ذكاء اصطناعي مزدوج: تقنية GPT-4o + Google Gemini',
      'التكامل مع أنظمة التصنيف العالمية والمنافسات الحية',
      'تحليلات متكيفة مع الرياضة عبر تخصصات متعددة',
      'تطبيق ويب تقدمي آمن وجاهز للجوال',
      'رؤى مبنية على البيانات مدعومة بأحدث تقنيات الذكاء الاصطناعي',
    ],
  },
];

interface FoldedCardProps {
  card: typeof aiEdgeCards[0];
  index: number;
  isRTL: boolean;
}

function FoldedCard({ card, index, isRTL }: FoldedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "center center"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [45, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.8, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);

  const IconComponent = card.icon;
  const displayTitle = isRTL ? card.titleAr : card.title;
  const displayPoints = isRTL ? card.pointsAr : card.points;

  return (
    <motion.div
      ref={cardRef}
      style={{
        perspective: "1200px",
      }}
      className="w-full"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <motion.div
        style={{
          rotateX,
          opacity,
          scale,
          y,
          transformOrigin: "center top",
        }}
        className="bg-white dark:bg-[#12243d] rounded-2xl shadow-xl border border-gray-100 dark:border-[#1e4a8a]/30 overflow-hidden h-full"
        data-testid={`card-${card.id}`}
      >
        <div 
          className="h-1.5 w-full"
          style={{ backgroundColor: card.color }}
        />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${card.color}25` }}
            >
              <IconComponent 
                className="w-5 h-5" 
                style={{ color: card.color }}
              />
            </div>
            <h3 
              className="text-xl font-bold text-slate-800 dark:text-white"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {displayTitle}
            </h3>
          </div>
          <ul className="space-y-2.5">
            {displayPoints.map((point, pointIndex) => (
              <motion.li
                key={pointIndex}
                initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + pointIndex * 0.08 }}
                className="flex items-start gap-2"
                data-testid={`point-${card.id}-${pointIndex}`}
              >
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${card.color}25` }}
                >
                  <CheckCircle 
                    className="w-3 h-3" 
                    style={{ color: card.color }}
                  />
                </div>
                <span className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AIEdgeSection() {
  const isRTL = useIsRTL();
  return (
    <section className="min-h-screen flex items-center py-12 overflow-hidden relative">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="inline-block px-3 py-1 bg-[#1e4a8a]/10 dark:bg-[#1e4a8a]/30 text-[#1e4a8a] dark:text-[#6ba3eb] rounded-full text-sm font-medium mb-3">
            {isRTL ? 'اكتشف Athlete360' : 'Discover Athlete360'}
          </span>
          <h2 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1e4a8a] dark:text-white mb-3"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {isRTL ? 'تفوقك المدعوم بالذكاء الاصطناعي في الأداء الرياضي' : 'Your AI-Powered Edge in Athletic Performance'}
          </h2>
          <p className="text-slate-500 dark:text-slate-300 text-base max-w-2xl mx-auto leading-relaxed">
            {isRTL 
              ? 'Athlete360 هي منصة تحليلات رياضية شاملة مصممة لتحويل طريقة تحضير ومنافسة الرياضيين والمدربين والفرق.'
              : 'Athlete360 is a comprehensive sports analytics platform built to transform how athletes, coaches, and teams prepare and compete.'
            }
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {aiEdgeCards.map((card, index) => (
            <FoldedCard key={card.id} card={card} index={index} isRTL={isRTL} />
          ))}
        </div>
      </div>
    </section>
  );
}

// AI vs Traditional comparison data
const withAIFeatures = [
  { icon: Brain, text: 'AI-powered video analysis in minutes', textAr: 'تحليل فيديو بالذكاء الاصطناعي في دقائق' },
  { icon: Sparkles, text: 'Personalized training plans', textAr: 'خطط تدريب مخصصة' },
  { icon: BarChart3, text: 'Real-time performance insights', textAr: 'رؤى أداء في الوقت الفعلي' },
  { icon: Target, text: 'Data-driven opponent strategies', textAr: 'استراتيجيات منافس مبنية على البيانات' },
  { icon: TrendingUp, text: 'Predictive ranking guidance', textAr: 'إرشادات تنبؤية للترتيب' },
];

const withoutAIFeatures = [
  { icon: Clock, text: 'Hours of manual video review', textAr: 'ساعات من مراجعة الفيديو اليدوية' },
  { icon: Clipboard, text: 'Generic training programs', textAr: 'برامج تدريب عامة' },
  { icon: FileText, text: 'Delayed performance feedback', textAr: 'تقييم أداء متأخر' },
  { icon: Users, text: 'Subjective opponent assessment', textAr: 'تقييم شخصي للمنافس' },
  { icon: Trophy, text: 'Uncertain path to improvement', textAr: 'مسار غير واضح للتحسن' },
];

function ComparisonSlider() {
  const [inset, setInset] = useState<number>(50);
  const [onMouseDown, setOnMouseDown] = useState<boolean>(false);
  const isRTL = useIsRTL();

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!onMouseDown) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let x = 0;

    if ("touches" in e && e.touches.length > 0) {
      x = e.touches[0].clientX - rect.left;
    } else if ("clientX" in e) {
      x = e.clientX - rect.left;
    }
    
    const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setInset(percentage);
  };

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-[#1e4a8a]/10 dark:bg-[#1e4a8a]/30 text-[#1e4a8a] dark:text-[#6ba3eb] rounded-full text-sm font-medium mb-4">
            {isRTL ? 'ميزة الذكاء الاصطناعي' : 'The AI Advantage'}
          </span>
          <h2 
            className="text-3xl sm:text-4xl font-bold text-[#1e4a8a] dark:text-white mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {isRTL ? 'تحليلات الرياضة: الماضي مقابل الحاضر' : 'Sports Analytics: Then vs Now'}
          </h2>
          <p className="text-slate-500 dark:text-slate-300 text-lg max-w-2xl mx-auto">
            {isRTL 
              ? 'اسحب شريط التمرير لترى كيف يحول الذكاء الاصطناعي تحليل الأداء الرياضي'
              : 'Drag the slider to see how AI transforms athletic performance analysis'
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div
            className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl shadow-2xl select-none cursor-ew-resize"
            onMouseMove={onMouseMove}
            onMouseUp={() => setOnMouseDown(false)}
            onMouseLeave={() => setOnMouseDown(false)}
            onTouchMove={onMouseMove}
            onTouchEnd={() => setOnMouseDown(false)}
            data-testid="comparison-slider"
          >
            <div
              className="bg-slate-300 h-full w-1 absolute z-30 top-0 -ml-0.5 select-none"
              style={{ left: inset + "%" }}
            >
              <button
                className="bg-white border-2 border-[#1e4a8a] rounded-full hover:scale-110 transition-all w-12 h-12 select-none -translate-y-1/2 absolute top-1/2 -ml-6 z-40 cursor-ew-resize flex justify-center items-center shadow-lg"
                onTouchStart={(e) => {
                  setOnMouseDown(true);
                  onMouseMove(e);
                }}
                onMouseDown={(e) => {
                  setOnMouseDown(true);
                  onMouseMove(e);
                }}
                onTouchEnd={() => setOnMouseDown(false)}
                onMouseUp={() => setOnMouseDown(false)}
                data-testid="comparison-slider-handle"
              >
                <GripVertical className="h-5 w-5 text-[#1e4a8a] select-none" />
              </button>
            </div>

            <div
              className="absolute left-0 top-0 z-20 h-full bg-gradient-to-br from-[#1e4a8a] to-[#2d5fa3] p-8 sm:p-12 flex flex-col justify-center items-center overflow-hidden"
              style={{
                width: "100%",
                clipPath: `inset(0 ${100 - inset}% 0 0)`,
              }}
            >
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {isRTL ? 'مع Athlete360' : 'With Athlete360'}
                </h3>
                <p className="text-blue-200 text-sm">{isRTL ? 'تحليلات مدعومة بالذكاء الاصطناعي' : 'AI-Powered Analytics'}</p>
              </div>
              <div className="space-y-4 w-full max-w-md">
                {withAIFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                    data-testid={`ai-feature-${index}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white/90 text-sm sm:text-base">{isRTL ? feature.textAr : feature.text}</span>
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 ml-auto rtl:ml-0 rtl:mr-auto" />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="absolute left-0 top-0 z-10 w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 p-8 sm:p-12 flex flex-col justify-center items-center">
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Clock className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-300 text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {isRTL ? 'الطرق التقليدية' : 'Traditional Methods'}
                </h3>
                <p className="text-slate-500 text-sm">{isRTL ? 'تحليل يدوي' : 'Manual Analysis'}</p>
              </div>
              <div className="space-y-4 w-full max-w-md">
                {withoutAIFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                    data-testid={`traditional-feature-${index}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <span className="text-slate-400 text-sm sm:text-base">{isRTL ? feature.textAr : feature.text}</span>
                    <XCircle className="h-5 w-5 text-red-400/70 flex-shrink-0 ml-auto rtl:ml-0 rtl:mr-auto" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-slate-500 dark:text-slate-400 text-sm">
            {isRTL 
              ? 'اسحب شريط التمرير للمقارنة بين التحليلات المدعومة بالذكاء الاصطناعي والتقليدية'
              : 'Drag the slider to compare AI-powered vs traditional sports analytics'
            }
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  const { t } = useTranslation(['home', 'common']);
  const isRTL = useIsRTL();
  const [, setLocation] = useLocation();
  
  const footerLinks = {
    product: [
      { label: 'Athlete Profile', href: '/signup' },
      { label: 'Video Analysis', href: '/signup' },
      { label: 'Training Plans', href: '/signup' },
      { label: 'Rank Calculator', href: '/signup' },
    ],
    sports: [
      { label: 'Taekwondo', href: '/signup' },
      { label: 'Tennis', href: '/signup' },
      { label: 'Boxing', href: '/signup' },
      { label: 'Judo', href: '/signup' },
    ],
    company: [
      { label: 'About Us', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Youtube, href: '#', label: 'YouTube' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="relative border-t border-gray-200 dark:border-[#1e4a8a]/30" data-testid="footer-section">
      <div className="container mx-auto px-4 py-16 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          <div className="lg:col-span-2">
            <img src={logoImage} alt="Athlete360" className="h-14 w-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-sm leading-relaxed">
              {isRTL 
                ? 'منصة تحليلات رياضية مدعومة بالذكاء الاصطناعي لتحويل أداء الرياضيين والفرق.'
                : 'AI-powered sports analytics platform transforming how athletes and teams train, compete, and succeed.'
              }
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-[#1e4a8a]/10 dark:bg-white/10 flex items-center justify-center text-[#1e4a8a] dark:text-white hover:bg-[#1e4a8a] hover:text-white dark:hover:bg-white dark:hover:text-[#1e4a8a] transition-colors"
                  data-testid={`social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {isRTL ? 'المنتج' : 'Product'}
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={() => setLocation(link.href)}
                    className="text-slate-600 dark:text-slate-300 hover:text-[#1e4a8a] dark:hover:text-[#d4a017] transition-colors text-sm"
                    data-testid={`footer-link-product-${index}`}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {isRTL ? 'الرياضات' : 'Sports'}
            </h4>
            <ul className="space-y-3">
              {footerLinks.sports.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={() => setLocation(link.href)}
                    className="text-slate-600 dark:text-slate-300 hover:text-[#1e4a8a] dark:hover:text-[#d4a017] transition-colors text-sm"
                    data-testid={`footer-link-sport-${index}`}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {isRTL ? 'الشركة' : 'Company'}
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-slate-600 dark:text-slate-300 hover:text-[#1e4a8a] dark:hover:text-[#d4a017] transition-colors text-sm"
                    data-testid={`footer-link-company-${index}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-300 dark:border-[#1e4a8a]/30 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} Athlete360. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-[#1e4a8a] dark:hover:text-[#d4a017] transition-colors">
                {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </a>
              <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-[#1e4a8a] dark:hover:text-[#d4a017] transition-colors">
                {isRTL ? 'شروط الخدمة' : 'Terms of Service'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingExperimental() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['home', 'common']);
  const { isDark, toggleTheme } = useTheme();
  const isRTL = useIsRTL();
  const searchParams = new URLSearchParams(window.location.search);
  const referralCode = searchParams.get('ref');
  const [galleryComplete, setGalleryComplete] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const aiEdgeRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  const handleLoopsComplete = useCallback(() => {
    setGalleryComplete(true);
  }, []);

  useEffect(() => {
    if (galleryComplete && aiEdgeRef.current) {
      aiEdgeRef.current.scrollIntoView({ behavior: 'smooth' });
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
    <div className="relative bg-white dark:bg-[#0a1628] text-slate-900 dark:text-white transition-colors duration-300" dir={isRTL ? 'rtl' : 'ltr'}>
      <div 
        className="fixed inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <motion.nav 
        initial="hidden"
        animate="visible"
        variants={fadeInDown}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50 bg-white/90 dark:bg-[#0a1628]/90 backdrop-blur-lg border-b border-gray-200 dark:border-[#1e4a8a]/30 shadow-sm"
      >
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <motion.div 
            className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0"
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
                <UserPlus className="mr-1 sm:mr-2 rtl:mr-0 rtl:ml-1 sm:rtl:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                {t('landing.navigation.signUp')}
              </Button>
            </motion.div>
            <motion.div variants={fadeInDown} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => setLocation('/login')}
                data-testid="button-login-experimental"
                variant="outline"
                className="border-[#1e4a8a] text-[#1e4a8a] dark:text-white dark:border-white/30 bg-transparent hover:bg-[#1e4a8a] hover:text-white dark:hover:bg-white dark:hover:text-[#1e4a8a] text-xs sm:text-sm px-2 sm:px-4 h-11 transition-colors duration-200"
              >
                {t('landing.navigation.signIn')}
              </Button>
            </motion.div>
            
            <motion.div variants={fadeInDown}>
              <button
                onClick={toggleTheme}
                data-testid="theme-toggle"
                className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
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

      <div ref={aiEdgeRef}>
        <AIEdgeSection />
      </div>

      <div ref={featuresRef}>
        <FeaturesSection />
      </div>

      <ComparisonSlider />

      <Footer />
    </div>
  );
}
