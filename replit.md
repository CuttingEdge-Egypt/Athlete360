# Athlete360 - AI-Powered Athletic Performance Analysis Platform

## Overview
Athlete360 is a subscription-based web application providing AI-powered athletic performance analysis and insights. It enables users to analyze any athlete's performance through various analytical services, consuming tokens from their subscription balance. The platform operates on a token-based economy where users purchase subscriptions to acquire tokens, which are then used to access services such as athlete biographies, ranking analysis, strengths/weaknesses evaluation, development plans, nutrition guidance, and strategic analysis. The business vision is to provide comprehensive, authentic, and real-time athletic insights, leveraging AI to offer personalized performance development and strategic advantages.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Components**: Radix UI primitives and shadcn/ui for a consistent design system.
- **Styling**: Tailwind CSS with a custom dark theme.
- **State Management**: TanStack Query (React Query) for server state management and caching.
- **Routing**: Wouter for client-side routing.
- **Forms**: React Hook Form with Zod validation.
- **Interface Design**: Tab-based navigation with dedicated sections for athlete analysis and comparison.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations.
- **Session Management**: Express sessions with PostgreSQL store.
- **Authentication**: Replit OIDC integration.

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless.
- **ORM**: Drizzle ORM with migrations.
- **Session Store**: PostgreSQL-based session storage.
- **Schema Design**: Relational schema for users, sports, athletes, analysis logs, transactions, and analytical data.

### Authentication and Authorization
- **Authentication Provider**: Replit OIDC.
- **Session Management**: Server-side sessions with PostgreSQL persistence.
- **Authorization**: Route-level protection with `isAuthenticated` middleware.
- **User Management**: Automatic user creation/updates with token balance tracking.

### Token Economy System
- **Subscription Model**: Token-based with pay-as-you-go options.
- **Token Deduction**: Automatic consumption per analytical service.
- **Balance Tracking**: Real-time token balance display with transaction history.
- **Insufficient Funds**: Modal-based token recharge system.

### Service Architecture
- **Analysis Services**: Eight distinct analytical services (Bio, Rank, Strengths, Weaknesses, Development Plans, Nutrition, Beat Strategies, Video Analysis).
- **Athlete Comparison**: AI-powered one-click comparison system.
- **Smart Data Extraction**: Intelligent fallback system that automatically extracts missing athlete data (age, gender, nationality) from existing biographies using pattern matching and AI analysis.
- **Cost Structure**: Predefined token costs per service.
- **Data Seeding**: Automatic database seeding with sample data.
- **CRUD Operations**: Full capabilities for sports, athletes, and analysis data.
- **Deduplication Logic**: Smart athlete deduplication by name.

## External Dependencies

### AI and Language Models
- **OpenAI GPT-5**: Exclusive LLM provider for all athlete analysis, biography generation, comparison analysis, and sports insights. Uses web search capabilities (`responses.create()` API with `web_search_preview` tool).
- **Google Gemini 2.5 Pro**: Specialized AI model for nutrition plan generation, providing culturally-aware meal recommendations based on athlete nationality, sport, age, and gender.
- **OpenAI SDK**: Official OpenAI JavaScript SDK for GPT-5 integration.
- **Google Generative AI SDK**: Official Google SDK for Gemini integration.

### Database and Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migrations and schema management.

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider.
- **Passport.js**: Authentication middleware.

### Payment Processing
- **Stripe**: Payment processing integration for token purchases and subscription management.

### UI and Styling
- **Radix UI**: Headless UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Chart.js**: Data visualization library.

### Development Tools
- **Vite**: Fast build tool.
- **ESBuild**: Fast JavaScript bundler.
- **TypeScript**: Static type checking.

## Recent Changes

### Video Analysis System Implementation (August 12, 2025)
- **Removed athlete_id dependency**: Video analysis now works independently without requiring athlete profiles
- **Fixed API integration**: Switched from failed file upload API to working base64 encoding approach for Google Gemini
- **Cleaned up duplicate routes**: Removed conflicting video analysis endpoints, keeping only the standalone `/api/analysis/video` route
- **Fixed TypeScript errors**: Resolved all 12 TypeScript compilation errors in routes.ts
- **Enhanced error handling**: Improved error messages and proper null/undefined handling throughout the codebase
- **Interactive Video Player**: Created synchronized video player with timeline-based analysis events
- **Timestamp Synchronization**: Analysis events (kicks, scores, punches, penalties) automatically highlight during video playback
- **Timeline Navigation**: Users can click on timeline events to jump to specific moments in the video
- **Real-time Analysis Display**: Live events show within 3 seconds of current video time
- **Complete Match Analysis**: Non-timestamped overall match analysis displayed separately for reference
- **Updated Gemini Model**: Now using `gemini-2.5-pro` for all video analysis operations
- **Live Scoreboard Layout**: Video centered with Blue/Red player stats on sides showing live-updating scores, kicks, and yellow cards
- **Enhanced Analysis Accuracy**: Round-specific prompts, proper score summation (1+1+2=4), consistent kick counting, and timestamped warnings

### Nutrition Plan JSON Parsing Enhancements (August 13, 2025)
- **Comprehensive JSON cleanup**: Implemented multiple fallback strategies for handling malformed JSON responses from GPT-5
- **Comma handling**: Added aggressive comma replacement in string values to prevent JSON parsing failures
- **Enhanced prompt instructions**: Updated GPT-5 prompts with strict JSON formatting rules to prevent commas in string values
- **Multiple retry mechanism**: Implemented 3-attempt retry system with progressive cleanup strategies
- **Full response logging**: Added comprehensive logging to capture complete GPT-5 responses for debugging
- **Pattern-based fixes**: Created specific regex patterns to handle common JSON formatting issues in AI responses
- **Robust error handling**: Improved error messages and fallback data structures for failed parsing attempts
- **UI visibility improvements**: Removed problematic background colors from nutrition plan display for better text readability
- **Video analysis color field integration**: Updated video player analysis to use "color" field from JSON for accurate score and yellow card attribution to blue/red players

### Video Analysis Kick Count Fix (August 14, 2025)
- **Fixed frontend/backend property mismatch**: Changed frontend from `kick_analysis` to `kick_count_analysis` to match backend response
- **Enhanced kick count parsing**: Updated frontend to handle actual JSON structure with `players[].kicks[].total_kick_number` format
- **Added color field support**: Updated kick count analysis to use `color` field for consistent Blue/Red player identification
- **Improved player identification**: Primary color-based identification with player name fallback for backward compatibility
- **Maintained backward compatibility**: Kept fallback parsing for direct `total_kicks` property

### Video Analysis Timeout Fix (August 14, 2025)
- **Extended request timeout**: Increased frontend timeout from default to 10 minutes for long-running video analysis
- **Enhanced error handling**: Added specific error messages for timeout, network, and analysis failures
- **Improved user feedback**: Updated button text to indicate 5-10 minute processing time expectation
- **Robust network handling**: Implemented AbortController for proper timeout management