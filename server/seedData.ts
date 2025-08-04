import { storage } from "./storage";

async function seedSeifEissaData(athleteId: string) {
  // Strengths
  const strengths = [
    {
      athleteId,
      title: "Lightning-Fast Combinations",
      description: "Exceptional ability to execute rapid-fire kick combinations with perfect timing and precision. His signature 3-kick combo (roundhouse-side-hook) has a 92% success rate in competition. Average combination speed: 0.8 seconds for triple kicks. Recorded peak speed of 186 km/h on roundhouse kicks. Superior neuromuscular coordination allows for seamless transitions between offensive and defensive positions."
    },
    {
      athleteId,
      title: "Mental Fortitude & Championship Mindset",
      description: "Demonstrates extraordinary psychological resilience under pressure with elite-level mental conditioning. Never lost a match when trailing by 5+ points, with 15 comeback victories in the last 2 years. Heart rate variability shows exceptional stress management (average 45ms under pressure vs 35ms for elite athletes). Maintains 94% focus accuracy during high-pressure situations. Uses advanced visualization techniques and mindfulness meditation daily."
    },
    {
      athleteId,
      title: "Counter-Attack Mastery & Defensive Excellence",
      description: "World-class defensive awareness and counter-attacking skills with tactical supremacy. Leads international rankings with 78% counter-attack success rate, specializing in cut-kicks and back-kicks. Reaction time of 0.12 seconds (22% faster than average). Masters 8 different counter-attack patterns. Defensive efficiency rating: 89%. Exceptional distance management and timing create perfect counter-opportunities."
    },
    {
      athleteId,
      title: "Tactical Intelligence & Game Analysis",
      description: "Superior game reading ability and tactical adaptation mid-match with strategic dominance. Known for analyzing opponent patterns within the first round and adjusting strategy accordingly. Studies opponent video footage 15+ hours weekly. Identifies weaknesses in 94% of opponents within first 90 seconds. Masters 12 different fighting strategies. IQ rating in tactical scenarios: 98th percentile among elite athletes."
    },
    {
      athleteId,
      title: "Flexibility, Mobility & Athletic Performance",
      description: "Exceptional range of motion enabling high kicks up to head level with minimal telegraphing. Maintains 95% kick accuracy even in the final round of competition. Flexibility score: 96/100. Hip mobility allows 185-degree kicks. Balance recovery time: 0.3 seconds. Vertical jump: 68cm. Core stability rating: 94%. Daily stretching routine of 90 minutes maintains peak physical condition."
    },
    {
      athleteId,
      title: "Technical Precision & Biomechanical Excellence",
      description: "Flawless technique execution with world-class biomechanical efficiency. All kicks maintain proper chamber position and follow-through. Technical accuracy score: 94.2%. Optimal power transfer coefficient: 0.91. Perfect hip rotation mechanics generate maximum force with minimal energy expenditure. Kicks land on target with 96% accuracy. Footwork efficiency rated 97% by international technical panel."
    },
    {
      athleteId,
      title: "Competition Experience & Championship Pedigree",
      description: "Extensive international competition experience with proven championship performance. Competed in 47 international tournaments with 89% win rate. Undefeated in weight category for current season. 3 international gold medals, 5 silver medals. Performed consistently across 15 different countries and venues. Experience managing jet lag, different time zones, and cultural pressures. Maintains performance standards regardless of external conditions."
    },
    {
      athleteId,
      title: "Physical Conditioning & Endurance Capacity",
      description: "Superior cardiovascular fitness and muscular endurance supporting sustained peak performance. VO2 max: 64 ml/kg/min (elite athlete level). Resting heart rate: 48 BPM. Lactate threshold at 87% max heart rate. Can maintain 95% power output through 5 rounds. Recovery heart rate returns to baseline within 90 seconds. Body fat percentage: 8.2%. Muscle fiber composition optimized for explosive power and endurance."
    }
  ];

  // Weaknesses
  const weaknesses = [
    {
      athleteId,
      title: "Extended Match Endurance & Late-Round Performance",
      description: "Performance tends to decline slightly in overtime rounds with measurable fatigue indicators. Kick output drops by 15% after the 2nd round in matches lasting over 6 minutes. Power output decreases to 87% of peak levels after 5 minutes of continuous action. Heart rate recovery slows by 12% in rounds 3+. Technique accuracy drops from 95% to 89% in overtime periods. Needs enhanced cardiovascular conditioning for tournament finals lasting 15+ minutes."
    },
    {
      athleteId,
      title: "Aggressive Close-Range Pressure & Clinch Situations",
      description: "Can struggle against opponents who constantly pressure forward and clinch with reduced effectiveness in tight spaces. Success rate drops to 68% when facing clinch-heavy fighting styles. Kick effectiveness reduced by 23% when opponent maintains distance under 1.2 meters. Struggles with elbow and knee techniques in close quarters. Clinch escape time: 2.8 seconds (above optimal). Needs improvement in short-range combinations and infighting techniques."
    },
    {
      athleteId,
      title: "Left-Side Blind Spot & Directional Vulnerability",
      description: "Slightly slower reaction time to attacks from the left side with documented timing delays. Reaction time 0.2 seconds slower to left-side attacks (0.32s vs 0.12s right side). Creates vulnerability to left-footed fighters' roundhouse kicks and left-side feints. Miss rate increases to 18% when defending left-side combinations. Southpaw opponents exploit this weakness successfully 34% of the time. Requires specialized training for left-side awareness and response speed."
    },
    {
      athleteId,
      title: "Adaptation to Unorthodox Fighting Styles",
      description: "Occasionally struggles against highly unconventional or unorthodox fighting styles that deviate from traditional patterns. Success rate drops to 72% against fighters using non-standard techniques or unusual timing patterns. Takes average 4.2 minutes to adapt to completely new fighting styles (vs 2.1 minutes for standard styles). Unusual angles and timing disrupt natural counter-attack instincts. Needs enhanced pattern recognition training for uncommon fighting approaches."
    },
    {
      athleteId,
      title: "Pressure Point Sensitivity & Recovery Time",
      description: "Specific vulnerable areas that require attention for optimal defensive positioning. Liver shot sensitivity above average - impact causes 3.2 second recovery time. Solar plexus strikes affect breathing pattern for 8-12 seconds. Left floating rib area shows increased sensitivity to body kicks. Requires improved body conditioning and protective positioning. Recovery protocols need optimization for faster return to full effectiveness."
    }
  ];

  // Development Plans (12-week program)
  const developmentPlans = [
    {
      athleteId,
      title: "Week 1-2: Cardiovascular Enhancement & Endurance Foundation",
      description: "High-intensity interval training combining taekwondo-specific movements with advanced conditioning protocols. 45-minute sessions, 5 days/week focusing on maintaining peak performance through extended competition rounds. Target: Increase VO2 max by 8%, improve lactate threshold to 89% max HR. Includes: Sport-specific HIIT, swimming intervals, cycling sessions, recovery monitoring with heart rate variability. Daily: 15-min morning cardio, technique drills with elevated heart rate, evening recovery protocols.",
      week: 1
    },
    {
      athleteId,
      title: "Week 3-4: Close-Range Combat Mastery & Clinch Work",
      description: "Specialized clinch work and short-range techniques with Olympic-level intensity. Partner drills focusing on elbow strikes, knee techniques, and escaping from clinch positions. Target: Improve close-range success rate to 85%, reduce clinch escape time to 1.8 seconds. Includes: Daily clinch sparring, elbow/knee pad work, grip fighting, escape drills. Technical focus: Short-range combinations, defensive positioning, counter-attacks from clinch, referee separation techniques.",
      week: 3
    },
    {
      athleteId,
      title: "Week 5-6: Left-Side Reaction Training & Directional Defense",
      description: "Mirror work and reaction drills specifically targeting left-side attacks with neuromuscular reprogramming. Use of reaction lights and partner-assisted surprise attack simulations. Target: Reduce left-side reaction time to 0.18 seconds, improve southpaw defense success to 88%. Includes: Mirror sparring, reaction ball training, left-side pattern recognition, ambidextrous technique development. Technology: LED reaction training system, video analysis of left-side vulnerabilities.",
      week: 5
    },
    {
      athleteId,
      title: "Week 7-8: Olympic Sparring Simulations & Competition Conditioning",
      description: "Full-contact sparring sessions replicating Olympic tournament conditions with exact competition protocols. 3-round matches with 30-second recovery, multiple opponents daily. Target: Maintain 94% technique accuracy in round 3, improve tournament-day performance consistency. Includes: Multi-opponent training days, referee interaction practice, crowd noise simulation, international rules emphasis, mental pressure training.",
      week: 7
    },
    {
      athleteId,
      title: "Week 9-10: Power Development & Explosive Enhancement",
      description: "Plyometric training and resistance work to increase kick power by 12% with biomechanical optimization. Focus on explosive hip rotation and core strengthening exercises. Target: Achieve 195 km/h kick speed, improve power-to-weight ratio by 15%. Includes: Olympic lifts, plyometric circuits, resistance band training, biomechanical analysis, speed development protocols. Lab testing: Force plate analysis, high-speed video review.",
      week: 9
    },
    {
      athleteId,
      title: "Week 11-12: Competition Strategy & Mental Preparation",
      description: "Video analysis sessions studying upcoming opponents with psychological preparation protocols. Development of specific game plans for different fighting styles and weight categories. Target: Master 15 opponent-specific strategies, achieve competition-ready mental state. Includes: Video study sessions, tactical drilling, sports psychology work, visualization training, pre-competition routines, strategy implementation under pressure.",
      week: 11
    },
    {
      athleteId,
      title: "Advanced Technique Refinement Program",
      description: "Continuous technical improvement focusing on signature techniques and innovative combinations. Master advanced techniques: 540-degree kicks, jumping combinations, spinning attacks. Develop 3 new signature combinations for competition advantage. Includes: Technical video analysis, slow-motion training, precision targeting, combination flow development.",
      week: 1
    },
    {
      athleteId,
      title: "Injury Prevention & Recovery Optimization",
      description: "Comprehensive injury prevention program with advanced recovery protocols. Target: Zero training days lost to injury, optimize recovery between sessions. Includes: Daily mobility work, foam rolling protocols, ice bath recovery, massage therapy, nutrition timing, sleep optimization, stress management techniques.",
      week: 1
    },
    {
      athleteId,
      title: "Mental Performance & Psychology Training",
      description: "Elite-level sports psychology program for peak mental performance. Develop championship mindset, pressure management, focus enhancement. Includes: Meditation training, visualization protocols, confidence building, anxiety management, concentration exercises, competition day mental preparation routines.",
      week: 1
    },
    {
      athleteId,
      title: "Tactical Intelligence & Fight IQ Development",
      description: "Advanced tactical training for superior fight intelligence and adaptation abilities. Study 50+ international opponents, master 20+ fighting scenarios. Includes: Video analysis sessions, pattern recognition training, tactical simulation, decision-making under pressure, real-time strategy adjustment protocols.",
      week: 1
    }
  ];

  // Nutrition Plans
  const nutritionPlans = [
    {
      athleteId,
      mealType: "Pre-Training Power Breakfast (6:30 AM)",
      foodItem: "Steel-cut oats (80g) with mixed berries (120g), almonds (30g), Greek yogurt (150g), honey (15ml)",
      calories: 485,
      description: "Optimized macro ratio: 52% carbs, 28% protein, 20% fats. Complex carbohydrates for sustained 3-hour energy release, antioxidants (anthocyanins, vitamin C) for recovery enhancement, healthy fats for hormone production and satiety. Greek yogurt provides 20g complete protein. Consumed 2 hours before morning training for optimal glycogen loading and minimal GI distress."
    },
    {
      athleteId,
      mealType: "Post-Training Recovery Blend (9:15 AM)",
      foodItem: "Whey isolate protein (30g), banana (1 large), coconut water (300ml), spinach (50g), creatine (5g)",
      calories: 295,
      description: "Scientifically timed for anabolic window maximization. 25g fast-absorbing whey protein for muscle protein synthesis, 35g simple carbs for glycogen replenishment (2:1 carb:protein ratio). Coconut water provides natural electrolytes (600mg potassium). Spinach adds nitrates for blood flow. Consumed within 15 minutes post-training for optimal recovery adaptation."
    },
    {
      athleteId,
      mealType: "Mid-Morning Fuel (11:00 AM)",
      foodItem: "Apple slices (150g) with almond butter (20g), green tea (250ml)",
      calories: 220,
      description: "Strategic energy bridge maintaining stable blood glucose. Natural fructose and fiber from apple provide sustained energy without insulin spikes. Almond butter delivers healthy monounsaturated fats and vitamin E. Green tea provides L-theanine for calm focus and EGCG for fat oxidation support."
    },
    {
      athleteId,
      mealType: "Competition-Day Power Lunch (1:00 PM)",
      foodItem: "Grilled chicken breast (180g), quinoa (100g cooked), steamed vegetables mix (200g), avocado (50g), olive oil (10ml)",
      calories: 545,
      description: "Competition-optimized nutrition timing 3-4 hours pre-event. Lean protein (35g) for muscle maintenance without digestive load. Quinoa provides complete amino acid profile and sustained energy. Vegetable blend (broccoli, carrots, bell peppers) delivers micronutrients and fiber. Avocado and olive oil provide healthy fats for hormone production. Light seasoning for palatability and easy digestion."
    },
    {
      athleteId,
      mealType: "Afternoon Training Snack (3:30 PM)",
      foodItem: "Rice cakes (2 pieces) with natural peanut butter (15g), cherry juice (200ml)",
      calories: 285,
      description: "Pre-afternoon training fuel optimized for quick energy and minimal stomach load. Rice cakes provide fast-digesting carbs for immediate energy availability. Natural peanut butter adds protein and healthy fats for satiety. Tart cherry juice supplies natural anti-inflammatories and aids in muscle recovery preparation."
    },
    {
      athleteId,
      mealType: "Evening Recovery Dinner (7:00 PM)",
      foodItem: "Wild salmon fillet (200g), roasted sweet potato (200g), steamed broccoli (150g), mixed greens salad (100g), olive oil dressing (15ml)",
      calories: 615,
      description: "Evening optimization for overnight recovery and muscle building. Wild salmon provides 45g high-quality protein plus omega-3 fatty acids (EPA/DHA) for inflammation reduction and cognitive function. Sweet potato delivers complex carbs for glycogen replenishment and beta-carotene. Broccoli supplies sulforaphane and vitamin K. Mixed greens provide folate and antioxidants."
    },
    {
      athleteId,
      mealType: "Pre-Competition Energy Boost (90 min before)",
      foodItem: "Medjool dates (3 pieces, 60g) with almond butter (10g), coconut water (250ml)",
      calories: 245,
      description: "Precisely timed pre-competition fuel for peak performance. Dates provide 45g natural sugars (glucose/fructose) for rapid energy without GI distress. Small amount of almond butter prevents blood sugar crash. Coconut water maintains optimal hydration status and electrolyte balance. Consumed 90 minutes before competition for optimal absorption and energy availability."
    },
    {
      athleteId,
      mealType: "Post-Competition Recovery (Immediately after)",
      foodItem: "Chocolate milk (300ml), banana (1 medium), recovery electrolyte blend",
      calories: 320,
      description: "Rapid recovery initiation within golden window. Chocolate milk provides optimal 3:1 carb:protein ratio proven superior for glycogen resynthesis. Natural sugars and casein protein support immediate and sustained recovery. Banana adds potassium for muscle function restoration. Electrolyte blend replaces minerals lost through competition sweat."
    },
    {
      athleteId,
      mealType: "Late Evening Recovery Snack (9:30 PM)",
      foodItem: "Casein protein (25g) with mixed nuts (20g), chamomile tea",
      calories: 245,
      description: "Overnight muscle building and recovery optimization. Slow-digesting casein protein provides sustained amino acid release for 7-8 hours, supporting muscle protein synthesis during sleep. Mixed nuts add healthy fats and magnesium for muscle relaxation. Chamomile tea promotes quality sleep for growth hormone release."
    },
    {
      athleteId,
      mealType: "Competition Day Hydration Protocol",
      foodItem: "Water (3.5L daily), electrolyte solution during training, coconut water post-training",
      calories: 85,
      description: "Comprehensive hydration strategy for peak performance maintenance. Pre-training: 500ml water 2 hours before, 250ml 15 minutes before. During training: 150-200ml every 15 minutes of electrolyte solution. Post-training: Coconut water for natural electrolyte replacement. Urine color monitoring ensures optimal hydration status throughout competition preparation."
    }
  ];

  // Beat Strategies (how to defeat common opponent types)
  const beatStrategies = [
    {
      athleteId,
      strategy: "Dominate the Power Kicker - Distance Control Strategy",
      description: "Against heavy power kickers with knockout capability: Master distance management and precise timing to neutralize their primary weapon. Stay just outside their optimal power range (1.3-1.5m), bait power kicks through feints and movement, then counter with lightning-fast combinations to the body and head. Focus on scoring 3-4 quick points in round 1 to force them into desperate, aggressive attacks that create counter-opportunities. Utilize superior speed advantage - average reaction time 0.12s vs their 0.18s. Key techniques: Cut kicks to stop forward momentum, side kicks to maintain distance, roundhouse counters when they miss power shots. Success rate against power kickers: 89%."
    },
    {
      athleteId,
      strategy: "Neutralize the Pressure Fighter - Mobility Supremacy",
      description: "Against constant forward pressure specialists who thrive on close-range chaos: Utilize superior circular footwork and strategic pivot escapes to control engagement distance. Use push kicks to create separation, target their advancing legs with precise cut kicks to disrupt forward momentum. Force them to reset by clinching then immediately executing rapid escapes. Master the 'matador technique' - let them charge past while landing scoring combinations. Key timing: Counter-attack 0.3 seconds after their failed pressure attempt. Conditioning advantage allows maintaining high mobility for full 6 minutes while they fatigue from constant forward pressure. Footwork patterns: Figure-8 movement, diagonal exits, lateral slides. Success rate: 85%."
    },
    {
      athleteId,
      strategy: "Outclass the Technical Fighter - Chaos & Unpredictability",
      description: "Against highly technical opponents with perfect fundamentals: Disrupt their rhythm and timing through pace variation and unconventional techniques. Use feints and sudden rhythm changes to break their technical patterns. Score with unorthodox techniques they can't anticipate: spinning back kicks, jumping attacks, unusual combination sequences. Implement 'organized chaos' strategy - vary timing between attacks from 0.5 seconds to 3.2 seconds to prevent pattern recognition. Technical fighters rely on predictability - eliminate all patterns from your attack sequences. Master 7 different attacking rhythms, switch between them randomly. Mental warfare: Use unexpected techniques early to plant doubt, then exploit their overthinking. Success rate: 82%."
    },
    {
      athleteId,
      strategy: "Overwhelm the Defensive Counter-Puncher - Relentless Pressure",
      description: "Against defensive specialists who rely on counter-attacks: Use continuous combination attacks and sustained pressure to force them out of their comfort zone. Execute 'false attacks' to draw out their counters, then counter their counters with superior speed and technique. Create constant threat through multi-level combinations (high-low-middle sequences) that overwhelm their defensive capabilities. Force them into exchanges where superior conditioning and speed provide decisive advantages. Key strategy: Maintain 70% attack rate vs their preferred 30% to prevent them from setting up counter-attacks. Use superior stamina to maintain pressure in rounds 2-3 when their counter-timing degrades. Triple-combination success rate vs defensive fighters: 94%. Success rate: 91%."
    },
    {
      athleteId,
      strategy: "Defeat the Southpaw Specialist - Angle Mastery",
      description: "Against left-handed fighters exploiting orthodox blind spots: Master specialized southpaw strategies through advanced angle work and adapted techniques. Utilize superior right leg as lead weapon, target their liver with precise body kicks. Control center line through strategic positioning 15 degrees right of center. Key techniques: Lead leg roundhouse to their open side, straight right hand over their jab, left hook counter to their right hand. Practice specific footwork: step left and pivot right to escape their power angle. Timing adjustment: southpaw attacks come 0.15 seconds earlier than orthodox - adjust defensive timing accordingly. Video study: 25+ hours of southpaw analysis weekly. Success rate vs southpaws: 78%."
    },
    {
      athleteId,
      strategy: "Conquer the Veteran Fighter - Youth vs Experience",
      description: "Against experienced veterans with superior fight IQ: Utilize superior speed, conditioning, and recovery to overwhelm their technical knowledge. Push high pace from opening bell to exploit age-related decline in stamina and recovery. Force continuous action to prevent them from setting up their preferred tactical scenarios. Key advantage: Recovery between exchanges 40% faster than veteran opponents. Use modern techniques they haven't adapted to: advanced combination sequences developed in last 2 years. Mental approach: Show respect but maintain aggressive confidence. Neutralize their experience through constant movement and unpredictable attack patterns. Physical advantages: Faster hand speed, better flexibility, superior endurance. Success rate vs veterans (30+ years): 87%."
    },
    {
      athleteId,
      strategy: "Overcome the Bigger Opponent - David vs Goliath",
      description: "Against taller, heavier opponents with reach advantage: Master inside fighting and advanced footwork to neutralize their physical advantages. Use superior speed to close distance rapidly, work inside their reach where height becomes disadvantage. Target their body consistently to slow them down and reduce their mobility. Key techniques: Duck under their kicks and counter, use their momentum against them, attack immediately after their missed techniques. Conditioning advantage: Bigger opponents fatigue faster - maintain high pace to exploit this. Psychological warfare: Early aggressive attacks to establish dominance despite size difference. Movement patterns: Diagonal entries, level changes, constant pressure. Success rate vs taller opponents: 83%."
    },
    {
      athleteId,
      strategy: "Neutralize the Mental Warrior - Psychological Dominance",
      description: "Against opponents known for psychological intimidation and mental warfare: Maintain superior mental fortitude through advanced sports psychology training and unshakeable confidence. Use their psychological tactics against them through superior mental conditioning. Stay focused on technical execution rather than responding to mental games. Key strategy: Early technique display to demonstrate superior skill level, maintain calm confidence under all pressure situations. Psychological advantages: 94% focus accuracy under pressure, heart rate stays controlled during intimidation attempts. Counter their mental tactics with superior performance - let technique speak louder than their psychological games. Visualization training for all scenarios maintains confidence regardless of opponent behavior. Success rate vs psychological fighters: 86%."
    }
  ];

  // Dynamic Analysis
  const dynamicAnalysis = [
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-comprehensive-technique-analysis",
      analysisType: "Advanced Technique Breakdown & Biomechanical Analysis",
      findings: "Comprehensive analysis of 847 kicks across 23 training sessions reveals 94.2% technical accuracy with optimal biomechanical efficiency. Hip rotation averages 168 degrees with peak torque generation at 0.23 seconds. Chamber positioning maintains 97% consistency even under extreme fatigue (round 5+). Power transfer coefficient of 0.91 indicates exceptional energy efficiency. Kick velocity consistently reaches 186 km/h on roundhouse techniques. Balance recovery time averages 0.31 seconds across all techniques. Technical degradation minimal - only 3% accuracy loss from round 1 to round 5. Footwork efficiency rated 96.8% by international technical panel.",
      recommendations: "Maintain current technical excellence through daily precision training. Recommend adding 15% more variation in kick timing sequences to increase unpredictability against elite opponents who study video extensively. Focus on developing 2-3 new signature combinations for 2024 Olympic cycle. Consider working with biomechanics specialist to optimize power transfer beyond 0.93 coefficient. Implement high-speed video analysis monthly to maintain technical standards."
    },
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-competition-performance-analysis",
      analysisType: "Competition Performance & Strategic Analysis",
      findings: "Analysis of 47 international competitions shows remarkable consistency and strategic adaptability. Won 41 of last 47 matches (87.2% win rate) with average winning margin of 8.6 points. Demonstrates superior performance across 15 different countries and venue types. First-round scoring rate: 78% (above elite average of 65%). Shows exceptional ability to adapt mid-match - 94% success rate when trailing after round 1. Performance remains consistent regardless of crowd size, venue acoustics, or opponent ranking. Mental toughness rating: 98th percentile among international competitors.",
      recommendations: "Focus on first-round dominance strategy to avoid close decisions and conserve energy for tournament finals. Current strategy of building leads in rounds 2-3 is effective but may be risky against world-class opponents with superior conditioning. Recommend developing 'knockout combination' sequences for immediate round 1 impact. Consider adding sports psychologist for Olympic-level pressure scenarios exceeding current competition experience."
    },
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-psychological-performance-profile",
      analysisType: "Mental Performance & Psychological Resilience",
      findings: "Biometric analysis during high-pressure competition reveals exceptional psychological resilience and emotional regulation. Heart rate remains stable under maximum pressure (average 165 BPM during championship finals vs 170 BPM training baseline). Heart rate variability indicates superior stress management (45ms under pressure vs 35ms elite athlete average). Cortisol levels stay within optimal range even during Olympic qualification events. Focus accuracy maintains 94% even during crowd distractions and referee disputes. Never shows visible frustration or emotional breakdown during competition. Recovery from setbacks averages 12 seconds (vs 28 seconds elite average).",
      recommendations: "Psychological profile indicates championship-level mental strength ready for Olympic competition. Implement advanced visualization routines for Olympic-specific pressure scenarios exceeding current experience level. Recommend working with Olympic sports psychologist for final mental preparation protocols. Develop competition-day mental routine optimization. Consider meditation retreat for enhanced focus depth. Current mental skills provide significant competitive advantage - maintain through consistent practice."
    },
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-tactical-intelligence-assessment",
      analysisType: "Tactical Intelligence & Fight IQ Evaluation",
      findings: "Strategic analysis reveals superior tactical intelligence and real-time adaptation capabilities. Pattern recognition speed: Identifies opponent weaknesses within 94 seconds (vs 3.2 minutes elite average). Successfully adapts strategy mid-match in 96% of situations requiring tactical adjustment. Masters 14 different fighting approaches and can switch between them seamlessly. Counter-attack success rate: 78% (highest in international rankings). Shows exceptional ability to exploit opponent mistakes with 0.12 second reaction time. Game plan execution accuracy: 91% even under pressure situations.",
      recommendations: "Tactical intelligence represents world-class level ready for Olympic success. Recommend expanding tactical arsenal to include 3 additional unconventional strategies for opponents who over-study video footage. Focus on developing 'backup strategies' for scenarios where primary game plan fails. Consider working with tactical analyst for advanced opponent scouting protocols. Current fight IQ provides major competitive advantage - continue developing through varied sparring partners and competition exposure."
    },
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-physical-conditioning-analysis",
      analysisType: "Physical Conditioning & Athletic Performance",
      findings: "Comprehensive fitness testing reveals elite-level physical conditioning across all performance metrics. VO2 max: 64.2 ml/kg/min (99th percentile for combat athletes). Body composition: 8.1% body fat, 91.9% lean mass optimized for power-to-weight ratio. Flexibility score: 96/100 with exceptional hip mobility allowing 187-degree kicks. Power output: Maintains 96% of peak power through 5 competition rounds. Reaction time: 0.118 seconds (22% faster than elite average). Vertical jump: 68cm indicating superior explosive power. Recovery between efforts: Returns to baseline within 84 seconds.",
      recommendations: "Physical conditioning represents world-class standards ready for Olympic competition. Recommend fine-tuning VO2 max to 66+ ml/kg/min for additional endurance margin in tournament finals. Focus on maintaining current power-to-weight ratio while potentially adding 2-3kg lean muscle mass for increased striking power. Continue current flexibility maintenance protocols - exceptional range of motion provides competitive advantage. Monitor recovery metrics to ensure training load optimization throughout Olympic preparation."
    },
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-opponent-analysis-compilation",
      analysisType: "Opponent Analysis & Competitive Intelligence",
      findings: "Advanced scouting analysis of potential Olympic opponents reveals strategic advantages and areas for targeted preparation. Success rate vs top 10 world ranking opponents: 73% (above expected 65% for current ranking). Demonstrates superior performance against specific opponent types: power kickers (89% success), pressure fighters (85% success), technical specialists (82% success). Shows exceptional ability to exploit opponent weaknesses identified through video study. Adaptability rating: 94% when facing unfamiliar fighting styles or techniques.",
      recommendations: "Continue intensive opponent analysis protocols with enhanced focus on Olympic medal contenders from each continent. Develop specific strategies for top 5 potential Olympic opponents based on current world rankings. Recommend creating 'surprise techniques' not shown in competition video for Olympic tactical advantage. Focus preparation on opponent types with lower success rates (southpaws 78%, veterans 87%) to achieve uniform dominance across all fighting styles."
    }
  ];

  // Rank History (showing progression over 24 months)
  const rankHistory = [
    { athleteId, rank: 15, date: new Date('2023-01-01') },
    { athleteId, rank: 12, date: new Date('2023-03-01') },
    { athleteId, rank: 8, date: new Date('2023-05-01') },
    { athleteId, rank: 6, date: new Date('2023-07-01') },  
    { athleteId, rank: 4, date: new Date('2023-09-01') },
    { athleteId, rank: 3, date: new Date('2023-11-01') },
    { athleteId, rank: 2, date: new Date('2024-01-01') },
    { athleteId, rank: 2, date: new Date('2024-03-01') },
    { athleteId, rank: 1, date: new Date('2024-05-01') },
    { athleteId, rank: 2, date: new Date('2024-07-01') },
    { athleteId, rank: 2, date: new Date('2024-09-01') },
    { athleteId, rank: 2, date: new Date('2024-12-01') }
  ];

  // Insert all the data
  try {
    // Insert strengths
    for (const strength of strengths) {
      try {
        await storage.createAthleteStrength(strength);
      } catch (error) {
        console.log(`Skipping strength for ${athleteId}:`, error);
      }
    }

    // Insert weaknesses  
    for (const weakness of weaknesses) {
      try {
        await storage.createAthleteWeakness(weakness);
      } catch (error) {
        console.log(`Skipping weakness for ${athleteId}:`, error);
      }
    }

    // Insert development plans
    for (const plan of developmentPlans) {
      try {
        await storage.createDevelopmentPlan(plan);
      } catch (error) {
        console.log(`Skipping development plan for ${athleteId}:`, error);
      }
    }

    // Insert nutrition plans
    for (const nutrition of nutritionPlans) {
      try {
        await storage.createNutritionPlan(nutrition);
      } catch (error) {
        console.log(`Skipping nutrition plan for ${athleteId}:`, error);
      }
    }

    // Insert beat strategies
    for (const strategy of beatStrategies) {
      try {
        await storage.createBeatStrategy(strategy);
      } catch (error) {
        console.log(`Skipping beat strategy for ${athleteId}:`, error);
      }
    }

    // Insert dynamic analysis
    for (const analysis of dynamicAnalysis) {
      try {
        await storage.createDynamicAnalysis(analysis);
      } catch (error) {
        console.log(`Skipping dynamic analysis for ${athleteId}:`, error);
      }
    }

    // Insert rank history
    for (const rank of rankHistory) {
      try {
        await storage.createRankHistory(rank);
      } catch (error) {
        console.log(`Skipping rank history for ${athleteId}:`, error);
      }
    }

    console.log(`Comprehensive data seeded for Seif Eissa (${athleteId})`);
  } catch (error) {
    console.error(`Error seeding Seif Eissa data:`, error);
  }
}

export async function seedDatabase() {
  try {
    // Seed sports
    const sports = [
      { name: "Football" },
      { name: "Soccer" },
      { name: "Basketball" },
      { name: "Tennis" },
      { name: "Taekwondo" },
      { name: "Baseball" },
      { name: "Swimming" },
      { name: "Golf" },
      { name: "Boxing" },
      { name: "Athletics" }
    ];

    const createdSports = [];
    for (const sport of sports) {
      try {
        const existingSports = await storage.getAllSports();
        const exists = existingSports.find(s => s.name === sport.name);
        if (!exists) {
          const createdSport = await storage.createSport(sport);
          createdSports.push(createdSport);
        }
      } catch (error) {
        // Sport might already exist, continue
      }
    }

    // Get all sports for athlete creation
    const allSports = await storage.getAllSports();
    const footballSport = allSports.find(s => s.name === "Football");
    const soccerSport = allSports.find(s => s.name === "Soccer");
    const tennisSport = allSports.find(s => s.name === "Tennis");
    const basketballSport = allSports.find(s => s.name === "Basketball");
    const taekwondoSport = allSports.find(s => s.name === "Taekwondo");

    // Seed famous athletes
    const athletes = [
      {
        name: "Cristiano Ronaldo",
        sportId: soccerSport?.id || allSports[0]?.id || "default",
        bio: "Portuguese professional footballer widely regarded as one of the greatest players of all time. Known for his incredible goal-scoring ability, athleticism, and dedication to fitness.",
        rank: 3,
        profileImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Lionel Messi",
        sportId: soccerSport?.id || allSports[0]?.id || "default",
        bio: "Argentine professional footballer considered one of the greatest players in football history. Winner of multiple Ballon d'Or awards and known for his incredible dribbling and playmaking abilities.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Serena Williams",
        sportId: tennisSport?.id || allSports[0]?.id || "default",
        bio: "American former professional tennis player widely regarded as one of the greatest tennis players of all time. Winner of 23 Grand Slam singles titles.",
        rank: 2,
        profileImageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "LeBron James",
        sportId: basketballSport?.id || allSports[0]?.id || "default",
        bio: "American professional basketball player widely considered one of the greatest players in NBA history. Four-time NBA champion and four-time NBA Finals MVP.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Tom Brady",
        sportId: footballSport?.id || allSports[0]?.id || "default",
        bio: "American former professional football quarterback who played 23 seasons in the NFL. Seven-time Super Bowl champion and widely considered the greatest quarterback of all time.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Seif Eissa",
        sportId: taekwondoSport?.id || allSports[0]?.id || "default",
        bio: "Elite Egyptian Taekwondo athlete and Olympic hopeful. Known for lightning-fast combinations, tactical brilliance, and exceptional mental fortitude. Current national champion with 3 international gold medals and undefeated record in the -80kg weight category this season.",
        rank: 2,
        profileImageUrl: "https://images.unsplash.com/photo-1555597673-b21d5c935865?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Rafael Nadal",
        sportId: tennisSport?.id || allSports[0]?.id || "default",
        bio: "Spanish professional tennis player known as the 'King of Clay'. Winner of 22 Grand Slam singles titles, including 14 French Open titles.",
        rank: 4,
        profileImageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Stephen Curry",
        sportId: basketballSport?.id || allSports[0]?.id || "default",
        bio: "American professional basketball player widely regarded as one of the greatest shooters in NBA history. Four-time NBA champion and two-time MVP.",
        rank: 3,
        profileImageUrl: "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      }
    ];

    for (const athlete of athletes) {
      try {
        const existingAthletes = await storage.getAthletesBySearch(athlete.name);
        if (existingAthletes.length === 0) {
          const createdAthlete = await storage.createAthlete(athlete);
          
          // Add comprehensive data for Seif Eissa
          if (athlete.name === "Seif Eissa") {
            await seedSeifEissaData(createdAthlete.id);
          }
        }
      } catch (error) {
        // Athlete might already exist or there's a validation error, continue
        console.log(`Skipping athlete ${athlete.name}: ${error}`);
      }
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
