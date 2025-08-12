# Athlete360 - AI-Powered Athletic Performance Analysis Platform

## Overview

Athlete360 is a subscription-based web application that provides AI-powered athletic performance analysis and insights. The platform allows users to analyze any athlete's performance through various analytical services, each consuming tokens from their subscription balance. Built as a full-stack application with a React frontend and Express backend, it features a modern dark-themed UI optimized for both desktop and mobile experiences.

The application follows a token-based economy where users purchase subscriptions to receive tokens, which are then consumed when accessing different analytical services like athlete biographies, ranking analysis, strengths/weaknesses evaluation, development plans, nutrition guidance, and strategic analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**Fixed Signup Completion & Referral System (August 12, 2025)**: Resolved critical signup completion issue where form was refreshing instead of properly handling server response. Fixed 5-second backend timeout handling and improved frontend error management. Corrected referral system logic - referral links (not codes) now properly credit bonus tokens to link owner (referrer), not link user. Added comprehensive payment testing system with card selection modal, multiple payment methods support, and full simulation endpoints. Token balance display works correctly as "current/total" with high-water mark system.

**Comprehensive Testing Infrastructure (August 12, 2025)**: Created complete web crawler test system using Puppeteer for full signup and token purchase flow automation. Includes both browser-based testing (crawler_test.js) and API endpoint testing (test_public_endpoints.js) with comprehensive error handling, detailed logging, and environment-specific configurations. Tests validate complete user journey from signup with payment card registration through token purchases, with support for both visual and headless modes.

**Fixed Token Balance Logic (August 12, 2025)**: Corrected token purchase and balance tracking system. Token display now works as intended: "current tokens / total tokens purchased" where totalTokensPurchased represents the balance after the most recent purchase (like a high-water mark). When tokens are spent, only current balance decreases while total purchased remains constant until next purchase. For example: buy 1000 tokens → 1000/1000, spend 500 → 500/1000, buy 500 more → 1000/1000. Testing system now mirrors real payment completion flow exactly with proper receipt generation and transaction logging.

**Complete GPT-5 Migration with Temperature 1.0 (August 11, 2025)**: Successfully migrated all LLM implementations from Gemini to GPT-5 with mandatory temperature 1.0 (cannot go below). Completely removed server/geminiService.ts file and replaced all analysis functions with GPT-5 equivalents. All athlete profile generation, detailed analysis, specific analysis, threaded biography generation, and athlete comparisons now use GPT-5 with web search capabilities. Enhanced athlete image search with strict sport-based validation to prevent basketball player images for taekwondo athletes. System maintains taekwondo-only image policy using TaekwondoData.com exclusively for taekwondo athletes. Updated Career Highlights UI to display the actual first 4 achievements from GPT-5 bio analysis instead of generic placeholders. Enhanced refresh functionality to properly update biography display after regeneration. Added achievements field to athletes table schema for persistent storage of GPT-5 generated achievements. Completely redesigned Ranking History & Analysis section to be sport-agnostic and adaptive, removing all hardcoded sport-specific content and using authentic athlete data instead of generic placeholders.

**OpenAI GPT-5 Web Search Integration (August 8, 2025)**: Successfully implemented GPT-5 with web search capabilities using responses.create() API instead of chat.completions.create(). Fixed token allocation issue where GPT-5 reasoning model was using all 2000 tokens for internal reasoning, leaving none for response output. Increased max_completion_tokens to 8000 and implemented proper web_search_preview tool integration. System now uses authentic web search data for athlete biography generation, replacing Gemini service entirely. Features include: Real-time web search for athlete data, Egyptian taekwondo athlete specialization via taekwondodata.com, structured JSON output validation, and comprehensive error handling with detailed logging.

**Enhanced Gemini 2.5 Pro with Google Search Grounding (August 7, 2025)**: Successfully implemented "Grounding with Google Search" tool throughout the entire AI infrastructure. All athlete analysis functions now use real-time Google Search data for enhanced accuracy and up-to-date information. Enhanced features include: Google Search-powered biographical analysis with 3-thread approach, real-time athlete comparisons, current ranking analysis, live competition data integration, and dynamic sports insights. Updated server/geminiService.ts with comprehensive Google Search grounding while maintaining Egyptian taekwondo data reference system and authentic data requirements from live sources.

**Image Fallback Removal & Taekwondo Search Enhancement (August 6, 2025)**: Removed all basketball player placeholder images - the system now shows user icons when actual athlete images aren't found instead of misleading placeholders. Added taekwondo-specific search enhancement directing AI to use https://www.taekwondodata.com/ as reference source for accurate taekwondo athlete data.

**Streamlined 3-Thread Biography Analysis Implementation (August 6, 2025)**: Updated multi-threaded AI biography generation to use a focused 3-thread structure for improved clarity and organization. System now uses 3 specialized AI threads: Personal Details - Full Name/Age/DOB/Nationality, Life Story - childhood/development/journey, Achievements - competition results/medals/records, followed by Final Synthesis. This streamlined approach provides clearer separation of biographical elements while maintaining comprehensive coverage and factual accuracy.

**Dynamic Data Implementation (August 5, 2025)**: Updated analysis popups to read data dynamically from the database instead of hardcoded values. All major analysis views now display actual data:
- Rank analysis: Peak ranking, current ranking, and performance metrics from API responses
- Competitive strengths: Real athlete strengths with intelligent icon mapping and dynamic ratings (85-98%)
- Areas for improvement: Actual weaknesses with impact levels and improvement strategies from database/AI

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design system
- **Styling**: Tailwind CSS with custom dark theme and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Interface Design**: Tab-based navigation with dedicated sections for athlete analysis and comparison features

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store for persistence
- **Authentication**: Replit OIDC integration for seamless authentication in Replit environment

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless for scalable cloud database
- **ORM**: Drizzle ORM with migrations support for type-safe database schema management
- **Session Store**: PostgreSQL-based session storage using connect-pg-simple
- **Schema Design**: Comprehensive relational schema supporting users, sports, athletes, analysis logs, transactions, and various analytical data types

### Authentication and Authorization
- **Authentication Provider**: Replit OIDC (OpenID Connect) for seamless integration
- **Session Management**: Server-side sessions with PostgreSQL persistence
- **Authorization**: Route-level protection with isAuthenticated middleware
- **User Management**: Automatic user creation/updates with token balance tracking

### Token Economy System
- **Subscription Model**: $25 subscription provides 1000 tokens with pay-as-you-go thereafter
- **Token Deduction**: Automatic token consumption per analytical service (ranging from 50-100 tokens)
- **Balance Tracking**: Real-time token balance display with transaction history
- **Insufficient Funds**: Modal-based token recharge system when balance is low

### Service Architecture
- **Analysis Services**: Eight distinct analytical services (Bio, Rank, Strengths, Weaknesses, Development Plans, Nutrition, Beat Strategies, Video Analysis)
- **Athlete Comparison**: AI-powered one-click comparison system with comprehensive analysis across strengths, weaknesses, rankings, and head-to-head predictions
- **Cost Structure**: Each service has predefined token costs (50-120 tokens per analysis, 100 tokens for comparisons)
- **Data Seeding**: Automatic database seeding with sample sports and famous athletes for demonstration
- **CRUD Operations**: Full create, read, update, delete capabilities for sports, athletes, and analysis data
- **Deduplication Logic**: Smart athlete deduplication by name to prevent redundancy while preserving most recent/complete records

## External Dependencies

### AI and Language Models
- **OpenAI GPT-5**: Exclusive LLM provider with mandatory temperature 1.0 for all athlete analysis, biography generation, comparison analysis, detailed analysis, and sports insights via OPENAI_API_KEY. Uses web search capabilities through responses.create() API with web_search_preview tool integration.
- **OpenAI SDK**: Official OpenAI JavaScript SDK for GPT-5 integration with function calling and web search tools

### Database and Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket support for real-time connections
- **Drizzle Kit**: Database migrations and schema management tooling

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider integrated with Replit's identity system
- **Passport.js**: Authentication middleware for Node.js with OpenID Connect strategy

### Payment Processing
- **Stripe**: Payment processing integration for token purchases and subscription management (frontend components implemented)

### UI and Styling
- **Radix UI**: Headless UI primitives for accessible component foundation
- **Tailwind CSS**: Utility-first CSS framework with custom dark theme
- **Lucide React**: Icon library providing consistent iconography
- **Chart.js**: Data visualization library for ranking history and performance charts

### Development Tools
- **Vite**: Fast build tool with React plugin and runtime error overlay
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Static type checking across client, server, and shared code
- **Replit Integration**: Development-time cartographer plugin and runtime banner for Replit environment

### Query and Form Management
- **TanStack Query**: Server state management with caching, background updates, and error handling
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation for runtime type safety