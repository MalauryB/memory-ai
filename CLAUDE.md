# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life Architect is a PWA (Progressive Web App) built with Next.js 15 for goal tracking and life planning. The app features a minimalist French-language UI with a dark theme, focusing on goal management, daily planning, progress tracking, and an AI chat assistant.

## Technology Stack

- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4.x with CSS variables
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Fonts**: Geist Sans and Geist Mono
- **Package Manager**: npm (with --legacy-peer-deps)
- **Analytics**: Vercel Analytics

## Development Commands

```bash
# Install dependencies (use --legacy-peer-deps due to React 19 compatibility)
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

**Note**: The project uses React 19, but `vaul@0.9.9` requires React 16-18. Use `--legacy-peer-deps` flag when installing dependencies.

## Project Structure

```
/app
  layout.tsx         # Root layout with dark theme, Geist fonts, Analytics
  page.tsx          # Main page with view switcher (dashboard/planner/progress/chat)
  globals.css       # Global styles and CSS variables

/components
  ai-chat.tsx       # AI assistant chat interface (currently mocked)
  daily-planner.tsx # Daily task planner view
  goal-card.tsx     # Goal display card component
  progress-view.tsx # Progress tracking and visualization
  /ui               # shadcn/ui components (accordion, button, card, etc.)

/lib
  utils.ts          # Utility functions (cn for className merging)

/hooks
  use-mobile.ts     # Mobile detection hook
  use-toast.ts      # Toast notification hook

/public
  manifest.json     # PWA manifest configuration
```

## Architecture

### View System
The main page (app/page.tsx) uses a simple view switcher with 4 main views:
- `dashboard`: Overview with stats and active goals
- `planner`: Daily task planning
- `progress`: Progress tracking and analytics
- `chat`: AI assistant interface

Views are controlled by React state and a bottom navigation bar with icons (Target, Calendar, TrendingUp, MessageSquare).

### Component Patterns
- All pages and components use "use client" directive where interactivity is needed
- UI components follow shadcn/ui patterns with CVA (class-variance-authority)
- Path aliases configured: `@/*` maps to root directory
- Components imported from `@/components`, utils from `@/lib/utils`

### Styling Conventions
- Uses Tailwind utility classes with custom CSS variables for theming
- Design system emphasizes:
  - Light font weights (font-light)
  - Large spacing (space-y-8, space-y-16)
  - Subtle borders (border-border/50)
  - Backdrop blur effects (backdrop-blur-sm)
  - Card-based layouts with transparency (bg-card/50)

### Data Management
Currently all data is mocked/hardcoded in components (no backend or database integration yet). Goals, tasks, and progress are static examples in the UI.

## Configuration Notes

### Next.js Config (next.config.mjs)
- **Build validation disabled**: `ignoreDuringBuilds: true` for ESLint and TypeScript
- **Image optimization disabled**: `unoptimized: true`
- These settings allow rapid development but should be revisited for production

### TypeScript Config
- Strict mode enabled
- Path alias: `@/*` points to root
- Target: ES6

### shadcn/ui Config (components.json)
- Style: new-york
- RSC enabled
- CSS variables for theming
- Base color: neutral
- Icons: lucide-react

## PWA Configuration

The app is configured as a PWA with:
- Manifest at /public/manifest.json
- Standalone display mode
- Dark theme (#141414)
- Portrait orientation
- Icons referenced (192x192, 512x512) but may need to be generated

## Localization

The entire UI is in French. All user-facing text should be in French.
