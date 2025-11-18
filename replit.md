# Athlete360 - AI-Powered Athletic Performance Analysis Platform

## Overview
Athlete360 is an AI-powered athletic performance analysis platform designed to provide comprehensive insights into athlete performance across various sports. It leverages AI to deliver personalized, real-time athletic insights for performance development and strategic advantages. The platform aims to be an authentic and essential tool for athletes and coaches, offering features such as biographies, ranking analysis, strengths/weaknesses, development plans, nutrition guidance, and strategic analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript and Vite.
-   **UI/UX**: Radix UI primitives and shadcn/ui for components, Tailwind CSS for styling with a custom dark theme. Features tab-based navigation, ranking progression charts with Chart.js, enhanced career milestone layouts, and a floating queue widget. Full Arabic UI translation and RTL support implemented across various features.
-   **State Management**: TanStack Query (React Query) for server state.
-   **Routing**: Wouter for client-side routing.
-   **Forms**: React Hook Form with Zod validation.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Language**: TypeScript with ESM modules.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Session Management**: Express sessions with PostgreSQL store.
-   **Authentication**: Replit OIDC integration.

### Core Features
-   **Analysis Services**: Eight distinct AI-powered analytical services (Bio, Rank, Strengths, Weaknesses, Development Plans, Nutrition, Beat Strategies, Video Analysis). Includes intelligent ranking system with web discovery and sport-specific navigation.
-   **Athlete Comparison**: AI-powered one-click comparison across five dimensions: Overview, Strengths, Weaknesses, Competition History, and Head-to-Head analysis, using o3 with web search and BrowserUse data.
-   **Smart Data Extraction**: Intelligent fallback for missing data, personal info generation with exact competition categories from official sport federations using Gemini Flash Latest for precise category and division extraction.
-   **Competitive History Analysis**: BrowserUse fetches raw history, Gemini 2.5 Pro generates professional analysis. Features dual display with chronological sorting and medal-styled badges. For Taekwondo, it includes dual-analysis of competitive events and rank progression with contextual insights.
-   **Data Management**: Comprehensive athlete data storage, retrieval, and smart deduplication.
-   **Video Analysis System**: Independent video analysis with synchronized player, timeline navigation, real-time event display, and unified score generation for individual and team sports.
-   **AI Response Handling**: Robust JSON parsing and retry mechanisms.
-   **Payment System**: Integrated with Paymob for token purchases, with dual callback and automatic token crediting.
-   **Generation Queue System**: Manages multiple AI generations with real-time status, cancellation, and retry.
-   **Error Handling**: Comprehensive system for AI web search failures, preventing token deduction. Automatic Gemini 2.5 Pro fallback for beat strategies when OpenAI quota is exceeded.
-   **Bilingual Search**: Bidirectional Arabic/English name translation for athlete search with English-only display.
-   **Language-Aware Previews**: Landing page previews automatically show language-specific analysis.

### Data Storage
-   **Primary Database**: PostgreSQL via Neon serverless.
-   **ORM**: Drizzle ORM for type-safe operations and migrations.
-   **Schema Design**: Relational schema for users, sports, athletes, analysis logs, transactions, and analytical data including a `competitiveHistory` JSONB field.

### Authentication & Authorization
-   **Provider**: Replit OIDC.
-   **Session Management**: Server-side sessions with PostgreSQL persistence.
-   **Authorization**: Route-level protection with `isAuthenticated` middleware.
-   **User Management**: Automatic user creation/updates with token balance tracking.

## External Dependencies

### AI and Language Models
-   **OpenAI o3**: Advanced reasoning with web search for Bio, Rank History, Statistics, Strengths, Weaknesses, Beat Strategies, and all Athlete Comparison dimensions. **Automatic Fallback**: If OpenAI quota is exceeded (429 error), beat strategies automatically fall back to Gemini 2.5 Pro with web search.
-   **Google Gemini 2.5 Pro**: For competitive history analysis, nutrition/development plan generation, video analysis, and as a fallback for beat strategies when OpenAI fails.
-   **BrowserUse + Gemini Flash Latest**: Autonomous web navigation for ranking and competitive history data extraction.
-   **OpenAI SDK**: For o3 and GPT integration.
-   **Google Generative AI SDK**: For Gemini integration.

### Database and Storage
-   **Neon PostgreSQL**: Serverless PostgreSQL database.
-   **Drizzle Kit**: Database migrations and schema management.

### Authentication Services
-   **Replit OIDC**: OpenID Connect authentication provider.
-   **Passport.js**: Authentication middleware.

### Payment Gateway
-   **Paymob**: Payment processing for token purchases.

### UI and Styling
-   **Radix UI**: Headless UI primitives.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Lucide React**: Icon library.
-   **Chart.js**: Data visualization library.

### Development Tools
-   **Vite**: Fast build tool.
-   **ESBuild**: Fast JavaScript bundler.
-   **TypeScript**: Static type checking.