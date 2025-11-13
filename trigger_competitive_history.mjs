import { fetchCompetitiveHistoryParallel } from './server/taekwondoCompetitiveHistoryService.js';
import { db } from './server/db.js';
import { DatabaseStorage } from './server/storage.js';

const athleteId = '4803e989-6553-4bd2-a1e8-11a9e77200f3';
const userId = '11e6eef4-887d-b73a-92b4-12f817a4f090';
const categorySummary = [
  {
    category_name: "M+80 kg | Olympic Senior Division | Olympic Kyorugi Rankings",
    rank: "13.0",
    points: "89.23"
  },
  {
    category_name: "M-87 kg | World Senior Division | World Kyorugi Rankings",
    rank: "7.0",
    points: "81.62"
  },
  {
    category_name: "M+87 kg | World Senior Division | World Kyorugi Rankings",
    rank: "66.0",
    points: "13.61"
  }
];

console.log('🚀 Manually triggering comprehensive competitive history fetch for Richard Andre ORDEMANN...');
console.log(`   Athlete ID: ${athleteId}`);
console.log(`   Taekwondo User ID: ${userId}`);
console.log(`   Categories: ${categorySummary.length}`);

const storage = new DatabaseStorage(db);

try {
  await fetchCompetitiveHistoryParallel(athleteId, userId, categorySummary, storage);
  console.log('✅ Competitive history fetch completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error during competitive history fetch:', error);
  process.exit(1);
}
