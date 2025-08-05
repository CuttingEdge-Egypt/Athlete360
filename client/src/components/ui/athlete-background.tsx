export function AthleteBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-8">
      <svg 
        className="absolute inset-0 w-full h-full object-cover text-white" 
        viewBox="0 0 1200 800" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Athletic silhouettes */}
        <g transform="translate(100, 200)">
          {/* Runner */}
          <path
            d="M50 120 L55 110 L60 100 L70 95 L80 100 L85 110 L90 120 L85 130 L75 140 L65 145 L55 140 L45 130 Z"
            fill="currentColor"
            opacity="0.3"
          />
          <path
            d="M70 120 L75 135 L80 150 L85 165 L90 180 L95 195 L100 210"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M55 120 L50 135 L45 150 L40 165 L35 180 L30 195 L25 210"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.3"
          />
          {/* Arms in motion */}
          <path
            d="M55 110 L40 105 L30 100 L25 95"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M80 110 L95 115 L105 120 L110 125"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
        </g>

        {/* Basketball player */}
        <g transform="translate(300, 150)">
          {/* Head */}
          <circle cx="50" cy="40" r="15" fill="currentColor" opacity="0.25" />
          {/* Torso */}
          <rect x="40" y="55" width="20" height="40" rx="10" fill="currentColor" opacity="0.25" />
          {/* Arms - shooting position */}
          <path
            d="M35 65 L20 50 L10 45"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M65 65 L80 50 L90 45 L95 40"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.25"
          />
          {/* Legs */}
          <path
            d="M45 95 L40 110 L35 125 L30 140"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M55 95 L60 110 L65 125 L70 140"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.25"
          />
          {/* Basketball */}
          <circle cx="100" cy="35" r="8" fill="currentColor" opacity="0.3" />
          <path
            d="M92 35 L108 35 M100 27 L100 43"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.3"
          />
        </g>

        {/* Soccer player */}
        <g transform="translate(500, 180)">
          {/* Head */}
          <circle cx="50" cy="30" r="12" fill="currentColor" opacity="0.2" />
          {/* Body */}
          <rect x="42" y="42" width="16" height="35" rx="8" fill="currentColor" opacity="0.2" />
          {/* Kicking leg */}
          <path
            d="M46 77 L40 90 L30 100 L20 105"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.2"
          />
          {/* Supporting leg */}
          <path
            d="M54 77 L56 92 L58 107 L60 122"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.2"
          />
          {/* Arms for balance */}
          <path
            d="M42 52 L25 48 L15 45"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.2"
          />
          <path
            d="M58 52 L75 55 L85 58"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.2"
          />
          {/* Soccer ball */}
          <circle cx="10" cy="110" r="6" fill="currentColor" opacity="0.3" />
          <polygon 
            points="4,110 10,106 16,110 13,116 7,116" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.5" 
            opacity="0.3"
          />
        </g>

        {/* Tennis player */}
        <g transform="translate(700, 160)">
          {/* Head */}
          <circle cx="50" cy="35" r="13" fill="currentColor" opacity="0.18" />
          {/* Body */}
          <rect x="42" y="48" width="16" height="40" rx="8" fill="currentColor" opacity="0.18" />
          {/* Racket arm - extended */}
          <path
            d="M58 58 L75 45 L90 35 L105 30"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.18"
          />
          {/* Tennis racket */}
          <ellipse cx="108" cy="25" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          <path d="M100 25 L116 25 M108 13 L108 37" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
          {/* Other arm */}
          <path
            d="M42 58 L30 62 L20 65"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.18"
          />
          {/* Legs in motion */}
          <path
            d="M46 88 L42 105 L38 120 L35 135"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.18"
          />
          <path
            d="M54 88 L58 105 L62 120 L65 135"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.18"
          />
        </g>

        {/* Boxer */}
        <g transform="translate(900, 170)">
          {/* Head with protective gear */}
          <circle cx="50" cy="35" r="14" fill="currentColor" opacity="0.15" />
          <rect x="45" y="25" width="10" height="6" rx="3" fill="currentColor" opacity="0.2" />
          {/* Muscular torso */}
          <rect x="40" y="49" width="20" height="42" rx="10" fill="currentColor" opacity="0.15" />
          {/* Boxing gloves and arms */}
          <circle cx="25" cy="55" r="7" fill="currentColor" opacity="0.25" />
          <path
            d="M32 58 L40 60"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            opacity="0.15"
          />
          <circle cx="75" cy="65" r="7" fill="currentColor" opacity="0.25" />
          <path
            d="M68 62 L60 60"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            opacity="0.15"
          />
          {/* Strong stance legs */}
          <path
            d="M45 91 L40 108 L35 125 L32 140"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            opacity="0.15"
          />
          <path
            d="M55 91 L60 108 L65 125 L68 140"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            opacity="0.15"
          />
        </g>

        {/* Performance data visualization overlay */}
        <g transform="translate(200, 600)" opacity="0.1">
          {/* Performance graph */}
          <path
            d="M0 50 Q100 30 200 40 T400 20 T600 35 T800 25"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0 70 Q100 55 200 60 T400 45 T600 50 T800 40"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          {/* Data points */}
          <circle cx="100" cy="35" r="2" fill="currentColor" />
          <circle cx="200" cy="45" r="2" fill="currentColor" />
          <circle cx="300" cy="25" r="2" fill="currentColor" />
          <circle cx="400" cy="30" r="2" fill="currentColor" />
          <circle cx="500" cy="40" r="2" fill="currentColor" />
          <circle cx="600" cy="35" r="2" fill="currentColor" />
        </g>

        {/* Abstract athletic elements */}
        <g opacity="0.05">
          {/* Speed lines */}
          <path d="M50 300 L150 295" stroke="currentColor" strokeWidth="1" />
          <path d="M80 320 L180 315" stroke="currentColor" strokeWidth="1" />
          <path d="M110 340 L210 335" stroke="currentColor" strokeWidth="1" />
          
          {/* Achievement symbols */}
          <polygon points="1000,100 1010,120 1030,120 1016,132 1022,152 1000,140 978,152 984,132 970,120 990,120" 
                   fill="currentColor" opacity="0.1" />
          <polygon points="1050,150 1060,170 1080,170 1066,182 1072,202 1050,190 1028,202 1034,182 1020,170 1040,170" 
                   fill="currentColor" opacity="0.1" />
          
          {/* Trophy outline */}
          <path d="M1100 200 L1100 180 L1120 180 L1120 200 L1125 200 L1125 220 L1115 220 L1115 230 L1105 230 L1105 220 L1095 220 L1095 200 Z" 
                fill="currentColor" opacity="0.08" />
        </g>

        {/* Dynamic motion blur effects */}
        <defs>
          <filter id="motionBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1,0"/>
          </filter>
        </defs>

        {/* Motion trails */}
        <g opacity="0.06" filter="url(#motionBlur)">
          <path d="M150 250 Q250 240 350 250 Q450 260 550 250" stroke="currentColor" strokeWidth="1" fill="none" />
          <path d="M150 270 Q250 260 350 270 Q450 280 550 270" stroke="currentColor" strokeWidth="1" fill="none" />
          <path d="M150 290 Q250 280 350 290 Q450 300 550 290" stroke="currentColor" strokeWidth="1" fill="none" />
        </g>
      </svg>
    </div>
  );
}