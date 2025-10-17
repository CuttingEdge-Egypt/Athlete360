// Quick test to verify OpenAI integration is working
import { getAthleteProfile, getDetailedAnalysis } from './server/openaiService.js';

async function testOpenAI() {
  console.log('Testing OpenAI integration...');
  
  try {
    // Test athlete profile generation
    console.log('\n1. Testing athlete profile generation...');
    const profile = await getAthleteProfile('Mohamed Salah', 'Football');
    console.log('Profile Bio (first 200 chars):', profile.bio.substring(0, 200) + '...');
    console.log('Achievements count:', profile.achievements.length);
    console.log('Recent News:', profile.recentNews.substring(0, 100) + '...');
    
    // Test detailed analysis
    console.log('\n2. Testing detailed analysis...');
    const analysis = await getDetailedAnalysis('Mohamed Salah', 'Football');
    console.log('Strengths count:', analysis.strengths.length);
    console.log('Weaknesses count:', analysis.weaknesses.length);
    console.log('Development plans count:', analysis.developmentPlans.length);
    
    if (analysis.strengths.length > 0) {
      console.log('First strength:', analysis.strengths[0].title, '-', analysis.strengths[0].description.substring(0, 100) + '...');
    }
    
    console.log('\n✅ OpenAI integration is working correctly!');
    
  } catch (error) {
    console.error('❌ OpenAI integration failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('Check OPENAI_API_KEY environment variable');
    }
    if (error.message.includes('401')) {
      console.error('Invalid API key or no access to o3-mini model');
    }
    if (error.message.includes('model')) {
      console.error('o3-mini model may not be available - trying gpt-4o instead');
    }
  }
}

testOpenAI();