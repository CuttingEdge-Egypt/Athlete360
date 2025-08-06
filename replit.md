# Athlete360 - AI-Powered Athletic Performance Analysis Platform

## Overview

Athlete360 is a subscription-based web application that provides AI-powered athletic performance analysis and insights. The platform allows users to analyze any athlete's performance through various analytical services, each consuming tokens from their subscription balance. Built as a full-stack application with a React frontend and Express backend, it features a modern dark-themed UI optimized for both desktop and mobile experiences.

The application follows a token-based economy where users purchase subscriptions to receive tokens, which are then consumed when accessing different analytical services like athlete biographies, ranking analysis, strengths/weaknesses evaluation, development plans, nutrition guidance, and strategic analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**Image Fallback Removal & Taekwondo Search Enhancement (August 6, 2025)**: Removed all basketball player placeholder images - the system now shows user icons when actual athlete images aren't found instead of misleading placeholders. Added taekwondo-specific search enhancement directing AI to use https://www.taekwondodata.com/ as reference source for accurate taekwondo athlete data.

**Streamlined 3-Thread Biography Analysis Implementation (August 6, 2025)**: Updated multi-threaded AI biography generation to use a focused 3-thread structure for improved clarity and organization. System now uses 3 specialized AI threads: Personal Details - Full Name/Age/DOB/Nationality (o3), Life Story - childhood/development/journey (o3), Achievements - competition results/medals/records (o3), followed by Final Synthesis (o3-pro). This streamlined approach provides clearer separation of biographical elements while maintaining comprehensive coverage and factual accuracy.

**Pure o3 Model Implementation with Egyptian Taekwondo Data Reference (August 6, 2025)**: Removed all web search tool integration and updated system to rely purely on o3 and o3-pro model knowledge for athlete analysis. Modified taekwondo.data reference to be exclusive to Egyptian athletes only - system now intelligently detects Egyptian names (Arabic names, common Egyptian patterns) and only references https://www.taekwondodata.com/ for Egyptian taekwondo competitors. This ensures more focused and accurate data sourcing while maintaining authentication through o3's comprehensive sports knowledge base. All placeholder fallback content removed to ensure only authentic AI-generated biographical data.

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