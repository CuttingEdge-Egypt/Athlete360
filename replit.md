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
- **Improved player identification**: Added player name-based fallback for color detection in kick count analysis
- **Maintained backward compatibility**: Kept fallback parsing for direct `total_kicks` property

### Bio Analysis UI Complete Restructure (August 17, 2025)
- **Fixed critical raw JSON display**: Identified that bio analysis was being displayed in two different components (`analysis-result.tsx` and `analysis-popup.tsx`)
- **Implemented structured UI in both components**: Added comprehensive `renderBioAnalysis` functions with Biography, Career Achievements, and Recent News sections
- **Enhanced visual typography**: Increased title font sizes to `text-2xl` and `text-3xl`, added distinct brand colors for each section
- **Improved visual hierarchy**: Biography (blue accent), Career Achievements (warning yellow), Recent News (purple), with larger 28px icons
- **Consistent theming**: Updated border colors to match athlete brand colors and removed debugging logs for production readiness
- **Complete JSON parsing solution**: Added robust data parsing with multiple fallback strategies for malformed JSON responses
- **Added refresh bio functionality**: Implemented refresh button in bio popup with loading states, success notifications, and automatic cache invalidation
- **Database cleanup**: Removed test athlete "Habiba Wael" and all 111 associated records (analysis logs, strengths, weaknesses, strategies, plans, transactions)

### Payment Integration Complete Overhaul (August 19, 2025)
- **Fixed critical callback URL configuration**: Updated Paymob dashboard callback URLs from wrong endpoints to correct application URLs
- **Enhanced payment processing**: Callbacks now automatically add tokens to user accounts and create receipts instead of just logging
- **Created professional payment completion flow**: Success/failure pages with transaction details and automatic redirection
- **Updated PaymentIntent interface**: Added userId and tokensAmount for proper callback processing with extra_data in billing information
- **Fixed frontend TypeScript errors**: Properly typed user object with tokens and totalTokensPurchased properties
- **Added payment status handling**: URL parameter processing for payment notifications with toast messages and cache invalidation
- **Comprehensive payment flow**: User card entry → OTP verification → automatic token crediting → success notification → receipt generation
- **Updated documentation**: Current callback URLs for Paymob dashboard configuration at Integration ID 3036500

### Rank History UI Complete Restructure (August 19, 2025)
- **Replaced raw JSON display with comprehensive UI**: Created structured ranking progression timeline with visual cards showing competition history and ranking changes
- **Enhanced career overview section**: Added 4-column stats display for current rank, peak rank, competition record, and total competitions with color-coded styling
- **Improved ranking progression timeline**: Each competition entry shows tournament name, date, result, ranking changes with green/red indicators for improvements/declines
- **Added career summary and achievements sections**: Split layout displaying ranking trends, major titles, current form, and notable achievements with proper visual hierarchy
- **Updated both analysis components**: Applied same UI improvements to both `analysis-result.tsx` and `analysis-popup.tsx` for consistent display
- **Enhanced rank generation prompt**: Improved AI prompt to focus on authentic competition data from 2022-2025 with verified dates and official tournament results
- **Added specialized taekwondo guidance**: Specific prompt instructions for World Taekwondo (WT) rankings, Olympic results, and Grand Prix series for accurate data extraction