# Athlete360 - AI-Powered Athletic Performance Analysis Platform

## Overview
Athlete360 is an AI-powered athletic performance analysis platform that analyzes athlete performance across various sports. It provides comprehensive insights, including biographies, ranking analysis, strengths/weaknesses, development plans, nutrition guidance, and strategic analysis. The platform leverages AI to deliver personalized, real-time athletic insights for performance development and strategic advantages, aiming to be an authentic and essential tool for athletes and coaches.

## Recent Changes (October 18, 2025)
- **Development Plan Full Arabic Content**: Enhanced AI prompts to generate ALL development plan content in Arabic when language is set to Arabic, including exercise names, descriptions, tags, equipment, and prescription details
- **Development Plan Loading UI Arabic RTL**: Fixed loading progress display to show messages and spinner on the right side in Arabic, Cancel button on the left, and increased font sizes (text-lg for main message, text-base for subtitle) for better Arabic readability
- **Development Plan Progress Display**: Added Arabic numerals for progress percentages and translated "Progress" label to "التقدم" when site language is Arabic
- **Video Button RTL Positioning**: Video buttons in development plan cards now appear on the left side in Arabic mode through conditional rendering
- **Complete Arabic Toast Messages**: Added comprehensive Arabic translations for all toast notifications including generation started/failed/cancelled, plan generated, ranking updates, athlete creation, image search, and payment success messages
- **Arabic Loading Messages**: Added full bilingual loading messages with 7 development plan progress stages that automatically display in Arabic when UI language is Arabic
- **Nutrition Plan Arabic UI**: Fixed navigation arrows for RTL (left arrow increases, right arrow decreases), swapped title/days positions, right-aligned cards, increased font sizes
- **Translation System**: All toast and loading messages use translation system (common:toast.*, common:messages.*) with automatic language switching

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: Radix UI primitives and shadcn/ui for components, Tailwind CSS for styling with a custom dark theme. Tab-based navigation with dedicated sections for athlete analysis and comparison.
- **State Management**: TanStack Query (React Query) for server state.
- **Routing**: Wouter for client-side routing.
- **Forms**: React Hook Form with Zod validation.
- **UI Features**: Ranking progression charts with Chart.js, enhanced career milestone layouts, and a floating queue widget for managing multiple AI generations.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: Express sessions with PostgreSQL store.
- **Authentication**: Replit OIDC integration.

### Core Features
- **Analysis Services**: Eight distinct AI-powered analytical services (Bio, Rank, Strengths, Weaknesses, Development Plans, Nutrition, Beat Strategies, Video Analysis).
- **Intelligent Ranking System**: Pre-search web discovery of athlete categories, sport-specific navigation strategies, o3 Vision-powered autonomous navigation of federation websites, and extraction of multiple ranking types.
- **Athlete Comparison**: AI-powered one-click comparison using o3 with web search and full BrowserUse data integration. Features five comparison dimensions: Overview, Strengths, Weaknesses, Competition History, and Head-to-Head analysis. Rankings displayed with same styling as athlete cards (color-coded by category: Olympic=gold, Continental=green, National=blue, World=orange).
- **Smart Data Extraction**: Intelligent fallback system for missing athlete data, personal info generation with exact competition categories from official sport federations using Gemini Flash Latest (with web search) for precise category and division extraction (e.g., "M-54", "W-67", "Sabre"). Category field stores primary competition category in exact federation format.
- **Competitive History Analysis**: BrowserUse fetches raw competitive history (prioritizing Simply Compete for Taekwondo), Gemini-2.5-pro generates professional analysis. Features a dual display system with chronologically sorted competitions (most recent first) and medal-styled result badges (🥇 1st, 🥈 2nd, 🥉 3rd, ✓ Participation).
- **Data Management**: Comprehensive athlete data storage, retrieval, and smart deduplication.
- **Video Analysis System**: Independent video analysis with synchronized player, timeline navigation, and real-time event display. Features unified score generation supporting individual sports (tennis, table tennis, fencing) with entity-specific scores and "side" field (blue/red), team sports (basketball, soccer) with team-level scores, and proper country flag display extracted from video scoreboards. Time restrictions for round-based analysis have been removed to allow full video analysis.
- **AI Response Handling**: Robust JSON parsing and retry mechanisms for AI model responses.
- **Payment System**: Integrated with Paymob for token purchases, featuring a dual callback system and automatic token crediting.
- **Generation Queue System**: Manages multiple AI generations simultaneously with real-time status updates, cancellation, and retry functionality.
- **Error Handling**: Comprehensive system for AI web search failures, preventing token deduction and providing user-friendly messages.
- **Bilingual Search**: Bidirectional Arabic/English name translation for athlete search with English-only display, animated loading dots with RTL support.
- **Language-Aware Previews**: Landing page previews automatically show language-specific analysis (Arabic bio for Arabic users, English bio for English users).

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless.
- **ORM**: Drizzle ORM for type-safe operations and migrations.
- **Schema Design**: Relational schema for users, sports, athletes, analysis logs, transactions, and analytical data including a `competitiveHistory` JSONB field.

### Authentication & Authorization
- **Provider**: Replit OIDC.
- **Session Management**: Server-side sessions with PostgreSQL persistence.
- **Authorization**: Route-level protection with `isAuthenticated` middleware.
- **User Management**: Automatic user creation/updates with token balance tracking.

## External Dependencies

### AI and Language Models
- **OpenAI o3**: Advanced reasoning model with web search capabilities for Bio Analysis, Rank History, Statistics, Strengths, Weaknesses, Beat Strategies generation, and all Athlete Comparison dimensions (Overview, Strengths, Weaknesses, Competition History, Head-to-Head).
- **Google Gemini 2.5 Pro**: Specialized for competitive history analysis, nutrition plan generation, development plan generation, and video analysis.
- **BrowserUse + Gemini Flash Latest**: Autonomous web navigation for ranking and competitive history data extraction.
- **OpenAI SDK**: For o3 and GPT integration.
- **Google Generative AI SDK**: For Gemini integration.

### Database and Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migrations and schema management.

### Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider.
- **Passport.js**: Authentication middleware.

### Payment Gateway
- **Paymob**: Payment processing for token purchases.

### UI and Styling
- **Radix UI**: Headless UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Chart.js**: Data visualization library.

### Development Tools
- **Vite**: Fast build tool.
- **ESBuild**: Fast JavaScript bundler.
- **TypeScript**: Static type checking.