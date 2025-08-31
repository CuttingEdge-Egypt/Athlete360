# Athlete360 - AI-Powered Athletic Performance Analysis Platform

## Overview
Athlete360 is an AI-powered athletic performance analysis platform that enables users to analyze any athlete's performance through various analytical services. The platform provides comprehensive athlete insights including biographies, ranking analysis, strengths/weaknesses evaluation, development plans, nutrition guidance, and strategic analysis. The business vision is to provide comprehensive, authentic, and real-time athletic insights, leveraging AI to offer personalized performance development and strategic advantages.

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

### Analysis System  
- **Service Architecture**: Multiple analytical services for comprehensive athlete insights.
- **AI-Powered Analysis**: Real-time athlete performance evaluation and insights.
- **Data Management**: Comprehensive athlete data storage and retrieval.

### Service Architecture
- **Analysis Services**: Eight distinct analytical services (Bio, Rank, Strengths, Weaknesses, Development Plans, Nutrition, Beat Strategies, Video Analysis).
- **Athlete Comparison**: AI-powered one-click comparison system with dual AI model architecture (GPT-5 and Gemini-2.5-pro for enhanced analysis).
- **Smart Data Extraction**: Intelligent fallback system that automatically extracts missing athlete data (age, gender, nationality) from existing biographies using pattern matching and AI analysis.
- **Cost Structure**: Predefined token costs per service.
- **Data Seeding**: Automatic database seeding with sample data.
- **CRUD Operations**: Full capabilities for sports, athletes, and analysis data.
- **Deduplication Logic**: Smart athlete deduplication by name.
- **Video Analysis System**: Independent video analysis with synchronized player, timeline navigation, real-time event display, and live scoreboard layout.
- **AI Response Handling**: Robust JSON parsing and retry mechanisms for AI model responses.
- **UI Structure**: Consistent structured UI for analysis results (Bio, Rank, etc.) across different components with visual hierarchy and theming.
- **World Ranking Integration**: Enhanced prompts for Bio, Rank History, and Compare Athletes functions that mandate searching for current world rankings in the athlete's specific sport (e.g., World Taekwondo ranking, IJF world ranking, etc.).

## Recent Critical Fixes (August 2025)

### Complete Ranking System Overhaul - Official Federation Sources (August 31, 2025)
- **Backend Redesign**: Completely restructured AI prompts to reference official sport federation websites (World Taekwondo, FIE, UWW, PSA, FIFA, FIBA)
- **Competition-Based Timeline**: New data structure `competitionRankingTimeline` replaces generic career periods with specific competitions and ranking changes
- **Enhanced Search Strategy**: Multi-tier search approach: official world rankings → regional/national rankings → competition participation → development timeline
- **Flexible Data Approach**: System now handles athletes at all competitive levels (world-ranked, regionally-ranked, developing athletes)
- **Frontend Updates**: Competition timeline display with "Before → After" ranking visualization, official source references, and competition details
- **Error Handling**: Maintains token refund protection while being more inclusive of athletes at different competitive levels
- **Format**: Displays authentic data like "2024 World Championships: #25 → #18 (+7)" instead of generic periods
- **Status**: ✅ System enhanced to find authentic ranking data from official federation sources while protecting users from unfair charges

### Critical Token Purchase Fix (August 31, 2025)
- **Problem**: Token purchases were incorrectly setting total purchased to current balance instead of cumulative total
- **Impact**: Users purchasing 500 tokens with 3585/6005 balance would get 4085/4085 instead of correct 4085/6505
- **Solution**: Fixed `addTokensPurchase` function to properly add tokens to existing total purchased
- **Status**: ✅ Token purchase system now correctly maintains cumulative total purchased tokens

### Ranking UI Enhanced (August 31, 2025)
- **Ranking Progression Chart**: Added visual chart display showing ranking changes over time using Chart.js
- **Improved Career Milestones Layout**: Enhanced spacing and readability with card-based layout and better text spacing
- **Updated Labels**: Changed "Peak Rank" to "Highest Rank" and "Trend" to "Stayed at this rank the longest"
- **Removed Data Sources**: Eliminated "Data Source" and "Source" references from UI for cleaner appearance
- **Enhanced Current Status**: Improved Current Status section with better data mapping from JSON structure
- **JSON Structure Updates**: Added highestRank, stayedAtRankLongest, and currentStatus fields to Gemini ranking response
- **Status**: ✅ Ranking display significantly improved with better visual hierarchy and user-friendly labels

### Paymob Integration Fully Working (Updated August 26, 2025)
- **Integration ID**: 4233746 confirmed working for online card payments
- **Payment Flow**: Successfully tested end-to-end payment processing
- **3DS Authentication**: System properly detects and handles 3D Secure requirements
- **Bank Validation**: Egyptian phone numbers and address data correctly formatted
- **Callback Configuration**: Configured for deployed domain callbacks
- **Status**: Payment processing fully functional with automatic token crediting
- **Test Result**: Live payment successful - 15 EGP transaction processed with callback working
- **Token Crediting**: Automatic token addition to user accounts upon successful payment
- **User Identification**: merchant_order_id format `tokens_USER_ID_TIMESTAMP` implemented
- **Payment Success Page**: Enhanced custom success page at `/payment/success` with full app navigation header, real-time token balance display, and intuitive user experience
- **Deployed URLs**: Using athlete-360-CuttingMo.replit.app for production callbacks
- **Custom Redirect URL**: Clean `/payment/success?status=completed&transaction=ID&amount=15` format replacing technical callback URLs
- **URL Domain Fix**: ✅ **CRITICAL FIX APPLIED** (August 31, 2025) - Corrected hardcoded domain from `athlete360-cuttingmo` to `athlete-360-cuttingmo` in paymobService.ts to match actual deployment URL. This fixes payment callback redirection issues identified by Paymob support.

### Paymob Callback Architecture Completely Restructured (August 26, 2025)
- **Dual Callback System**: Implemented proper Paymob architecture with separate notification_url (webhook) and redirection_url (user redirect)
- **Research-Based Solution**: Extensive Paymob documentation research revealed need for two distinct callback types
- **Webhook Endpoint**: `/api/payments/paymob-processed` handles server-to-server POST requests with JSON data
- **Redirect Endpoint**: `/api/payments/paymob-response` handles browser redirects with query parameters using `app.all()` for flexible GET/POST support
- **Enhanced Debugging**: Comprehensive request logging for production troubleshooting including method, headers, body, and query parameters
- **HMAC Ready**: Security validation structure implemented for production webhook authentication
- **Token Credit Flow**: Automatic token crediting upon payment approval with transaction logging
- **Production Status**: ✅ **SOLUTION CONFIRMED** - Token crediting enhanced with authenticated user fallback mechanism. Tested successfully in development with real Paymob callback data. Ready for production deployment to fix token crediting issue
- **AI Error Handling**: ✅ **IMPLEMENTATION COMPLETE** - Comprehensive error handling system implemented across all AI features. AI web search failures now prevent token deduction and return user-friendly error messages encouraging retry. Automatic token refunds for failed searches ensure fair user experience. System successfully protects users during JSON parsing improvements - users only pay for successfully delivered data
- **Architecture Compliance**: Follows official Paymob integration requirements for reliable payment processing

### Egyptian Bank Validation Fix
- **Problem**: Bank recognition failures with "unrecognized bank" errors
- **Solution**: Proper Egyptian phone numbers (+201234567890) in billing_data instead of "NA"
- **Enhanced**: Complete Cairo address data with valid postal codes

## External Dependencies

### AI and Language Models
- **OpenAI GPT-5**: Exclusive LLM provider for all athlete analysis, biography generation, comparison analysis, and sports insights. Uses web search capabilities.
- **Google Gemini 2.5 Pro**: Specialized AI model for nutrition plan generation, video analysis, and enhanced athlete comparison providing culturally-aware meal recommendations and detailed tactical advice.
- **OpenAI SDK**: Official OpenAI JavaScript SDK for GPT-5 integration.
- **Google Generative AI SDK**: Official Google SDK for Gemini integration.

### Database and Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migrations and schema management.

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider.
- **Passport.js**: Authentication middleware.



### UI and Styling
- **Radix UI**: Headless UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Chart.js**: Data visualization library.

### Development Tools
- **Vite**: Fast build tool.
- **ESBuild**: Fast JavaScript bundler.
- **TypeScript**: Static type checking.