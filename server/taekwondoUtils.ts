/**
 * Taekwondo-specific utility functions for processing athlete data
 */

import { normalizeCategoryForDB } from './taekwondoApiService.js';

export interface CategoryRank {
  category: string;
  rank: string;
  points: string;
  lastUpdated: string;
}

export interface CategorySummaryEntry {
  category_name?: string;
  ranking?: string | number;
  points?: string | number;
  [key: string]: any;
}

export interface CompetitionEntry {
  category?: string;
  place?: number;
  category_total_points?: string;
  ranking_points?: string;
  generated_end_date?: string;
  start_date?: string;
  event_date?: string;
  [key: string]: any;
}

/**
 * Extracts the latest rank for each category from competition history
 * @param competition_history Array of competition entries from the Taekwondo API
 * @returns Array of category ranks with most recent data
 */
export function extractLatestTaekwondoRanks(competition_history: CompetitionEntry[] | undefined): CategoryRank[] {
  if (!competition_history || competition_history.length === 0) {
    return [];
  }

  // Group competitions by normalized category key
  const categoryMap = new Map<string, { comp: CompetitionEntry; timestamp: number }>();

  competition_history.forEach((comp) => {
    if (!comp.category || !comp.place) {
      return; // Skip entries without required fields
    }

    // Normalize category key (trim whitespace, consistent casing)
    const categoryKey = comp.category.trim();

    // Parse date from available fields (prefer generated_end_date, fallback to others)
    const dateStr = comp.generated_end_date || comp.start_date || comp.event_date;
    let timestamp: number;

    if (dateStr) {
      const parsed = Date.parse(dateStr);
      timestamp = isNaN(parsed) ? -Infinity : parsed;
    } else {
      timestamp = -Infinity; // Entries without dates are considered oldest
    }

    const existing = categoryMap.get(categoryKey);

    // Keep only the most recent entry for each category
    if (!existing || timestamp > existing.timestamp) {
      categoryMap.set(categoryKey, { comp, timestamp });
    }
  });

  // Convert map to array format
  const categories: CategoryRank[] = Array.from(categoryMap.entries()).map(([category, { comp, timestamp }]) => ({
    category,
    rank: comp.place!.toString(),
    points: comp.category_total_points || comp.ranking_points || '0',
    lastUpdated: comp.generated_end_date || comp.start_date || comp.event_date || new Date().toISOString()
  }));

  console.log(`📊 Extracted ${categories.length} category ranks from ${competition_history.length} competitions`);
  categories.forEach(cat => {
    console.log(`   - ${cat.category}: Rank #${cat.rank}, ${cat.points} points (updated: ${cat.lastUpdated})`);
  });

  return categories;
}

/**
 * Extracts ranks from category_summary (World Taekwondo API)
 * Transforms category summary data to CategoryRank format for storage
 * @param category_summary Array of category summary entries from the API
 * @returns Array of category ranks with current data
 */
export function extractRanksFromCategorySummary(category_summary: CategorySummaryEntry[] | undefined): CategoryRank[] {
  if (!category_summary || category_summary.length === 0) {
    return [];
  }

  const categories: CategoryRank[] = [];
  const now = new Date().toISOString();

  for (const entry of category_summary) {
    // Skip entries without required fields
    if (!entry.category_name || entry.ranking === undefined || entry.ranking === null) {
      continue;
    }

    // Use normalizeCategoryForDB to get stable category label
    const { categoryLabel } = normalizeCategoryForDB(entry.category_name);

    // Convert ranking and points to strings
    const rank = typeof entry.ranking === 'string' ? entry.ranking : entry.ranking.toString();
    const points = entry.points !== undefined && entry.points !== null
      ? (typeof entry.points === 'string' ? entry.points : entry.points.toString())
      : '0';

    categories.push({
      category: categoryLabel,
      rank,
      points,
      lastUpdated: now
    });
  }

  console.log(`📊 Extracted ${categories.length} category ranks from category_summary`);
  categories.forEach(cat => {
    console.log(`   - ${cat.category}: Rank #${cat.rank}, ${cat.points} points`);
  });

  return categories;
}

/**
 * Converts official name to have uppercase surname (last word)
 * Handles hyphenated names, apostrophes, and multi-word surnames
 * @param name The athlete's name
 * @returns Name with uppercase surname
 */
export function enforceUppercaseSurname(name: string | undefined): string {
  if (!name || name.trim() === '') {
    return 'N/A';
  }

  const trimmed = name.trim();
  
  // Split by spaces but preserve hyphenated parts and apostrophes
  const parts = trimmed.split(/\s+/);
  
  if (parts.length === 0) {
    return 'N/A';
  }

  // If it's a single word, uppercase it
  if (parts.length === 1) {
    return parts[0].toUpperCase();
  }

  // Uppercase the last part (surname)
  const surname = parts[parts.length - 1];
  const uppercasedSurname = surname.toUpperCase();

  // Reconstruct the name
  const firstName = parts.slice(0, -1).join(' ');
  
  return `${firstName} ${uppercasedSurname}`;
}
