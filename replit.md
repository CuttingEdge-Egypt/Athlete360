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
- **Payment Success Page**: Created with proper status display and dashboard navigation
- **Deployed URLs**: Using athlete360-cuttingmo.replit.app for production callbacks

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