import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sports } from './shared/schema.ts';

const comprehensive_sports = [
  "Acrobatic Gymnastics", "Alpine Skiing", "American Football", "Archery", "Artistic Gymnastics", "Artistic Swimming", 
  "Athletics", "Australian Rules Football", "Badminton", "Baseball 5", "Baseball Softball", "Basketball", 
  "Basketball 3x3", "Beach Handball", "Beach Volleyball", "Biathlon", "Billiards", "Bobsleigh", "Bodybuilding", 
  "Bowling", "Boxing", "Breaking", "Canoe Slalom", "Canoe Sprint", "Cheerleading", "Chess", "Coastal Rowing", 
  "Cricket", "Cross Country Running", "Cross-Country Skiing", "Curling", "Cycling BMX Freestyle", 
  "Cycling BMX Racing", "Cycling Mountain Bike", "Cycling Road", "Cycling Track", "Dance Sport", "Darts", 
  "Diving", "Dragon Boat Racing", "Drone Racing", "Equestrian", "Esports", "Fencing", "Figure Skating", 
  "Flag Football", "Floorball", "Football", "Freestyle Skiing", "Futsal", "Gaelic Football", "Golf", 
  "Handball", "Hockey", "Hurling", "Ice Hockey", "Ironman", "Jet Skiing", "Judo", "Kabaddi", "Karate", 
  "Kendo", "Kickboxing", "Kitesurfing", "Lacrosse", "Luge", "Marathon", "Marathon Swimming", 
  "Mixed Martial Arts", "Modern Pentathlon", "Motor Racing", "Motorcycle Racing", "Muay Thai", "Netball", 
  "Nordic Combined", "Orienteering", "Padel", "Parkour", "Pickleball", "Polo", "Powerlifting", "Racquetball", 
  "Rhythmic Gymnastics", "Rock Climbing", "Roller Speed Skating", "Rowing", "Rugby Sevens", "Sailing", 
  "Sepak Takraw", "Shooting", "Short Track Speed Skating", "Skateboarding", "Skeleton", "Ski Jumping", 
  "Ski Mountaineering", "Snooker", "Snowboard", "Softball", "Speed Skating", "Sport Climbing", "Squash", 
  "Surfing", "Swimming", "Synchronized Swimming", "Table Tennis", "Taekwondo", "Tennis", "Track and Field", 
  "Trampoline", "Triathlon", "Ultimate Frisbee", "Volleyball", "Water Polo", "Water Skiing", "Weightlifting", 
  "Windsurfing", "Wrestling", "Wushu"
];

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema: { sports } });

async function populateSports() {
  console.log(`🏃‍♂️ Starting to populate ${comprehensive_sports.length} sports...`);
  
  try {
    // Get existing sports
    const existingSports = await db.select().from(sports);
    const existingNames = existingSports.map(sport => sport.name);
    console.log(`📊 Found ${existingSports.length} existing sports in database`);
    
    // Filter out sports that already exist
    const newSports = comprehensive_sports.filter(sportName => 
      !existingNames.includes(sportName)
    );
    
    if (newSports.length === 0) {
      console.log('✅ All sports already exist in the database!');
      return;
    }
    
    console.log(`🆕 Adding ${newSports.length} new sports:`);
    
    // Insert new sports in batches
    const batchSize = 20;
    for (let i = 0; i < newSports.length; i += batchSize) {
      const batch = newSports.slice(i, i + batchSize);
      const sportsToInsert = batch.map(name => ({ name }));
      
      await db.insert(sports).values(sportsToInsert);
      console.log(`✅ Added batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
    }
    
    // Verify final count
    const finalCount = await db.select().from(sports);
    console.log(`🎉 SUCCESS! Database now contains ${finalCount.length} sports total`);
    
  } catch (error) {
    console.error('❌ Error populating sports:', error);
    throw error;
  }
}

populateSports().catch(console.error);