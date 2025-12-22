import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { UserPlus, Gift, ArrowRight, ChevronDown, GripVertical, User, Video, Target, Utensils, TrendingUp, Trophy, Sparkles, Brain, Clock, FileText, Users, BarChart3, Clipboard, XCircle, CheckCircle, Zap, Globe, Shield, Cpu } from 'lucide-react';
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

// Features data for the 3D pie chart - based on Key Features & Value Propositions
const featuresData = [
  {
    id: 'feature1',
    name: 'Profile',
    percentage: 20,
    color: '#1e4a8a',
    icon: User,
    title: 'Athlete 360° Profile',
    subtitle: 'Your complete performance overview',
    description: 'Get a comprehensive view of your athletic journey including rankings, achievements, historical data, and AI-generated strengths/weaknesses analysis. Track your progress from amateur to champion.',
  },
  {
    id: 'feature2',
    name: 'Video AI',
    percentage: 20,
    color: '#10b981',
    icon: Video,
    title: 'AI Video Analysis',
    subtitle: 'Powered by Google Gemini 2.0 Flash',
    description: 'Upload match footage and receive detailed AI-powered breakdowns of techniques, scoring patterns, tactical elements, and performance insights specific to your sport.',
  },
  {
    id: 'feature3',
    name: 'Strategy',
    percentage: 20,
    color: '#f59e0b',
    icon: Target,
    title: 'Opponent Analysis',
    subtitle: 'Know your competition inside out',
    description: 'Get strategic insights on opponents based on their fighting style, tendencies, and historical performance data. Prepare for every match with data-driven game plans.',
  },
  {
    id: 'feature4',
    name: 'Nutrition',
    percentage: 20,
    color: '#ef4444',
    icon: Utensils,
    title: 'Training & Nutrition',
    subtitle: 'Personalized plans powered by AI',
    description: 'AI-generated personalized training programs and nutrition plans based on sports science, including TDEE calculations, macro optimization, and competition preparation schedules.',
  },
  {
    id: 'feature5',
    name: 'Rank Up',
    percentage: 20,
    color: '#8b5cf6',
    icon: TrendingUp,
    title: 'Rank-Up Calculator',
    subtitle: 'Strategic guidance to advance',
    description: 'Get clear, actionable steps on how to advance in world rankings with competition recommendations and strategic planning to reach your performance goals.',
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
          className="text-3xl sm:text-4xl font-bold text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span className="text-[#1e4a8a]">The 360° Experience</span>
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
                      name={slice.name}
                      cx={210}
                      cy={210}
                      radius={180}
                    />
                  ))}
                </g>
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
                    {selectedData.title}
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
                  {selectedData.subtitle}
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
              transition={{ duration: 0.2, delay: 0.3 }}
              className="w-full max-w-md lg:max-w-lg text-center lg:text-left"
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

// AI Edge Section Data
const aiEdgeCards = [
  {
    id: 'who-we-are',
    title: 'Who We Are',
    icon: Users,
    color: '#1e4a8a',
    points: [
      'A comprehensive AI-powered sports analytics platform',
      'Built for athletes, coaches, and teams worldwide',
      'Taekwondo-first with expansion to 10+ combat & racquet sports',
      'Trusted by athletes from amateur to elite level',
      'Multi-language support with English and Arabic',
    ],
  },
  {
    id: 'what-we-provide',
    title: 'What We Provide',
    icon: Zap,
    color: '#10b981',
    points: [
      'Complete 360° athlete profiles with AI-generated insights',
      'AI-powered video analysis with technique breakdowns',
      'Personalized training & nutrition plans',
      'Strategic opponent analysis and beat strategies',
      'Rank-Up Calculator for world ranking advancement',
    ],
  },
  {
    id: 'how-we-do-it',
    title: 'How We Do It',
    icon: Cpu,
    color: '#f59e0b',
    points: [
      'Dual AI engine: GPT-4o + Google Gemini technology',
      'Integration with world ranking systems & live competitions',
      'Sport-adaptive analytics across multiple disciplines',
      'Secure, mobile-ready Progressive Web App',
      'Data-driven insights powered by cutting-edge AI',
    ],
  },
];

interface FoldedCardProps {
  card: typeof aiEdgeCards[0];
  index: number;
}

function FoldedCard({ card, index }: FoldedCardProps) {
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

  return (
    <motion.div
      ref={cardRef}
      style={{
        perspective: "1200px",
      }}
      className="w-full"
    >
      <motion.div
        style={{
          rotateX,
          opacity,
          scale,
          y,
          transformOrigin: "center top",
        }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-full"
        data-testid={`card-${card.id}`}
      >
        <div 
          className="h-2 w-full"
          style={{ backgroundColor: card.color }}
        />
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${card.color}15` }}
            >
              <IconComponent 
                className="w-7 h-7" 
                style={{ color: card.color }}
              />
            </div>
            <h3 
              className="text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {card.title}
            </h3>
          </div>
          <ul className="space-y-4">
            {card.points.map((point, pointIndex) => (
              <motion.li
                key={pointIndex}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + pointIndex * 0.08 }}
                className="flex items-start gap-3"
                data-testid={`point-${card.id}-${pointIndex}`}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <CheckCircle 
                    className="w-4 h-4" 
                    style={{ color: card.color }}
                  />
                </div>
                <span className="text-slate-600 leading-relaxed">{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AIEdgeSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-[#1e4a8a]/10 text-[#1e4a8a] rounded-full text-sm font-medium mb-4">
            Discover Athlete360
          </span>
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1e4a8a] mb-6"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Your AI-Powered Edge in Athletic Performance
          </h2>
          <p className="text-slate-500 text-lg max-w-3xl mx-auto leading-relaxed">
            Athlete360 is a comprehensive sports analytics platform built to transform how athletes, coaches, and teams prepare and compete.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {aiEdgeCards.map((card, index) => (
            <FoldedCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

// AI vs Traditional comparison data
const withAIFeatures = [
  { icon: Brain, text: 'AI-powered video analysis in minutes' },
  { icon: Sparkles, text: 'Personalized training plans' },
  { icon: BarChart3, text: 'Real-time performance insights' },
  { icon: Target, text: 'Data-driven opponent strategies' },
  { icon: TrendingUp, text: 'Predictive ranking guidance' },
];

const withoutAIFeatures = [
  { icon: Clock, text: 'Hours of manual video review' },
  { icon: Clipboard, text: 'Generic training programs' },
  { icon: FileText, text: 'Delayed performance feedback' },
  { icon: Users, text: 'Subjective opponent assessment' },
  { icon: Trophy, text: 'Uncertain path to improvement' },
];

function ComparisonSlider() {
  const [inset, setInset] = useState<number>(50);
  const [onMouseDown, setOnMouseDown] = useState<boolean>(false);

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
    <section className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-[#1e4a8a]/10 text-[#1e4a8a] rounded-full text-sm font-medium mb-4">
            The AI Advantage
          </span>
          <h2 
            className="text-3xl sm:text-4xl font-bold text-[#1e4a8a] mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Sports Analytics: Then vs Now
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Drag the slider to see how AI transforms athletic performance analysis
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
                  With Athlete360
                </h3>
                <p className="text-blue-200 text-sm">AI-Powered Analytics</p>
              </div>
              <div className="space-y-4 w-full max-w-md">
                {withAIFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                    data-testid={`ai-feature-${index}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white/90 text-sm sm:text-base">{feature.text}</span>
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 ml-auto" />
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
                  Traditional Methods
                </h3>
                <p className="text-slate-500 text-sm">Manual Analysis</p>
              </div>
              <div className="space-y-4 w-full max-w-md">
                {withoutAIFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                    data-testid={`traditional-feature-${index}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <span className="text-slate-400 text-sm sm:text-base">{feature.text}</span>
                    <XCircle className="h-5 w-5 text-red-400/70 flex-shrink-0 ml-auto" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-slate-500 text-sm">
            Drag the slider to compare AI-powered vs traditional sports analytics
          </p>
        </motion.div>
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

      <AIEdgeSection />

      <div ref={featuresRef}>
        <FeaturesSection />
      </div>

      <ComparisonSlider />

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
