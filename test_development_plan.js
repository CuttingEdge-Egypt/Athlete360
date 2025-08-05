// Quick test to debug development plan OpenAI integration
const { getDetailedAnalysis } = require('./server/openaiService.js');

async function testDevelopmentPlan() {
  console.log('Testing development plan OpenAI integration...');
  
  try {
    console.log('Calling getDetailedAnalysis for Seif eissa...');
    const analysis = await getDetailedAnalysis('Seif eissa', 'Football');
    
    console.log('\n=== DEVELOPMENT PLANS ANALYSIS ===');
    console.log('Development Plans count:', analysis.developmentPlans.length);
    
    if (analysis.developmentPlans.length > 0) {
      console.log('\nFirst few development plans:');
      analysis.developmentPlans.slice(0, 3).forEach((plan, index) => {
        console.log(`${index + 1}. Title: ${plan.title}`);
        console.log(`   Description: ${plan.description}`);
        console.log(`   Week: ${plan.week || 'undefined'}`);
        console.log('---');
      });
    } else {
      console.log('❌ No development plans returned from OpenAI');
    }
    
    console.log('\n=== FULL RESPONSE STRUCTURE ===');
    console.log('Response keys:', Object.keys(analysis));
    console.log('Strengths count:', analysis.strengths.length);
    console.log('Weaknesses count:', analysis.weaknesses.length);
    console.log('Nutrition plans count:', analysis.nutritionPlans.length);
    console.log('Beat strategies count:', analysis.beatStrategies.length);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('API key')) {
      console.error('Issue with OpenAI API key');
    } else if (error.message.includes('model')) {
      console.error('Issue with OpenAI model (gpt-4o)');
    } else {
      console.error('Full error:', error);
    }
  }
}

testDevelopmentPlan();