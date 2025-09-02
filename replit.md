# Athlete360 - AI-Powered Athletic Performance Analysis Platform

## Overview
Athlete360 is an AI-powered athletic performance analysis platform designed to analyze any athlete's performance through various analytical services. It provides comprehensive insights including biographies, ranking analysis, strengths/weaknesses, development plans, nutrition guidance, and strategic analysis. The platform aims to deliver authentic, real-time athletic insights leveraging AI for personalized performance development and strategic advantages.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: Radix UI primitives and shadcn/ui for components, Tailwind CSS for styling with a custom dark theme.
- **State Management**: TanStack Query (React Query) for server state.
- **Routing**: Wouter for client-side routing.
- **Forms**: React Hook Form with Zod validation.
- **Interface Design**: Tab-based navigation with dedicated sections for athlete analysis and comparison.
- **UI Features**: Ranking progression charts with Chart.js, enhanced career milestone layouts, and a floating queue widget for managing multiple AI generations.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: Express sessions with PostgreSQL store.
- **Authentication**: Replit OIDC integration.

### Core Features
- **Analysis Services**: Eight distinct AI-powered analytical services (Bio, Rank, Strengths, Weaknesses, Development Plans, Nutrition, Beat Strategies, Video Analysis).
- **Athlete Comparison**: AI-powered one-click comparison using a dual AI model architecture (GPT-5 and Gemini-2.5-pro).
- **Smart Data Extraction**: Intelligent fallback system for extracting missing athlete data from biographies.
- **Data Management**: Comprehensive athlete data storage, retrieval, and smart deduplication.
- **Video Analysis System**: Independent video analysis with synchronized player, timeline navigation, and real-time event display.
- **AI Response Handling**: Robust JSON parsing and retry mechanisms for AI model responses.
- **Payment System**: Integrated with Paymob for token purchases, featuring a dual callback system (webhook and redirect) and automatic token crediting.
- **Generation Queue System**: Manages multiple AI generations simultaneously with real-time status updates, cancellation, and retry functionality.
- **Error Handling**: Comprehensive system for AI web search failures, preventing token deduction and providing user-friendly messages.
- **GPT-5 Rank Analysis**: Enhanced rank history analysis using GPT-5 with web search capabilities, featuring competition-by-competition rank progression tracking.

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless.
- **ORM**: Drizzle ORM for type-safe operations and migrations.
- **Schema Design**: Relational schema for users, sports, athletes, analysis logs, transactions, and analytical data.

### Authentication & Authorization
- **Provider**: Replit OIDC.
- **Session Management**: Server-side sessions with PostgreSQL persistence.
- **Authorization**: Route-level protection with `isAuthenticated` middleware.
- **User Management**: Automatic user creation/updates with token balance tracking.

## External Dependencies

### AI and Language Models
- **OpenAI GPT-5**: Primary LLM for athlete analysis, biography generation, comparison, rank history analysis, and sports insights with web search capabilities.
- **Google Gemini 2.5 Pro**: Specialized for nutrition plan generation, video analysis, and enhanced athlete comparison.
- **OpenAI SDK**: For GPT-5 integration.
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