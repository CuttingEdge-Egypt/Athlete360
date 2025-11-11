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
  comprehensive?: boolean; // Enable comprehensive parallel fetching back to March 2021
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

    if (params.comprehensive) {
      pythonArgs.push('--comprehensive');
      console.log(`🚀 COMPREHENSIVE MODE ENABLED - Fetching ALL data back to March 2021...`);
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

/**
 * Sanitize weight division to fix common malformed patterns from AI
 * Examples: "M-+87 kg" → "M+87 kg", "M--58 kg" → "M-58 kg", "w +67 kg" → "W+67 kg"
 */
function sanitizeWeightDivision(weightDivision: string): string | null {
  if (!weightDivision) {
    return null;
  }

  // Trim and normalize spacing
  let sanitized = weightDivision.trim().replace(/\s+/g, ' ');
  
  // Extract components: gender prefix (M/W), sign (+/-), weight number, unit (kg)
  // Pattern: optional spaces around the sign, flexible case for M/W
  const pattern = /^([MWmw])\s*([+-]?)\s*(\d+(?:\.\d+)?)\s*(kg)?$/i;
  const match = sanitized.match(pattern);
  
  if (!match) {
    console.warn(`⚠️ Could not parse weight division "${weightDivision}", attempting fallback cleanup`);
    
    // Fallback: Handle malformed cases like "M-+87 kg", "M--58", "w +67 kg (+1 rank)"
    // Step 1: Strip trailing annotations (anything after kg or after the number if no kg)
    let cleaned = sanitized
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove everything after "KG" or after the weight number + trailing chars
    cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*kg.*$/i, '$1 kg').replace(/(\d+(?:\.\d+)?)[^0-9kg]*$/i, '$1 kg');
    
    // Step 2: Normalize multiple/mixed signs by extracting the sign substring
    // For "M-+87", extract "-+" and decide which sign to keep
    const signMatch = cleaned.match(/([MW])\s*([+-]+)\s*(\d+)/i);
    if (signMatch) {
      const [, gender, signs, weight] = signMatch;
      // If there's any + in the sign sequence, prefer + (over weight)
      const finalSign = signs.includes('+') ? '+' : '-';
      cleaned = `${gender}${finalSign}${weight} kg`;
    }
    
    // Step 3: Verify cleaned string now matches the pattern
    const fallbackMatch = cleaned.match(pattern);
    if (!fallbackMatch) {
      console.error(`❌ Failed to sanitize weight division "${weightDivision}" after fallback cleanup. Result: "${cleaned}"`);
      return null;
    }
    
    // Step 4: Reconstruct canonical form from the match (same as primary path)
    const [, gender, sign, weight, unit] = fallbackMatch;
    const normalizedGender = gender.toUpperCase();
    const normalizedSign = sign || '-';
    const canonical = `${normalizedGender}${normalizedSign}${weight} ${unit || 'kg'}`;
    
    console.log(`📝 Sanitized weight division (fallback): "${weightDivision}" → "${canonical}"`);
    return canonical;
  }
  
  const [, gender, sign, weight, unit] = match;
  
  // Normalize gender to uppercase
  const normalizedGender = gender.toUpperCase();
  
  // Determine sign: if both +/- appear (like "M-+87"), prefer + (over weight)
  // If no sign, default to - (under weight) as it's more common
  const normalizedSign = sign || '-';
  
  // Reconstruct in canonical format
  const canonical = `${normalizedGender}${normalizedSign}${weight} ${unit || 'kg'}`;
  
  if (canonical !== weightDivision) {
    console.log(`📝 Sanitized weight division: "${weightDivision}" → "${canonical}"`);
  }
  
  return canonical;
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
  
  // Extract and sanitize weight division
  const rawWeightDivision = parts[0];
  const sanitizedWeightDivision = sanitizeWeightDivision(rawWeightDivision);
  
  if (!sanitizedWeightDivision) {
    console.error(`❌ Invalid weight division in category "${category}"`);
    return null;
  }
  
  // If category is in full format: "M-58 kg | World Senior Division | World Kyorugi Rankings"
  if (parts.length === 3) {
    return {
      weightDivision: sanitizedWeightDivision,
      subCategory: parts[1],
      rankingCategory: parts[2]
    };
  }
  
  // If category is a single value (e.g., "M-58 kg"), use sensible defaults
  // Default to World Senior Division and World Kyorugi Rankings as they are most common
  if (parts.length === 1) {
    return {
      weightDivision: sanitizedWeightDivision,
      subCategory: 'World Senior Division',
      rankingCategory: 'World Kyorugi Rankings'
    };
  }

  return null;
}

export function normalizeCategoryForDB(category: string | undefined): {
  categoryKey: string;
  categoryLabel: string;
} {
  if (!category || category === 'N/A' || category.trim() === '') {
    return {
      categoryKey: 'default',
      categoryLabel: 'Overall Rank'
    };
  }

  // Normalize category string to create a stable key
  // Example: "M+80 kg | Olympic Senior Division | Olympic Kyorugi Rankings" 
  // becomes "m+80-olympic-kyorugi"
  const parsed = parseTaekwondoCategoryToParameters(category);
  if (!parsed) {
    return {
      categoryKey: 'default',
      categoryLabel: category
    };
  }

  // Create a stable key by combining weight and ranking type
  const weightKey = parsed.weightDivision.toLowerCase().replace(/\s+/g, '-');
  const rankingKey = parsed.rankingCategory.toLowerCase()
    .replace(/\s+rankings?/gi, '')
    .replace(/\s+/g, '-')
    .replace(/kyorugi|poomsae/gi, (match) => match.toLowerCase());
  
  const categoryKey = `${weightKey}-${rankingKey}`;
  
  return {
    categoryKey,
    categoryLabel: category.trim()
  };
}
