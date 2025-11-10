/**
 * Taekwondo-specific utility functions for processing athlete data
 */

export interface CategoryRank {
  category: string;
  rank: string;
  points: string;
  lastUpdated: string;
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
