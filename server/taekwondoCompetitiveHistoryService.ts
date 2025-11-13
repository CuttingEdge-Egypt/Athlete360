import { spawn } from 'child_process';
import type { IStorage } from './storage.js';

export interface CategorySummary {
  category_name: string;
  ranking?: string;
  points?: string;
}

export async function fetchCompetitiveHistoryParallel(
  athleteId: string,
  userId: string,
  categorySummary: CategorySummary[],
  storage: IStorage
): Promise<void> {
  console.log(`🏃 Starting competitive history fetch for athlete ${athleteId}, userId ${userId}...`);
  
  // Guard against empty category list to avoid division by zero
  if (!categorySummary || categorySummary.length === 0) {
    console.log(`⚠️ No categories provided for athlete ${athleteId}, skipping competitive history fetch`);
    await storage.updateAthlete(athleteId, {
      apiScrapeStatus: {
        initialFetchComplete: true,
        competitiveHistoryFetchStatus: "completed",
        competitiveHistoryProgress: {
          completed: 0,
          total: 0,
          percentage: 0
        },
        logs: [{
          timestamp: new Date().toISOString(),
          message: `No categories available - skipping competitive history fetch`,
          type: "info"
        }],
        lastUpdated: new Date().toISOString()
      }
    });
    return;
  }
  
  try {
    // Update status to in_progress
    // NOTE: API returns all categories in one call, so total = months only (57)
    const MONTHS_BACK = 57; // March 2021 to present
    await storage.updateAthlete(athleteId, {
      apiScrapeStatus: {
        initialFetchComplete: true,
        competitiveHistoryFetchStatus: "in_progress",
        competitiveHistoryProgress: {
          completed: 0,
          total: MONTHS_BACK, // Only 1 API call per month (not per category)
          percentage: 0
        },
        logs: [{
          timestamp: new Date().toISOString(),
          message: `Fetching competitive history across ${MONTHS_BACK} API calls (March 2021 to present)...`,
          type: "info"
        }],
        lastUpdated: new Date().toISOString()
      }
    });
    
    // Call Python script to fetch competitive history
    const result = await callPythonCompetitiveHistory(userId, categorySummary, async (progress) => {
      // Update progress in database
      await storage.updateAthlete(athleteId, {
        apiScrapeStatus: {
          initialFetchComplete: true,
          competitiveHistoryFetchStatus: "in_progress",
          competitiveHistoryProgress: {
            completed: progress.completed,
            total: progress.total,
            percentage: progress.percentage
          },
          logs: [{
            timestamp: new Date().toISOString(),
            message: `Progress: ${progress.completed}/${progress.total} API calls completed (${progress.percentage}%)`,
            type: "info"
          }],
          lastUpdated: new Date().toISOString()
        }
      });
    });
    
    // Check if the Python script reported success
    if (!result.success) {
      // Python script explicitly reported failure
      console.error(`❌ Python script reported failure for athlete ${athleteId}`);
      
      await storage.updateAthlete(athleteId, {
        apiScrapeStatus: {
          initialFetchComplete: true,
          competitiveHistoryFetchStatus: "error",
          competitiveHistoryProgress: {
            completed: 0,
            total: 0,
            percentage: 0
          },
          logs: [{
            timestamp: new Date().toISOString(),
            message: `❌ Failed to fetch competitive history: ${result.error || 'Unknown error'}`,
            type: "error"
          }],
          lastUpdated: new Date().toISOString()
        }
      });
      return; // Exit early, don't continue processing
    }
    
    // Success case: check if we got data
    if (result.competitive_history && result.competitive_history.length > 0) {
      console.log(`✅ Fetched ${result.competitive_history.length} competition events for athlete ${athleteId}`);
      
      // Store competitive history in database
      await storage.updateAthlete(athleteId, {
        competitiveHistory: result.competitive_history,
        apiScrapeStatus: {
          initialFetchComplete: true,
          competitiveHistoryFetchStatus: "completed",
          competitiveHistoryProgress: {
            completed: result.total_calls || 0,
            total: result.total_calls || 0,
            percentage: 100
          },
          logs: [{
            timestamp: new Date().toISOString(),
            message: `✅ Successfully fetched ${result.competitive_history.length} competitions from ${result.total_calls} API calls`,
            type: "success"
          }],
          lastUpdated: new Date().toISOString()
        }
      });
    } else {
      // Success but no data found (empty results)
      console.log(`⚠️ No competitive history found for athlete ${athleteId}`);
      
      await storage.updateAthlete(athleteId, {
        apiScrapeStatus: {
          initialFetchComplete: true,
          competitiveHistoryFetchStatus: "completed",
          logs: [{
            timestamp: new Date().toISOString(),
            message: `No competitive history found in API (may be beyond 16-month retention limit)`,
            type: "info"
          }],
          lastUpdated: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error(`❌ Error in fetchCompetitiveHistoryParallel: ${error instanceof Error ? error.message : String(error)}`);
    
    // Update status to error before throwing
    try {
      await storage.updateAthlete(athleteId, {
        apiScrapeStatus: {
          initialFetchComplete: true,
          competitiveHistoryFetchStatus: "error",
          competitiveHistoryProgress: {
            completed: 0,
            total: 0,
            percentage: 0
          },
          logs: [{
            timestamp: new Date().toISOString(),
            message: `❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
            type: "error"
          }],
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (updateError) {
      console.error(`Failed to update error status: ${updateError}`);
    }
    
    throw error;
  }
}

async function callPythonCompetitiveHistory(
  userId: string,
  categorySummary: CategorySummary[],
  progressCallback: (progress: { completed: number; total: number; percentage: number }) => Promise<void>
): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`🐍 Calling Python script for userId ${userId}...`);
    
    const pythonArgs = [
      'server/fetch_competitive_history.py',
      '--user-id', userId,
      '--category-summary', JSON.stringify(categorySummary),
      '--months-back', '57' // March 2021 to present
    ];
    
    console.log(`🐍 Python args: ${pythonArgs.join(' ')}`);
    
    const pythonProcess = spawn('python3', pythonArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let stdout = '';
    let stderr = '';
    let lastProgress = { completed: 0, total: 0, percentage: 0 };
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      // Stdout contains ONLY the final JSON result - no progress logs
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log(`🐍 Python stderr: ${output}`);
      
      // Parse progress updates from stderr (Python logs to stderr to avoid JSON corruption)
      const progressMatch = output.match(/PROGRESS:(\d+)\/(\d+)/);
      if (progressMatch) {
        const completed = parseInt(progressMatch[1]);
        const total = parseInt(progressMatch[2]);
        const percentage = Math.floor((completed / total) * 100);
        
        if (completed !== lastProgress.completed) {
          lastProgress = { completed, total, percentage };
          progressCallback(lastProgress).catch(err => {
            console.error(`Error updating progress: ${err}`);
          });
        }
      }
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`🐍 Python process exited with code: ${code}`);
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          console.log(`🐍 Python result: ${result.competitive_history?.length || 0} competitions`);
          resolve(result);
        } catch (parseError) {
          console.error(`Failed to parse Python output: ${parseError}`);
          reject(new Error(`Failed to parse Python output: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
        }
      } else {
        console.error(`Python process failed with code ${code}: ${stderr}`);
        reject(new Error(`Python process failed with code ${code}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error(`Failed to start Python process: ${error}`);
      reject(error);
    });
  });
}
