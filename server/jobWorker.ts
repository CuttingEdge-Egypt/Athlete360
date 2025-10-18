import { storage } from './storage';
import { generateDevelopmentPlan, generateEnhancedNutritionPlan } from './geminiService';
import type { Job } from '@shared/schema';

interface DevelopmentPlanJobParams {
  goal: string;
  age: number;
  height: number;
  weight: number;
  gender: 'male' | 'female';
  sport: string;
  language: 'en' | 'ar';
}

interface NutritionPlanJobParams {
  goal: string;
  age: number;
  height: number;
  currentWeight: number;
  targetWeight: number;
  period: number;
  sportName: string;
  country: string;
  language: string;
  gender?: string;
  name?: string;
}

export class JobWorker {
  private isRunning = false;
  private pollInterval = 2000; // 2 seconds
  private maxConcurrentJobs = 2;
  private activeJobs = new Set<string>();

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🔄 JobWorker started - polling for jobs...');
    this.poll();
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️ JobWorker stopped');
  }

  private async poll() {
    while (this.isRunning) {
      try {
        await this.processQueuedJobs();
      } catch (error) {
        console.error('❌ JobWorker error:', error);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }
  }

  private async processQueuedJobs() {
    // Don't exceed max concurrent jobs
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    const queuedJobs = await storage.getQueuedJobs();
    const availableSlots = this.maxConcurrentJobs - this.activeJobs.size;
    const jobsToProcess = queuedJobs.slice(0, availableSlots);

    for (const job of jobsToProcess) {
      // Start processing job asynchronously
      this.processJob(job).catch(error => {
        console.error(`❌ Job ${job.id} processing failed:`, error);
      });
    }
  }

  private async processJob(job: Job) {
    // Add to active jobs
    this.activeJobs.add(job.id);
    
    try {
      console.log(`🚀 Starting job ${job.id} (${job.type})`);
      
      // Mark job as running
      await storage.updateJob(job.id, { 
        status: 'running', 
        progress: 0 
      });

      // Check if job was cancelled
      const currentJob = await storage.getJobById(job.id);
      if (!currentJob || currentJob.status === 'cancelled') {
        console.log(`🛑 Job ${job.id} was cancelled`);
        return;
      }

      // Process based on job type
      if (job.type === 'development-plan') {
        await this.processDevelopmentPlan(job);
      } else if (job.type === 'nutrition-plan') {
        await this.processNutritionPlan(job);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      await storage.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: 0
      });
    } finally {
      // Remove from active jobs
      this.activeJobs.delete(job.id);
    }
  }

  private async processDevelopmentPlan(job: Job) {
    const params = job.parameters as DevelopmentPlanJobParams;
    console.log(`🏋️ Processing development plan for user ${job.userId}`);

    // Update progress - starting generation
    await storage.updateJob(job.id, { progress: 5 });

    // Check for cancellation before starting
    if (await this.isJobCancelled(job.id)) return;

    try {
      // Generate the development plan with progress tracking
      const plan = await generateDevelopmentPlan({
        goal: params.goal,
        age: params.age,
        height: params.height,
        weight: params.weight,
        gender: params.gender,
        sport: params.sport,
        language: params.language
      }, async (weekCompleted: number, totalWeeks: number) => {
        // Update progress based on week completion
        const progress = Math.round((weekCompleted / totalWeeks) * 95) + 5; // 5% start + 95% for generation
        await storage.updateJob(job.id, { progress });
        console.log(`📊 Job ${job.id} progress: ${progress}% (Week ${weekCompleted}/${totalWeeks} completed)`);
      });

      // Check for cancellation after generation
      if (await this.isJobCancelled(job.id)) return;

      // Parse the JSON plan data to object for frontend
      const parsedPlan = JSON.parse(plan.plan);

      // Mark as completed with results
      await storage.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: parsedPlan // Store the parsed plan object directly
      });

      // Save to analysis logs for user history
      await storage.createAnalysisLog({
        userId: job.userId,
        athleteId: null, // Development plans are not athlete-specific
        serviceType: "development-plan",
        language: params.language, // Save the generation language
        resultData: parsedPlan
      });

      console.log(`✅ Development plan job ${job.id} completed successfully`);

    } catch (error) {
      // If generation fails, mark as failed
      await storage.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Development plan generation failed',
        progress: 0
      });
      
      console.error(`❌ Development plan generation failed for job ${job.id}:`, error);
      throw error;
    }
  }

  private async processNutritionPlan(job: Job) {
    const params = job.parameters as NutritionPlanJobParams;
    console.log(`🥗 Processing nutrition plan for user ${job.userId}`);

    // Update progress - starting generation
    await storage.updateJob(job.id, { progress: 5 });

    // Check for cancellation before starting
    if (await this.isJobCancelled(job.id)) return;

    try {
      // Add progress tracking to nutrition plan generation
      const plan = await generateEnhancedNutritionPlan(params, async (weekCompleted: number, totalWeeks: number) => {
        // Update progress based on week completion
        const progress = Math.round((weekCompleted / totalWeeks) * 90) + 10; // 10% start + 90% for generation
        await storage.updateJob(job.id, { progress });
        console.log(`📊 Job ${job.id} progress: ${progress}% (Week ${weekCompleted + 1}/${totalWeeks} completed)`);
      });

      // Check for cancellation after generation
      if (await this.isJobCancelled(job.id)) return;

      // Mark as completed with results
      await storage.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: plan
      });

      // Save to analysis logs for user history
      await storage.createAnalysisLog({
        userId: job.userId,
        athleteId: null, // Nutrition plans are not athlete-specific
        serviceType: "nutrition-plan",
        language: params.language, // Save the generation language
        resultData: plan
      });

      console.log(`✅ Nutrition plan job ${job.id} completed successfully`);

    } catch (error) {
      // If generation fails, mark as failed
      await storage.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Nutrition plan generation failed',
        progress: 0
      });
      
      console.error(`❌ Nutrition plan generation failed for job ${job.id}:`, error);
      throw error;
    }
  }

  private async isJobCancelled(jobId: string): Promise<boolean> {
    const currentJob = await storage.getJobById(jobId);
    if (!currentJob || currentJob.status === 'cancelled') {
      console.log(`🛑 Job ${jobId} was cancelled during processing`);
      return true;
    }
    return false;
  }

  // Method to get worker status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      activeJobIds: Array.from(this.activeJobs)
    };
  }
}

// Export singleton worker instance
export const jobWorker = new JobWorker();