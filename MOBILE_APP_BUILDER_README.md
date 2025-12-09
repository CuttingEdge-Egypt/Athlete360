# Athlete360 - Mobile App Builder Documentation

## Complete Technical Reference for Native iOS/Android App Development

This document provides everything a mobile app builder needs to understand and recreate the Athlete360 web application as a native mobile app for iOS and Android.

---

## Table of Contents

1. [App Overview](#app-overview)
2. [Tech Stack Summary](#tech-stack-summary)
3. [Data Models & Schema](#data-models--schema)
4. [Authentication System](#authentication-system)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Core Features & Services](#core-features--services)
7. [User Flows](#user-flows)
8. [Payment Integration](#payment-integration)
9. [Token Economy](#token-economy)
10. [Internationalization (i18n)](#internationalization-i18n)
11. [UI/UX Design Guidelines](#uiux-design-guidelines)
12. [Error Handling](#error-handling)
13. [Environment Variables](#environment-variables)
14. [Important Business Logic](#important-business-logic)

---

## App Overview

**Athlete360** is an AI-powered athletic performance analysis platform that provides comprehensive insights into athlete performance across various sports. It leverages multiple AI models (OpenAI GPT-5/o3 and Google Gemini 2.5 Pro) to deliver personalized, real-time athletic insights for performance development and strategic advantages.

### Core Value Proposition
- AI-powered athlete analysis across 8 distinct service types
- Multi-language support (English & Arabic with RTL)
- Token-based economy for accessing premium features
- Video analysis capabilities
- Athlete comparison tools
- Personalized nutrition and development plans

### Target Users
- Athletes seeking performance insights
- Coaches analyzing athlete performance
- Sports analysts
- Fitness enthusiasts

---

## Tech Stack Summary

### Current Web Implementation
| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | Radix UI + shadcn/ui + Tailwind CSS |
| State Management | TanStack Query (React Query) |
| Routing | Wouter |
| Forms | React Hook Form + Zod validation |
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM |
| Authentication | Replit OIDC + Local email/password |
| Payments | Paymob (Egypt-focused) |
| AI Services | OpenAI GPT-5/o3, Google Gemini 2.5 Pro |

### Recommended Mobile Stack
| Platform | Recommended Technology |
|----------|----------------------|
| Cross-Platform | React Native / Flutter / Expo |
| iOS Native | Swift + SwiftUI |
| Android Native | Kotlin + Jetpack Compose |
| State Management | Redux / MobX / Provider |
| HTTP Client | Axios / Dio / Alamofire |
| Local Storage | SQLite / Realm / AsyncStorage |

---

## Data Models & Schema

### User Model
```typescript
interface User {
  id: string;                    // UUID primary key
  email: string | null;          // User email (unique)
  firstName: string | null;      // User's first name
  lastName: string | null;       // User's last name
  profileImageUrl: string | null;
  passwordHash: string | null;   // For local auth only
  authProvider: string;          // 'replit' | 'local'
  emailVerified: boolean;        // Email verification status
  tokens: number;                // Current token balance (default: 1000)
  totalTokensPurchased: number;  // Lifetime tokens purchased
  subscriptionStatus: string;    // 'active' | 'inactive'
  paymobCustomerId: string | null;
  cardToken: string | null;      // Stored payment card token
  cardLast4: string | null;      // Last 4 digits of card
  cardBrand: string | null;      // 'Visa' | 'Mastercard' etc.
  paymentCardExpiry: string | null;
  referralCode: string | null;   // User's unique referral code
  referredBy: string | null;     // Referral code used at signup
  createdAt: Date;
  updatedAt: Date;
}
```

### Sport Model
```typescript
interface Sport {
  id: string;           // UUID primary key
  name: string;         // Sport name (unique) - e.g., "Taekwondo", "Swimming"
  createdAt: Date;
}
```

### Athlete Model
```typescript
interface Athlete {
  id: string;                    // UUID primary key
  sportId: string;               // Foreign key to sports
  name: string;                  // Athlete's full name
  nameArabic: string | null;     // Arabic name for bilingual support
  taekwondoUserId: string | null; // World Taekwondo API ID
  age: number | null;
  gender: string | null;         // 'Male' | 'Female' | 'Other'
  country: string | null;        // Nationality
  bio: string | null;            // Generated biography
  rank: number | null;           // World rank
  olympicRank: number | null;
  continentalRank: number | null;
  nationalRank: number | null;
  profileImageUrl: string | null;
  achievements: string[];        // Array of achievements
  personalInfo: {
    age?: string;
    dateOfBirth?: string;
    height?: string;
    category?: string;           // Competition category/division
    official_name?: string;
    educationalBackground?: string;
    position?: string;
    club?: string;
    yearsInCurrentSport?: string;
    previousSports?: string[];
  } | null;
  rankings: {
    categories?: Array<{
      category: string;
      rank: string;
      totalAthletes?: string;
      points?: string;
      lastUpdated?: string;
    }>;
    source?: string;
    fetchedAt?: string;
  } | null;
  competitiveHistory: {
    career_phases?: Array<{
      phase_name: string;
      period: string;
      key_achievements: Array<{
        year: number;
        month?: string;
        event_name: string;
        event_tier: string;
        result: string;
        notes: string;
      }>;
    }>;
  } | null;
  apiScrapeStatus: {
    initialFetchComplete?: boolean;
    competitiveHistoryFetchStatus?: 'pending' | 'in_progress' | 'completed' | 'error';
    competitiveHistoryProgress?: {
      completed: number;
      total: number;
      percentage: number;
    };
    logs?: Array<{
      timestamp: string;
      message: string;
      type: 'info' | 'success' | 'error';
    }>;
    lastUpdated?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Transaction Model
```typescript
interface Transaction {
  id: string;
  userId: string;
  action: string;           // Description of the action
  tokensDeducted: number;   // Positive for deductions, negative for refunds
  athleteId: string | null;
  serviceType: string | null;
  createdAt: Date;
}
```

### Analysis Log Model
```typescript
interface AnalysisLog {
  id: string;
  userId: string;
  athleteId: string | null;
  serviceType: string;      // 'bio' | 'rank' | 'strengths' | etc.
  language: string;         // 'en' | 'ar'
  resultData: any;          // JSON result from AI analysis
  shared: boolean;          // If analysis is publicly shared
  shareUrl: string | null;
  createdAt: Date;
}
```

### Job Model (Async Processing)
```typescript
interface Job {
  id: string;
  userId: string;
  type: string;             // 'development-plan' | 'nutrition-plan' | 'FETCH_RANKINGS'
  status: string;           // 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number;         // 0-100 percentage
  parameters: object;       // Input parameters as JSON
  result: object | null;    // Final result when completed
  partialResult: object | null; // Partial results during generation
  error: string | null;     // Error message if failed
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}
```

### Payment Receipt Model
```typescript
interface PaymentReceipt {
  id: string;
  userId: string;
  paymobTransactionId: string | null;
  amount: number;           // In local currency (EGP)
  currency: string;         // 'EGP'
  tokensAmount: number;     // Tokens purchased
  paymentMethod: string;    // 'card' | 'wallet'
  cardLast4: string | null;
  cardBrand: string | null;
  status: string;           // 'pending' | 'completed' | 'failed'
  receiptNumber: string;    // Unique receipt number
  createdAt: Date;
}
```

### Referral Model
```typescript
interface Referral {
  id: string;
  referrerId: string;       // User who referred
  referredUserId: string;   // New user who signed up
  bonusTokens: number;      // Tokens awarded (default: 100)
  status: string;           // 'pending' | 'completed'
  createdAt: Date;
}
```

---

## Authentication System

### Overview
The app supports two authentication methods:

1. **Replit OAuth (OIDC)** - Primary method for web
2. **Local Email/Password** - Secondary method with bcrypt hashing

### For Mobile App Implementation
You should implement:
- Email/password authentication (recommended for mobile)
- Social login options (Google, Apple, Facebook)
- Biometric authentication (Face ID, Touch ID, fingerprint)
- Secure token storage (Keychain for iOS, EncryptedSharedPreferences for Android)

### Authentication Endpoints

#### Get Current User
```
GET /api/auth/user
Headers: Cookie with session
Response: User object
```

#### Local Signup
```
POST /api/auth/local/signup
Body: {
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  referralCode?: string  // Optional
}
Response: { success: true, userId: string }
```

#### Local Login
```
POST /api/auth/local/login
Body: {
  email: string,
  password: string
}
Response: User object with session cookie
```

#### Logout
```
POST /api/auth/logout
Response: { success: true }
```

### Session Management
- Sessions stored in PostgreSQL
- 30-day session expiry
- Automatic session refresh on activity

---

## API Endpoints Reference

### Base URL
Production: `https://athlete360.ai`

### Authentication Headers
All authenticated endpoints require:
```
Cookie: connect.sid=<session_id>
```

For mobile, you'll likely want to implement JWT tokens instead.

---

### User & Profile Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/user` | Yes | Get current user info |
| GET | `/api/user/profile` | Yes | Get detailed profile |
| PUT | `/api/user/profile` | Yes | Update profile |
| GET | `/api/user/cards` | Yes | Get saved payment cards |
| POST | `/api/user/cards` | Yes | Add payment card |
| DELETE | `/api/user/cards/:cardId` | Yes | Remove payment card |
| GET | `/api/referrals` | Yes | Get referral history |
| GET | `/api/referrals/validate/:code` | No | Validate referral code |

---

### Sports Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/sports` | No | List all sports |
| POST | `/api/sports` | Yes | Create new sport |

#### Response Format
```json
[
  { "id": "uuid", "name": "Taekwondo", "createdAt": "2024-01-01T00:00:00Z" },
  { "id": "uuid", "name": "Swimming", "createdAt": "2024-01-01T00:00:00Z" }
]
```

---

### Athletes Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/athletes/search?name=X&sportId=Y` | No | Search athletes |
| GET | `/api/athletes/search-by-name?name=X&sportId=Y&country=Z` | No | Advanced search |
| POST | `/api/athletes/create-with-ai` | Yes | Create athlete with AI |
| GET | `/api/athletes/:id` | No | Get athlete details |
| GET | `/api/athletes/by-sport/:sportId?country=X` | No | Get athletes by sport |
| GET | `/api/countries` | No | Get all countries |
| POST | `/api/athletes/compare` | Yes | Compare two athletes |
| POST | `/api/athletes/compare/cancel` | Yes | Cancel comparison |
| POST | `/api/athletes/:id/fetch-rankings` | Yes | Refresh rankings |
| POST | `/api/athletes/:id/search-image` | Yes | Search for athlete image |

#### Create Athlete Request
```json
{
  "name": "Athlete Name",
  "sportId": "sport-uuid",
  "country": "Egypt"
}
```

#### Compare Athletes Request
```json
{
  "athlete1Id": "athlete-uuid-1",
  "athlete2Id": "athlete-uuid-2",
  "language": "en"
}
```

---

### AI Analysis Endpoints

| Method | Endpoint | Auth | Token Cost | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/analysis/:athleteId/bio` | Yes | 50 | Generate biography |
| POST | `/api/analysis/:athleteId/rank` | Yes | 70 | Rank history analysis |
| POST | `/api/analysis/:athleteId/statistics` | Yes | 50 | Statistics analysis |
| POST | `/api/analysis/:athleteId/strengths` | Yes | 50 | Strengths analysis |
| POST | `/api/analysis/:athleteId/weaknesses` | Yes | 50 | Weaknesses analysis |
| POST | `/api/analysis/:athleteId/beat-strategies` | Yes | 100 | Beat strategies |
| POST | `/api/analysis/nutrition-plan` | Yes | 75 | Nutrition plan |
| POST | `/api/analysis/video` | Yes | 200 | Video analysis |

#### Request Format (All Analysis)
```json
{
  "language": "en",  // or "ar"
  "forceUpdate": false  // Optional, regenerate if true
}
```

#### Nutrition Plan Request
```json
{
  "goal": "Lose weight and build muscle",
  "age": 25,
  "height": 175,
  "currentWeight": 80,
  "targetWeight": 75,
  "period": 12,
  "country": "Egypt",
  "language": "en",
  "sport": "Taekwondo"
}
```

---

### Job Endpoints (Async Processing)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/jobs/development-plan` | Yes | Create development plan job |
| POST | `/api/jobs/nutrition-plan` | Yes | Create nutrition plan job |
| GET | `/api/jobs/:jobId` | Yes | Get job status & results |
| DELETE | `/api/jobs/:jobId` | Yes | Cancel job |

#### Development Plan Job Request
```json
{
  "goal": "Improve flexibility and speed",
  "age": 22,
  "height": 180,
  "weight": 75,
  "gender": "male",
  "sport": "Taekwondo",
  "language": "en"
}
```

#### Job Response Format
```json
{
  "id": "job-uuid",
  "status": "running",  // 'queued' | 'running' | 'completed' | 'failed'
  "progress": 45,       // 0-100
  "partialResult": {},  // Available during generation
  "result": {},         // Available when completed
  "error": null         // Error message if failed
}
```

---

### Payment Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/create-intent` | Yes | Create Paymob payment |
| POST | `/api/payments/webhook` | No | Paymob webhook callback |
| POST | `/api/payments/paymob-processed` | No | Payment processed callback |
| GET | `/api/payments/paymob-response` | No | Payment redirect handler |
| POST | `/api/purchase-tokens` | Yes | Simple token purchase |
| GET | `/api/transactions` | Yes | Get transaction history |

#### Create Payment Intent Request
```json
{
  "amount": 25,           // In EGP
  "tokensAmount": 1000,   // Tokens to add
  "paymentMethod": "card"
}
```

---

### History & Logs Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analysis-logs` | Yes | Get analysis history |
| GET | `/api/user-history` | Yes | Get combined history |
| DELETE | `/api/user-history` | Yes | Clear all history |
| GET | `/api/user-history/latest?serviceType=X&athleteId=Y` | Yes | Get latest analysis |

---

### Preview Endpoints (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/preview/latest/:serviceType?language=X` | No | Get preview data |
| GET | `/api/preview/latest-by-type?language=X` | No | Get all previews |

---

## Core Features & Services

### 1. Biography Generation (50 tokens)
AI-generated comprehensive athlete biography including:
- Career overview
- Key achievements
- Playing style
- Background information

### 2. Rank History Analysis (70 tokens)
Competitive history analysis including:
- Career phases
- Tournament results
- Medal counts
- Progression timeline

### 3. Statistics Analysis (50 tokens)
Detailed performance statistics:
- Career statistics by season
- All-time records
- Sport-specific metrics
- Performance highlights

### 4. Strengths Analysis (50 tokens)
Technical, physical, mental, and tactical strengths:
- Up to 5 key strengths
- Detailed descriptions
- Evidence from competitions

### 5. Weaknesses Analysis (50 tokens)
Areas for improvement:
- Up to 5 key weaknesses
- Contextual analysis
- Development suggestions

### 6. Beat Strategies (100 tokens)
Tactical advice for competing against the athlete:
- Multiple strategic approaches
- Exploitation techniques
- Counter-tactics

### 7. Development Plans (50 tokens per job)
Multi-week training programs:
- Goal-based customization
- Daily exercise schedules
- Video references for exercises
- Progress metrics

### 8. Nutrition Plans (75 tokens)
Personalized meal plans:
- Culturally appropriate meals (based on country)
- Macro tracking
- Weekly meal schedules
- Goals-based customization

### 9. Video Analysis (200 tokens)
Comprehensive video breakdown:
- Match analysis
- Technique evaluation
- Scoring patterns
- Improvement recommendations

### 10. Athlete Comparison (120 tokens)
Side-by-side athlete comparison:
- Overview comparison
- Strengths comparison
- Weaknesses comparison
- Competition history comparison
- Head-to-head prediction

---

## User Flows

### 1. Onboarding Flow
```
1. Landing Page (unauthenticated)
   └── View service previews
   └── Sign Up / Login

2. Sign Up
   └── Enter email, password, name
   └── Optional: Apply referral code
   └── Receive 1000 free tokens
   └── Redirect to Dashboard
```

### 2. Athlete Analysis Flow
```
1. Dashboard (authenticated)
   └── Select Sport from dropdown
   └── Select Country (optional)
   └── Enter Athlete Name
   └── Search

2. Search Results
   └── If found: Select athlete
   └── If not found: Create with AI (auto-fetches data)

3. Athlete Profile
   └── View basic info
   └── Select analysis service
   └── If sufficient tokens: Generate analysis
   └── If insufficient tokens: Prompt to purchase

4. Analysis Result
   └── View generated analysis
   └── Download as PDF (optional)
   └── Share analysis (optional)
```

### 3. Nutrition/Development Plan Flow
```
1. Dashboard
   └── Select "Nutrition Plan" or "Development Plan" tab

2. Form Input
   └── Fill required fields:
       - Goal, Age, Height, Weight
       - Gender, Sport, Country
       - Target weight (nutrition)
       - Duration/period

3. Generation (Async)
   └── Job created and queued
   └── Real-time progress updates
   └── Partial results shown during generation

4. Result Display
   └── Complete plan shown
   └── Download as PDF option
```

### 4. Video Analysis Flow
```
1. Dashboard
   └── Select "Video Analysis" tab

2. Upload
   └── Select video file (max 500MB)
   └── Choose analysis type:
       - Match analysis
       - Clip analysis
       - Player advice

3. Processing
   └── Video uploaded to server
   └── AI analysis in progress
   └── Progress indicator

4. Results
   └── Comprehensive analysis displayed
   └── Timeline with events
   └── Download report option
```

### 5. Token Purchase Flow
```
1. Token Balance Low
   └── Prompt shown on analysis attempt

2. Payment Center
   └── Select token package:
       - 500 tokens = 15 EGP
       - 1000 tokens = 25 EGP
       - 2500 tokens = 50 EGP

3. Paymob Checkout
   └── Redirect to Paymob
   └── Enter card details
   └── 3D Secure verification (if required)

4. Completion
   └── Redirect back to app
   └── Tokens credited to account
   └── Success message shown
```

### 6. Athlete Comparison Flow
```
1. Dashboard
   └── Select "Comparison" tab

2. Athlete Selection
   └── Search and select Athlete 1
   └── Search and select Athlete 2

3. Comparison Generation
   └── Real-time progress for each dimension:
       - Overview (20%)
       - Strengths (40%)
       - Weaknesses (60%)
       - Competition History (80%)
       - Head-to-Head (100%)

4. Results Display
   └── Tab-based display for each dimension
   └── Side-by-side comparison view
```

---

## Payment Integration

### Paymob Integration Details

**Provider:** Paymob (Egypt)
**Supported Methods:** Card payments, Mobile wallets

### Token Packages
| Package | Price (EGP) | Tokens |
|---------|-------------|--------|
| Starter | 15 | 500 |
| Professional | 25 | 1000 |
| Enterprise | 50 | 2500 |

### Payment Flow
1. App creates payment intention via `/api/payments/create-intent`
2. User redirected to Paymob Unified Checkout
3. User completes payment (with 3D Secure if required)
4. Paymob sends webhook to `/api/payments/paymob-processed`
5. User redirected to `/api/payments/paymob-response`
6. Tokens credited to user account

### For Mobile Implementation
Consider integrating:
- Stripe (global)
- Apple Pay / Google Pay
- Local payment providers for target markets
- In-App Purchases for token bundles

---

## Token Economy

### Token Costs by Service
| Service | Token Cost |
|---------|------------|
| Biography | 50 |
| Rank History | 70 |
| Statistics | 50 |
| Strengths | 50 |
| Weaknesses | 50 |
| Development Plan | 50 |
| Nutrition Plan | 75 |
| Beat Strategies | 100 |
| Video Analysis | 200 |
| Athlete Comparison | 120 |

### Token Rules
- New users receive 1000 free tokens
- Tokens never expire
- Failed analyses are automatically refunded
- Referral bonus: 100 tokens per successful referral

---

## Internationalization (i18n)

### Supported Languages
- **English (en)** - Default
- **Arabic (ar)** - Full RTL support

### Translation Files Location
```
client/src/locales/
├── en/
│   ├── common.json
│   ├── home.json
│   ├── nav.json
│   ├── payment.json
│   ├── signup.json
│   ├── tokens.json
│   ├── account.json
│   └── videoAnalysis.json
└── ar/
    ├── common.json
    ├── home.json
    ├── nav.json
    ├── payment.json
    ├── signup.json
    ├── tokens.json
    ├── account.json
    └── videoAnalysis.json
```

### RTL Considerations
- All UI components support RTL layout
- Text direction automatically flips
- Icons and navigation adjust accordingly
- Number formatting respects locale

### Language Detection
- Browser language detection on first visit
- User can manually switch language
- Preference stored in localStorage
- API accepts `language` parameter for analysis

---

## UI/UX Design Guidelines

### Color Palette
```css
/* Primary Colors */
--athlete-primary: hsl(222, 47%, 11%);    /* Dark blue/navy */
--athlete-secondary: hsl(210, 40%, 96%);  /* Light gray */
--athlete-accent: hsl(217, 91%, 60%);     /* Bright blue */

/* Status Colors */
--success: hsl(142, 76%, 36%);            /* Green */
--warning: hsl(38, 92%, 50%);             /* Orange */
--error: hsl(0, 72%, 51%);                /* Red */

/* Background */
--background-dark: hsl(222, 47%, 11%);
--background-light: hsl(0, 0%, 100%);
--card-dark: hsl(222, 47%, 15%);
```

### Typography
- Primary Font: Inter (system font fallback)
- Arabic Font: Cairo / Amiri
- Headings: Bold weights
- Body: Regular weight

### Component Patterns
1. **Cards** - Rounded corners (12px), subtle shadows
2. **Buttons** - Primary (blue), Secondary (outline), Destructive (red)
3. **Inputs** - Rounded corners, clear focus states
4. **Modals** - Centered, overlay background
5. **Loading** - Spinners, skeleton screens, progress bars

### Mobile-Specific Guidelines
- Bottom navigation for main sections
- Pull-to-refresh for data updates
- Haptic feedback for important actions
- Native share sheet for sharing analyses
- Offline mode with cached data

---

## Error Handling

### Error Response Format
```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}  // Optional additional info
}
```

### Common Error Codes
| Code | Message | Action |
|------|---------|--------|
| `INSUFFICIENT_TOKENS` | Not enough tokens | Prompt purchase |
| `ATHLETE_NOT_FOUND` | Athlete not found | Search again |
| `SPORT_NOT_FOUND` | Sport not found | Select valid sport |
| `UNAUTHORIZED` | Not authenticated | Redirect to login |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `AI_SERVICE_ERROR` | AI generation failed | Auto-refund, retry |
| `PAYMENT_FAILED` | Payment unsuccessful | Show error, retry |

### Refund Logic
When AI analysis fails:
1. Tokens automatically refunded
2. Refund transaction logged
3. User notified of failure and refund

---

## Environment Variables

### Required for Backend
```
# Database
DATABASE_URL=postgresql://...

# AI Services
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
GEMINI_API_KEY=...

# Payments
PAYMOB_SECRET_KEY=...
PAYMOB_PUBLIC_KEY=...
PAYMOB_INTEGRATION_ID=4233746
PAYMOB_HMAC_SECRET=...

# Authentication
SESSION_SECRET=...
REPLIT_CLIENT_ID=...
REPLIT_CLIENT_SECRET=...

# App URLs
APP_URL=https://athlete360.ai
```

### For Mobile App
You'll need to set up:
- API base URL configuration
- Firebase/Push notification keys
- Analytics tracking IDs
- Crash reporting (Sentry, Crashlytics)

---

## Important Business Logic

### 1. Token Deduction Flow
```
1. Check user has enough tokens
2. Deduct tokens BEFORE starting analysis
3. If analysis fails:
   a. Detect failure via response validation
   b. Refund tokens automatically
   c. Log refund transaction
4. If analysis succeeds:
   a. Store result in analysis_logs
   b. Create transaction record
```

### 2. Athlete Creation Flow
```
1. User searches for athlete
2. If not found, offer to create with AI
3. AI fetches:
   a. Personal info from web
   b. Rankings from official sources
   c. Profile image
   d. Basic biography
4. Athlete stored in database
5. Future analyses use stored + fresh AI data
```

### 3. Async Job Processing
```
1. Job created with 'queued' status
2. Background worker picks up job
3. Status updated to 'running'
4. Progress updates sent (0-100%)
5. Partial results stored during generation
6. On completion: result stored, status = 'completed'
7. On failure: error stored, status = 'failed'
```

### 4. Referral System
```
1. User generates unique referral code
2. New user applies code at signup
3. Both users credited with bonus tokens (100 each)
4. Referral record created
5. Referrer can view referral history
```

### 5. Bilingual Analysis
```
1. User's UI language detected
2. Analysis request includes language param
3. AI generates response in requested language
4. Arabic responses include:
   - RTL text formatting
   - Localized numbers (optional)
   - Culturally appropriate content
```

---

## WebSocket Support

For real-time features, the app uses WebSocket connections:

### Connection URL
```
wss://athlete360.ai/ws
```

### Events
- `job-progress` - Job progress updates
- `comparison-progress` - Comparison generation progress
- `queue-update` - Generation queue status

### Implementation for Mobile
Use native WebSocket or libraries like:
- Socket.IO client
- Starscream (iOS)
- OkHttp WebSocket (Android)

---

## File Upload

### Video Upload
- **Endpoint:** POST `/api/analysis/video`
- **Max Size:** 500MB
- **Format:** multipart/form-data
- **Accepted Types:** .mp4, .mov, .avi

### Implementation
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('analysisType', 'match'); // or 'clip', 'advice'
formData.append('language', 'en');
formData.append('sport', 'Taekwondo');
```

---

## PDF Generation

The web app generates PDFs for:
- Nutrition Plans
- Development Plans
- Video Analysis Reports

### Features
- Arabic font support (Amiri)
- RTL layout for Arabic
- Custom styling and branding

For mobile, consider:
- Native PDF generation libraries
- Server-side PDF generation with download

---

## Conclusion

This documentation provides a comprehensive overview of the Athlete360 application architecture, data models, API endpoints, and business logic. A mobile app builder should use this as the primary reference for recreating the application as a native iOS/Android app.

### Key Recommendations for Mobile Development

1. **Authentication:** Implement JWT-based auth with secure token storage
2. **Offline Support:** Cache athlete data and analysis results locally
3. **Push Notifications:** Notify users when async jobs complete
4. **Deep Linking:** Support links to specific athletes/analyses
5. **Performance:** Lazy load images, paginate large lists
6. **Analytics:** Track user engagement and feature usage
7. **Testing:** Implement comprehensive unit and integration tests

### Contact & Support
For questions about the API or business logic, refer to the web application codebase or contact the development team.

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Generated for: Native Mobile App Development*
