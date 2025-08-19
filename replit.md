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
- **Athlete Comparison**: AI-powered one-click comparison system with dual AI model architecture (GPT-5 and Gemini-2.5-pro for enhanced analysis).
- **Smart Data Extraction**: Intelligent fallback system that automatically extracts missing athlete data (age, gender, nationality) from existing biographies using pattern matching and AI analysis.
- **Cost Structure**: Predefined token costs per service.
- **Data Seeding**: Automatic database seeding with sample data.
- **CRUD Operations**: Full capabilities for sports, athletes, and analysis data.
- **Deduplication Logic**: Smart athlete deduplication by name.
- **Video Analysis System**: Independent video analysis with synchronized player, timeline navigation, real-time event display, and live scoreboard layout.
- **AI Response Handling**: Robust JSON parsing and retry mechanisms for AI model responses.
- **UI Structure**: Consistent structured UI for analysis results (Bio, Rank, etc.) across different components with visual hierarchy and theming.

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