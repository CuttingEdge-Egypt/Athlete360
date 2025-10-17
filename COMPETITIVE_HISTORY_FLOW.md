# Competitive History Analysis - Complete Flow

## Data Flow Overview

### 1. BrowserUse Data Extraction (Raw Data Source)

**BrowserUse fetches and returns:**
```json
{
  "rankings": {
    "categories": [...],
    "source": "World Taekwondo",
    "fetchedAt": "timestamp"
  },
  "competitiveHistory": {
    "career_phases": [
      {
        "phase_name": "Recent Competitions 2024-2025",
        "period": "2024-2025",
        "key_achievements": [
          {
            "year": 2024,
            "event_name": "Competition name",
            "event_tier": "Grand Prix | World Championship | Olympic Games",
            "result": "Gold Medal | Bronze Medal | 5th place",
            "notes": "Additional context"
          }
        ]
      }
    ]
  }
}
```

**Saved to Database:**
- `athlete.competitiveHistory` = BrowserUse's `competitiveHistory` object
- `athlete.rankings` = BrowserUse's `rankings` object

---

### 2. Gemini Professional Analysis (AI Processing)

**Input to Gemini:**
```javascript
await generateCompetitiveHistoryAnalysis(
  athleteName,      // e.g., "Jin RYOO"
  sportName,        // e.g., "Taekwondo"
  competitiveHistoryData,  // athlete.competitiveHistory (from BrowserUse)
  {
    country: athlete.country,
    age: athlete.age,
    rank: athlete.rank,
    personalInfo: athlete.personalInfo,
    rankings: athlete.rankings
  },
  language          // 'en' or 'ar'
)
```

**Gemini Prompt Includes:**
1. Competitive History Data (BrowserUse career_phases)
2. Additional Athlete Information (country, age, rank, personal info, rankings)
3. Task: Generate professional analysis with specific structure
4. Citation-free requirement (no URLs, links, or references)

**Gemini Response Schema (Enforced):**
```json
{
  "athlete_name": "Jin RYOO",
  "sport": "Taekwondo",
  "active_period": {
    "start_year": 2018,
    "end_year": "current"
  },
  "career_overview": "Comprehensive career summary...",
  "peak_performance_periods": [
    {
      "period": "2022-2023",
      "description": "Analysis of this peak period...",
      "key_results": [
        "Gold Medal at Asian Championships 2022",
        "Silver Medal at Grand Prix 2023"
      ]
    }
  ],
  "competition_analysis": {
    "grand_prix": "Analysis of Grand Prix performance...",
    "world_championships": "Analysis of World Championship performance...",
    "olympic_games": "Analysis of Olympic performance (if applicable)...",
    "continental_events": "Analysis of continental competition performance..."
  },
  "progression_patterns": "Analysis of career progression and trends...",
  "notable_achievements": [
    {
      "achievement": "Gold Medal at WT President's Cup Asia 2022",
      "significance": "First major international gold medal..."
    }
  ],
  "recent_form": "Analysis of recent performance and current status...",
  "insights": [
    "Key insight 1: Strong performance in Asian continental events",
    "Key insight 2: Consistent medalist at regional competitions",
    "Key insight 3: Emerging talent with breakthrough potential"
  ]
}
```

**Response Schema Features:**
- Enforces complete JSON structure
- Required fields: `athlete_name`, `sport`, `active_period`, `career_overview`
- Optional fields gracefully handled
- Retry logic (3 attempts) if parsing fails
- Backend adds `career_phases` from BrowserUse data to the response before sending to frontend

---

### 3. Frontend Display (Dual Display System)

#### **A. Career Phases Section** (Raw BrowserUse Data)
**Data Source:** `athlete.competitiveHistory.career_phases`

**Display:**
- Timeline visualization with phase indicators
- Grouped by career periods
- Shows raw competition data:
  - Event names
  - Event tiers (Grand Prix, World Championship, etc.)
  - Results (medals, placements)
  - Years
  - Additional notes

#### **B. Competitive History Analysis Section** (Gemini Analysis)
**Data Source:** Gemini response (`analysisData` from API)

**Display Components:**
1. **Career Overview** - Comprehensive career summary
2. **Peak Performance Periods** - Time periods with best results
3. **Competition Analysis** - Performance by competition tier:
   - Grand Prix
   - World Championships
   - Olympic Games
   - Continental Events
4. **Progression Patterns** - Career trends and development
5. **Notable Achievements** - Significant accomplishments
6. **Recent Form** - Current performance status
7. **Key Insights** - Professional observations

---

## Error Handling

### BrowserUse Failures:
- Refund tokens
- Display: "Failed to fetch competitive history data. Your tokens have been refunded."
- `shouldRetry: true` flag

### Gemini Analysis Failures:
- Retry up to 3 times with exponential backoff
- If all retries fail:
  - Refund tokens
  - Display bilingual message:
    - EN: "Analysis generation failed. Your tokens have been refunded."
    - AR: "فشل تحليل السجل التنافسي. تم استرداد رموزك المميزة."
  - `shouldRetry: true` flag

### JSON Parsing Errors:
- Automatic retry on `{"error": "parsing_failed"}`
- Response schema enforcement prevents malformed responses
- Clean JSON parsing with comprehensive repair logic

---

## Key Technical Details

### BrowserUse
- **API Endpoint:** `https://api.browser-use.com/api/v1/run-task`
- **Model:** `gemini-flash-latest`
- **Parameter:** `structured_output_json` (enforces JSON schema)
- **Output:** Structured competitive history with career phases
- **Anti-Hallucination:** Explicit instructions to ONLY return data actually found on websites, NO invented/guessed data

### Gemini Analysis
- **Model:** `gemini-2.5-pro`
- **Temperature:** 0.3 (balanced creativity and consistency)
- **Response Format:** JSON with schema enforcement
- **Retry Logic:** 3 attempts, 1s base delay, exponential backoff
- **Citation Policy:** Strictly citation-free (no URLs, links, references)

### Frontend Integration
- **Career Phases:** Direct read from `athlete.competitiveHistory.career_phases`
- **Gemini Analysis:** Extracted from API response with conditional rendering
- **Error Display:** User-friendly messages, no raw JSON errors
- **Language Support:** English and Arabic
