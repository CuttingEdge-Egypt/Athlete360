import { storage } from './storage';
import { generateDevelopmentPlan, generateEnhancedNutritionPlan, getAthletePersonalInfoGemini } from './geminiService';
import { fetchTaekwondoAthleteData, parseTaekwondoCategoryToParameters } from './taekwondoApiService';
import { extractRanksFromCategorySummary, extractLatestTaekwondoRanks } from './taekwondoUtils';
import type { Job } from '@shared/schema';
import WebSocket from 'ws';

// Helper function to detect if sport is Squash (English or Arabic)
function isSquashSport(sportName: string): boolean {
  const normalized = sportName.trim().toLowerCase();
  return normalized === 'squash' || normalized === 'سكواش';
}

// Helper function to broadcast job progress via WebSocket
function broadcastJobProgress(jobId: string, status: string, progress: number, message?: string, error?: string) {
  const wss = (global as any).rankingProgressWSS;
  if (!wss) return;
  
  const progressData = {
    type: 'job_progress',
    jobId,
    status,
    progress,
    message,
    error,
    timestamp: new Date().toISOString()
  };
  
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(progressData));
    }
  });
}

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

interface FetchRankingsJobParams {
  athleteId: string;
  athleteName: string;
  sportId: string;
  sportName: string;
  country?: string;
  category?: string;
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
      } else if (job.type === 'FETCH_RANKINGS') {
        await this.processFetchRankings(job);
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

  private async processFetchRankings(job: Job) {
    const params = job.parameters as FetchRankingsJobParams;
    console.log(`🏆 Processing FETCH_RANKINGS for athlete ${params.athleteName}`);

    try {
      // Get athlete from database
      const athlete = await storage.getAthleteById(params.athleteId);
      if (!athlete) {
        throw new Error(`Athlete ${params.athleteId} not found`);
      }

      // Update progress - starting
      await storage.updateJob(job.id, { progress: 10 });
      broadcastJobProgress(job.id, 'running', 10, `Starting ranking fetch for ${params.athleteName}`);

      let athleteCategory = params.category && params.category !== 'N/A' ? params.category : undefined;

      // For Taekwondo: Try new API scraper first
      if (params.sportName.toLowerCase() === 'taekwondo') {
        // Check if we have required fields for API method
        const hasOfficialName = athlete.personalInfo?.official_name;
        const hasCategory = athleteCategory;

        // If missing required fields, generate personal info first
        if (!hasOfficialName || !hasCategory) {
          console.log(`🔄 Missing required fields for Taekwondo API. Generating personal info...`);
          await storage.updateJob(job.id, { progress: 20 });
          broadcastJobProgress(job.id, 'running', 20, 'Generating athlete personal info...');

          const personalInfo = await getAthletePersonalInfoGemini(
            params.athleteName,
            params.sportName,
            params.country || 'Unknown'
          );

          if (personalInfo) {
            await storage.updateAthlete(athlete.id, { personalInfo });
            console.log(`✅ Generated personal info for ${params.athleteName}`);
            athleteCategory = personalInfo.category && personalInfo.category !== 'N/A' 
              ? personalInfo.category 
              : undefined;
            athlete.personalInfo = personalInfo;
          } else {
            throw new Error('Failed to generate personal info');
          }
        }

        // Get the official name from personal info, or use the athlete name
        const nameForApi = athlete.personalInfo?.official_name || params.athleteName;
        await storage.updateJob(job.id, { progress: 30 });
        broadcastJobProgress(job.id, 'running', 30, 'Fetching ranking data from World Taekwondo...');

        // Parse category to get weight division, sub-category, and ranking category
        const categoryParams = athleteCategory ? parseTaekwondoCategoryToParameters(athleteCategory) : null;

        if (!categoryParams || !categoryParams.weightDivision) {
          throw new Error('No category information available');
        }

        // Call the Python API scraper
        const apiResult = await fetchTaekwondoAthleteData({
          athleteName: nameForApi,
          country: params.country || undefined,
          weightDivision: categoryParams.weightDivision,
          subCategory: categoryParams.subCategory,
          rankingCategory: categoryParams.rankingCategory,
          monthsBack: 12,
          rankHistoryMonths: 10,
          maxResults: 0
        });

        if (apiResult.success && apiResult.athlete) {
          console.log(`✅ Taekwondo API: Successfully found data for ${nameForApi}`);
          
          await storage.updateJob(job.id, { progress: 60 });
          broadcastJobProgress(job.id, 'running', 60, 'Processing ranking and competition data...');

          // Transform API data to match our storage format
          const updateData: any = {};

          // Import extractRanksFromRankHistory
          const { extractRanksFromRankHistory } = await import('./taekwondoUtils.js');

          // Extract ranking data
          let categories = extractRanksFromRankHistory(apiResult.rank_history);
          let rankSource = 'rank_history';

          if (categories.length === 0) {
            categories = extractRanksFromCategorySummary(apiResult.category_summary);
            rankSource = 'category_summary';
          }

          if (categories.length === 0) {
            categories = extractLatestTaekwondoRanks(apiResult.competition_history);
            rankSource = 'competition_history';
          }

          if (categories.length > 0) {
            console.log(`📊 Storing ${categories.length} ranks from ${rankSource}`);
            updateData.rankings = {
              categories,
              fetchedAt: new Date().toISOString(),
              source: 'World Taekwondo API'
            };
          }

          // Extract and store World Taekwondo userId
          const taekwondoUserId = apiResult.athlete.userId || apiResult.athlete.userid;
          if (taekwondoUserId) {
            updateData.taekwondoUserId = String(taekwondoUserId);
          }

          if (apiResult.competition_history && apiResult.competition_history.length > 0) {
            updateData.competitiveHistory = apiResult.competition_history;
          }

          // Store rank history if available
          if (apiResult.rank_history && apiResult.rank_history.length > 0) {
            await storage.updateJob(job.id, { progress: 80 });
            broadcastJobProgress(job.id, 'running', 80, 'Storing rank history...');

            const monthMap: { [key: string]: number } = {
              'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
              'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
            };

            for (const rankEntry of apiResult.rank_history) {
              if (rankEntry.month && rankEntry.year && rankEntry.ranking) {
                try {
                  const monthNum = typeof rankEntry.month === 'string' 
                    ? (monthMap[rankEntry.month.toLowerCase()] || parseInt(rankEntry.month))
                    : rankEntry.month;

                  const { normalizeCategoryForDB } = await import('./taekwondoApiService.js');
                  const { categoryKey, categoryLabel } = normalizeCategoryForDB(rankEntry.category);

                  await storage.createRankHistory({
                    athleteId: athlete.id,
                    rank: typeof rankEntry.ranking === 'string' ? parseFloat(rankEntry.ranking) : rankEntry.ranking,
                    date: new Date(`${rankEntry.year}-${String(monthNum).padStart(2, '0')}-01`),
                    categoryKey,
                    categoryLabel,
                    points: rankEntry.points ? (typeof rankEntry.points === 'string' ? parseFloat(rankEntry.points) : rankEntry.points) : undefined
                  });
                } catch (err) {
                  console.log(`⚠️ Failed to store rank history entry: ${err instanceof Error ? err.message : String(err)}`);
                }
              }
            }
            console.log(`✅ Stored ${apiResult.rank_history.length} rank history entries`);
          }

          if (Object.keys(updateData).length > 0) {
            await storage.updateAthlete(athlete.id, updateData);
            console.log(`✅ Updated ${params.athleteName} with API data`);
          }

          // Mark as completed
          await storage.updateJob(job.id, {
            status: 'completed',
            progress: 100,
            result: { success: true, rankings: updateData.rankings, competitiveHistory: updateData.competitiveHistory }
          });
          broadcastJobProgress(job.id, 'completed', 100, `Ranking data updated for ${params.athleteName}`);
          console.log(`✅ FETCH_RANKINGS job ${job.id} completed successfully`);

        } else {
          throw new Error(apiResult.error || 'API returned no data');
        }
      } else {
        // For other sports: Check if World Aquatics sport, Squash, otherwise fall back to general BrowserUse
        const { fetchGeneralSportRankAndHistory, fetchWorldAquaticsRankAndHistory, fetchSquashRankAndHistory, isWorldAquaticsSport } = await import('./browserUseService.js');
        
        await storage.updateJob(job.id, { progress: 30 });
        broadcastJobProgress(job.id, 'running', 30, 'Fetching ranking data...');

        let result;
        if (isSquashSport(params.sportName)) {
          result = await fetchSquashRankAndHistory(
            params.athleteName,
            params.country || "Unknown"
          );
        } else if (isWorldAquaticsSport(params.sportName)) {
          result = await fetchWorldAquaticsRankAndHistory(
            params.athleteName,
            params.country || "Unknown",
            params.sportName,
            athleteCategory
          );
        } else {
          result = await fetchGeneralSportRankAndHistory(
            params.athleteName,
            params.country || "Unknown",
            params.sportName,
            athleteCategory
          );
        }

        if (result) {
          await storage.updateJob(job.id, { progress: 80 });
          broadcastJobProgress(job.id, 'running', 80, 'Processing ranking data...');

          const updateData: any = {};
          if (result.rankings) {
            updateData.rankings = result.rankings;
          }
          if (result.competitiveHistory) {
            updateData.competitiveHistory = result.competitiveHistory;
          }

          if (Object.keys(updateData).length > 0) {
            await storage.updateAthlete(athlete.id, updateData);
          }

          // Mark as completed
          await storage.updateJob(job.id, {
            status: 'completed',
            progress: 100,
            result: { success: true, rankings: updateData.rankings, competitiveHistory: updateData.competitiveHistory }
          });
          broadcastJobProgress(job.id, 'completed', 100, `Ranking data updated for ${params.athleteName}`);
          console.log(`✅ FETCH_RANKINGS job ${job.id} completed successfully`);
        } else {
          throw new Error('No ranking data found');
        }
      }

    } catch (error) {
      console.error(`❌ FETCH_RANKINGS job ${job.id} failed:`, error);
      await storage.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to fetch rankings',
        progress: 0
      });
      broadcastJobProgress(job.id, 'failed', 0, undefined, error instanceof Error ? error.message : 'Failed to fetch rankings');
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