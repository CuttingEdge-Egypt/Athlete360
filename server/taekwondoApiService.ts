import { spawn } from "child_process";

export interface TaekwondoAthleteData {
  success: boolean;
  athlete?: {
    name?: string;
    country?: string;
    ranking?: string | number;
    points?: string | number;
    change?: string;
    userId?: string;
    userid?: string;
    category?: string;
    [key: string]: any;
  };
  competition_history?: Array<{
    event?: string;
    date?: string;
    result?: string;
    location?: string;
    [key: string]: any;
  }>;
  category_summary?: Array<{
    category_name?: string;
    ranking?: string | number;
    points?: string | number;
    [key: string]: any;
  }>;
  rank_history?: Array<{
    category?: string;
    month?: string;
    year?: number;
    ranking?: string | number;
    points?: string | number;
    change?: string;
    error?: string;
    [key: string]: any;
  }>;
  metadata?: {
    athlete_name?: string;
    country?: string;
    weight_division?: string;
    ranking_category?: string;
    sub_category?: string;
    month?: string;
    year?: number;
    [key: string]: any;
  };
  error?: string;
}

export interface TaekwondoLookupParams {
  athleteName: string;
  country?: string;
  weightDivision: string;
  rankingCategory?: string;
  subCategory?: string;
  month?: string;
  year?: number;
  monthsBack?: number;
  maxResults?: number;
  delay?: number;
  rankHistoryMonths?: number;
}

export async function fetchTaekwondoAthleteData(
  params: TaekwondoLookupParams
): Promise<TaekwondoAthleteData> {
  return new Promise((resolve) => {
    console.log(`🥋 Starting Taekwondo API scraper for ${params.athleteName}...`);

    const pythonArgs = [
      'server/athlete_lookup.py',
      params.athleteName
    ];

    if (params.country) {
      pythonArgs.push('--country', params.country);
    }

    pythonArgs.push('--weight', params.weightDivision);

    if (params.rankingCategory) {
      pythonArgs.push('--ranking-category', params.rankingCategory);
    }

    if (params.subCategory) {
      pythonArgs.push('--sub-category', params.subCategory);
    }

    if (params.month) {
      pythonArgs.push('--month', params.month);
    }

    if (params.year) {
      pythonArgs.push('--year', params.year.toString());
    }

    if (params.monthsBack !== undefined) {
      pythonArgs.push('--months-back', params.monthsBack.toString());
    }

    if (params.maxResults !== undefined) {
      pythonArgs.push('--max-results', params.maxResults.toString());
    }

    if (params.delay !== undefined) {
      pythonArgs.push('--delay', params.delay.toString());
    }

    if (params.rankHistoryMonths !== undefined) {
      pythonArgs.push('--rank-history-months', params.rankHistoryMonths.toString());
    }

    console.log(`🥋 Python args:`, pythonArgs.join(' '));

    const pythonProcess = spawn('python3', pythonArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`🥋 Python stderr: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`🥋 Python process exited with code: ${code}`);

      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim()) as TaekwondoAthleteData;
          console.log(`🥋 Python API result:`, JSON.stringify(result, null, 2));

          if (result.success) {
            console.log(`✅ Taekwondo API: Successfully found data for ${params.athleteName}`);
            resolve(result);
          } else {
            console.log(`⚠️ Taekwondo API: ${result.error || 'Athlete not found'}`);
            resolve(result);
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse Taekwondo API output:`, parseError);
          console.log(`🥋 Raw stdout:`, stdout);
          resolve({
            success: false,
            error: `Failed to parse Python output: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          });
        }
      } else {
        console.error(`❌ Taekwondo API script failed with code ${code}`);
        console.error(`🥋 stderr:`, stderr);
        resolve({
          success: false,
          error: `Python script failed with code ${code}: ${stderr}`
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`❌ Failed to start Taekwondo API Python process:`, error);
      resolve({
        success: false,
        error: `Failed to start Python process: ${error.message}`
      });
    });
  });
}

export function parseTaekwondoCategoryToParameters(category: string): {
  weightDivision: string;
  subCategory: string;
  rankingCategory: string;
} | null {
  if (!category || category === 'N/A') {
    return null;
  }

  const parts = category.split('|').map(p => p.trim());
  
  // If category is in full format: "M-58 kg | World Senior Division | World Kyorugi Rankings"
  if (parts.length === 3) {
    return {
      weightDivision: parts[0],
      subCategory: parts[1],
      rankingCategory: parts[2]
    };
  }
  
  // If category is a single value (e.g., "M-58 kg"), use sensible defaults
  // Default to World Senior Division and World Kyorugi Rankings as they are most common
  if (parts.length === 1) {
    return {
      weightDivision: parts[0],
      subCategory: 'World Senior Division',
      rankingCategory: 'World Kyorugi Rankings'
    };
  }

  return null;
}
